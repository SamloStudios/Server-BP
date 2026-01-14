import { system } from "@minecraft/server";

export const GrinchLokoDollComponent = {
    onTick({block, dimension}) {
        // Search for players within a 5 block radius
        const players = dimension.getPlayers({maxDistance: 4, location: block.location});

        // Get the current state 
        const active = block.permutation.getState("custom:active");
        if (active) return; // Already active, do nothing

        if (players.length > 0) {
            // Transform the block into its active state
            transformSequence(block, dimension);
            block.setPermutation(block.permutation.withState("custom:active", true));
        } else {
            if (Math.random() < 0.1) {
                // Play ambient sound effect occasionally
                dimension.playSound("grinchiloko.doll_random", block.location);
            }
        }
    }
}

function transformSequence(block, dimension) {
    // Play sound effect
    dimension.playSound("grinchiloko.doll_come_alive", block.location);

    system.runTimeout(() => {
        dimension.setBlockType(block.location, "minecraft:air");
        dimension.spawnEntity("christmas:grinchiloko_doll", block.location);
    }, 20 * 4)
}