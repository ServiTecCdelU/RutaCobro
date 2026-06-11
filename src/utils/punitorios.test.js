import { describe, it, expect } from 'vitest';
import {
  PUNITORIO_DEFAULT,
  normalizarPunitorio,
  calcularPunitorio,
  punitorioDePrestamo,
} from './punitorios';

const HOY = '2026-06-11';
const config = { activo: true, tasaDiariaPct: 1, diasGracia: 0, topePct: 50 };

const cuota = (overrides) => ({
  nro: 1,
  monto: 10000,
  vencimiento: '2026-06-01',
  pagada: false,
  ...overrides,
});

describe('normalizarPunitorio', () => {
  it('devuelve defaults si no hay config', () => {
    expect(normalizarPunitorio(null)).toEqual(PUNITORIO_DEFAULT);
    expect(normalizarPunitorio(undefined)).toEqual(PUNITORIO_DEFAULT);
  });

  it('completa campos faltantes y sanea valores inválidos', () => {
    const n = normalizarPunitorio({ activo: true, tasaDiariaPct: -5 });
    expect(n.activo).toBe(true);
    expect(n.tasaDiariaPct).toBe(0);
    expect(n.diasGracia).toBe(PUNITORIO_DEFAULT.diasGracia);
    expect(n.topePct).toBe(PUNITORIO_DEFAULT.topePct);
  });
});

describe('calcularPunitorio', () => {
  it('calcula tasa diaria sobre el saldo de la cuota', () => {
    // 10 días de atraso × 1% × $10.000 = $1.000
    const r = calcularPunitorio(cuota(), config, HOY);
    expect(r.dias).toBe(10);
    expect(r.monto).toBe(1000);
  });

  it('descuenta los días de gracia', () => {
    const r = calcularPunitorio(cuota(), { ...config, diasGracia: 7 }, HOY);
    expect(r.dias).toBe(3);
    expect(r.monto).toBe(300);
  });

  it('aplica el tope como % del monto de la cuota', () => {
    // 100 días × 1% = 100% pero tope 50% → $5.000
    const r = calcularPunitorio(cuota({ vencimiento: '2026-03-03' }), config, HOY);
    expect(r.monto).toBe(5000);
  });

  it('usa el saldo pendiente si hay pago parcial', () => {
    // saldo $4.000 × 1% × 10 días = $400
    const r = calcularPunitorio(cuota({ pagado: 6000 }), config, HOY);
    expect(r.monto).toBe(400);
  });

  it('devuelve 0 si está desactivado, pagada, o sin atraso', () => {
    expect(calcularPunitorio(cuota(), { ...config, activo: false }, HOY).monto).toBe(0);
    expect(calcularPunitorio(cuota({ pagada: true }), config, HOY).monto).toBe(0);
    expect(calcularPunitorio(cuota({ vencimiento: '2026-06-11' }), config, HOY).monto).toBe(0);
    expect(calcularPunitorio(cuota({ vencimiento: '2026-06-20' }), config, HOY).monto).toBe(0);
  });

  it('dentro del período de gracia no genera punitorio', () => {
    const r = calcularPunitorio(
      cuota({ vencimiento: '2026-06-08' }),
      { ...config, diasGracia: 5 },
      HOY,
    );
    expect(r.dias).toBe(0);
    expect(r.monto).toBe(0);
  });
});

describe('punitorioDePrestamo', () => {
  it('suma los punitorios de todas las cuotas impagas', () => {
    const prestamo = {
      cuotasDetalle: [
        cuota({ nro: 1, vencimiento: '2026-06-01' }), // 10 días → $1.000
        cuota({ nro: 2, vencimiento: '2026-06-06' }), // 5 días → $500
        cuota({ nro: 3, vencimiento: '2026-06-20' }), // futura → 0
        cuota({ nro: 4, pagada: true, vencimiento: '2026-05-01' }), // pagada → 0
      ],
    };
    expect(punitorioDePrestamo(prestamo, config, HOY)).toBe(1500);
  });

  it('devuelve 0 con config desactivada o sin cuotas', () => {
    expect(punitorioDePrestamo({ cuotasDetalle: [] }, config, HOY)).toBe(0);
    expect(punitorioDePrestamo({ cuotasDetalle: [cuota()] }, null, HOY)).toBe(0);
  });
});
