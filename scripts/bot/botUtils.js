import { world } from "@minecraft/server";
export function getTime() {
    const now = new Date();
    now.setHours(now.getHours() - 6);
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    return `${hours}:${minutes} ${ampm}`;
}

export function truncateFloat(num, decimalPlaces) {
    // Trunca un número flotante a los decimales especificados
    const factor = Math.pow(10, decimalPlaces);
    return Math.trunc(num * factor) / factor;
}

export function getFilteredPropertyKeys(subject, verb) {
    // 1. Obtiene todas las propiedades dinámicas
    const allIds = world.getDynamicPropertyIds();
    let filteredIds;

    // 2. Filtra los IDs que cumplen ambos criterios:
    if (verb !== undefined){
        filteredIds = allIds.filter(id => 
            id.toLowerCase().startsWith(subject.toLowerCase() + ":") && 
            id.toLowerCase().includes(verb.toLowerCase())
        );
    } else {
        filteredIds = allIds.filter(id => 
            id.toLowerCase().startsWith(subject.toLowerCase() + ":")
        );
    }

    // 3. Se devuelve el array de los IDs filtrados
    return filteredIds;
}