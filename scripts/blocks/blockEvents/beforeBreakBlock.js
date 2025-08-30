// What will happen:
// If a player breaks a block
import { EquipmentSlot } from "@minecraft/server";
import {setChestOwner, getChestOwner} from 'utils/ownershipUtils.js'
import {displayActionBar} from 'utils/displayUtils.js'

const PurpuriteTierBlocks = [
    "endupdate:cut_purpurite_block",
    "endupdate:golden_purpurite_pillar_join",
    "endupdate:golden_purpurite_pillar",
    "endupdate:golden_purpurite_polished_block",
    "endupdate:purpurite_block",
    "endupdate:purpurite_bricks",
    "purpurite_chiseled_block",
    "endupdate:purpurite_cracked_bricks", //Not implemented yet
    "endupdate:purpurite_encased_glass", //Not implemented yet
    "endupdate:purpurite_pillar_join",
    "endupdate:purpurite_pillar",
    "endupdate:purpurite_polished_block"
];



export function beforePlayerBreakBlock(event) {
    const block = event.block;
    const blockName = event.block.typeId;
    const player = event.player;

    if (player.getGameMode() == 'Creative') return;

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

    } else if (PurpuriteTierBlocks.includes(blockName)) {
        event.cancel = true; // Cancel the block break event
        const equippable = player?.getComponent("minecraft:equippable");
        if (!equippable) return;
    

        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (mainhand.hasItem() && mainhand.typeId.startsWith('endupdate:purpurite_')) {
            event.cancel = false; // Allow the block break event
            return;
        }

        displayActionBar(player, `§cNo puedes destruir este bloque con ese pico.`);
        return;
    }
}