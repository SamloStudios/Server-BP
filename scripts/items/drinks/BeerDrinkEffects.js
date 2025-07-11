import { system } from '@minecraft/server'
import { displayActionBar } from 'utils/displayUtils.js'

export const BeerDrinkEffects = {
    onCompleteUse(event) {
        const player = event.source;
        if (Math.random() < 0.1) {
            player.addEffect("minecraft:blindness", 30, { amplifier: 2, showParticles: false });
            player.addEffect("minecraft:nausea", 300, { amplifier: 1, showParticles: true })
        } else player.addEffect("minecraft:nausea", 160, { amplifier: 0, showParticles: false }); // "minecraft:nausea"
        displayActionBar(player, "§cBeber alcohol es malo para tu salud")
    }
}