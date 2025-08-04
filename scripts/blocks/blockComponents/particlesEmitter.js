import { system } from "@minecraft/server";

export const ParticlesEmitter = {
    onTick(event, compParam) {
        const { block, dimension } = event;
        const particle_disabler = compParam.params.particle_disabler;

        if (particle_disabler) {
            const operator = particle_disabler.operator ?? "==";
            const disabler_state = particle_disabler.state ?? "";
            const disabled_value = particle_disabler.value ?? "";

            const current_state = block.permutation.getState(disabler_state);

            if (operator === "==" && current_state === disabled_value) return;
            if (operator === "!=" && current_state !== disabled_value) return;
        }

        const probability = compParam.params.probability ?? 1;
        const id = compParam.params.id ?? "";

        const random_timeout = compParam.params.random_timeout;
        const timeout = random_timeout
        ? Math.floor((Math.random() * (random_timeout[1] - random_timeout[0]) + random_timeout[0]) * 20)
        : undefined;

        if (Math.random() < probability) {
            if (timeout) {
                system.runTimeout(() => {
                    try {
                        dimension.spawnParticle(id, block.center());
                    } catch (error) {}
                }, timeout);
            } else {
                try {
                    dimension.spawnParticle(id, block.center());
                } catch (error) {}
            }
        }
    },



    onPlayerBreak(event, p) {
        const on_destroy = p.params.on_destroy ?? false;
        if (on_destroy) {
            const {block, dimension} = event;
            const id = on_destroy.id || "particle:lukai_break";
            const probability = on_destroy.probability || 1;

            const disabler_disabling = false; // TODO: Poner aqui el particle disabler si se necesita;
            if (disabler_disabling) return;

            if (probability === 1 || Math.random() < probability) {
                dimension.spawnParticle(id, block.center());
            }
        }
    }
}