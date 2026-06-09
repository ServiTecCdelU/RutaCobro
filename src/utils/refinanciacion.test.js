import { describe, it, expect } from 'vitest';
import { calcularSaldo, construirRefinanciacion } from './refinanciacion';

const prestamo = {
  monto: 100000,
  cuotasDetalle: [
    { nro: 1, monto: 100, vencimiento: '2026-04-08', pagada: true, pagado: 100 },
    { nro: 2, monto: 100, vencimiento: '2026-04-15', pagada: false, pagado: 40 },
    { nro: 3, monto: 100, vencimiento: '2026-04-22', pagada: false },
  ],
};

describe('calcularSaldo', () => {
  it('suma lo que falta de cuotas no saldadas (descuenta parciales)', () => {
    // cuota1: 0 · cuota2: 100-40=60 · cuota3: 100 → 160
    expect(calcularSaldo(prestamo)).toBe(160);
  });
  it('es 0 si todo está pagado', () => {
    expect(calcularSaldo({ cuotasDetalle: [{ monto: 100, pagada: true }] })).toBe(0);
  });
});

describe('construirRefinanciacion', () => {
  it('conserva lo cobrado y agrega un cronograma nuevo sobre el saldo', () => {
    const { saldo, cuotasDetalle } = construirRefinanciacion(prestamo, {
      interes: 0,
      cuotas: 4,
      frecuenciaDias: 7,
      fechaInicio: '2026-06-08',
    });
    expect(saldo).toBe(160);
    // conserva: cuota1 (pagada) + cuota2 saldada a 40 = 2 cuotas
    const nuevas = cuotasDetalle.filter((c) => c.refinanciada && !c.pagada);
    expect(cuotasDetalle).toHaveLength(6); // 2 conservadas + 4 nuevas
    expect(nuevas).toHaveLength(4);
    // las nuevas suman el saldo (interés 0)
    expect(nuevas.reduce((s, c) => s + c.monto, 0)).toBe(160);
    // numeración contigua
    expect(cuotasDetalle.map((c) => c.nro)).toEqual([1, 2, 3, 4, 5, 6]);
    // la cuota parcial quedó saldada por lo cobrado
    const cuota2 = cuotasDetalle[1];
    expect(cuota2.pagada).toBe(true);
    expect(cuota2.monto).toBe(40);
  });

  it('aplica el nuevo interés sobre el saldo', () => {
    const { cuotasDetalle } = construirRefinanciacion(prestamo, {
      interes: 50,
      cuotas: 2,
      frecuenciaDias: 7,
      fechaInicio: '2026-06-08',
    });
    const nuevas = cuotasDetalle.filter((c) => c.refinanciada && !c.pagada);
    // 160 * 1.5 = 240
    expect(nuevas.reduce((s, c) => s + c.monto, 0)).toBe(240);
  });

  it('lanza error si no hay saldo', () => {
    expect(() =>
      construirRefinanciacion(
        { cuotasDetalle: [{ monto: 100, pagada: true }] },
        { interes: 10, cuotas: 2, fechaInicio: '2026-06-08' },
      ),
    ).toThrow();
  });
});
