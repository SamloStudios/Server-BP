import { system, world } from '@minecraft/server';
import { getTime } from './botUtils.js';
import { setHome, home } from './commands/home.js';
import { reqs, tpa, tpaccept } from './commands/tp.js';
import { setWarp, delWarp, getWarps, warpTo } from './commands/warp.js';

// Definición de rangos con requisitos
const RANKS = [
    { level: 0, name: "Campesino", color: "§7", requirements: () => true },
    { level: 5, name: "Aldeano", color: "§f", requirements: (data) => data.misiones >= 3 && data.balance >= 100 },
    { level: 10, name: "Escudero", color: "§a", requirements: (data) => data.misiones >= 7 && data.balance >= 300 && data.level >= 5 },
    { level: 15, name: "Caballero", color: "§b", requirements: (data) => data.misiones >= 15 && data.reputacion >= 3 && data.balance >= 700 },
    { level: 25, name: "Barón", color: "§9", requirements: (data) => data.misiones >= 25 && data.terrenos >= 2 && data.ventas >= 3 && data.balance >= 1500 },
    { level: 40, name: "Conde", color: "§6", requirements: (data) => data.misiones >= 40 && data.level >= 10 && data.reputacion >= 5 && data.balance >= 2500 },
    { level: 60, name: "Duque", color: "§5", requirements: (data) => data.misiones >= 60 && data.clanFundado && data.ventas >= 8 && data.balance >= 5000 },
    { level: 90, name: "Príncipe", color: "§d", requirements: (data) => data.misiones >= 90 && data.eventos >= 1 && data.reputacion >= 8 && data.balance >= 8000 },
    { level: 120, name: "Rey", color: "§c", requirements: (data) => data.misiones >= 120 && data.level >= 20 && data.balance >= 15000 && data.eventos >= 3 },
    { level: 640, name: "Emperador", color: "§4", requirements: (data) => data.admin }
];

// Estructuras de datos globales
const playerMissions = new Map();
const clanData = new Map();
const claims = new Map();
const mathQuizActive = { active: false, answer: null, reward: 0 };
const missions = [
    { id: 1, description: "Minar 50 bloques", type: "mine", target: 50, rewardXP: 20, rewardGold: 10 },
    { id: 2, description: "Derrotar 10 mobs", type: "killMob", target: 10, rewardXP: 30, rewardGold: 20 },
];

// Caché para propiedades dinámicas
const propertyCache = new Map();

function getPlayerData(player) {
    const key = `playerData:${player.name}`;
    if (!propertyCache.has(key)) {
        const dataStr = world.getDynamicProperty(key);
        propertyCache.set(key, dataStr ? JSON.parse(dataStr) : { xp: 0, level: 0, balance: 0, misiones: 0, reputacion: 0, terrenos: 0, ventas: 0, eventos: 0, clanFundado: false, admin: player.hasTag('admin') });
    }
    return propertyCache.get(key);
}

function savePlayerData(player, data) {
    const key = `playerData:${player.name}`;
    propertyCache.set(key, data);
    world.setDynamicProperty(key, JSON.stringify(data));
}

function getLevelFromXP(xp) {
    let level = 0, xpNeeded = 10, xpAcc = 0;
    while (xp >= xpAcc + xpNeeded) {
        xpAcc += xpNeeded;
        xpNeeded += 10 * level;
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

export function formatPlayerName(player) {
    const rank = getRank(player);
    const prefix = player.hasTag('admin') ? "§l§c[Emperador] " : `${rank.color}[${rank.name}] `;
    return prefix + player.name;
}

export function sendRankedChat(player, message) {
    world.sendMessage(`${formatPlayerName(player)}: §f${message}`);
}

function hasPermission(player, permission) {
    return player.hasTag('admin') || player.hasTag(permission);
}

function addPlayerXp(player, amount) {
    const data = getPlayerData(player);
    const oldRank = getRank(player);
    data.xp += amount;
    const newLevel = getLevelFromXP(data.xp);
    if (newLevel > data.level) {
        data.level = newLevel;
        data.balance += newLevel * 10;
        player.sendMessage(`§a¡Has subido al nivel ${newLevel}! Ganaste ${newLevel * 10} monedas.`);
        const newRank = getRank(player);
        if (newRank !== oldRank) {
            system.run(() => {
                player.runCommand("summon fireworks_rocket");
                player.runCommand("playsound random.levelup @s");
            });
            world.sendMessage(`§b¡${player.name} ha alcanzado el rango ${newRank.color}${newRank.name}§r!`);
        }
    }
    savePlayerData(player, data);
}

function getDinero(player) {
    const data = getPlayerData(player);
    return data.balance || 0;
}

function setDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = Math.max(0, cantidad);
    savePlayerData(player, data);
    player.sendMessage(`§6Tu saldo ahora es: §e${data.balance}`);
}

function modificarDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = Math.max(0, (data.balance || 0) + cantidad);
    savePlayerData(player, data);
    player.sendMessage(`§6Tu saldo ha cambiado en ${cantidad}. Saldo actual: §e${data.balance}`);
}

function startMission(player, missionId) {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
        player.sendMessage('§cMisión no encontrada.');
        return;
    }
    playerMissions.set(player.name, { missionId, progress: 0 });
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
    player.sendMessage(`§a¡Misión completada! Recompensas: ${mission.rewardXP} XP, ${mission.rewardGold} monedas.`);
}

const commands = {
    help: (player) => {
        player.sendMessage(`§g§lComandos disponibles:§r§d
            !hora - Ver la hora actual
            !spawn - Teletransportarse al spawn
            !set - Establecer posición de casa
            !home - Teletransportarse a la casa
            !tpa <jugador> - Solicitar teletransporte
            !si - Aceptar solicitud de teletransporte
            !reqs - Ver solicitudes de teletransporte
            !warp - Ver warps disponibles
            !setwarp <nombre> - Crear un warp
            !delwarp <nombre> - Eliminar un warp
            !rango - Ver tu rango actual
            !mathquiz - Iniciar un quiz matemático
            !clan crear <nombre> - Crear un clan
            !clan invitar <jugador> - Invitar a un clan
            !clan info - Ver información del clan
            !claim - Reclamar un área
            !pay <jugador> <cantidad> - Pagar a otro jugador`);
    },
    hora: (player) => player.sendMessage(`§dLa hora actual es ${getTime()}`),
    spawn: (player) => {
        system.run(() => {
            player.teleport({ x: 155, y: 95, z: -51 }, { dimension: world.getDimension('overworld') });
            player.sendMessage('Teletransportándote al spawn...');
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
        const index = RANKS.findIndex(r => r.name === rank.name);
        player.sendMessage(`§6Tu rango actual: ${rank.color}${rank.name}`);
        if (RANKS[index + 1]) {
            player.sendMessage(`§7Siguiente rango: ${RANKS[index + 1].name}`);
        } else {
            player.sendMessage(`§b¡Has alcanzado el máximo rango posible!`);
        }
    },
    mathquiz: (player) => {
        if (mathQuizActive.active) {
            player.sendMessage('§cYa hay un quiz matemático activo.');
            return;
        }
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const op = ['+', '-', '*'][Math.floor(Math.random() * 3)];
        let answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
        mathQuizActive.active = true;
        mathQuizActive.answer = answer;
        mathQuizActive.reward = 50;
        world.sendMessage(`§b¡Quiz matemático! Resuelve: ${a} ${op} ${b} = ?. Responde con !answer <número>`);
        system.runTimeout(() => {
            if (mathQuizActive.active) {
                mathQuizActive.active = false;
                world.sendMessage('§cEl quiz matemático ha terminado sin ganador.');
            }
        }, 20 * 30);
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
            world.sendMessage(`§a¡${player.name} ha ganado el quiz matemático y recibe ${mathQuizActive.reward} monedas!`);
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
            data.clanFundado = true;
            savePlayerData(player, data);
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
        const pos = player.location;
        const dim = player.dimension.id;
        const key = `${dim}:${Math.floor(pos.x)}:${Math.floor(pos.z)}`;
        if (claims.has(key)) {
            player.sendMessage('§cEsta área ya está reclamada.');
            return;
        }
        const data = getPlayerData(player);
        data.terrenos += 1;
        claims.set(key, { owner: player.name, trusted: new Set(), dimension: dim, x: Math.floor(pos.x), z: Math.floor(pos.z) });
        savePlayerData(player, data);
        player.sendMessage(`§aÁrea reclamada en ${dim} (X:${Math.floor(pos.x)}, Z:${Math.floor(pos.z)}).`);
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
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (!targetPlayer) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        modificarDinero(player, -amount);
        modificarDinero(targetPlayer, amount);
        player.sendMessage(`§aHas pagado ${amount} monedas a ${targetName}.`);
        targetPlayer.sendMessage(`§aHas recibido ${amount} monedas de ${player.name}.`);
    }
};

world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;
    const message = event.message;
    if (!message.startsWith('!')) {
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
        player.sendMessage('§cComando no reconocido. Usa !help.');
    }
});

// Eventos para misiones
world.afterEvents.blockBreak.subscribe(event => {
    const player = event.player;
    updateMissionProgress(player, 'mine', 1);
});

world.afterEvents.entityHurt.subscribe(event => {
    if (event.damageSource.damagingEntity?.typeId === 'minecraft:player' && event.hurtEntity.isDead) {
        const player = event.damageSource.damagingEntity;
        updateMissionProgress(player, 'killMob', 1);
    }
});

// Limpieza de solicitudes de teletransporte al desconectar
world.afterEvents.playerLeave.subscribe(({ playerName }) => {
    playerMissions.delete(playerName);
    const clan = clanData.get(getPlayerData({ name: playerName }).clan);
    if (clan) clan.members.delete(playerName);
});