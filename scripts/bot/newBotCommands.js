import { PlayerSpawnAfterEvent, system, world } from '@minecraft/server';

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

function isAdmin(player) {
  return player.getTags().includes("admin");
}

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

// ------------------ GESTIÓN DE TELETRANSPORTES ----------------------

function addTpReq(senderName, targetPlayerName) {
  playerTpReqs.push({ sender: senderName, target: targetPlayerName });
  system.runTimeout(() => {
    const index = playerTpReqs.findIndex(req => req.sender === senderName && req.target === targetPlayerName);
    if (index !== -1) {
      playerTpReqs.splice(index, 1);
      const sender = [...world.getPlayers()].find(p => p.name === senderName);
      if (sender) sender.sendMessage(`§cLa solicitud de teletransporte a ${targetPlayerName} ha caducado.`);
    }
  }, 40 * 20); // 40 segundos
}

function removeTpReq(senderName, targetPlayerName) {
  const index = playerTpReqs.findIndex(req => req.sender === senderName && req.target === targetPlayerName);
  if (index !== -1) playerTpReqs.splice(index, 1);
}

// ------------------- COMANDOS Y EVENTOS PRINCIPALES -------------------

world.beforeEvents.chatSend.subscribe(event => {
  const message = event.message;
  const player = event.sender;
  if (!message.startsWith("!")) return;

  event.cancel = true;
  const args = message.trim().split(" ");
  const cmd = args[0].toLowerCase();

  // Comando !help
  if (cmd === "!help") {
    player.sendMessage(`§g§lComandos disponibles:§r§d
!hora - Ver la hora actual
!spawn - Teletransportarse al spawn
!dia - Cambiar a día
!clima - Pacificar el clima
!set - Establecer posición de casa
!home - Teletransportarse a la casa registrada
!reqs - Ver solicitudes de teletransporte pendientes
!tpa <jugador> - Solicitar teletransporte
!si - Aceptar solicitud
!warp - Lista warps
!warp set <nombre> - Crear warp
!warp del <nombre> - Eliminar warp
!claim - Reclamar tierra
!unclaim - Liberar tierra
!trust <jugador> - Confiar en jugador para tu claim
!untrust <jugador> - Revocar confianza
!clan crear <nombre> - Crear clan
!clan invitar <jugador> - Invitar clan
!clan info - Info clan
!stats - Ver tus stats y rango
!pay <jugador> <cantidad> - Pagar monedas
!mathquiz - Iniciar minijuego matemático
`);
    return;
  }

  // Comando !hora
  if (cmd === "!hora") {
    const date = new Date();
    player.sendMessage(`§dLa hora actual es ${date.getHours()}:${date.getMinutes().toString().padStart(2,"0")}`);
    return;
  }

  // Comando !spawn
  if (cmd === "!spawn") {
    const overworld = world.getDimension("overworld");
    player.teleport({ x: 155, y: 95, z: -51 }, { dimension: overworld });
    player.sendMessage("Teletransportándote al spawn...");
    return;
  }

  // Comando !dia
  if (cmd === "!dia") {
    world.getDimension("overworld").runCommand("time set sunrise");
    player.sendMessage("§aEl tiempo ha sido cambiado a día.");
    return;
  }

  // Comando !clima
  if (cmd === "!clima") {
    world.getDimension("overworld").runCommand("weather clear");
    player.sendMessage("§aEl clima ha sido pacificado.");
    return;
  }

  // Comando !set (casa)
  if (cmd === "!set") {
    const pos = player.location;
    const dim = player.dimension.id;
    if (dim !== "minecraft:overworld") {
      player.sendMessage("§cSolo puedes establecer tu casa en el Overworld.");
      return;
    }
    const homeData = JSON.stringify({ dimension: dim, location: { x: pos.x, y: pos.y, z: pos.z } });
    player.setDynamicProperty("home", homeData);
    player.sendMessage(`§aCasa registrada en X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)}`);
    return;
  }

  // Comando !home
  if (cmd === "!home") {
    const homeStr = player.getDynamicProperty("home");
    if (!homeStr) {
      player.sendMessage("§cNo tienes una casa registrada. Usa !set para establecerla.");
      return;
    }
    const home = JSON.parse(homeStr);
    const dim = world.getDimension(home.dimension);
    if (!dim) {
      player.sendMessage("§cDimensión no encontrada.");
      return;
    }
    player.teleport(home.location, { dimension: dim });
    player.sendMessage("§aTeletransportándote a tu casa...");
    return;
  }

  // Comando !reqs
  if (cmd === "!reqs") {
    const reqs = playerTpReqs.filter(r => r.target === player.name);
    if (reqs.length === 0) {
      player.sendMessage("§cNo tienes solicitudes de teletransporte pendientes.");
      return;
    }
    const list = reqs.map(r => `De: ${r.sender}`).join("\n");
    player.sendMessage(`§bSolicitudes pendientes:\n${list}`);
    return;
  }

  // Comando !tpa <jugador>
  if (cmd === "!tpa") {
    if (args.length < 2) {
      player.sendMessage("§cUso: !tpa <jugador>");
      return;
    }
    const targetName = args[1].toLowerCase();
    if (player.name.toLowerCase() === targetName) {
      player.sendMessage("§cNo puedes teletransportarte a ti mismo.");
      return;
    }
    const targetPlayer = [...world.getPlayers()].find(p => p.name.toLowerCase().startsWith(targetName));
    if (!targetPlayer) {
      player.sendMessage(`§cJugador no encontrado que comience con '${targetName}'.`);
      return;
    }
    if (playerTpReqs.some(r => r.sender === player.name && r.target === targetPlayer.name)) {
      player.sendMessage(`§cYa tienes una solicitud pendiente para ${targetPlayer.name}.`);
      return;
    }
    addTpReq(player.name, targetPlayer.name);
    targetPlayer.sendMessage(`§dSolicitud de teletransporte de ${player.name}. Escribe !si para aceptar.`);
    player.sendMessage(`§aSolicitud enviada a ${targetPlayer.name}.`);
    return;
  }

  // Comando !si
  if (cmd === "!si") {
    const req = playerTpReqs.find(r => r.target === player.name);
    if (!req) {
      player.sendMessage("§cNo tienes solicitudes pendientes.");
      return;
    }
    const sender = [...world.getPlayers()].find(p => p.name === req.sender);
    if (!sender) {
      player.sendMessage("§cEl solicitante ya no está en línea.");
      removeTpReq(req.sender, req.target);
      return;
    }
    sender.teleport(player.location, { dimension: player.dimension });
    sender.sendMessage(`§aTeletransportado a ${player.name}.`);
    player.sendMessage("§aSolicitud aceptada.");
    removeTpReq(req.sender, req.target);
    return;
  }

  // Comando !stats
  if (cmd === "!stats") {
    const data = getPlayerData(player);
    const rank = getRank(data.level);
    player.sendMessage(`§6Tus stats:
Nivel: §a${data.level}
XP: §a${data.xp}
Rango: ${rank.color}${rank.name}§r
Balance: §e${data.balance} monedas`);
    return;
  }

  // Comando !pay <jugador> <cantidad>
  if (cmd === "!pay") {
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

  // ---------------- SISTEMA DE RANGOS Y XP --------------------- //ERR No sirve porque esta abajo y nunca sucede


  // ----------------- COMANDOS DE CLAN --------------------------
  if (cmd === "!clan") {
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

  // --------------------- WARPS ------------------------
  // if (cmd === "!warp") { //ERR Hace inalcanzable el resto de warps
  //   if (args.length === 1) {
  //     // Listar warps
  //     let warpList = [];
  //     const props = world.getDynamicPropertyIds();
  //     for (const prop of props) {
  //       if (prop.startsWith("warp:")) {
  //         warpList.push(prop.slice(5));
  //       }
  //     }
  //     if (warpList.length === 0) {
  //       player.sendMessage("§cNo hay warps disponibles.");
  //     } else {
  //       player.sendMessage("§6Warps disponibles:\n" + warpList.map(w => `!warp ${w}`).join("\n"));
  //     }
  //     return;
  //   }
  //   // Comando !warp <nombre>
  //   if (args.length === 2) {
  //     const warpName = args[1].toLowerCase();
  //     const warpStr = world.getDynamicProperty(`warp:${warpName}`);
  //     if (!warpStr) {
  //       player.sendMessage("§cWarp no encontrado.");
  //       return;
  //     }
  //     const warpData = JSON.parse(warpStr);
  //     const dim = world.getDimension(warpData.dimension);
  //     if (!dim) {
  //       player.sendMessage("§cDimensión del warp no encontrada.");
  //       return;
  //     }
  //     player.teleport(warpData.location, { dimension: dim });
  //     player.sendMessage(`§aTeletransportándote al warp '${warpName}'.`);
  //     return;
  //   }
  //   player.sendMessage("§cUso: !warp o !warp <nombre>"); //ERR no sirve no se pq
  //   return;
  // }

  // // Comando !warp set <nombre>
  // if (cmd === "!warp" && args[1] === "set") {
  //   if (args.length < 3) {
  //     player.sendMessage("§cUso: !warp set <nombre>");
  //     return;
  //   }
  //   const warpName = args[2].toLowerCase();
  //   if (world.getDynamicProperty(`warp:${warpName}`)) {
  //     player.sendMessage("§cYa existe un warp con ese nombre.");
  //     return;
  //   }
  //   const dim = player.dimension.id;
  //   if (dim === "minecraft:nether") {
  //     player.sendMessage("§cSolo administradores pueden establecer warps en Nether.");
  //     return;
  //   }
  //   if (dim === "minecraft:end") {
  //     player.sendMessage("§cSolo administradores pueden establecer warps en End.");
  //     return;
  //   }
  //   if (!isAdmin(player) && getPlayerData(player).warpCount >= 1) {
  //     player.sendMessage("§cNo puedes establecer más warps, elimina algunos primero.");
  //     return;
  //   }
  //   const pos = player.location;
  //   const warpData = {
  //     dimension: dim,
  //     location: { x: pos.x, y: pos.y, z: pos.z },
  //     owner: player.name
  //   };
  //   world.setDynamicProperty(`warp:${warpName}`, JSON.stringify(warpData));
  //   const data = getPlayerData(player);
  //   data.warpCount = (data.warpCount || 0) + 1; // Puede que warpCount no exista aún
  //   savePlayerData(player, data);
  //   player.sendMessage(`§aWarp '${warpName}' establecido.`);
  //   return;
  // }

  // // Comando !warp del <nombre>
  // if (cmd === "!warp" && args[1] === "del") {
  //   if (args.length < 3) {
  //     player.sendMessage("§cUso: !warp del <nombre>");
  //     return;
  //   }
  //   const warpName = args[2].toLowerCase();
  //   const warpStr = world.getDynamicProperty(`warp:${warpName}`);
  //   if (!warpStr) {
  //     player.sendMessage("§cWarp no encontrado.");
  //     return;
  //   }
  //   const warpData = JSON.parse(warpStr);
  //   if (warpData.owner !== player.name && !isAdmin(player)) {
  //     player.sendMessage("§cSolo el dueño o un admin puede eliminar este warp.");
  //     return;
  //   }
  //   world.setDynamicProperty(`warp:${warpName}`, undefined);
  //   const data = getPlayerData(player);
  //   data.warpCount = Math.max(0, (data.warpCount || 0) - 1);
  //   savePlayerData(player, data);
  //   player.sendMessage(`§aWarp '${warpName}' eliminado.`);
  //   return;
  // }

  // ---------------- CLAIMS (protección terrenos) ------------------
  // if (cmd === "!claim") {
  //   // Obtener clave claim según posición y dimensión
  //   const pos = player.location;
  //   const dim = player.dimension.id;
  //   const key = `${dim}:${Math.floor(pos.x)}:${Math.floor(pos.z)}`;
  //   if (claims.has(key)) {
  //     player.sendMessage("§cEste terreno ya está reclamado.");
  //     return;
  //   }
  //   claims.set(key, { owner: player.name, trusted: new Set() });
  //   player.sendMessage("§aTerreno reclamado exitosamente.");
  //   return;
  // }

  // if (cmd === "!unclaim") {
  //   const pos = player.location;
  //   const dim = player.dimension.id;
  //   const key = `${dim}:${Math.floor(pos.x)}:${Math.floor(pos.z)}`;
  //   const claim = claims.get(key);
  //   if (!claim) {
  //     player.sendMessage("§cEste terreno no está reclamado.");
  //     return;
  //   }
  //   if (claim.owner !== player.name && !isAdmin(player)) {
  //     player.sendMessage("§cNo puedes liberar un terreno que no es tuyo.");
  //     return;
  //   }
  //   claims.delete(key);
  //   player.sendMessage("§aTerreno liberado.");
  //   return;
  // }

  // if (cmd === "!trust") {
  //   if (args.length < 2) {
  //     player.sendMessage("§cUso: !trust <jugador>");
  //     return;
  //   }
  //   const targetName = args[1].toLowerCase();
  //   const pos = player.location;
  //   const dim = player.dimension.id;
  //   const key = `${dim}:${Math.floor(pos.x)}:${Math.floor(pos.z)}`;
  //   const claim = claims.get(key);
  //   if (!claim) {
  //     player.sendMessage("§cEste terreno no está reclamado.");
  //     return;
  //   }
  //   if (claim.owner !== player.name && !isAdmin(player)) {
  //     player.sendMessage("§cNo tienes permisos para confiar jugadores aquí.");
  //     return;
  //   }
  //   claim.trusted.add(targetName);
  //   player.sendMessage(`§aJugador ${args[1]} agregado como confiable.`);
  //   return;
  // }

  // if (cmd === "!untrust") {
  //   if (args.length < 2) {
  //     player.sendMessage("§cUso: !untrust <jugador>");
  //     return;
  //   }
  //   const targetName = args[1].toLowerCase();
  //   const pos = player.location;
  //   const dim = player.dimension.id;
  //   const key = `${dim}:${Math.floor(pos.x)}:${Math.floor(pos.z)}`;
  //   const claim = claims.get(key);
  //   if (!claim) {
  //     player.sendMessage("§cEste terreno no está reclamado.");
  //     return;
  //   }
  //   if (claim.owner !== player.name && !isAdmin(player)) {
  //     player.sendMessage("§cNo tienes permisos para remover confianza.");
  //     return;
  //   }
  //   claim.trusted.delete(targetName);
  //   player.sendMessage(`§aJugador ${args[1]} removido de confiables.`);
  //   return;
  // }

  // ---------------- MISIONS --------------------
  if (cmd === "!mission") {
    // Mostrar misión actual
    const currentMission = playerMissions.get(player.name);
    if (!currentMission) {
      player.sendMessage("§cNo tienes misiones activas.");
      return;
    }
    player.sendMessage(`§aMisión actual: ${currentMission.description} Progreso: ${currentMission.progress || 0}/${currentMission.target}`);
    return;
  }

  if (cmd === "!mathquiz") {
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

  if (cmd === "!respuesta") {
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

  // Comando no reconocido
  player.sendMessage("§eComando no reconocido. Usa !help para ayuda.");
});

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