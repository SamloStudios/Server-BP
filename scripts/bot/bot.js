import { system, world } from '@minecraft/server';
import { getDinero, modificarDinero, getReputation } from './botCommands.js';

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
        player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
        return;
    }
    const tradeId = Math.random().toString(36).substring(2);
    trades.push({ id: tradeId, seller: player.name, buyer: targetName, monto, item, accepted: false });
    player.sendMessage(`§aIntercambio propuesto a ${targetName}: ${monto} Ringcoins por '${item}'. ID: ${tradeId}`);
    const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
    if (targetPlayer) targetPlayer.sendMessage(`§a${player.name} te propone un intercambio: ${monto} Ringcoins por '${item}'. Usa !accepttrade ${tradeId} para aceptar.`);
}

system.runInterval(() => {
    const now = Date.now();
    prestamos.forEach(prestamo => {
        if (now > prestamo.vencimiento && !prestamo.pagado) {
            const deudor = world.getAllPlayers().find(p => p.name === prestamo.deudor);
            if (deudor) {
                deudor.sendMessage('§cTu préstamo ha vencido. Paga ${prestamo.total} Ringcoins o enfrentarás penalizaciones.');
                modifyReputation(deudor, -1);
            }
        }
    });
    hipotecas.forEach(hipoteca => {
        if (now > hipoteca.vencimiento && !hipoteca.pagado) {
            const propRaw = world.getDynamicProperty(`property:${hipoteca.propName}`);
            if (propRaw) {
                const prop = JSON.parse(propRaw);
                prop.owner = 'Banco Real';
                prop.forSale = true;
                prop.salePrice = prop.price;
                prop.mortgaged = false;
                world.setDynamicProperty(`property:${hipoteca.propName}`, JSON.stringify(prop));
                const owner = world.getAllPlayers().find(p => p.name === hipoteca.deudor);
                if (owner) {
                    owner.sendMessage(`§cTu propiedad '${hipoteca.propName}' ha sido embargada por falta de pago.`);
                    modifyReputation(owner, -2);
                }
            }
        }
    });
}, 20 * 60 * 60); // Cada hora

world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;
    const args = event.message.slice(1).split(' ');
    const command = args[0].toLowerCase();

    if (command === 'prestamo') {
        event.cancel = true;
        if (args.length < 4) {
            player.sendMessage('§cUso: !prestamo <jugador> <monto> <días>');
            return;
        }
        const targetName = args[1];
        const monto = parseInt(args[2]);
        const dias = parseInt(args[3]);
        if (isNaN(monto) || monto <= 0 || isNaN(dias) || dias <= 0) {
            player.sendMessage('§cValores inválidos.');
            return;
        }
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (!targetPlayer) {
            player.sendMessage(`§cJugador '${targetName}' no encontrado.`);
            return;
        }
        crearPrestamo(targetPlayer, player, monto, dias);
    } else if (command === 'mortgage') {
        event.cancel = true;
        if (args.length < 3) {
            player.sendMessage('§cUso: !mortgage <propiedad> <monto>');
            return;
        }
        crearHipoteca(player, args[1].toLowerCase(), parseInt(args[2]));
    } else if (command === 'trade') {
        event.cancel = true;
        if (args.length < 4) {
            player.sendMessage('§cUso: !trade <jugador> <monto> <item>');
            return;
        }
        crearTrade(player, args[1], parseInt(args[2]), args.slice(3).join(' '));
    } else if (command === 'accepttrade') {
        event.cancel = true;
        if (args.length < 2) {
            player.sendMessage('§cUso: !accepttrade <id>');
            return;
        }
        const tradeId = args[1];
        const trade = trades.find(t => t.id === tradeId && t.buyer === player.name);
        if (!trade) {
            player.sendMessage('§cIntercambio no encontrado o no destinado a ti.');
            return;
        }
        const seller = world.getAllPlayers().find(p => p.name === trade.seller);
        if (!seller) {
            player.sendMessage('§cEl vendedor no está en línea.');
            return;
        }
        trade.accepted = true;
        modificarDinero(seller, trade.monto);
        modificarDinero(player, -trade.monto);
        seller.sendMessage(`§aIntercambio aceptado: Recibiste ${trade.monto} Ringcoins por '${trade.item}'.`);
        player.sendMessage(`§aHas pagado ${trade.monto} Ringcoins a ${trade.seller} por '${trade.item}'.`);
        trades.splice(trades.indexOf(trade), 1);
        modifyReputation(player, 1);
        modifyReputation(seller, 1);
    }
});