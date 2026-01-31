import { MolangVariableMap, world, DimensionLocation } from "@minecraft/server";
import { getVectorDirection } from "../../utils/mathUtils";
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
    for (let i = 0; i < 100; i++) {
        const molang = new MolangVariableMap();

        const jitterTarget = {
            x: targetBlock.x + (Math.random() - 0.5) * 2,
            y: targetBlock.y + (Math.random() - 0.5) * 2,
            z: targetBlock.z + (Math.random() - 0.5) * 2
        };
        
        // 1. CALCULAR EL VECTOR DE DIRECCIÓN (Destino - Origen)
        // Si no hacemos esto, la partícula volará hacia el punto 0,0,0 del mundo + el vector
        const directionVector = getVectorDirection(origin, jitterTarget)


        // 2. Definir Color Aleatorio
        molang.setColorRGB("variable.color", { 
            red: Math.random(), 
            green: Math.random(), 
            blue: Math.random(), 
            alpha: 1.0 
        });

        // 3. Pasar el Vector Normalizado
        molang.setVector3("variable.direction", directionVector);

        // 4. Velocidad personalizada (puedes variarla si quieres que unas salgan más rápido)
        molang.setFloat("variable.speed", Math.random() * force + 0.5);

        // Spawn
        dimension.spawnParticle("particle:confetti", origin, molang);
    }
}