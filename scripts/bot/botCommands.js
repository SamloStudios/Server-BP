import { system, world, ItemStack, MinecraftItemTypes } from '@minecraft/server';
import { getTime } from './botUtils.js';
import { setHome, home } from './home.js';
import { reqs, tpa, tpaccept } from './tp.js';
import { setWarp, delWarp, getWarps, warpTo, addToPlayerWarpC } from './warp.js';

// Definición de rangos y reputación
const RANKS = [
    { level: 0, name: "Campesino", color: "§7", requirements: () => true },
    { level: 5, name: "Aldeano", color: "§f", requirements: (data) => data.misiones >= 3 && data.balance >= 100 && data.reputation >= 0 },
    { level: 10, name: "Escudero", color: "§a", requirements: (data) => data.misiones >= 7 && data.balance >= 300 && data.reputation >= 1 },
    { level: 15, name: "Caballero", color: "§b", requirements: (data) => data.misiones >= 15 && data.reputation >= 2 && data.balance >= 700 },
    { level: 25, name: "Barón", color: "§9", requirements: (data) => data.misiones >= 25 && data.claims >= 1 && data.balance >= 1500 && data.reputation >= 3 },
    { level: 40, name: "Conde", color: "§6", requirements: (data) => data.misiones >= 40 && data.reputation >= 4 && data.balance >= 2500 },
    { level: 60, name: "Duque", color: "§5", requirements: (data) => data.misiones >= 60 && data.clan && data.balance >= 5000 && data.reputation >= 5 },
    { level: 90, name: "Príncipe", color: "§d", requirements: (data) => data.misiones >= 90 && data.events >= 1 && data.balance >= 8000 && data.reputation >= 6 },
    { level: 120, name: "Rey", color: "§c", requirements: (data) => data.misiones >= 120 && data.balance >= 15000 && data.events >= 3 && data.reputation >= 6 },
    { level: 640, name: "Emperador", color: "§4", requirements: (data) => data.admin }
];

const REPUTATION_LEVELS = [
    { level: -3, name: "Forajido", color: "§4" },
    { level: -2, name: "Rufián", color: "§c" },
    { level: -1, name: "Pícaro", color: "§e" },
    { level: 0, name: "Neutral", color: "§7" },
    { level: 1, name: "Honrado", color: "§a" },
    { level: 2, name: "Noble", color: "§b" },
    { level: 3, name: "Heroico", color: "§d" }
];

// Estructuras de datos
const playerMissions = new Map();
const clanData = new Map();
const claims = new Map();
const mathQuizActive = { active: false, answer: null, reward: 0 };
const missions = [
    { id: 1, description: "Minar 200 bloques", type: "mine", target: 200, rewardXP: 50, rewardGold: 25, minRank: "Campesino" },
    { id: 2, description: "Derrotar 25 mobs", type: "killMob", target: 25, rewardXP: 75, rewardGold: 40, minRank: "Campesino" },
    { id: 3, description: "Caminar 5000 bloques", type: "move", target: 5000, rewardXP: 60, rewardGold: 30, minRank: "Aldeano" },
    { id: 4, description: "Cocinar 50 alimentos", type: "cook", target: 50, rewardXP: 40, rewardGold: 20, minRank: "Aldeano" },
    { id: 5, description: "Minar 50 bloques de mineral (carbón, hierro, etc.)", type: "mineOre", target: 50, rewardXP: 100, rewardGold: 50, minRank: "Escudero" },
    { id: 6, description: "Derrotar un jefe (Wither o Ender Dragon)", type: "killBoss", target: 1, rewardXP: 300, rewardGold: 150, minRank: "Caballero" },
    { id: 7, description: "Comerciar 1000 Ringcoins", type: "trade", target: 1000, rewardXP: 80, rewardGold: 50, minRank: "Escudero" },
    { id: 8, description: "Construir 500 bloques", type: "place", target: 500, rewardXP: 100, rewardGold: 60, minRank: "Caballero" },
    { id: 9, description: "Recolectar 20 diamantes", type: "mineDiamond", target: 20, rewardXP: 150, rewardGold: 100, minRank: "Barón" },
    { id: 10, description: "Matar 10 jugadores (PvP)", type: "killPlayer", target: 10, rewardXP: 200, rewardGold: 120, minRank: "Conde" },
    { id: 11, description: "Participar en 3 eventos de clan", type: "clanEvent", target: 3, rewardXP: 300, rewardGold: 200, minRank: "Príncipe" }
];

const propertyCache = new Map();

function getPlayerData(player) {
    const key = `playerData:${player.name}`;
    if (!propertyCache.has(key)) {
        const dataStr = world.getDynamicProperty(key);
        propertyCache.set(key, dataStr ? JSON.parse(dataStr) : {
            xp: 0, level: 0, balance: 200, misiones: 0, reputation: 0, claims: 0, events: 0, clan: null, distance: 0, cooked: 0, admin: player.hasTag('admin'), placed: 0, kills: 0
        });
    }
    return propertyCache.get(key);
}

function savePlayerData(player, data) {
    const key = `playerData:${player.name}`;
    propertyCache.set(key, data);
    world.setDynamicProperty(key, JSON.stringify(data));
}

function getLevelFromXP(xp) {
    let level = 0, xpNeeded = 100, xpAcc = 0;
    while (xp >= xpAcc + xpNeeded) {
        xpAcc += xpNeeded;
        xpNeeded = Math.floor(xpNeeded * 1.2);
        level++;
    }
    return level;
}

function getRank(player) {
    const data = getPlayerData(player);
    let currentRank = RANKS[0];
    for (const rank of RANKS) {
        if (data.level >= rank.level && rank.requirements(data)) {
            currentRank = rank;
        } else {
            break;
        }
    }
    return currentRank;
}

function getReputation(player) {
    const data = getPlayerData(player);
    return REPUTATION_LEVELS.find(r => r.level === Math.max(-3, Math.min(3, data.reputation))) || REPUTATION_LEVELS[3];
}

export function formatPlayerName(player) {
    const rank = getRank(player);
    const rep = getReputation(player);
    const prefix = player.hasTag('admin') ? "§l§c[Emperador] " : `${rank.color}[${rank.name}] ${rep.color}[${rep.name}] `;
    return prefix + player.name;
}

export function sendRankedChat(player, message) {
    world.sendMessage(`${formatPlayerName(player)}: §f${message}`);
}

function hasPermission(player, permission) {
    return player.hasTag('admin') || player.hasTag(permission);
}

function addPlayerXp(player, amount, reason) {
    const data = getPlayerData(player);
    const oldRank = getRank(player);
    data.xp += amount;
    const newLevel = getLevelFromXP(data.xp);
    if (newLevel > data.level) {
        data.level = newLevel;
        data.balance += newLevel * 5;
        player.sendMessage(`§a¡Has subido al nivel ${newLevel} por ${reason}! Ganaste ${newLevel * 5} Ringcoins.`);
        const newRank = getRank(player);
        if (newRank !== oldRank) {
            system.run(() => {
                player.runCommandAsync("summon fireworks_rocket").catch(() => {});
                player.runCommandAsync("playsound random.levelup @s").catch(() => {});
            });
            world.sendMessage(`§b¡${player.name} ha ascendido al rango ${newRank.color}${newRank.name}§r!`);
        }
    }
    savePlayerData(player, data);
}

function modifyReputation(player, amount) {
    const data = getPlayerData(player);
    data.reputation = Math.max(-3, Math.min(3, data.reputation + amount));
    savePlayerData(player, data);
    const rep = getReputation(player);
    player.sendMessage(`§6Tu reputación ahora es: ${rep.color}${rep.name}`);
    const rank = getRank(player);
    const expectedRank = RANKS.find(r => r.level <= data.level && r.requirements(data));
    if (expectedRank !== rank) {
        data.xp = Math.max(0, data.xp - 50);
        player.sendMessage(`§cTu rango ha sido ajustado a ${expectedRank.color}${expectedRank.name} debido a tu reputación.`);
    }
}

export function getDinero(player) {
    return getPlayerData(player).balance || 200;
}

export function setDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = Math.max(0, cantidad);
    savePlayerData(player, data);
    player.sendMessage(`§6Tu saldo ahora es: §e${data.balance} Ringcoins`);
}

export function modificarDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = Math.max(0, (data.balance || 200) + cantidad);
    savePlayerData(player, data);
    player.sendMessage(`§6Tu saldo ha cambiado en ${cantidad}. Saldo actual: §e${data.balance} Ringcoins`);
    if (cantidad > 0) updateMissionProgress(player, 'trade', cantidad);
}

function startMission(player, missionId) {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
        player.sendMessage('§cMisión no encontrada.');
        return;
    }
    const rank = getRank(player);
    if (RANKS.findIndex(r => r.name === mission.minRank) > RANKS.findIndex(r => r.name === rank.name)) {
        player.sendMessage('§cNo tienes el rango necesario para esta misión.');
        return;
    }
    if (playerMissions.has(player.name)) {
        player.sendMessage('§cYa tienes una misión activa.');
        return;
    }
    playerMissions.set(player.name, { missionId, progress: 0, assigned: Date.now() });
    player.sendMessage(`§aHas comenzado la misión: ${mission.description}`);
}

function autoAssignMissions() {
    for (const player of world.getAllPlayers()) {
        if (playerMissions.has(player.name)) continue;
        const rank = getRank(player);
        const availableMissions = missions.filter(m => RANKS.findIndex(r => r.name === m.minRank) <= RANKS.findIndex(r => r.name === rank.name));
        if (availableMissions.length === 0) continue;
        const mission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
        playerMissions.set(player.name, { missionId: mission.id, progress: 0, assigned: Date.now() });
        player.sendMessage(`§aNueva misión asignada automáticamente: ${mission.description}`);
    }
}

function updateMissionProgress(player, type, amount) {
    const missionData = playerMissions.get(player.name);
    if (!missionData) return;
    const mission = missions.find(m => m.id === missionData.missionId);
    if (mission.type === type) {
        missionData.progress += amount;
        if (missionData.progress >= mission.target) {
            completeMission(player, mission);
        } else {
            player.sendMessage(`§bProgreso de misión: ${missionData.progress}/${mission.target}`);
        }
        playerMissions.set(player.name, missionData);
    }
}

function completeMission(player, mission) {
    const data = getPlayerData(player);
    data.xp += mission.rewardXP;
    data.balance += mission.rewardGold;
    data.misiones += 1;
    savePlayerData(player, data);
    playerMissions.delete(player.name);
    player.sendMessage(`§a¡Misión completada! Recompensas: ${mission.rewardXP} XP, ${mission.rewardGold} Ringcoins.`);
    system.runTimeout(() => autoAssignMissions(), 20 * 60); // Reasignar misión tras 1 minuto
}

const commands = {
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
            '!reqs - Ver solicitudes de teletransporte',
            '!warp - Ver warps disponibles',
            '!setwarp <nombre> - Crear un warp',
            '!delwarp <nombre> - Eliminar un warp',
            '!rango - Ver tu rango y reputación',
            '!stats - Ver tus estadísticas completas',
            '!mission <id> - Iniciar una misión manualmente',
            '!r <respuesta> - Responder al quiz matemático',
            '!clan crear <nombre> - Crear un clan',
            '!clan invitar <jugador> - Invitar a un clan',
            '!clan info - Ver información del clan',
            '!claim - Reclamar un terreno (30x30)',
            '!pay <jugador> <cantidad> - Pagar Ringcoins',
            '!prestamo <jugador> <monto> <días> - Prestar Ringcoins',
            '!mortgage <propiedad> <monto> - Hipotecar una propiedad',
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
            '!delclan <nombre> - Eliminar clan (admin)',
            '!setclaim <jugador> <x> <z> - Asignar claim (admin)',
            '!delclaim <x> <z> - Eliminar claim (admin)'
        ];
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
    warp: warpTo,
    setwarp: setWarp,
    delwarp: delWarp,
    rango: (player) => {
        const rank = getRank(player);
        const rep = getReputation(player);
        const index = RANKS.findIndex(r => r.name === rank.name);
        player.sendMessage(`§6Tu rango: ${rank.color}${rank.name}\n§6Tu reputación: ${rep.color}${rep.name}`);
        if (RANKS[index + 1]) {
            player.sendMessage(`§7Siguiente rango: ${RANKS[index + 1].name}`);
        } else {
            player.sendMessage(`§b¡Has alcanzado el máximo rango del reino!`);
        }
    },
    stats: (player) => {
        const data = getPlayerData(player);
        const rank = getRank(player);
        const rep = getReputation(player);
        const warpCount = player.getDynamicProperty('warp:count') || 0;
        const home = player.getDynamicProperty('home') ? JSON.parse(player.getDynamicProperty('home')).location : 'No establecido';
        const properties = world.getDynamicPropertyIds()
            .filter(id => id.startsWith('property:') && JSON.parse(world.getDynamicProperty(id)).owner === player.name)
            .map(id => id.substring(9));
        player.sendMessage(`§6Estadísticas de ${player.name}:
§bRango: ${rank.color}${rank.name}
§bReputación: ${rep.color}${rep.name}
§bNivel: ${data.level}
§bXP: ${data.xp}
§bRingcoins: ${data.balance}
§bMisiones completadas: ${data.misiones}
§bTerrenos reclamados: ${data.claims}/2
§bDistancia recorrida: ${data.distance} bloques
§bAlimentos cocinados: ${data.cooked}
§bBloques colocados: ${data.placed}
§bJugadores eliminados: ${data.kills}
§bClan: ${data.clan || 'Ninguno'}
§bHogar: ${typeof home === 'object' ? `X:${home.x}, Y:${home.y}, Z:${home.z}` : home}
§bWarps: ${warpCount}
§bPropiedades: ${properties.length > 0 ? properties.join(', ') : 'Ninguna'}`);
    },
    mission: (player, args) => {
        if (args.length < 2) {
            player.sendMessage(`§cUso: !mission <id>\n§bMisiones disponibles:\n${missions.map(m => `ID ${m.id}: ${m.description} (${m.minRank})`).join('\n')}`);
            return;
        }
        startMission(player, parseInt(args[1]));
    },
    r: (player, args) => {
        if (!mathQuizActive.active) {
            player.sendMessage('§cNo hay un quiz activo.');
            return;
        }
        if (args.length < 2) {
            player.sendMessage('§cUso: !r <respuesta>');
            return;
        }
        const answer = parseInt(args[1]);
        if (answer === mathQuizActive.answer) {
            mathQuizActive.active = false;
            modificarDinero(player, mathQuizActive.reward);
            addPlayerXp(player, 5, 'resolver un quiz matemático');
            world.sendMessage(`§a¡${player.name} ha resuelto el quiz y gana ${mathQuizActive.reward} Ringcoins y 5 XP!`);
        } else {
            player.sendMessage('§cRespuesta incorrecta.');
        }
    },
    clan: (player, args) => {
        if (args.length < 2) {
            player.sendMessage('§cUso: !clan <crear|invitar|info> [nombre|jugador]');
            return;
        }
        const subcommand = args[1].toLowerCase();
        if (subcommand === 'crear') {
            if (args.length < 3) {
                player.sendMessage('§cUso: !clan crear <nombre>');
                return;
            }
            const clanName = args[2].toLowerCase();
            if (clanData.has(clanName)) {
                player.sendMessage('§cYa existe un clan con ese nombre.');
                return;
            }
            const data = getPlayerData(player);
            if (data.clan) {
                player.sendMessage('§cYa estás en un clan.');
                return;
            }
            clanData.set(clanName, { leader: player.name, members: new Set([player.name]) });
            data.clan = clanName;
            savePlayerData(player, data);
            addPlayerXp(player, 50, 'fundar un clan');
            player.sendMessage(`§aClan '${clanName}' creado exitosamente.`);
        } else if (subcommand === 'invitar') {
            if (args.length < 3) {
                player.sendMessage('§cUso: !clan invitar <jugador>');
                return;
            }
            const targetName = args[2];
            const data = getPlayerData(player);
            if (!data.clan) {
                player.sendMessage('§cNo estás en un clan.');
                return;
            }
            const clan = clanData.get(data.clan);
            if (clan.leader !== player.name) {
                player.sendMessage('§cSolo el líder puede invitar.');
                return;
            }
            const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
            if (!targetPlayer) {
                player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
                return;
            }
            const targetData = getPlayerData(targetPlayer);
            if (targetData.clan) {
                player.sendMessage(`§c${targetName} ya está en un clan.`);
                return;
            }
            clan.members.add(targetPlayer.name);
            targetData.clan = data.clan;
            savePlayerData(targetPlayer, targetData);
            addPlayerXp(targetPlayer, 20, 'unirse a un clan');
            player.sendMessage(`§a${targetName} ha sido invitado al clan '${data.clan}'.`);
            targetPlayer.sendMessage(`§aHas sido invitado al clan '${data.clan}' por ${player.name}.`);
        } else if (subcommand === 'info') {
            const data = getPlayerData(player);
            if (!data.clan) {
                player.sendMessage('§cNo estás en un clan.');
                return;
            }
            const clan = clanData.get(data.clan);
            player.sendMessage(`§6Clan: ${data.clan}\n§bLíder: ${clan.leader}\n§bMiembros: ${[...clan.members].join(', ')}`);
        }
    },
    claim: (player) => {
        const data = getPlayerData(player);
        if (data.claims >= 2) {
            player.sendMessage('§cHas alcanzado el límite de 2 terrenos reclamados.');
            return;
        }
        const pos = player.location;
        const dim = player.dimension.id;
        const chunkX = Math.floor(pos.x / 30);
        const chunkZ = Math.floor(pos.z / 30);
        const key = `${dim}:${chunkX}:${chunkZ}`;
        if (claims.has(key)) {
            player.sendMessage('§cEsta área ya está reclamada.');
            return;
        }
        claims.set(key, { owner: player.name, trusted: new Set(), dimension: dim, x: chunkX * 30, z: chunkZ * 30 });
        data.claims += 1;
        savePlayerData(player, data);
        player.sendMessage(`§aTerreno reclamado en ${dim} (X:${chunkX * 30}, Z:${chunkZ * 30}, 30x30 bloques).`);
    },
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
        const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
        if (!targetData.name) {
            targetData.name = targetName;
            targetData.balance = targetData.balance || 200;
        }
        modificarDinero(player, -amount);
        targetData.balance = (targetData.balance || 200) + amount;
        savePlayerData({ name: targetName }, targetData);
        player.sendMessage(`§aHas pagado ${amount} Ringcoins a ${targetName}.`);
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (targetPlayer) targetPlayer.sendMessage(`§aHas recibido ${amount} Ringcoins de ${player.name}.`);
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
        if (!targetData.name) {
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
        if (!targetData.name) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        targetData.xp = amount;
        targetData.level = getLevelFromXP(amount);
        savePlayerData({ name: targetName }, targetData);
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
        if (!targetData.name) {
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

// Manejo de eventos
world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;
    const message = event.message;
    if (!message.startsWith('!')) {
        event.cancel = true;
        addPlayerXp(player, 1, 'hablar en el chat');
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

world.afterEvents.playerBreakBlock.subscribe(event => {
    const player = event.player;
    const block = event.brokenBlockPermutation.type.id;
    const pos = event.block.location;
    const chunkX = Math.floor(pos.x / 30);
    const chunkZ = Math.floor(pos.z / 30);
    const key = `${player.dimension.id}:${chunkX}:${chunkZ}`;
    if (claims.has(key) && claims.get(key).owner !== player.name && !claims.get(key).trusted.has(player.name) && !player.hasTag('admin')) {
        event.cancel = true;
        player.sendMessage('§cNo puedes romper bloques en un terreno reclamado.');
        return;
    }
    updateMissionProgress(player, 'mine', 1);
    if (block.includes('ore')) updateMissionProgress(player, 'mineOre', 1);
    if (block === 'minecraft:diamond_ore' || block === 'minecraft:deepslate_diamond_ore') {
        updateMissionProgress(player, 'mineDiamond', 1);
    }
    addPlayerXp(player, 2, 'minar un bloque');
});

world.afterEvents.playerPlaceBlock.subscribe(event => {
    const player = event.player;
    const pos = event.block.location;
    const chunkX = Math.floor(pos.x / 30);
    const chunkZ = Math.floor(pos.z / 30);
    const key = `${player.dimension.id}:${chunkX}:${chunkZ}`;
    if (claims.has(key) && claims.get(key).owner !== player.name && !claims.get(key).trusted.has(player.name) && !player.hasTag('admin')) {
        event.cancel = true;
        player.sendMessage('§cNo puedes colocar bloques en un terreno reclamado.');
        return;
    }
    const data = getPlayerData(player);
    data.placed = (data.placed || 0) + 1;
    savePlayerData(player, data);
    addPlayerXp(player, 2, 'colocar un bloque');
    updateMissionProgress(player, 'place', 1);
});

world.afterEvents.entityHurt.subscribe(event => {
    if (event.damageSource.damagingEntity?.typeId === 'minecraft:player' && event.hurtEntity.isDead) {
        const player = event.damageSource.damagingEntity;
        if (event.hurtEntity.typeId === 'minecraft:player') {
            const data = getPlayerData(player);
            data.kills = (data.kills || 0) + 1;
            savePlayerData(player, data);
            updateMissionProgress(player, 'killPlayer', 1);
        } else {
            updateMissionProgress(player, 'killMob', 1);
            if (event.hurtEntity.typeId === 'minecraft:wither' || event.hurtEntity.typeId === 'minecraft:ender_dragon') {
                updateMissionProgress(player, 'killBoss', 1);
                const data = getPlayerData(player);
                data.events = (data.events || 0) + 1;
                savePlayerData(player, data);
            }
        }
        addPlayerXp(player, 5, 'derrotar un enemigo');
    }
});

world.afterEvents.itemUse.subscribe(event => {
    if (event.itemStack.typeId.includes('cooked_')) {
        const player = event.source;
        const data = getPlayerData(player);
        data.cooked += 1;
        savePlayerData(player, data);
        addPlayerXp(player, 3, 'cocinar un alimento');
        updateMissionProgress(player, 'cook', 1);
    }
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const data = getPlayerData(player);
        const newPos = player.location;
        const oldPos = data.lastPos || newPos;
        const distance = Math.sqrt((newPos.x - oldPos.x) ** 2 + (newPos.z - oldPos.z) ** 2);
        data.distance = (data.distance || 0) + Math.floor(distance);
        data.lastPos = newPos;
        savePlayerData(player, data);
        if (distance > 0) {
            addPlayerXp(player, Math.floor(distance / 100), 'recorrer distancia');
            updateMissionProgress(player, 'move', Math.floor(distance));
        }
    }
}, 20 * 60); // Cada minuto

system.runInterval(() => {
    for (const [name, missionData] of playerMissions) {
        if (Date.now() - missionData.assigned > 24 * 60 * 60 * 1000) {
            playerMissions.delete(name);
            const player = world.getAllPlayers().find(p => p.name === name);
            if (player) player.sendMessage('§cTu misión diaria ha expirado.');
        }
    }
    autoAssignMissions();
}, 20 * 3 * 60 * 60); // Cada 3 horas

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
        mathQuizActive.answer = answer;
        mathQuizActive.reward = 5;
        world.sendMessage(`§b¡Quiz matemático del reino! Resuelve: ${a} ${op} ${b} = ?. Responde con !r <respuesta>`);
        system.runTimeout(() => {
            if (mathQuizActive.active) {
                mathQuizActive.active = false;
                world.sendMessage(`§c¡Vaya incultos! La respuesta era: ${answer}`);
            }
        }, 15 * 20); // 15 segundos
    }
}, 20 * 10 * 60); // Cada 10 minutos