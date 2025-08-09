import { system, world } from "@minecraft/server";

export const propertyCache = new Map();

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

function getPlayerData(player) {
    const key = `playerData:${player.name}`;
    if (!propertyCache.has(key)) {
        const dataStr = world.getDynamicProperty(key);

        const defaultData = {
            xp: 0,
            level: 0,
            balance: 200,
            misiones: 0,
            reputation: 0,
            claims: 0,
            events: 0,
            clan: null,
            distance: 0,
            cooked: 0,
            admin: player.hasTag('admin'),
            placed: 0,
            kills: 0,
        };

        let playerData;

        if (dataStr) {
            const oldData = JSON.parse(dataStr);
            // Create a new object by merging default and old data.
            // Then, iterate over the keys of defaultData to build a clean object.
            const mergedData = { ...defaultData, ...oldData };
            
            playerData = {};
            for (const prop in defaultData) {
                playerData[prop] = mergedData[prop];
            }
        } else {
            playerData = defaultData;
        }

        propertyCache.set(key, playerData);
    }
    return propertyCache.get(key);
}

///

export function savePlayerData(player, data) {
    const key = `playerData:${player.name}`;
    propertyCache.set(key, data);
    world.setDynamicProperty(key, JSON.stringify(data));
}

export function getLevelFromXP(xp) {
    let level = 0, xpNeeded = 100, xpAcc = 0;
    while (xp >= xpAcc + xpNeeded) {
        xpAcc += xpNeeded;
        xpNeeded = Math.floor(xpNeeded * 1.2);
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

export function getReputation(player) {
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

export function addPlayerXp(player, amount, reason) {
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


export function modifyReputation(player, amount) {
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