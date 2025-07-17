import { world} from '@minecraft/server';
import { beforePlayerInteraction } from './blockEvents/beforeInteraction.js'
import { beforePlayerPlaceBlock } from './blockEvents/beforePlaceBlock.js';
import { afterPlayerPlaceBlock } from './blockEvents/afterPlaceBlock.js';
import { beforePlayerBreakBlock } from './blockEvents/beforeBreakBlock.js';

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    beforePlayerInteraction(event);
});

world.beforeEvents.playerPlaceBlock.subscribe((event)=>{
    beforePlayerPlaceBlock(event);
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    afterPlayerPlaceBlock(event);
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
    beforePlayerBreakBlock(event);
});

