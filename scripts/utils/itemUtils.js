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
