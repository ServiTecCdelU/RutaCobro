// Cálculo del cierre/rendición de caja por ruta (cobrador) para una fecha o rango.
// Atribución: cobros y préstamos se imputan a la ruta del cliente; los gastos a su
// propia ruta. Neto a rendir = cobrado − gastos − prestado.

const enRango = (fecha, desde, hasta) => !!fecha && fecha >= desde && fecha <= hasta;

const accBase = () => ({ cobrado: 0, cobros: 0, gastos: 0, prestado: 0, clientesSet: new Set() });

/**
 * @returns {{ porRuta: Array, totales: object }}
 */
export const construirCierre = ({
  movimientos = [],
  gastos = [],
  prestamos = [],
  clientes = [],
  rutas = [],
  miembros = [],
  desde,
  hasta,
}) => {
  const clientesMap = new Map(clientes.map((c) => [c.id, c]));
  const rutasMap = new Map(rutas.map((r) => [r.id, r]));
  // % de comisión del cobrador asignado a cada ruta.
  const comisionPctPorRuta = new Map(
    miembros.filter((m) => m.rutaId).map((m) => [m.rutaId, m.comision ?? 0]),
  );
  const SIN_RUTA = '__sin_ruta__';

  // Sembramos todas las rutas para que un cobrador sin actividad también aparezca.
  const porRutaMap = new Map(rutas.map((r) => [r.id, accBase()]));
  const acc = (rutaId) => {
    const key = rutaId ?? SIN_RUTA;
    if (!porRutaMap.has(key)) porRutaMap.set(key, accBase());
    return porRutaMap.get(key);
  };

  for (const m of movimientos) {
    if (!enRango(m.fecha, desde, hasta)) continue;
    const ruta = clientesMap.get(m.clienteId)?.rutaId;
    const a = acc(ruta);
    a.cobrado += m.monto ?? 0;
    a.cobros += 1;
    if (m.clienteId) a.clientesSet.add(m.clienteId);
  }

  for (const g of gastos) {
    if (!enRango(g.fecha, desde, hasta)) continue;
    acc(g.rutaId).gastos += g.monto ?? 0;
  }

  for (const p of prestamos) {
    if (!enRango(p.fechaInicio, desde, hasta)) continue;
    const ruta = clientesMap.get(p.clienteId)?.rutaId;
    acc(ruta).prestado += p.monto ?? 0;
  }

  const porRuta = [...porRutaMap.entries()]
    .map(([rutaId, a]) => {
      const comisionPct = comisionPctPorRuta.get(rutaId) ?? 0;
      return {
        ruta:
          rutasMap.get(rutaId) ??
          (rutaId === SIN_RUTA ? null : { id: rutaId, nombre: 'Ruta eliminada' }),
        cobrado: a.cobrado,
        cobros: a.cobros,
        gastos: a.gastos,
        prestado: a.prestado,
        clientes: a.clientesSet.size,
        comisionPct,
        comision: Math.round(a.cobrado * (comisionPct / 100)),
        neto: a.cobrado - a.gastos - a.prestado,
      };
    })
    .sort((x, y) => y.cobrado - x.cobrado);

  const totales = porRuta.reduce(
    (t, r) => ({
      cobrado: t.cobrado + r.cobrado,
      gastos: t.gastos + r.gastos,
      prestado: t.prestado + r.prestado,
      comision: t.comision + r.comision,
      neto: t.neto + r.neto,
      cobros: t.cobros + r.cobros,
    }),
    { cobrado: 0, gastos: 0, prestado: 0, comision: 0, neto: 0, cobros: 0 },
  );

  return { porRuta, totales };
};
