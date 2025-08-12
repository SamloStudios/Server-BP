import { setChestOwner, getChestOwner } from 'utils/ownershipUtils.js'
import { isAdmin } from "../botUtils";

export function owner(player, args) {
    if (!isAdmin(player)) return;

    let newOwner;
    if (args.length < 2) {
        newOwner = "unknown";
    } else newOwner = args[1];

    if (newOwner === 'null') {
        newOwner = undefined;
    }

    const blockHit = player.getBlockFromViewDirection();
    if (blockHit) {
        setChestOwner(blockHit.block, newOwner);
        player.sendMessage("§gSet new owner as: " + newOwner)
    } else player.sendMessage("§cNo block hit")
    return;
}