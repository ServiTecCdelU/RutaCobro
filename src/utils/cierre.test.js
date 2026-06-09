import { describe, it, expect } from 'vitest';
import { construirCierre } from './cierre';

const clientes = [
  { id: 'c1', rutaId: 'r1' },
  { id: 'c2', rutaId: 'r2' },
];
const rutas = [
  { id: 'r1', nombre: 'Centro' },
  { id: 'r2', nombre: 'Norte' },
];

const base = {
  clientes,
  rutas,
  desde: '2026-06-08',
  hasta: '2026-06-08',
};

describe('construirCierre', () => {
  it('imputa cobros, gastos y préstamos a la ruta correcta', () => {
    const { porRuta } = construirCierre({
      ...base,
      movimientos: [
        { clienteId: 'c1', monto: 1000, fecha: '2026-06-08' },
        { clienteId: 'c1', monto: 500, fecha: '2026-06-08' },
        { clienteId: 'c2', monto: 800, fecha: '2026-06-08' },
      ],
      gastos: [{ rutaId: 'r1', monto: 300, fecha: '2026-06-08' }],
      prestamos: [{ clienteId: 'c2', monto: 2000, fechaInicio: '2026-06-08' }],
    });
    const r1 = porRuta.find((r) => r.ruta.id === 'r1');
    const r2 = porRuta.find((r) => r.ruta.id === 'r2');
    expect(r1.cobrado).toBe(1500);
    expect(r1.cobros).toBe(2);
    expect(r1.gastos).toBe(300);
    expect(r1.neto).toBe(1200); // 1500 - 300 - 0
    expect(r2.cobrado).toBe(800);
    expect(r2.prestado).toBe(2000);
    expect(r2.neto).toBe(-1200); // 800 - 0 - 2000
  });

  it('incluye rutas sin actividad (cobrador que no rindió)', () => {
    const { porRuta } = construirCierre({ ...base, movimientos: [], gastos: [], prestamos: [] });
    expect(porRuta).toHaveLength(2);
    expect(porRuta.every((r) => r.cobrado === 0 && r.neto === 0)).toBe(true);
  });

  it('excluye lo que está fuera del rango de fechas', () => {
    const { totales } = construirCierre({
      ...base,
      movimientos: [
        { clienteId: 'c1', monto: 1000, fecha: '2026-06-08' },
        { clienteId: 'c1', monto: 9999, fecha: '2026-06-07' },
      ],
      gastos: [{ rutaId: 'r1', monto: 100, fecha: '2026-06-01' }],
      prestamos: [{ clienteId: 'c1', monto: 5000, fechaInicio: '2026-06-09' }],
    });
    expect(totales.cobrado).toBe(1000);
    expect(totales.gastos).toBe(0);
    expect(totales.prestado).toBe(0);
  });

  it('calcula totales sumando todas las rutas', () => {
    const { totales } = construirCierre({
      ...base,
      movimientos: [
        { clienteId: 'c1', monto: 1000, fecha: '2026-06-08' },
        { clienteId: 'c2', monto: 800, fecha: '2026-06-08' },
      ],
      gastos: [{ rutaId: 'r2', monto: 200, fecha: '2026-06-08' }],
      prestamos: [],
    });
    expect(totales.cobrado).toBe(1800);
    expect(totales.gastos).toBe(200);
    expect(totales.neto).toBe(1600);
    expect(totales.cobros).toBe(2);
  });
});
