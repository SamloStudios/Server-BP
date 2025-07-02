import { system, world, Player } from "@minecraft/server";


world.afterEvents.playerSpawn.subscribe(({player, initialSpawn}) => {
    if (!initialSpawn) return; // change this to send to jail the bad players

    let playerTags = player.getTags();

    if (playerTags.includes("admin")) {
        world.sendMessage(`§9§lBienvenido de vuelta: §u[ADMIN] ${player.name}`);
    } else world.sendMessage(`§3${player.name} ha entrado al server`);
});


world.afterEvents.playerLeave.subscribe((event) => {
    const playerName = event.playerName;
    world.sendMessage(`§7§o${playerName} ha salido del server`);
});