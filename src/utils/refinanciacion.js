import { generarCuotas } from '@/utils/calculos';

/** Saldo pendiente del préstamo (suma de lo que falta de cada cuota no saldada). */
export const calcularSaldo = (prestamo) =>
  (prestamo?.cuotasDetalle ?? []).reduce(
    (s, c) => s + (c.pagada ? 0 : (c.monto ?? 0) - (c.pagado ?? 0)),
    0,
  );

// Conserva las cuotas con plata recibida: las pagadas tal cual y las parciales saldadas
// por el monto efectivamente cobrado. Las totalmente impagas se descartan (su saldo se
// traslada al nuevo cronograma).
const cuotasConservadas = (cuotasDetalle = []) =>
  cuotasDetalle
    .filter((c) => c.pagada || (c.pagado ?? 0) > 0)
    .map((c) => (c.pagada ? c : { ...c, monto: c.pagado, pagada: true, refinanciada: true }));

/**
 * Reestructura el saldo del préstamo: mantiene lo ya cobrado y reemplaza las cuotas
 * impagas por un cronograma nuevo (nuevo interés/cantidad/frecuencia) sobre el saldo.
 * No crea un préstamo nuevo ni mueve caja (el capital ya estaba colocado).
 * @returns {{ saldo: number, cuotasDetalle: Array }}
 */
export const construirRefinanciacion = (
  prestamo,
  { interes, cuotas, frecuenciaDias = 7, fechaInicio },
) => {
  const saldo = calcularSaldo(prestamo);
  if (!(saldo > 0)) throw new Error('El préstamo no tiene saldo para refinanciar');

  const conservadas = cuotasConservadas(prestamo?.cuotasDetalle);
  const base = conservadas.length;
  const nuevas = generarCuotas(saldo, interes, cuotas, fechaInicio, frecuenciaDias).map((c, i) => ({
    ...c,
    nro: base + i + 1,
    refinanciada: true,
  }));

  return { saldo, cuotasDetalle: [...conservadas, ...nuevas] };
};
