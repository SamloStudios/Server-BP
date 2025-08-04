

export const stomachIndigestion = {
    onCompleteUse(event) {
        const player = event.source;
        if (Math.random() < 0.6){
            player.addEffect("hunger", 200, { amplifier: 1, showParticles: true })
        };
    }
}