// debug_stick_component.js (or whatever you name this file)
import { system, BlockPermutation, world } from '@minecraft/server'; // Add 'world' import

export const DebugStick = {
    // The onUseOn method is automatically called when an item with this custom component
    // is used on a block. The 'event' object will contain itemStack, block, and source.
    onUseOn(event) {
        const { itemStack, block, source } = event;

        // The itemStack.typeId check is no longer strictly necessary here
        // because this 'onUseOn' method is *only* invoked if the item has
        // the 'utils:stick' custom component.
        // However, if you want to ensure it's specifically 'debug:stick' and not another item
        // that somehow also uses 'utils:stick', you could keep it. For this context, it's fine without.
        // if (itemStack.typeId === 'debug:stick') { // Removed as redundant given component registration

        // Prevent the default action of the stick (e.g., placing the stick itself)
        event.cancel = true;

        const player = source;
        const blockLocation = block.location;

        let debugInfo = `--- Block Debug Info ---\n`;
        debugInfo += `Type: ${block.typeId}\n`;
        debugInfo += `Location: X:${blockLocation.x}, Y:${blockLocation.y}, Z:${blockLocation.z}\n`;

        // Get block properties/states (these are "Vanilla Block States" and custom block states)
        // ... (inside your onUseOn method)

            const blockPermutation = block.permutation;
            if (blockPermutation) {
                debugInfo += `States:\n`;
                // Use Map.prototype.entries() explicitly if getAllStates() isn't returning
                // an iterable that 'for...of' expects for direct destructuring.
                // However, getAllStates() *should* return a Map, which is iterable by default.
                // Let's ensure we are getting the values correctly.

                const statesMap = JSON.stringify(blockPermutation.getAllStates()); // This returns a Map<string, any>

                debugInfo += `  - JSON: ${statesMap}\n`;
                
            }

// ...

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