export function getTime() {
    // Obtiene la hora actual en la zona horaria de América/México (GMT-6)
    const now = new Date();
    let utcHours = now.getUTCHours();
    let utcMinutes = now.getUTCMinutes();
    const timezoneOffsetHours = -6;
    let desiredHours = utcHours + timezoneOffsetHours;

    if (desiredHours < 0) desiredHours += 24;
    else if (desiredHours >= 24) desiredHours -= 24;

    const period = desiredHours >= 12 ? 'PM' : 'AM';
    desiredHours = desiredHours % 12 || 12;
    const formattedHours = String(desiredHours).padStart(2, '0');
    const formattedMinutes = String(utcMinutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes} ${period}`;
}

export function truncateFloat(num, decimalPlaces) {
    // Trunca un número flotante a los decimales especificados
    const factor = Math.pow(10, decimalPlaces);
    return Math.trunc(num * factor) / factor;
}