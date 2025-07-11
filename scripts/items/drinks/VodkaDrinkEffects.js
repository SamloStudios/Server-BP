import { system } from '@minecraft/server'
import { displayActionBar } from 'utils/displayUtils.js'

export const VodkaDrinkEffects = {
    onCompleteUse(event) {
        const player = event.source;
        player.addEffect("minecraft:nausea", 240, { amplifier: 1, showParticles: false }) // "minecraft:nausea"
        player.addEffect("minecraft:blindness", 30, { amplifier: 2, showParticles: false });
        if (Math.random() < 0.15) {
            player.addEffect("minecraft:instant_damage", 5, { amplifier: 1, showParticles: false });
            player.addEffect("minecraft:poison", 60, { amplifier: 1, showParticles: false });
        }
        displayActionBar(player, "§cBeber alcohol es malo para tu salud")
    }
}