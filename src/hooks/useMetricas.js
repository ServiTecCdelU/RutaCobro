import { useMemo } from 'react';
import { diasDeAtraso, hoy, toFechaStr, sumarDias } from '@/utils/calculos';

const esActivo = (p) => p.estado === 'activo' || p.estado === 'mora';

// Monto efectivamente pagado de una cuota, tolerando datos viejos sin `pagado`.
const pagadoDe = (c) => c.pagado ?? (c.pagada ? c.monto : 0);

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
    let colocadoHistorico = 0; // capital de TODOS los préstamos (cobrados o no)
    let capitalEnCalle = 0; // capital de préstamos activos/mora (lo que está "en la calle")
    let cuotasTotales = 0;
    let cuotasMoraCant = 0;
    let montoMora = 0;
    let cuotasHoyCant = 0;
    let aCobrarHoy = 0;
    let capitalRecuperado = 0; // parte del capital prestado que ya volvió
    let gananciaRealizada = 0; // interés efectivamente cobrado
    let gananciaProyectada = 0; // interés total de la cartera (cobrado o no)
    let proyeccion7dias = 0; // pendiente que vence en los próximos 7 días

    // Buckets de mora por antigüedad
    const moraBuckets = {
      b1_7: { cant: 0, monto: 0 },
      b8_30: { cant: 0, monto: 0 },
      b30plus: { cant: 0, monto: 0 },
    };

    const limite7dias = sumarDias(hoyStr, 7);

    for (const p of prestamosFiltrados) {
      const capital = p.monto ?? 0;
      colocadoHistorico += capital;
      if (esActivo(p)) capitalEnCalle += capital;

      const cuotas = p.cuotasDetalle ?? [];
      const totalPrestamo = cuotas.reduce((s, c) => s + c.monto, 0);
      const ratioCapital = totalPrestamo > 0 ? capital / totalPrestamo : 0;
      let cobradoPrestamo = 0;

      gananciaProyectada += totalPrestamo - capital;

      for (const c of cuotas) {
        cuotasTotales += 1;
        const pagado = pagadoDe(c);
        cobradoTotal += pagado;
        cobradoPrestamo += pagado;

        const pendiente = c.monto - pagado;
        if (pendiente > 0) {
          porCobrar += pendiente;

          const atraso = diasDeAtraso(c);
          if (atraso > 0) {
            cuotasMoraCant += 1;
            montoMora += pendiente;
            const bucket = atraso <= 7 ? 'b1_7' : atraso <= 30 ? 'b8_30' : 'b30plus';
            moraBuckets[bucket].cant += 1;
            moraBuckets[bucket].monto += pendiente;
          }
          if (c.vencimiento === hoyStr) {
            cuotasHoyCant += 1;
            aCobrarHoy += pendiente;
          }
          if (c.vencimiento >= hoyStr && c.vencimiento <= limite7dias) {
            proyeccion7dias += pendiente;
          }
        }
      }

      // Distribución proporcional de lo cobrado entre capital e interés
      capitalRecuperado += cobradoPrestamo * ratioCapital;
      gananciaRealizada += cobradoPrestamo * (1 - ratioCapital);
    }

    capitalRecuperado = Math.round(capitalRecuperado);
    gananciaRealizada = Math.round(gananciaRealizada);

    const tasaMora = cuotasTotales > 0 ? (cuotasMoraCant / cuotasTotales) * 100 : 0;
    const roi = colocadoHistorico > 0 ? (gananciaProyectada / colocadoHistorico) * 100 : 0;

    // Rendimiento por ruta (siempre sobre todos los préstamos)
    const porRuta = rutas.map((r) => {
      let cobrado = 0;
      let total = 0;
      for (const p of prestamos) {
        if (clientesPorId.get(p.clienteId)?.rutaId !== r.id) continue;
        for (const c of p.cuotasDetalle ?? []) {
          cobrado += pagadoDe(c);
          total += c.monto;
        }
      }
      return { ...r, cobrado, total, porcentaje: total > 0 ? (cobrado / total) * 100 : 0 };
    });

    // Evolución últimos 7 días — derivada del estado de cuotas pagadas.
    // NOTA: refleja la fecha en que se completó cada cuota; los pagos parciales
    // se imputan al día de completado. La caja (movimientos) es la fuente exacta.
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
          evolucionPorDia.set(c.fechaPago, evolucionPorDia.get(c.fechaPago) + pagadoDe(c));
        }
      }
    }
    const evolucion = [...evolucionPorDia.values()];

    // Clientes activos (con al menos un préstamo activo o en mora)
    const clientesConPrestamo = new Set();
    for (const p of prestamosFiltrados) {
      if (esActivo(p)) clientesConPrestamo.add(p.clienteId);
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

    const ticketPromedio =
      prestamosFiltrados.length > 0 ? Math.round(colocadoHistorico / prestamosFiltrados.length) : 0;

    return {
      cobradoTotal,
      porCobrar,
      colocado: capitalEnCalle, // BUG-1: "en calle" = solo activos/mora
      colocadoHistorico,
      capitalRecuperado,
      montoMora,
      tasaMora,
      moraBuckets,
      cuotasHoyCant,
      aCobrarHoy,
      proyeccion7dias,
      porRuta,
      evolucion,
      enMoraCant: cuotasMoraCant,
      gananciaProyectada,
      gananciaRealizada,
      roi,
      ticketPromedio,
      clientesActivos,
      prestamosActivos,
      prestamosFinalizados,
      prestamosMora,
    };
  }, [prestamos, clientes, rutas, rutaActiva]);
}
