// Fecha local en formato YYYY-MM-DD.
export const hoy = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

const MS_DIA = 86400000;

/**
 * Días de atraso de una cuota respecto de `hoyStr` (YYYY-MM-DD).
 * 0 si está pagada o si todavía no venció.
 */
export const diasDeAtraso = (cuota, hoyStr) => {
  if (!cuota || cuota.pagada || !cuota.vencimiento) return 0;
  const venc = new Date(cuota.vencimiento + 'T00:00:00');
  const ref = new Date(hoyStr + 'T00:00:00');
  const diff = Math.floor((ref - venc) / MS_DIA);
  return diff > 0 ? diff : 0;
};
