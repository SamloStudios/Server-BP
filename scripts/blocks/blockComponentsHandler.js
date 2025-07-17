import { system } from "@minecraft/server";
import { PurpleFungusInfested } from "./blockComponents/purple_fungus_stem_infested_block";
import { PurpleLightvine } from "./blockComponents/purple_lightvine_block"

system.beforeEvents.startup.subscribe(({ blockComponentRegistry, itemComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent(
		"custom:purple_fungus_stem_infested_block",
		PurpleFungusInfested
	);
	itemComponentRegistry.registerCustomComponent(
		"custom:purple_lightvine_block",
		PurpleLightvine
	)
});