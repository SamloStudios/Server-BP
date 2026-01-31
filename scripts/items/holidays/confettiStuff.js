import { MolangVariableMap, world, DimensionLocation } from "@minecraft/server";
import { displayActionBar } from "../../utils/displayUtils";


export const ConfettiCannon = {
    onTick: (event, p) => {
        // TODO
        spawnConfettiParticles(event.block.position, 2, "confetti.cannon")
        new DimensionLocation()
    },
    onPlayerInteract: (event, p) => {
        
    }
}

export const ConfettiLauncher = {
    onUse: (event) => {
        const player = event.source;
        displayActionBar(player, "§9C§bo§an§cf§ae§gt§ft§ci§f!!");
        
        const headLoc = player.getHeadLocation() // head location
        const targetLoc = {
            x: headLoc.x + player.getViewDirection().x * 5,
            y: headLoc.y + player.getViewDirection().y * 5 + 1,
            z: headLoc.z + player.getViewDirection().z * 5
        }; // location in front of the player's view
        
        spawnConfettiParticles(headLoc, targetLoc, player.dimension, 1, "confetti.launcher")
    }
}

function spawnConfettiParticles(origin, targetBlock, dimension, force = 2, sound = "confetti.launcher") {
    dimension.playSound(sound, origin)
    for (let i = 0; i < 10; i++) {
        const molang = new MolangVariableMap();

        const direction = calculateDirectionWithSpread(origin, targetBlock, 0.4)

        // 2. Definir Color Aleatorio
        molang.setColorRGB("variable.color", { 
            red: Math.random(), 
            green: Math.random(), 
            blue: Math.random(), 
            alpha: 1.0 
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