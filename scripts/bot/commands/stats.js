import { world } from "@minecraft/server";
import { getPlayerData, getRank, getReputation, addPlayerXp, savePlayerData } from "../data/playerDataUtils";

export function stats (player){
    // const properties = world.getDynamicPropertyIds()
    //             .filter(id => id.startsWith('property:') && JSON.parse(world.getDynamicProperty(id)).owner === player.name)
    //             .map(id => id.substring(9));
    const data = getPlayerData(player);
    const rank = getRank(player);
    const rep = getReputation(player);
    const warpCount = player.getDynamicProperty('warp:count') || 0;
    const home = player.getDynamicProperty('home') ? JSON.parse(player.getDynamicProperty('home')).location : 'No establecido';
    player.sendMessage(`
    §6Nivel: §a${data.level}§6
    XP: §a${data.xp}§b
    Rango: ${rank.color}${rank.name}§r
    §3Monedas: §e${data.balance} Ringcoins
    §bMisiones completadas: §7${data.misiones}
    §3Distancia recorrida: §7${data.distance} bloques
    §bAlimentos cocinados: §7${data.cooked}
    §3Bloques colocados: §7${data.placed}
    §9Jugadores eliminados: §7${data.kills}
    §9Reputación: ${rep.color}${rep.name}
    §6Clan: §r${data.clan || 'Ninguno'}
    §6Hogar: §7${typeof home === 'object' ? `X:${Math.floor(home.x)}, Y:${Math.floor(home.y)}, Z:${Math.floor(home.z)}` : home}
    §6Warps: §7${warpCount}
    `);
    return;
}

world.afterEvents.playerBreakBlock.subscribe(event => {
    const player = event.player;
    // const block = event.brokenBlockPermutation.type.id;
    // const pos = event.block.location;
    // const chunkX = Math.floor(pos.x / 30);
    // const chunkZ = Math.floor(pos.z / 30);
    // const key = `${player.dimension.id}:${chunkX}:${chunkZ}`;
    // if (claims.has(key) && claims.get(key).owner !== player.name && !claims.get(key).trusted.has(player.name) && !player.hasTag('admin')) {
    //     event.cancel = true;
    //     player.sendMessage('§cNo puedes romper bloques en un terreno reclamado.');
    //     return;
    // }
    // updateMissionProgress(player, 'mine', 1);
    // if (block.includes('ore')) updateMissionProgress(player, 'mineOre', 1);
    // if (block === 'minecraft:diamond_ore' || block === 'minecraft:deepslate_diamond_ore') {
    //     updateMissionProgress(player, 'mineDiamond', 1);
    // }
    addPlayerXp(player, 1);
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
    const data = getPlayerData(player);
    data.placed = (data.placed || 0) + 1;
    savePlayerData(player, data);
    addPlayerXp(player, 2);
    // updateMissionProgress(player, 'place', 1);
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

// world.afterEvents.itemUse.subscribe(event => {
    // if (event.itemStack.typeId.includes('cooked_')) {
    //     const player = event.source;
    //     const data = getPlayerData(player);
    //     data.cooked += 1;
    //     savePlayerData(player, data);
    //     addPlayerXp(player, 3, 'cocinar un alimento');
        // updateMissionProgress(player, 'cook', 1);
    // }
// });