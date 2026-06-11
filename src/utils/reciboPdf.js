import { formatMoney, formatFecha } from '@/utils/formatters';

const RUTA_COLOR_DEFAULT = '#4f46e5';
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const FAINT = [148, 163, 184];
const HAIR = [228, 230, 238];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const RED = [225, 29, 72];

const hexToRgb = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h ?? '').trim());
  if (!m) return hexToRgb(RUTA_COLOR_DEFAULT);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Recibo de pago de una cuota en formato ticket (80mm), con el mismo
 * lenguaje visual del comprobante: logo, acento de la ruta, monto destacado,
 * saldo restante y progreso del préstamo.
 */
export async function generarRecibo({ cliente, prestamo, cuota, ruta, monto, fecha }) {
  const { jsPDF } = await import('jspdf');
  const W = 80;
  const MX = 7;
  const RX = W - MX;
  const doc = new jsPDF({ unit: 'mm', format: [W, 165] });
  const ACCENT = hexToRgb(ruta?.color);

  const cuotas = prestamo?.cuotasDetalle ?? [];
  const pagadas = cuotas.filter((c) => c.pagada).length;
  const totalDevolver = cuotas.reduce((s, c) => s + (c.monto ?? 0), 0);
  const pagadoTotal = cuotas.reduce((s, c) => s + (c.pagado ?? (c.pagada ? c.monto : 0)), 0);
  const saldo = totalDevolver - pagadoTotal;
  const proxima = cuotas.find((c) => !c.pagada);

  // ── Encabezado ──
  doc.setFillColor(...INK);
  doc.roundedRect(MX, 9, 9, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('RC', MX + 4.5, 14.7, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text('RutaCobro', MX + 12, 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Recibo de pago', MX + 12, 17.5);

  doc.setFillColor(...ACCENT);
  doc.roundedRect(MX, 22, 14, 1, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`${fecha ? formatFecha(fecha) : '—'}`, RX, 13.5, { align: 'right' });
  doc.setTextColor(...FAINT);
  doc.text(`N° ${(prestamo?.id ?? '').slice(0, 8).toUpperCase()}`, RX, 17.5, { align: 'right' });

  // ── Monto destacado ──
  let y = 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.roundedRect(MX, y, RX - MX, 22, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('PAGO RECIBIDO', W / 2, y + 6, { align: 'center', charSpace: 0.5 });
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(formatMoney(monto), W / 2, y + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Cuota ${cuota?.nro} de ${cuotas.length}`, W / 2, y + 19, { align: 'center' });

  // ── Datos ──
  y += 29;
  const campo = (lbl, val) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...FAINT);
    doc.text(lbl.toUpperCase(), MX, y, { charSpace: 0.4 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(String(val || '—'), MX, y + 4);
    y += 9.5;
  };
  campo('Cliente', cliente?.nombre);
  campo('DNI', cliente?.dni);
  campo('Ruta', ruta?.nombre);

  // ── Resumen del préstamo ──
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.3);
  doc.line(MX, y - 2, RX, y - 2);
  y += 3;

  const fila = (lbl, val, color = INK) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(lbl, MX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(String(val), RX, y, { align: 'right' });
    y += 5.5;
  };
  fila('Total pagado', formatMoney(pagadoTotal), GREEN);
  fila('Saldo pendiente', saldo > 0 ? formatMoney(saldo) : '$0', saldo > 0 ? RED : GREEN);
  fila(
    'Próxima cuota',
    proxima ? `${formatFecha(proxima.vencimiento)} · ${formatMoney(proxima.monto)}` : 'Finalizado',
    proxima ? INK : GREEN,
  );

  // ── Barra de progreso ──
  y += 1;
  const progreso = cuotas.length > 0 ? pagadas / cuotas.length : 0;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(MX, y, RX - MX, 2.4, 1.2, 1.2, 'F');
  if (progreso > 0) {
    doc.setFillColor(...ACCENT);
    doc.roundedRect(MX, y, Math.max(2.4, (RX - MX) * progreso), 2.4, 1.2, 1.2, 'F');
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`${pagadas} de ${cuotas.length} cuotas pagadas`, W / 2, y + 6.5, { align: 'center' });

  // ── Pie ──
  y += 13;
  doc.setDrawColor(...HAIR);
  doc.line(MX, y, RX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...FAINT);
  doc.text('Documento sin valor fiscal · Gracias por su pago', W / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('SERVITEC · +54 9 3442 64-6670', W / 2, y + 9, { align: 'center' });

  doc.save(`recibo_${cliente?.nombre?.replace(/\s/g, '_') ?? 'pago'}_cuota${cuota.nro}.pdf`);
}
