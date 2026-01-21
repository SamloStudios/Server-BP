import { world, system } from "@minecraft/server";
import { displayActionBar } from "../../utils/displayUtils";
import { ActionFormData } from "@minecraft/server-ui";
import { ClaimManager } from "../../claims/claimManager";

// All variables outside are shared and persistent while server on
const Manager = new ClaimManager();

// { playername : [location1, location2] }
let playerClaimAttempt = {}

const PARTICLE_NAME = "minecraft:basic_flame_particle"; // Cambia por la que prefieras
const VIEW_RADIUS = 15; // Radio de visión circular
const SPACING = 0.5;    // Distancia entre partículas (0.5 = 2 partículas por bloque)
const COST = 1; // Costo por bloque de claim

export const ClaimsAdminGavel = {
    onUseOn(event) {
        const { source: player, block } = event;
        const location = block.location;
        const dimensionId = block.dimension.id;
        /// TODO: Manage claim function
        const claims = Manager.getClaimsAtLocation(location, dimensionId)
        if (claims.length !== 0) { 
            player.sendMessage("Ya hay claims en ese sitio!")
            return;
        }
        
        /// Create claim logic
        if (!playerClaimAttempt[player.name]) { // 1st point
            playerClaimAttempt[player.name] = { 
                p1: location,
                p2: null,
                area: null,
                dimension: dimensionId
            };

            displayActionBar(player, "§aPrimer punto seleccionado.");

        } else if (!playerClaimAttempt[player.name].p2) { // 2nd point
            const data = playerClaimAttempt[player.name];
            
            // Verificar que los puntos esten en la misma dimension 
            if (dimensionId !== data.dimension) return;
            
            // Verificar si no hay claims que intersecten con nuestra area
            const intersecting_claims = Manager.getClaimsInArea(data.p1, location, dimensionId);
            if (intersecting_claims.length !== 0) {
                player.sendMessage("Ya hay claims en ese sitio!")
                return;
            }
            
            const distX = Math.abs(location.x - data.p1.x) + 1;
            const distZ = Math.abs(location.z - data.p1.z) + 1;
            data.area = Math.floor(distX * distZ); // Guardar area
            data.p2 = location; // Guardar punto 2
            player.sendMessage("§bSegundo punto seleccionado. Visualizando claim...");
        } else {
            // Cuadro de diálogo para confirmar
            displayActionBar(player, "§eAbriendo menú de confirmación...");
            
            const data = playerClaimAttempt[player.name];
            dialogoConfirmacionAdmin(player, data);
        }
    }
}


export const ClaimsGavel = {

}

// Bucle principal de partículas (Corre cada 2 ticks para ahorrar CPU)
system.runInterval(() => {
    for (const playerName in playerClaimAttempt) {
        const data = playerClaimAttempt[playerName];
        const player = world.getAllPlayers().find(p => p.name === playerName);

        // Si el jugador se desconecta o no ha puesto puntos, saltar
        if (!player || !data.p1) continue;

        if (!data.p2) {
            const playerPos = player.location;
            const p1 = data.p1;
            // Usamos Math.floor en playerPos para obtener la coordenada del bloque exacto
            const p1X = Math.floor(p1.x);
            const p1Z = Math.floor(p1.z);
            const p2X = Math.floor(playerPos.x);
            const p2Z = Math.floor(playerPos.z);

            // Sumamos +1 para incluir ambos bloques (el de inicio y el de fin)
            const distX = Math.abs(p2X - p1X) + 1;
            const distZ = Math.abs(p2Z - p1Z) + 1;
            const dist = Math.floor(Math.sqrt(Math.pow(distX, 2) + Math.pow(distZ, 2)));

            const area = distX * distZ;

            // Mostrar la distancia y el area
            displayActionBar(player, `§7[Distancia - §a${dist}§7] [Area - §d${area}§7]`);
            const tmp = { x: p1.x + 0.5, y: playerPos.y + 0.3, z: p1.z + 0.5 }

            // Try-catch por si esta fuera del chunk
            try { player.dimension.spawnParticle("minecraft:villager_happy", tmp); } catch (error) {}

            continue;
        }

        const p1 = data.p1;
        const p2 = data.p2;
        const dim = player.dimension;
        const pPos = player.location;
        const pY = pPos.y + 0.1; // Dibujar ligeramente arriba del suelo

        // Definir límites del rectángulo (Min/Max para manejar cualquier orden de selección)
        const xMin = Math.min(p1.x, p2.x);
        const xMax = Math.max(p1.x, p2.x) + 1; // +1 para que incluya el borde del bloque
        const zMin = Math.min(p1.z, p2.z);
        const zMax = Math.max(p1.z, p2.z) + 1;

        // Dibujar los 4 bordes usando la lógica de intersección circular
        // Bordes Norte y Sur (Z constante, X varía)
        dibujarSegmentoVisible(dim, zMin, xMin, xMax, pPos, pY, "x");
        dibujarSegmentoVisible(dim, zMax, xMin, xMax, pPos, pY, "x");

        // Bordes Este y Oeste (X constante, Z varía)
        dibujarSegmentoVisible(dim, xMin, zMin, zMax, pPos, pY, "z");
        dibujarSegmentoVisible(dim, xMax, zMin, zMax, pPos, pY, "z");

        // Mostrar area total y coste:
        displayActionBar(player, `§7§g${data.area * COST}$ :minecoin:§7 [Area - §d${data.area}§7]`);
    }
}, 10);

/**
 * Calcula y dibuja solo la parte de una línea que entra en el círculo del jugador
 */
function dibujarSegmentoVisible(dimension, coordFija, min, max, playerPos, y, ejeVar) {
    // Determinar distancia perpendicular a la línea
    const distPerpendicular = Math.abs(coordFija - (ejeVar === "x" ? playerPos.z : playerPos.x));

    // Si la línea está fuera del radio de visión, no hacer nada
    if (distPerpendicular > VIEW_RADIUS) return;

    // Pitágoras para hallar la mitad del ancho visible (cateto = sqrt(hip^2 - cat^2))
    const h = Math.sqrt(Math.pow(VIEW_RADIUS, 2) - Math.pow(distPerpendicular, 2));

    const centroVisible = (ejeVar === "x" ? playerPos.x : playerPos.z);
    
    // El segmento teórico visible según el círculo
    const visibleInicio = centroVisible - h;
    const visibleFin = centroVisible + h;

    // Recortar el segmento visible para que no exceda los límites reales del claim
    const finalInicio = Math.max(min, visibleInicio);
    const finalFin = Math.min(max, visibleFin);

    // Dibujar si hay algo visible
    if (finalInicio < finalFin) {
        for (let i = finalInicio; i <= finalFin; i += SPACING) {
            const spawnPos = (ejeVar === "x") 
                ? { x: i, y: y, z: coordFija } 
                : { x: coordFija, y: y, z: i };
            
            dimension.spawnParticle(PARTICLE_NAME, spawnPos);
        }
    }
}

function dialogoConfirmacionAdmin(player, data) {
    const form = new ActionFormData();
    form.title("Crear claim?");
    form.body(`Nuevo claim a nombre de: ${player.name}`);
    form.label(`Costo: §g${data.area * COST}$ :minecoin:`);
    form.label(`Area: §d${data.area}m :tip_touch_jump:`);
    form.divider()
    form.button("Crear claim");
    form.button("Borrar seleccion");
    form.show(player).then((response)=> {
        const res = response.selection ?? null;
        if (res !== null){
            switch(res) {
                case 0:
                    // Create claim
                    const newClaim = Manager.createClaim(player.name, data.p1, data.p2, player.dimension.id);
                    player.sendMessage("§aNuevo claim creado!!")
                    delete playerClaimAttempt[player.name];
                    break;
                case 1:
                    // Delete selection
                    delete playerClaimAttempt[player.name];
                    break;
            }
        }
        return;
    });
}