import { getBlockFromFace } from "../../utils/blockComponentUtils";

export const placementRules = {
    beforeOnPlayerPlace(event, customParameters) {
        const face = event.permutationToPlace.getState("minecraft:block_face") || undefined;
        const block = face ? getBlockFromFace(event.block, face) : event.block.below();
        
        const white_list = customParameters.params.whitelist || undefined;
        const black_list = customParameters.params.blacklist || undefined;
        // White list toma precedecia sobre black_list
        if (white_list) {
            // If cancelEventWhitelist returns true, it means the block is NOT in the whitelist, so cancel the event.
            if (cancelEventWhitelist(block, white_list)) {
                event.cancel = true;
            }
        } else if (black_list) {
            if (!cancelEventWhitelist(block, black_list)) {
                event.cancel = true;
            }
        }

        // If the event is already cancelled by whitelist/blacklist, stop further checks.
        if (event.cancel) {
            return;
        }
        
        const rules = customParameters.params.rules || undefined;
        const permutationName = event.permutationToPlace.type.id;
        if (filterEventOnBlocks(block, permutationName, rules)) {
            event.cancel = true;
        }

        // If the event is already cancelled by general rules, stop further checks.
        if (event.cancel) {
            return;
        }

        // --- Handle Allowed Block Faces ---
        const allowedFaces = customParameters.params.block_face || undefined;
        if (allowedFaces && face) {
            // filterEventOnBlockFace returns true if the block face is not allowed.
            if (filterEventOnBlockFace(event, allowedFaces)) {
                event.cancel = true;
            }
        }
    }
}


/// Functions that limit the block placement ---
// Whitelist of blocks allowed to place on
export function cancelEventWhitelist(block, allowedBlocks) {
    if (!allowedBlocks.includes(block.typeId.replace("minecraft:", ""))){
        return true;
    }
    return false;
}

// Checks if the blockFace is allowed
export function filterEventOnBlockFace(event, allowedFaces){
    const faces = allowedFaces.toLowerCase();
    if (!faces.includes(event.face.toLowerCase())) event.cancel = true;
}

export function invert(event) {
    event.cancel = event.cancel? false : true;
}


// Checks for blockface of placing to see if the block is forbidden block and prevents it (Deprecated)
export function filterEventOnBlocks(blockToCheck, permutationName, criterium = undefined) {
    // If no criterium is provided, default to cancelling if the block being placed is the same type as the target block.
    if (!criterium) {
        return handleSameType(blockToCheck, permutationName);
    }

    const filter = criterium.split(',').map(s => s.trim()).filter(Boolean);

    // Rule: "solid" - Only allow placement on solid blocks.
    // If `handleNotSolidBlocks` returns true, it means `blockToCheck` is NOT solid, so cancel.
    if (filter.includes("solid") && handleNotSolidBlocks(blockToCheck)) {
        return true; // Cancel
    }

    // Rule: "not_same_type" - Only allow placement on blocks that are NOT the same type as the one being placed.
    // If `handleSameType` returns true, it means `blockToCheck` IS the same type, so cancel.
    if (filter.includes("not_same_type") && handleSameType(blockToCheck, permutationName)) {
        return true; // Cancel
    }

    // Rule: "not_solid" - Only allow placement on non-solid blocks (e.g., air, water, replaceable blocks).
    // If `blockToCheck` is solid-like (cannot contain liquid or blocks liquid), then cancel.
    if (filter.includes("not_solid") && (!blockToCheck.canContainLiquid("Water") || blockToCheck.isLiquidBlocking("Water"))) {
        return true; // Cancel
    }

    // Rule: "same_type" - Only allow placement on blocks that ARE the same type as the one being placed.
    // If `blockToCheck.typeId` is NOT the same as `permutationName`, then cancel.
    if (filter.includes("same_type") && blockToCheck.typeId !== permutationName) {
        return true; // Cancel
    }

    // If none of the above conditions led to cancellation, allow placement.
    return false;
}


// Cancels the event if the block is not solid
export function handleNotSolidBlocks(block) {
    return block.canContainLiquid("Water") || !block.isLiquidBlocking("Water");
}

// Checks for blockface of placing to see if the block is being placed on a similar block and prevents it
export function handleSameType(block, blockName) {
    return block.typeId === blockName;
}