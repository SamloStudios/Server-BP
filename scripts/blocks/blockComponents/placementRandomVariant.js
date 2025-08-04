export const placementRandomVariant = {
    beforeOnPlayerPlace(event, parameters) {

        // State
        const state = parameters.params.state ?? "custom:variant";
        // Available values for the state
        const values = parameters.params.values;
        
        const randomState = Math.floor(Math.random()* values.length)
        
        // Permutation to modify
        let permutation = event.permutationToPlace.withState(state, values[randomState]);

        event.permutationToPlace = permutation;
    }
}
