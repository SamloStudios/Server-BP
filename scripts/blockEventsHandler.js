import { Player, system, world} from '@minecraft/server';
import { beforePlayerInteraction } from './blockEvents/beforeInteraction.js'
import { beforePlayerPlaceBlock } from './blockEvents/beforePlaceBlock';
import { afterPlayerPlaceBlock } from './blockEvents/afterPlaceBlock';
import { beforePlayerBreakBlock } from './blockEvents/beforeBreakBlock';

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

