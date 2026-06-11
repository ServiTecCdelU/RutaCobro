import { sumarDias } from '@/utils/calculos';

const saldoCuota = (c) => Math.max(0, (c.monto ?? 0) - (c.pagado ?? (c.pagada ? c.monto : 0)));

/**
 * Proyección de cobranza: cuotas pendientes agrupadas en semanas de 7 días
 * desde hoy, más el acumulado vencido (atrasado a recuperar).
 * @param {Array} prestamos
 * @param {string} hoyStr fecha YYYY-MM-DD
 * @param {number} cantSemanas horizonte en semanas
 * @returns {{ vencido: number, semanas: Array<{desde, hasta, esperado, cuotas}>, totalHorizonte: number }}
 */
export const proyeccionDeCaja = (prestamos, hoyStr, cantSemanas = 4) => {
  const semanas = Array.from({ length: cantSemanas }, (_, i) => ({
    desde: sumarDias(hoyStr, i * 7),
    hasta: sumarDias(hoyStr, i * 7 + 6),
    esperado: 0,
    cuotas: 0,
  }));
  let vencido = 0;

  for (const p of prestamos) {
    if (p.estado === 'finalizado') continue;
    for (const c of p.cuotasDetalle ?? []) {
      if (c.pagada || !c.vencimiento) continue;
      const saldo = saldoCuota(c);
      if (saldo <= 0) continue;
      if (c.vencimiento < hoyStr) {
        vencido += saldo;
        continue;
      }
      const semana = semanas.find((s) => c.vencimiento >= s.desde && c.vencimiento <= s.hasta);
      if (semana) {
        semana.esperado += saldo;
        semana.cuotas += 1;
      }
    }
  }

  const totalHorizonte = vencido + semanas.reduce((s, w) => s + w.esperado, 0);
  return { vencido, semanas, totalHorizonte };
};
