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

    // colocado = solo activo (100), no incluye el finalizado
    expect(result.current.colocado).toBe(100);
    // histórico sí incluye ambos
    expect(result.current.colocadoHistorico).toBe(200);
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
});
