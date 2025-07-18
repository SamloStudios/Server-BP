import { system, world } from "@minecraft/server";
import { truncateFloat } from 'bot/botUtils.js';

// Comando !set (casa)
export function setHome(player) {
    let pos = player.location;
    let dim = player.dimension.id;

    if (dim !== 'minecraft:overworld') {
        player.sendMessage(`§c¡Por ahora solo puedes establecer tu casa en el Overworld!`);
        return;
    }

    for (let key in pos) {
        pos[key] = truncateFloat(pos[key], 2); // Truncate to 2 decimal places
    }

    const newHomeData = {
        dimension: dim, 
        location: { x: pos.x, y: pos.y, z: pos.z }
    };

    const newHome =  JSON.stringify(newHomeData); // homeData -> JSON homeData

    player.setDynamicProperty(`home`, newHome); // Save the home
    player.sendMessage(`§aTu casa ha sido registrada exitosamente. ${player.name}, ${pos.x}, ${pos.y}, ${pos.z}`);
    console.log(`@$houseUpdate ${player.name} ${pos.x} ${pos.y} ${pos.z} ${dim}`);
    return;
}


export function home(player){
    // Comando !home
    const home = player.getDynamicProperty(`home`);
    if (home == undefined) {
        player.sendMessage('§cNo tienes una casa registrada. Usa !set para establecer una.');
        return;
    }

    const homeData = JSON.parse(home);
    const pos = homeData.location;
    const dim = homeData.dimension;

    system.run(() => {
        const dimension = world.getDimension(dim);
        if (dimension) {
            player.teleport({ x: pos.x, y: pos.y, z: pos.z }, { dimension: dimension });
            player.sendMessage(`§aTeletransportándote a tu casa en el ${dim}...`);
        } else {
            player.sendMessage('§cDimensión no encontrada.');
        }
    });
    return;
}
  