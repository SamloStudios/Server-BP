// What will happen:
// If a player interacts with a block
import {setChestOwner, getChestOwner, getPlayerHeldItem} from 'utils/ownershipUtils.js'
import {displayActionBar} from 'utils/displayUtils.js'
import { system } from '@minecraft/server';


// Usamos un Map para cada jugador.
const lastInteractionTick = new Map();

// Define el tiempo de enfriamiento en ticks (20 ticks = 1 segundo)
const COOLDOWN_TICKS = 10; // Por ejemplo, 0.5 segundos de enfriamiento




export function beforePlayerInteraction(event) {
    const player = event.player;
    const block = event.block;
    const blockName = block.typeId;
    
    if (blockName === 'minecraft:command_block') {
        // Send a random message to the player
        if (Math.random() < 0.5) {
            displayActionBar(player, `§4§o¡Solo el admin puede desatar el poder del §1bloque de comandos§4!`);
        } else {
            displayActionBar(player, `§c§oNo puedes interactuar con bloques de comandos.`);
        }
    } else if (blockName === 'minecraft:chest') {
        // Si la ultima interaccion acaba de suceder, evitar interaccion
        if (!checkCooldown(event)) return;

        const owner = getChestOwner(block)
        let mainhand = getPlayerHeldItem(player);

        

        if (mainhand === "security:lockpick") {
            if (!player.isSneaking) {
                event.cancel = true; // Cancel the chest interaction to use item event
                displayActionBar(player, "§7§oDebes agacharte para usar la ganzúa");
            }
            return;
        };
        if (mainhand === "security:key") {
            if (player.isSneaking) {
                system.run(()=>{
                    player.playSound("lockpick.succeed", {location: block.location});
                });
                if (owner == undefined) {
                    setChestOwner(block, player.name);
                    displayActionBar(player, `§aHas protegido este cofre. Ahora es tuyo.`);
                } else if (owner !== player.name) {
                    displayActionBar(player, `§cEste cofre pertenece a ${owner}.`);
                } else if (owner === player.name) {
                    setChestOwner(block, undefined);
                    displayActionBar(player, `§gHas desprotegido este cofre, ahora es publico.`);
                }
            } else {
                event.cancel = true; // Cancel the chest interaction to use item event
                displayActionBar(player, "§7§oDebes agacharte para usar la llave");
            }
            return;
        }

        if (owner == undefined) {
            displayActionBar(player, `§gEste cofre no se encuentra protegido`);
            return; // No owner, no protection
        } else if (owner !== player.name) {
            if (owner === 'unknown'){
                displayActionBar(player, `§7Este es un cofre olvidado, puedes abrirlo con una §9ganzúa§7.`);
            } else displayActionBar(player, `§cEste cofre pertenece a ${owner}. No puedes abrirlo.`);
            event.cancel = true; // Cancel the interaction
            return;
        } else {
            displayActionBar(player, `§aTu cofre se encuentra protegido`);
            return;
        }
    }
}

function checkCooldown(event){
    const playerName = event.player.id;
    // Implementación del Cooldown
    const currentPlayerTick = system.currentTick;
    const lastTick = lastInteractionTick.get(playerName) || 0;

    if (currentPlayerTick - lastTick < COOLDOWN_TICKS) {
        event.cancel = true; // Cancela la interacción si está en cooldown
        return false;
    }

    // Actualiza el último tick de interacción para este jugador
    lastInteractionTick.set(playerName, currentPlayerTick);
    return true;
}