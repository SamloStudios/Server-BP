import { BlockPermutation, system } from "@minecraft/server";

export const LightvineFruitLantern = {
    onTick(event) {
        const {block, dimension} = event;
        if (block.permutation.getState("custom:powered") === "off") return; //si la lampara esta apagada ignorar
        if (Math.random() < 0.02) {
            dimension.spawnParticle("particle:magic_simbols", block.center()); //soltar particulas
        }
    },

    onPlayerInteract(event) {
        const block = event.block;

        // Tomar el nombre de bloque de los parametros del componente
        const blockName = block.typeId;
        
        // Tomar la rotacion original del bloque
        const blockOgRotation = block.permutation.getState("minecraft:block_face");

        // Crear nueva permutacion de <blockName> con la rotación original 
        let newPermutation = BlockPermutation.resolve(blockName, {"minecraft:block_face": blockOgRotation})

        const blockPowered = block.permutation.getState("custom:powered") === "on" ? true : false;
        if (blockPowered) {
            event.block.setPermutation(newPermutation.withState("custom:powered", "off"));
            playBlockDefaultSound(block, blockPowered);
        } else {
            event.block.setPermutation(newPermutation.withState("custom:powered", "on"))
            playBlockDefaultSound(block, blockPowered);
        } 
    }
}

export function playBlockDefaultSound(block, power) {
    const name = block.typeId;
    system.run(()=> {
        if (!power) {
            if (name == "endupdate:lightfruit_snark_lantern") {
                block.dimension.playSound("snarklantern.powered", block.location);
            }
        } else {
            if (name == "endupdate:lightfruit_snark_lantern") {
                block.dimension.playSound("snarklantern.shutdown", block.location);
            }
        }
    });
}