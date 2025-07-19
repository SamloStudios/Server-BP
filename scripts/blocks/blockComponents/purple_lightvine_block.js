import { BlockPermutation } from "@minecraft/server";

export const PurpleLightvine = {
    beforeOnPlayerPlace(event) {
        // get block up from here
        const blockAbove = event.block.above();
        const newPermutation = BlockPermutation.resolve("endupdate:purple_lightvine");
        // check if it is a purple vine too
        if (blockAbove.typeId === "endupdate:purple_lightvine") {
            // check if the block above has the custom:role set to top
            const aboveRole = blockAbove.permutation.getState("custom:role");
            if (aboveRole === "top") {
                // set the block above to middle
                blockAbove.setPermutation(newPermutation.withState("custom:role", "middle"));
                // set this block to top
                event.block.setPermutation(newPermutation.withState("custom:role", "top"));
            } else {
            // set the block above to root
            blockAbove.setPermutation(newPermutation.withState("custom:role", "root"));
            }
        }
        // check if it is a purple vine with the custom:role NOT set to top
        // if it is, set the blockstate custom:role to middle
        // if it is not, set the blockstate custom:role to top
        // set the blockstate of the block above to middle
        // if it is not a purple vine, set the blockstate custom:role to root

        // let newPermutation = BlockPermutation.resolve("endupdate:purple_fungus_stem_infested").withState("custom:variant", randomVariant).withState("minecraft:block_face", facing);
        event.block.setPermutation(newPermutation);
    }
}