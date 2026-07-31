// Operaciones que NO pueden completarse sin conexión.
//
// Firestore encola las escrituras simples en el caché local y las sincroniza al
// reconectar, pero `runTransaction` **exige red**: falla de inmediato si no hay.
// Cobrar, pagar y revertir son transacciones, así que sin señal no se registran.
//
// Hasta que exista la cola de pendientes (Fase 2B del plan), la única conducta
// honesta es avisar antes de que el cobrador crea que cobró.
export const OPERACIONES_REQUIEREN_RED = ['cobrar', 'pagar', 'revertir', 'refinanciar'];

export const MENSAJE_SIN_CONEXION =
  'Sin conexión: el cobro no se puede registrar todavía. Anotalo y reintentá cuando tengas señal.';

/**
 * `navigator.onLine` es confiable en negativo (false = seguro sin red) pero no
 * en positivo (true con wifi sin internet). Se usa solo para bloquear, nunca
 * para dar por buena una operación.
 */
export const estaOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * Traduce un error de Firestore a un mensaje entendible por el cobrador.
 * `unavailable` es el código que devuelve una transacción sin red.
 */
export const mensajeDeError = (err) => {
  if (!err) return 'Error desconocido';
  if (err.code === 'unavailable' || estaOffline()) return MENSAJE_SIN_CONEXION;
  if (err.code === 'permission-denied') return 'No tenés permiso para esta operación.';
  if (err.code === 'deadline-exceeded') return 'La conexión está muy lenta. Reintentá.';
  return err.message ?? 'Error desconocido';
};
