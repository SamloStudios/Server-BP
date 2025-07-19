import { PlayerSpawnAfterEvent, system, world } from '@minecraft/server';
import { truncateFloat } from './botUtils.js';




// UTILIDADES BÁSICAS (boring, just keep reading bro)
function truncateFloat(num, decimals) {
  return Math.floor(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function getTime() {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`;
}







// DATOS Y VARIABLES GLOBALES
let playerTpRequests = [];
let activeMathQuiz = null;
const mathQuizIntervalTicks = 20 * 60 * 5; // Automaticamente cada "ratito"
let currentMission = null;
let missionStartTick = 0;
const missionDurationTicks = 20 * 60 * 60 * 24; // Si se te dificulta multiplicar como a mí es lo de un día maso
let missionEndTick = 0;
let missionDifficultyLevel = 1;











// === SISTEMA DE RANGOS MEDIEVALES COMPLETO ===


const rankList = [
  { name: 'Campesino', color: 'gray', requirements: () => true },
  { name: 'Aldeano', color: 'white', requirements: (p) => p.misiones >= 3 && p.dinero >= 100 },
  { name: 'Escudero', color: 'green', requirements: (p) => p.misiones >= 7 && p.dinero >= 300 && p.nivel >= 5 },
  { name: 'Caballero', color: 'aqua', requirements: (p) => p.misiones >= 15 && p.reputacion >= 3 && p.dinero >= 700 },
  { name: 'Barón', color: 'blue', requirements: (p) => p.misiones >= 25 && p.terrenos >= 2 && p.ventas >= 3 && p.dinero >= 1500 },
  { name: 'Conde', color: 'gold', requirements: (p) => p.misiones >= 40 && p.nivel >= 10 && p.reputacion >= 5 && p.dinero >= 2500 },
  { name: 'Duque', color: 'dark_purple', requirements: (p) => p.misiones >= 60 && p.clanFundado && p.ventas >= 8 && p.dinero >= 5000 },
  { name: 'Príncipe', color: 'light_purple', requirements: (p) => p.misiones >= 90 && p.eventos >= 1 && p.reputacion >= 8 && p.dinero >= 8000 },
  { name: 'Rey', color: 'red', requirements: (p) => p.misiones >= 120 && p.nivel >= 20 && p.dinero >= 15000 && p.eventos >= 3 },
  { name: 'Emperador', color: 'dark_red', requirements: (p) => p.admin === true },
];

// Obtiene el mejor rango alcanzado por el jugador
function calcularRango(jugador) {
  const data = obtenerDatosJugador(jugador);
  for (let i = rankList.length - 1; i >= 0; i--) {
    if (rankList[i].requirements(data)) return rankList[i];
  }
  return rankList[0]; // Campesino por defecto
}

// Obtiene información general de un jugador (mockup con scores)
function obtenerDatosJugador(player) {
  return {
    misiones: getScore(player, 'misiones'),
    dinero: getScore(player, 'monedas'),
    nivel: getScore(player, 'xp'),
    reputacion: getScore(player, 'reputacion'),
    terrenos: getScore(player, 'terrenos'),
    ventas: getScore(player, 'ventas'),
    eventos: getScore(player, 'eventos'),
    clanFundado: getScore(player, 'clanFundado') > 0,
    admin: player.hasTag('admin')
  };
}

// Asignar y mostrar el rango al hablar
world.beforeEvents.chatSend.subscribe(e => {
  const jugador = e.sender;
  const rango = calcularRango(jugador);
  const mensaje = `§8[§${rango.color}${rango.name}§8] §r${jugador.name}: ${e.message}`;
  e.cancel = true;
  world.sendMessage(mensaje);
});

// Comando !rango para mostrar progreso actual
world.beforeEvents.chatSend.subscribe(e => {
  const mensaje = e.message;
  const jugador = e.sender;
  if (!mensaje.startsWith('!rango')) return;

  const actual = calcularRango(jugador);
  const index = rankList.findIndex(r => r.name === actual.name);
  const siguiente = rankList[index + 1];

  jugador.sendMessage(`§6Tu rango actual: §${actual.color}${actual.name}`);
  if (siguiente) {
    jugador.sendMessage(`§7Siguiente rango: §${siguiente.name}`);
    jugador.sendMessage(`§8Completa más misiones, gana monedas, reputación, nivel, etc.`);
  } else {
    jugador.sendMessage(`§b¡Has alcanzado el máximo rango posible!`);
  }
});

// ================================
// FIN DEL SISTEMA DE RANGOS
// ================================






// ================================
// Popularidad o reputación 
// ================================



// Obtiene la reputación actual 
function getReputacion(player) {
  const rep = player.getDynamicProperty("reputacion");
  return rep === undefined ? 0 : rep;
}

// Modifica la reputación
function modificarReputacion(player, cambio) {
  let rep = getReputacion(player);
  rep += cambio;
  if (rep < 0) rep = 0;
  player.setDynamicProperty("reputacion", rep);
  player.sendMessage(`§6Tu reputación ha cambiado en ${cambio}. Ahora tienes ${rep} puntos.`);
}

world.beforeEvents.chatSend.subscribe(event => {
  if(event.message === "!reputacion") {
    event.cancel = true;
    const rep = getReputacion(event.sender);
    event.sender.sendMessage(`§bTu reputación actual es: §e${rep}`);
  }
});












// TP REQUESTS
function addTpRequest(senderName, targetName) {
  playerTpRequests.push({ sender: senderName, target: targetName });
  system.runTimeout(() => {
    // Expira en 40 segundos
    const index = playerTpRequests.findIndex(r => r.sender === senderName && r.target === targetName);
    if (index !== -1) {
      playerTpRequests.splice(index, 1);
      world.sendMessage(`§cLa solicitud de teletransporte de ${senderName} a ${targetName} ha caducado.`);
    }
  }, 40 * 20);
}
function removeTpRequest(senderName, targetName) {
  playerTpRequests = playerTpRequests.filter(r => !(r.sender === senderName && r.target === targetName));
}




// --- Economía más avanzada del mundo --- //

const prestamos = [];
const hipotecas = [];
const impuestos = [];
const contratos = [];
const mercado = {};

// Utilidades básicas
function getDinero(player) {
  let dinero = player.getDynamicProperty('dinero');
  return (dinero === undefined) ? 0 : dinero;
}
function setDinero(player, cantidad) {
  if (cantidad < 0) cantidad = 0;
  player.setDynamicProperty('dinero', cantidad);
}
function modificarDinero(player, cantidad) {
  let dinero = getDinero(player);
  dinero += cantidad;
  if (dinero < 0) dinero = 0;
  setDinero(player, dinero);
  player.sendMessage(`§6Tu saldo ha cambiado en ${cantidad} monedas. Saldo actual: §e${dinero}`);
  return dinero;
}

// Inventario simple en DynamicProperties
function getInventario(player) {
  let inv = player.getDynamicProperty('inventario');
  if (!inv) {
    inv = {};
    player.setDynamicProperty('inventario', inv);
  }
  return inv;
}
function modificarInventario(player, item, cantidad) {
  let inv = getInventario(player);
  let actual = inv[item] || 0;
  actual += cantidad;
  if (actual < 0) actual = 0;
  inv[item] = actual;
  player.setDynamicProperty('inventario', inv);
  return actual;
}

// Préstamos
function crearPrestamo(deudor, prestamista, monto, interes, diasVencimiento) {
  let ahora = Date.now();
  let vencimiento = ahora + diasVencimiento * 86400000;
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
  prestamista.sendMessage(`§aHas prestado ${monto} monedas a ${deudor.name}.`);
}

function pagarPrestamo(deudor, prestamista) {
  let prestamo = prestamos.find(p => p.deudor === deudor.name && p.prestamista === prestamista.name && !p.pagado);
  if (!prestamo) {
    deudor.sendMessage('§cNo tienes préstamos pendientes con ese jugador.');
    return false;
  }
  let deudaTotal = Math.ceil(prestamo.monto * (1 + prestamo.interes / 100));
  let saldo = getDinero(deudor);
  if (saldo < deudaTotal) {
    deudor.sendMessage('§cNo tienes suficiente dinero para pagar el préstamo.');
    return false;
  }
  modificarDinero(deudor, -deudaTotal);
  modificarDinero(prestamista, deudaTotal);
  prestamo.pagado = true;
  deudor.sendMessage(`§aHas pagado tu préstamo de ${deudaTotal} monedas a ${prestamista.name}.`);
  prestamista.sendMessage(`§aHas recibido el pago de ${deudaTotal} monedas de ${deudor.name}.`);
  return true;
}

// Hipotecas
function hipotecarPropiedad(player, propiedad, montoHipoteca, diasVencimiento) {
  let ahora = Date.now();
  let vencimiento = ahora + diasVencimiento * 86400000;
  hipotecas.push({
    propietario: player.name,
    propiedad,
    montoHipoteca,
    vencimiento,
    pagado: false,
  });
  modificarDinero(player, montoHipoteca);
  player.sendMessage(`§aHas hipotecado ${propiedad} por ${montoHipoteca} monedas. Debes pagar antes de ${new Date(vencimiento).toLocaleDateString()}.`);
}

function pagarHipoteca(player, propiedad) {
  let hipoteca = hipotecas.find(h => h.propietario === player.name && h.propiedad === propiedad && !h.pagado);
  if (!hipoteca) {
    player.sendMessage('§cNo tienes hipoteca pendiente sobre esa propiedad.');
    return false;
  }
  let saldo = getDinero(player);
  if (saldo < hipoteca.montoHipoteca) {
    player.sendMessage('§cNo tienes suficiente dinero para pagar la hipoteca.');
    return false;
  }
  modificarDinero(player, -hipoteca.montoHipoteca);
  hipoteca.pagado = true;
  player.sendMessage(`§aHas pagado la hipoteca de ${propiedad}. ¡Propiedad liberada!`);
  return true;
}

function revisarHipotecas() {
  let ahora = Date.now();
  hipotecas.forEach(h => {
    if (!h.pagado && ahora > h.vencimiento) {
      let player = world.getPlayers().find(p => p.name === h.propietario);
      if (player) {
        player.sendMessage(`§cTu propiedad ${h.propiedad} ha sido embargada por falta de pago.`);
        modificarDinero(player, -Math.floor(h.montoHipoteca / 2)); // multa por embargo
      }
      h.pagado = true;
    }
  });
}

// Mercado
function definirPrecio(item, precioCompra, precioVenta) {
  mercado[item] = { precioCompra, precioVenta };
}

function comprarItem(player, item, cantidad) {
  if (!mercado[item]) {
    player.sendMessage('§cEste ítem no está disponible en el mercado.');
    return;
  }
  let costo = mercado[item].precioVenta * cantidad;
  let saldo = getDinero(player);
  if (saldo < costo) {
    player.sendMessage('§cNo tienes dinero suficiente.');
    return;
  }
  modificarDinero(player, -costo);
  modificarInventario(player, item, cantidad);
  player.sendMessage(`§aHas comprado ${cantidad} ${item}(s) por ${costo} monedas.`);
}

function venderItem(player, item, cantidad) {
  if (!mercado[item]) {
    player.sendMessage('§cEste ítem no se compra en el mercado.');
    return;
  }
  let inv = getInventario(player);
  if (!inv[item] || inv[item] < cantidad) {
    player.sendMessage('§cNo tienes suficientes ítems para vender.');
    return;
  }
  let ingreso = mercado[item].precioCompra * cantidad;
  modificarDinero(player, ingreso);
  modificarInventario(player, item, -cantidad);
  player.sendMessage(`§aHas vendido ${cantidad} ${item}(s) por ${ingreso} monedas.`);
}

// Contratos
function crearContrato(jugador1, jugador2, descripcion, diasVencimiento) {
  let ahora = Date.now();
  let vencimiento = ahora + diasVencimiento * 86400000;
  let id = Math.floor(Math.random() * 1000000);
  contratos.push({ id, jugador1: jugador1.name, jugador2: jugador2.name, descripcion, completado: false, vencimiento });
  jugador1.sendMessage(`§aContrato #${id} creado con ${jugador2.name}: ${descripcion}`);
  jugador2.sendMessage(`§aContrato #${id} recibido de ${jugador1.name}: ${descripcion}`);
}

function completarContrato(id) {
  let contrato = contratos.find(c => c.id === id && !c.completado);
  if (!contrato) return false;
  contrato.completado = true;
  let jugador1 = world.getPlayers().find(p => p.name === contrato.jugador1);
  let jugador2 = world.getPlayers().find(p => p.name === contrato.jugador2);
  if (jugador1) jugador1.sendMessage(`§aContrato #${id} completado con éxito.`);
  if (jugador2) jugador2.sendMessage(`§aContrato #${id} completado con éxito.`);
  return true;
}

// Impuestos
function agregarImpuesto(jugador, monto, diasVencimiento) {
  let ahora = Date.now();
  let vencimiento = ahora + diasVencimiento * 86400000;
  impuestos.push({ jugador: jugador.name, monto, vencimiento, pagado: false });
  jugador.sendMessage(`§aTienes un impuesto de ${monto} monedas que vencerá el ${new Date(vencimiento).toLocaleDateString()}.`);
}

function pagarImpuesto(jugador) {
  let impuesto = impuestos.find(i => i.jugador === jugador.name && !i.pagado);
  if (!impuesto) {
    jugador.sendMessage('§cNo tienes impuestos pendientes.');
    return false;
  }
  let saldo = getDinero(jugador);
  if (saldo < impuesto.monto) {
    jugador.sendMessage('§cNo tienes suficiente dinero para pagar el impuesto.');
    return false;
  }
  modificarDinero(jugador, -impuesto.monto);
  impuesto.pagado = true;
  jugador.sendMessage(`§aHas pagado tu impuesto de ${impuesto.monto} monedas.`);
  return true;
}

function revisarImpuestos() {
  let ahora = Date.now();
  impuestos.forEach(i => {
    if (!i.pagado && ahora > i.vencimiento) {
      let jugador = world.getPlayers().find(p => p.name === i.jugador);
      if (jugador) {
        jugador.sendMessage('§cHas incumplido el pago de un impuesto. Se aplicarán multas.');
        modificarDinero(jugador, -Math.ceil(i.monto * 0.2)); // multa del 20%
      }
      i.pagado = true;
    }
  });
}

// Comandos y eventos
world.beforeEvents.chatSend.subscribe(event => {
  const player = event.sender;
  const message = event.message.toLowerCase();

  if (!message.startsWith('!')) return;

  const args = message.split(' ');
  event.cancel = true;

  switch(args[0]) {
    case '!saldo':
      let saldo = getDinero(player);
      player.sendMessage(`§aTu saldo es: §e${saldo} monedas.`);
      break;

    case '!transferir':
      if (args.length < 3) {
        player.sendMessage('§cUso: !transferir <jugador> <cantidad>');
        break;
      }
      let destinatario = world.getPlayers().find(p => p.name.toLowerCase() === args[1]);
      if (!destinatario) {
        player.sendMessage('§cJugador no encontrado.');
        break;
      }
      let cantidad = parseInt(args[2]);
      if (isNaN(cantidad) || cantidad <= 0) {
        player.sendMessage('§cCantidad inválida.');
        break;
      }
      if (getDinero(player) < cantidad) {
        player.sendMessage('§cNo tienes suficiente dinero.');
        break;
      }
      modificarDinero(player, -cantidad);
      modificarDinero(destinatario, cantidad);
      player.sendMessage(`§aHas enviado ${cantidad} monedas a ${destinatario.name}.`);
      destinatario.sendMessage(`§aHas recibido ${cantidad} monedas de ${player.name}.`);
      break;

    case '!prestamo':
      if (args.length < 5) {
        player.sendMessage('§cUso: !prestamo <jugador> <monto> <interés%> <días>');
        break;
      }
      let prestamista = world.getPlayers().find(p => p.name.toLowerCase() === args[1]);
      if (!prestamista) {
        player.sendMessage('§cJugador prestamista no encontrado.');
        break;
      }
      let montoPrestamo = parseInt(args[2]);
      let interes = parseFloat(args[3]);
      let dias = parseInt(args[4]);
      if ([montoPrestamo, interes, dias].some(v => isNaN(v) || v <= 0)) {
        player.sendMessage('§cParámetros inválidos.');
        break;
      }
      crearPrestamo(player, prestamista, montoPrestamo, interes, dias);
      break;

    case '!pagarprestamo':
      if (args.length < 2) {
        player.sendMessage('§cUso: !pagarprestamo <jugador>');
        break;
      }
      let prestamistaPago = world.getPlayers().find(p => p.name.toLowerCase() === args[1]);
      if (!prestamistaPago) {
        player.sendMessage('§cJugador no encontrado.');
        break;
      }
      pagarPrestamo(player, prestamistaPago);
      break;

    case '!hipotecar':
      if (args.length < 4) {
        player.sendMessage('§cUso: !hipotecar <propiedad> <monto> <días>');
        break;
      }
      let propiedad = args[1];
      let montoHip = parseInt(args[2]);
      let diasHip = parseInt(args[3]);
      if ([montoHip, diasHip].some(v => isNaN(v) || v <= 0)) {
        player.sendMessage('§cParámetros inválidos.');
        break;
      }
      hipotecarPropiedad(player, propiedad, montoHip, diasHip);
      break;

    case '!pagarhipoteca':
      if (args.length < 2) {
        player.sendMessage('§cUso: !pagarhipoteca <propiedad>');
        break;
      }
      pagarHipoteca(player, args[1]);
      break;

    case '!impuesto':
      if (args.length < 4) {
        player.sendMessage('§cUso: !impuesto <jugador> <monto> <días>');
        break;
      }
      let jugadorImp = world.getPlayers().find(p => p.name.toLowerCase() === args[1]);
      if (!jugadorImp) {
        player.sendMessage('§cJugador no encontrado.');
        break;
      }
      let montoImp = parseInt(args[2]);
      let diasImp = parseInt(args[3]);
      if ([montoImp, diasImp].some(v => isNaN(v) || v <= 0)) {
        player.sendMessage('§cParámetros inválidos.');
        break;
      }
      agregarImpuesto(jugadorImp, montoImp, diasImp);
      break;

    case '!pagarimpuesto':
      pagarImpuesto(player);
      break;

    case '!comprar':
      if (args.length < 3) {
        player.sendMessage('§cUso: !comprar <item> <cantidad>');
        break;
      }
      comprarItem(player, args[1], parseInt(args[2]));
      break;

    case '!vender':
      if (args.length < 3) {
        player.sendMessage('§cUso: !vender <item> <cantidad>');
        break;
      }
      venderItem(player, args[1], parseInt(args[2]));
      break;

    case '!contrato':
      if (args.length < 5) {
        player.sendMessage('§cUso: !contrato <jugador> <descripcion> <dias>');
        break;
      }
      let jugador2 = world.getPlayers().find(p => p.name.toLowerCase() === args[1]);
      if (!jugador2) {
        player.sendMessage('§cJugador no encontrado.');
        break;
      }
      let descripcion = args.slice(2, args.length - 1).join(' ');
      let diasContrato = parseInt(args[args.length - 1]);
      if (isNaN(diasContrato) || diasContrato <= 0) {
        player.sendMessage('§cDías inválidos.');
        break;
      }
      crearContrato(player, jugador2, descripcion, diasContrato);
      break;

    case '!completarcontrato':
      if (args.length < 2) {
        player.sendMessage('§cUso: !completarcontrato <id>');
        break;
      }
      let idContrato = parseInt(args[1]);
      if (isNaN(idContrato)) {
        player.sendMessage('§cID inválido.');
        break;
      }
      if (!completarContrato(idContrato)) {
        player.sendMessage('§cContrato no encontrado o ya completado.');
      }
      break;

    default:
      event.cancel = false;
      break;
  }
});

// Revisión periódica cada 5 minutos
system.runInterval(() => {
  revisarHipotecas();
  revisarImpuestos();
}, 5 * 60 * 1000);

// Predefinir precios mercado
definirPrecio('madera', 5, 10);
definirPrecio('piedra', 8, 15);
definirPrecio('hierro', 20, 40);
definirPrecio('diamante', 100, 200);

// Mensaje al unirse
world.events.playerJoin.subscribe(event => {
  let player = event.player;
  player.sendMessage('§6¡Bienvenido al reino! Usa §e!help §6para ver comandos económicos.');
});













// MISIÓN SEMANAL
// ==== Sistema autónomo SUPERHIPER avanzado de misiones diarias, bro me costo tiempo mucho hacer esta porqueria ====


// Colección de tipos de bloques y mobs variados para misiones, no se queje que es lo que se me ocurrio
const blocks = [
  "minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log",
  "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log",
  "minecraft:diamond_ore", "minecraft:iron_ore", "minecraft:gold_ore",
  "minecraft:coal_ore", "minecraft:emerald_ore", "minecraft:redstone_ore",
  "minecraft:lapis_ore", "minecraft:cobblestone", "minecraft:sand",
  "minecraft:glass"
];

const mobs = [
  "zombie", "skeleton", "creeper", "spider", "enderman",
  "witch", "guardian", "slime", "silverfish", "blaze"
];

// Plantillas diversas para misiones, con placeholders para cantidades y objetivos aleatorios, facilisimo verdad?
const missionTemplates = [
  { type: "collect", desc: "Recolecta {amount} bloques de {block}", getTarget: () => randomChoice(blocks), baseAmount: 10 },
  { type: "kill", desc: "Derrota {amount} {mob}s", getTarget: () => randomChoice(mobs), baseAmount: 5 },
  { type: "explore", desc: "Explora {amount} biomas distintos", getTarget: () => null, baseAmount: 3 },
  { type: "levelup", desc: "Sube {amount} niveles", getTarget: () => null, baseAmount: 1 },
  { type: "teleport", desc: "Teletranspórtate {amount} veces", getTarget: () => null, baseAmount: 3 },
  { type: "earn", desc: "Gana {amount} monedas", getTarget: () => null, baseAmount: 50 },
  { type: "build", desc: "Construye {amount} estructuras", getTarget: () => null, baseAmount: 1 },
  { type: "travel", desc: "Viaja {amount} bloques", getTarget: () => null, baseAmount: 1000 }
];

// elemento aleatorio
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generar misión con dificultad creciente y aleatorio
function generateMission(level) {
  const template = missionTemplates[Math.floor(Math.random() * missionTemplates.length)];
  const target = template.getTarget();
  const scaleFactor = Math.pow(2, level - 1);
  let amount = Math.ceil(template.baseAmount * scaleFactor);

  if (template.type === "levelup" && amount < 1) amount = 1;
  if (template.type === "teleport" && amount < 1) amount = 1;

  const description = template.desc
    .replace("{amount}", amount)
    .replace("{block}", target || "")
    .replace("{mob}", target || "");

  return {
    description,
    type: template.type,
    target,
    amount,
    progress: 0,
    level
  };
}

// Asignar misión diaria
function assignDailyMission() {
  currentMission = generateMission(missionDifficultyLevel);
  missionStartTick = system.currentTick;
  missionEndTick = missionStartTick + missionDurationTicks;

  world.sendMessage(`§6¡Nueva misión diaria! §e${currentMission.description}`);
  world.sendMessage(`§7Tienes 24 horas para completarla y ganar recompensas.`);
}

// Recompensar jugador 
function rewardPlayerForMission(player) {
  const xpReward = currentMission.level * 150;
  const coinReward = currentMission.level * 75;

  let currentXP = player.getDynamicProperty("xp") || 0;
  player.setDynamicProperty("xp", currentXP + xpReward);

  let currentBalance = player.getDynamicProperty("balance") || 0;
  player.setDynamicProperty("balance", currentBalance + coinReward);

  player.sendMessage(`§a¡Misión completada! Ganaste ${xpReward} XP y ${coinReward} monedas.`);
  world.sendMessage(`§d${player.name} ha completado la misión diaria y recibido sus recompensas.`);
}

// Actualizar progreso 
function updateMissionProgress(player, eventType, eventTarget, amount = 1) {
  if (!currentMission) return;
  if (currentMission.type !== eventType) return;
  if (currentMission.target && eventTarget !== currentMission.target) return;

  currentMission.progress += amount;
  if (currentMission.progress > currentMission.amount) currentMission.progress = currentMission.amount;

  player.sendMessage(`§aProgreso misión: ${currentMission.progress}/${currentMission.amount}`);

  if (currentMission.progress >= currentMission.amount) {
    rewardPlayerForMission(player);
    missionDifficultyLevel++;
    assignDailyMission();
  }
}

// Revisión periódica 
function checkMissionExpiration() {
  if (!currentMission) return;
  if (system.currentTick > missionEndTick) {
    world.sendMessage(`§cLa misión diaria ha expirado sin completarse.`);
    missionDifficultyLevel = 1; // Reset dificultad
    assignDailyMission();
  }
}

// Escuchar evento "collect"
world.afterEvents.blockBreak.subscribe(event => {
  const player = event.player;
  const blockId = event.brokenBlockPermutation.type.id;
  updateMissionProgress(player, "collect", blockId, 1);
});

// Escuchar evento "kill"
world.afterEvents.entityDie.subscribe(event => {
  const player = event.damageSource?.damager;
  if (!player || !player.isPlayer) return;
  const mobType = event.entity.typeId.replace("minecraft:", "");
  updateMissionProgress(player, "kill", mobType, 1);
});

// Escuchar evento  "levelup"
world.afterEvents.playerExperienceChange.subscribe(event => {
  const player = event.player;
  if (event.newLevel > event.oldLevel) {
    updateMissionProgress(player, "levelup", null, event.newLevel - event.oldLevel);
  }
});


// Iniciar misión al arrancar servidor
system.run(() => {
  if (!currentMission) assignDailyMission();
  checkMissionExpiration();
  system.runTimeout(arguments.callee, 20 * 60); // Revisar cada 60 segundos
});












// MATH QUIZ
// Variables globales para mathquiz
let mathQuizActive = false;
let mathQuizAnswer = null;
let mathQuizQuestion = '';
let mathQuizTimeout = null;

// Función para generar pregunta y respuesta
function generateMathQuestion() {
    const types = ['suma', 'resta', 'multiplicacion', 'division', 'potencia', 'raiz'];
    const type = types[Math.floor(Math.random() * types.length)];

    let q = '', a = 0;

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    switch(type) {
        case 'suma':
            let s1 = randInt(10, 99);
            let s2 = randInt(10, 99);
            q = `¿Cuánto es ${s1} + ${s2}?`;
            a = s1 + s2;
            break;
        case 'resta':
            let r1 = randInt(50, 150);
            let r2 = randInt(10, 49);
            q = `¿Cuánto es ${r1} - ${r2}?`;
            a = r1 - r2;
            break;
        case 'multiplicacion':
            let m1 = randInt(5, 20);
            let m2 = randInt(2, 15);
            q = `¿Cuánto es ${m1} × ${m2}?`;
            a = m1 * m2;
            break;
        case 'division':
            let d2 = randInt(2, 10);
            let d1 = d2 * randInt(2, 15);
            q = `¿Cuánto es ${d1} ÷ ${d2}?`;
            a = d1 / d2;
            break;
        case 'potencia':
            let p1 = randInt(2, 5);
            let p2 = randInt(2, 3);
            q = `¿Cuánto es ${p1} elevado a la ${p2}?`;
            a = Math.pow(p1, p2);
            break;
        case 'raiz':
            let base = randInt(2, 10);
            let sq = base * base;
            q = `¿Cuál es la raíz cuadrada de ${sq}?`;
            a = base;
            break;
    }
    return { question: q, answer: a };
}

// Función para iniciar quiz
function startMathQuiz() {
    if (mathQuizActive) return; // Evitar quiz doble
    const { question, answer } = generateMathQuestion();
    mathQuizQuestion = question;
    mathQuizAnswer = answer;
    mathQuizActive = true;

    world.sendMessage(`§6§l[MathQuiz] §e${question} ¡Responde con §b!resp <respuesta>§e!`);

    // Tiempo límite para responder (60 segundos)
    mathQuizTimeout = system.runTimeout(() => {
        if (mathQuizActive) {
            world.sendMessage(`§cTiempo terminado. La respuesta era: §a${mathQuizAnswer}`);
            world.sendMessage(`§c§l¡Vaya sarta de ignorantes! ¡Respondan la próxima vez!`);
            mathQuizActive = false;
            mathQuizAnswer = null;
            mathQuizQuestion = '';
        }
    }, 20 * 60);
}

// Función para responder quiz
function answerMathQuiz(player, msg) {
    if (!mathQuizActive) {
        player.sendMessage('§cNo hay ningún MathQuiz activo ahora.');
        return;
    }
    let parts = msg.split(' ');
    if (parts.length < 2) {
        player.sendMessage('§cUso: !resp <respuesta>');
        return;
    }
    let respRaw = parts.slice(1).join(' ').trim();
    let respNum = Number(respRaw);
    if (isNaN(respNum)) {
        player.sendMessage('§cRespuesta inválida, debe ser un número.');
        return;
    }
    if (Math.abs(respNum - mathQuizAnswer) < 0.001) { // Permite margen mínimo por decimales
        player.sendMessage('§a¡Respuesta correcta! ¡Felicidades!');
        world.sendMessage(`§d§l${player.name} ha ganado el MathQuiz y recibe 10 XP!`);

        // Dar XP al jugador
        let xp = player.getDynamicProperty('xp') || 0;
        xp += 10;
        player.setDynamicProperty('xp', xp);

        // Finalizar quiz
        mathQuizActive = false;
        mathQuizAnswer = null;
        mathQuizQuestion = '';

        if (mathQuizTimeout) {
            system.clearTimeout(mathQuizTimeout);
            mathQuizTimeout = null;
        }
    } else {
        player.sendMessage('§cRespuesta incorrecta. Sigue intentando!');
    }
}

// Agregar dentro del manejador de chat:

world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;
    const message = event.message;

    if (!message.startsWith('!')) return;

    const command = message.split(' ')[0].toLowerCase();

    if (command === '!mathquiz') {
        if (mathQuizActive) {
            player.sendMessage(`§6[MathQuiz] Pregunta activa: §e${mathQuizQuestion}`);
        } else {
            player.sendMessage('§6[MathQuiz] No hay quiz activo. Espera la siguiente ronda.');
        }
        event.cancel = true;
    }

    if (command === '!resp') {
        answerMathQuiz(player, message);
        event.cancel = true;
    }
});

// Programar inicio automático cada 5 minutos

function scheduleMathQuiz() {
    startMathQuiz();
    system.runTimeout(() => {
        scheduleMathQuiz();
    }, 20 * 60 * 5); // 5 minutos
}

system.run(() => {
    scheduleMathQuiz();
})










// AYUDA
function showHelp(player) {
  const helpMessages = [
    "§6==== §l§eCOMANDOS DISPONIBLES§r §6====",
    "§e!help §7- Muestra esta ayuda",
    "§e!balance §7- Consulta tu saldo de monedas",
    "§e!rank §7- Muestra tu rango y nivel",
    "§e!level §7- Muestra tu nivel",
    "§e!xp §7- Muestra tu experiencia actual",
    "§e!tpa <jugador> §7- Solicita teletransporte",
    "§e!si §7- Acepta solicitud de teletransporte",
    "§e!setwarp <nombre> §7- (Admins) Establece warp",
    "§e!warp [nombre] §7- Lista o te teletransporta a warp",
    "§e!mathquiz §7- Inicia un quiz matemático",
    "§e!mission §7- Consulta la misión semanal activa",
  ];
  helpMessages.forEach(msg => player.sendMessage(msg));
}









// CONSTANTES DEL SISTEMA DE PROPIEDADES
const PROPERTY_SIZE = 10; // Tamaño del terreno 
const PROPERTY_HEIGHT = 6; // Altura vertical
const PROPERTY_BASE_COST = 5000;  // Precio inicial 
const PROPERTY_COST_MULTIPLIER = 2.5; // Factor multiplicador por propiedad adquirida

// FUNCIONES 

function getPlayerPropertyCount(player) {
  const count = player.getDynamicProperty('propertyCount');
  return count ? count : 0;
}

function setPlayerPropertyCount(player, count) {
  player.setDynamicProperty('propertyCount', count);
}

function tryChargePlayer(player, amount) {
  const balance = player.getDynamicProperty('money') || 0;
  if (balance < amount) return false;
  player.setDynamicProperty('money', balance - amount);
  return true;
}

function addMoneyToPlayer(player, amount) {
  const balance = player.getDynamicProperty('money') || 0;
  player.setDynamicProperty('money', balance + amount);
}

function calculatePropertyCost(player) {
  const currentCount = getPlayerPropertyCount(player);
  return Math.floor(PROPERTY_BASE_COST * Math.pow(PROPERTY_COST_MULTIPLIER, currentCount));
}

function isInsideArea(pos, area) {
  return (
    pos.x >= area.minX && pos.x <= area.maxX &&
    pos.y >= area.minY && pos.y <= area.maxY &&
    pos.z >= area.minZ && pos.z <= area.maxZ
  );
}

function sendMessage(player, msg) {
  player.sendMessage(msg);
}

// COMANDOS DE PROPIERTYS

world.beforeEvents.chatSend.subscribe(event => {
  const player = event.sender;
  const message = event.message.trim();
  if (!message.startsWith('!')) return; // Solo comandos
  event.cancel = true; // Cancelar envío normal

  const args = message.split(' ');
  const command = args[0].toLowerCase();

  if (command === '!buyproperty') {
    if (args.length < 2) {
      sendMessage(player, "§cUso correcto: !buyproperty <nombre>");
      return;
    }
    const propName = args[1].toLowerCase();

    if (!/^[a-z0-9_-]{1,16}$/.test(propName)) {
      sendMessage(player, "§cNombre inválido. Usa letras, números, guion bajo o guion, hasta 16 caracteres.");
      return;
    }

    if (world.getDynamicProperty(`property:${propName}`)) {
      sendMessage(player, `§cYa existe una propiedad llamada '${propName}'.`);
      return;
    }

    const cost = calculatePropertyCost(player);
    if (!tryChargePlayer(player, cost)) {
      sendMessage(player, `§cNo tienes suficiente dinero. Precio requerido: ${cost} monedas.`);
      return;
    }

    const pos = player.location;
    const dim = player.dimension.id;

    const area = {
      minX: Math.floor(pos.x),
      minY: Math.floor(pos.y),
      minZ: Math.floor(pos.z),
      maxX: Math.floor(pos.x) + PROPERTY_SIZE,
      maxY: Math.floor(pos.y) + PROPERTY_HEIGHT,
      maxZ: Math.floor(pos.z) + PROPERTY_SIZE,
    };

    // Verificar que no se robe con propiedades existentes
    const propIds = world.getDynamicPropertyIds().filter(id => id.startsWith('property:'));
    for (const pid of propIds) {
      const propDataRaw = world.getDynamicProperty(pid);
      if (!propDataRaw) continue;
      const propData = JSON.parse(propDataRaw);
      if (propData.dimension !== dim) continue;

      // Comprobar solapamiento 
      if (!(
        area.maxX < propData.area.minX || area.minX > propData.area.maxX ||
        area.maxY < propData.area.minY || area.minY > propData.area.maxY ||
        area.maxZ < propData.area.minZ || area.minZ > propData.area.maxZ
      )) {
        sendMessage(player, `§cError: La propiedad '${pid.slice(9)}' se superpone con el área que intentas comprar.`);
        // Reembolsar dinerito
        addMoneyToPlayer(player, cost);
        return;
      }
    }

    const propertyData = {
      owner: player.name,
      dimension: dim,
      area: area,
      boughtAt: Date.now(),
      price: cost,
      forSale: false,
      salePrice: null,
      mortgaged: false,
      mortgageDebt: 0,
      mortgageLender: null
    };

    world.setDynamicProperty(`property:${propName}`, JSON.stringify(propertyData));
    setPlayerPropertyCount(player, getPlayerPropertyCount(player) + 1);

    sendMessage(player, `§aHas comprado la propiedad '${propName}' por ${cost} monedas. Área delimitada de ${PROPERTY_SIZE}x${PROPERTY_HEIGHT}x${PROPERTY_SIZE} bloques.`);
    return;
  }

  if (command === '!propertyinfo') {
    if (args.length < 2) {
      sendMessage(player, "§cUso: !propertyinfo <nombre>");
      return;
    }
    const propName = args[1].toLowerCase();
    const propRaw = world.getDynamicProperty(`property:${propName}`);
    if (!propRaw) {
      sendMessage(player, `§cNo existe propiedad con ese nombre.`);
      return;
    }
    const prop = JSON.parse(propRaw);
    const info = `
§l§6Información de la propiedad '${propName}':§r
Propietario: §b${prop.owner}
Dimensión: §e${prop.dimension}
Área: X(${prop.area.minX} → ${prop.area.maxX}), Y(${prop.area.minY} → ${prop.area.maxY}), Z(${prop.area.minZ} → ${prop.area.maxZ})
Estado: ${prop.forSale ? `§aEn venta por ${prop.salePrice} monedas` : (prop.mortgaged ? "§cHipotecada" : "§fNo está en venta")}
Hipoteca: ${prop.mortgaged ? `§cDeuda ${prop.mortgageDebt} con ${prop.mortgageLender}` : "Ninguna"}
Fecha compra: ${new Date(prop.boughtAt).toLocaleString()}
    `;
    sendMessage(player, info.trim());
    return;
  }

  if (command === '!sellproperty') {
    if (args.length < 3) {
      sendMessage(player, "§cUso: !sellproperty <nombre> <precio>");
      return;
    }
    const propName = args[1].toLowerCase();
    const price = Number(args[2]);
    if (isNaN(price) || price <= 0) {
      sendMessage(player, "§cPrecio inválido.");
      return;
    }
    const propRaw = world.getDynamicProperty(`property:${propName}`);
    if (!propRaw) {
      sendMessage(player, "§cNo existe propiedad con ese nombre.");
      return;
    }
    const prop = JSON.parse(propRaw);
    if (prop.owner !== player.name) {
      sendMessage(player, "§cSólo el propietario puede poner a la venta su propiedad.");
      return;
    }
    if (prop.mortgaged) {
      sendMessage(player, "§cNo puedes vender una propiedad hipotecada.");
      return;
    }
    prop.forSale = true;
    prop.salePrice = price;
    world.setDynamicProperty(`property:${propName}`, JSON.stringify(prop));
    sendMessage(player, `§aHas puesto en venta la propiedad '${propName}' por ${price} monedas.`);
    return;
  }

  if (command === '!buyfrom') {
    if (args.length < 2) {
      sendMessage(player, "§cUso: !buyfrom <nombre>");
      return;
    }
    const propName = args[1].toLowerCase();
    const propRaw = world.getDynamicProperty(`property:${propName}`);
    if (!propRaw) {
      sendMessage(player, "§cNo existe propiedad con ese nombre.");
      return;
    }
    const prop = JSON.parse(propRaw);
    if (!prop.forSale) {
      sendMessage(player, "§cLa propiedad no está a la venta.");
      return;
    }
    if (prop.owner === player.name) {
      sendMessage(player, "§cNo puedes comprarte tu propia propiedad.");
      return;
    }
    if (!tryChargePlayer(player, prop.salePrice)) {
      sendMessage(player, `§cNo tienes suficiente dinero para comprar esta propiedad. Precio: ${prop.salePrice} monedas.`);
      return;
    }

    // Transferir dinero 
    const ownerPlayer = [...world.getPlayers()].find(p => p.name === prop.owner);
    if (ownerPlayer) {
      addMoneyToPlayer(ownerPlayer, prop.salePrice);
      sendMessage(ownerPlayer, `§aTu propiedad '${propName}' ha sido vendida a ${player.name} por ${prop.salePrice} monedas.`);
    }

    // Actualizar propiedad
    prop.owner = player.name;
    prop.forSale = false;
    prop.salePrice = null;
    world.setDynamicProperty(`property:${propName}`, JSON.stringify(prop));

    // Actualizar contadores de propiedades
    setPlayerPropertyCount(player, getPlayerPropertyCount(player) + 1);
    if (ownerPlayer) setPlayerPropertyCount(ownerPlayer, getPlayerPropertyCount(ownerPlayer) - 1);

    sendMessage(player, `§aHas comprado la propiedad '${propName}' por ${prop.salePrice} monedas.`);
    return;
  }

  if (command === '!mortgage') {
    if (args.length < 2) {
      sendMessage(player, "§cUso: !mortgage <nombre>");
      return;
    }
    const propName = args[1].toLowerCase();
    const propRaw = world.getDynamicProperty(`property:${propName}`);
    if (!propRaw) {
      sendMessage(player, "§cNo existe propiedad con ese nombre.");
      return;
    }
    const prop = JSON.parse(propRaw);
    if (prop.owner !== player.name) {
      sendMessage(player, "§cSólo el propietario puede hipotecar su propiedad.");
      return;
    }
    if (prop.mortgaged) {
      sendMessage(player, "§cLa propiedad ya está hipotecada.");
      return;
    }
    // Hipoteca
    const mortgageAmount = Math.floor(prop.price * 0.5);
    addMoneyToPlayer(player, mortgageAmount);

    prop.mortgaged = true;
    prop.mortgageDebt = mortgageAmount;
    prop.mortgageLender = "Banco Real"; // Puede extenderse 
    world.setDynamicProperty(`property:${propName}`, JSON.stringify(prop));
    sendMessage(player, `§aHas hipotecado '${propName}'. Recibiste ${mortgageAmount} monedas. Debes pagar para liberar.`);
    return;
  }

  if (command === '!paymortgage') {
    if (args.length < 2) {
      sendMessage(player, "§cUso: !paymortgage <nombre>");
      return;
    }
    const propName = args[1].toLowerCase();
    const propRaw = world.getDynamicProperty(`property:${propName}`);
    if (!propRaw) {
      sendMessage(player, "§cNo existe propiedad con ese nombre.");
      return;
    }
    const prop = JSON.parse(propRaw);
    if (prop.owner !== player.name) {
      sendMessage(player, "§cSólo el propietario puede pagar la hipoteca.");
      return;
    }
    if (!prop.mortgaged) {
      sendMessage(player, "§cLa propiedad no está hipotecada.");
      return;
    }
    if (!tryChargePlayer(player, prop.mortgageDebt)) {
      sendMessage(player, `§cNo tienes suficiente dinero para pagar la hipoteca. Deuda: ${prop.mortgageDebt} monedas.`);
      return;
    }

    prop.mortgaged = false;
    prop.mortgageDebt = 0;
    prop.mortgageLender = null;
    world.setDynamicProperty(`property:${propName}`, JSON.stringify(prop));
    sendMessage(player, `§aHipoteca pagada. La propiedad '${propName}' está libre de cargas.`);
    return;
  }

  if (command === '!foreclose') {
    if (args.length < 2) {
      sendMessage(player, "§cUso: !foreclose <nombre>");
      return;
    }
    const propName = args[1].toLowerCase();
    const propRaw = world.getDynamicProperty(`property:${propName}`);
    if (!propRaw) {
      sendMessage(player, "§cNo existe propiedad con ese nombre.");
      return;
    }
    const prop = JSON.parse(propRaw);
    // Sólo el banco (o jugador prestamista)
    if (!prop.mortgaged) {
      sendMessage(player, "§cLa propiedad no está hipotecada.");
      return;
    }
    // Ejemplo: si han pasado 3 días desde la hipoteca
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - prop.boughtAt < threeDays) {
      sendMessage(player, "§cAún no ha vencido el plazo para embargo.");
      return;
    }
    // Embargo: propiedad vuelve al banco
    prop.owner = "Banco Real";
    prop.forSale = true;
    prop.salePrice = prop.price;
    prop.mortgaged = false;
    prop.mortgageDebt = 0;
    prop.mortgageLender = null;
    world.setDynamicProperty(`property:${propName}`, JSON.stringify(prop));

    sendMessage(player, `§aEmbargo realizado sobre '${propName}'. Ahora está en manos del Banco Real y en venta.`);
    return;
  }

  if (command === '!myproperties') {
    // Lista todas las propiedades del jugador
    const propIds = world.getDynamicPropertyIds().filter(id => id.startsWith('property:'));
    let ownedProps = [];
    for (const pid of propIds) {
      const propRaw = world.getDynamicProperty(pid);
      if (!propRaw) continue;
      const prop = JSON.parse(propRaw);
      if (prop.owner === player.name) ownedProps.push(pid.slice(9));
    }
    if (ownedProps.length === 0) {
      sendMessage(player, "§cNo tienes propiedades.");
      return;
    }
    sendMessage(player, `§aTus propiedades: ${ownedProps.join(', ')}`);
    return;
  }



  sendMessage(player, "§cComando no reconocido.");
});

// EVENTO
function isActionAllowed(player, blockPos, dimension) {
  const propIds = world.getDynamicPropertyIds().filter(id => id.startsWith('property:'));
  for (const pid of propIds) {
    const propRaw = world.getDynamicProperty(pid);
    if (!propRaw) continue;
    const prop = JSON.parse(propRaw);
    if (prop.dimension !== dimension) continue;
    if (isInsideArea(blockPos, prop.area)) {
      if (prop.owner !== player.name) {
        if (prop.mortgaged) {
       
          return false;
        }
        return false;
      }
    }
  }
  return true;
}







// TELETRANSPORTE AL SPAWN AL RESPAWN
world.events.playerSpawnAfter.subscribe(event => {
  const player = event.player;
  // Por ejemplo, teletransportar a spawn predeterminado
  const spawnDim = world.getDimension("overworld");
  player.teleport({ x: 155, y: 95, z: -51 }, { dimension: spawnDim });
  player.sendMessage("§aBienvenido al spawn!");
 
 





 
 // WARPS
 
 const WARPS_KEY = 'serverWarps';

// Función para obtener todos los warps guardados
function getWarps() {
  const warpsRaw = world.getDynamicProperty(WARPS_KEY);
  if (!warpsRaw) return {};
  try {
    return JSON.parse(warpsRaw);
  } catch {
    return {};
  }
}

// Guardar todos los warps
function saveWarps(warps) {
  world.setDynamicProperty(WARPS_KEY, JSON.stringify(warps));
}

// Enviar mensaje colorido
function sendMsg(player, msg) {
  player.sendMessage(msg);
}

// Comando en chat
world.beforeEvents.chatSend.subscribe(event => {
  const player = event.sender;
  const msg = event.message.trim();
  if (!msg.startsWith('!')) return;
  event.cancel = true;

  const args = msg.split(' ');
  const cmd = args[0].toLowerCase();

  // Permisos para admin: aquí simple validación por nombre
  const isAdmin = player.hasTag('admin') || player.isOp;

  if (cmd === '!setwarp') {
    if (!isAdmin) {
      sendMsg(player, '§cSolo administradores pueden crear warps.');
      return;
    }
    if (args.length < 2) {
      sendMsg(player, '§cUso: !setwarp <nombre>');
      return;
    }
    const warpName = args[1].toLowerCase();
    const warps = getWarps();

    warps[warpName] = {
      dimension: player.dimension.id,
      x: player.location.x,
      y: player.location.y,
      z: player.location.z,
      yaw: player.location.yaw,
      pitch: player.location.pitch
    };

    saveWarps(warps);
    sendMsg(player, `§aWarp '${warpName}' creado.`);
    return;
  }

  if (cmd === '!warp') {
    if (args.length < 2) {
      sendMsg(player, '§cUso: !warp <nombre>');
      return;
    }
    const warpName = args[1].toLowerCase();
    const warps = getWarps();
    if (!(warpName in warps)) {
      sendMsg(player, `§cNo existe el warp '${warpName}'.`);
      return;
    }
    const warp = warps[warpName];
    try {
      player.teleport(
        { x: warp.x, y: warp.y, z: warp.z, yaw: warp.yaw, pitch: warp.pitch },
        world.getDimension(warp.dimension)
      );
      sendMsg(player, `§aTeletransportado a '${warpName}'.`);
    } catch (e) {
      sendMsg(player, '§cError al teletransportar.');
    }
    return;
  }

  if (cmd === '!warplist') {
    const warps = getWarps();
    const keys = Object.keys(warps);
    if (keys.length === 0) {
      sendMsg(player, '§cNo hay warps configurados.');
      return;
    }
    sendMsg(player, `§aWarps disponibles: ${keys.join(', ')}`);
    return;
  }

  // Si el comando no es reconocido
  sendMsg(player, '§cComando no reconocido.');
});
 
 
 

//TELEPORTACION 


const tpRequests = new Map(); // clave: targetPlayerName, valor: { sender, timeoutId }

// Enviar solicitud de teletransporte
function sendTpRequest(sender, targetName) {
  if (tpRequests.has(targetName)) {
    sender.sendMessage(`§c${targetName} ya tiene una solicitud pendiente.`);
    return false;
  }
  tpRequests.set(targetName, { sender: sender.name });
  world.sendMessage(`§d${sender.name} ha solicitado teletransportarse a ${targetName}. ${targetName}, escribe !tpaccept o !si para aceptar.`);
  
  // Expirar solicitud en 40 segundos
  const timeoutId = system.runTimeout(() => {
    if (tpRequests.has(targetName)) {
      tpRequests.delete(targetName);
      world.sendMessage(`§cLa solicitud de teletransporte de ${sender.name} a ${targetName} ha expirado.`);
    }
  }, 40 * 20);
  
  tpRequests.get(targetName).timeoutId = timeoutId;
  return true;
}

// Aceptar solicitud
function acceptTpRequest(targetPlayer) {
  const req = tpRequests.get(targetPlayer.name);
  if (!req) {
    targetPlayer.sendMessage('§cNo tienes solicitudes de teletransporte pendientes.');
    return false;
  }
  const senderPlayer = world.getPlayers().find(p => p.name === req.sender);
  if (!senderPlayer) {
    targetPlayer.sendMessage(`§cEl jugador ${req.sender} ya no está en línea.`);
    tpRequests.delete(targetPlayer.name);
    return false;
  }

  // Ejecutar teleport
  senderPlayer.teleport(targetPlayer.location, targetPlayer.dimension);
  senderPlayer.sendMessage(`§aTeletransportado a ${targetPlayer.name}.`);
  targetPlayer.sendMessage(`§aHas aceptado la solicitud de teletransporte de ${senderPlayer.name}.`);
  tpRequests.delete(targetPlayer.name);
  return true;
}

// Manejo de comandos en chat
world.beforeEvents.chatSend.subscribe(event => {
  const player = event.sender;
  const message = event.message.trim().toLowerCase();

  if (!message.startsWith('!')) return;
  event.cancel = true;

  const args = message.split(' ');

  if (args[0] === '!tpa') {
    if (args.length < 2) {
      player.sendMessage('§cUso: !tpa <nombre_jugador>');
      return;
    }
    const targetName = args[1];
    if (targetName === player.name.toLowerCase()) {
      player.sendMessage('§cNo puedes enviarte una solicitud a ti mismo.');
      return;
    }
    const targetPlayer = world.getPlayers().find(p => p.name.toLowerCase() === targetName);
    if (!targetPlayer) {
      player.sendMessage(`§cJugador ${targetName} no encontrado.`);
      return;
    }
    sendTpRequest(player, targetPlayer.name);
    return;
  }

  if (args[0] === '!tpaccept' || args[0] === '!si') {
    acceptTpRequest(player);
    return;
  }

  // Aquí puedes añadir otros comandos o enviar mensaje no reconocido
  player.sendMessage('§cComando no reconocido. Usa !help para ver comandos.');
});




//AYUDA !HELP


world.beforeEvents.chatSend.subscribe(event => {
  const player = event.sender;
  const message = event.message.trim().toLowerCase();

  if (message !== '!help') return;
  event.cancel = true;

  const isAdmin = player.hasTag('admin') || player.isOp;

  let helpMsg = `§g§l===== §dComandos disponibles§r§g =====\n\n` +
  `§e§l— General —\n` +
  `!help - Mostrar esta ayuda\n` +
  `!hora - Mostrar la hora actual\n` +
  `!spawn - Teletransportarse al spawn\n` +
  `!dia - Cambiar a día (provisional)\n` +
  `!clima - Pacificar el clima (provisional)\n\n` +

  `§b§l— Casa y Teletransportes —\n` +
  `!set - Establecer tu casa\n` +
  `!home - Teletransportarte a tu casa\n` +
  `!tpa <jugador> - Solicitar teletransportarte a un jugador\n` +
  `!tpaccept / !si - Aceptar solicitud de teletransporte\n` +
  `!reqs - Ver solicitudes de teletransporte pendientes\n\n` +

  `§a§l— Warps —\n` +
  `!warplist - Listar warps disponibles\n` +
  `!warp <nombre> - Teletransportarse a un warp\n`;

  if (isAdmin) {
    helpMsg +=
    `!setwarp <nombre> - Crear un warp\n` +
    `!delwarp <nombre> - Eliminar un warp\n\n` +

    `§c§l— Administración —\n` +
    `!cleardp - Borrar todas las propiedades dinámicas del mundo\n` +
    `!clearmydp - Borrar tus propiedades dinámicas\n` +
    `!setplayerdp <jugador> <clave> <valor> - Establecer propiedad dinámica\n` +
    `!owner <nombre> - Asignar propietario a un cofre (mirando el bloque)\n` +
    `!update - Reiniciar servidor (kick a todos)\n\n`;
  }

  helpMsg +=
  `§d§l— Economía —\n` +
  `!balance - Mostrar tu saldo\n` +
  `!pay <jugador> <cantidad> - Pagar a otro jugador\n` +
  `!deposit <cantidad> - Depositar dinero en el banco\n` +
  `!withdraw <cantidad> - Retirar dinero del banco\n\n` +

  `§6§l— Misiones y Niveles —\n` +
  `!mission - Ver misión diaria actual\n` +
  `!mission progress - Ver progreso de misión\n` +
  `!levels - Ver tu nivel y experiencia\n` +
  `!leaderboard - Ver tabla de niveles\n\n` +

  `§f§l— Otros —\n` +
  `!mathquiz - Participar en el quiz matemático\n` +
  `!getByte - Bytes usados por propiedades dinámicas\n` +
  `!getAll - Propiedades dinámicas del mundo\n` +
  `!getmyAll - Tus propiedades dinámicas\n`;

  player.sendMessage(helpMsg);
});

 
 
 
 
  // Inicializar XP y nivel
  if (getPlayerLevel(player) === 0) {
    setPlayerLevel(player, 0);
    player.setDynamicProperty("xp", 0);
    player.setDynamicProperty("balance", 0);
  }
});


//Creditos : DuctileCookie (más conocido por su nombre pasado NOTCH)