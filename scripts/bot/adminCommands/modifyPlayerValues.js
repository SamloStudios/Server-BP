import { world } from "@minecraft/server";
import { isAdmin } from "../botUtils";
import { getPlayerData, getRank, savePlayerData, getLevelFromXP, propertyCache } from "../data/playerDataUtils";

export function setxp(player, args) {
    if (!isAdmin(player, 'admin')) {
        player.sendMessage('§cNo tienes permiso para este comando.');
        return;
    }
    if (args.length < 3) {
        player.sendMessage('§cUso: !setxp <jugador> <cantidad>');
        return;
    }
    const targetName = args[1];
    const amount = parseInt(args[2]);
    if (isNaN(amount) || amount < 0) {
        player.sendMessage('§cCantidad inválida.');
        return;
    }
    const targetPlayer = getPlayerByName(targetName);
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }
    const targetData = getPlayerData(targetPlayer);
    targetData.xp = amount;
    targetData.level = getLevelFromXP(amount);
    savePlayerData({ name: targetPlayer.name }, targetData);
    player.sendMessage(`§aXP de ${targetName} establecido a ${amount}.`);
    targetPlayer.sendMessage(`§aTu XP ha sido establecido a ${amount} por un administrador.`);
}

export function setMoney(player, args) {
    if (!isAdmin(player, 'admin')) {
        player.sendMessage('§cNo tienes permiso para este comando.');
        return;
    }
    if (args.length < 3) {
        player.sendMessage('§cUso: !setmoney <jugador> <cantidad>');
        return;
    }
    const targetName = args[1];
    const amount = parseInt(args[2]);
    if (isNaN(amount) || amount < 0) {
        player.sendMessage('§cCantidad inválida.');
        return;
    }
    const targetPlayer = getPlayerByName(targetName);
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }
    const targetData = getPlayerData(targetPlayer);
    targetData.balance = amount;
    savePlayerData({ name: targetPlayer.name }, targetData);
    player.sendMessage(`§aRingcoins de ${targetName} establecidos a ${amount}.`);
    targetPlayer.sendMessage(`§aTus Ringcoins han sido establecidos a ${amount} por un administrador.`);
}

export function setReputation(player, args) {
    if (!isAdmin(player, 'admin')) {
        player.sendMessage('§cNo tienes permiso para este comando.');
        return;
    }
    if (args.length < 3) {
        player.sendMessage('§cUso: !setrep <jugador> <nivel>');
        return;
    }
    const targetName = args[1];
    const level = parseInt(args[2]);
    if (isNaN(level) || level < -3 || level > 3) {
        player.sendMessage('§cNivel de reputación inválido (-3 a 3).');
        return;
    }

    const targetPlayer = getPlayerByName(targetName);
    
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }

    const targetData = getPlayerData(targetPlayer);
    targetData.reputation = level;
    savePlayerData({ name: targetPlayer.name }, targetData);
    player.sendMessage(`§aReputación de ${targetName} establecida a ${level}.`);
    targetPlayer.sendMessage(`§aTu reputación ha sido establecida a ${level} por un administrador.`);
    const rank = getRank(targetPlayer);
    const expectedRank = getRank(targetPlayer);
    if (expectedRank !== rank) {
        targetData.xp = Math.max(0, targetData.xp - 50);
        savePlayerData(targetPlayer, targetData);
        targetPlayer.sendMessage(`§cTu rango ha sido ajustado a ${expectedRank.color}${expectedRank.name} debido a tu reputación.`);
    }
}

export function setMission(player, args) {
    if (!isAdmin(player, 'admin')) {
        player.sendMessage('§cNo tienes permiso para este comando.');
        return;
    }
    if (args.length < 3) {
        player.sendMessage('§cUso: !setrep <jugador> <nivel>');
        return;
    }
    const targetName = args[1];
    const amount = parseInt(args[2]);

    const targetPlayer = getPlayerByName(targetName);
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }

    const targetData = getPlayerData(targetPlayer);
    targetData.misiones = amount;
    savePlayerData({ name: targetPlayer.name }, targetData);
    player.sendMessage(`§aMisiones de ${targetName} establecida a ${amount}.`);
}

function getPlayerByName(name) {
    const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!targetPlayer) {
        return undefined;
    }
    return targetPlayer;
}

export function clearCache () {
    propertyCache = new Map();
}