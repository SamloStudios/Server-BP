import { system } from '@minecraft/server'
import { displayActionBar } from 'utils/displayUtils.js'

export const lightvineFruitEffects = {
    onCompleteUse(event) {
        const player = event.source;
        displayActionBar(player, "§7Esto no sabe tan bien, te sientes un poco mareado");
        player.addEffect("minecraft:blindness", 20, { amplifier: 0, showParticles: true });
        player.addEffect("minecraft:slowness", 100, { amplifier: 0, showParticles: false });
        player.addEffect("minecraft:nausea", 140, {amplifier: 2, showParticles: false });

        // Summon some particles
        // system.run(()=> {
        //     player.runCommand("summon ")
        // })
    }

}