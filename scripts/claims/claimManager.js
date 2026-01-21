import { system, world } from "@minecraft/server";
import { Claim } from "./claim";

export class ClaimManager {
    hasFetchClaimData = false;
    current_data_block = 0;
    claim_data = [];
    
    constructor () {
        this.fetchClaimData();
    }

    createClaim(owner, data) {
        if (!this.hasFetchClaimData) return console.error('Claim Manager ERR');

    }

    getClaimsAtLocation(location, dimension) {
        if (!this.hasFetchClaimData) return undefined;
        const {x, y, z} = location;

        const claimsAtLocation = this.claim_data.filter(claim => {
            
        })

        return claimsAtLocation;
    }

    saveClaim() {
        if (!this.hasFetchClaimData) return console.error('Claim Manager ERR');
    
    }
    
    modifyClaim() {
        if (!this.hasFetchClaimData) return console.error('Claim Manager ERR');
    
    }
    
    fetchClaimData() {
        // const keys = world.getDynamicPropertyIds();
        // const filteredKeys = keys.filter(key => key.startsWith('claimData:'))
        let index = 0;

        while (true) {
            const claimsRaw = world.getDynamicProperty(`claimData:${index}`); // tomar toda la claim data
            if (claimsRaw === undefined) break; // si no hay nada detenerse
            
            const claimData = JSON.parse(claimsRaw); // Hacer un objeto del JSON
            
            for (const clause of claimData) {
                // Añadimos el numero del bloque de datos en el que esta guardado
                clause.data_block = this.current_data_block;
                this.claim_data.push(clause); // Guardamos en data
            } 
            index++;
        }
    
        this.hasFetchClaimData = true;
        return
    }
}

export class ClaimManagerError extends Error {

}


/*::Claim
// Is the datablock of claimData it is saved in (temporal data)
data_block : integer
id: integer
position_data: {xMin xMax yMin yMax}

// Types of claims there can be
// marker - it is just a marker for something, like a zone, city, place to be (multiple can overlap)
// area - it most of the capabilities of a claim but no player can place it (more permanent)
// mission - like an area, but most ephimeral, it can change its rules or dissapear because of being script controlled
// player - a claim made by a player, has a cost, and can be sold, or subclaims can be made inside it (need to check how thats gonna work) 
type : ["marker, mission, area, player"] 

dimension : ["overworld, nether, the_end"] 
owner : String
whitelist : String[]
cost : Integer
onSale : Boolean
permissions : {
    trespass : Boolean
    break_blocks : true/false
    place_blocks : true/false
    interact :
    open_chest :
    kill_players : 
    kill_hostiles : 
    kill_neutral :
    elytra : 
    magic : 
    explosions : 
}
whitelist_permissions {}
subclaims : Integer[]
*/