import { world, system } from "@minecraft/server";
import { truncateFloat } from "../botUtils.js";
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
        "Aldeano": 1,
        "Escudero": 1,
        "Caballero": 1,
        "Barón": 1,
        "Conde": 1,
        "Duque": 1,
        "Príncipe": 1,
        "Rey": 1,
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
    if (dim !== 'minecraft:overworld') {
        player.sendMessage('§c¡Solo los grandes señores pueden establecer warps fuera del Overworld!');
        system.run(() => player.playSound("ambient.cave", player.location));
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
    player.sendMessage(`§aWarp '${warpName}' establecido en X:${newWarpData.location.x}, Y:${newWarpData.location.y}, Z:${newWarpData.location.z} en el Overworld.`);
    addToPlayerWarpC(player);
}

export function getWarps(player) {
    const dynamicProperties = world.getDynamicPropertyIds();
    const availableWarps = dynamicProperties
        .filter(propId => propId.startsWith('warp:'))
        .map(propId => {
            const data = JSON.parse(world.getDynamicProperty(propId));
            return { name: propId.substring(5), owner: data.owner };
        });
    if (availableWarps.length > 0) {
        player.sendMessage(`§l§6Warps disponibles:§r§e\n${availableWarps.map(w => `!warp ${w.name} (Creado por ${w.owner})`).join('\n')}`);
    } else {
        player.sendMessage('§cNo hay warps disponibles en el reino.');
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
        player.sendMessage(`§aTeletransportándote al warp '${warpName}' en el reino!`);
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
    if (parsedWarp.owner !== player.name && !player.hasTag('admin')) {
        player.sendMessage("§cEse warp no es tuyo.");
        return;
    }
    world.setDynamicProperty(`warp:${warpName}`, undefined);
    restToPlayerWarpC(player);
    player.sendMessage(`§dWarp '${warpName}' eliminado del reino.`);
}