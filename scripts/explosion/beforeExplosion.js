import { displayActionBar } from 'utils/displayUtils.js'
import { getChestOwner } from 'utils/ownershipUtils.js'
import { world } from "@minecraft/server";

// 1. Protección contra Explosiones
// Este evento se dispara ANTES de que una explosión modifique los bloques.
world.beforeEvents.explosion.subscribe(event => {
    // Filtra los bloques impactados para excluir los cofres que tienen dueño.
    const filteredImpactedBlocks = event.getImpactedBlocks().filter(block => {
        // Solo comprobamos si es un cofre para optimizar.
        if (block.typeId === "minecraft:chest") {
            const owner = getChestOwner(block);
            if (owner) {
                return false; // Excluye este cofre de la lista de bloques impactados.
            }
        }
        return true; // Incluye todos los demás bloques (no cofres o cofres sin dueño).
    });

    // Actualiza la lista de bloques que serán realmente afectados por la explosión.
    event.setImpactedBlocks(filteredImpactedBlocks);
});