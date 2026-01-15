import { system, world } from "@minecraft/server";
import { displayActionBar, formatCountdown } from "../utils/displayUtils";
import { getTime } from "../bot/botUtils";


export let MISSION_END = false;
export let GIFT_COUNT = 0;
export let FOUND_GIFT_COUNT = 0;

export let Events = {
    "elfo_1" : "elfo_1_win",
    "elfo_2" : "elfo_2_win",

}

// Get info from stored variables
world.afterEvents.worldLoad.subscribe(() => {
    loadStoredVariables();
});

function loadStoredVariables() {
    // system.run(()=>{
        const missionEnd = world.getDynamicProperty("christmas_mission_end");
        print(missionEnd);
        if (missionEnd != undefined) MISSION_END = missionEnd;
        const giftCount = world.getDynamicProperty("christmas_gift_count");
        if (giftCount != undefined) GIFT_COUNT = giftCount;
        const foundGiftCount = world.getDynamicProperty("christmas_found_gift_count");
        if (foundGiftCount != undefined) FOUND_GIFT_COUNT = foundGiftCount;
    // })

    console.log(`§a[Loader] Christmas mission status loaded: MISSION_END=${MISSION_END}, GIFT_COUNT=${GIFT_COUNT}, FOUND_GIFT_COUNT=${FOUND_GIFT_COUNT}`);
    countdownToGifts();
};


system.afterEvents.scriptEventReceive.subscribe((event)=> {
    // const event = {id, initiator?, message, sourceBlock?, sourceEntity?, sourceType}
    console.log(`§7§oAny script event( id ${event.id})`);
    
    // Handle open dialogue reqs
    if (event.id == 'event:dialogue') {
        if (event.sourceEntity && event.initiator) openDialogue(event);
    };

    // Handle reset mission
    if (event.id == "event:reset_mission" ) {
        MISSION_END = false;
        GIFT_COUNT = 0;
        FOUND_GIFT_COUNT = 0;
        event.sourceEntity?.sendMessage(`§aMisión reiniciada.`);

        // Reset stored variables
        world.setDynamicProperty("christmas_mission_end", false);
        world.setDynamicProperty("christmas_gift_count", 0);
        world.setDynamicProperty("christmas_found_gift_count", 0);
    }

    // Handle display time
    if (event.id == "event:display_time") {
        const source = event.sourceEntity;
        const location = source.getHeadLocation();

        // Spawn entity that will display countdown
        const countdownEntity = source.dimension.spawnEntity("stuff:floating_text", {x: location.x, y: location.y, z: location.z});
        world.setDynamicProperty("christmas_countdown_entity_id", countdownEntity.id);

        source.sendMessage(`§aSpawned entity that will display time`);
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
})

// Handle gift count
world.afterEvents.playerPlaceBlock.subscribe((event)=> {
    const placedBlock = event.block.permutation.type.id;
    if (placedBlock == "christmas:gift_block") {
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
        
        // Activate counter
        countdownToGifts();
    })
}

function countdownToGifts() {
    // Get floating text entity id
    const id = world.getDynamicProperty("christmas_countdown_entity_id");
    if (!id) return;
    
    // Get the entity
    const entity = world.getEntity(id)

    // 19 de enero de 2026 a las 09:00 AM
    const FECHA_FIN = new Date(2026, 0, 19, 9, 0, 0);

    system.runInterval(() => {
        // Validamos que la entidad aún exista para evitar errores en el log
        if (!entity || !entity.isValid) return;

        const currentTime = getTime(true);
        const timeDiff = FECHA_FIN - currentTime;

        if (timeDiff <= 0) {
            entity.nameTag = "§e¡Los regalos han llegado! \n§a¡Feliz §bN§aa§cv§di§gd§aa§6d§a!";
            // TODO: Trigger explosion effect & gift spawn
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
            entity.nameTag = `§l§6[MISION CUMPLIDA]\n§l§bLOGRARON RECUPERAR LOS REGALOS!!\n§eEl regalo se abre en:\n${colorReloj}${timeString}`;
        } else {
            entity.nameTag = `§l§6MISION EN PROGRESO!!\n§eTiempo restante:\n${colorReloj}${timeString}`;
        }

    }, 20);
} 