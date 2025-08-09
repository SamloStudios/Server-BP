import { system, world } from '@minecraft/server';
import { getRank } from '../data/playerDataUtils';

const WARP_LIMITS = {
    Campesino: 0,
    Aldeano: 1,
    Escudero: 2,
    Caballero: 3,
    Barón: 4,
    Conde: 5,
    Duque: 6,
    Príncipe: 8,
    Rey: 10,
    Emperador: 999
};

export function addToPlayerWarpC(player) {
    const currentCount = player.getDynamicProperty('warp:count') || 0;
    player.setDynamicProperty('warp:count', currentCount + 1);
}

export function setWarp(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !setwarp <nombre>');
        return;
    }
    const warpName = args[1].toLowerCase();
    const rank = getRank(player).name;
    const warpCount = player.getDynamicProperty('warp:count') || 0;
    if (warpCount >= WARP_LIMITS[rank]) {
        player.sendMessage(`§cHas alcanzado el límite de warps para tu rango (${WARP_LIMITS[rank]}).`);
        return;
    }
    if (player.dimension.id !== 'minecraft:overworld') {
        player.sendMessage('§cSolo puedes crear warps en el Overworld.');
        return;
    }
    const pos = player.location;
    const warpData = {
        location: { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) },
        dimension: player.dimension.id,
        owner: player.name
    };
    world.setDynamicProperty(`warp:${warpName}`, JSON.stringify(warpData));
    addToPlayerWarpC(player);
    player.sendMessage(`§aWarp '${warpName}' creado en: X:${Math.floor(pos.x)}, Y:${Math.floor(pos.y)}, Z:${Math.floor(pos.z)}`);
}

export function delWarp(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !delwarp <nombre>');
        return;
    }
    const warpName = args[1].toLowerCase();
    const warpDataRaw = world.getDynamicProperty(`warp:${warpName}`);
    if (!warpDataRaw) {
        player.sendMessage(`§cNo existe un warp con el nombre '${warpName}'.`);
        return;
    }
    const warpData = JSON.parse(warpDataRaw);
    if (warpData.owner !== player.name && !player.hasTag('admin')) {
        player.sendMessage('§cNo eres el propietario de este warp.');
        return;
    }
    world.setDynamicProperty(`warp:${warpName}`, undefined);
    if (warpData.owner === player.name) {
        const currentCount = player.getDynamicProperty('warp:count') || 1;
        player.setDynamicProperty('warp:count', Math.max(0, currentCount - 1));
    }
    player.sendMessage(`§aWarp '${warpName}' eliminado.`);
}

export function getWarps(player, args) {
    const warpIds = world.getDynamicPropertyIds().filter(id => id.startsWith('warp:'));
    const warps = warpIds.map(id => {
        const data = JSON.parse(world.getDynamicProperty(id));
        return { name: id.substring(5), ...data };
    });
    return warps;
}

export function warpTo(player, args) {
    if (args.length < 2) {
        const warps = getWarps(player, args);
        if (warps.length === 0) {
            player.sendMessage('§cNo hay warps disponibles.');
            return;
        }
        const warpList = warps.map(w => `${w.name} (X:${w.location.x}, Y:${w.location.y}, Z:${w.location.z}, Propietario: ${w.owner})`);
        player.sendMessage(`§6Warps disponibles:\n${warpList.join('\n')}`);
        return;
    }
    const warpName = args[1].toLowerCase();
    const warpDataRaw = world.getDynamicProperty(`warp:${warpName}`);
    if (!warpDataRaw) {
        player.sendMessage(`§cNo existe un warp con el nombre '${warpName}'.`);
        return;
    }
    const warpData = JSON.parse(warpDataRaw);
    system.run(() => {
        player.teleport(warpData.location, { dimension: world.getDimension(warpData.dimension) });
        player.sendMessage(`§aTeletransportado al warp '${warpName}': X:${warpData.location.x}, Y:${warpData.location.y}, Z:${warpData.location.z}`);
    });
}