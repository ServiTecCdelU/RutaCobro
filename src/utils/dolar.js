// Cotización del dólar para Argentina vía dolarapi.com (pública, con CORS, sin auth).
// Ayuda al admin a ver el valor real de la cartera más allá del peso.
const URL = 'https://dolarapi.com/v1/dolares';

/**
 * Convierte el array de dolarapi.com a un mapa indexado por casa.
 * @param {Array<{casa:string, nombre?:string, compra?:number, venta?:number, fechaActualizacion?:string}>} arr
 * @returns {Record<string, { nombre: string, compra: number|null, venta: number|null, actualizado: string|null }>}
 */
export const parseDolares = (arr) => {
  if (!Array.isArray(arr)) return {};
  const out = {};
  for (const d of arr) {
    if (!d?.casa) continue;
    out[d.casa] = {
      nombre: d.nombre ?? d.casa,
      compra: Number.isFinite(Number(d.compra)) ? Number(d.compra) : null,
      venta: Number.isFinite(Number(d.venta)) ? Number(d.venta) : null,
      actualizado: d.fechaActualizacion ?? null,
    };
  }
  return out;
};

/**
 * Convierte un monto en pesos a dólares según la venta indicada.
 * @returns {number|null} dólares redondeados, o null si la cotización no es válida
 */
export const pesosAUsd = (pesos, venta) => {
  const v = Number(venta);
  const p = Number(pesos);
  if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(p)) return null;
  return Math.round(p / v);
};

/** Brecha porcentual entre dos cotizaciones (ej: blue sobre oficial). */
export const brechaPct = (alta, baja) => {
  if (alta == null || baja == null) return null;
  const a = Number(alta);
  const b = Number(baja);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return Math.round(((a - b) / b) * 100);
};

/** Formato de dólares con prefijo US$ y sin decimales. */
export const formatUsd = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 'US$0';
  return 'US$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

/**
 * Consulta dolarapi.com y devuelve el mapa de cotizaciones parseado.
 * @returns {Promise<Record<string, object>>}
 */
export const consultarDolares = async () => {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`dolarapi respondió ${res.status}`);
  return parseDolares(await res.json());
};
