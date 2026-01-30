
/**
 * Dispara una partícula direccional con color y velocidad personalizados.
 * @param {Vector3} origin - Punto de inicio (ej: player.getHeadLocation())
 * @param {Vector3} target - Punto al que apunta (ej: block.location)
 */
export function getVectorDirection(origin, target) {
    // 1. Cálculo manual de dirección (Vector3)
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dz = target.z - origin.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Evitar errores si el origen y el destino son el mismo punto
    return {
        x: distance === 0 ? 0 : dx / distance,
        y: distance === 0 ? 0 : dy / distance,
        z: distance === 0 ? 0 : dz / distance
    };    
}