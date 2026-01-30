
export const OnBlockBreakEvent = {
    onPlayerBreak({player, brokenBlockPermutation, block, dimension}, {params}) {
        const creature_to_spawn = params.onPlayerBreak.spawn;
        const location = block.location;
        const sound_to_play = params.onPlayerBreak.sound;
        
        if (creature_to_spawn) dimension.spawnEntity(creature_to_spawn, location);
        
        if (sound_to_play) dimension.playSound(sound_to_play, location);
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