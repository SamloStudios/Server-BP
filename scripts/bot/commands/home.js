import { system, world } from '@minecraft/server';

export function setHome(player, args) {
    if (player.dimension.id !== 'minecraft:overworld') {
        player.sendMessage('§cSolo puedes establecer tu hogar en el Overworld.');
        return;
    }
    const pos = player.location;
    const homeData = {
        location: { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) },
        dimension: player.dimension.id
    };
    player.setDynamicProperty('home', JSON.stringify(homeData));
    player.sendMessage(`§aHogar establecido en: X:${Math.floor(pos.x)}, Y:${Math.floor(pos.y)}, Z:${Math.floor(pos.z)}`);
}

export function home(player, args) {
    const homeDataRaw = player.getDynamicProperty('home');
    if (!homeDataRaw) {
        player.sendMessage('§cNo tienes un hogar establecido. Usa !set para crear uno.');
        return;
    }
    const homeData = JSON.parse(homeDataRaw);
    system.run(() => {
        player.teleport(homeData.location, { dimension: world.getDimension(homeData.dimension) });
        player.sendMessage(`§aTeletransportándote a tu hogar: X:${homeData.location.x}, Y:${homeData.location.y}, Z:${homeData.location.z}`);
    });
}