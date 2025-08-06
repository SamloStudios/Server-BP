import { system, world } from "@minecraft/server";
// import { truncateFloat } from "./botUtils"; Antes X
import { truncateFloat } from "../botUtils"; //Despues

export function setHome(player) {
    const pos = player.location;
    const dim = player.dimension.id;
    if (dim !== 'minecraft:overworld') {
        player.sendMessage(`§cSolo puedes establecer tu casa en el Overworld.`);
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
    player.sendMessage(`§aTu casa ha sido registrada en ${newHomeData.location.x}, ${newHomeData.location.y}, ${newHomeData.location.z}.`);
    console.log(`@$houseUpdate ${player.name} ${newHomeData.location.x} ${newHomeData.location.y} ${newHomeData.location.z} ${dim}`);
}

export function home(player) {
    const home = player.getDynamicProperty(`home`);
    if (!home) {
        player.sendMessage('§cNo tienes una casa registrada. Usa !set para establecer una.');
        return;
    }
    const homeData = JSON.parse(home);
    const { location, dimension } = homeData;
    system.run(() => {
        const dim = world.getDimension(dimension);
        if (dim) {
            player.teleport(location, { dimension: dim });
            player.sendMessage(`§aTeletransportándote a tu casa en ${dimension}...`);
        } else {
            player.sendMessage('§cDimensión no encontrada.');
        }
    });
}