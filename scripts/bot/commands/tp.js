import { system, world } from "@minecraft/server";

export const playerTpReqs = [];

export function tpaccept(player) {
    const req = playerTpReqs.find(r => r.target === player.name);
    if (!req) {
        player.sendMessage("§cNo tienes solicitudes pendientes.");
        return;
    }
    const sender = world.getAllPlayers().find(p => p.name === req.sender);
    if (!sender) {
        player.sendMessage("§cEl solicitante ya no está en línea.");
        removeTpReq(req.sender, req.target);
        return;
    }
    system.run(() => {
        sender.teleport(player.location, { dimension: player.dimension });
        sender.sendMessage(`§aTeletransportando a ${player.name}.`);
        player.sendMessage(`§aSolicitud de §g${req.sender}§a aceptada.`);
        removeTpReq(req.sender, req.target);
    });
}

export function tpa(player, args) {
    if (args.length < 2) {
        player.sendMessage("§cUso: !tpa <jugador>");
        return;
    }
    const targetName = args[1].toLowerCase();
    if (player.name.toLowerCase() === targetName) {
        player.sendMessage("§cNo puedes teletransportarte a ti mismo.");
        return;
    }
    const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName);
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }
    if (playerTpReqs.some(r => r.sender === player.name && r.target === targetPlayer.name)) {
        player.sendMessage(`§cYa tienes una solicitud pendiente para ${targetPlayer.name}.`);
        return;
    }
    addTpReq(player.name, targetPlayer.name);
    targetPlayer.sendMessage(`§d§oSolicitud de teletransporte de ${player.name}. Escribe !si para aceptar.`);
    player.sendMessage(`§a§oSolicitud enviada a ${targetPlayer.name}.`);
}

export function reqs(player) {
    const reqs = playerTpReqs.filter(r => r.target === player.name);
    if (reqs.length === 0) {
        player.sendMessage("§cNo tienes solicitudes de teletransporte pendientes.");
        return;
    }
    const list = reqs.map(r => `De: ${r.sender}, §9id: ${r.id}`).join("\n");
    player.sendMessage(`§bSolicitudes pendientes:\n${list}`);
}

export function addTpReq(senderName, targetPlayerName) {
    const id = Math.random();
    playerTpReqs.push({ sender: senderName, target: targetPlayerName, id });
    system.runTimeout(() => {
        const index = playerTpReqs.findIndex(req => req.sender === senderName && req.target === targetPlayerName && req.id === id);
        if (index !== -1) {
            playerTpReqs.splice(index, 1);
            const sender = world.getAllPlayers().find(p => p.name === senderName);
            const target = world.getAllPlayers().find(p => p.name === targetPlayerName);
            if (sender) sender.sendMessage(`§c§oLa solicitud de teletransporte a ${targetPlayerName} ha caducado.`);
            if (target) target.sendMessage(`§e§oLa solicitud de teletransporte de ${senderName} ha caducado.`);
        }
    }, 40 * 20);
}

export function removeTpReq(senderName, targetPlayerName) {
    const index = playerTpReqs.findIndex(req => req.sender === senderName && req.target === targetPlayerName);
    if (index !== -1) playerTpReqs.splice(index, 1);
}