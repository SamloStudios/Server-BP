import { RANKS } from "../data/playerDataUtils";
import { system, world } from "@minecraft/server";
import { getRank, getPlayerData, savePlayerData } from "../data/playerDataUtils";

const playerMissions = new Map();
const missions = [
    { id: 1, description: "Minar 200 bloques", type: "mine", target: 200, rewardXP: 50, rewardGold: 25, minRank: "Campesino" },
    { id: 2, description: "Derrotar 25 mobs", type: "killMob", target: 25, rewardXP: 75, rewardGold: 30, minRank: "Campesino" },
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


export function mission(player, args) {
    if (playerMissions.has(player.name)) {
        const activeMission = playerMissions.get(player.name);
        const mDescription = missions.find(m => m.id === activeMission.missionId).description;
        player.sendMessage(`§bYa tenes una mision activa!
    §aMision: §7${mDescription}
    §aProgreso: §e${activeMission.progress}`)
        return;
    }
    if (args.length < 2) {
        player.sendMessage(`§cUso: !mission <id>\n§bMisiones disponibles:\n${missions.map(m => `ID ${m.id}: ${m.description} (${m.minRank})`).join('\n')}`);
        return;
    }
    startMission(player, parseInt(args[1]));
}

export function startMission(player, missionId) {
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

    //Añadir la nueva mision
    playerMissions.set(player.name, {
        missionId, 
        progress: 0,
        assigned: Date.now()
    });
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

export function updateMissionProgress(player, type, amount) {
    const missionData = playerMissions.get(player.name);
    if (!missionData) return;
    const mission = missions.find(m => m.id === missionData.missionId);
    if (mission.type === type) {
        missionData.progress += amount;
        if (missionData.progress >= mission.target) {
            completeMission(player, mission);
        } else {
            player.sendMessage(`§bProgreso de misión: §7${missionData.progress}/${mission.target}`);
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

world.afterEvents.entityHurt.subscribe(event => {
    if (event.damageSource.damagingEntity?.typeId === 'minecraft:player') {
        const player = event.damageSource.damagingEntity;
        if (event.hurtEntity.typeId === 'minecraft:player') {
            // const data = getPlayerData(player);
            // data.kills = (data.kills || 0) + 1;
            // savePlayerData(player, data);
            updateMissionProgress(player, 'killPlayer', 1);
        } else {
            updateMissionProgress(player, 'killMob', 1);
            if (event.hurtEntity.typeId === 'minecraft:wither' || event.hurtEntity.typeId === 'minecraft:ender_dragon') {
                updateMissionProgress(player, 'killBoss', 1);
                // const data = getPlayerData(player);
                // data.events = (data.events || 0) + 1;
                // savePlayerData(player, data);
            }
        }
        // addPlayerXp(player, 5, 'derrotar un enemigo');
    }
});

world.afterEvents.playerPlaceBlock.subscribe(event => {
    const player = event.player;
    // const pos = event.block.location;
    // const chunkX = Math.floor(pos.x / 30);
    // const chunkZ = Math.floor(pos.z / 30);
    // const key = `${player.dimension.id}:${chunkX}:${chunkZ}`;
    // if (claims.has(key) && claims.get(key).owner !== player.name && !claims.get(key).trusted.has(player.name) && !player.hasTag('admin')) {
    //     event.cancel = true;
    //     player.sendMessage('§cNo puedes colocar bloques en un terreno reclamado.');
    //     return;
    // }
    updateMissionProgress(player, 'place', 1);
});

world.afterEvents.playerBreakBlock.subscribe(event => {
    const player = event.player;
    const block = event.brokenBlockPermutation.type.id;
    // const pos = event.block.location;
    // const chunkX = Math.floor(pos.x / 30);
    // const chunkZ = Math.floor(pos.z / 30);
    // const key = `${player.dimension.id}:${chunkX}:${chunkZ}`;
    // if (claims.has(key) && claims.get(key).owner !== player.name && !claims.get(key).trusted.has(player.name) && !player.hasTag('admin')) {
    //     event.cancel = true;
    //     player.sendMessage('§cNo puedes romper bloques en un terreno reclamado.');
    //     return;
    // }
    updateMissionProgress(player, 'mine', 1);
    if (block.includes('ore')) updateMissionProgress(player, 'mineOre', 1);
    if (block === 'minecraft:diamond_ore' || block === 'minecraft:deepslate_diamond_ore') {
        updateMissionProgress(player, 'mineDiamond', 1);
    }
});

world.afterEvents.chatSend.subscribe(event => {


})