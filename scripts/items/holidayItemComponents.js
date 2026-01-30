import { system } from '@minecraft/server'
import { FireStick, KaboomStick, LauncherStick } from './holidays/kaboomStick';
import { ConfettiCannon } from './holidays/confettiStuff';


system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
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

    itemComponentRegistry.registerCustomComponent(
        "holidays:confetti_cannon",
        ConfettiCannon
    );
});
