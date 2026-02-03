import { MolangVariableMap, system, world} from "@minecraft/server";
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

    onBreak(event){
        const {block, dimension} = event
        const entities = dimension.getEntitiesAtBlockLocation(block.location);
        entities.forEach(entity => {
            if (entity.typeId === "stuff:cannon_data") entity.remove();
        });
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

        // Cambiar posicion del cañon
        if (player.isSneaking) {
            const currentAngle = block.permutation.getState("custom:angle")
            block.setPermutation(block.permutation.withState("custom:angle", (currentAngle == 3 ? 0 : currentAngle + 1)))
            return;
        }

        const equipment = player.getComponent("minecraft:equippable");
        const item = equipment.getEquipment("Mainhand");
        if (!item && !brain.getDynamicProperty("is_primed")) return;

        // PASO 1: Poner Pólvora
        if (item?.typeId === "minecraft:gunpowder" && !brain.getDynamicProperty("has_powder")) {
            consumeItem(player);
            brain.setDynamicProperty("has_powder", true);
            player.dimension.playSound("random.ignite", block.location);
            displayActionBar(player, "§7Pólvora cargada...");
            return;
        }

        // PASO 2: Poner Color (Solo si ya tiene pólvora)
        if (item?.typeId?.includes("dye") && brain.getDynamicProperty("has_powder") && !brain.getDynamicProperty("is_primed")) {
            const color = getRgbFromDye(item.typeId);
            consumeItem(player);
            
            brain.setDynamicProperty("stored_color", JSON.stringify(color));
            brain.setDynamicProperty("is_primed", true);
            
            // Actualizamos el estado visual del bloque
            block.setPermutation(block.permutation.withState("custom:loaded", true));
            
            player.dimension.playSound("crossbow.loading.middle", block.location);
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

export function spawnConfettiParticles(origin, targetBlock, dimension, force = 2, sound = "confetti.launcher", color) {
    dimension.playSound(sound, origin)
    for (let i = 0; i < (10 * force); i++) {
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
    const cardinal = block.permutation.getState("minecraft:cardinal_direction");
    const angleIdx = block.permutation.getState("custom:angle") ?? 0;
    
    const direction = getDirectionFromStates(cardinal, angleIdx);
    const targetLoc = { x: origin.x + direction.x * 3, y: origin.y + direction.y * 3, z: origin.z + direction.z * 3 };
    const color = JSON.parse(brain.getDynamicProperty("stored_color"));

    // Ejecutar disparo
    spawnConfettiParticles(origin, targetLoc, block.dimension, 4, "confetti.cannon", color);

    // RESETEAR TODO
    brain.setDynamicProperty("has_powder", false);
    brain.setDynamicProperty("is_primed", false);
    block.setPermutation(block.permutation.withState("custom:loaded", false));
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

    // Mapeo de ángulos a radianes (Math.sin/cos usan radianes)
    // Formula: grados * (PI / 180)
    const anglesInDegrees = [0, 15, 30, 45];
    const angleRad = anglesInDegrees[angleIdx] * (Math.PI / 180);

    // Calcular componentes usando trigonometría
    const verticalY = Math.sin(angleRad);
    const horizontalScale = Math.cos(angleRad);

    return {
        x: baseDir.x * horizontalScale,
        y: verticalY,
        z: baseDir.z * horizontalScale
    };
}

/**
 * Utilidad simple para convertir nombres de tintes a RGB
 */
function getRgbFromDye(typeId) {
    const dyeMap = {
        "minecraft:white_dye":      { red: 1.00, green: 1.00, blue: 1.00 },
        "minecraft:light_gray_dye": { red: 0.62, green: 0.62, blue: 0.62 },
        "minecraft:gray_dye":       { red: 0.29, green: 0.29, blue: 0.29 },
        "minecraft:black_dye":      { red: 0.11, green: 0.11, blue: 0.11 },
        "minecraft:brown_dye":      { red: 0.48, green: 0.33, blue: 0.23 },
        "minecraft:red_dye":        { red: 0.69, green: 0.15, blue: 0.15 },
        "minecraft:orange_dye":     { red: 0.98, green: 0.50, blue: 0.07 },
        "minecraft:yellow_dye":     { red: 0.97, green: 0.85, blue: 0.19 },
        "minecraft:lime_dye":       { red: 0.50, green: 0.78, blue: 0.12 },
        "minecraft:green_dye":      { red: 0.37, green: 0.49, blue: 0.08 },
        "minecraft:cyan_dye":       { red: 0.09, green: 0.61, blue: 0.61 },
        "minecraft:light_blue_dye": { red: 0.23, green: 0.70, blue: 0.85 },
        "minecraft:blue_dye":       { red: 0.24, green: 0.27, blue: 0.61 },
        "minecraft:purple_dye":     { red: 0.54, green: 0.19, blue: 0.69 },
        "minecraft:magenta_dye":    { red: 0.74, green: 0.31, blue: 0.74 },
        "minecraft:pink_dye":       { red: 0.95, green: 0.62, blue: 0.73 }
    };

    // Si el tinte existe en la lista, lo devuelve; si no (o si es un item random), 
    // devuelve un color aleatorio para no romper el disparo.
    return dyeMap[typeId] ?? { 
        red: Math.random(), 
        green: Math.random(), 
        blue: Math.random() 
    };
}