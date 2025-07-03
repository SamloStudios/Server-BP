import { system, world, Player, ItemComponentRegistry, EquipmentSlot, ItemTypes} from '@minecraft/server'
import { getChestOwner, setChestOwner } from 'utils/ownershipUtils.js'
import { displayActionBar } from 'utils/displayUtils.js'
import { ActionFormData } from '@minecraft/server-ui'; // Importar ActionForm para la GUI
import { DebugStick } from './Components/debugStick';

system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent(
        "custom:security_options",
        SecurityOptions
    );
    itemComponentRegistry.registerCustomComponent(
        "custom:security_disabler",
        SecurityDisabler
    );
    itemComponentRegistry.registerCustomComponent(
        "utils:stick",
        DebugStick
    );
});


// LLAVE DE ORO
const SecurityOptions = {
    /**
     * Se ejecuta cuando un jugador usa el item que tiene este componente.
     * Abre una GUI para gestionar la seguridad de cofres.
     * @param {Object} event - El objeto de evento de uso del item.
     * @param {Player} event.source - El jugador que usó el item.
     */
    async onUse(event) {
        let player = event.source;

        if (player.isSneaking) return;

        // Comprobamos si el jugador ya tiene la etiqueta 'secureChests'
        const hasSecureChestsTag = player.hasTag("secureChests");

        // Creamos un nuevo formulario de acción (ActionForm)
        const form = new ActionFormData();

        // Configuramos el título y el cuerpo del formulario
        form.title("Opciones de Seguridad para nuevos cofres");
        form.body(`Estado actual: ${hasSecureChestsTag ? "§aActivado" : "§cDesactivado"}\n\nSelecciona una opción:`);

        // Añadimos botones basados en el estado actual de la etiqueta
        if (hasSecureChestsTag) {
            form.button("§cDesactivar Seguridad", "textures/ui/disableChestSecurity.png"); // Textura de ejemplo para el botón
        } else {
            form.button("§aActivar Seguridad", "textures/ui/enableChestSecurity.png"); // Textura de ejemplo para el botón
        }
        form.button("Cerrar", "textures/ui/cancel"); // Botón para cerrar la GUI

        // try {
            // Mostramos el formulario al jugador y esperamos su respuesta
            const response = await form.show(player);

            // Verificamos si la respuesta es válida y no se cerró la GUI
            if (response.selection !== undefined) {
                if (hasSecureChestsTag) {
                    // Si el botón "Desactivar" fue seleccionado (asumiendo que es el primer botón si la etiqueta está activa)
                    if (response.selection === 0) {
                        player.removeTag("secureChests");
                        displayActionBar(player, "§eLa seguridad de cofres ha sido §cDESACTIVADA§e.");
                    } else if (response.selection === 1) {
                        // El botón "Cerrar" fue seleccionado
                        displayActionBar(player, "§7Saliendo de las opciones de seguridad.");
                    }
                } else {
                    // Si el botón "Activar" fue seleccionado (asumiendo que es el primer botón si la etiqueta NO está activa)
                    if (response.selection === 0) {
                        player.addTag("secureChests");
                        displayActionBar(player, "§eLa seguridad de cofres ha sido §aACTIVADA§e.");
                    } else if (response.selection === 1) {
                        // El botón "Cerrar" fue seleccionado
                        displayActionBar(player, "§7Saliendo de las opciones de seguridad.");
                    }
                }
            } else {
                // El jugador cerró la GUI sin seleccionar nada
                displayActionBar(player, "§7Has cerrado la GUI de seguridad.");
            }
        // } catch (error) {
        //     // Manejo de errores si la GUI no se pudo mostrar o hubo un problema
        //     console.error("Error al mostrar la GUI de seguridad:", error);
        //     player.sendMessage("§cError al abrir la GUI de seguridad.");
        // }
    }
};

// GANZUA
const SecurityDisabler = {
    onUseOn(event){
        const player = event.source;
        const block = event.block;
        const dim = player.dimension;
        const loc = block.center();
        
        if (block.typeId === "minecraft:chest") {
            const owner = getChestOwner(block);
            // is the block NOT locked? -> return
            if (owner == undefined) {
                displayActionBar(player, "§gEste cofre no esta cerrado");
                return;
            };
            // am I the owner -> return
            if (owner === player.name) {
                displayActionBar(player, "§gEste cofre es tuyo");
                return;
            };

            if (owner !== "unknown") {
                displayActionBar(player, "§8§oEste cofre no se puede desbloquear")
                return;
            };


            // nowadays im not teh owner, so try to unlock it with a 0.05% chance (1/20 prob)
            if (Math.random() < 0.05) {
                dim.spawnParticle("minecraft:crop_growth_emitter", loc);
                player.playSound("lockpick.succeed", {location: loc});
                player.playSound("random.levelup", {volume: 0.5});
                // if success, setChestOwner as undefined
                displayActionBar(player, "§bLograste desbloquear el cofre!");
                // system.runTimeout(() => {
                //     displayActionBar(player, "§cLas autoridades han sido informadas de tu fechoria");
                // }, 80);
                setChestOwner(block, undefined);
                return;
            }
            // if faliure, 0.15% chance to lose this item (1/5 prob)
            else if (Math.random() < 0.15) {
                player.playSound("lockpick.fail", {location: loc});
                displayActionBar(player, "§cTu ganzúa se rompió al intentar desbloquear el cofre.");
                //loss the item
                const equippable = player.getComponent("minecraft:equippable");
                const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
                mainhand.setItem(undefined);
                dim.spawnParticle("minecraft:critical_hit_emitter", loc);
            } else {
                player.playSound("lockpick.try", {location: loc});
                displayActionBar(player, "§gNo lograste desbloquear el cofre");
            }
            dim.spawnParticle("minecraft:dust_plume", loc);
        }
    }
};