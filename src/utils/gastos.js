// Categorías fijas de gastos del negocio.
// id: clave estable guardada en Firestore · label: texto mostrado · color: acento UI
export const CATEGORIAS_GASTO = [
  { id: 'combustible', label: 'Combustible', color: '#f59e0b' },
  { id: 'sueldos', label: 'Sueldos / Comisiones', color: '#8b5cf6' },
  { id: 'alquiler', label: 'Alquiler', color: '#3b82f6' },
  { id: 'impuestos', label: 'Impuestos', color: '#ef4444' },
  { id: 'mantenimiento', label: 'Mantenimiento', color: '#10b981' },
  { id: 'varios', label: 'Varios', color: '#64748b' },
];

const CATEGORIA_POR_ID = new Map(CATEGORIAS_GASTO.map((c) => [c.id, c]));

export const categoriaGasto = (id) =>
  CATEGORIA_POR_ID.get(id) ?? { id: id ?? 'varios', label: 'Varios', color: '#64748b' };

export const esCategoriaValida = (id) => CATEGORIA_POR_ID.has(id);

// Agrupa gastos por categoría y devuelve totales ordenados desc por monto.
export const totalesPorCategoria = (gastos) => {
  const map = new Map();
  for (const g of gastos) {
    const cat = categoriaGasto(g.categoria);
    const acc = map.get(cat.id) ?? { categoria: cat, monto: 0, cant: 0 };
    acc.monto += g.monto ?? 0;
    acc.cant += 1;
    map.set(cat.id, acc);
  }
  return [...map.values()].sort((a, b) => b.monto - a.monto);
};
