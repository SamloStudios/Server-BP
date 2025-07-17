// What will happen:
// If a player places a block
import {setChestOwner} from 'utils/ownershipUtils.js';
import {displayActionBar} from 'utils/displayUtils.js';

export function afterPlayerPlaceBlock({block, player}){
    const blockName = block.typeId;
    
    if (blockName === 'minecraft:chest') {
        let tags = player.getTags();
        if (!tags.includes("secureChests")) {
            return;
        }

        // Register the owner of the chest
        setChestOwner(block, player.name);
        displayActionBar(player, `§bTu cofre esta protegido`);
    } 
}