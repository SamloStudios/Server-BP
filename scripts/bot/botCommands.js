import { system, world } from '@minecraft/server';
import { getTime } from './botUtils.js';
import { setHome, home } from './commands/home.js';
import { reqs, tpa, tpaccept } from './commands/tp.js';
import { setWarp, delWarp, getWarps, warpTo } from './commands/warp.js';
import { clan } from './commands/clan.js';
import { stats } from './commands/stats.js';
import { addPlayerXp, savePlayerData, getPlayerData, modificarDinero, addDinero, getLevelFromXP } from './data/playerDataUtils.js';
import { sendRankedChat } from './data/playerDataUtils.js';
import { rango } from './commands/rango.js';
import { mission, updateMissionProgress } from './missions/missions.js';
import { worldDP } from './adminCommands/worldDP.js';
import { modOwner } from './adminCommands/modOwner.js';


// Estructuras de datos
const clanData = new Map();
const claims = new Map();
const mathQuizActive = { active: false, answer: null, reward: 0 };


// Misiones de jugador - Se guardaran en player.setDynamicProperty(mission:)
// Descripcion (txt)
// Tipo (que debe hacer?)
// Count (cuanto?)
// Value (que cosa?)
// Reward (recompensa)
// Origin (nombre de quest que la origina)

/* Reward system {
    reward: {
        item : [{v:minecraft:diamond_sword, n:'Espada del fin', l:Hecha de los materiales mas caros del mundo}],
        money : -20,
        xp : 50,
        key : "EpicChestKey",
        give : true // Will it be given to the player automatically? Or will it be stored so the player can use !recompensas
    }
}
*/
// Quest / mission system
/* System that checks periodically {
    Messages from: Other Players, Npcs, External // ej: You have 1 message unread! 
    Mission of the day
    Unfinished quests
}
*/
// In join alerts
// Array of random help messages of the system
// Add archievement system

const propertyCache = new Map();

//FIXED



function hasPermission(player, permission) {
    return player.hasTag('admin') || player.hasTag(permission);
}


const commands = {
    update: (player) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        world.sendMessage("§9§lINTENTANDO ACTUALIZAR EL MUNDO EN 10seg");
        system.runTimeout(()=> {
            player.runCommand("kick @a '§aEl server se esta actualizando...'");
        }, 10*20);
        system.runTimeout(()=> {
            console.log("@$update36457");
        }, 10*20 + 20);
        return;
    },
    help: (player) => {
        const commandList = [
            '§6Comandos del Reino:',
            '!help - Muestra esta lista de comandos',
            '!hora - Ver la hora actual',
            '!spawn - Teletransportarse al spawn',
            '!set - Establecer tu hogar',
            '!home - Teletransportarse a tu hogar',
            '!tpa <jugador> - Solicitar teletransporte',
            '!si - Aceptar solicitud de teletransporte',
            '!reqs - Ver solicitudes de teletransporte',  // ---------
            '!warp - Ver warps disponibles', // ---
            '!setwarp <nombre> - Crear un warp',
            '!delwarp <nombre> - Eliminar un warp', // ---
            '!rango - Ver tu rango y reputación',
            '!stats - Ver tus estadísticas completas', // ---
            '!mission <id> - Iniciar una misión manualmente (si, con 2 s)',
            '!clan - Todos los comandos sobre clan',
            '!pay <jugador> <cantidad> - Pagar Ringcoins'
        ];
        /*'!prestamo <jugador> <monto> <días> - Prestar Ringcoins',
            '!trade <jugador> <monto> <item> - Proponer un intercambio',
            '!accepttrade <id> - Aceptar un intercambio',
            '!tradelist - Ver intercambios pendientes',
            '!canceltrade <id> - Cancelar un intercambio',
            '!todos <mensaje> - Enviar mensaje a todos (admin)',
            '!adminstats <jugador> - Ver estadísticas (admin)',
            '!setxp <jugador> <cantidad> - Establecer XP (admin)',
            '!setmoney <jugador> <cantidad> - Establecer Ringcoins (admin)',
            '!setrep <jugador> <nivel> - Establecer reputación (admin)',
            '!setclan <jugador> <nombre> - Asignar clan (admin)',
            '!delclan <nombre> - Eliminar clan (admin)'*/
        player.sendMessage(commandList.join('\n'));
    },
    hora: (player) => player.sendMessage(`§dLa hora actual es ${getTime()}`),
    spawn: (player) => {
        system.run(() => {
            player.teleport({ x: 155, y: 95, z: -51 }, { dimension: world.getDimension('overworld') });
            player.sendMessage('§aTeletransportándote al spawn del reino...');
        });
    },
    set: setHome,
    home: home,
    tpa: (player, args) => {
        if (args.length === 1) {
            const players = world.getAllPlayers().map(p => p.name);
            player.sendMessage(`§bJugadores disponibles: ${players.join(', ')}`);
        }
        tpa(player, args);
    },
    si: tpaccept,
    reqs: reqs,
    warp: (player, args) => {
        if (args.length === 1) {
            getWarps(player);
        } else {
            warpTo(player, args)
        }
    },
    setwarp: (player, args) => {
        setWarp(player, args);
    },
    delwarp: (player, args) => {
        delWarp(player, args);
    },
    rango: rango,
    stats: (player) => {
        player.sendMessage("§6Tus Stats:")
        stats(player)
    },
    mission: mission,
    clan: clan,
    // claim: (player) => {
    //     const data = getPlayerData(player);
    //     if (data.claims >= 2) {
    //         player.sendMessage('§cHas alcanzado el límite de 2 terrenos reclamados.');
    //         return;
    //     }
    //     const pos = player.location;
    //     const dim = player.dimension.id;
    //     const chunkX = Math.floor(pos.x / 30);
    //     const chunkZ = Math.floor(pos.z / 30);
    //     const key = `${dim}:${chunkX}:${chunkZ}`;
    //     if (claims.has(key)) {
    //         player.sendMessage('§cEsta área ya está reclamada.');
    //         return;
    //     }
    //     claims.set(key, { owner: player.name, trusted: new Set(), dimension: dim, x: chunkX * 30, z: chunkZ * 30 });
    //     data.claims += 1;
    //     savePlayerData(player, data);
    //     player.sendMessage(`§aTerreno reclamado en ${dim} (X:${chunkX * 30}, Z:${chunkZ * 30}, 30x30 bloques).`);
    // },
    pay: (player, args) => {
        if (args.length < 3) {
            player.sendMessage('§cUso: !pay <jugador> <cantidad>');
            return;
        }
        const targetName = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount <= 0) {
            player.sendMessage('§cCantidad inválida.');
            return;
        }
        const data = getPlayerData(player);
        if (data.balance < amount) {
            player.sendMessage('§cNo tienes suficiente dinero.');
            return;
        }

        const targetPlayer = world.getAllPlayers().find((p) => p.name.toLowerCase() === targetName.toLowerCase())

        if (targetPlayer === undefined) {
            player.sendMessage('§cEse jugador no existe (debes escribir su nombre exacto)');
            return;
        }

        const targetData = getPlayerData(targetPlayer);
        modificarDinero(player, -amount);
        targetData.balance = targetData.balance ? targetData.balance + amount : amount;
        savePlayerData(targetPlayer, targetData);
        player.sendMessage(`§aHas pagado ${amount} Ringcoins a ${targetPlayer.name}.`);
        targetPlayer.sendMessage(`§aHas recibido ${amount} Ringcoins de ${player.name}.`);
        addPlayerXp(player, 5, 'realizar un pago');
    },
    todos: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 2) {
            player.sendMessage('§cUso: !todos <mensaje>');
            return;
        }
        const message = args.slice(1).join(' ');
        world.sendMessage(`§c[Anuncio del Reino] ${player.name}: §f${message}`);
    },
    adminstats: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 2) {
            player.sendMessage('§cUso: !adminstats <jugador>');
            return;
        }
        const targetName = args[1];
        const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
        if (!targetData) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        const rank = RANKS.find(r => r.level <= getLevelFromXP(targetData.xp) && r.requirements(targetData)) || RANKS[0];
        const rep = REPUTATION_LEVELS.find(r => r.level === Math.max(-3, Math.min(3, targetData.reputation))) || REPUTATION_LEVELS[3];
        const properties = world.getDynamicPropertyIds()
            .filter(id => id.startsWith('property:') && JSON.parse(world.getDynamicProperty(id)).owner === targetName)
            .map(id => id.substring(9));
        player.sendMessage(`§6Estadísticas de ${targetName}:
§bRango: ${rank.color}${rank.name}
§bReputación: ${rep.color}${rep.name}
§bNivel: ${targetData.level}
§bXP: ${targetData.xp}
§bRingcoins: ${targetData.balance}
§bMisiones completadas: ${targetData.misiones}
§bTerrenos reclamados: ${targetData.claims}/2
§bDistancia recorrida: ${targetData.distance} bloques
§bAlimentos cocinados: ${targetData.cooked}
§bBloques colocados: ${targetData.placed}
§bJugadores eliminados: ${targetData.kills}
§bClan: ${targetData.clan || 'Ninguno'}
§bPropiedades: ${properties.length > 0 ? properties.join(', ') : 'Ninguna'}`);
    },
    setxp: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 3) {
            player.sendMessage('§cUso: !setxp <jugador> <cantidad>');
            return;
        }
        const targetName = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount < 0) {
            player.sendMessage('§cCantidad inválida.');
            return;
        }
        const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
        if (!targetData) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        targetData.xp = amount;
        targetData.level = getLevelFromXP(amount);
        savePlayerData({ name: targetData.name }, targetData);
        player.sendMessage(`§aXP de ${targetName} establecido a ${amount}.`);
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (targetPlayer) targetPlayer.sendMessage(`§aTu XP ha sido establecido a ${amount} por un administrador.`);
    },
    setmoney: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 3) {
            player.sendMessage('§cUso: !setmoney <jugador> <cantidad>');
            return;
        }
        const targetName = args[1];
        const amount = parseInt(args[2]);
        if (isNaN(amount) || amount < 0) {
            player.sendMessage('§cCantidad inválida.');
            return;
        }
        const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
        if (!targetData) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        targetData.balance = amount;
        savePlayerData({ name: targetName }, targetData);
        player.sendMessage(`§aRingcoins de ${targetName} establecidos a ${amount}.`);
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (targetPlayer) targetPlayer.sendMessage(`§aTus Ringcoins han sido establecidos a ${amount} por un administrador.`);
    },
    setrep: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 3) {
            player.sendMessage('§cUso: !setrep <jugador> <nivel>');
            return;
        }
        const targetName = args[1];
        const level = parseInt(args[2]);
        if (isNaN(level) || level < -3 || level > 3) {
            player.sendMessage('§cNivel de reputación inválido (-3 a 3).');
            return;
        }
        const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
        if (!targetData.name) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        targetData.reputation = level;
        savePlayerData({ name: targetName }, targetData);
        player.sendMessage(`§aReputación de ${targetName} establecida a ${level}.`);
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (targetPlayer) {
            targetPlayer.sendMessage(`§aTu reputación ha sido establecida a ${level} por un administrador.`);
            const rank = getRank(targetPlayer);
            const expectedRank = RANKS.find(r => r.level <= targetData.level && r.requirements(targetData));
            if (expectedRank !== rank) {
                targetData.xp = Math.max(0, targetData.xp - 50);
                savePlayerData(targetPlayer, targetData);
                targetPlayer.sendMessage(`§cTu rango ha sido ajustado a ${expectedRank.color}${expectedRank.name} debido a tu reputación.`);
            }
        }
    },
    setclan: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 3) {
            player.sendMessage('§cUso: !setclan <jugador> <nombre>');
            return;
        }
        const targetName = args[1];
        const clanName = args[2].toLowerCase();
        const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
        if (!targetData.name) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        if (!clanData.has(clanName)) {
            clanData.set(clanName, { leader: targetName, members: new Set([targetName]) });
        } else {
            const clan = clanData.get(clanName);
            clan.members.add(targetName);
        }
        targetData.clan = clanName;
        savePlayerData({ name: targetName }, targetData);
        player.sendMessage(`§a${targetName} asignado al clan '${clanName}'.`);
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (targetPlayer) targetPlayer.sendMessage(`§aHas sido asignado al clan '${clanName}' por un administrador.`);
    },
    delclan: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 2) {
            player.sendMessage('§cUso: !delclan <nombre>');
            return;
        }
        const clanName = args[1].toLowerCase();
        if (!clanData.has(clanName)) {
            player.sendMessage('§cClan no encontrado.');
            return;
        }
        for (const p of world.getAllPlayers()) {
            const data = getPlayerData(p);
            if (data.clan === clanName) {
                data.clan = null;
                savePlayerData(p, data);
                p.sendMessage(`§cEl clan '${clanName}' ha sido disuelto por un administrador.`);
            }
        }
        clanData.delete(clanName);
        player.sendMessage(`§aClan '${clanName}' eliminado.`);
    },
    worlddp: worldDP,
    modowner: modOwner,
    setclaim: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 4) {
            player.sendMessage('§cUso: !setclaim <jugador> <x> <z>');
            return;
        }
        const targetName = args[1];
        const x = parseInt(args[2]);
        const z = parseInt(args[3]);
        if (isNaN(x) || isNaN(z)) {
            player.sendMessage('§cCoordenadas inválidas.');
            return;
        }
        const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
        if (!targetData.name) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        if (targetData.claims >= 2) {
            player.sendMessage(`§c${targetName} ha alcanzado el límite de claims.`);
            return;
        }
        const dim = 'minecraft:overworld';
        const chunkX = Math.floor(x / 30);
        const chunkZ = Math.floor(z / 30);
        const key = `${dim}:${chunkX}:${chunkZ}`;
        if (claims.has(key)) {
            player.sendMessage('§cEsta área ya está reclamada.');
            return;
        }
        claims.set(key, { owner: targetName, trusted: new Set(), dimension: dim, x: chunkX * 30, z: chunkZ * 30 });
        targetData.claims = (targetData.claims || 0) + 1;
        savePlayerData({ name: targetName }, targetData);
        player.sendMessage(`§aTerreno asignado a ${targetName} en ${dim} (X:${chunkX * 30}, Z:${chunkZ * 30}).`);
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (targetPlayer) targetPlayer.sendMessage(`§aTe han asignado un terreno en ${dim} (X:${chunkX * 30}, Z:${chunkZ * 30}) por un administrador.`);
    },
    delclaim: (player, args) => {
        if (!hasPermission(player, 'admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        if (args.length < 3) {
            player.sendMessage('§cUso: !delclaim <x> <z>');
            return;
        }
        const x = parseInt(args[1]);
        const z = parseInt(args[2]);
        if (isNaN(x) || isNaN(z)) {
            player.sendMessage('§cCoordenadas inválidas.');
            return;
        }
        const dim = 'minecraft:overworld';
        const chunkX = Math.floor(x / 30);
        const chunkZ = Math.floor(z / 30);
        const key = `${dim}:${chunkX}:${chunkZ}`;
        if (!claims.has(key)) {
            player.sendMessage('§cNo hay claim en esta área.');
            return;
        }
        const claim = claims.get(key);
        const targetData = propertyCache.get(`playerData:${claim.owner}`) || JSON.parse(world.getDynamicProperty(`playerData:${claim.owner}`) || '{}');
        if (targetData.name) {
            targetData.claims = Math.max(0, (targetData.claims || 0) - 1);
            savePlayerData({ name: claim.owner }, targetData);
            const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === claim.owner.toLowerCase());
            if (targetPlayer) targetPlayer.sendMessage(`§cTu claim en ${dim} (X:${chunkX * 30}, Z:${chunkZ * 30}) ha sido eliminado por un administrador.`);
        }
        claims.delete(key);
        player.sendMessage(`§aClaim eliminado en ${dim} (X:${chunkX * 30}, Z:${chunkZ * 30}).`);
    }
};



function checkForAnswer(answer, player) {
    if (answer === mathQuizActive.answer) {
        mathQuizActive.active = false;
        addDinero(player, mathQuizActive.reward);
        addPlayerXp(player, 15, 'resolver un quiz matemático');
        world.sendMessage(`§a¡${player.name} ha resuelto el quiz y gana ${mathQuizActive.reward} Ringcoins y 15 XP!`);
    } else {
        player.sendMessage('§7[Quiz] §oRespuesta incorrecta.');
    }
}

// Manejo de eventos
world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;
    const message = event.message;
    if (!message.startsWith('!')) {
        if (mathQuizActive.active) checkForAnswer(message, player)
        event.cancel = true;
        addPlayerXp(player, 1);
        sendRankedChat(player, message);
        return;
    }
    event.cancel = true;
    const args = message.slice(1).split(' ');
    const command = args[0].toLowerCase();
    if (commands[command]) {
        commands[command](player, args);
    } else {
        player.sendMessage('§cComando no reconocido. Usa !help para ver los comandos disponibles.');
    }
});


const playerMovementData = new Map();

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const playerId = player.id;
        const newPos = player.location;
        
        // Obtenemos los datos del jugador del Map. Si no existen, los inicializamos.
        let data = playerMovementData.get(playerId);
        
        if (!data) {
            // Si es la primera vez que el jugador es procesado, creamos su entrada.
            // Para el `lastPos`, usamos su posición actual para evitar un cálculo erróneo.
            data = {
                lastPos: newPos,
                totalDistance: 0
            };
            playerMovementData.set(playerId, data);
        }

        // Calculamos la distancia recorrida desde el último intervalo
        const oldPos = data.lastPos;
        const distance = Math.sqrt((newPos.x - oldPos.x) ** 2 + (newPos.z - oldPos.z) ** 2);
        
        // Actualizamos los datos en el Map
        data.totalDistance += Math.floor(distance);
        data.lastPos = newPos;

        let playerdata = getPlayerData(player)
        playerdata.distance += Math.floor(distance);
        savePlayerData(playerdata);

        // Solo otorgamos XP y actualizamos misiones si el jugador se ha movido
        if (distance > 0) {
            // Nota: Aquí necesitarías implementar addPlayerXp y updateMissionProgress
            // con la lógica que uses en tu sistema.
            addPlayerXp(player, Math.floor(distance / 100));
            updateMissionProgress(player, 'move', Math.floor(distance));
        }
    }
}, 20 * 60); // Cada minuto

system.runInterval(() => {
    if (!mathQuizActive.active) {
        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * 20) + 1;
        const ops = ['+', '-', '*', '/'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let answer;
        if (op === '+') answer = a + b;
        else if (op === '-') answer = a - b;
        else if (op === '*') answer = a * b;
        else answer = Math.floor(a / b);
        mathQuizActive.active = true;
        mathQuizActive.answer = answer.toString();
        print(mathQuizActive.answer)
        mathQuizActive.reward = 10;
        world.sendMessage(`§b¡Quiz matemático del reino! Resuelve: ${a} ${op} ${b} = ?. ¡Responde directamente!`);
        system.runTimeout(() => {
            if (mathQuizActive.active) {
                mathQuizActive.active = false;
                world.sendMessage(`§c¡Vaya incultos! La respuesta era: ${answer}`);
            }
        }, 90 * 20); // 90 segundos
    }
}, 20 * 10 * 60); // Cada 10 minutos