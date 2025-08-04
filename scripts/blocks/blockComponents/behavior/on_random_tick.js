import { set_state } from "utils/blockComponentUtils";

export const OnRandomTick = {
    onRandomTick(event, p) {
        const {block, dimension} = event; 
        const probability = p.params.probability ?? 1; 
        if (probability < Math.random()) return;

        if (p.params.disabler) {
            const disabler = p.params.disabler;            
        }

        if (p.params.transform) {
            const t = p.params.transform;
            if (t.probability > Math.random()){
                transformBlockEvent(block, t.block_id);
            }
        }

        if (p.params.grow) {
            const g = p.params.grow;
            if (g.probability > Math.random()){
                growthEvent(block, g);
            }
        }

        if (p.params.set_state) {
            const s = p.params.set_state;
            if (!s.probability || s.probability > Math.random()){
                set_state(block, s);
            }
        }
    }
}

export function transformBlockEvent(block, id) {
    block.setType(id);
}

export function growthEvent(block, params) {
    const state = params.state;
    const levels = params.levels;
    const product = params.product;
    
    const developmentState = block.permutation?.getState(state);

    if (developmentState == null) return;

    if (levels.includes(developmentState+1)) {
        block.setPermutation(block.permutation.withState(state, developmentState+1))
    } else {
        transformBlockEvent(block, product);
    }
}