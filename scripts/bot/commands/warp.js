import { system, WeatherType, world } from '@minecraft/server';
import { getRank } from '../data/playerDataUtils';
import { getFilteredPropertyKeys } from '../botUtils';

const WARP_LIMITS = {
    Campesino: 1,
    Aldeano: 2,
    Escudero: 3,
    Caballero: 3,
    Barón: 4,
    Conde: 5,
    Duque: 6,
    Príncipe: 8,
    Rey: 10,
    Emperador: 999
};

export function restToPlayerWarpC(player){
    let wpc = player.getDynamicProperty('warp:count') || 0;
    wpc--;
    player.setDynamicProperty("warp:count", wpc);
    return;
}

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
            player.playSound("ambient.cave", player.location);
        });
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
        player.sendMessage("§cUso: !delwarp <nombre_del_warp>");
        return;
    };
    const warpName = args[1].toLowerCase();

    // Intentar cargar el warp personalizado primero
    const customWarpData = world.getDynamicProperty(`warp:${warpName}`);
    if (customWarpData) {
        const parsedWarp = JSON.parse(customWarpData);
        if (parsedWarp.owner === player.name){
            world.setDynamicProperty(`warp:${warpName}`, undefined);
            restToPlayerWarpC(player);
            player.sendMessage(`§dWarp ${warpName} ha sido eliminado`);
        } else player.sendMessage("§cEse warp no es tuyo");
    } else {
        player.sendMessage("§cEse warp no existe (escribe el nombre exactamente)");
    }
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
        player.sendMessage(`§l§6Warps disponibles:§r§e`);
        for (const w in availableWarps) {
            const wdta = JSON.parse(world.getDynamicProperty(`warp:${availableWarps[w]}`))
            player.sendMessage('§a' + availableWarps[w] + '§b - (Owner: ' + wdta.owner + ')')
        }
    } else {
        player.sendMessage('§cNo hay warps disponibles en el mundo.');
    }
    return;
}

export function warpTo(player, args) {
    const warpName = args[1].toLowerCase();
    let targetLocation;
    let targetDimension;
    let messageText;

    
    // Busca todos los warps
    const warpsSearchResult = getFilteredPropertyKeys('warp', warpName);

    if (warpsSearchResult.length === 0) {
        player.sendMessage("§cEse warp no existe");
        return;
    }

    if (warpsSearchResult.length > 1) {
        player.sendMessage("§gHay varios warps que coinciden con ese nombre")
        return;
    }

    if (warpsSearchResult) {
        const parsedWarp = JSON.parse(world.getDynamicProperty(warpsSearchResult[0]));
        targetLocation = parsedWarp.location;
        targetDimension = world.getDimension(parsedWarp.dimension);
        messageText = `¡Teletransportándote al warp '${warpName}'!`;
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