import { BlockPermutation, EquipmentSlot, ItemComponentTypes} from "@minecraft/server";

export const PurpleFungusInfested = {
    
    onPlace(event) {
        const facing = event.block.permutation.getState("minecraft:block_face");
        // print(facing);

        const randomVariant = Math.floor(Math.random() * 2);
        let newPermutation = BlockPermutation.resolve("endupdate:purple_fungus_stem_infested").withState("custom:variant", randomVariant).withState("minecraft:block_face", facing);
        event.block.setPermutation(newPermutation);
    },

    onRandomTick: (event) => {
        const { block, dimension } = event;
        let adyacentBlocks = [];
        adyacentBlocks.push(block.above());
        adyacentBlocks.push(block.below());
        adyacentBlocks.push(block.north());
        adyacentBlocks.push(block.south());
        adyacentBlocks.push(block.east());
        adyacentBlocks.push(block.west());
        for (let adyacentBlock of adyacentBlocks) {
            const randomChance = Math.floor(Math.random() * 15);
            if (adyacentBlock.typeId === "endupdate:purple_fungus_stem") {
                if (randomChance < 1) {
                    const oldBlockRotation = adyacentBlock.permutation.getState("minecraft:block_face");
                    const randomVariant = Math.floor(Math.random() * 2);
                    const newBlock = BlockPermutation.resolve("endupdate:purple_fungus_stem_infested")
                        .withState("custom:variant", randomVariant)
                        .withState("minecraft:block_face", oldBlockRotation);
                    adyacentBlock.setPermutation(newBlock);
                    return;
                }
            }
        }
    },

    onPlayerBreak(event) {
        const location = event.block.center()
        const dimension = event.dimension // Dimension that contains the block.
        const player = event.player // The player that broke the block. May be undefined.

        const equippable = player?.getComponent('equippable')
        const slot = equippable.getEquipment(EquipmentSlot.Mainhand);
        const enchantements = slot?.getComponent(ItemComponentTypes.Enchantable);
        if (!enchantements || !enchantements.hasEnchantment("silk_touch")) {
            dimension.spawnEntity("endupdate:snark", location);
        }


        // dimension.createExplosion(location, 20, {causesFire: true, breaksBlocks: true, allowUnderwater: true, source: player})
    }

    /**
     * Called before a player places a block.
     * Use this to modify the block permutation that will be placed.
     * event
     */
    // beforeOnPlayerPlace(event) {
    //     // Get the current block permutation that will be placed
    //     let blockPermutationToModify = event.permutationToPlace; 
    
    //     // Generate a random integer: 0 or 1
    //     // Math.random() gives 0.0 to 0.999...
    //     // Math.random() * 2 gives 0.0 to 1.999...
    //     // Math.floor(...) gives 0 or 1
    //     const randomVariant = Math.floor(Math.random() * 2);
    
    //     // Apply the custom state to a NEW permutation
    //     const newPermutation = blockPermutationToModify.withState("custom:variant", randomVariant); 
    
    //     // Crucial: Assign the new permutation back to the event to make the change effective
    //     event.permutationToPlace = newPermutation;
    // }
}