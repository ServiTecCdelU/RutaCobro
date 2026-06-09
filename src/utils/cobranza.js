import { diasDeAtraso, proximaCuotaPendiente, hoy } from '@/utils/calculos';
import { formatMoney, formatFecha } from '@/utils/formatters';

const esActivo = (p) => p.estado === 'activo' || p.estado === 'mora';

/** Clasifica una cuota según su vencimiento respecto de hoy. */
export const categoriaVencimiento = (vencimiento, hoyStr) => {
  if (!vencimiento) return 'futura';
  if (vencimiento < hoyStr) return 'vencida';
  if (vencimiento === hoyStr) return 'hoy';
  return 'futura';
};

/**
 * Arma la lista de cobranza: para cada préstamo activo/mora toma su próxima cuota
 * pendiente y la enriquece con cliente, ruta, atraso y monto a cobrar.
 * Ordena por vencimiento ascendente (lo más urgente primero). Puro.
 */
export const construirItemsCobranza = (
  prestamos = [],
  clientes = [],
  rutas = [],
  hoyStr = hoy(),
) => {
  const clientesMap = new Map(clientes.map((c) => [c.id, c]));
  const rutasMap = new Map(rutas.map((r) => [r.id, r]));

  return prestamos
    .filter(esActivo)
    .map((prestamo) => {
      const cuota = proximaCuotaPendiente(prestamo);
      if (!cuota) return null;
      const cliente = clientesMap.get(prestamo.clienteId) ?? null;
      const ruta = cliente ? (rutasMap.get(cliente.rutaId) ?? null) : null;
      const pendiente = cuota.monto - (cuota.pagado ?? 0);
      return {
        prestamo,
        cliente,
        ruta,
        cuota,
        atraso: diasDeAtraso(cuota),
        pendiente,
        categoria: categoriaVencimiento(cuota.vencimiento, hoyStr),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.cuota.vencimiento.localeCompare(b.cuota.vencimiento));
};

/** Mensaje de recordatorio de pago para WhatsApp. */
export const mensajeRecordatorio = (cliente, cuota) => {
  const nombre = (cliente?.nombre ?? '').split(' ')[0] || 'Hola';
  return `Hola ${nombre}, te recuerdo la cuota ${cuota.nro} de ${formatMoney(cuota.monto)} que vence el ${formatFecha(cuota.vencimiento)}. ¡Gracias!`;
};

/** Link a Google Maps para la dirección del cliente (o null si no hay dirección). */
export const linkMapa = (direccion) => {
  const d = (direccion ?? '').trim();
  if (!d) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}`;
};
