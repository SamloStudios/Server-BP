import { system, world } from '@minecraft/server';

const teleportRequests = new Map();

export function tpa(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !tpa <jugador>');
        return;
    }
    const targetName = args[1];
    const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }
    if (targetPlayer.name === player.name) {
        player.sendMessage('§cNo puedes teletransportarte a ti mismo.');
        return;
    }
    const requestId = Math.random().toString(36).substring(2);
    teleportRequests.set(requestId, { from: player, to: targetPlayer, time: Date.now() });
    player.sendMessage(`§aSolicitud de teletransporte enviada a ${targetPlayer.name}.`);
    targetPlayer.sendMessage(`§a${player.name} quiere teletransportarse a ti. Usa !si para aceptar o espera 30 segundos para que expire.`);
    system.runTimeout(() => {
        if (teleportRequests.has(requestId)) {
            teleportRequests.delete(requestId);
            player.sendMessage(`§cLa solicitud de teletransporte a ${targetPlayer.name} ha expirado.`);
            targetPlayer.sendMessage(`§cLa solicitud de teletransporte de ${player.name} ha expirado.`);
        }
    }, 30 * 20); // 30 segundos
}

export function tpaccept(player, args) {
    const requests = [...teleportRequests.entries()].filter(([_, req]) => req.to.name === player.name);
    if (requests.length === 0) {
        player.sendMessage('§cNo tienes solicitudes de teletransporte pendientes.');
        return;
    }
    const [requestId, request] = requests[0];
    system.run(() => {
        request.from.teleport(player.location, { dimension: player.dimension });
        request.from.sendMessage(`§aTeletransportado a ${player.name}.`);
        player.sendMessage(`§aHas aceptado la solicitud de ${request.from.name}.`);
        teleportRequests.delete(requestId);
    });
}

export function reqs(player, args) {
    const requests = [...teleportRequests.entries()].filter(([_, req]) => req.to.name === player.name);
    if (requests.length === 0) {
        player.sendMessage('§cNo tienes solicitudes de teletransporte pendientes.');
        return;
    }
    const requestList = requests.map(([id, req]) => `ID: ${id}, de ${req.from.name}`);
    player.sendMessage(`§6Solicitudes de teletransporte pendientes:\n${requestList.join('\n')}`);
}