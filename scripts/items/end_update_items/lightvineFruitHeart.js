import { system } from '@minecraft/server'
import { displayActionBar } from 'utils/displayUtils.js'

export const lightvineFruitHeartEffects = {
    onCompleteUse(event) {
        const player = event.source;
        displayActionBar(player, "§7Esto es delicioso!");
        player.addEffect("speed", 200, { amplifier: 1, showParticles: false });

        const randomEffect = Math.floor(Math.random() * 4);

        switch (randomEffect) {
            case 0:
                player.addEffect("strength", 200, { amplifier: 1, showParticles: true });
                break;
            case 1:
                player.addEffect("night_vision", 200, { amplifier: 0, showParticles: true });
                break;
            case 2:
                player.addEffect("haste", 200, { amplifier: 1, showParticles: true });
                break;
            case 3:
                player.addEffect("jump_boost", 200, { amplifier: 1, showParticles: true });
                break;
            default:
                player.addEffect("invisibility", 200, { amplifier: 0, showParticles: true });
                break;
        }
        
        system.runTimeout(()=> {
            displayActionBar(player, "§cTu estomago se resiente, Ouch!");
            player.runCommand("damage @s 4");
            player.addEffect("minecraft:slowness", 100, { amplifier: 2, showParticles: false });
            player.addEffect("minecraft:nausea", 120, {amplifier: 3, showParticles: false });
            player.addEffect("minecraft:hunger", 90, {amplifier: 3, showParticles: false });
            if (Math.random() < 0.5) {
                player.spawnParticle("particle:magic_simbols", player.getHeadLocation()); //soltar particulas
            }
        }, 200);
    }

}