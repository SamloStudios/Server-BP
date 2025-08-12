import { world } from "@minecraft/server";
import { isAdmin } from "../botUtils";

// Helper para filtrar propiedades de un jugador (similar a getFilteredPropertyKeys)
function getFilteredPlayerPropertyKeys(player, prefix) {
    if (!player) return [];
    return player.getDynamicPropertyIds().filter(id => id.startsWith(prefix));
}

export function playerDP(player, args) {
    if (!isAdmin(player)) {
        player.sendMessage("§cNo tienes permisos para usar este comando.");
        return;
    }

    const errorMsg = '§9Uso: !playerDp <jugador> <get|set|remove|getKeys|getAll> [key] [value]';

    if (args.length < 3) {
        player.sendMessage(errorMsg);
        return;
    }

    const targetName = args[1];
    const targetPlayer = [...world.getPlayers()].find(p => p.name.toLowerCase() === targetName.toLowerCase());

    if (!targetPlayer) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }

    const subcommand = args[2];

    switch (subcommand) {
        case 'get': {
            if (args.length < 4) {
                player.sendMessage('§9Uso: !playerDp <jugador> get <key>');
                return;
            }
            const key = args[3];
            const answer = targetPlayer.getDynamicProperty(key);
            player.sendMessage(`§aPropiedad [${key}] de ${targetPlayer.name}:\n§9${answer}`);
            if (answer === undefined) {
                player.sendMessage("§c  Propiedad indefinida!");
            }
            break;
        }

        case 'set': {
            if (args.length < 5) {
                player.sendMessage('§9Uso: !playerDp <jugador> set <key> <value>');
                return;
            }
            const key = args[3];
            const value = args.slice(4).join(' ');
            targetPlayer.setDynamicProperty(key, value);
            player.sendMessage(`§bPropiedad [${key}] de ${targetPlayer.name} establecida a:\n§d${value}`);
            break;
        }

        case 'remove': {
            if (args.length < 4) {
                player.sendMessage('§9Uso: !playerDp <jugador> remove <key>');
                return;
            }
            const key = args[3];
            const toRemove = targetPlayer.getDynamicProperty(key);
            if (toRemove === undefined) {
                player.sendMessage(`§gPropiedad inexistente o ya eliminada`);
            } else {
                targetPlayer.setDynamicProperty(key, undefined);
                player.sendMessage(`§cPropiedad '${key}' de ${targetPlayer.name} eliminada.`);
            }
            break;
        }

        case 'getKeys': {
            if (args.length < 4) {
                player.sendMessage('§9Uso: !playerDp <jugador> getKeys <prefix>');
                return;
            }
            const prefix = args[3];
            const keys = getFilteredPlayerPropertyKeys(targetPlayer, prefix);
            player.sendMessage(`§aPropiedades de ${targetPlayer.name} con prefijo '${prefix}':`);
            if (keys.length === 0) {
                player.sendMessage("§c  No se encontraron propiedades.");
            } else {
                for (const k of keys) {
                    player.sendMessage('§a' + k);
                }
            }
            break;
        }

        case 'getAll': {
            const keys = targetPlayer.getDynamicPropertyIds();
            player.sendMessage(`§aTodas las propiedades de ${targetPlayer.name}:`);
            if (keys.length === 0) {
                player.sendMessage("§c  No se encontraron propiedades.");
            } else {
                for (const k of keys) {
                    player.sendMessage('§a' + k);
                }
            }
            break;
        }

        default:
            player.sendMessage(errorMsg);
            break;
    }
}