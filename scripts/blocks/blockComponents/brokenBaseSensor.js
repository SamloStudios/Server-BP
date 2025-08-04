import { getBlockFromFace, breakBlock } from "../../utils/blockComponentUtils";

export const brokenBaseSensor = {
    onTick(event) {
        const block = event.block;
        const face = event.block.permutation.getState("minecraft:block_face") ?? undefined;
        const blockCheck = face ? getBlockFromFace(block, face) : event.block.below();
        if (blockCheck.typeId === "minecraft:air") {
            breakBlock(block);
        }
    }
}