// debug_stick_component.js (or whatever you name this file)
import { system, BlockPermutation, world } from '@minecraft/server'; // Add 'world' import

export const DebugStick = {
    // The onUseOn method is automatically called when an item with this custom component
    // is used on a block. The 'event' object will contain itemStack, block, and source.
    onUseOn(event) {
        const { itemStack, block, source } = event;

        const player = source;
        const blockLocation = block.location;
        const below = {x: blockLocation.x, y: blockLocation.y-5, z: blockLocation.z}

        // world.getDimension("overworld").placeFeature("minecraft:pagoda", blockLocation, true);

        let debugInfo = `§a--- Block Debug Info ---\n`;
        debugInfo += `§gType: §c${block.typeId}§g\n`;
        debugInfo += `Location: X:${blockLocation.x}, Y:${blockLocation.y}, Z:${blockLocation.z}\n`;

        // Get block properties/states (these are "Vanilla Block States" and custom block states)
        // ... (inside your onUseOn method)

            const blockPermutation = block.permutation;
            if (blockPermutation) {
            // STEP 1: Get ALL states as a plain JavaScript object
            const allBlockStatesObject = blockPermutation.getAllStates();
            // 'allBlockStatesObject' is now an object like { "wood_type": "spruce", ... }

            debugInfo += `States:\n`;

            // Check if the object has any properties
            const stateKeys = Object.keys(allBlockStatesObject);
            if (stateKeys.length === 0) {
                debugInfo += `  (No specific states for this block permutation)\n`;
            } else {
                // STEP 2: Iterate over the object's entries using Object.entries()
                for (const [key, value] of Object.entries(allBlockStatesObject)) { 
                    debugInfo += `  - ${key}: ${value}\n`;
                }

                // STEP 3: Now, to specifically get a furnace's orientation:
                // Access properties using bracket notation, not .get()
                const cardinalDirectionKey = 'minecraft:cardinal_direction';
                if (Object.prototype.hasOwnProperty.call(allBlockStatesObject, cardinalDirectionKey)) {
                    const orientationValue = allBlockStatesObject[cardinalDirectionKey];
                    // 'orientationValue' is now the string (e.g., "north", "south")
                    debugInfo += `  Specific Orientation (cardinal): ${orientationValue}\n`;
                } else {
                    debugInfo += `  'minecraft:cardinal_direction' state not found.\n`;
                }

                const genericDirectionKey = 'direction'; // For older or custom blocks
                if (Object.prototype.hasOwnProperty.call(allBlockStatesObject, genericDirectionKey)) {
                    const orientationValue = allBlockStatesObject[genericDirectionKey];
                    debugInfo += `  Specific Orientation (generic direction): ${orientationValue}\n`;
                }
            }
        } else {
            debugInfo += `Block Permutation is null or undefined.\n`;
        }

        // Get NBT-like data for Block Entities (e.g., Chests, Furnaces, Signs)
        try {
            const inventoryComponent = block.getComponent("minecraft:inventory");
            if (inventoryComponent) {
                const container = inventoryComponent.container;
                if (container) {
                    debugInfo += `Inventory Slots: ${container.size}\n`;
                    for (let i = 0; i < container.size; i++) {
                        const item = container.getItem(i);
                        if (item) {
                            debugInfo += `  Slot ${i}: ${item.typeId} (Amount: ${item.amount})\n`;
                            if (item.nameTag) {
                                debugInfo += `    Name Tag: ${item.nameTag}\n`;
                            }
                            const enchantmentComponent = item.getComponent("minecraft:enchantable");
                            if (enchantmentComponent) {
                                // Accessing enchantments directly:
                                const enchantments = enchantmentComponent.getEnchantments();
                                if (enchantments.length > 0) {
                                    debugInfo += `    Enchantments:\n`;
                                    for (const enchantment of enchantments) {
                                        debugInfo += `      - ${enchantment.type.id}: Level ${enchantment.level}\n`;
                                    }
                                }
                            }
                            const durabilityComponent = item.getComponent("minecraft:durability");
                            if (durabilityComponent) {
                                debugInfo += `    Durability: ${durabilityComponent.damage}/${durabilityComponent.maxDurability}\n`;
                            }
                            const loreComponent = item.getComponent("minecraft:lore");
                            if (loreComponent && loreComponent.lore.length > 0) {
                                debugInfo += `    Lore: ${loreComponent.lore.join(", ")}\n`;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            debugInfo += `Error getting inventory: ${e.message}\n`;
        }


        // For custom blocks, you might have custom components defined in their JSON.
        try {
            // Example for a custom component you might define on a block
            const customValueComponent = block.getComponent("my_mod:custom_value");
            if (customValueComponent) {
                // Assuming 'my_mod:custom_value' component has a 'value' property
                debugInfo += `Custom Block Value: ${customValueComponent.value}\n`;
            }
        } catch (e) {
            // This catch block is important because getComponent throws if the component doesn't exist.
            // console.warn(`Block does not have 'my_mod:custom_value' component.`);
        }

        // Other common block properties
        debugInfo += `Is Air: ${block.isAir}\n`;
        debugInfo += `Is Waterloggable: ${block.isWaterloggable}\n`;
        debugInfo += `Dimension: ${block.dimension.id}\n`;
        debugInfo += `Permutation Hash: ${blockPermutation ? blockPermutation.permutationHash : 'N/A'}\n`;


        // Send all gathered information to the player's chat
        player.sendMessage(debugInfo);
    }
};