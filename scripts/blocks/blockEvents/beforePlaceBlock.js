// What will happen:
// If a player places a block
import {getChestOwner} from 'utils/ownershipUtils.js';
import {displayActionBar} from 'utils/displayUtils.js';
import { ClaimManager } from 'claims/claimManager.js'

const Manager = new ClaimManager();

export function beforePlayerPlaceBlock(event){
    const blockName = event.permutationToPlace.type.id;
    const {player, block} = event;

    if (player.getGameMode() == 'Creative') return;

    if ( Manager.getClaimsAtLocation(block.location, block.dimension.id).length !== 0 ) event.cancel = true; // TODO: Add owner property and permissions recognition
    
    if (blockName === "minecraft:hopper") {
        // --- TEMPORAL --- //
        // event.cancel = true; // TODO

        // Obtenemos el bloque directamente encima de la ubicación de la tolva.
        const blockAbove = event.block.above(1);

        // Asegurarse de que el bloque de arriba exista y sea un cofre.
        if (blockAbove && blockAbove.typeId === "minecraft:chest") {
            const chestOwner = getChestOwner(blockAbove);

            // Si el cofre tiene dueño Y NO es el jugador que está colocando la tolva.
            if (chestOwner && chestOwner !== player.name) {
                event.cancel = true; // Cancela el evento, impidiendo que la tolva sea colocada.
                displayActionBar(player, `§cEste cofre pertenece a ${chestOwner}.`);
            }
        }
    } else

    // TEMPORAL BLOCK BAN
    if (blockName === "minecraft:piston" || blockName === "minecraft:sticky_piston") {
        const blockAbove = event.block.above(1);
        if (blockAbove.typeId === "minecraft:chest") event.cancel = true;
        const blockBelow = event.block.below(1);
        if (blockBelow.typeId === "minecraft:chest") event.cancel = true;
        const blockNorth = event.block.north(1);
        if (blockNorth.typeId === "minecraft:chest") event.cancel = true;
        const blockSouth = event.block.south(1);
        if (blockSouth.typeId === "minecraft:chest") event.cancel = true;
        const blockEast = event.block.east(1);
        if (blockEast.typeId === "minecraft:chest") event.cancel = true;
        const blockWest = event.block.west(1);
        if (blockWest.typeId === "minecraft:chest") event.cancel = true;
        return;
    }
}