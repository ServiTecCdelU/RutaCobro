import { describe, it, expect } from 'vitest';
import { categoriaGasto, esCategoriaValida, totalesPorCategoria } from './gastos';

describe('categoriaGasto', () => {
  it('devuelve la categoría conocida por id', () => {
    expect(categoriaGasto('combustible').label).toBe('Combustible');
  });

  it('cae en "Varios" ante un id desconocido', () => {
    expect(categoriaGasto('inexistente').label).toBe('Varios');
    expect(categoriaGasto(undefined).label).toBe('Varios');
  });
});

describe('esCategoriaValida', () => {
  it('valida ids existentes y rechaza desconocidos', () => {
    expect(esCategoriaValida('alquiler')).toBe(true);
    expect(esCategoriaValida('xxx')).toBe(false);
  });
});

describe('totalesPorCategoria', () => {
  it('agrupa montos y cantidades por categoría, ordenado desc', () => {
    const gastos = [
      { categoria: 'combustible', monto: 100 },
      { categoria: 'combustible', monto: 50 },
      { categoria: 'alquiler', monto: 300 },
    ];
    const res = totalesPorCategoria(gastos);
    expect(res).toHaveLength(2);
    // alquiler (300) va primero
    expect(res[0].categoria.id).toBe('alquiler');
    expect(res[0].monto).toBe(300);
    expect(res[1].categoria.id).toBe('combustible');
    expect(res[1].monto).toBe(150);
    expect(res[1].cant).toBe(2);
  });

  it('devuelve arreglo vacío sin gastos', () => {
    expect(totalesPorCategoria([])).toEqual([]);
  });
});
