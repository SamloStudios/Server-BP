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
        shootFire(event.source);
    }
};

export function shootFire(player) {
    const dimension = player.dimension;
    const headLoc = player.getHeadLocation();
    let dir = player.getViewDirection();
    const maxDistance = 40; // 50 es demasiado, 20 es un rango muy bueno para un lanzallamas

    // 1. Lógica de DAÑO (Rayo inmediato)
    // Buscamos entidades en el camino del fuego
    const targets = dimension.getEntitiesFromRay(headLoc, dir, {
        maxDistance: maxDistance,
        includePassableBlocks: true
    });

    for (const raycastHit of targets) {
        const entity = raycastHit.entity;
        if (entity.id !== player.id) {
            // Aplicar daño de fuego y quemar
            entity.applyDamage(8, { cause: "fire" }); 
            entity.setOnFire(5, true); // Quema por 5 segundos
        }
    }

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

                    causesFire: true,

                    source: player

                });

                // Solo ponemos fuego real en el bloque si es aire y hay suelo debajo
                const block = dimension.getBlock(loc);
                if (block && block.isAir) {
                    // Opcional: poner fuego en el suelo de forma controlada
                    // player.runCommand(`setblock ${Math.floor(loc.x)} ${Math.floor(loc.y)} ${Math.floor(loc.z)} fire 0 keep`);
                }

                // Sonido de llamarada
                if (i % 5 === 0) {
                    dimension.playSound("fire.fire", loc, { volume: 0.5 });
                }

            } catch (e) { /* Evitar errores si el área no está cargada */ }
        }, i); // El delay de 'i' hace que el chorro avance
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