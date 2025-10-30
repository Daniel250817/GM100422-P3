/**
 * Utilidades para manejo de formatos de tiempo
 */

/**
 * Convierte tiempo de formato HH:MM:SS a HH:MM
 * @param time - Tiempo en formato HH:MM:SS o HH:MM
 * @returns Tiempo en formato HH:MM
 */
export const convertToHHMM = (time: string | undefined | null): string => {
  if (!time || typeof time !== 'string') {
    console.warn('convertToHHMM recibió un valor inválido:', time);
    return '00:00';
  }
  
  const timeParts = time.split(':');
  return `${timeParts[0]}:${timeParts[1]}`;
};

/**
 * Convierte tiempo de formato HH:MM a HH:MM:SS
 * @param time - Tiempo en formato HH:MM
 * @returns Tiempo en formato HH:MM:SS
 */
export const convertToHHMMSS = (time: string | undefined | null): string => {
  if (!time || typeof time !== 'string') {
    console.warn('convertToHHMMSS recibió un valor inválido:', time);
    return '00:00:00';
  }
  
  return `${time}:00`;
};

/**
 * Formatea tiempo para mostrar en formato 12 horas con AM/PM
 * @param time - Tiempo en formato HH:MM:SS o HH:MM
 * @returns Tiempo formateado (ej: "9:00 AM", "5:00 PM")
 */
export const formatTime12Hour = (time: string | undefined | null): string => {
  // Validar que time no sea undefined o null
  if (!time || typeof time !== 'string') {
    console.warn('formatTime12Hour recibió un valor inválido:', time);
    return '12:00 AM';
  }
  
  // Convertir de HH:MM:SS a HH:MM si es necesario
  const timeParts = time.split(':');
  const hours = timeParts[0];
  const minutes = timeParts[1];
  
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * Formatea tiempo para mostrar en formato 24 horas
 * @param time - Tiempo en formato HH:MM:SS o HH:MM
 * @returns Tiempo formateado (ej: "09:00", "17:00")
 */
export const formatTime24Hour = (time: string | undefined | null): string => {
  return convertToHHMM(time);
};

/**
 * Valida si un tiempo está en formato correcto
 * @param time - Tiempo a validar
 * @returns true si el formato es válido
 */
export const isValidTimeFormat = (time: string | undefined | null): boolean => {
  if (!time || typeof time !== 'string') {
    return false;
  }
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(time);
};

/**
 * Convierte segundos a formato legible
 * @param seconds - Número de segundos
 * @returns Formato legible (ej: "2h 30min", "45min")
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} seg`;
  }
  
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Formatea duración en segundos a un formato detallado y compacto:
 * - 0-59s => "Xs"
 * - <60min => "M:SS min" (o "M min" si SS=00)
 * - >=60min => "H:MM hrs" (o "H hrs" si MM=00)
 */
export const formatDurationDetailed = (seconds: number): string => {
  if (seconds <= 0 || !Number.isFinite(seconds)) return '0s';

  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }

  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (totalMinutes < 60) {
    if (remainingSeconds === 0) return `${totalMinutes} min`;
    return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (remainingMinutes === 0) return `${hours} hrs`;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')} hrs`;
};
