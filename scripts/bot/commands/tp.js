import { system, world } from "@minecraft/server";

export const playerTpReqs = [];

export function tpaccept(player) {
    const req = playerTpReqs.find(r => r.target === player.name);

    if (!req) {
        player.sendMessage("§cNo tienes solicitudes pendientes.");
        return;
    }

    const sender = [...world.getPlayers()].find(p => p.name === req.sender);
    if (!sender) {
        player.sendMessage("§cEl solicitante ya no está en línea.");
        removeTpReq(req.sender, req.target);
        return;
    }

    system.run(() => {
        sender.teleport(player.location, { dimension: player.dimension });
    });

    sender.sendMessage(`§aTeletransportando a ${player.name}.`);
    player.sendMessage(`§aSolicitud de §g${req.sender}§a aceptada.`);
    removeTpReq(req.sender, req.target);
    return;
}

export function tpa(player, args){
    if (args.length < 2) {
        player.sendMessage("§cUso: !tpa <jugador>");
        return;
    }
    const targetName = args[1].toLowerCase();
    if (player.name.toLowerCase() === targetName) {
        player.sendMessage("§cNo puedes teletransportarte a ti mismo.");
        return;
    }

    // Verifica si el jugador objetivo está en línea
    const targetPlayer = [...world.getPlayers()].find(p => p.name.toLowerCase().startsWith(targetName));

    // Si no se encuentra el jugador, envía un mensaje de error
    if (!targetPlayer) {
        player.sendMessage(`§cJugador no encontrado que comience con '${targetName}'.`);
        return;
    }

    if (playerTpReqs.some(r => r.sender === player.name && r.target === targetPlayer.name)) {
        player.sendMessage(`§cYa tienes una solicitud pendiente para ${targetPlayer.name}.`);
        return;
    }

    addTpReq(player.name, targetPlayer.name);
    targetPlayer.sendMessage(`§d§oSolicitud de teletransporte de ${player.name}. Escribe !si para aceptar.`);
    player.sendMessage(`§a§oSolicitud enviada a ${targetPlayer.name}.`);
    return;
}

export function reqs(player) {
    const reqs = playerTpReqs.filter(r => r.target === player.name);
    if (reqs.length === 0) {
      player.sendMessage("§cNo tienes solicitudes de teletransporte pendientes.");
      return;
    }
    const list = reqs.map(r => `De: ${r.sender}, §9id: ${r.id}`).join("\n");
    player.sendMessage(`§bSolicitudes pendientes:\n${list}`);
    return;
}

export function addTpReq(senderName, targetPlayerName) {
    const _id = Math.random();
    playerTpReqs.push({ sender: senderName, target: targetPlayerName, id: _id});
    system.runTimeout(() => {
        const index = playerTpReqs.findIndex(req => req.sender === senderName && req.target === targetPlayerName && req.id === _id);
        if (index !== -1) {
            playerTpReqs.splice(index, 1);
            const sender = [...world.getPlayers()].find(p => p.name === senderName);
            if (sender) sender.sendMessage(`§c§oLa solicitud de teletransporte a ${targetPlayerName} ha caducado.`);
            const targetPlayer = [...world.getPlayers()].find(p => p.name.toLowerCase().startsWith(targetName));
            if (targetPlayer) targetPlayer.sendMessage(`§e§oLa solicitud de teletransporte de ${targetPlayerName} ha caducado.`);
        }
    }, 40 * 20); // 40 segundos
}

export function removeTpReq(senderName, targetPlayerName) {
    const index = playerTpReqs.findIndex(req => req.sender === senderName && req.target === targetPlayerName);
    if (index !== -1) playerTpReqs.splice(index, 1);
}