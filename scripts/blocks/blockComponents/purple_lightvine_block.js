import { BlockPermutation, system, world } from "@minecraft/server";

export const PurpleLightvine = {
    onPlace(event) {
        // get block up from here
        const blockAbove = event.block.above();
        const newPermutation = BlockPermutation.resolve("endupdate:purple_lightvine");
        // check if it is a purple vine too
        if (blockAbove.typeId === "endupdate:purple_lightvine") {
            // check if the block above has the custom:role set to top
            const aboveRole = blockAbove.permutation.getState("custom:role");
            if (aboveRole === "top") {
                blockAbove.setPermutation(newPermutation.withState("custom:role", "middle"));
            }
        }
    },


    // The purpose of this is to select the correct appearance of the vine when placed by a player
    beforeOnPlayerPlace(event) {
        // get block up from here
        const blockAbove = event.block.above();
        const newPermutation = BlockPermutation.resolve("endupdate:purple_lightvine");
        // check if it is a purple vine too
        if (blockAbove.typeId === "endupdate:purple_lightvine") {
            // check if the block above has the custom:role set to top
            const aboveRole = blockAbove.permutation.getState("custom:role");
            if (aboveRole === "top") {
                // set this block to top
                event.permutationToPlace = newPermutation.withState("custom:role", "top");
            } else {
            // set the block above to root
            event.permutationToPlace = newPermutation.withState("custom:role", "middle");
            }
        } else if (blockAbove.typeId !== "minecraft:air"){
            event.permutationToPlace = newPermutation.withState("custom:role", "root");
        } else {
            event.cancel = true;
        }
    },

    onPlayerBreak(event) {
        const block = event.block // Block impacted by this event. This is the block after it has been broken.
        checkBelowToBreak(block);
    },

    onRandomTick(event) {
        const block = event.block;
        const blockBelow = block.below(); // Block above the block impacted by this event.
        if (blockBelow.typeId === "minecraft:air") {
            if (Math.random() < 0.15) {
                const newPermutation = BlockPermutation.resolve("endupdate:purple_lightvine");
                if (block.permutation.getState("custom:role") === "top") {
                    block.setPermutation(newPermutation.withState("custom:role", "middle"));
                    blockBelow.setPermutation(newPermutation.withState("custom:role", "top"));
                } else {
                    if (Math.random() < 0.5) {
                        blockBelow.setPermutation(newPermutation.withState("custom:role", "top"));
                    }
                }
            }
        }
    },

    onTick(event) {
        const blockUp = event.block.above();
        if (blockUp.typeId === "minecraft:air") {
            checkBelowToBreak(blockUp);
        }
    }
}


function checkBelowToBreak(block) {
    const dimension = block.dimension; // Permutation of the block before it was broken.
    const blocksArround = [];
    let blockBelow = block.below();
    
    while (blockBelow.typeId === "endupdate:purple_lightvine") {
        blocksArround.push(blockBelow);
        blockBelow = blockBelow.below();
    }

    system.run(() =>{
        for (const block of blocksArround) {
            const itemStack = block?.getItemStack();
            try {
                world.getDimension(dimension.id).spawnItem(itemStack, block.location);
            } catch (err) {}
            block.setPermutation(BlockPermutation.resolve("minecraft:air"));
        }
    });
}