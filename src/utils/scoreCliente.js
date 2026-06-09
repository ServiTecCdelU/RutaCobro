import { diasDeAtraso } from '@/utils/calculos';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const diffDias = (desde, hasta) =>
  Math.round((new Date(hasta + 'T00:00:00') - new Date(desde + 'T00:00:00')) / 86400000);

const CATEGORIAS = {
  excelente: { label: 'Excelente', color: '#10b981' },
  bueno: { label: 'Bueno', color: '#22c55e' },
  regular: { label: 'Regular', color: '#f59e0b' },
  riesgoso: { label: 'Riesgoso', color: '#f43f5e' },
  nuevo: { label: 'Nuevo', color: '#64748b' },
};

const categoriaDeScore = (score) => {
  if (score >= 85) return 'excelente';
  if (score >= 70) return 'bueno';
  if (score >= 50) return 'regular';
  return 'riesgoso';
};

/**
 * Score de riesgo del cliente (0-100) derivado de su historial de pagos.
 * Se basa en la puntualidad (cuotas pagadas a tiempo vs tarde), penaliza la mora
 * actual y las refinanciaciones, y premia los préstamos finalizados.
 * @param {Array} prestamos préstamos del cliente
 * @returns {{ score: number|null, categoria: string, label: string, color: string, stats: object }}
 */
export const scoreCliente = (prestamos = []) => {
  let cuotasPagadas = 0;
  let aTiempo = 0;
  let tarde = 0;
  let sumAtraso = 0;
  let moraActual = 0;
  let montoEnMora = 0;
  let refinanciaciones = 0;
  let finalizados = 0;
  let activos = 0;

  for (const p of prestamos) {
    if (p.estado === 'finalizado') finalizados++;
    else activos++;
    refinanciaciones += p.refinanciaciones ?? 0;

    for (const c of p.cuotasDetalle ?? []) {
      if (c.pagada) {
        cuotasPagadas++;
        if (c.fechaPago && c.vencimiento) {
          if (c.fechaPago <= c.vencimiento) {
            aTiempo++;
          } else {
            tarde++;
            sumAtraso += Math.max(0, diffDias(c.vencimiento, c.fechaPago));
          }
        } else {
          aTiempo++;
        }
      } else {
        const atraso = diasDeAtraso(c);
        if (atraso > 0) {
          moraActual++;
          montoEnMora += (c.monto ?? 0) - (c.pagado ?? 0);
        }
      }
    }
  }

  const evaluadas = aTiempo + tarde;
  const puntualidad = evaluadas > 0 ? Math.round((aTiempo / evaluadas) * 100) : null;
  const atrasoPromedio = tarde > 0 ? Math.round(sumAtraso / tarde) : 0;

  const stats = {
    prestamos: prestamos.length,
    finalizados,
    activos,
    cuotasPagadas,
    aTiempo,
    tarde,
    puntualidad,
    atrasoPromedio,
    moraActual,
    montoEnMora,
    refinanciaciones,
  };

  if (prestamos.length === 0) {
    return { score: null, categoria: 'nuevo', ...CATEGORIAS.nuevo, stats };
  }

  // Base: puntualidad; si todavía no hay cuotas evaluables, neutral 70.
  let score = evaluadas > 0 ? (aTiempo / evaluadas) * 100 : 70;
  score -= Math.min(moraActual * 8, 30);
  score -= Math.min(refinanciaciones * 5, 15);
  score += Math.min(finalizados * 3, 10);
  score = clamp(Math.round(score), 0, 100);

  const categoria = categoriaDeScore(score);
  return { score, categoria, ...CATEGORIAS[categoria], stats };
};
