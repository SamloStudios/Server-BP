import { ItemStack, EquipmentSlot} from "@minecraft/server";

export const BreakRestriction = {
    onPlayerBreak({player, brokenBlockPermutation, block, dimension}, {params}) {
        const equippable = player?.getComponent("minecraft:equippable");
        if (!equippable) return;
    
        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (params.item !== 'any' && (!mainhand.hasItem() || mainhand.typeId !== params.item)) {
            return;
        }
        else if (player.getGameMode() !== 'Creative'){
            const amount = params.drop?.count ?? 1;
            const itemToDrop = params.drop?.item ? new ItemStack(params.drop.item, amount) : brokenBlockPermutation.getItemStack(amount);
            dimension.spawnItem(itemToDrop, block.center());
        }
    }
}