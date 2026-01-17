import { world, system } from "@minecraft/server";
import { getMissionStatus } from "./npc/scriptEvents";


// Evento: cuando un jugador entra al mundo
world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;

    if (event.initialSpawn) {
        player.runCommand(`title @s title §9El robo de los elfos`);
        player.runCommand(`title @a subtitle §7Evento especial de navidad`);

        system.runTimeout(()=>{
            player.sendMessage("§a¡Bienvenido al servidor!");
            player.sendMessage("§6[Evento especial!! (Navideño)] Completa los objetivos para ganar las recompensas!!\n§7§oPSsst... pregunta a los personajes para más información.\n");
            player.sendMessage(getMissionStatus());
        }, 20 * 6)
    }
});