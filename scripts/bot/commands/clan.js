import { world } from "@minecraft/server";
import { getPlayerData, savePlayerData } from "../data/playerDataUtils";
import { getFilteredPropertyKeys } from "../botUtils";
import { addPlayerXp } from "../data/playerDataUtils";

// clanData should be a global map or a way to access your persistent storage
const clanData = new Map();
// Helper function placeholders
function getAllClans() {
    // Correctly get and return clan keys from dynamic properties
    const clanKeys = getFilteredPropertyKeys("clanData");
    return clanKeys;
}
function saveClanData(clanName, data) {
    // Implementation to save clan data as a dynamic property
    world.setDynamicProperty(`clanData:${clanName}`, JSON.stringify(data));
}
function getClanData(clanName) {
    // Implementation to retrieve clan data from a dynamic property
    const data = world.getDynamicProperty(`clanData:${clanName}`);
    return data ? JSON.parse(data) : null;
}
function deleteClanData(clanName) {
    // Implementation to delete clan data dynamic property
    world.setDynamicProperty(`clanData:${clanName}`, undefined);
}


export function clan(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !clan <crear|invitar|info> [nombre|jugador]');
        return;
    }
    const subcommand = args[1].toLowerCase();

    switch (subcommand) {
        case 'crear':
            handleCreateClan(player, args);
            break;
        case 'invitar':
            handleInvitePlayer(player, args);
            break;
        case 'info':
            handleClanInfo(player);
            break;
        default:
            player.sendMessage('§cSubcomando no reconocido. Uso: !clan <crear|invitar|info>');
            break;
    }
}

function handleCreateClan(player, args) {
    if (args.length < 3) {
        player.sendMessage('§cUso: !clan crear <nombre>');
        return;
    }
    const clanName = args[2].toLowerCase();

    // Revisa si el clan ya existe de forma consistente
    if (getAllClans().has(clanName)) {
        player.sendMessage('§cYa existe un clan con ese nombre.');
        return;
    }

    const data = getPlayerData(player);
    if (data.clan) {
        player.sendMessage('§cYa estás en un clan.');
        return;
    }

    const newClanData = { leader: player.name, members: [player.name] };
    saveClanData(clanName, newClanData);

    data.clan = clanName;
    savePlayerData(player, data);

    addPlayerXp(player, 50, 'fundar un clan');
    player.sendMessage(`§aClan '${clanName}' creado exitosamente.`);
}

function handleInvitePlayer(player, args) {
    if (args.length < 3) {
        player.sendMessage('§cUso: !clan invitar <jugador>');
        return;
    }
    const targetName = args[2];
    const data = getPlayerData(player);

    if (!data.clan) {
        player.sendMessage('§cNo estás en un clan.');
        return;
    }

    const clan = getClanData(data.clan);
    if (!clan || clan.leader !== player.name) {
        player.sendMessage('§cSolo el líder puede invitar.');
        return;
    }

    const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }

    const targetData = getPlayerData(targetPlayer);
    if (targetData.clan) {
        player.sendMessage(`§c${targetName} ya está en un clan.`);
        return;
    }
    
    // Aquí podrías implementar un sistema de invitaciones pendientes
    // Por ahora, se une directamente para mantener la lógica original.
    clan.members.push(targetPlayer.name);
    saveClanData(data.clan, clan);

    targetData.clan = data.clan;
    savePlayerData(targetPlayer, targetData);

    addPlayerXp(targetPlayer, 20, 'unirse a un clan');
    player.sendMessage(`§a${targetName} ha sido invitado al clan '${data.clan}'.`);
    targetPlayer.sendMessage(`§aHas sido invitado al clan '${data.clan}' por ${player.name}.`);
}

function handleClanInfo(player) {
    const data = getPlayerData(player);
    if (!data.clan) {
        player.sendMessage('§cNo estás en un clan.');
        return;
    }

    const clan = getClanData(data.clan);
    if (!clan) {
        player.sendMessage('§cError: No se pudo encontrar la información de tu clan.');
        return;
    }

    const memberList = clan.members.join(', ');
    player.sendMessage(`§6--- Información del Clan ---\n§bNombre: ${data.clan}\n§bLíder: ${clan.leader}\n§bMiembros: ${memberList}\n§6--------------------------`);
}