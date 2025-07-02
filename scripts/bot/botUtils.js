export function getTime() {
    const now = new Date(); // Obtiene la fecha y hora actuales según el sistema donde se ejecuta el script.
    
    // Obtiene la hora y minutos en UTC
    let utcHours = now.getUTCHours();
    let utcMinutes = now.getUTCMinutes();

    // Definimos el offset para America/Mexico_City (GMT-6)
    // Es -6 horas respecto a UTC.
    const timezoneOffsetHours = -6; // Para GMT-6

    // Calculamos la hora en la zona horaria deseada
    let desiredHours = utcHours + timezoneOffsetHours;

    // Ajustamos si la hora se pasa de medianoche o retrocede al día anterior
    if (desiredHours < 0) {
        desiredHours += 24; // Suma 24 horas si la hora es negativa (significa que es del día anterior)
    } else if (desiredHours >= 24) {
        desiredHours -= 24; // Resta 24 horas si la hora es 24 o más (significa que es del día siguiente)
    }

    // Determinar AM/PM
    const period = desiredHours >= 12 ? 'PM' : 'AM';

    // Formatear la hora a formato de 12 horas
    desiredHours = desiredHours % 12; // Convierte a formato de 12 horas
    if (desiredHours === 0) {
        desiredHours = 12; // Si es 0, lo convertimos a 12 para el formato de 12 horas
    }

    // Formatear la hora para asegurar dos dígitos (ej. 01, 09)
    const formattedHours = String(desiredHours).padStart(2, '0');
    const formattedMinutes = String(utcMinutes).padStart(2, '0');


    // Convertir a formato 12 horas si es necesario
    let displayHours = desiredHours;
    if (displayHours === 0) {
        displayHours = 12; // 00:xx es 12 AM
    } else if (displayHours > 12) {
        displayHours -= 12; // 13:xx es 1 PM, 14:xx es 2 PM, etc.
    }

    const currentTimeMexicoCity = `${formattedHours}:${formattedMinutes} ${period}`;
    return currentTimeMexicoCity;
}

export function truncateFloat(num, decimalPlaces) {
    let factor = Math.pow(10, decimalPlaces);
    return Math.trunc(num * factor) / factor;
}