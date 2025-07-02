import { PlayerSpawnAfterEvent, system, world} from '@minecraft/server';
import { getTime, truncateFloat } from './botUtils.js';
import { setChestOwner } from 'utils/ownershipUtils.js';

let player_TpReqs = [];

// Adds a teleport request from one player to another
function addTpReq(senderName, targetPlayerName) {
    player_TpReqs.push({ sender: senderName, target: targetPlayerName });
    system.runTimeout(() => {
        world.sendMessage(`§cLa peticion de !tp de ${senderName} caducó`);
        try {
            removeTpReq(senderName, targetPlayerName)
        } catch (error) {
            console.error("An error occurred:", error.message);
        }
    }, 800)
}

function removeTpReq(player, targetPlayer) {
  player_TpReqs = player_TpReqs.filter(req => !(req.sender === player && req.target === targetPlayer));
}

world.beforeEvents.chatSend.subscribe((event) => {
  const message = event.message;
  const player = event.sender;
  
    if (!message.startsWith('!')) {
      return; // Ignore messages that are not commands
    } else event.cancel = true; // Prevent the message from being sent to the chat

    if (message === '!help') {
      player.sendMessage(`§g§lComandos disponibles:§r§d
        !hora - Ver la hora actual
        !spawn - Teletransportarse al spawn\n
        <-Provisional-> (Se ELIMINARAN!)
        !dia - Cambiar a dia
        !clima - Pacificar el clima\n
        <-Home->
        !set - Establecer posición de casa
        !home - Teletransportarse a la casa registrada\n
        <-Teleport->
        !reqs - Ver solicitudes de teletransporte pendientes
        !tpa <jugador> - Solicitar teletransporte a otro jugador
        !si - Aceptar solicitud de teletransporte\n
        <-Warp->
        !warp - Teletransportes públicos
        !setwarp <nombre> - Establecer un warp personalizado
        !delwarp <nombre> - Eliminar un warp
      `);
      return;
    }

    if (message === '!hora') {
        let hora = getTime();
        player.sendMessage(`§dLa hora actual es ${hora}`);
        return;
    }

    if (message === '!spawn') {
        system.run(() => {
            const overworld = world.getDimension("overworld");
            if (player) {
                player.teleport({ x: 155, y: 95, z: -51 }, { dimension: overworld });
                player.sendMessage(`Teletransportandote al spawn...`);
            }
        });
        return;
    }

    if (message === '!dia') {
        system.run(() => {
            world.getDimension("overworld").runCommand(`time set sunrise`);
            player.sendMessage('§aEl tiempo ha sido cambiado a día. (cmd provisional)');
        });
        return;
    }

    if (message === '!clima') {
        system.run(() => {
            world.getDimension('overworld').runCommand('weather clear');
            player.sendMessage('§aEl clima ha sido pacificado. (cmd provisional)');
        })
        return;
    }

    if (message === '!set') {
        let pos = player.location;
        let dim = player.dimension.id;

        if (dim !== 'minecraft:overworld') {
            player.sendMessage(`§c¡Por ahora solo puedes establecer tu casa en el Overworld!`);
            return;
        }

        for (let key in pos) {
            pos[key] = truncateFloat(pos[key], 2); // Truncate to 2 decimal places
        }

        const newHomeData = {
            dimension: dim, 
            location: { x: pos.x, y: pos.y, z: pos.z }
        };

        const newHome =  JSON.stringify(newHomeData); // homeData -> JSON homeData
        print(newHome);

        player.setDynamicProperty(`home`, newHome); // Save the home
        player.sendMessage(`§aTu casa ha sido registrada exitosamente. ${player.name}, ${pos.x}, ${pos.y}, ${pos.z}`);
        console.log(`@$houseUpdate ${player.name} ${pos.x} ${pos.y} ${pos.z} ${dim}`);
        return;
    }

    if (message === '!home') {
        const home = player.getDynamicProperty(`home`);
        if (home == undefined) {
            player.sendMessage('§cNo tienes una casa registrada. Usa !set para establecer una.');
            return;
        }

        const homeData = JSON.parse(home);
        const pos = homeData.location;
        const dim = homeData.dimension;

        system.run(() => {
            const dimension = world.getDimension(dim);
            if (dimension) {
                player.teleport({ x: pos.x, y: pos.y, z: pos.z }, { dimension: dimension });
                player.sendMessage(`§aTeletransportándote a tu casa en el ${dim}...`);
            } else {
                player.sendMessage('§cDimensión no encontrada.');
            }
        });
        return;
    }

    if (message === '!reqs') {
        if (player_TpReqs.length === 0) {
            player.sendMessage('§cNo hay solicitudes de teletransporte pendientes.');
        } else {
            const reqsList = player_TpReqs.map(req => `De: ${req.sender} a: ${req.target}`).join('\n');
            player.sendMessage(`§b> Solicitudes de teletransporte pendientes:\n${reqsList}`);
        }
        return;
    }

    if (message.startsWith('!tpa')) {
        const args = message.split(' ');
        if (args.length < 2) {
            player.sendMessage('§cUso: !tpa <jugador> (basta con las primeras letras)');
            return;
        }

        const targetInput = args[1].toLowerCase(); // Normalize target names
        const player_list = world.getPlayers();
        let targetPlayer = '';
        let matches = [];
        
        if (player.name.toLowerCase().startsWith(targetInput)) {
            player.sendMessage(`§cNo puedes teletransportarte a ti mismo.`);
            return;
        }

        for (const p of player_list) {
            if (p.name.toLowerCase().startsWith(targetInput)){
                matches.push(p.name);
            }
        }

        if (matches.length === 0) {
            player.sendMessage(`§cNo se encontró ningún jugador que empiece con "${targetInput}".`);
            return;
        } else if (matches.length > 1) {
            player.sendMessage(`§bCoincidencias múltiples: ${matches.join(', ')}. Sé más específico.`);
            return;
        } else if (player_TpReqs.some(req => req.targetPlayer === targetPlayer)) {
            player.sendMessage(`§bYa tienes una solicitud de teletransporte pendiente para ${targetPlayer}.`);
            return;
        } else {
            targetPlayer = matches[0];
        }

        addTpReq(player.name, targetPlayer);
        world.sendMessage(`§dSolicitud de teletransporte enviada a ${targetPlayer} tiene 40 segundos para aceptar. \n Escribe !si para aceptar.`);
        return;
    }

    if (message === '!si') {
        if (player_TpReqs.some(req => req.target === player.name)){
            let tpReq = player_TpReqs.filter(req =>(req.target === player.name))[0];
            player.sendMessage(`§dSolicitud de teletransporte aceptada`);
            system.run(() => {
                world.getDimension('overworld').runCommand(`tp ${tpReq.sender} ${player.name}`);
            });
            removeTpReq(player.name, tpReq.target);
            return;
        } else {
            player.sendMessage('§dNo tienes solicitudes de teletransporte pendientes');
            return;
        }
    }

    if (message === "!getByte"){
        let xd = world.getDynamicPropertyTotalByteCount()
        player.sendMessage(`§aTotal de bytes usados por propiedades dinámicas: ${xd}`);
        return;
    }

    if (message === "!getAll") {
        let properties = world.getDynamicPropertyIds();
        if (properties.length === 0) {
            player.sendMessage('§cNo hay propiedades dinámicas registradas.');
            return;
        }
        let propertiesList = properties.map(prop => `§b${prop}`).join('\n');
        player.sendMessage(`§aPropiedades dinámicas registradas:\n${propertiesList}`);
        return;
    }

    if (message === "!getmyAll") {
        let properties = player.getDynamicPropertyIds();
        if (properties.length === 0) {
            player.sendMessage('§cNo tienes propiedades dinámicas registradas.');
            return;
        }
        let propertiesList = properties.map(prop => `§b${prop}`).join('\n');
        player.sendMessage(`§aPropiedades dinámicas registradas:\n${propertiesList}`);
        return;
    }

    if (message === "!cleardp") {
        let tags = player.getTags();
        if (!tags.includes("admin")) return; //VALIDATION

        player.sendMessage("§gTodas las propiedades del mundo han sido eliminadas")
        world.clearDynamicProperties();
        return;
    }

    if (message === "!clearmydp") {
        let tags = player.getTags();
        if (!tags.includes("admin")) return; //VALIDATION

        player.sendMessage("§gTodas tus propiedades dinamicas han sido eliminadas")
        player.clearDynamicProperties();
        return;
    }

    if (message.startsWith("!setplayerdp")) {
        let tags = player.getTags();
        if (!tags.includes("admin")) {
            player.sendMessage("§cNo tienes permiso para usar este comando.");
            return; // VALIDATION: Solo admins pueden usar este comando
        }

        const args = message.split(' ');
        if (args.length < 4) {
            player.sendMessage("§cUso: !setplayerdp <jugador> <clave> <valor>");
            player.sendMessage("§eEjemplo: !setplayerdp Steve 'clan:guerreros' 'true'");
            return;
        }

        const targetPlayerName = args[1];
        const dpKey = args[2];
        const dpValue = args.slice(3).join(' '); // El valor puede contener espacios

        // Buscar al jugador objetivo
        const targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetPlayerName.toLowerCase());

        if (!targetPlayer) {
            player.sendMessage(`§cJugador '${targetPlayerName}' no encontrado.`);
            return;
        }

        // Intentar determinar el tipo de valor (número, booleano, string)
        let finalValue;
        if (dpValue.toLowerCase() === 'true') {
            finalValue = true;
        } else if (dpValue.toLowerCase() === 'false') {
            finalValue = false;
        } else if (!isNaN(Number(dpValue)) && !isNaN(parseFloat(dpValue))) {
            finalValue = Number(dpValue);
        } else {
            finalValue = dpValue; // Dejar como string si no es booleano ni número
        }

        try {
            targetPlayer.setDynamicProperty(dpKey, finalValue);
            player.sendMessage(`§aPropiedad dinámica '${dpKey}' de '${targetPlayer.name}' establecida a: '${finalValue}' (${typeof finalValue}).`);
            // Opcional: Notificar al jugador modificado (si está en línea)
            if (targetPlayer.isOnline) {
                targetPlayer.sendMessage(`§bTu propiedad '${dpKey}' ha sido modificada a: '${finalValue}'.`);
            }
        } catch (error) {
            player.sendMessage(`§cError al establecer la propiedad: ${error.message}`);
        }
        return;
    }

    if (message.startsWith("!owner")) {
        let tags = player.getTags();
        if (!tags.includes("admin")) return; //VALIDATION

        const args = message.split(' ');
        let newOwner;
        if (args.length < 2) {
            newOwner = "unknown";
        } else newOwner = args[1];

        const blockHit = player.getBlockFromViewDirection();
        if (blockHit) {
            setChestOwner(blockHit.block, newOwner);
        }
        player.sendMessage("§gSet new owner as: " + newOwner)
        return;
    }

    // Nuevo comando !setwarp
    if (message.startsWith('!setwarp')) {
        const args = message.split(' ');
        if (args.length < 2) {
            player.sendMessage('§cUso: !setwarp <nombre_del_warp>');
            return;
        }

        const warpName = args[1].toLowerCase();
        const alreadyExists = world.getDynamicProperty(`warp:${warpName}`);
        
        if (alreadyExists !== undefined) {
            player.sendMessage('§cYa existe un warp con ese nombre');
            return;
        }

        const dim = player.dimension.id;
        if (dim === 'minecraft:nether') {
            player.sendMessage('§c§oSolo el §k§jNether King§r §o§cpuede establecer un warp en el nether');
            system.run(()=>{
                player.playSound("ambient.cave", player.location); 
            });
            return;
        }

        if (dim === 'minecraft:end') {
            player.sendMessage('§c§oSolo el §k§4Dragon Slayer§r §o§cpuede establecer un warp en el end');
            system.run(()=>{
                player.playSound("entity.enderdragon.death", player.location);
            });
            return;
        }
        
        if (getPlayerWarpC(player) >= 1) {
            player.sendMessage('§cNo puedes añadir mas warps ahora, elimina algunos con !delwarp');
            return;
        }

        const pos = player.location;

        // Opcional: Truncar coordenadas
        for (let key in pos) {
            pos[key] = truncateFloat(pos[key], 2);
        }

        const newWarpData = {
            dimension: dim, 
            location: { x: pos.x, y: pos.y, z: pos.z },
            owner: player.name
        };

        // Guardar el warp como una propiedad dinámica
        world.setDynamicProperty(`warp:${warpName}`, JSON.stringify(newWarpData));
        player.sendMessage(`§aWarp '${warpName}' establecido en X:${pos.x}, Y:${pos.y}, Z:${pos.z} en la dimensión: ${dim}.`);
        addToPlayerWarpC(player);
        return;
    }

    // Modificación del comando !warp
    if (message === '!warp') {
        let availableWarps = [];

        // Obtener warps personalizados
        const dynamicProperties = world.getDynamicPropertyIds();
        dynamicProperties.forEach(propId => {
            if (propId.startsWith('warp:')) {
                const customWarpName = propId.substring(5); // Eliminar 'warp:' del inicio
                availableWarps.push(customWarpName);
            }
        });

        if (availableWarps.length > 0) {
            player.sendMessage(`§l§6Warps disponibles:§r§e\n${availableWarps.map(w => `!warp ${w}`).join('\n')}`);
        } else {
            player.sendMessage('§cNo hay warps disponibles.');
        }
        return;
    }

    if (message.startsWith('!warp ')) {
        const args = message.split(' ');
        const warpName = args[1].toLowerCase();
        let targetLocation;
        let targetDimension;
        let messageText;

        // Intentar cargar el warp personalizado primero
        const customWarpData = world.getDynamicProperty(`warp:${warpName}`);
        if (customWarpData) {
            const parsedWarp = JSON.parse(customWarpData);
            targetLocation = parsedWarp.location;
            targetDimension = world.getDimension(parsedWarp.dimension);
            messageText = `¡Teletransportándote al warp personalizado '${warpName}'!`;
        }
        system.run(() => {
            if (player && targetDimension) {
                player.teleport(targetLocation, { dimension: targetDimension });
                player.sendMessage(`§a${messageText}`);
            } else if (player) {
                player.sendMessage('§cError: La dimensión de destino no se pudo cargar.');
            }
        });
        return;
    }

    if (message.startsWith('!delwarp')) {
        const args = message.split(' ');
        if (args.length < 2) {
            player.sendMessage("§cUso: !delwarp <nombre_del_warp>");
            return;
        };
        const warpName = args[1].toLowerCase();

        // Intentar cargar el warp personalizado primero
        const customWarpData = world.getDynamicProperty(`warp:${warpName}`);
        if (customWarpData) {
            const parsedWarp = JSON.parse(customWarpData);
            if (parsedWarp.owner === player.name){
                world.setDynamicProperty(`warp:${warpName}`, undefined)
                restToPlayerWarpC(player);
                player.sendMessage(`§dWarp ${warpName} ha sido eliminado`)
            } else player.sendMessage("§cEse warp no es tuyo");
        } else {
            player.sendMessage("§cEse warp no existe")
        }
        return;
    }

    event.cancel = false; // Prevent the message from being sent to the chat
    player.sendMessage(`§eComando no reconocido. Usa !help para ver la lista de comandos disponibles.`);
})

function getPlayerWarpC(player){
    let wCount = player.getDynamicProperty("warp:count");
    if (wCount == undefined) {
        return 0;
    } else return wCount;
}

function addToPlayerWarpC(player){
    let wpc = getPlayerWarpC(player);
    wpc++;
    player.setDynamicProperty("warp:count", wpc);
    return;
}

function restToPlayerWarpC(player){
    let wpc = getPlayerWarpC(player);
    wpc--;
    player.setDynamicProperty("warp:count", wpc);
    return;
}


// let secondsPassed = 0;

// function mainTick() {
//   if (system.currentTick % 200 === 0) {
//     secondsPassed += 10;
//     world.sendMessage("\nSeconds Passed: " + secondsPassed);
//     world.sendMessage('Getting dynamic properties...');
//     let propertyCount = world.getDynamicPropertyIds().length;
//     world.sendMessage("> Actual current property count: " + propertyCount);
//   }
//   system.run(mainTick);
// }



// system.run(mainTick);