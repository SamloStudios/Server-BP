import { world, system } from "@minecraft/server";
import { displayActionBar } from "./utils/displayUtils";

// Lista de mobs que pueden spawnear
const mobs = [
  "minecraft:creeper",
  "minecraft:pig",
  "minecraft:tropicalfish",
  "minecraft:armadillo",
  "minecraft:horse",
  "minecraft:villager",
  "minecraft:cow",
  "minecraft:llama",
  "minecraft:bee",
  "minecraft:salmon",
  "minecraft:salmon",
];

const randomPhrase = [
    "§aPss?? [o_o]",
    "§6JOjojo",
    "§b.-.",
    "§cOwO'",
    "§7Lirili larila!!",
    "§e( -_-)b",
    "§d<o/  /o>",
    "§3(O_O!)",
    "§f* o *",
    "§4(>_<)"
]


// Evento: cuando un jugador entra al mundo
world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    if (event.initialSpawn) {
        player.runCommand(`title @s title §aEvento: §cKAboom!!`);
        system.runTimeout(()=>{
            player.sendMessage("§a¡Bienvenido al servidor!");
        }, 20 * 5)
        player.sendMessage("§6[Evento KAboom!! (DIA 2)] §fDurante este evento aparecerán mobs aleatorios cerca de ti. Ademas recibirás toda la §cTNT§r§f que necesites para causar estragos!. Al finalizar, todo volverá a la normalidad. §7§oPSsst!! Se dice que hay un §ditem secreto§7§o por ahi. Me pregunto donde?");
    }

    // Dar TNT al jugador
    // player.runCommand("clear @s");
    // player.runCommand("give @s kaboom:stick");
    // player.runCommand("give @s bow 1");
    // player.runCommand("give @s chainmail_helmet 1");
    // player.runCommand("give @s chainmail_chestplate 1");
    // player.runCommand("give @s chainmail_leggings 1");
    // player.runCommand("give @s chainmail_boots 1"); 
    player.runCommand("effect @s saturation infinite 1 true");
    player.runCommand("effect @s health_boost infinite 4 true");
    player.runCommand("effect @s instant_health 1 4 true");
    // Dar armas y herramientas chidas
    // player.runCommand("give @s arrow 64"); 
    
    // Dar fuegos artificiales para la fiesta
    player.runCommand("give @s firework_rocket 12");

});


// Loop que corre cada tick
system.runInterval(() => {

    // Para cada jugador en el mundo
    for (const player of world.getAllPlayers()) {
        
        system.run(() => {
            
            //Frase aleatoria
            displayActionBar(player, randomPhrase[Math.floor(Math.random() * randomPhrase.length)])

            // Spawnear mob aleatorio
            const randomMob = mobs[Math.floor(Math.random() * mobs.length)];
            const location = player.location;

            const spawnLocation = {
            x: location.x + (Math.random() * 6 - 3),
            y: location.y,
            z: location.z + (Math.random() * 6 - 3)
            };

            player.dimension.spawnEntity(randomMob, spawnLocation);
            player.dimension.spawnParticle("minecraft:crop_growth_emitter", spawnLocation);
        });
    }
    
}, 20 * 30 + (Math.floor(Math.random() * 180))); 
