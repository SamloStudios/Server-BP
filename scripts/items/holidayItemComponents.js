import { system, CustomComponentParameters } from '@minecraft/server'
import { FireStick, KaboomStick, LauncherStick } from './holidays/kaboomStick';
import { ConfettiCannon, ConfettiLauncher } from './holidays/confettiStuff';


system.beforeEvents.startup.subscribe(({itemComponentRegistry, blockComponentRegistry}) => {
    
    // Kaboom
    itemComponentRegistry.registerCustomComponent(
        "holidays:kaboom",
        KaboomStick
    );
    itemComponentRegistry.registerCustomComponent(
        "holidays:kaboom_fire",
        FireStick
    );
    itemComponentRegistry.registerCustomComponent(
        "holidays:kaboom_launcher",
        LauncherStick
    );

    // Confetti
    blockComponentRegistry.registerCustomComponent( // block confetti component
        "holidays:confetti_cannon",
        ConfettiCannon
    );
    itemComponentRegistry.registerCustomComponent( 
        "holidays:confetti_launcher",
        ConfettiLauncher
    );
});
