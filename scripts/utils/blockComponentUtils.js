import { system } from "@minecraft/server";

// Gets the blocks from a certain face of the block
export function getBlockFromFace(block, _face) {
    const face = _face.toLowerCase(); 

    if (face === "down") {
        return block.above();
    }

    if (face === "up") {
        return block.below();
    }

    if (face === "east") {

        return block.west();
    }

    if (face === "west") {

        return block.east();
    }

    if (face === "north") {

        return block.south();
    }

    if (face === "south") {
        return block.north();
    }
}

export function breakBlock(block) {
    const item = block?.getItemStack();
    try {
        block.dimension.spawnItem(item, block.location);
        block.setType("minecraft:air");
    } catch (err) {}
}

export function vec3_offset({ x = 0, y = 0, z = 0 } = {}, dx = 0, dy = 0, dz = 0) {
    return { x: x + dx, y: y + dy, z: z + dz };
}

export function set_state(block, params) {
    const state = params.state;
    let value = params.value; // puede ser un solo valor o un array

    // Verificamos que el bloque realmente tenga ese estado
    const currentState = block.permutation?.getState(state);
    if (currentState == null) return;

    // Si value es un array → escoger valor aleatorio
    if (Array.isArray(value)) {
        if (value.length === 0) return; // por si viene vacío
        value = value[Math.floor(Math.random() * value.length)];
    }

    block.setPermutation(block.permutation.withState(state, value));
}

export function disabler(params, block) {
    if (params) {
        const operator = params.operator ?? "==";
        const disabler_state = params.state ?? "";
        const disabled_value = params.value ?? "";

        const current_state = block.permutation.getState(disabler_state);

        if (operator === "==" && current_state === disabled_value) return true;
        if (operator === "!=" && current_state !== disabled_value) return true;
        return false;
    }
}