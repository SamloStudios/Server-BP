import { system, world } from '@minecraft/server';
import { getDinero, modificarDinero, getReputation, propertyCache, updateMissionProgress } from './botCommands.js';

const prestamos = [];
const hipotecas = [];
const trades = [];

function getLoanInterest(reputationLevel) {
    if (reputationLevel >= 2) return 0.05; // 5% para Noble y Heroico
    if (reputationLevel >= 0) return 0.10; // 10% para Neutral y Honrado
    return 0.15; // 15% para Pícaro, Rufián, Forajido
}

function crearPrestamo(deudor, prestamista, monto, diasVencimiento) {
    const dineroPrestamista = getDinero(prestamista);
    if (dineroPrestamista < monto) {
        prestamista.sendMessage('§cNo tienes suficientes Ringcoins para prestar.');
        return;
    }
    const rep = getReputation(deudor).level;
    const interes = getLoanInterest(rep);
    const total = Math.floor(monto * (1 + interes));
    const ahora = Date.now();
    const vencimiento = ahora + diasVencimiento * 86400000;
    prestamos.push({
        deudor: deudor.name,
        prestamista: prestamista.name,
        monto,
        total,
        interes,
        vencimiento,
        pagado: false
    });
    modificarDinero(prestamista, -monto);
    modificarDinero(deudor, monto);
    deudor.sendMessage(`§aHas recibido un préstamo de ${monto} Ringcoins con ${interes * 100}% interés. Debes pagar ${total} Ringcoins antes de ${new Date(vencimiento).toLocaleDateString()}.`);
    prestamista.sendMessage(`§aHas prestado ${monto} Ringcoins a ${deudor.name} con ${interes * 100}% interés. Recibirás ${total} Ringcoins.`);
}

function crearHipoteca(player, propName, monto) {
    const propRaw = world.getDynamicProperty(`property:${propName}`);
    if (!propRaw) {
        player.sendMessage('§cNo existe propiedad con ese nombre.');
        return;
    }
    const prop = JSON.parse(propRaw);
    if (prop.owner !== player.name) {
        player.sendMessage('§cNo eres el propietario de esta propiedad.');
        return;
    }
    if (prop.mortgaged) {
        player.sendMessage('§cLa propiedad ya está hipotecada.');
        return;
    }
    const rep = getReputation(player).level;
    const interes = getLoanInterest(rep);
    const mortgageAmount = Math.floor(monto * 0.5);
    const total = Math.floor(mortgageAmount * (1 + interes));
    prop.mortgaged = true;
    prop.mortgageDebt = total;
    prop.mortgageLender = 'Banco Real';
    world.setDynamicProperty(`property:${propName}`, JSON.stringify(prop));
    hipotecas.push({ deudor: player.name, propName, total, vencimiento: Date.now() + 7 * 86400000, pagado: false });
    modificarDinero(player, mortgageAmount);
    player.sendMessage(`§aHas hipotecado '${propName}' por ${mortgageAmount} Ringcoins. Debes pagar ${total} Ringcoins en 7 días.`);
}

function crearTrade(player, targetName, monto, item) {
    const dinero = getDinero(player);
    if (dinero < monto) {
        player.sendMessage('§cNo tienes suficientes Ringcoins.');
        return;
    }
    const targetData = propertyCache.get(`playerData:${targetName}`) || JSON.parse(world.getDynamicProperty(`playerData:${targetName}`) || '{}');
    if (!targetData.name) {
        player.sendMessage(`§cJugador '${targetName}' no encontrado.');
        return;
    }
    const tradeId = Math.random().toString(36).substring(2);
    trades.push({ id: tradeId, seller: player.name, buyer: targetName, monto, item, accepted: false, created: Date.now() });
    player.sendMessage(`§aIntercambio propuesto a ${targetName}: ${monto} Ringcoins por '${item}'. ID: ${tradeId}`);
    const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
    if (targetPlayer) {
        targetPlayer.sendMessage(`§a${player.name} te propone un intercambio: ${monto} Ringcoins por '${item}'. Usa !accepttrade ${tradeId} para aceptar.`);
    }
}

function aceptarTrade(player, tradeId) {
    const trade = trades.find(t => t.id === tradeId && t.buyer === player.name && !t.accepted);
    if (!trade) {
        player.sendMessage('§cIntercambio no encontrado o ya aceptado.');
        return;
    }
    const seller = world.getAllPlayers().find(p => p.name === trade.seller);
    if (!seller) {
        player.sendMessage('§cEl vendedor no está conectado.');
        return;
    }
    const inventory = player.getComponent('minecraft:inventory').container;
    let hasItem = false;
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item && item.typeId === trade.item) {
            hasItem = true;
            break;
        }
    }
    if (!hasItem) {
        player.sendMessage(`§cNo tienes el ítem '${trade.item}' en tu inventario.`);
        return;
    }
    trade.accepted = true;
    modificarDinero(player, trade.monto);
    modificarDinero(seller, -trade.monto);
    player.sendMessage(`§aIntercambio aceptado. Has pagado ${trade.monto} Ringcoins y recibido '${trade.item}'.`);
    seller.sendMessage(`§a${player.name} ha aceptado tu intercambio. Has recibido ${trade.monto} Ringcoins.`);
}

function listarTrades(player) {
    const playerTrades = trades.filter(t => (t.seller === player.name || t.buyer === player.name) && !t.accepted);
    if (playerTrades.length === 0) {
        player.sendMessage('§cNo tienes intercambios pendientes.');
        return;
    }
    const tradeList = playerTrades.map(t => `ID: ${t.id}, ${t.seller} ofrece ${t.monto} Ringcoins por '${t.item}' a ${t.buyer}`);
    player.sendMessage(`§6Tus intercambios pendientes:\n${tradeList.join('\n')}`);
}

function cancelarTrade(player, tradeId) {
    const tradeIndex = trades.findIndex(t => t.id === tradeId && t.seller === player.name && !t.accepted);
    if (tradeIndex === -1) {
        player.sendMessage('§cIntercambio no encontrado o no eres el vendedor.');
        return;
    }
    const trade = trades[tradeIndex];
    trades.splice(tradeIndex, 1);
    player.sendMessage(`§aIntercambio con ID ${tradeId} cancelado.`);
    const buyer = world.getAllPlayers().find(p => p.name === trade.buyer);
    if (buyer) {
        buyer.sendMessage(`§cEl intercambio con ID ${tradeId} ha sido cancelado por ${player.name}.`);
    }
}

const commands = {
    prestamo: (player, args) => {
        if (args.length < 4) {
            player.sendMessage('§cUso: !prestamo <jugador> <monto> <días>');
            return;
        }
        const targetName = args[1];
        const monto = parseInt(args[2]);
        const dias = parseInt(args[3]);
        if (isNaN(monto) || monto <= 0 || isNaN(dias) || dias <= 0) {
            player.sendMessage('§cMonto o días inválidos.');
            return;
        }
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (!targetPlayer) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        if (targetPlayer.name === player.name) {
            player.sendMessage('§cNo puedes prestarte a ti mismo.');
            return;
        }
        crearPrestamo(targetPlayer, player, monto, dias);
    },
    mortgage: (player, args) => {
        if (args.length < 3) {
            player.sendMessage('§cUso: !mortgage <propiedad> <monto>');
            return;
        }
        const propName = args[1];
        const monto = parseInt(args[2]);
        if (isNaN(monto) || monto <= 0) {
            player.sendMessage('§cMonto inválido.');
            return;
        }
        crearHipoteca(player, propName, monto);
    },
    trade: (player, args) => {
        if (args.length < 4) {
            player.sendMessage('§cUso: !trade <jugador> <monto> <item>');
            return;
        }
        const targetName = args[1];
        const monto = parseInt(args[2]);
        const item = args[3];
        if (isNaN(monto) || monto <= 0) {
            player.sendMessage('§cMonto inválido.');
            return;
        }
        crearTrade(player, targetName, monto, item);
    },
    accepttrade: (player, args) => {
        if (args.length < 2) {
            player.sendMessage('§cUso: !accepttrade <id>');
            return;
        }
        const tradeId = args[1];
        aceptarTrade(player, tradeId);
    },
    tradelist: (player) => listarTrades(player),
    canceltrade: (player, args) => {
        if (args.length < 2) {
            player.sendMessage('§cUso: !canceltrade <id>');
            return;
        }
        const tradeId = args[1];
        cancelarTrade(player, tradeId);
    },
    clanevent: (player, args) => {
        if (!player.hasTag('admin')) {
            player.sendMessage('§cNo tienes permiso para este comando.');
            return;
        }
        for (const p of world.getAllPlayers()) {
            updateMissionProgress(p, 'clanEvent', 1);
            p.sendMessage('§a¡Has participado en un evento de clan simulado!');
        }
    }
};

world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;
    const message = event.message;
    if (!message.startsWith('!')) return;
    event.cancel = true;
    const args = message.slice(1).split(' ');
    const command = args[0].toLowerCase();
    if (commands[command]) {
        commands[command](player, args);
    }
});

system.runInterval(() => {
    const now = Date.now();
    for (const prestamo of prestamos) {
        if (!prestamo.pagado && now > prestamo.vencimiento) {
            const deudor = world.getAllPlayers().find(p => p.name === prestamo.deudor);
            if (deudor && getDinero(deudor) >= prestamo.total) {
                modificarDinero(deudor, -prestamo.total);
                const prestamista = world.getAllPlayers().find(p => p.name === prestamo.prestamista);
                if (prestamista) modificarDinero(prestamista, prestamo.total);
                prestamo.pagado = true;
                deudor.sendMessage(`§cTu préstamo de ${prestamo.monto} Ringcoins ha sido pagado automáticamente.`);
                if (prestamista) prestamista.sendMessage(`§aEl préstamo a ${deudor.name} ha sido pagado: ${prestamo.total} Ringcoins.`);
            }
        }
    }
    for (const hipoteca of hipotecas) {
        if (!hipoteca.pagado && now > hipoteca.vencimiento) {
            const deudor = world.getAllPlayers().find(p => p.name === hipoteca.deudor);
            if (deudor && getDinero(deudor) >= hipoteca.total) {
                modificarDinero(deudor, -hipoteca.total);
                const prop = JSON.parse(world.getDynamicProperty(`property:${hipoteca.propName}`));
                prop.mortgaged = false;
                prop.mortgageDebt = 0;
                prop.mortgageLender = null;
                world.setDynamicProperty(`property:${hipoteca.propName}`, JSON.stringify(prop));
                hipoteca.pagado = true;
                deudor.sendMessage(`§cTu hipoteca de ${hipoteca.propName} ha sido pagada automáticamente: ${hipoteca.total} Ringcoins.`);
            }
        }
    }
}, 20 * 60); // Cada minuto