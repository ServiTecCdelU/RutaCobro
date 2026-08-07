export const toFechaStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const hoy = () => toFechaStr(new Date());

export const sumarDias = (fechaStr, dias) => {
  const d = new Date(fechaStr + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return toFechaStr(d);
};

// Una cuota está en mora hasta saldarse por completo (pagada === true).
// Un pago parcial no resetea el contador: se cuentan días desde el vencimiento original.
export const diasDeAtraso = (cuota) => {
  if (cuota.pagada) return 0;
  const venc = new Date(cuota.vencimiento + 'T00:00:00');
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  const diff = Math.floor((ahora - venc) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const generarCuotas = (monto, interes, cantCuotas, fechaInicio, frecuenciaDias = 7) => {
  if (monto <= 0) throw new Error('El monto debe ser mayor a 0');
  if (interes < 0) throw new Error('El interés no puede ser negativo');
  if (cantCuotas < 1 || cantCuotas > 520)
    throw new Error('La cantidad de cuotas debe estar entre 1 y 520');
  if (frecuenciaDias < 1) throw new Error('La frecuencia debe ser al menos 1 día');
  const total = Math.round(monto * (1 + interes / 100));
  const valorCuota = Math.round(total / cantCuotas);
  const ultima = total - valorCuota * (cantCuotas - 1);
  return Array.from({ length: cantCuotas }, (_, i) => ({
    nro: i + 1,
    monto: i === cantCuotas - 1 ? ultima : valorCuota,
    vencimiento: sumarDias(fechaInicio, frecuenciaDias * (i + 1)),
    pagada: false,
    fechaPago: null,
  }));
};

export const proximaCuotaPendiente = (prestamo) =>
  prestamo?.cuotasDetalle?.find((c) => !c.pagada) ?? null;

// Capital todavía no devuelto de un préstamo: reparte lo cobrado proporcionalmente
// entre capital e interés (mismo criterio que capitalRecuperado en useMetricas).
export const capitalPendiente = (prestamo) => {
  const capital = prestamo.monto ?? 0;
  const cuotas = prestamo.cuotasDetalle ?? [];
  const totalPrestamo = cuotas.reduce((s, c) => s + c.monto, 0);
  const ratioCapital = totalPrestamo > 0 ? capital / totalPrestamo : 0;
  const cobrado = cuotas.reduce((s, c) => s + (c.pagado ?? (c.pagada ? c.monto : 0)), 0);
  const capitalDevuelto = cobrado * ratioCapital;
  return Math.max(0, capital - capitalDevuelto);
};

// Frecuencias de pago conocidas (en días). Los préstamos viejos sin `frecuenciaDias`
// se tratan como semanales (7), que era el comportamiento histórico.
const FRECUENCIAS = {
  1: { singular: 'Diaria', plural: 'diarias' },
  7: { singular: 'Semanal', plural: 'semanales' },
  15: { singular: 'Quincenal', plural: 'quincenales' },
  30: { singular: 'Mensual', plural: 'mensuales' },
};

export const frecuenciaNombre = (dias) => {
  const d = dias ?? 7;
  return FRECUENCIAS[d]?.singular ?? `Cada ${d} días`;
};

export const frecuenciaPlural = (dias) => {
  const d = dias ?? 7;
  return FRECUENCIAS[d]?.plural ?? `cada ${d} días`;
};
