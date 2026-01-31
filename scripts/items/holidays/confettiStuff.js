import { MolangVariableMap, world} from "@minecraft/server";
import { displayActionBar } from "../../utils/displayUtils";

export const ConfettiLauncher = {
    onUse(event, p) {
        const player = event.source;
        displayActionBar(player, "§9C§bo§an§cf§ae§gt§ft§ci§f!!");
        
        const headLoc = player.getHeadLocation() // head location
        const targetLoc = {
            x: headLoc.x + player.getViewDirection().x * 5,
            y: headLoc.y + player.getViewDirection().y * 5 + 1,
            z: headLoc.z + player.getViewDirection().z * 5
        }; // location in front of the player's view

        const color = p.params?.color;

        spawnConfettiParticles(headLoc, targetLoc, player.dimension, 1, "confetti.launcher", color)
    }
}

export const ConfettiCannon = {
    // Al colocar el bloque, spawneamos su "cerebro" (entidad)
    onPlace(event) {
        const { block, dimension } = event;
        const spawnLoc = { x: block.location.x + 0.5, y: block.location.y, z: block.location.z + 0.5 };
        
        // Spawneamos tu entidad (ajusta el ID "stuff:cannon_data")
        const brain = dimension.spawnEntity("stuff:cannon_data", spawnLoc);
        brain.addTag(`cannon_${block.location.x}_${block.location.y}_${block.location.z}`);
    },

    onTick(event) {
        const { block, dimension } = event;
        const brain = getCannonBrain(block);
        if (!brain) return;

        // Efecto de humo si está cargado con pólvora
        if (brain.getDynamicProperty("has_powder")) {
            dimension.spawnParticle("minecraft:basic_smoke_particle", {
                x: block.location.x + 0.5,
                y: block.location.y + 0.8,
                z: block.location.z + 0.5
            });
        }

        if (block.getRedstonePower() > 0) {
            tryShoot(block, brain);
        }
    },

    onPlayerInteract(event) {
        const { block, player } = event;
        const brain = getCannonBrain(block);
        if (!brain) return;

        const equipment = player.getComponent("minecraft:equippable");
        const item = equipment.getEquipment("Mainhand");
        if (!item) return;

        // PASO 1: Poner Pólvora
        if (item.typeId === "minecraft:gunpowder" && !brain.getDynamicProperty("has_powder")) {
            consumeItem(player);
            brain.setDynamicProperty("has_powder", true);
            player.dimension.playSound("random.ignite", block.location);
            displayActionBar(player, "§7Pólvora cargada...");
            return;
        }

        // PASO 2: Poner Color (Solo si ya tiene pólvora)
        if (item.typeId.includes("dye") && brain.getDynamicProperty("has_powder")) {
            const color = getRgbFromDye(item.typeId);
            consumeItem(player);
            
            brain.setDynamicProperty("stored_color", color);
            brain.setDynamicProperty("is_primed", true);
            
            // Actualizamos el estado visual del bloque
            block.setPermutation(block.getPermutation().withState("custom:loaded", true));
            
            player.dimension.playSound("random.orb", block.location);
            displayActionBar(player, "§a¡Cañón Listo para Disparar!");
            return;
        }
        
        // Si interactúa sin items y está listo, dispara manual
        tryShoot(block, brain);
    }
};

// --------------------------------------------- // 
//                  FUNCTIONS                    //
// --------------------------------------------- // 

function spawnConfettiParticles(origin, targetBlock, dimension, force = 2, sound = "confetti.launcher", color) {
    dimension.playSound(sound, origin)
    for (let i = 0; i < 15; i++) {
        const molang = new MolangVariableMap();

        const direction = calculateDirectionWithSpread(origin, targetBlock, 0.4)

        const red_only = (Math.random() < 0.3); 

        // 2. Definir Color Aleatorio
        molang.setColorRGB("variable.color", color ?? { 
            red: red_only ? 1 : Math.random(), 
            green: red_only ? 0 : Math.random(), 
            blue: red_only ? 0 : Math.random()
        });

        // 3. Pasar el Vector Normalizado
        molang.setVector3("variable.direction", direction);

        // 4. Velocidad personalizada (puedes variarla si quieres que unas salgan más rápido)
        molang.setFloat("variable.speed", Math.random() * force + 0.5);

        // Spawn
        dimension.spawnParticle("particle:confetti", origin, molang);
    }
}

function calculateDirectionWithSpread(origin, target, spread) {
    // 1. Vector bruto
    let dx = target.x - origin.x;
    let dy = target.y - origin.y;
    let dz = target.z - origin.z;

    // 2. Normalizar primero para tener una base estándar
    const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (mag !== 0) {
        dx /= mag;
        dy /= mag;
        dz /= mag;
    }

    // 3. Aplicar Jitter al vector ya normalizado
    // Esto asegura que la dispersión sea angular y constante
    dx += (Math.random() - 0.5) * spread;
    dy += (Math.random() - 0.5) * spread;
    dz += (Math.random() - 0.5) * spread;

    // 4. Re-normalizar para que la velocidad no se vea afectada por el jitter
    const finalMag = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return {
        x: dx / finalMag,
        y: dy / finalMag,
        z: dz / finalMag
    };
}

/**
 * Intenta disparar y limpia los datos de la entidad
 */
function tryShoot(block, brain) {
    if (!brain.getDynamicProperty("is_primed")) return;

    const origin = { x: block.location.x + 0.5, y: block.location.y + 0.5, z: block.location.z + 0.5 };
    const cardinal = block.getPermutation().getState("minecraft:cardinal_direction");
    const angleIdx = block.getPermutation().getState("custom:angle") ?? 0;
    
    const direction = getDirectionFromStates(cardinal, angleIdx);
    const targetLoc = { x: origin.x + direction.x * 3, y: origin.y + direction.y * 3, z: origin.z + direction.z * 3 };
    const color = brain.getDynamicProperty("stored_color");

    // Ejecutar disparo
    spawnConfettiParticles(origin, targetLoc, block.dimension, 2, "confetti.launcher", color);

    // RESETEAR TODO
    brain.setDynamicProperty("has_powder", false);
    brain.setDynamicProperty("is_primed", false);
    block.setPermutation(block.getPermutation().withState("custom:loaded", false));
}

/**
 * Busca la entidad vinculada al bloque mediante tags de coordenadas
 */
function getCannonBrain(block) {
    const entities = block.dimension.getEntities({
        type: "stuff:cannon_data",
        tags: [`cannon_${block.location.x}_${block.location.y}_${block.location.z}`],
        closest: 1
    });
    return entities[0];
}

function consumeItem(player) {
    const equipment = player.getComponent("minecraft:equippable");
    const item = equipment.getEquipment("Mainhand");
    if (player.getGameMode() === "creative") return;
    
    if (item.amount > 1) {
        item.amount -= 1;
        equipment.setEquipment("Mainhand", item);
    } else {
        equipment.setEquipment("Mainhand", undefined);
    }
}

/**
 * Traduce los estados de Minecraft a un Vector3 de dirección
 */
function getDirectionFromStates(cardinal, angleIdx) {
    let baseDir = { x: 0, y: 0, z: 0 };
    
    // Mapeo cardinal
    if (cardinal === "north") baseDir.z = -1;
    else if (cardinal === "south") baseDir.z = 1;
    else if (cardinal === "east")  baseDir.x = 1;
    else if (cardinal === "west")  baseDir.x = -1;

    // Ajuste de inclinación (angle 0=horizontal, 1=un poco arriba, 2=45deg, 3=vertical)
    const verticalY = [0, 0.4, 0.7, 1];
    const horizontalScale = [1, 0.9, 0.7, 0];

    return {
        x: baseDir.x * horizontalScale[angleIdx],
        y: verticalY[angleIdx],
        z: baseDir.z * horizontalScale[angleIdx]
    };
}

/**
 * Utilidad simple para convertir nombres de tintes a RGB
 */
function getRgbFromDye(typeId) {
    const dyeMap = {
        "minecraft:red_dye": { red: 1, green: 0, blue: 0 },
        "minecraft:blue_dye": { red: 0, green: 0, blue: 1 },
        "minecraft:lime_dye": { red: 0.5, green: 1, blue: 0 },
        "minecraft:yellow_dye": { red: 1, green: 1, blue: 0 }
    };
    return dyeMap[typeId] ?? { red: Math.random(), green: Math.random(), blue: Math.random() };
}