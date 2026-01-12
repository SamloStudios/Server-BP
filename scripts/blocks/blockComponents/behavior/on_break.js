
export const OnBlockBreak = {
    onPlayerBreak({player, brokenBlockPermutation, block, dimension}, {params}) {
        const creature_to_spawn = params.onPlayerBreak.spawn;
        const location_to_spawn = block.location;
        
        if (creature_to_spawn) dimension.spawnEntity(creature_to_spawn, location_to_spawn);
        
        
        /* const equippable = player?.getComponent("minecraft:equippable");
        if (!equippable) return;
    
        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (params.item !== 'any' && (!mainhand.hasItem() || mainhand.typeId !== params.item)) {
            return;
        }
        else if (player.getGameMode() !== 'Creative'){
            const amount = params.drop?.count ?? 1;
            const itemToDrop = params.drop?.item ? new ItemStack(params.drop.item, amount) : brokenBlockPermutation.getItemStack(amount);
            dimension.spawnItem(itemToDrop, block.center());
        } */
    }
}