import { world } from "@minecraft/server";
import { getFilteredPropertyKeys, isAdmin } from "../botUtils";


export function modOwner(player, args){
    let keysToMod = []
    const oldOwner = args[1];
    const newOwner = args[2];
    const chests = getFilteredPropertyKeys('owner');
    if (!isAdmin(player)) {
        player.sendMessage('§cNecesitas permisos de admin para eso')
        return
    };

    for (const i in chests) {
        const check = world.getDynamicProperty(chests[i]);
        if (check.toLowerCase() === oldOwner.toLowerCase()) keysToMod.push(chests[i]);
    }

    if (keysToMod.length === 0) {
        player.sendMessage(`§cNo se encontraron cofres de ${oldOwner}`);
        return;
    }

    for (const i in keysToMod) {
        world.setDynamicProperty(keysToMod[i], newOwner);
    }

    player.sendMessage(`§aDueño modificado ${keysToMod.length} cofres de ${oldOwner} a ${newOwner}`);
}