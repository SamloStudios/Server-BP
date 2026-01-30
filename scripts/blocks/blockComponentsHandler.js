import { system } from "@minecraft/server";
import { PurpleFungusInfested } from "./blockComponents/purple_fungus_stem_infested_block";
import { PurpleLightvine } from "./blockComponents/purple_lightvine_block"
import { LightvineFruitLantern } from "./blockComponents/lightvine_fruit_lantern";
import { ParticlesEmitter } from "./blockComponents/particlesEmitter";
import { placementRules } from "./blockComponents/placementRules";
import { placementRandomVariant } from "./blockComponents/placementRandomVariant";
import { brokenBaseSensor } from "./blockComponents/brokenBaseSensor";
import { OnRandomTick } from "./blockComponents/behavior/on_random_tick";
import { SetRandomizer } from "./blockComponents/placement/set_randomiser";
import { UseInteraction } from "./blockComponents/behavior/use_interaction";
import { BreakRestriction } from "./blockComponents/break/break_restriction";
import { OnBlockBreakEvent } from "./blockComponents/behavior/on_break";
import { GrinchLokoDollComponent } from "./blockComponents/custom/grinchloko_doll";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	// bloque de hongo infestado de snark
	blockComponentRegistry.registerCustomComponent(
		"custom:purple_fungus_stem_infested_block",
		PurpleFungusInfested
	);

	// Enredadera que brilla y crece automaticamente
	blockComponentRegistry.registerCustomComponent(
		"custom:purple_lightvine_block",
		PurpleLightvine
	);

	// Lampara (se puede mejorar haciendo general)
	blockComponentRegistry.registerCustomComponent(
		"custom:lightvine_fruit_lantern_block",
		LightvineFruitLantern
	);

	blockComponentRegistry.registerCustomComponent(
		"custom:grinchloko_doll",
		GrinchLokoDollComponent
	);

	// Hace que el bloque emita particulas al centro (requiere minecraft:tick)
	// (Tal vez podriamos hacer una propiedad "transformation") que cambie el particle spawn point
	/* Ejemplo de uso
		"emitter:particles": {
			"id" : "particle:lightvine_fruit",
			"probability" : 0.8,
			"random_timeout" : [0, 2],
			"particle_disabler" : {
				"state" : "custom:powered",
				"operator" : "==";
				"value" : "off"
			},
			"on_destroy" : {
				"id" : "particle:teflee",
				"probability" : 1,
				"use_disabler" : false // Not implemented yet
			}
		},
	*/
	blockComponentRegistry.registerCustomComponent(
		"emitter:particles",
		ParticlesEmitter
	);

	// Reglas de colocacion, evita ciertos casos de colocacion de bloques en otros bloques
	/* Campos permitidos : {
		"whitelist" : []
		"blacklist" : []
		"rules" : "solid, not_solid, same_type, not_same_type"
		"block_face" : "up, down, left, right, north, south"
	} 
	*/
	blockComponentRegistry.registerCustomComponent(
		"placement:rules",
		placementRules
	);

	// Selecciona una variante (default = custom:variant) random del campo values
	/* Ejemplo de uso
		"placement:random_variant"{
			"state" : "custom:variant"
			"values" : [0, 1]
		}
	*/
	blockComponentRegistry.registerCustomComponent(
		"placement:random_variant",
		placementRandomVariant
	);

	// Rompe el bloque si su base es aire (requiere minecraft:tick)
	/* Ejemplo de uso
		"minecraft:tick": {
			"interval_range": [60, 60],
			"looping": true
		},
		"sensor:broken_base" : {}
	*/
	blockComponentRegistry.registerCustomComponent(
		"sensor:broken_base",
		brokenBaseSensor
	);

	// Comportamiento del bloque en un tick random
	/* SOLO FUNCIONA ACTUALMENTE "transform", "growth"
	"behavior:on_random_tick" : {
				"probability" : 1,
				"disabler" : {
					"dimension / state" : {
						"name" : "",
						"operator" : "==",
						"value" : ""
					}
				},
				"transform" : {
					"probability" : 0.1,
					"block_id" : ""
				},
				"set_state" : {
					"probability" : 0.1,
					"state" : "",
					"value" : ""
				},
				"growth" : {
					"probability" : 0.1,
					"from" : "above, below, north, south, east, west, face, opposite",
					"randomized_state" :  true,
					"block" : "",
					"ignore_water" : false,
					"ignore_other_blocks" : false
				},
				"spread" : {
					"probability" : 0.1,
					"on_blocks" : ["water", "etc"]
				}
			},
	*/
	blockComponentRegistry.registerCustomComponent(
		"behavior:on_random_tick",
		OnRandomTick
	);

	/* Componente para que el bloque interactue al usar click derecho
	"behavior:use_interaction" : {
				"probability" : 1,
				"disabler" : {
					"state": "custom:variant",
					"value": 0
				},
				"set_state" : {
					"state" : "custom:variant",
					"value" : 0
				},
				"particles" : {
					"id" : "particle:magic_poof"
				},
				"sound" : {
					"id" : "magic.poof"
				}
			},
	*/
	blockComponentRegistry.registerCustomComponent(
		"behavior:use_interaction",
		UseInteraction
	);

	blockComponentRegistry.registerCustomComponent(
		"break:event",
		OnBlockBreakEvent
	);
	
	blockComponentRegistry.registerCustomComponent(
		"placement:set_randomizer",
		SetRandomizer
	);

	/*
	"break:restriction" : {
		"item" : "endupdate:indigo_pickaxe", // can be "any"
		"drop" : { // If not present drops itself
			"item" : "minecraft:paper"
			"count" : 2 // default 1
		}
	},
	"minecraft:loot": "loot_tables/nothing.json", // required (kinda)
	*/
	blockComponentRegistry.registerCustomComponent(
		"break:restriction",
		BreakRestriction
	);
});