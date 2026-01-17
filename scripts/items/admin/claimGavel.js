// Is this variable shared between all players? YES IT IS!!
let variable = 0;

// All variables outside are shared and persistent while server on

// { playername : [location1, location2] }
let playerClaimAttempt = {}

export const ClaimsAdminGavel = {
    // When the item is used on a block
    onUseOn(event) {
        /* 3 states: 
        1. Clear state, nothing on the shovel 
        2. One point in the list (location1)
        3. 2 points in the list, show line of particles using dimension.spawnParticle()
        // If the player is close to the border of the square, show a portion of the square at player's height

        // While player is holding the Gavel, make it display the distance and volume between him and the 1st point 
        // -- IF the volume is longer than the maximum permitted ammount, tell him 
        */ 
    }
}


export const ClaimsGavel = {

}