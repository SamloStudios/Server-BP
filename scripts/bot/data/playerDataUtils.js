import { system, world } from "@minecraft/server";
import { updateMissionProgress } from "../missions/missions";

export const propertyCache = new Map();

// Definición de rangos y reputación
export const RANKS = [
    { level: 0, name: "Plebeyo", color: "§7", requirements: () => true },
    { level: 10, name: "Burgués", color: "§a", requirements: (data) => data.balance >= 100 && data.reputation >= 0 },
    { level: 25, name: "Noble", color: "§b", requirements: (data) => data.misiones >= 0 && data.balance >= 300 && data.reputation >= 0 },
    { level: 50, name: "Caballero", color: "§3", requirements: (data) => data.misiones >= 15 && data.reputation >= 2 && data.balance >= 700 },
    { level: 90, name: "Barón", color: "§9", requirements: (data) => data.misiones >= 25 && data.claims >= 1 && data.balance >= 1500 && data.reputation >= 3 },
    { level: 150, name: "Conde", color: "§5", requirements: (data) => data.misiones >= 40 && data.reputation >= 4 && data.balance >= 2500 },
    { level: 220, name: "Duque", color: "§6", requirements: (data) => data.misiones >= 60 && data.clan && data.balance >= 5000 && data.reputation >= 5 },
    { level: 300, name: "Príncipe", color: "§c", requirements: (data) => data.misiones >= 90 && data.events >= 1 && data.balance >= 8000 && data.reputation >= 6 },
    { level: 500, name: "Rey", color: "§4", requirements: (data) => data.misiones >= 120 && data.balance >= 15000 && data.events >= 3 && data.reputation >= 6 },
    { level: 640, name: "Emperador", color: "§4", requirements: (data) => data.admin }
];

export const REPUTATION_LEVELS = [
    { level: -3, name: "Forajido", color: "§4" },
    { level: -2, name: "Rufián", color: "§c" },
    { level: -1, name: "Pícaro", color: "§e" },
    { level: 0, name: "Neutral", color: "§7" },
    { level: 1, name: "Honrado", color: "§a" },
    { level: 2, name: "Noble", color: "§b" },
    { level: 3, name: "Heroico", color: "§d" }
];

export function getPlayerData(player) {
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
    let level = 0;
    let xpNeeded = 10;
    let xpAcc = 0;
    while (xp >= xpAcc + xpNeeded) {
        xpAcc += xpNeeded;
        xpNeeded += 10 + (15 * level); // <-- Linear increase
        level++;
    }
    return level;
}

export function getNextLevelXP(level) {
    // Retorna la cantidad de XP necesaria para el siguiente nivel
    let initlevel = 0;
    let xpNeeded = 10;
    let xpAcc = 0;
    while (initlevel < level+1) {
        xpAcc += xpNeeded;
        xpNeeded += 10 + (15 * initlevel);
        initlevel++;
    }
    return xpAcc;
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

export function getNextRank(rankName) {
    const index = RANKS.findIndex(r => r.name === rankName);
    return RANKS[index + 1];
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
    // Mensaje de recompensa
    if (reason) player.sendMessage(`§aGanaste §d${amount}xp §apor ${reason}`)

    // Si subio de nivel
    const newLevel = getLevelFromXP(data.xp);
    if (newLevel > data.level) {
        data.level = newLevel;
        
        for (let i = oldLevel; i < newLevel; i++) { // Aumentar monedas 
            data.balance += (i+1) * 10; // Gana monedas al subir de nivel
            player.sendMessage(`§a¡Has ganado ${(i+1) * 10} monedas por subir de nivel!`);
            // player.sendMessage(`§a¡Has subido al nivel ${i+1}!`);
            world.sendMessage(`§b¡${oldRank.color}${player.name}§b ha subido al nivel ${i+1}!`);
        }

        const newRank = getRank(newLevel);
        if (newRank !== oldRank) {
            system.run(()=> {
                player.runCommand("summon fireworks_rocket");
                player.runCommand(`playsound random.levelup @s`);
            })
            world.sendMessage(`§b¡${oldRank.color}${player.name} ha alcanzado el rango ${newRank.color}${newRank.name}§r!`);
            player.sendMessage(`§b¡Felicidades! Has alcanzado el rango ${newRank.color}${newRank.name}§r`);
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

export function addDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = data.balance ? data.balance + cantidad : cantidad;
    savePlayerData(player, data);
}

export function modificarDinero(player, cantidad) {
    const data = getPlayerData(player);
    data.balance = Math.max(0, (data.balance || 200) + cantidad);
    savePlayerData(player, data);
    player.sendMessage(`§6Tu saldo ha cambiado en ${cantidad}. Saldo actual: §e${data.balance} Ringcoins`);
    if (cantidad > 0) updateMissionProgress(player, 'trade', cantidad);
}