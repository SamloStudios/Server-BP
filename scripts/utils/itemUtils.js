export function killItemStack(location, dimension, itemStack) {
    const itemEntities = dimension.getEntitiesAtBlockLocation(location);
    itemEntities.forEach(entity => {
        const itemComponent = entity.getComponent("item") // Get the item component of the floating item entity
        if (!itemComponent) return;
        if (itemComponent.itemStack.typeId === itemStack.typeId) {
            entity.remove();
        }
    });
}

/**
 * @remarks
 * Force give an item to the player
 * 
 * If the player has no inventory space, throw the item at him 
 * @param {*} player 
 * @param {*} itemStack 
 */
export function forceGiveItem(player, itemStack) {
    const container = player.getComponent("inventory").container;
    const empty = container.firstEmptySlot();
    if (empty !== undefined) {
        container.setItem(empty, itemStack)
    } else player.dimension.spawnItem(itemStack, player.location);
}