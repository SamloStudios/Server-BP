import { system } from "@minecraft/server";

export function displayActionBar(_player, _string) {
    system.run(() => {
        _player.onScreenDisplay.setActionBar(_string);
    });
}

export function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Función interna para asegurar 2 dígitos (ej. 05 en lugar de 5)
    const pad = (n) => n.toString().padStart(2, "0");

    // Si faltan más de 24 horas, incluimos los días en el formato
    if (days > 0) {
        return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }

    // Si falta menos de un día, mostramos el clásico HH:MM:SS
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}