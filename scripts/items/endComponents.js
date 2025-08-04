import { system} from '@minecraft/server'
import { lightvineFruitEffects } from './end_update_items/lightvineFruit';
import { lightvineFruitHeartEffects } from './end_update_items/lightvineFruitHeart';
import { stomachIndigestion } from './end_update_items/stomachIndigestion';

system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent(
        "custom:lightvine_fruit",
        lightvineFruitEffects
    );
    itemComponentRegistry.registerCustomComponent(
        "custom:lightvine_fruit_heart",
        lightvineFruitHeartEffects
    );
    itemComponentRegistry.registerCustomComponent(
        "custom:general_stomach_indigestion",
        stomachIndigestion
    );
});