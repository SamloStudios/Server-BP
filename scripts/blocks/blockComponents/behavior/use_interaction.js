import { set_state, disabler } from "utils/blockComponentUtils"


export const UseInteraction = {
    onPlayerInteract(event, p) {
        const block = event.block // Block impacted by this event.
        event.dimension // Dimension that contains the block.
        event.face // The block face that was interacted with.
        event.faceLocation // Location relative to the bottom north-west corner of the block that the player interacted with.
        event.player // The player that interacted with the block. May be undefined.
        
        const probability = p.params.probability ?? 1; 
        if (probability < Math.random()) return;

        const particle_disabler = p.params.disabler;
        if (disabler(particle_disabler, block)) return;

        if (p.params.set_state) {
            const s = p.params.set_state;
            if (!s.probability || s.probability > Math.random()){
                set_state(block, s);
            }
        }
        
        if (p.params.particles) {
            const s = p.params.particles;
            if (!s.probability || s.probability > Math.random()){
                event.dimension.spawnParticle(s.id, block.center());
            }
        }

        if (p.params.sound) {
            const s = p.params.sound;
            block.dimension.playSound(s.id, block.center())
        }
    }   
}