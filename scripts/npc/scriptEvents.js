import { system, world } from "@minecraft/server";
import { displayActionBar, formatCountdown } from "../utils/displayUtils";
import { getTime } from "../bot/botUtils";


export let MISSION_END = false;
export let GIFT_COUNT = 0;
export let FOUND_GIFT_COUNT = 0;
let GIVE_AWARDS = true;

export let Events = {
    "elfo_1" : "elfo_1_win",
    "silvan_jefe_inicio" : "silvan_jefe_win",
    "holly_elfo_inicio": "holly_elfo_win",
    "ivy_elfo_inicio": "ivy_elfo_win",
    "papa_noel" : "papa_noel_win",
    "viajero" : "viajero_win"
}

// Get info from stored variables
world.afterEvents.worldLoad.subscribe(() => {
    loadStoredVariables();
});

function loadStoredVariables() {
    const missionEnd = world.getDynamicProperty("christmas_mission_end");
    if (missionEnd != undefined) MISSION_END = missionEnd;
    const giftCount = world.getDynamicProperty("christmas_gift_count");
    if (giftCount != undefined) GIFT_COUNT = giftCount;
    const foundGiftCount = world.getDynamicProperty("christmas_found_gift_count");
    if (foundGiftCount != undefined) FOUND_GIFT_COUNT = foundGiftCount;
    const giveAwards = world.getDynamicProperty("christmas_give_awards");
    if (giveAwards != undefined) GIVE_AWARDS = giveAwards; 
    
    console.log(`§a[Loader] Christmas mission status loaded: MISSION_END=${MISSION_END}, GIFT_COUNT=${GIFT_COUNT}, FOUND_GIFT_COUNT=${FOUND_GIFT_COUNT}`);
    countdownToGifts();
};


system.afterEvents.scriptEventReceive.subscribe((event)=> {
    // const event = {id, initiator?, message, sourceBlock?, sourceEntity?, sourceType}
    console.log(`§7§oAny script event( id ${event.id}) : ${event.message}`);
    
    // Handle open dialogue reqs
    if (event.id == 'event:dialogue') {
        if (event.sourceEntity && event.initiator) openDialogue(event);
    };

    // Handle reset mission
    if (event.id == "event:reset" ) {
        MISSION_END = false;
        GIFT_COUNT = 0;
        FOUND_GIFT_COUNT = 0;
        event.sourceEntity?.sendMessage(`§aMisión reiniciada.`);

        // Reset stored variables
        world.setDynamicProperty("christmas_mission_end", false);
        world.setDynamicProperty("christmas_gift_count", 0);
        world.setDynamicProperty("christmas_found_gift_count", 0);
        world.setDynamicProperty("christmas_give_awards", true);
    }

    // Handle display time
    if (event.id == "event:display") {
        const source = event.sourceEntity;
        const location = source.getHeadLocation();
        const message = event.message;

        if (message == "counter" || message == '') {
            // Spawn entity that will display countdown
            const countdownEntity = source.dimension.spawnEntity("stuff:floating_text", {x: location.x, y: location.y, z: location.z});
            world.setDynamicProperty("christmas_countdown_entity_id", countdownEntity.id);
        }
        
        if (message == "info" || message == '') {
            const informationEntity = source.dimension.spawnEntity("stuff:floating_text", {x: location.x, y: location.y - ((message == '') ? 2 : 0), z: location.z});
            world.setDynamicProperty("christmas_information_entity_id", informationEntity.id);
        }

        source.sendMessage(`§aSpawned entity that will display time and/or info`);
    }

    // Handle big gift location set
    if (event.id == "event:gift_location") {
        const source = event.sourceEntity;
        const location = source.location;
        world.setDynamicProperty("christmas_big_gift_location", {x: location.x, y: location.y, z: location.z});
        source.sendMessage(`§aUbicación del gran regalo establecida.`);
    }
    

    // Handle win
    if (event.id == "event:win" ) {
        if (event.message == "true") {
            win();
        } else {
            // Mission end false
            world.setDynamicProperty("christmas_mission_end", false);
            MISSION_END = false;
        }
    }

    if (event.id == "system:reload") {
        // TODO
    }
})

// Handle gift count
world.afterEvents.playerPlaceBlock.subscribe((event)=> {
    const placedBlock = event.block.permutation.type.id;
    if (placedBlock == "christmas:gift_block" && event.player.getGameMode() === "Creative") {
        GIFT_COUNT++;
        displayActionBar( event.player, `§aRegalos colocados: §7( ${GIFT_COUNT} ) §eEncontrados: §5( ${FOUND_GIFT_COUNT} )`);
        world.setDynamicProperty("christmas_gift_count", GIFT_COUNT);
    }

});

// Handle found gift count
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    if (FOUND_GIFT_COUNT >= GIFT_COUNT) return; // Discard case, all gifts found 
    if (event.player.getGameMode() == "Creative") {
        GIFT_COUNT--;
        return;  // Discard case, operator adjustements
    }

    // Add to gift found count
    FOUND_GIFT_COUNT += 1;
    event.player.setDynamicProperty("gifts_found", FOUND_GIFT_COUNT);
    world.setDynamicProperty("christmas_found_gift_count", FOUND_GIFT_COUNT);
    displayActionBar(event.player, `§a[✔] Regalo: §7( ${FOUND_GIFT_COUNT} / ${GIFT_COUNT} )`);

    // If all gifts found
    if (FOUND_GIFT_COUNT == GIFT_COUNT) {
        win();
    }
}, {blockTypes: ["christmas:gift_block"]});


function openDialogue(event) {
    const attempt = event.message
    let dialogue = "";

    if (!Object.hasOwn(Events, attempt)) return;
    
    // Si la mision ya se acabo
    if (MISSION_END) {
        dialogue = Events[attempt];
    
    } else {
        // De otra forma
        dialogue = attempt;
    }
    
    const targetPlayer = event.initiator; // player that started the dialogue
    system.runTimeout(()=> {
        event.sourceEntity.runCommand(`dialogue open @s ${targetPlayer.nameTag} ${dialogue}`);
    }, 1);
}

function win() {
    // Set stored variable
    world.setDynamicProperty("christmas_mission_end", true);
    MISSION_END = true;
    
    const overworld = world.getDimension("Overworld")
    
    world.sendMessage(`§a¡Misión navideña completada!`);
    system.run(()=> {
        // Tell players
        overworld.runCommand(`title @a title §6§l¡Misión Completada!`);
        overworld.runCommand(`title @a subtitle §eSe han encontrado todos los regalos.`);
        overworld.runCommand(`playsound random.levelup @a`);

        // Kill grinch entities
        overworld.runCommand(`kill @e[type=christmas:grinchiloko]`);
        overworld.runCommand(`kill @e[type=christmas:grinchinion]`);
        overworld.runCommand(`kill @e[type=christmas:grinchiloko_doll]`);

        // Spawn fireworks
        let tmpval = 0;
        system.runInterval(()=> {
            if (tmpval++ >= 10) return;
            overworld.runCommand(`execute at @a run summon fireworks_rocket`);
        }, 20);

        // teleport players to gift area
        const bigGiftLocation = world.getDynamicProperty("christmas_big_gift_location");
        if (bigGiftLocation) overworld.runCommand(`tp @a ${bigGiftLocation.x} ${bigGiftLocation.y} ${bigGiftLocation.z}`);
    
        // Spawn Big Gift
        if (bigGiftLocation) {
            const gift_block = overworld.spawnEntity("stuff:big_gift", {x: bigGiftLocation.x, y: bigGiftLocation.y + 10, z: bigGiftLocation.z });
            world.setDynamicProperty("christmas_gift_entity_id", gift_block.id);
        }
    })
}

function countdownToGifts() {
    // Get floating text entity id
    const id = world.getDynamicProperty("christmas_countdown_entity_id");
    const displayId = world.getDynamicProperty("christmas_information_entity_id");
    if (!id || !displayId) {
        console.log(`§c[Error] ${displayId ? "Countdown entity" : "information entity" } id not found... Retrying next tick!`);
        system.runTimeout(() => countdownToGifts(), 20);
        return;
    }

    // Get the entity
    const counterEntity = world.getEntity(id)
    const displayEntity = world.getEntity(displayId);
    
    // 28 de enero de 2026 a las 09:00 AM
    const FECHA_FIN = new Date(2026, 0, 30, 12, 0, 0);
    
    const countdown = system.runInterval(() => {
        // Validamos que la entidad exista
        if (!counterEntity || !counterEntity.isValid || !displayEntity || !displayEntity.isValid) {
            // Timeout required for proper world loading 
            console.log(`§c[Error] Countdown entity with id ${id} not found or invalid... Retrying next second!`);
            
            system.clearRun(countdown);
            countdownToGifts();
            return;
        };

        const currentTime = getTime(true);
        const timeDiff = FECHA_FIN - currentTime; TODO:

        if (timeDiff <= 0) {
            counterEntity.nameTag = "§e¡Los regalos han llegado! \n§a¡Feliz §bN§aa§cv§di§gd§aa§6d§a!";
            let celebrationText = "--------------------------------\n";
            celebrationText += "§fTodas las entidades del server han sido salvadas\n"
            celebrationText += "§fpor su heroica y veloz intervención!\n"
            celebrationText += "§fEl §cpolo norte§f les estara siempre agradecido...\n"
            celebrationText += "§fAhora empieza la §af§fi§ce§as§ft§ca§f de los §aregalos§f!!\n"
            celebrationText += "--------------------------------\n";
            displayEntity.nameTag = celebrationText;
            const randomNumber = (range) => Math.floor(Math.random()*(range*2))-range;
            if (Math.random() < 0.3) displayEntity.runCommand(`summon fireworks_rocket ~${randomNumber(4)} ~4 ~${randomNumber(4)}`)
            
            if ( GIVE_AWARDS && world.getAllPlayers().length > 0 ) {
                GIVE_AWARDS = false;
                world.setDynamicProperty("christmas_give_awards", false)

                const awardsLocation = world.getDynamicProperty("christmas_big_gift_location");
                giveAwards(awardsLocation);
            }
            
            
            return;
        }

        // Aplicamos el formato factorizado
        const timeString = formatCountdown(timeDiff);
        
        // Colores para darle emoción!!
        let colorReloj = "§a"; // Verde por defecto (más de 1 hora)

        if (timeDiff < 60000) {
            colorReloj = "§c"; // Rojo (menos de 1 minuto)
        } 
        else if (timeDiff < 3600000) {
            colorReloj = "§e"; // Amarillo (menos de 1 hora)
        }

        if (MISSION_END) {
            // Actualizar banners si ya se termino la mision
            counterEntity.nameTag = `§l§g[MISION CUMPLIDA]\n§l§bLOGRARON RECUPERAR LOS REGALOS!!\n§f§oEl regalo se abre en:\n§r${colorReloj}${timeString}\n`;
        } else {
            // Actualizar banners si no se ha terminado la mision
            counterEntity.nameTag = `§l§9MISION EN PROGRESO!!\n§rTiempo restante:\n${colorReloj}${timeString}\n`;
            counterEntity.nameTag += getMissionStatus();
        }
        displayEntity.nameTag = getMissionDescription();

    }, 20);
}

export function getMissionStatus() {
    // Returns string with info about current recovered gifts count and total gifts count
    // Porcentaje de la mision completado: XX%, tambien muestra el conteo de regalos encontrados y totales
    let status = "";
    const percentage = GIFT_COUNT > 0 ? Math.floor((FOUND_GIFT_COUNT / GIFT_COUNT) * 100) : 0;
    status += `§fPorcentaje de la misión completado: §d${percentage}%\n`;
    
    if (FOUND_GIFT_COUNT > 0) {
        status += `§fRegalos recuperados [§a${FOUND_GIFT_COUNT} §f/ §a${GIFT_COUNT}§f]\n`;
    }

    return status; 
}

function getMissionDescription() {
    // Returns string with info about what the mission is about
    let description = "--------------------------------\n";
    if (MISSION_END) {
        description += "§fLograste salvar la navidad!!\n";
        description += "§bEs hora de celebrar!!\n";
        description += "§fLa fiesta de los regalos comenzará pronto\n";
        
    } else if (FOUND_GIFT_COUNT > 0) {
        description += "§f[ INFORMACION DEL EVENTO ]\n";
        description += "§7El grinch ha robado todos los regalos\n";
        description += "§7¡¡Debes recuperarlos antes de que el evento termine!!\n";
        description += "§7Para ello aventurate en las profundidades de su guarida\n";
        description += "§7para recuperar los regalos\n";
        description += "§7¡Sé el primero en encontrarlos, al final hay §apremios§7!\n";
        description += "§e¡Pero ten cuidado!§7\n";
        description += "§7¡El §4grinchiloko§7 ha dejado a sus grinchi-minions y\n";
        description += "§7pequeños robots para guardar su botin!\n";
        description += "§eInfiltrate con cuidado! §sSalva la navidad!\n";
    } else {
        description += "§f[ INFORMACION DEL EVENTO ]\n";
        description += "§e¡Algo raro esta pasando aqui!\n";
        description += "§7Los regalos han faltado este año, y el culpable aun no\n";
        description += "§7ha sido identificado.\n";
        description += "§7La falta se ha hecho sentir y alguien está a la casa del culpable\n";
        description += "§7Dirígete al §sviajero§7 que ha llegado de tierras perdidas para\n";
        description += "§7obtener mas información\n";
    }
    description += "--------------------------------\n";
    return description;
}

function giveAwards(location) {
    // Teleport everyone so they get to see the event
    const loc = location;

    world.getAllPlayers().forEach(player => {
        world.getDimension("overworld").runCommand(`tp ${player.name} ~~~`);
        world.getDimension("overworld").runCommand(`give @a stuff:confetti_launcher`);
    });
    
    // Trigger explosion effect & gift spawn
    displayEntity.dimension.spawnParticle("minecraft:huge_explosion_emitter", loc);
    displayEntity.dimension.spawnParticle("minecraft:huge_explosion_emitter", loc);
}