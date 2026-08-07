import { describe, it, expect } from 'vitest';
import {
  toFechaStr,
  hoy,
  sumarDias,
  diasDeAtraso,
  generarCuotas,
  proximaCuotaPendiente,
  frecuenciaNombre,
  frecuenciaPlural,
  capitalPendiente,
  saldoPendiente,
} from './calculos';

describe('toFechaStr', () => {
  it('formatea una fecha correctamente', () => {
    const d = new Date(2025, 0, 15); // 15 enero 2025
    expect(toFechaStr(d)).toBe('2025-01-15');
  });

  it('agrega padding a meses y días de un dígito', () => {
    const d = new Date(2025, 2, 5); // 5 marzo 2025
    expect(toFechaStr(d)).toBe('2025-03-05');
  });
});

describe('hoy', () => {
  it('devuelve una fecha en formato YYYY-MM-DD', () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('capitalPendiente', () => {
  it('baja al cobrar una cuota (capital 100, total 120, cuotas de 60)', () => {
    const prestamo = {
      monto: 100,
      cuotasDetalle: [
        { nro: 1, monto: 60, pagada: false, pagado: 0 },
        { nro: 2, monto: 60, pagada: false, pagado: 0 },
      ],
    };
    expect(capitalPendiente(prestamo)).toBe(100);

    // Se cobra la cuota 1: ratio capital = 100/120 → capital devuelto = 50.
    const cobrado = {
      ...prestamo,
      cuotasDetalle: [
        { nro: 1, monto: 60, pagada: true, pagado: 60 },
        { nro: 2, monto: 60, pagada: false, pagado: 0 },
      ],
    };
    expect(capitalPendiente(cobrado)).toBe(50);
  });

  it('sin interés, baja exactamente el monto cobrado', () => {
    const prestamo = {
      monto: 100,
      cuotasDetalle: [
        { nro: 1, monto: 50, pagada: true, pagado: 50 },
        { nro: 2, monto: 50, pagada: false, pagado: 0 },
      ],
    };
    expect(capitalPendiente(prestamo)).toBe(50);
  });

  it('nunca da negativo aunque se cobre de más', () => {
    const prestamo = {
      monto: 100,
      cuotasDetalle: [{ nro: 1, monto: 100, pagada: true, pagado: 100 }],
    };
    expect(capitalPendiente(prestamo)).toBe(0);
  });
});

describe('saldoPendiente', () => {
  it('incluye capital + interés (a diferencia de capitalPendiente)', () => {
    const prestamo = {
      monto: 100,
      cuotasDetalle: [
        { nro: 1, monto: 60, pagada: false, pagado: 0 },
        { nro: 2, monto: 60, pagada: false, pagado: 0 },
      ],
    };
    expect(saldoPendiente(prestamo)).toBe(120);
  });

  it('baja exactamente lo cobrado, sin prorratear interés', () => {
    const prestamo = {
      monto: 100,
      cuotasDetalle: [
        { nro: 1, monto: 60, pagada: true, pagado: 60 },
        { nro: 2, monto: 60, pagada: false, pagado: 0 },
      ],
    };
    expect(saldoPendiente(prestamo)).toBe(60);
  });

  it('devuelve 0 con todas las cuotas pagadas', () => {
    const prestamo = {
      monto: 100,
      cuotasDetalle: [{ nro: 1, monto: 120, pagada: true, pagado: 120 }],
    };
    expect(saldoPendiente(prestamo)).toBe(0);
  });
});

describe('sumarDias', () => {
  it('suma días correctamente', () => {
    expect(sumarDias('2025-01-01', 7)).toBe('2025-01-08');
  });

  it('cruza meses', () => {
    expect(sumarDias('2025-01-30', 5)).toBe('2025-02-04');
  });

  it('cruza años', () => {
    expect(sumarDias('2024-12-30', 5)).toBe('2025-01-04');
  });
});

describe('diasDeAtraso', () => {
  it('devuelve 0 si la cuota está pagada', () => {
    expect(diasDeAtraso({ pagada: true, vencimiento: '2020-01-01' })).toBe(0);
  });

  it('devuelve 0 si la cuota no venció', () => {
    const manana = sumarDias(hoy(), 1);
    expect(diasDeAtraso({ pagada: false, vencimiento: manana })).toBe(0);
  });

  it('devuelve días positivos si la cuota venció', () => {
    const haceUnaSemana = sumarDias(hoy(), -7);
    expect(diasDeAtraso({ pagada: false, vencimiento: haceUnaSemana })).toBe(7);
  });

  it('devuelve 0 si vence hoy', () => {
    expect(diasDeAtraso({ pagada: false, vencimiento: hoy() })).toBe(0);
  });
});

describe('generarCuotas', () => {
  it('genera la cantidad correcta de cuotas', () => {
    const cuotas = generarCuotas(100000, 30, 10, '2025-01-01');
    expect(cuotas).toHaveLength(10);
  });

  it('cada cuota tiene los campos requeridos', () => {
    const cuotas = generarCuotas(100000, 30, 5, '2025-01-01');
    cuotas.forEach((c) => {
      expect(c).toHaveProperty('nro');
      expect(c).toHaveProperty('monto');
      expect(c).toHaveProperty('vencimiento');
      expect(c).toHaveProperty('pagada', false);
      expect(c).toHaveProperty('fechaPago', null);
    });
  });

  it('la suma de cuotas es igual al total con interés', () => {
    const cuotas = generarCuotas(100000, 30, 10, '2025-01-01');
    const total = cuotas.reduce((s, c) => s + c.monto, 0);
    expect(total).toBe(130000);
  });

  it('las cuotas se espacian correctamente', () => {
    const cuotas = generarCuotas(100000, 30, 4, '2025-01-01', 7);
    expect(cuotas[0].vencimiento).toBe('2025-01-08');
    expect(cuotas[1].vencimiento).toBe('2025-01-15');
    expect(cuotas[2].vencimiento).toBe('2025-01-22');
    expect(cuotas[3].vencimiento).toBe('2025-01-29');
  });

  it('con frecuencia diaria espacía 1 día', () => {
    const cuotas = generarCuotas(10000, 0, 3, '2025-06-01', 1);
    expect(cuotas[0].vencimiento).toBe('2025-06-02');
    expect(cuotas[1].vencimiento).toBe('2025-06-03');
    expect(cuotas[2].vencimiento).toBe('2025-06-04');
  });

  it('rechaza monto <= 0', () => {
    expect(() => generarCuotas(0, 30, 10, '2025-01-01')).toThrow();
    expect(() => generarCuotas(-1000, 30, 10, '2025-01-01')).toThrow();
  });

  it('rechaza interés negativo', () => {
    expect(() => generarCuotas(100000, -10, 10, '2025-01-01')).toThrow();
  });

  it('rechaza cuotas < 1 o > 520', () => {
    expect(() => generarCuotas(100000, 30, 0, '2025-01-01')).toThrow();
    expect(() => generarCuotas(100000, 30, 521, '2025-01-01')).toThrow();
  });

  it('acepta interés 0%', () => {
    const cuotas = generarCuotas(10000, 0, 5, '2025-01-01');
    const total = cuotas.reduce((s, c) => s + c.monto, 0);
    expect(total).toBe(10000);
  });

  it('numera cuotas de 1 a N', () => {
    const cuotas = generarCuotas(100000, 10, 8, '2025-01-01');
    cuotas.forEach((c, i) => expect(c.nro).toBe(i + 1));
  });
});

describe('proximaCuotaPendiente', () => {
  it('devuelve la primera cuota no pagada', () => {
    const prestamo = {
      cuotasDetalle: [
        { nro: 1, pagada: true },
        { nro: 2, pagada: false },
        { nro: 3, pagada: false },
      ],
    };
    expect(proximaCuotaPendiente(prestamo)).toEqual({ nro: 2, pagada: false });
  });

  it('devuelve null si todas pagadas', () => {
    const prestamo = {
      cuotasDetalle: [
        { nro: 1, pagada: true },
        { nro: 2, pagada: true },
      ],
    };
    expect(proximaCuotaPendiente(prestamo)).toBeNull();
  });

  it('devuelve null para préstamo sin detalle', () => {
    expect(proximaCuotaPendiente(null)).toBeNull();
    expect(proximaCuotaPendiente({})).toBeNull();
  });
});

describe('frecuencia', () => {
  it('nombra las frecuencias conocidas', () => {
    expect(frecuenciaNombre(1)).toBe('Diaria');
    expect(frecuenciaNombre(7)).toBe('Semanal');
    expect(frecuenciaNombre(15)).toBe('Quincenal');
    expect(frecuenciaNombre(30)).toBe('Mensual');
  });

  it('pluraliza las frecuencias conocidas', () => {
    expect(frecuenciaPlural(1)).toBe('diarias');
    expect(frecuenciaPlural(7)).toBe('semanales');
    expect(frecuenciaPlural(30)).toBe('mensuales');
  });

  it('trata préstamos viejos sin frecuencia como semanales', () => {
    expect(frecuenciaPlural(undefined)).toBe('semanales');
    expect(frecuenciaNombre(null)).toBe('Semanal');
  });

  it('describe frecuencias no estándar por cantidad de días', () => {
    expect(frecuenciaPlural(10)).toBe('cada 10 días');
    expect(frecuenciaNombre(10)).toBe('Cada 10 días');
  });
});
