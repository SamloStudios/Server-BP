import { world } from '@minecraft/server';
import { formatPlayerName } from './botCommands.js';

world.afterEvents.playerSpawn.subscribe(event => {
    if (!event.initialSpawn) return;
    const player = event.player;
    world.sendMessage(`§a¡Bienvenid@ ${formatPlayerName(player)} al Reino! Usa !help para ver los comandos.`);
});