import { system, world, ItemStack} from '@minecraft/server';
import { getTime } from './botUtils.js';
import { setHome, home } from './commands/home.js';
import { reqs, tpa, tpaccept } from './commands/tp.js';
import { setWarp, delWarp, getWarps } from './commands/warp.js';

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
    { id: 1, description: "Minar 50 bloques", type: "mine", target: 50, rewardXP: 20, rewardGold: 10, minRank: "Campesino" },
    { id: 2, description: "Derrotar 10 mobs", type: "killMob", target: 10, rewardXP: 30, rewardGold: 15, minRank: "Campesino" },
    { id: 3, description: "Caminar 1000 bloques", type: "move", target: 1000, rewardXP: 25, rewardGold: 12, minRank: "Aldeano" },
    { id: 4, description: "Cocinar 20 alimentos", type: "cook", target: 20, rewardXP: 15, rewardGold: 8, minRank: "Aldeano" },
    { id: 5, description: "Minar 100 bloques de mineral", type: "mineOre", target: 100, rewardXP: 50, rewardGold: 25, minRank: "Escudero" },
    { id: 6, description: "Derrotar un jefe (Wither o Ender Dragon)", type: "killBoss", target: 1, rewardXP: 200, rewardGold: 100, minRank: "Caballero" }
];

const propertyCache = new Map();

function getPlayerData(player) {
    const key = `playerData:${player.name}`;
    if (!propertyCache.has(key)) {
        const dataStr = world.getDynamicProperty(key);
        propertyCache.set(key, dataStr ? JSON.parse(dataStr) : {
            xp: 0, level: 0, balance: 200, misiones: 0, reputation: 0, claims: 0, events: 0, clan: null, distance: 0, cooked: 0, admin: player.hasTag('admin')
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
        xpNeeded = Math.floor(xpNeeded * 1.2); // Sistema exponencial
        level++;
    }
    return level;
}

export function getRank(player) {
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
                player.runCommand("summon fireworks_rocket");
                player.runCommand("playsound random.levelup @s");
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
    return getPlayerData(player).balance || 0;
}

export function setDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = Math.max(0, cantidad);
    savePlayerData(player, data);
    player.sendMessage(`§6Tu saldo ahora es: §e${data.balance} Ringcoins`);
}

export function modificarDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = Math.max(0, (data.balance || 0) + cantidad);
    savePlayerData(player, data);
    player.sendMessage(`§6Tu saldo ha cambiado en ${cantidad}. Saldo actual: §e${data.balance} Ringcoins`);
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
}

function giveHelpBook(player) {
    const inventory = player.getComponent('minecraft:inventory').container;
    const book = new ItemStack("minecraft:writable_book");
    system.run(()=>{
        
        book.setLore([
            '§lComandos del Reino:',
            '!help - Muestra este libro',
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
            '!mission <id> - Iniciar una misión',
            '!mathquiz - Iniciar un quiz matemático',
            '!answer <número> - Responder al quiz',
            '!clan crear <nombre> - Crear un clan',
            '!clan invitar <jugador> - Invitar a un clan',
            '!clan info - Ver información del clan',
            '!claim - Reclamar un terreno (30x30)',
            '!pay <jugador> <cantidad> - Pagar Ringcoins',
            '!prestamo <jugador> <monto> <días> - Prestar Ringcoins',
            '!mortgage <propiedad> <monto> - Hipotecar una propiedad',
            '!trade <jugador> <monto> <item> - Proponer un intercambio',
            '!accepttrade <id> - Aceptar un intercambio',
            '!adminstats <jugador> - Ver estadísticas (admin)',
            '!setxp <jugador> <cantidad> - Establecer XP (admin)',
            '!setmoney <jugador> <cantidad> - Establecer Ringcoins (admin)',
            '!setrep <jugador> <nivel> - Establecer reputación (admin)'
        ]);
        book.nameTag = 'Libro de Comandos del Reino';
        inventory.addItem(book);
        player.sendMessage('§aRecibiste el Libro de Comandos en tu inventario.');
    })
}

const commands = {
    help: (player) => giveHelpBook(player),
    hora: (player) => player.sendMessage(`§dLa hora actual es ${getTime()}`),
    spawn: (player) => {
        system.run(() => {
            player.teleport({ x: 155, y: 95, z: -51 }, { dimension: world.getDimension('overworld') });
            player.sendMessage('§aTeletransportándote al spawn del reino...');
        });
    },
    set: setHome,
    home: home,
    tpa: tpa,
    si: tpaccept,
    reqs: reqs,
    warp: getWarps,
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
        const warpCount = data.claims;
        const home = player.getDynamicProperty('home') ? JSON.parse(player.getDynamicProperty('home')).location : 'No establecido';
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
§bClan: ${data.clan || 'Ninguno'}
§bHogar: ${typeof home === 'object' ? `X:${home.x}, Y:${home.y}, Z:${home.z}` : home}
§bWarps: ${warpCount}`);
    },
    mission: (player, args) => {
        if (args.length < 2) {
            player.sendMessage(`§cUso: !mission <id>\n§bMisiones disponibles:\n${missions.map(m => `ID ${m.id}: ${m.description} (${m.minRank})`).join('\n')}`);
            return;
        }
        startMission(player, parseInt(args[1]));
    },
    mathquiz: (player) => {
        if (mathQuizActive.active) {
            player.sendMessage('§cYa hay un quiz matemático activo.');
            return;
        }
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
        world.sendMessage(`§b¡Quiz matemático del reino! Resuelve: ${a} ${op} ${b} = ?. Responde con !answer <número>`);
        system.runTimeout(() => {
            if (mathQuizActive.active) {
                mathQuizActive.active = false;
                world.sendMessage(`§c¡Vaya incultos! La respuesta era: ${answer}`);
            }
        }, 8 * 20);
    },
    answer: (player, args) => {
        if (!mathQuizActive.active) {
            player.sendMessage('§cNo hay un quiz activo.');
            return;
        }
        if (args.length < 2) {
            player.sendMessage('§cUso: !answer <número>');
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
        targetData.balance = (targetData.balance || 0) + amount;
        savePlayerData({ name: targetName }, targetData);
        player.sendMessage(`§aHas pagado ${amount} Ringcoins a ${targetName}.`);
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (targetPlayer) targetPlayer.sendMessage(`§aHas recibido ${amount} Ringcoins de ${player.name}.`);
        addPlayerXp(player, 5, 'realizar un pago');
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
§bClan: ${targetData.clan || 'Ninguno'}`);
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
        if (targetPlayer) targetPlayer.sendMessage(`§aTu reputación ha sido establecida a ${level} por un administrador.`);
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
        player.sendMessage('§cComando no reconocido. Usa !help para obtener el Libro de Comandos.');
    }
});

world.afterEvents.playerBreakBlock.subscribe(event => {
    const player = event.player;
    const block = event.brokenBlockPermutation.type.id;
    updateMissionProgress(player, 'mine', 1);
    if (block.includes('ore')) updateMissionProgress(player, 'mineOre', 1);
    addPlayerXp(player, 2, 'minar un bloque');
});

world.afterEvents.entityHurt.subscribe(event => {
    if (event.damageSource.damagingEntity?.typeId === 'minecraft:player' && event.hurtEntity.isDead) {
        const player = event.damageSource.damagingEntity;
        updateMissionProgress(player, 'killMob', 1);
        if (event.hurtEntity.typeId === 'minecraft:wither' || event.hurtEntity.typeId === 'minecraft:ender_dragon') {
            updateMissionProgress(player, 'killBoss', 1);
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
        if (distance > 0) addPlayerXp(player, Math.floor(distance / 100), 'recorrer distancia');
        updateMissionProgress(player, 'move', Math.floor(distance));
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
}, 20 * 60 * 60); // Cada hora

system.runInterval(() => {
    if (!mathQuizActive.active) commands.mathquiz();
}, 20 * 10 * 60); // Cada 10 minutos