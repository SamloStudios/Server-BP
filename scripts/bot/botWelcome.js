import { world } from "@minecraft/server";
import { formatPlayerName } from './botCommands.js';

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn) return;
    const message = player.hasTag("admin") 
        ? `§9§lEl Gran Señor ${player.name} ha regresado al reino.`
        : `§3El viajero ${player.name} ha llegado al reino.`;
    world.sendMessage(message);
});

world.afterEvents.playerLeave.subscribe(({ playerName }) => {
    world.sendMessage(`§7§oEl viajero ${playerName} ha abandonado el reino.`);
});