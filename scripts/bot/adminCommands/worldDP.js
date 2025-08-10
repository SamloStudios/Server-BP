import { world } from "@minecraft/server";
import { getFilteredPropertyKeys } from "../botUtils";


function isAdmin(player) {
    return player.hasTag('admin');
}

export function worldDP(player, args) {
    if (!isAdmin(player)) return;

    const errorMsg = '§9Use: !worldDp <get/set/remove/getKeys/getAll/getByte> [value] (parameter)';

    if (args.length < 2) {
        player.sendMessage(errorMsg);
        return;
    }
    const wPropertyKeys = world.getDynamicPropertyIds();

    switch (args[1]) {
        case 'get':
            if (args[2] === undefined) return;
            const answer = world.getDynamicProperty(args[2]);
            player.sendMessage(`    §aGetting property ${args[2]} contents...§9\n${answer}`)
            if (answer === undefined) player.sendMessage("§c    Undefined property!")
            break;
        case 'set':
            if (args[2] === undefined) return;
            const key = wPropertyKeys.find((s) => s === args[2]);
            if (key === undefined) player.sendMessage(`    §bSetting new property [§d${args[2]}§b] to:\n>>> ${args[3]}`);
            world.setDynamicProperty(args[2], args[3]);
            break;
        case 'remove':
            const toRemove = wPropertyKeys.find((s) => s === args[2]);
            if (toRemove === undefined) {
                player.sendMessage(`    §gProperty nonexistent or already deleted`);
            } else {
                world.setDynamicProperty(toRemove, undefined)
                player.sendMessage(`    §cProperty set to undefined (removed)`)
            };
            break;
        case 'getKeys':
            if (args[2] === undefined) return;
            const keys = getFilteredPropertyKeys(args[2]);
            player.sendMessage(`    §aGetting all property keys of [§d${args[2]}§a]:`)
            for (const k in keys) {
                player.sendMessage(keys[k]);
            }
            if (keys.length == 0) player.sendMessage("§c    Not a key found!")
            break;
        case 'getAll':
            for (const k in wPropertyKeys) {
                player.sendMessage('§a' + wPropertyKeys[k]);
            }
            break;
        case 'getByte':
            player.sendMessage(`Peso de las dynamic properties: §9${world.getDynamicPropertyTotalByteCount()} Bytes`);
            break;
        default:
            player.sendMessage(errorMsg);
            break
    }
}