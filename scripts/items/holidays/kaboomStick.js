import { system, world } from "@minecraft/server";
import { displayActionBar } from "../../utils/displayUtils";

// Mapa para guardar los tiempos de cooldown (por ID de jugador)
const cooldowns = new Map();
const COOLDOWN_TIME = 1000; // 3 segundos en milisegundos

export const KaboomStick = {
    onUse: (event) => {
        const player = event.source;
        
        // Verificar si el jugador tiene un cooldown activo
        if (!checkCooldown(player)) return;

        // Ejecutar la acción
        displayActionBar(player, "§c¡Kaboom!");
        explodeWhereLooking(player);
    }
};

export const LauncherStick = {
    onUse: (event) => {
        const player = event.source;
        
        // Verificar si el jugador tiene un cooldown 
        if (!checkCooldown(player)) return;

        // Ejecutar la acción
        displayActionBar(player, "§a¡Yeeet!");
        explodeWhereLooking(player, { breaksBlocks: false, causesFire: false, source: player});
        applyKnockback(player, 5)
    }
};

export const FireStick = {
    onUse: (event) => {
        const player = event.source;
        if (!checkCooldown(player)) return;

        displayActionBar(player, "§6¡FUEGO!");
        shootTunnel(event.source);
    }
};

export function shootFire(player) {
    const dimension = player.dimension;
    const headLoc = player.getHeadLocation();
    let dir = player.getViewDirection();
    const maxDistance = 20; // 50 es demasiado, 20 es un rango muy bueno para un lanzallamas

    // 1. Lógica de DAÑO (Rayo inmediato)
    // Buscamos entidades en el camino del fuego
    const targets = dimension.getEntitiesFromRay(headLoc, dir, {
        maxDistance: maxDistance,
        includePassableBlocks: true
    });

    // for (const raycastHit of targets) {
    //     const entity = raycastHit.entity;
    //     if (entity.id !== player.id) {
    //         // Aplicar daño de fuego y quemar
    //         entity.applyDamage(8, { cause: "fire" }); 
    //         entity.setOnFire(5, true); // Quema por 5 segundos
    //     }
    // }

    // 2. Lógica VISUAL (Chorro de partículas y fuego en suelo)
    for (let i = 1; i <= maxDistance; i++) {
        // dir = world.getPlayers({ name: player.nameTag }).getViewDirection();

        system.runTimeout(() => {
            const loc = {
                x: headLoc.x + dir.x * i,
                y: headLoc.y + dir.y * i,
                z: headLoc.z + dir.z * i
            };

            try {
                // Partículas densas de fuego
                dimension.spawnParticle("minecraft:basic_flame_particle", loc);
                dimension.spawnParticle("minecraft:mobflame_single_particle", loc);
                dimension.createExplosion(loc, 2, {

                    breaksBlocks: true,

                    causesFire: false,

                    source: player

                });

                // Solo ponemos fuego real en el bloque si es aire y hay suelo debajo
                const block = dimension.getBlock(loc);
                // Limpiar un espacio de 3x3 en la direccion de la cabeza, cambiar por aire
                


                // Sonido de llamarada
                if (i % 5 === 0) {
                    dimension.playSound("fire.fire", loc, { volume: 0.5 });
                }

            } catch (e) { /* Evitar errores si el área no está cargada */ }
        }, i); // El delay de 'i' hace que el chorro avance
    }
}

export function shootTunnel(player) {
    const dimension = player.dimension;
    const headLoc = player.getHeadLocation();
    const dir = player.getViewDirection(); // Simplificado
    const maxDistance = 10;

    // Lógica de "proyectil" que avanza
    for (let i = 1; i <= maxDistance; i++) {
        system.runTimeout(() => {
            const centerLoc = {
                x: Math.floor(headLoc.x + dir.x * i),
                y: Math.floor(headLoc.y + dir.y * i),
                z: Math.floor(headLoc.z + dir.z * i)
            };

            try {
                // --- LÓGICA DE EXCAVACIÓN 3x3 ---
                // Iteramos en un área de 3x3x3 alrededor del punto actual
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    for (let offsetY = -1; offsetY <= 1; offsetY++) {
                        for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                            
                            const targetLoc = {
                                x: centerLoc.x + offsetX,
                                y: centerLoc.y + offsetY,
                                z: centerLoc.z + offsetZ
                            };

                            const block = dimension.getBlock(targetLoc);
                            
                            // Solo reemplazamos si no es aire y no es irrompible (bedrock)
                            if (block && !block.isAir && block.typeId !== "minecraft:bedrock") {
                                dimension.runCommand(`setblock ${targetLoc.x} ${targetLoc.y} ${targetLoc.z} air`);
                                
                                // Opcional: Partícula de "escombro" o polvo
                                if (Math.random() > 0.8) {
                                    dimension.spawnParticle("minecraft:large_explosion", targetLoc);
                                }
                            }
                        }
                    }
                }

                // --- EFECTOS VISUALES DEL RAYO ---
                dimension.spawnParticle("minecraft:basic_flame_particle", centerLoc);
                dimension.spawnParticle("minecraft:sonic_explosion", centerLoc);

                // Sonido de excavación cada ciertos bloques
                if (i % 3 === 0) {
                    dimension.playSound("random.break", centerLoc, { volume: 0.4, pitch: 0.8 });
                }

            } catch (e) { /* Evitar errores en bordes de chunk */ }
        }, i); // El delay genera el efecto de "perforación" progresiva
    }
}

export function explodeWhereLooking(player, configuration = { breaksBlocks: true, causesFire: false, source: player}) {
    const dimension = player.dimension;
    const location = player.getHeadLocation(); // Mejor usar la cabeza para precisión

    const dir = player.getViewDirection();
    const distance = 7;
    const targetLocation = {
        x: location.x + dir.x * distance,
        y: location.y + dir.y * distance,
        z: location.z + dir.z * distance
    };

    dimension.createExplosion(targetLocation, 6, configuration);

    // Partículas (Usando el método de dimensión en lugar de runCommand para mejor rendimiento)
    dimension.spawnParticle("minecraft:huge_explosion_emitter", targetLocation);

    // Retroceso (knockback)
    player.applyKnockback({x: -dir.x, z: -dir.z}, -dir.y);
}

export function applyKnockback(player, knockback = 1) {
    const dir = player.getViewDirection();
    player.applyKnockback({x: -dir.x*knockback*2, z: -dir.z*knockback*2}, -dir.y*knockback/2);
}

// Función interna para manejar el cooldown y evitar repetir código
export function checkCooldown(player) {
    const now = Date.now();
    if (cooldowns.has(player.id)) {
        const expirationTime = cooldowns.get(player.id);
        if (now < expirationTime) {
            const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
            displayActionBar(player, `§cEspera ${timeLeft}s...`);
            return false;
        }
    }
    cooldowns.set(player.id, now + COOLDOWN_TIME);
    return true;
}