import { system } from "@minecraft/server";

export function displayActionBar(_player, _string) {
    system.run(() => {
        _player.onScreenDisplay.setActionBar(_string);
    });
}