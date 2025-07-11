import { system} from '@minecraft/server'
import { VodkaDrinkEffects } from './drinks/VodkaDrinkEffects';
import { BeerDrinkEffects } from './drinks/BeerDrinkEffects';

system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent(
        "custom:vodka_drink",
        VodkaDrinkEffects
    );
    itemComponentRegistry.registerCustomComponent(
        "custom:beer_drink",
        BeerDrinkEffects
    );
});