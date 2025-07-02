// What will happen:
// If a player breaks a block
import {setChestOwner, getChestOwner} from 'utils/ownershipUtils.js'
import {displayActionBar} from 'utils/displayUtils.js'

export function beforePlayerBreakBlock(event) {
    const block = event.block;
    const blockName = event.block.typeId;
    const player = event.player;

    if (blockName === 'minecraft:chest') {
        const owner = getChestOwner(block);
        if (owner == undefined) return;
        if (owner !== player.name) {
            displayActionBar(player, `§cEste cofre pertenece a ${owner}. No puedes destruirlo.`);
            event.cancel = true; // Cancel the block break event
            return;
        
        }
        // Remove the owner property when the chest is broken
        setChestOwner(block, undefined)
        displayActionBar(player, `§gTu cofre ha sido destruido`);
    }
}