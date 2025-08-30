import { world, Player} from "@minecraft/server";
import { getPlayerData, savePlayerData, addDinero, addPlayerXp } from "../data/playerDataUtils";

// Supongamos que tienes una función para dar objetos
// Puedes crearla tú mismo o usar la lógica de tu complemento
function giveItems(player, itemData) {
    if (!player || !itemData) return;
    try {
        itemData.forEach(item => {
            const itemStack = new world.ItemStack(item.v, item.c ?? 1);
            if (item.n) itemStack.nameTag = item.n;
            if (item.l) itemStack.setLore([item.l]);
            player.getComponent("inventory").container.addItem(itemStack);
        });
    } catch (e) {
        console.warn(`Error giving item to player ${player.name}: ${e}`);
    }
}

/**
 * Obtiene una recompensa específica por su ID.
 * @param {Player} player El jugador.
 * @param {string} rewardId El ID único de la recompensa.
 * @returns {object|null} El objeto de recompensa o null si no existe.
 */
export function getReward(player, rewardId) {
    const rewardKey = `reward:${rewardId}`;
    const rewardData = player.getDynamicProperty(rewardKey);
    return rewardData ? JSON.parse(rewardData) : null;
}

/**
 * Obtiene todas las recompensas pendientes de un jugador.
 * @param {Player} player El jugador.
 * @returns {Array<{id: string, reward: object}>} Una lista de recompensas.
 */
export function getAllRewards(player) {
    const allKeys = player.getDynamicPropertyIds();
    const rewardKeys = allKeys.filter(key => key.startsWith('reward:'));
    
    return rewardKeys.map(key => {
        const rewardId = key.replace('reward:', '');
        return {
            id: rewardId,
            reward: JSON.parse(player.getDynamicProperty(key))
        };
    });
}

/**
 * Añade una nueva recompensa a un jugador.
 * @param {Player} player El jugador.
 * @param {object} reward El objeto de recompensa.
 * @returns {string} El ID de la recompensa creada.
 */
export function addReward(player, reward) {
    // Genera un ID único para la recompensa
    const rewardId = Math.random().toString(36).substring(2, 9);
    const rewardKey = `reward:${rewardId}`;
    
    player.setDynamicProperty(rewardKey, JSON.stringify(reward));

    // Si la recompensa es inmediata, la entregamos al jugador de inmediato
    if (reward.immediate) {
        solveReward(player, rewardId);
    } else {
        player.sendMessage(`§a¡Tienes una nueva recompensa pendiente! Usa §f!recompensas§a para verla.`);
    }

    return rewardId;
}

/**
 * Elimina una recompensa específica por su ID.
 * @param {Player} player El jugador.
 * @param {string} rewardId El ID único de la recompensa.
 */
export function removeReward(player, rewardId) {
    const rewardKey = `reward:${rewardId}`;
    player.setDynamicProperty(rewardKey, undefined);
}

/**
 * Entrega una recompensa al jugador y la elimina.
 * @param {Player} player El jugador.
 * @param {string} rewardId El ID de la recompensa a entregar.
 * @returns {boolean} True si se entregó, false si no.
 */
export function solveReward(player, rewardId) {
    const rewardData = getReward(player, rewardId);
    
    if (!rewardData) {
        player.sendMessage(`§cError: La recompensa con ID '${rewardId}' no existe.`);
        return false;
    }

    player.sendMessage(`§a¡Reclamando recompensa! Razón: §e${rewardData.reason ?? 'Sin descripción'}`);

    // Otorgar dinero
    if (rewardData.money) {
        addDinero(player, rewardData.money);
        player.sendMessage(`§6Has recibido §e${rewardData.money} Ringcoins.`);
    }

    // Otorgar experiencia
    if (rewardData.xp) {
        addPlayerXp(player, rewardData.xp, rewardData.reason ?? 'Recompensa');
        player.sendMessage(`§6Has recibido §b${rewardData.xp} XP.`);
    }
    
    // Otorgar ítems
    if (rewardData.item && rewardData.item.length > 0) {
        giveItems(player, rewardData.item);
        player.sendMessage(`§6Has recibido nuevos objetos en tu inventario.`);
    }
    
    // Nota: El sistema de 'keys' no está implementado, lo ignoramos por ahora.
    if (rewardData.key) {
        // Lógica para añadir una llave al inventario, por ejemplo.
    }

    removeReward(player, rewardId);
    return true;
}



// Ejemplo de un comando '!recompensas' para que el jugador reclame manualmente.
// Este es un ejemplo para que veas cómo se conectan las funciones.

// Supongamos que esta es la recompensa de una misión
const recompensaSemillas = {
    reason: "Semillas de oro de Elen",
    item: [{v: 'minecraft:golden_apple', c: 1}],
    money: 100,
    xp: 50,
    immediate: false // El jugador la debe reclamar manualmente
};

// ... En tu código de misiones, cuando la misión se completa:
// addReward(player, recompensaSemillas);

// ... En tu manejador de comandos del chat
function handleChatCommand(player, args) {
    if (args[0] === '!recompensas') {
        const rewards = getAllRewards(player);
        if (rewards.length === 0) {
            player.sendMessage("§cNo tienes recompensas pendientes.");
            return;
        }

        player.sendMessage("§b--- Recompensas Pendientes ---");
        rewards.forEach(r => {
            player.sendMessage(`§fID: ${r.id} | §aRazón: ${r.reward.reason}`);
        });

        // Ejemplo para reclamar la primera recompensa
        if (args[1] === 'reclamar' && rewards.length > 0) {
            const firstRewardId = rewards[0].id;
            solveReward(player, firstRewardId);
        }
    }
}
