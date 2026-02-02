import { ItemStack, EquipmentSlot} from "@minecraft/server";
import { killItemStack } from "../../../utils/itemUtils";

export const BreakRestriction = {
    onPlayerBreak({player, brokenBlockPermutation, block, dimension}, {params}) {
        if (player.getGameMode() === 'Creative') return; // Do nothing if player on creative

        
        const equippable = player?.getComponent("minecraft:equippable");
        if (!equippable) return;
        
        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (params.item !== 'any' && (!mainhand.hasItem() || mainhand.typeId !== params.item)) {
            // if item not the correct one, kill the drop
            const itemStack = brokenBlockPermutation.getItemStack();
            killItemStack(block.location, dimension, itemStack)
            return;
        }
        // If item is the correct one
        else {
            const amount = params.drop?.count ?? 1;
            const itemToDrop = params.drop?.item ? new ItemStack(params.drop.item, amount) : brokenBlockPermutation.getItemStack(amount);
            dimension.spawnItem(itemToDrop, block.center());
        }
    }
}