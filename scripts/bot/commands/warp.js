import { world, system } from "@minecraft/server";
import { getRank } from '../botCommands.js';

export function getPlayerWarpC(player) {
    const count = player.getDynamicProperty("warp:count");
    return count === undefined ? 0 : count;
}

export function addToPlayerWarpC(player) {
    const wpc = getPlayerWarpC(player) + 1;
    player.setDynamicProperty("warp:count", wpc);
}

export function restToPlayerWarpC(player) {
    const wpc = Math.max(0, getPlayerWarpC(player) - 1);
    player.setDynamicProperty("warp:count", wpc);
}

function getWarpLimit(player) {
    const rank = getRank(player);
    const limits = {
        "Campesino": 1,
        "Aldeano": 2,
        "Escudero": 3,
        "Caballero": 4,
        "Barón": 5,
        "Conde": 6,
        "Duque": 8,
        "Príncipe": 10,
        "Rey": 12,
        "Emperador": Infinity
    };
    return limits[rank.name] || 1;
}

export function setWarp(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !setwarp <nombre_del_warp>');
        return;
    }
    const warpName = args[1].toLowerCase();
    const alreadyExists = world.getDynamicProperty(`warp:${warpName}`);
    if (alreadyExists) {
        player.sendMessage('§cYa existe un warp con ese nombre.');
        return;
    }
    const dim = player.dimension.id;
    if (dim === 'minecraft:nether') {
        player.sendMessage('§cSolo el Nether King puede establecer warps en el Nether.');
        system.run(() => player.playSound("ambient.cave", player.location));
        return;
    }
    if (dim === 'minecraft:the_end') {
        player.sendMessage('§cSolo el Dragon Lord puede establecer warps en el End.');
        system.run(() => player.playSound("entity.enderdragon.death", player.location));
        return;
    }
    if (getPlayerWarpC(player) >= getWarpLimit(player)) {
        player.sendMessage('§cHas alcanzado el límite de warps para tu rango.');
        return;
    }
    const pos = player.location;
    const newWarpData = {
        dimension: dim,
        location: { x: truncateFloat(pos.x, 2), y: truncateFloat(pos.y, 2), z: truncateFloat(pos.z, 2) },
        owner: player.name
    };
    world.setDynamicProperty(`warp:${warpName}`, JSON.stringify(newWarpData));
    player.sendMessage(`§aWarp '${warpName}' establecido en X:${newWarpData.location.x}, Y:${newWarpData.location.y}, Z:${newWarpData.location.z} en ${dim}.`);
    addToPlayerWarpC(player);
}

export function getWarps(player) {
    const dynamicProperties = world.getDynamicPropertyIds();
    const availableWarps = dynamicProperties
        .filter(propId => propId.startsWith('warp:'))
        .map(propId => propId.substring(5));
    if (availableWarps.length > 0) {
        player.sendMessage(`§l§6Warps disponibles:§r§e\n${availableWarps.map(w => `!warp ${w}`).join('\n')}`);
    } else {
        player.sendMessage('§cNo hay warps disponibles.');
    }
}

export function warpTo(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !warp <nombre_del_warp>');
        return;
    }
    const warpName = args[1].toLowerCase();
    const customWarpData = world.getDynamicProperty(`warp:${warpName}`);
    if (!customWarpData) {
        player.sendMessage('§cEse warp no existe.');
        return;
    }
    const parsedWarp = JSON.parse(customWarpData);
    const { location, dimension } = parsedWarp;
    system.run(() => {
        const targetDimension = world.getDimension(dimension);
        player.teleport(location, { dimension: targetDimension });
        player.sendMessage(`§aTeletransportándote al warp '${warpName}'!`);
    });
}

export function delWarp(player, args) {
    if (args.length < 2) {
        player.sendMessage("§cUso: !delwarp <nombre_del_warp>");
        return;
    }
    const warpName = args[1].toLowerCase();
    const customWarpData = world.getDynamicProperty(`warp:${warpName}`);
    if (!customWarpData) {
        player.sendMessage("§cEse warp no existe.");
        return;
    }
    const parsedWarp = JSON.parse(customWarpData);
    if (parsedWarp.owner !== player.name) {
        player.sendMessage("§cEse warp no es tuyo.");
        return;
    }
    world.setDynamicProperty(`warp:${warpName}`, undefined);
    restToPlayerWarpC(player);
    player.sendMessage(`§dWarp '${warpName}' eliminado.`);
}