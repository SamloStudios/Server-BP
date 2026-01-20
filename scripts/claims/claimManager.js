import { system, world } from "@minecraft/server";
import { Claim } from "./claim";

export class ClaimManager {
    hasFetchClaimData = false;
    current_data_block = 0;
    data = [];
    
    constructor () {
        this.hasFetchClaimData = false;
    }

    createClaim(owner, data) {
        if (!this.hasFetchClaimData) return console.error('Claim Manager ERR');

    }

    getClaim(name) {
        if (!this.hasFetchClaimData) return console.error('Claim Manager ERR');

        return Claim(data).init(this)
    }

    saveClaim() {
        if (!this.hasFetchClaimData) return console.error('Claim Manager ERR');
    
    }
    
    modifyClaim() {
        if (!this.hasFetchClaimData) return console.error('Claim Manager ERR');
    
    }
    
    fetchClaimData() {
        const keys = world.getDynamicPropertyIds();
        const filteredKeys = keys.filter(key => key.startsWith('claimData:'))
        let index = 0;

        while (true) {
            const claimsRaw = world.getDynamicProperty(`claimData:${index}`);
            if (claimsRaw === undefined) break;
            
            const claimData = JSON.parse(claimsRaw); 
            
            for (const clause of claimData) {
                const claim = {
                    data_block = ;
                }
            } 
        }
    
        this.hasFetchClaimData = true;
        return
    }
}


/*::Claim
// Is the datablock of claimData it is saved in
data_block : integer
id: integer

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