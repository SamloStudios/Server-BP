import { PlayerSpawnAfterEvent, system, world} from '@minecraft/server';
import { getTime } from './botUtils.js';
import { setChestOwner } from 'utils/ownershipUtils.js';
import { home, setHome} from './commands/home.js';
import { reqs, tpa, tpaccept} from './commands/tp.js'
import { setWarp, delWarp, getWarps, warpTo } from './commands/warp.js';


// Variables y estructuras de datos globales
const playerTpReqs = [];
const clanData = new Map(); // clanName -> {leader: string, members: Set<string>} y jugador -> clanName
const claims = new Map(); // clave: "dim:x:z" -> {owner, trusted:Set}
const missions = [
  { id: 1, description: "Mineraliza 50 bloques", type: "mine", target: 50, rewardXP: 20, rewardGold: 10 },
  { id: 2, description: "Derrota a 10 mobs", type: "killMob", target: 10, rewardXP: 30, rewardGold: 20 },
];
const playerMissions = new Map();
const mathQuizActive = { active: false, answer: null, reward: 0 };
const eventTimers = [];

const RANKS = [
  { level: 0, name: "Plebeyo", color: "§7" },
  { level: 5, name: "Escudero", color: "§a" },
  { level: 10, name: "Caballero", color: "§b" },
  { level: 20, name: "Barón", color: "§9" },
  { level: 40, name: "Conde", color: "§5" },
  { level: 80, name: "Duque", color: "§6" },
  { level: 160, name: "Príncipe", color: "§c" },
  { level: 320, name: "Rey", color: "§4" },
  { level: 640, name: "Emperador", color: "§l§6" }
];


// ---------------------- FUNCIONES DE UTILIDAD ------------------------

function getPlayerData(player) {
  const playerName = player.name;
  const dataStr = world.getDynamicProperty(`playerData:${playerName}`);

  // Si no hay datos, retorna valores vacios
  if (!dataStr) {
    return { xp: 0, level: 0, balance: 0};
  }

  // Si hay datos, intentar convertirlos a objeto
  try {
    return JSON.parse(dataStr);
  } catch {
    // Manejar error de parsing
    console.error(`Error parsing player data for ${playerName}`);
    return { xp: 0, level: 0, balance: 0}; // Si hay error, retorna datos vacios
  }
}

function savePlayerData(player, data) {
  const playerName = player.name;
  world.setDynamicProperty(`playerData:${playerName}`, JSON.stringify(data));
}

function getLevelFromXP(xp) {
  // XP necesario se duplica cada nivel para hacer progresión más dura
  let level = 0;
  let xpNeeded = 10;
  let xpAcc = 0;
  while (xp >= xpAcc + xpNeeded) {
    xpAcc += xpNeeded;
    xpNeeded *= 2;
    level++;
  }
  return level;
}

function getRank(level) {
  // Retorna el rango correspondiente para el nivel dado
  let currentRank = RANKS[0];
  for (const rank of RANKS) {
    if (level >= rank.level) currentRank = rank;
    else break;
  }
  return currentRank;
}

function formatPlayerName(player) {
  let data = getPlayerData(player);
  let rank = getRank(data.level);
  let prefix = isAdmin(player) ? "§l§c[Emperador] " : `§r${rank.color}[${rank.name}] `;
  return prefix + "§r" + player.name;
}

function sendRankedChat(player, message) {
  // Envía un mensaje con el prefijo de rango y color
  let formattedName = formatPlayerName(player);
  world.sendMessage(`${formattedName}: §f${message}`);
}


// ------------------- COMANDOS Y EVENTOS PRINCIPALES -------------------

world.beforeEvents.chatSend.subscribe((event) => {
  const message = event.message;
  const player = event.sender;
  
    if (!message.startsWith('!')) {
      return; // Ignore messages that are not commands
    } else event.cancel = true; // Prevent the message from being sent to the chat

    if (message === '!help') {
      player.sendMessage(`§g§lComandos disponibles:§r§d
        !hora - Ver la hora actual
        !spawn - Teletransportarse al spawn\n
        <-Home->
        !set - Establecer posición de casa
        !home - Teletransportarse a la casa registrada\n
        <-Teleport->
        !reqs - Ver solicitudes de teletransporte pendientes
        !tpa <jugador> - Solicitar teletransporte a otro jugador
        !si - Aceptar solicitud de teletransporte\n
        <-Warp->
        !warp - Teletransportes públicos
        !setwarp <nombre> - Establecer un warp personalizado
        !delwarp <nombre> - Eliminar un warp\n
        <- Claim (Proximamente) ->
        <- Trust (Proximamente)->\n
        <- Clan ->
        !clan crear <nombre> - Crear clan
        !clan invitar <jugador> - Invitar clan
        !clan info - Info clan\n
        <- Otros ->
        !stats - Ver tus stats y rango
        !pay <jugador> <cantidad> - Pagar monedas
        !mathquiz - Iniciar minijuego matemático
      `);
      return;
    }

    if (message === '!helpadmin') {
        player.sendMessage(`§g§lComandos de administrador:§r§d
        !owner <jugador> - Cambiar dueño de un bloque
        !getByte - Ver bytes usados por propiedades dinámicas
        !getAll - Ver todas las propiedades dinámicas del mundo
        !getmyAll - Ver todas tus propiedades dinámicas
        < - Propiedades Dinámicas - >
        !cleardp - Limpiar todas las propiedades dinámicas del mundo (solo SamloGamer)
        !clearmydp - Limpiar todas tus propiedades dinámicas
        !setplayerdp <jugador> <clave> <valor> - Establecer propiedad dinámica de un jugador`
        );
        return;
    }

    if (message === '!hora') {
        let hora = getTime();
        player.sendMessage(`§dLa hora actual es ${hora}`);
        return;
    }

    if (message === '!spawn') {
        system.run(() => {
            const overworld = world.getDimension("overworld");
            if (player) {
                player.teleport({ x: 155, y: 95, z: -51 }, { dimension: overworld });
                player.sendMessage(`Teletransportandote al spawn...`);
            }
        });
        return;
    }

    if (message === '!set') {
        setHome(player);
        return;
    }

    if (message === '!home') {
        home(player);
        return;
    }

    // Comandos Teleport -------------------------------------------
    if (message.startsWith('!tpa')) {
        const args = message.split(' ');
        tpa(player, args);
        return;
    }
    
    if (message === '!si') {
        tpaccept(player);
        return;
    }

    if (message === '!reqs') {
        reqs(player);
        return;
    }
    

    // Comandos WARP -------------------------------------------
    // Comando !setwarp
    if (message.startsWith('!setwarp')) {
        const args = message.split(' ');
        setWarp(player, args);
        return;
    }

    if (message === '!warp') {
        getWarps(player);
        return;
    }

    if (message.startsWith('!warp ')) {
        const args = message.split(' ');
        warpTo(player, args);
        return;
    }

    if (message.startsWith('!delwarp')) {
        const args = message.split(' ');
        delWarp(player, args);
        return;
    }

    // Comandos Clan -------------------------------------------
    if (message === "!clan") {
        args = message.split(' ');
        if (args.length < 2) {
            player.sendMessage("§cUso: !clan <crear|invitar|info>");
            return;
        }
        switch (args[1]) {
            case "crear":
                if (args.length < 3) {
                    player.sendMessage("§cUso: !clan crear <nombre>");
                    return;
                }
                if ([...clanData.keys()].includes(args[2])) {
                    player.sendMessage("§cYa existe ese clan.");
                    return;
                }
                clanData.set(args[2], { leader: player.name, members: new Set([player.name]) });
                clanData.set(player.name, args[2]);
                player.sendMessage(`§aClan '${args[2]}' creado.`);
                break;
            case "invitar":
                if (args.length < 3) {
                    player.sendMessage("§cUso: !clan invitar <jugador>");
                    return;
                }
                const clanName = clanData.get(player.name);
                if (!clanName) {
                    player.sendMessage("§cNo perteneces a ningún clan.");
                    return;
                }
                const clan = clanData.get(clanName);
                if (clan.leader !== player.name) {
                    player.sendMessage("§cSolo el líder puede invitar.");
                    return;
                }
                const invitee = [...world.getPlayers()].find(p => p.name.toLowerCase() === args[2].toLowerCase());
                if (!invitee) {
                    player.sendMessage("§cJugador no encontrado.");
                    return;
                }
                if (clanData.get(invitee.name)) {
                    player.sendMessage("§cEl jugador ya pertenece a un clan.");
                    return;
                }
                clan.members.add(invitee.name);
                clanData.set(invitee.name, clanName);
                player.sendMessage(`§aInvitado ${invitee.name} al clan.`);
                invitee.sendMessage(`§aHas sido invitado al clan '${clanName}' por ${player.name}.`);
                break;
            case "info":
                const cName = clanData.get(player.name);
                if (!cName) {
                    player.sendMessage("§cNo perteneces a ningún clan.");
                    return;
                }
                const c = clanData.get(cName);
                player.sendMessage(`§bClan '${cName}' - Líder: ${c.leader} - Miembros: ${[...c.members].join(", ")}`);
                break;
                default:
                player.sendMessage("§cSubcomando no reconocido.");
        }
        return;
    }

    if (message === "!stats") {
        const data = getPlayerData(player);
        const rank = getRank(data.level);
        player.sendMessage(`§6Tus stats:
    Nivel: §a${data.level}
    XP: §a${data.xp}
    Rango: ${rank.color}${rank.name}§r
    Balance: §e${data.balance} monedas`);
        return;
    }

    if (message.startsWith("!pay")) {
        const args = message.split(' ');
        // Comando !pay <jugador> <cantidad>
        if (message === "!pay") {
        if (args.length < 3) {
            player.sendMessage("§cUso: !pay <jugador> <cantidad>");
            return;
        }
        const targetName = args[1].toLowerCase();
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) {
            player.sendMessage("§cCantidad inválida.");
            return;
        }
        const targetPlayer = [...world.getPlayers()].find(p => p.name.toLowerCase().startsWith(targetName));
        if (!targetPlayer) {
            player.sendMessage("§cJugador no encontrado.");
            return;
        }
        let senderData = getPlayerData(player);
        if (senderData.balance < amount) {
            player.sendMessage("§cNo tienes suficiente dinero.");
            return;
        }
        let receiverData = getPlayerData(targetPlayer);
        senderData.balance -= amount;
        receiverData.balance += amount;
        savePlayerData(player, senderData);
        savePlayerData(targetPlayer, receiverData);
        player.sendMessage(`§aPagaste ${amount} monedas a ${targetPlayer.name}.`);
        targetPlayer.sendMessage(`§aRecibiste ${amount} monedas de ${player.name}.`);
        return;
        }
    }

    if (message === "!mission") {
        // Mostrar misión actual
        const currentMission = playerMissions.get(player.name);
        if (!currentMission) {
            player.sendMessage("§cNo tienes misiones activas.");
            return;
        }
        player.sendMessage(`§aMisión actual: ${currentMission.description} Progreso: ${currentMission.progress || 0}/${currentMission.target}`);
        return;
    }

    if (message === "!mathquiz") {
        if (mathQuizActive.active) {
            player.sendMessage("§cYa hay un minijuego activo, espera a que termine.");
            return;
        }
        // Crear pregunta sencilla
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        mathQuizActive.answer = a + b;
        mathQuizActive.reward = 10;
        mathQuizActive.active = true;
        world.sendMessage(`§eMinijuego matemático activo! ¿Cuánto es ${a} + ${b}? Responde con !respuesta <número>`);
        return;
    }

    if (message === "!respuesta") {
        if (!mathQuizActive.active) {
            player.sendMessage("§cNo hay minijuego activo.");
            return;
        }
        if (args.length < 2) {
            player.sendMessage("§cUso: !respuesta <número>");
            return;
        }
        const respuesta = parseInt(args[1]);
        if (respuesta === mathQuizActive.answer) {
            const data = getPlayerData(player);
            data.xp += 10;
            data.balance += mathQuizActive.reward;
            savePlayerData(player, data);
            player.sendMessage(`§a¡Correcto! Ganaste 10 XP y ${mathQuizActive.reward} monedas.`);
            mathQuizActive.active = false;
            mathQuizActive.answer = null;
            mathQuizActive.reward = 0;
        } else {
            player.sendMessage("§cRespuesta incorrecta. Intenta de nuevo.");
        }
        return;
    }

    // Comandos de Propiedades Dinámicas -------------------------------------------
    if (message === "!getByte"){
        let xd = world.getDynamicPropertyTotalByteCount()
        player.sendMessage(`§aTotal de bytes usados por propiedades dinámicas: ${xd}`);
        return;
    }

    if (message === "!getAll") {
        let properties = world.getDynamicPropertyIds();
        if (properties.length === 0) {
            player.sendMessage('§cNo hay propiedades dinámicas registradas.');
            return;
        }
        let propertiesList = properties.map(prop => `§b${prop}`).join('\n');
        player.sendMessage(`§aPropiedades dinámicas registradas:\n${propertiesList}`);
        return;
    }

    if (message === "!getmyAll") {
        let properties = player.getDynamicPropertyIds();
        if (properties.length === 0) {
            player.sendMessage('§cNo tienes propiedades dinámicas registradas.');
            return;
        }
        let propertiesList = properties.map(prop => `§b${prop}`).join('\n');
        player.sendMessage(`§aPropiedades dinámicas registradas:\n${propertiesList}`);
        return;
    }

    if (message === "!cleardp") {
        if (!isAdmin(player) && player.nameTag !== "SamloGamer") return; //VALIDATION

        player.sendMessage("§gTodas las propiedades del mundo han sido eliminadas")
        world.clearDynamicProperties();
        return;
    }

    if (message === "!clearmydp") {
        if (!isAdmin(player)) return; //VALIDATION

        player.sendMessage("§gTodas tus propiedades dinamicas han sido eliminadas")
        player.clearDynamicProperties();
        return;
    }

    if (message.startsWith("!setplayerdp")) {
        if (!isAdmin(player)) {
            player.sendMessage("§cNo tienes permiso para usar este comando.");
            return; // VALIDATION: Solo admins pueden usar este comando
        }

        const args = message.split(' ');
        if (args.length < 4) {
            player.sendMessage("§cUso: !setplayerdp <jugador> <clave> <valor>");
            player.sendMessage("§eEjemplo: !setplayerdp Steve 'clan:guerreros' 'true'");
            return;
        }

        const targetPlayerName = args[1];
        const dpKey = args[2];
        const dpValue = args.slice(3).join(' '); // El valor puede contener espacios

        // Buscar al jugador objetivo
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetPlayerName.toLowerCase());

        if (!targetPlayer) {
            player.sendMessage(`§cJugador '${targetPlayerName}' no encontrado.`);
            return;
        }

        // Intentar determinar el tipo de valor (número, booleano, string)
        let finalValue;
        if (dpValue.toLowerCase() === 'true') {
            finalValue = true;
        } else if (dpValue.toLowerCase() === 'false') {
            finalValue = false;
        } else if (!isNaN(Number(dpValue)) && !isNaN(parseFloat(dpValue))) {
            finalValue = Number(dpValue);
        } else {
            finalValue = dpValue; // Dejar como string si no es booleano ni número
        }

        try {
            targetPlayer.setDynamicProperty(dpKey, finalValue);
            player.sendMessage(`§aPropiedad dinámica '${dpKey}' de '${targetPlayer.name}' establecida a: '${finalValue}' (${typeof finalValue}).`);
            // Opcional: Notificar al jugador modificado (si está en línea)
            if (targetPlayer.isOnline) {
                targetPlayer.sendMessage(`§bTu propiedad '${dpKey}' ha sido modificada a: '${finalValue}'.`);
            }
        } catch (error) {
            player.sendMessage(`§cError al establecer la propiedad: ${error.message}`);
        }
        return;
    }

    if (message.startsWith("!owner")) {
        if (!isAdmin(player)) return;

        const args = message.split(' ');
        let newOwner;
        if (args.length < 2) {
            newOwner = "unknown";
        } else newOwner = args[1];

        if (newOwner === 'null') {
            newOwner = undefined;
        }

        const blockHit = player.getBlockFromViewDirection();
        if (blockHit) {
            setChestOwner(blockHit.block, newOwner);
        }
        player.sendMessage("§gSet new owner as: " + newOwner)
        return;
    }

    if (message === "!update") {
        if (!isAdmin(player)) return;
        world.sendMessage("§d§lINTENTANDO ACTUALIZAR EL MUNDO EN 10seg");
        system.runTimeout(()=> {
            player.runCommand("kick @a '§aEl server se esta actualizando...'");
        }, 10*20);
        system.runTimeout(()=> {
            console.log("@$update36457");
        }, 10*20 + 20);
        return;
    }

    event.cancel = false; // Prevent the message from being sent to the chat
    player.sendMessage(`§eComando no reconocido. Usa !help para ver la lista de comandos disponibles.`);
})

function isAdmin(player) {
    return player.getTags().includes("admin");
}

// Evento para mostrar nombres con color según rango en chat general
world.beforeEvents.chatSend.subscribe(event => {
  const player = event.sender;
  if (!event.message.startsWith("!")) {
      // Actualizar XP al enviar mensaje (menos comandos)
    const data = getPlayerData(player);
    data.xp += 1; // Gana 1 XP por mensaje normal
    const newLevel = getLevelFromXP(data.xp);
    if (newLevel > data.level) {
      data.level = newLevel;
      player.sendMessage(`§a¡Has subido al nivel ${newLevel}!`);
    }
    savePlayerData(player, data);

    event.cancel = true;
    sendRankedChat(player, event.message);
  }
});

// let secondsPassed = 0;

// function mainTick() {
//   if (system.currentTick % 200 === 0) {
//     secondsPassed += 10;
//     world.sendMessage("\nSeconds Passed: " + secondsPassed);
//     world.sendMessage('Getting dynamic properties...');
//     let propertyCount = world.getDynamicPropertyIds().length;
//     world.sendMessage("> Actual current property count: " + propertyCount);
//   }
//   system.run(mainTick);
// }



// system.run(mainTick);