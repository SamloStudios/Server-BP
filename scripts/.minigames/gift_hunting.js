import { world } from "@minecraft/server";
import { getBlockFromFace } from "../utils/blockComponentUtils";
import { displayActionBar } from "../utils/displayUtils";

// --- GLOBAL VARIABLIS -- //
let COOLDOWN = 0;
let FOUND_GIFT_COUNT = 0;
let HUNT_HISTORY = {};

// --- VARIABLIS PERSISTENTUM -- //
let GAME_ACTIVE = false;
let TOTAL_GIFT_COUNT = 0;

let GIFTS = []; // [x, y, z]
let ENEMIES = []; // [x, y, z, type]
let TRAP_GIFTS = []; // [x, y, z]
let TRAP_DOLLS = []; // [x, y, z]


// --- VARIABLIS STATICUM -- //
const total_gifts = 200;

function init() {
    // Load ALL perisistent variables


    // If game was active close the door and clean
    
}

function cleanGame() {
    // Clear & Reset variables
    
    // Clear claim permissions

    // Add button

}

function startGame() {
    // Set gifts up
    // Set fake gifts
    // Set traps
    // Set enemies
}

function addButton() {

};

world.afterEvents.playerInteractWithBlock.subscribe((event)=> {
    const { block, blockFace, faceLocation, isFirstEvent, player } = event;
    if (block.typeId !== "stuff:keyholder") return;

    if (COOLDOWN > 0) {
        displayActionBar(player, "El minijuego esta cerrado");
        return;
    }

    // If ready to start
})