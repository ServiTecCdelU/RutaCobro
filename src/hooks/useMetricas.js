import { useMemo } from 'react';
import { diasDeAtraso, hoy, toFechaStr } from '@/utils/calculos';

export function useMetricas(prestamos, clientes, rutas, rutaActiva) {
  return useMemo(() => {
    const hoyStr = hoy();
    const clientesPorId = new Map(clientes.map((c) => [c.id, c]));

    const prestamosFiltrados =
      rutaActiva === 'all'
        ? prestamos
        : prestamos.filter((p) => clientesPorId.get(p.clienteId)?.rutaId === rutaActiva);

    let cobradoTotal = 0;
    let porCobrar = 0;
    let colocado = 0;
    let cuotasTotales = 0;
    let cuotasMoraCant = 0;
    let montoMora = 0;
    let cuotasHoyCant = 0;
    let aCobrarHoy = 0;

    for (const p of prestamosFiltrados) {
      colocado += p.monto ?? 0;
      const cuotas = p.cuotasDetalle ?? [];
      for (const c of cuotas) {
        cuotasTotales += 1;
        const pagado = c.pagado ?? (c.pagada ? c.monto : 0);
        cobradoTotal += pagado;
        const pendiente = c.monto - pagado;
        if (pendiente > 0) {
          porCobrar += pendiente;
          if (diasDeAtraso(c) > 0) {
            cuotasMoraCant += 1;
            montoMora += pendiente;
          }
          if (c.vencimiento === hoyStr) {
            cuotasHoyCant += 1;
            aCobrarHoy += pendiente;
          }
        }
      }
    }

    const tasaMora = cuotasTotales > 0 ? (cuotasMoraCant / cuotasTotales) * 100 : 0;

    // Rendimiento por ruta (siempre sobre todos los préstamos)
    const porRuta = rutas.map((r) => {
      let cobrado = 0;
      let total = 0;
      for (const p of prestamos) {
        if (clientesPorId.get(p.clienteId)?.rutaId !== r.id) continue;
        for (const c of p.cuotasDetalle ?? []) {
          const pagado = c.pagado ?? (c.pagada ? c.monto : 0);
          cobrado += pagado;
          total += c.monto;
        }
      }
      return { ...r, cobrado, total, porcentaje: total > 0 ? (cobrado / total) * 100 : 0 };
    });

    // Evolución últimos 7 días
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    const evolucionPorDia = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoyDate);
      d.setDate(d.getDate() - (6 - i));
      evolucionPorDia.set(toFechaStr(d), 0);
    }
    for (const p of prestamos) {
      for (const c of p.cuotasDetalle ?? []) {
        if (c.pagada && evolucionPorDia.has(c.fechaPago)) {
          evolucionPorDia.set(c.fechaPago, evolucionPorDia.get(c.fechaPago) + c.monto);
        }
      }
    }
    const evolucion = [...evolucionPorDia.values()];

    // Ganancia estimada (interés)
    let gananciaEstimada = 0;
    for (const p of prestamosFiltrados) {
      const totalCuotas = (p.cuotasDetalle ?? []).reduce((s, c) => s + c.monto, 0);
      gananciaEstimada += totalCuotas - (p.monto ?? 0);
    }

    // Clientes activos (con al menos un préstamo activo)
    const clientesConPrestamo = new Set();
    for (const p of prestamosFiltrados) {
      if (p.estado === 'activo' || p.estado === 'mora') {
        clientesConPrestamo.add(p.clienteId);
      }
    }
    const clientesActivos = clientesConPrestamo.size;

    // Préstamos por estado
    let prestamosActivos = 0;
    let prestamosFinalizados = 0;
    let prestamosMora = 0;
    for (const p of prestamosFiltrados) {
      if (p.estado === 'finalizado') prestamosFinalizados++;
      else if (p.estado === 'mora') prestamosMora++;
      else prestamosActivos++;
    }

    // Evolución mora últimos 7 días
    const moraPorDia = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoyDate);
      d.setDate(d.getDate() - (6 - i));
      const dStr = toFechaStr(d);
      let moraDelDia = 0;
      for (const p of prestamosFiltrados) {
        for (const c of p.cuotasDetalle ?? []) {
          if (!c.pagada && c.vencimiento <= dStr) {
            moraDelDia += c.monto - (c.pagado ?? 0);
          }
        }
      }
      moraPorDia.push(moraDelDia);
    }

    return {
      cobradoTotal,
      porCobrar,
      colocado,
      montoMora,
      tasaMora,
      cuotasHoyCant,
      aCobrarHoy,
      porRuta,
      evolucion,
      enMoraCant: cuotasMoraCant,
      gananciaEstimada,
      clientesActivos,
      prestamosActivos,
      prestamosFinalizados,
      prestamosMora,
      moraPorDia,
    };
  }, [prestamos, clientes, rutas, rutaActiva]);
}
