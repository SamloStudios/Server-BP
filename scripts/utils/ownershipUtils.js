// Functions:
// To set an owner of a certain block (preferably a chest)
import {world, EquipmentSlot} from '@minecraft/server';

export function setChestOwner(chest, ownerName) {
    const blockPos = chest.location;
    const blockRawDim = chest.dimension.id;
    let dimension;
    switch (blockRawDim) {
        case 'minecraft:overworld':
            dimension = 'o';
            break;
        case 'minecraft:nether':
            dimension = 'n';
            break;
        case 'minecraft:end':
            dimension = 'e';
            break;
    }
    world.setDynamicProperty(`owner:${blockPos.x},${blockPos.y},${blockPos.z},${dimension}`, ownerName);
    return;
}

export function getChestOwner(chest) {
    const blockPos = chest.location;
    const blockRawDim = chest.dimension.id;
    let dimension;
    switch (blockRawDim) {
        case 'minecraft:overworld':
            dimension = 'o';
            break;
        case 'minecraft:nether':
            dimension = 'n';
            break;
        case 'minecraft:end':
            dimension = 'e';
            break;
    }
    const owner = world.getDynamicProperty(`owner:${blockPos.x},${blockPos.y},${blockPos.z},${dimension}`);
    return owner;
}

export function getPlayerHeldItem(player){
    const equippable = player.getComponent("minecraft:equippable");
    const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);

    
    if (mainhand) {
        // The 'container' property of the inventory component gives access to the actual slots
        let itemInHand;
        try {
            itemInHand = mainhand.typeId;
        } catch (err) {
            itemInHand = undefined;
        }

        return itemInHand;
    }
    return undefined; // Should not happen if player has an inventory component
}