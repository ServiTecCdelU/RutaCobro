import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMetricas } from './useMetricas';
import { hoy, sumarDias } from '@/utils/calculos';

const cliente = (id, rutaId) => ({ id, nombre: `Cliente ${id}`, rutaId });

// Préstamo de capital 100, total 120 (20% interés), 2 cuotas de 60.
const prestamoBase = (id, clienteId, estado, cuotas) => ({
  id,
  clienteId,
  monto: 100,
  estado,
  cuotasDetalle: cuotas,
});

describe('useMetricas', () => {
  it('capital en calle (colocado) excluye préstamos finalizados (BUG-1)', () => {
    const clientes = [cliente('c1', 'r1'), cliente('c2', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 7) },
        { nro: 2, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 14) },
      ]),
      prestamoBase('p2', 'c2', 'finalizado', [
        { nro: 1, monto: 60, pagada: true, pagado: 60, vencimiento: sumarDias(hoy(), -14) },
        { nro: 2, monto: 60, pagada: true, pagado: 60, vencimiento: sumarDias(hoy(), -7) },
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    // colocado = saldo pendiente (capital+interés) solo del activo (120), no incluye el finalizado
    expect(result.current.colocado).toBe(120);
    // histórico sí incluye ambos (solo capital)
    expect(result.current.colocadoHistorico).toBe(200);
  });

  it('en calle baja al cobrar una cuota de un préstamo activo', () => {
    const clientes = [cliente('c1', 'r1')];
    // Capital 100, total 120. Antes de cobrar, nada pagado → en calle = 120 (todo pendiente).
    const antesDeCobrar = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 7) },
        { nro: 2, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 14) },
      ]),
    ];
    const { result: antes } = renderHook(() => useMetricas(antesDeCobrar, clientes, [], 'all'));
    expect(antes.current.colocado).toBe(120);

    // Se cobra la cuota 1 (60): queda pendiente solo la cuota 2 (60).
    const despuesDeCobrar = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: true, pagado: 60, vencimiento: sumarDias(hoy(), 7) },
        { nro: 2, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 14) },
      ]),
    ];
    const { result: despues } = renderHook(() => useMetricas(despuesDeCobrar, clientes, [], 'all'));
    expect(despues.current.colocado).toBe(60);
  });

  it('separa ganancia realizada de proyectada y calcula capital recuperado', () => {
    const clientes = [cliente('c1', 'r1')];
    // Capital 100, total 120 → 20 de interés. Cobrada 1 cuota de 60.
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: true, pagado: 60, vencimiento: sumarDias(hoy(), -7) },
        { nro: 2, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 7) },
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.gananciaProyectada).toBe(20);
    // De los 60 cobrados, ratio capital = 100/120 → recuperado = 50, ganancia = 10
    expect(result.current.capitalRecuperado).toBe(50);
    expect(result.current.gananciaRealizada).toBe(10);
    expect(result.current.cobradoTotal).toBe(60);
  });

  it('clasifica la mora por antigüedad en buckets', () => {
    const clientes = [cliente('c1', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'mora', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), -3) }, // 1-7
        { nro: 2, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), -15) }, // 8-30
        { nro: 3, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), -40) }, // +30
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.moraBuckets.b1_7.cant).toBe(1);
    expect(result.current.moraBuckets.b8_30.cant).toBe(1);
    expect(result.current.moraBuckets.b30plus.cant).toBe(1);
    expect(result.current.enMoraCant).toBe(3);
  });

  it('proyección 7 días suma cuotas que vencen en la próxima semana', () => {
    const clientes = [cliente('c1', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: hoy() }, // hoy: cuenta
        { nro: 2, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 5) }, // cuenta
        { nro: 3, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 20) }, // no
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.proyeccion7dias).toBe(120);
  });

  it('cuotas de hoy: cuenta y suma solo las que vencen hoy', () => {
    const clientes = [cliente('c1', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: hoy() },
        { nro: 2, monto: 40, pagada: false, pagado: 0, vencimiento: hoy() },
        { nro: 3, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 1) },
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.cuotasHoyCant).toBe(2);
    expect(result.current.aCobrarHoy).toBe(100);
  });

  it('monto en mora y tasa de mora sobre el total de cuotas', () => {
    const clientes = [cliente('c1', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'mora', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), -5) }, // mora
        { nro: 2, monto: 60, pagada: true, pagado: 60, vencimiento: sumarDias(hoy(), -12) },
        { nro: 3, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 5) }, // no vencida
        { nro: 4, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 12) },
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.montoMora).toBe(60);
    expect(result.current.enMoraCant).toBe(1);
    expect(result.current.tasaMora).toBeCloseTo(25); // 1 de 4 cuotas
  });

  it('ROI = ganancia proyectada sobre el capital histórico colocado', () => {
    const clientes = [cliente('c1', 'r1')];
    // Capital 100, total 120 → 20 de interés → ROI = 20%
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 7) },
        { nro: 2, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 14) },
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.roi).toBeCloseTo(20);
  });

  it('ticket promedio = capital histórico dividido cantidad de préstamos', () => {
    const clientes = [cliente('c1', 'r1'), cliente('c2', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 7) },
      ]),
      { ...prestamoBase('p2', 'c2', 'activo', []), monto: 300 },
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    // (100 + 300) / 2 = 200
    expect(result.current.ticketPromedio).toBe(200);
  });

  it('clientes activos: cuenta clientes únicos con préstamo vigente', () => {
    const clientes = [cliente('c1', 'r1'), cliente('c2', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 60, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 7) },
      ]),
      prestamoBase('p1b', 'c1', 'finalizado', [
        { nro: 1, monto: 60, pagada: true, pagado: 60, vencimiento: sumarDias(hoy(), -7) },
      ]),
      prestamoBase('p2', 'c2', 'finalizado', [
        { nro: 1, monto: 60, pagada: true, pagado: 60, vencimiento: sumarDias(hoy(), -7) },
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    // solo c1 tiene un préstamo vigente (p1); c2 solo tiene finalizados
    expect(result.current.clientesActivos).toBe(1);
  });

  it('cuenta préstamos por estado (activos, mora, finalizados)', () => {
    const clientes = [cliente('c1', 'r1'), cliente('c2', 'r1'), cliente('c3', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', []),
      prestamoBase('p2', 'c2', 'mora', []),
      prestamoBase('p3', 'c3', 'finalizado', []),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.prestamosActivos).toBe(1);
    expect(result.current.prestamosMora).toBe(1);
    expect(result.current.prestamosFinalizados).toBe(1);
  });

  it('rendimiento por ruta suma cobrado/total independientemente del filtro de ruta activa', () => {
    const clientes = [cliente('c1', 'r1'), cliente('c2', 'r2')];
    const rutas = [
      { id: 'r1', nombre: 'Ruta 1' },
      { id: 'r2', nombre: 'Ruta 2' },
    ];
    const prestamos = [
      prestamoBase('p1', 'c1', 'activo', [
        { nro: 1, monto: 100, pagada: true, pagado: 100, vencimiento: sumarDias(hoy(), -7) },
      ]),
      prestamoBase('p2', 'c2', 'activo', [
        { nro: 1, monto: 100, pagada: false, pagado: 0, vencimiento: sumarDias(hoy(), 7) },
      ]),
    ];

    // Aunque el filtro sea r1, porRuta debe reflejar TODAS las rutas
    const { result } = renderHook(() => useMetricas(prestamos, clientes, rutas, 'r1'));

    const ruta1 = result.current.porRuta.find((r) => r.id === 'r1');
    const ruta2 = result.current.porRuta.find((r) => r.id === 'r2');
    expect(ruta1.cobrado).toBe(100);
    expect(ruta1.porcentaje).toBe(100);
    expect(ruta2.cobrado).toBe(0);
    expect(ruta2.porcentaje).toBe(0);
  });

  it('evolución de 7 días: imputa el cobro al día de pago (fechaPago)', () => {
    const clientes = [cliente('c1', 'r1')];
    const prestamos = [
      prestamoBase('p1', 'c1', 'finalizado', [
        { nro: 1, monto: 60, pagada: true, pagado: 60, fechaPago: hoy(), vencimiento: hoy() },
      ]),
    ];

    const { result } = renderHook(() => useMetricas(prestamos, clientes, [], 'all'));

    expect(result.current.evolucion).toHaveLength(7);
    // el último día del array es hoy
    expect(result.current.evolucion[6]).toBe(60);
  });

  it('con cartera vacía, todas las métricas quedan en 0 sin dividir por cero', () => {
    const { result } = renderHook(() => useMetricas([], [], [], 'all'));

    expect(result.current.colocado).toBe(0);
    expect(result.current.tasaMora).toBe(0);
    expect(result.current.roi).toBe(0);
    expect(result.current.ticketPromedio).toBe(0);
    expect(result.current.clientesActivos).toBe(0);
  });
});
