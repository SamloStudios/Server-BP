import { world, system, Player } from "@minecraft/server";
import { getPlayerData, savePlayerData } from "../data/playerDataUtils";
import { getFilteredPropertyKeys } from "../botUtils";
import { addPlayerXp } from "../data/playerDataUtils";

// Almacena las invitaciones pendientes
const clanInvitations = new Map();

// Helper function placeholders
function getAllClans() {
    const clanKeys = getFilteredPropertyKeys("clanData");
    return new Set(clanKeys.map(key => key.replace("clanData:", "")));
}
function saveClanData(clanName, data) {
    world.setDynamicProperty(`clanData:${clanName}`, JSON.stringify(data));
}
function getClanData(clanName) {
    const data = world.getDynamicProperty(`clanData:${clanName}`);
    return data ? JSON.parse(data) : null;
}
function deleteClanData(clanName) {
    world.setDynamicProperty(`clanData:${clanName}`, undefined);
}

// --- Funciones de Utilidad ---
function findPlayerByName(name) {
    return world.getAllPlayers().find(p => p.name.toLowerCase() === name.toLowerCase());
}

function findPlayerByPartialName(name) {
    return world.getAllPlayers().find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
}

// --- Funciones del Comando Clan ---
export function clan(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !clan <crear/invitar/aceptar/info/desmantelar/salir> [nombre|jugador]');
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
        case 'aceptar':
            handleAcceptInvitation(player, args);
            break;
        case 'info':
            handleClanInfo(player);
            break;
        case 'desmantelar':
            handleDisbandClan(player);
            break;
        case 'salir':
            handleLeaveClan(player);
            break;
        default:
            player.sendMessage('§cSubcomando no reconocido. Uso: !clan <crear|invitar|aceptar|info|desmantelar>');
            break;
    }
}

function handleCreateClan(player, args) {
    if (args.length < 3) {
        player.sendMessage('§cUso: !clan crear <nombre>');
        return;
    }
    const clanName = args[2].toLowerCase();

    if (getAllClans().has(clanName)) {
        player.sendMessage('§cYa existe un clan con ese nombre.');
        return;
    }

    const data = getPlayerData(player);
    if (data.clan) {
        player.sendMessage('§cYa estás en un clan.');
        return;
    }

    const newClanData = {
        leader: player.name,
        members: [player.name]
    };
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
    
    // Mejor reconocimiento de nombres: busca por nombre completo o por el que empieza
    const targetPlayer = findPlayerByPartialName(targetName);
    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }
    
    const targetData = getPlayerData(targetPlayer);
    if (targetData.clan) {
        player.sendMessage(`§c${targetPlayer.name} ya está en un clan.`);
        return;
    }

    if (clanInvitations.has(targetPlayer.name)) {
        player.sendMessage(`§c${targetPlayer.name} ya tiene una invitación pendiente.`);
        return;
    }

    clanInvitations.set(targetPlayer.name, { clanName: data.clan, sender: player.name });

    player.sendMessage(`§aHas enviado una invitación a ${targetPlayer.name} para unirse a tu clan '${data.clan}'.`);
    targetPlayer.sendMessage(`§aHas sido invitado a unirte al clan '${data.clan}' por ${player.name}. Escribe §f!clan aceptar ${data.clan}§a para unirte.`);

    // Establecer un tiempo de espera para la invitación
    system.runTimeout(() => {
        if (clanInvitations.has(targetPlayer.name) && clanInvitations.get(targetPlayer.name).clanName === data.clan) {
            clanInvitations.delete(targetPlayer.name);
            const targetPlayerRecheck = findPlayerByName(targetPlayer.name);
            if (targetPlayerRecheck) targetPlayerRecheck.sendMessage(`§cLa invitación al clan '${data.clan}' ha caducado.`);
            if (player) player.sendMessage(`§cLa invitación a ${targetPlayer.name} ha caducado.`);
        }
    }, 80 * 20); // 80 segundos
}

function handleAcceptInvitation(player, args) {
    if (args.length < 2) {
        player.sendMessage('§cUso: !clan aceptar [nombre_clan]');
        return;
    }
    const clanName = args[2].toLowerCase();

    const invitation = clanInvitations.get(player.name);
    if (!invitation || invitation.clanName !== clanName) {
        player.sendMessage(`§cNo tienes una invitación pendiente para el clan '${clanName}'.`);
        return;
    }

    const data = getPlayerData(player);
    if (data.clan) {
        player.sendMessage('§cYa estás en un clan. Debes dejarlo para unirte a uno nuevo.');
        return;
    }

    const clanData = getClanData(clanName);
    if (!clanData) {
        player.sendMessage('§cEl clan ya no existe. La invitación no es válida.');
        clanInvitations.delete(player.name);
        return;
    }

    // Unir al jugador al clan
    clanData.members.push(player.name);
    saveClanData(clanName, clanData);

    data.clan = clanName;
    savePlayerData(player, data);

    clanInvitations.delete(player.name);
    addPlayerXp(player, 20, 'unirse a un clan');
    player.sendMessage(`§aTe has unido exitosamente al clan '${clanName}'.`);
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

function handleDisbandClan(player) {
    const data = getPlayerData(player);
    if (!data.clan) {
        player.sendMessage('§cNo estás en un clan.');
        return;
    }

    const clanData = getClanData(data.clan);
    if (!clanData) {
        player.sendMessage('§cError: No se pudo encontrar la información de tu clan.');
        return;
    }

    if (clanData.leader !== player.name) {
        player.sendMessage('§cSolo el líder del clan puede desmantelarlo.');
        return;
    }
    
    // Desvincular a todos los miembros del clan
    clanData.members.forEach(memberName => {
        const memberPlayer = findPlayerByName(memberName);
        if (memberPlayer) {
            const memberData = getPlayerData(memberPlayer);
            memberData.clan = null;
            savePlayerData(memberPlayer, memberData);
            memberPlayer.sendMessage(`§cEl clan '${data.clan}' ha sido desmantelado por el líder.`);
        }
    });

    // Eliminar la propiedad dinámica del clan
    deleteClanData(data.clan);
    player.sendMessage(`§aEl clan '${data.clan}' ha sido desmantelado exitosamente.`);
}

function handleLeaveClan(player) {
    const playerData = getPlayerData(player);

    if (!playerData.clan) {
        player.sendMessage('§cNo estás en un clan.');
        return;
    }

    const clanName = playerData.clan;
    const clanData = getClanData(clanName);

    // Si el clan no existe pero el jugador lo tiene en sus datos, corregimos el error
    if (!clanData) {
        playerData.clan = null;
        savePlayerData(player, playerData);
        player.sendMessage('§cEl clan al que pertenecías ya no existe. Tus datos han sido corregidos.');
        return;
    }
    
    // Si el jugador es el líder, no puede irse sin desmantelar el clan
    if (clanData.leader === player.name) {
        player.sendMessage('§cComo líder, no puedes salir del clan. Usa §f!clan desmantelar§c para disolverlo.');
        return;
    }

    // Si el jugador no es el líder, lo eliminamos de la lista de miembros
    const memberIndex = clanData.members.indexOf(player.name);
    if (memberIndex !== -1) {
        clanData.members.splice(memberIndex, 1);
        saveClanData(clanName, clanData);
        
        // Actualizamos los datos del jugador
        playerData.clan = null;
        savePlayerData(player, playerData);
        
        player.sendMessage(`§aHas salido del clan '${clanName}'.`);
        
        // Notificamos a los demás miembros (opcional)
        clanData.members.forEach(memberName => {
            const memberPlayer = findPlayerByName(memberName);
            if (memberPlayer) {
                memberPlayer.sendMessage(`§e${player.name} ha salido del clan '${clanName}'.`);
            }
        });
    } else {
        // En caso de que el jugador no esté en la lista de miembros (aunque sus datos digan que sí), corregimos el error.
        playerData.clan = null;
        savePlayerData(player, playerData);
        player.sendMessage('§cTu estado de clan era inconsistente. Ha sido corregido.');
    }
}

function getClan(player) {
    const data = getPlayerData(player);
    return data.clan;
}

world.afterEvents.entityHurt.subscribe((event) => {
    if (!(event.hurtEntity instanceof Player) || !(event.damageSource.damagingEntity instanceof Player)) return;
    
    if (getClan(event.hurtEntity) === getClan(event.damageSource.damagingEntity)) {
        const hurt = event.hurtEntity.getComponent("health");
        hurt.setCurrentValue(hurt.currentValue + event.damage);
        event.hurtEntity.extinguishFire(true);
    }
});