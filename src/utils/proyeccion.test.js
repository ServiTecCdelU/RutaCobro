import { describe, it, expect } from 'vitest';
import { proyeccionDeCaja } from './proyeccion';

const HOY = '2026-06-11';

const prestamo = (estado, cuotas) => ({ estado, cuotasDetalle: cuotas });

describe('proyeccionDeCaja', () => {
  it('agrupa cuotas pendientes en semanas de 7 días desde hoy', () => {
    const prestamos = [
      prestamo('activo', [
        { nro: 1, monto: 1000, vencimiento: '2026-06-11', pagada: false }, // semana 0
        { nro: 2, monto: 1000, vencimiento: '2026-06-17', pagada: false }, // semana 0 (último día)
        { nro: 3, monto: 1000, vencimiento: '2026-06-18', pagada: false }, // semana 1
        { nro: 4, monto: 1000, vencimiento: '2026-07-08', pagada: false }, // semana 3 (fin)
      ]),
    ];
    const r = proyeccionDeCaja(prestamos, HOY, 4);
    expect(r.semanas).toHaveLength(4);
    expect(r.semanas[0]).toMatchObject({
      desde: '2026-06-11',
      hasta: '2026-06-17',
      esperado: 2000,
      cuotas: 2,
    });
    expect(r.semanas[1].esperado).toBe(1000);
    expect(r.semanas[2].esperado).toBe(0);
    expect(r.semanas[3].esperado).toBe(1000);
  });

  it('acumula lo vencido (anterior a hoy) por separado', () => {
    const prestamos = [
      prestamo('mora', [
        { nro: 1, monto: 500, vencimiento: '2026-06-01', pagada: false },
        { nro: 2, monto: 500, vencimiento: '2026-06-10', pagada: false },
      ]),
    ];
    const r = proyeccionDeCaja(prestamos, HOY, 2);
    expect(r.vencido).toBe(1000);
    expect(r.semanas[0].esperado).toBe(0);
  });

  it('usa el saldo pendiente en cuotas con pago parcial', () => {
    const prestamos = [
      prestamo('activo', [
        { nro: 1, monto: 1000, pagado: 400, vencimiento: '2026-06-12', pagada: false },
      ]),
    ];
    const r = proyeccionDeCaja(prestamos, HOY, 1);
    expect(r.semanas[0].esperado).toBe(600);
  });

  it('ignora cuotas pagadas, préstamos finalizados y cuotas más allá del horizonte', () => {
    const prestamos = [
      prestamo('activo', [
        { nro: 1, monto: 1000, vencimiento: '2026-06-12', pagada: true },
        { nro: 2, monto: 1000, vencimiento: '2026-12-01', pagada: false }, // fuera de horizonte
      ]),
      prestamo('finalizado', [{ nro: 1, monto: 9999, vencimiento: '2026-06-12', pagada: false }]),
    ];
    const r = proyeccionDeCaja(prestamos, HOY, 2);
    expect(r.vencido).toBe(0);
    expect(r.semanas.every((s) => s.esperado === 0)).toBe(true);
    expect(r.totalHorizonte).toBe(0);
  });

  it('calcula el total del horizonte (vencido + semanas)', () => {
    const prestamos = [
      prestamo('activo', [
        { nro: 1, monto: 300, vencimiento: '2026-06-01', pagada: false },
        { nro: 2, monto: 700, vencimiento: '2026-06-15', pagada: false },
      ]),
    ];
    const r = proyeccionDeCaja(prestamos, HOY, 1);
    expect(r.totalHorizonte).toBe(1000);
  });
});
