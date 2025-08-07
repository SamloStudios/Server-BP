import { system, world } from "@minecraft/server";
import { truncateFloat } from '../botUtils.js';

export function setHome(player) {
    const pos = player.location;
    const dim = player.dimension.id;
    if (dim !== 'minecraft:overworld') {
        player.sendMessage(`§cSolo los grandes señores pueden establecer hogares fuera del Overworld.`);
        return;
    }
    const newHomeData = {
        dimension: dim,
        location: {
            x: truncateFloat(pos.x, 2),
            y: truncateFloat(pos.y, 2),
            z: truncateFloat(pos.z, 2)
        }
    };
    player.setDynamicProperty(`home`, JSON.stringify(newHomeData));
    player.sendMessage(`§aTu hogar ha sido registrado en X:${newHomeData.location.x}, Y:${newHomeData.location.y}, Z:${newHomeData.location.z}.`);
}

export function home(player) {
    const home = player.getDynamicProperty(`home`);
    if (!home) {
        player.sendMessage('§cNo tienes un hogar registrado. Usa !set para establecer uno.');
        return;
    }
    const homeData = JSON.parse(home);
    const { location, dimension } = homeData;
    system.run(() => {
        const dim = world.getDimension(dimension);
        if (dim) {
            player.teleport(location, { dimension: dim });
            player.sendMessage(`§aTeletransportándote a tu hogar en el reino...`);
        } else {
            player.sendMessage('§cDimensión no encontrada.');
        }
    });
}