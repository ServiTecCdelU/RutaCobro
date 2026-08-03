import { formatMoney, formatFecha, formatFechaLarga } from '@/utils/formatters';
import { diasDeAtraso, frecuenciaPlural } from '@/utils/calculos';
import { datosComprobante } from '@/utils/comprobante';

const RUTA_COLOR_DEFAULT = '#4f46e5';
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const FAINT = [148, 163, 184];
const HAIR = [228, 230, 238];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const AMBER = [217, 119, 6];
const RED = [225, 29, 72];
const VIOLET = [124, 58, 237];

const hexToRgb = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h ?? '').trim());
  if (!m) return hexToRgb(RUTA_COLOR_DEFAULT);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const slugNombre = (nombre) =>
  (nombre ?? 'cliente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);

const estadoCuota = (c) => {
  if (c.pagada)
    return { txt: `Pagada${c.fechaPago ? ' ' + formatFecha(c.fechaPago) : ''}`, color: GREEN };
  const pagado = c.pagado ?? 0;
  if (pagado > 0) return { txt: `Parcial ${formatMoney(pagado)}`, color: AMBER };
  const atraso = diasDeAtraso(c);
  if (atraso > 0) return { txt: `Vencida (${atraso}d)`, color: RED };
  return { txt: 'Pendiente', color: MUTED };
};

export const mensajeEstadoCuenta = ({ cliente, prestamo }) => {
  const { totalDevolver, saldoPendiente, proxima } = datosComprobante(prestamo);
  const pagado = totalDevolver - saldoPendiente;
  const nombre = (cliente?.nombre ?? '').split(' ')[0] || 'Hola';
  let msg = `Hola ${nombre}, te envío tu estado de cuenta. Pagaste ${formatMoney(pagado)} de ${formatMoney(totalDevolver)} · Saldo pendiente: ${formatMoney(saldoPendiente)}.`;
  if (proxima) {
    msg += ` Próxima cuota ${proxima.nro} de ${formatMoney(proxima.monto)} vence el ${formatFecha(proxima.vencimiento)}.`;
  } else {
    msg += ' ¡Préstamo finalizado, gracias!';
  }
  return msg;
};

export const nombreArchivoEstadoCuenta = ({ cliente }) =>
  `estado-cuenta-${slugNombre(cliente?.nombre)}.pdf`;

const campo = (doc, x, y, lbl, val, vs = 10) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...FAINT);
  doc.text(lbl.toUpperCase(), x, y, { charSpace: 0.3 });
  doc.setFontSize(vs);
  doc.setTextColor(...INK);
  doc.text(val || '—', x, y + 5);
};

const dibujarEncabezado = (doc, { cliente, prestamo, ruta }) => {
  const ACCENT = hexToRgb(ruta?.color);
  const MX = 14;
  const RX = 196;
  const { totalDevolver } = datosComprobante(prestamo);

  doc.setFillColor(...INK);
  doc.roundedRect(MX, 13, 12, 12, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text('RC', MX + 6, 20.5, { align: 'center' });
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('RutaCobro', MX + 16, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text('Estado de cuenta', MX + 16, 24.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('EMITIDO', RX, 16, { align: 'right', charSpace: 0.4 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(formatFechaLarga(new Date().toISOString().slice(0, 10)), RX, 21.5, { align: 'right' });
  doc.setFillColor(...ACCENT);
  doc.roundedRect(MX, 30, 18, 1.1, 0.5, 0.5, 'F');

  // Cliente (izq) + Préstamo (der)
  const COL2 = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...FAINT);
  doc.text('CLIENTE', MX, 40, { charSpace: 0.5 });
  doc.text('PRÉSTAMO', COL2, 40, { charSpace: 0.5 });

  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(cliente?.nombre ?? '—', MX, 47);

  campo(doc, MX, 54, 'DNI', cliente?.dni);
  campo(doc, MX + 45, 54, 'Teléfono', cliente?.tel);
  campo(doc, MX, 64, 'Dirección', cliente?.direccion, 9);
  campo(doc, MX, 74, 'Ruta', ruta?.nombre);

  const estadoTxt =
    prestamo?.estado === 'finalizado'
      ? 'Finalizado'
      : prestamo?.estado === 'mora'
        ? 'En mora'
        : 'Activo';
  campo(doc, COL2, 47, 'Capital', formatMoney(prestamo?.monto));
  campo(doc, COL2 + 45, 47, 'Total a devolver', formatMoney(totalDevolver));
  campo(
    doc,
    COL2,
    57,
    'Plan',
    `${prestamo?.cuotas ?? '—'} ${frecuenciaPlural(prestamo?.frecuenciaDias)}`,
    9,
  );
  campo(
    doc,
    COL2 + 45,
    57,
    'Inicio',
    prestamo?.fechaInicio ? formatFecha(prestamo.fechaInicio) : '—',
  );
  campo(doc, COL2, 67, 'Estado', estadoTxt);
};

const dibujarResumen = (doc, prestamo, y) => {
  const MX = 14;
  const RX = 196;
  const { totalDevolver, saldoPendiente, proxima } = datosComprobante(prestamo);
  const pagado = totalDevolver - saldoPendiente;
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.3);
  doc.line(MX, y, RX, y);
  const cols = [
    ['Pagado', formatMoney(pagado), GREEN],
    ['Saldo pendiente', formatMoney(saldoPendiente), saldoPendiente > 0 ? RED : INK],
    [
      'Próxima cuota',
      proxima
        ? `${formatFecha(proxima.vencimiento)} · ${formatMoney(proxima.monto)}`
        : 'Finalizado',
      VIOLET,
    ],
  ];
  const w = (RX - MX) / 3;
  cols.forEach(([lbl, val, color], i) => {
    const x = MX + i * w;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...FAINT);
    doc.text(lbl.toUpperCase(), x, y + 7, { charSpace: 0.3 });
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.text(val, x, y + 14);
  });
};

/**
 * Genera el estado de cuenta del cliente (PDF A4) con el cronograma completo y arma el
 * mensaje de WhatsApp. Carga jsPDF + autotable de forma dinámica.
 * @returns {Promise<{ file: File, mensaje: string, nombreArchivo: string }>}
 */
export const construirEstadoCuenta = async ({ cliente, prestamo, ruta }) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ACCENT = hexToRgb(ruta?.color);

  dibujarEncabezado(doc, { cliente, prestamo, ruta });
  dibujarResumen(doc, prestamo, 82);

  const cuotas = prestamo?.cuotasDetalle ?? [];
  const estados = cuotas.map(estadoCuota);

  autoTable(doc, {
    startY: 104,
    head: [['#', 'Vencimiento', 'Monto', 'Estado']],
    body: cuotas.map((c, i) => [
      String(c.nro),
      formatFecha(c.vencimiento),
      formatMoney(c.monto),
      estados[i].txt,
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: INK },
    columnStyles: { 0: { cellWidth: 14 }, 2: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = estados[data.row.index].color;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setDrawColor(...HAIR);
      doc.setLineWidth(0.3);
      doc.line(14, h - 14, 196, h - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...FAINT);
      doc.text('Documento sin valor fiscal · Estado de cuenta', 14, h - 9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ACCENT);
      doc.text('SERVITEC · +54 9 3442 64-6670', 196, h - 9, { align: 'right' });
    },
  });

  const nombreArchivo = nombreArchivoEstadoCuenta({ cliente });
  const blob = doc.output('blob');
  const file = new File([blob], nombreArchivo, { type: 'application/pdf' });
  const mensaje = mensajeEstadoCuenta({ cliente, prestamo });
  return { file, mensaje, nombreArchivo };
};
