import { world } from "@minecraft/server";
import { formatPlayerName } from './botCommands.js';

// Mensaje de bienvenida al spawnear
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn) return; // Ignora respawns
    const message = player.hasTag("admin") 
        ? `§9§lBienvenido de vuelta: §u[ADMIN] ${player.name}`
        : `§3${player.name} ha entrado al server`;
    world.sendMessage(message);
});

// Mensaje al salir del servidor
world.afterEvents.playerLeave.subscribe(({ playerName }) => {
    world.sendMessage(`§7§o${playerName} ha salido del server`);
});