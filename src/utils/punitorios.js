export const PUNITORIO_DEFAULT = {
  activo: false,
  tasaDiariaPct: 1,
  diasGracia: 0,
  topePct: 50,
};

const numeroODefault = (valor, def) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, n);
};

/** Completa y sanea la config de punitorios guardada en config/negocio. */
export const normalizarPunitorio = (config) => ({
  activo: config?.activo === true,
  tasaDiariaPct: numeroODefault(config?.tasaDiariaPct, PUNITORIO_DEFAULT.tasaDiariaPct),
  diasGracia: numeroODefault(config?.diasGracia, PUNITORIO_DEFAULT.diasGracia),
  topePct: numeroODefault(config?.topePct, PUNITORIO_DEFAULT.topePct),
});

const diffDias = (desde, hasta) =>
  Math.round((new Date(hasta + 'T00:00:00') - new Date(desde + 'T00:00:00')) / 86400000);

/**
 * Punitorio de una cuota vencida: tasa diaria sobre el saldo pendiente,
 * después de los días de gracia y con tope como % del monto de la cuota.
 * @returns {{ dias: number, monto: number }} días computados y recargo en pesos
 */
export const calcularPunitorio = (cuota, configPunitorio, hoyStr) => {
  const cfg = normalizarPunitorio(configPunitorio);
  if (!cfg.activo || cuota.pagada || !cuota.vencimiento) return { dias: 0, monto: 0 };

  const atraso = diffDias(cuota.vencimiento, hoyStr);
  const dias = Math.max(0, atraso - cfg.diasGracia);
  if (dias === 0) return { dias: 0, monto: 0 };

  const saldo = Math.max(0, (cuota.monto ?? 0) - (cuota.pagado ?? 0));
  const recargo = saldo * (cfg.tasaDiariaPct / 100) * dias;
  const tope = (cuota.monto ?? 0) * (cfg.topePct / 100);
  return { dias, monto: Math.round(Math.min(recargo, tope)) };
};

/** Suma de punitorios de todas las cuotas impagas de un préstamo. */
export const punitorioDePrestamo = (prestamo, configPunitorio, hoyStr) =>
  (prestamo?.cuotasDetalle ?? []).reduce(
    (total, c) => total + calcularPunitorio(c, configPunitorio, hoyStr).monto,
    0,
  );
