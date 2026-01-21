import { system, world } from "@minecraft/server";
import { Claim, ClaimManagerError } from "./claim";

let claim_data = []; // Caché global para consultas rápidas (lectura)
let hasFetchClaimData = false;

export class ClaimManager {
    current_data_block = 0; // block of data to write
    claims_on_block = 0; // number of claims on this block

    
    constructor () {
        system.run(()=>{
            if (!hasFetchClaimData)
                this.fetchClaimData();
        }) 
    }

    // Function to create new claims
    createClaim(ownerName, p1, p2, dimensionId) {
        // Create claim and set owner
        const claim = new Claim(this);
        claim.setOwner(ownerName);
        claim.setDimension(dimensionId)
        
        // Set bounds coordinates
        const xMin = Math.min(p1.x, p2.x);
        const xMax = Math.max(p1.x, p2.x) + 1;
        const zMin = Math.min(p1.z, p2.z);
        const zMax = Math.max(p1.z, p2.z) + 1;
        claim.setBounds({xMin: xMin, xMax: xMax, zMin: zMin, zMax: zMax});

        this.saveClaim(claim);

        return claim;
    }

    // Function to save claims
    saveClaim(claim) {
        if (!hasFetchClaimData) return;
        
        // Create an id if it is new
        if (!claim.getId()) {
            claim.setId(Date.now());

            // Up the stakes
            if (this.claims_on_block >= 10) {
                this.claims_on_block = 0;
                this.current_data_block++;
            }

            // Establecer el bloque de datos a este bloque de datos
            claim.setDataBlock(this.current_data_block);
            this.claims_on_block++;
        }

        const blockId = `claimData:${claim.getDataBlock()}`;
        const rawBlock = world.getDynamicProperty(blockId);

        // Manejar caso de bloque vacio 
        const claim_block = rawBlock ? JSON.parse(rawBlock) : [];
        
        // Search for the claim with the id
        const indexInBlock = claim_block.findIndex(item => item.id === claim.getId());

        const claimData = claim.getData();

        // If there is a saved slot, modify it
        if (indexInBlock !== -1) {
            claim_block[indexInBlock] = claimData;
        } else {
            // Else save at the end of the data_block
            claim_block.push(claimData);
        }

        // Guardar en la base de datos de Minecraft
        world.setDynamicProperty(blockId, JSON.stringify(claim_block));
        
        // UPDATE local cache
        const localIndex = claim_data.findIndex(item => item.id === claim.getId());
        if (localIndex !== -1) {
            claim_data[localIndex] = claimData;
        } else {
            claim_data.push(claimData);
        }
    }

    deleteClaim(claimId) {
        if (!hasFetchClaimData) return;

        // 1. Buscar el índice en la caché local
        const index = claim_data.findIndex(c => (c.id === claimId));
        
        if (index === -1) {
            console.warn(`§cNo se encontró el claim con ID: ${claimId}`);
            return;
        }

        // 2. Eliminar de la caché
        claim_data.splice(index, 1);

        // 3. Reconstruir la base de datos para eliminar huecos
        this.rebuildDatabase();
        
        console.warn(`§eClaim ${claimId} eliminado y base de datos compactada.`);
    }

    getClaimsAtLocation(location, dimensionId) {
        if (!dimensionId) throw new ClaimManagerError("You must specify the dimensionId");
        
        const claimsAtLocation = []
        // Get all claims in that area
        const claimsAtLocationRaw = claim_data.filter(claim => {
            const inX = location.x >= claim.bounds.xMin && location.x <= claim.bounds.xMax;
            const inZ = location.z >= claim.bounds.zMin && location.z <= claim.bounds.zMax;
            const same_dimension = claim.dimension === dimensionId;
            const not_marker = claim.type !== 'marker';
            
            return inX && inZ && same_dimension && not_marker;
        });

        // Return as claim objects
        claimsAtLocationRaw.forEach(claimData => {
            claimsAtLocation.push(new Claim(this).init(claimData));
        });
    
        return claimsAtLocation;
    }

    getClaimsInArea(p1, p2, dimensionId) {
        if (!p1 || !p2 || !dimensionId)
            throw new ClaimManagerError("Unable to pinpoint claims");
        
        // 1. Normalizar el área nueva (el área que el jugador INTENTA reclamar)
        const newArea = {
            xMin: Math.floor(Math.min(p1.x, p2.x)),
            xMax: Math.floor(Math.max(p1.x, p2.x)),
            zMin: Math.floor(Math.min(p1.z, p2.z)),
            zMax: Math.floor(Math.max(p1.z, p2.z))
        };

        // 2. Filtrar los claims existentes
        const collisions = claim_data.filter(claim => {
            // Misma dimensión
            if (claim.dimension !== dimensionId) return false;
            
            // No contar marcadores
            if (claim.type === 'marker') return false;

            const b = claim.bounds;

            // Lógica de colisión AABB:
            // Se solapan si NO ocurre que uno está totalmente fuera del otro
            const collisionX = newArea.xMin <= b.xMax && newArea.xMax >= b.xMin;
            const collisionZ = newArea.zMin <= b.zMax && newArea.zMax >= b.zMin;

            return collisionX && collisionZ;
        });

        // 3. Convertir a objetos Claim para que tengan sus métodos
        return collisions.map(data => new Claim(this).init(data));
    }

    // TODO: Add Markers later
    // getMarkerAtLocation(location, dimensionId) {
    //     if (!hasFetchClaimData) return undefined;
        
    //     const markersAtLocation = []
    //     // Get all claims in that area
    //     const markersAtLocationRaw = claim_data.filter(claim => {
    //         const inX = location.x >= claim.xMin && location.x <= claim.xMax;
    //         const inZ = location.z >= claim.zMin && location.z <= claim.zMax;
    //         const same_dimension = claim.dimension === dimensionId;
    //         const not_marker = claim.type === 'marker';
            
    //         return inX && inZ && same_dimension && not_marker;
    //     });

    //     // Return as claim objects
    //     markersAtLocationRaw.forEach(claimData => {
    //         markersAtLocation.push(new Marker(this).init(claimData));
    //     });

    //     return markersAtLocation;
    // }

    getClaimById() { // TODO

    }
    
    modifyClaim() { // TODO
    
    }
    
    fetchClaimData() {
        let index = 0;
        claim_data = [];

        while (true) {
            const claimsRaw = world.getDynamicProperty(`claimData:${index}`); // tomar toda la claim data
            if (claimsRaw === undefined) break; // si no hay nada detenerse
            
            const claimData = JSON.parse(claimsRaw); // Hacer un objeto del JSON
            
            this.claims_on_block = 0; // restart counter
            
            for (const clause of claimData) {
                this.claims_on_block++; // add to counter

                // Añadimos el numero del bloque de datos en el que esta guardado
                clause.data_block = index;
                claim_data.push(clause); // Guardamos en data
            } 
            
            
            index++;
        }

        // Corregir el índice para mundos nuevos o existentes
        this.current_data_block = Math.max(0, index - 1);
        hasFetchClaimData = true;
    }

    rebuildDatabase() {
        // 1. Limpiar TODOS los bloques antiguos del mundo
        // Buscamos cuántos bloques hay y los ponemos en undefined
        let i = 0;
        while (world.getDynamicProperty(`claimData:${i}`) !== undefined) {
            world.setDynamicProperty(`claimData:${i}`, undefined);
            i++;
        }

        // 2. Reiniciar contadores de la clase
        this.current_data_block = 0;
        this.claims_on_block = 0;

        // 3. Si no hay claims, terminamos aquí (ya borramos todo)
        if (claim_data.length === 0) return;

        // 4. Repartir los claims de la caché en nuevos bloques de 10
        let tempBlock = [];
        
        claim_data.forEach((claimData, index) => {
            // Actualizar el puntero del bloque en el dato del claim
            claimData.data_block = this.current_data_block;
            tempBlock.push(claimData);
            this.claims_on_block++;

            // Si llenamos el bloque o es el último claim
            if (this.claims_on_block >= 10 || index === claim_data.length - 1) {
                world.setDynamicProperty(
                    `claimData:${this.current_data_block}`, 
                    JSON.stringify(tempBlock)
                );

                // Si aún quedan claims, pasamos al siguiente bloque
                if (index < claim_data.length - 1) {
                    this.current_data_block++;
                    this.claims_on_block = 0;
                    tempBlock = [];
                }
            }
        });
    }
}