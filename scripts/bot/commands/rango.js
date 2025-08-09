import { getPlayerData, getRank, getLevelFromXP, getNextLevelXP, RANKS, getNextRank } from "../data/playerDataUtils";

export function rango(player) {
    const data = getPlayerData(player);
    const rank = getRank(player);
    const next = getNextRank(rank.name);
    print (data.name)

    player.sendMessage(`\n§6Tu rango actual: ${rank.color}${rank.name}`);
    if (next) {
    player.sendMessage(`§7Siguiente rango: ${next.color}${next.name}`);
    player.sendMessage(`§7Requisitos para el siguiente rango: [${data.level} -> ${next.level}] = §a(${next.level - data.level})§7 niveles más`);
    const nextLevelXp = getNextLevelXP(getLevelFromXP(data.xp)); 
    player.sendMessage(`§7Requerimientos para el siguiente nivel: [${data.xp} -> ${nextLevelXp}] = §d(${nextLevelXp - data.xp}) XP §7más`);
    player.sendMessage(`§7Recompensas: §b${next.rank_rewards ? next.rank_rewards : "No hay recompensa definida para este rango"}`);
    player.sendMessage(`§8Para subir de rango completa más misiones, gana monedas, reputación, nivel, etc.`);
    } else {
    player.sendMessage(`§b¡Has alcanzado el máximo rango posible!`);
    }
    return;
}