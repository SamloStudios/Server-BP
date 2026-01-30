import { MolangVariableMap } from "@minecraft/server";
import { getVectorDirection } from "../../utils/mathUtils";
import { displayActionBar } from "../../utils/displayUtils";


export const ConfettiCannon = {
    onUse: (event, p) => {
        spawnConfettiParticles(event.source, 2)
    }
}


function spawnConfettiParticles(player, force = 2) {
    displayActionBar(player, "§9C§bo§an§cf§ae§gt§ft§ci§f!!");
    for (let i = 0; i < 100; i++) {
        const molang = new MolangVariableMap();
        const headLoc = player.getHeadLocation()

        const targetLoc = { x: headLoc.x + player.getViewDirection().x * 5, y: headLoc.y + player.getViewDirection().y * 5 + 1, z: headLoc.z + player.getViewDirection().z * 5 };

        const jitterTarget = {
            x: targetLoc.x + (Math.random() - 0.5) * 2,
            y: targetLoc.y + (Math.random() - 0.5) * 2,
            z: targetLoc.z + (Math.random() - 0.5) * 2
        };
        
        // 1. CALCULAR EL VECTOR DE DIRECCIÓN (Destino - Origen)
        // Si no hacemos esto, la partícula volará hacia el punto 0,0,0 del mundo + el vector
        const directionVector = getVectorDirection(player.location, jitterTarget)


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
        player.dimension.spawnParticle("particle:confetti", headLoc, molang);
    }
}