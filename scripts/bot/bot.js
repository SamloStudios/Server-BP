import { system, world } from '@minecraft/server';
import { modificarDinero } from './botCommands.js';

// Estructuras de datos para economía
const prestamos = [];
const hipotecas = [];

// Sistema de préstamos
function crearPrestamo(deudor, prestamista, monto, interes, diasVencimiento) {
    const dineroPrestamista = modificarDinero(prestamista, 0); // Obtener saldo actual
    if (dineroPrestamista < monto) {
        prestamista.sendMessage('§cNo tienes suficiente dinero para prestar.');
        return;
    }
    const ahora = Date.now();
    const vencimiento = ahora + diasVencimiento * 86400000;
    prestamos.push({
        deudor: deudor.name,
        prestamista: prestamista.name,
        monto,
        interes,
        vencimiento,
        pagado: false,
    });
    modificarDinero(prestamista, -monto);
    modificarDinero(deudor, monto);
    deudor.sendMessage(`§aHas recibido un préstamo de ${monto} monedas con ${interes}% interés. Debes pagar antes de ${new Date(vencimiento).toLocaleDateString()}.`);
    prestamista.sendMessage(`§aHas prestado ${monto} monedas a ${deudor.name} con ${interes}% interés.`);
}

// Sistema de hipotecas
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
    const mortgageAmount = Math.floor(monto * 0.5);
    prop.mortgaged = true;
    prop.mortgageDebt = mortgageAmount;
    prop.mortgageLender = 'Banco Real';
    world.setDynamicProperty(`property:${propName}`, JSON.stringify(prop));
    modificarDinero(player, mortgageAmount);
    player.sendMessage(`§aHas hipotecado '${propName}'. Recibiste ${mortgageAmount} monedas.`);
}

// Revisión periódica de vencimientos
system.runInterval(() => {
    const now = Date.now();
    prestamos.forEach(prestamo => {
        if (now > prestamo.vencimiento && !prestamo.pagado) {
            const deudor = world.getAllPlayers().find(p => p.name === prestamo.deudor);
            if (deudor) {
                deudor.sendMessage('§cTu préstamo ha vencido. Paga pronto o enfrentarás penalizaciones.');
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
                if (owner) owner.sendMessage(`§cTu propiedad '${hipoteca.propName}' ha sido embargada por falta de pago.`);
            }
        }
    });
}, 20 * 60 * 60); // Revisar cada hora

// Comandos de economía
world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;
    const args = event.message.slice(1).split(' ');
    const command = args[0].toLowerCase();

    if (command === 'prestamo') {
        event.cancel = true;
        if (args.length < 4) {
            player.sendMessage('§cUso: !prestamo <jugador> <monto> <dias>');
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
        crearPrestamo(targetPlayer, player, monto, 5, dias);
    } else if (command === 'mortgage') {
        event.cancel = true;
        if (args.length < 3) {
            player.sendMessage('§cUso: !mortgage <nombre> <monto>');
            return;
        }
        crearHipoteca(player, args[1].toLowerCase(), parseInt(args[2]));
    }
});