

export const SetRandomizer = {
    beforeOnPlayerPlace(event) {
        event.permutationToPlace = event.permutationToPlace.withState("custom:player_placed", true);
    },

    onPlace(event, p) {
        if (event.block.permutation.getState("custom:player_placed") === true) return;
        const state = p.params.state;
        const values = p.params.values;

        if (!Array.isArray(values) || values.length === 0) return;

        const random_value = values[Math.floor(Math.random() * values.length)];

        event.block.setPermutation(
            event.block.permutation.withState(state, random_value)
        );
    }
};
