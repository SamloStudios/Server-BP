import { ItemStack, EquipmentSlot} from "@minecraft/server";

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

function killItemStack(location, dimension, itemStack) {
    const itemEntities = dimension.getEntitiesAtBlockLocation(location);
    itemEntities.forEach(entity => {
        const itemComponent = entity.getComponent("item") // Get the item component of the floating item entity
        if (!itemComponent) return;
        if (itemComponent.itemStack.typeId === itemStack.typeId) {
            entity.remove();
        }
    });
}