import { world, system } from "@minecraft/server";
import { truncateFloat } from "../botUtils.js";

// Warp count limit -----------------
export function getPlayerWarpC(player){
    let wCount = player.getDynamicProperty("warp:count");
    if (wCount == undefined) {
        return 0;
    } else return wCount;
}

export function addToPlayerWarpC(player){
    let wpc = getPlayerWarpC(player);
    wpc++;
    player.setDynamicProperty("warp:count", wpc);
    return;
}

export function restToPlayerWarpC(player){
    let wpc = getPlayerWarpC(player);
    wpc--;
    player.setDynamicProperty("warp:count", wpc);
    return;
}

// Warp functions -------------------

export function setWarp(player, args){
    if (args.length < 2) {
        player.sendMessage('§cUso: !setwarp <nombre_del_warp>');
        return;
    }
    const warpName = args[1].toLowerCase();
    const alreadyExists = world.getDynamicProperty(`warp:${warpName}`);
    
    if (alreadyExists !== undefined) {
        player.sendMessage('§cYa existe un warp con ese nombre');
        return;
    }

    const dim = player.dimension.id;
    if (dim === 'minecraft:nether') {
        player.sendMessage('§c§oSolo el §k§jNether King§r §o§cpuede establecer un warp en el nether');
        system.run(()=>{
            player.playSound("ambient.cave", player.location); 
        });
        return;
    }

    if (dim === 'minecraft:the_end') {
        player.sendMessage('§c§oSolo el §k§4Dragon Lord§r §o§cpuede establecer un warp en el end');
        system.run(()=>{
            player.playSound("entity.enderdragon.death", player.location);
        });
        return;
    }
    
    if (getPlayerWarpC(player) >= 1) {
        player.sendMessage('§cNo puedes añadir mas warps ahora, elimina algunos con !delwarp');
        return;
    }

    const pos = player.location;

    // Opcional: Truncar coordenadas
    for (let key in pos) {
        pos[key] = truncateFloat(pos[key], 2);
    }

    const newWarpData = {
        dimension: dim, 
        location: { x: pos.x, y: pos.y, z: pos.z },
        owner: player.name
    };

    // Guardar el warp como una propiedad dinámica
    world.setDynamicProperty(`warp:${warpName}`, JSON.stringify(newWarpData));
    player.sendMessage(`§aWarp '${warpName}' establecido en X:${pos.x}, Y:${pos.y}, Z:${pos.z} en la dimensión: ${dim}.`);
    addToPlayerWarpC(player);
    return;
}

export function getWarps(player) {
    let availableWarps = [];

    // Obtener warps personalizados
    const dynamicProperties = world.getDynamicPropertyIds();
    dynamicProperties.forEach(propId => {
        if (propId.startsWith('warp:')) {
            const customWarpName = propId.substring(5); // Eliminar 'warp:' del inicio
            availableWarps.push(customWarpName);
        }
    });

    if (availableWarps.length > 0) {
        player.sendMessage(`§l§6Warps disponibles:§r§e\n${availableWarps.map(w => `!warp ${w}`).join('\n')}`);
    } else {
        player.sendMessage('§cNo hay warps disponibles.');
    }
    return;
}

export function warpTo(player, args) {
    const warpName = args[1].toLowerCase();
    let targetLocation;
    let targetDimension;
    let messageText;

    // Intentar cargar el warp personalizado primero
    const customWarpData = world.getDynamicProperty(`warp:${warpName}`);
    if (customWarpData) {
        const parsedWarp = JSON.parse(customWarpData);
        targetLocation = parsedWarp.location;
        targetDimension = world.getDimension(parsedWarp.dimension);
        messageText = `¡Teletransportándote al warp personalizado '${warpName}'!`;
    }
    system.run(() => {
        if (player && targetDimension) {
            player.teleport(targetLocation, { dimension: targetDimension });
            player.sendMessage(`§a${messageText}`);
        } else if (player) {
            player.sendMessage('§cError: Ese warp no existe o no está disponible.');
        }
    });
    return;
}

export function delWarp(player, args) {
    if (args.length < 2) {
        player.sendMessage("§cUso: !delwarp <nombre_del_warp>");
        return;
    };
    const warpName = args[1].toLowerCase();

    // Intentar cargar el warp personalizado primero
    const customWarpData = world.getDynamicProperty(`warp:${warpName}`);
    if (customWarpData) {
        const parsedWarp = JSON.parse(customWarpData);
        if (parsedWarp.owner === player.name){
            world.setDynamicProperty(`warp:${warpName}`, undefined)
            restToPlayerWarpC(player);
            player.sendMessage(`§dWarp ${warpName} ha sido eliminado`)
        } else player.sendMessage("§cEse warp no es tuyo");
    } else {
        player.sendMessage("§cEse warp no existe")
    }
    return;
}