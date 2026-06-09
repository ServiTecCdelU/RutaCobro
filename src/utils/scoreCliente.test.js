import { describe, it, expect } from 'vitest';
import { scoreCliente } from './scoreCliente';

const cuota = (nro, venc, pagada, fechaPago) => ({
  nro,
  monto: 100,
  vencimiento: venc,
  pagada,
  fechaPago,
});

describe('scoreCliente', () => {
  it('marca "Nuevo" sin historial', () => {
    const r = scoreCliente([]);
    expect(r.score).toBeNull();
    expect(r.categoria).toBe('nuevo');
  });

  it('da score alto a quien paga siempre a tiempo y finalizó préstamos', () => {
    const r = scoreCliente([
      {
        estado: 'finalizado',
        cuotasDetalle: [
          cuota(1, '2026-01-08', true, '2026-01-07'),
          cuota(2, '2026-01-15', true, '2026-01-15'),
          cuota(3, '2026-01-22', true, '2026-01-20'),
        ],
      },
    ]);
    expect(r.stats.aTiempo).toBe(3);
    expect(r.stats.tarde).toBe(0);
    expect(r.stats.puntualidad).toBe(100);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.categoria).toBe('excelente');
  });

  it('penaliza pagos tardíos y calcula atraso promedio', () => {
    const r = scoreCliente([
      {
        estado: 'finalizado',
        cuotasDetalle: [
          cuota(1, '2026-01-08', true, '2026-01-18'), // 10 días tarde
          cuota(2, '2026-01-15', true, '2026-01-15'), // a tiempo
        ],
      },
    ]);
    expect(r.stats.tarde).toBe(1);
    expect(r.stats.aTiempo).toBe(1);
    expect(r.stats.atrasoPromedio).toBe(10);
    expect(r.stats.puntualidad).toBe(50);
  });

  it('penaliza mora actual y refinanciaciones', () => {
    const conMora = scoreCliente([
      {
        estado: 'mora',
        refinanciaciones: 2,
        cuotasDetalle: [
          cuota(1, '2020-01-08', false, null), // vencida hace años
          cuota(2, '2020-01-15', false, null),
        ],
      },
    ]);
    expect(conMora.stats.moraActual).toBe(2);
    expect(conMora.stats.refinanciaciones).toBe(2);
    expect(conMora.score).toBeLessThan(70);
  });
});
