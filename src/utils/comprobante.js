import { formatMoney } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';

const RUTA_COLOR_DEFAULT = '#4f46e5';

const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const FAINT = [148, 163, 184];
const HAIR = [228, 230, 238];
const PANEL = [247, 248, 251];
const WHITE = [255, 255, 255];

const hexToRgb = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h ?? '').trim());
  if (!m) return hexToRgb(RUTA_COLOR_DEFAULT);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Meses explícitos: determinístico en cualquier dispositivo (no depende de ICU/Intl).
const MESES_CORTO = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MESES_LARGO = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const fechaLarga = (d) => {
  if (!d) return '—';
  const [y, m, day] = String(d).split('-');
  return `${+day} de ${MESES_LARGO[+m - 1]} de ${y}`;
};

const fechaCorta = (d) => {
  if (!d) return '—';
  const [, m, day] = String(d).split('-');
  return `${+day} ${MESES_CORTO[+m - 1]}`;
};

const idComprobante = (movId) =>
  'RC-' +
  String(movId ?? '')
    .slice(0, 8)
    .toUpperCase();

/**
 * Calcula saldo pendiente, próxima cuota y total a devolver a partir del préstamo.
 * Puro: no depende de jsPDF.
 */
export const datosComprobante = (prestamo) => {
  const cuotas = prestamo?.cuotasDetalle ?? [];
  const totalDevolver = cuotas.reduce((s, c) => s + (c.monto ?? 0), 0);
  const saldoPendiente = cuotas.reduce(
    (s, c) => s + (c.pagada ? 0 : (c.monto ?? 0) - (c.pagado ?? 0)),
    0,
  );
  const proxima = cuotas.find((c) => !c.pagada) ?? null;
  return { totalDevolver, saldoPendiente, proxima };
};

/** Texto de WhatsApp que acompaña al comprobante. */
export const mensajeComprobante = ({ cliente, resultado }) => {
  const primerNombre = (cliente?.nombre ?? '').split(' ')[0] || 'Hola';
  if (resultado?.finalizado) {
    return `Hola ${primerNombre}, adjunto el comprobante del pago de tu última cuota (${resultado.cuotaNro}/${resultado.cuotasTotales}) por ${formatMoney(resultado.monto)}. ¡Préstamo finalizado, gracias!`;
  }
  return `Hola ${primerNombre}, adjunto tu comprobante de pago de la cuota ${resultado.cuotaNro}/${resultado.cuotasTotales} por ${formatMoney(resultado.monto)}. ¡Gracias!`;
};

/** Nombre del archivo PDF. */
export const nombreArchivoComprobante = ({ cliente, resultado }) => {
  const slug = (cliente?.nombre ?? 'cliente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  return `comprobante-${slug}-cuota-${resultado?.cuotaNro ?? 'x'}.pdf`;
};

const dibujar = (doc, { cliente, prestamo, ruta, resultado, fechaPago }) => {
  const ACCENT = hexToRgb(ruta?.color);
  const W = 148;
  const MX = 12;
  const RX = W - MX;
  const { totalDevolver, saldoPendiente, proxima } = datosComprobante(prestamo);

  const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const draw = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const col = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const f = (style, size) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };
  const fm = (style, size) => {
    doc.setFont('courier', style);
    doc.setFontSize(size);
  };
  const T = (txt, x, y, opt) => doc.text(txt, x, y, opt);
  const hr = (y) => {
    draw(HAIR);
    doc.setLineWidth(0.3);
    doc.line(MX, y, RX, y);
  };

  // Header
  fill(INK);
  doc.roundedRect(MX, 12, 11, 11, 2.8, 2.8, 'F');
  f('bold', 12.5);
  col(WHITE);
  T('RC', MX + 5.5, 18.7, { align: 'center' });
  f('bold', 14.5);
  col(INK);
  T('RutaCobro', MX + 14, 17.5);
  f('normal', 7);
  col(MUTED);
  T('Sistema de gestión de cobros', MX + 14, 22);
  f('bold', 7.5);
  col(MUTED);
  T('COMPROBANTE DE PAGO', RX, 15, { align: 'right', charSpace: 0.4 });
  fm('bold', 9.5);
  col(INK);
  T('N°  ' + idComprobante(resultado?.movId), RX, 20, { align: 'right' });
  f('normal', 7.5);
  col(MUTED);
  T(fechaLarga(fechaPago), RX, 24.5, { align: 'right' });
  fill(ACCENT);
  doc.roundedRect(MX, 28.5, 15, 1, 0.5, 0.5, 'F');

  // Cliente
  f('bold', 7);
  col(FAINT);
  T('CLIENTE', MX, 39, { charSpace: 0.5 });
  if (ruta?.nombre) {
    f('bold', 7.5);
    const pw = doc.getTextWidth(ruta.nombre);
    const pillW = pw + 9;
    const pillX = RX - pillW;
    fill(PANEL);
    draw(HAIR);
    doc.setLineWidth(0.3);
    doc.roundedRect(pillX, 35, pillW, 6.2, 3.1, 3.1, 'FD');
    fill(ACCENT);
    doc.circle(pillX + 3.4, 38.1, 1.1, 'F');
    col(MUTED);
    T(ruta.nombre, pillX + 5.6, 39.3);
  }
  f('bold', 16);
  col(INK);
  T(cliente?.nombre ?? '—', MX, 49);

  const fld = (x, y, lbl, val, vs = 9.5) => {
    f('bold', 7);
    col(FAINT);
    T(lbl.toUpperCase(), x, y, { charSpace: 0.3 });
    f('bold', vs);
    col(INK);
    T(val || '—', x, y + 5);
  };
  fld(MX, 56, 'DNI', cliente?.dni);
  fld(MX + 64, 56, 'Teléfono', cliente?.tel);
  fld(MX, 67, 'Dirección', cliente?.direccion, 9);

  // Detalle del préstamo
  let y = 80;
  f('bold', 7);
  col(FAINT);
  T('DETALLE DEL PRÉSTAMO', MX, y, { charSpace: 0.4 });
  y += 3;
  hr(y);
  const rows = [
    ['Monto otorgado', formatMoney(prestamo?.monto)],
    ['Interés', (prestamo?.interes ?? 0) + '%'],
    ['Total a devolver', formatMoney(totalDevolver)],
    ['Plan', `${prestamo?.cuotas ?? '—'} cuotas semanales`],
    ['Inicio', prestamo?.fechaInicio ? fechaLarga(prestamo.fechaInicio) : '—'],
  ];
  rows.forEach(([k, v]) => {
    const base = y + 5.6;
    f('normal', 9.5);
    col(MUTED);
    T(k, MX, base);
    f('bold', 9.5);
    col(INK);
    T(v, RX, base, { align: 'right' });
    y += 8.6;
    hr(y);
  });

  // Cuota abonada (caja destacada)
  y += 5;
  const boxH = 26;
  fill(PANEL);
  draw(HAIR);
  doc.setLineWidth(0.3);
  doc.roundedRect(MX, y, RX - MX, boxH, 3, 3, 'FD');
  fill(ACCENT);
  doc.roundedRect(MX, y, 2, boxH, 1, 1, 'F');
  f('bold', 7);
  col(ACCENT);
  T('CUOTA ABONADA', MX + 7, y + 8.5, { charSpace: 0.4 });
  f('bold', 12.5);
  col(INK);
  T(`Cuota ${resultado?.cuotaNro} de ${resultado?.cuotasTotales}`, MX + 7, y + 15.5);
  f('normal', 7.5);
  col(MUTED);
  T('Pagada el ' + fechaLarga(fechaPago), MX + 7, y + 20.5);
  f('bold', 7);
  col(FAINT);
  T('TOTAL ABONADO', RX - 6, y + 8.5, { align: 'right', charSpace: 0.4 });
  f('bold', 23);
  col(INK);
  T(formatMoney(resultado?.monto), RX - 6, y + 19, { align: 'right' });

  // Progreso
  y += boxH + 9;
  f('bold', 8);
  col(INK);
  T('Progreso del préstamo', MX, y);
  const sv = formatMoney(saldoPendiente);
  f('bold', 8.5);
  const svw = doc.getTextWidth(sv);
  col(INK);
  T(sv, RX, y, { align: 'right' });
  f('normal', 8);
  col(MUTED);
  T('Saldo pendiente ', RX - svw - 1.2, y, { align: 'right' });
  const by = y + 2.6;
  const bh = 2.4;
  const bw = RX - MX;
  fill(HAIR);
  doc.roundedRect(MX, by, bw, bh, 1.2, 1.2, 'F');
  const ratio =
    resultado?.cuotasTotales > 0 ? resultado.cuotasPagadas / resultado.cuotasTotales : 0;
  fill(ACCENT);
  doc.roundedRect(MX, by, Math.max(bh, bw * ratio), bh, 1.2, 1.2, 'F');
  f('normal', 7.5);
  col(MUTED);
  const progTxt =
    resultado?.finalizado || !proxima
      ? `${resultado?.cuotasPagadas} de ${resultado?.cuotasTotales} cuotas pagadas · Préstamo finalizado`
      : `${resultado?.cuotasPagadas} de ${resultado?.cuotasTotales} cuotas pagadas · Próxima cuota: ${fechaCorta(proxima.vencimiento)} · ${formatMoney(proxima.monto)}`;
  T(progTxt, MX, by + bh + 5);

  // Footer
  hr(199);
  f('normal', 7);
  col(FAINT);
  T('Documento sin valor fiscal · Comprobante interno de pago', MX, 204);
  const tel = '+54 9 3442 64-6670';
  f('bold', 7.5);
  col(ACCENT);
  const tw = doc.getTextWidth(tel);
  T(tel, RX, 204, { align: 'right' });
  col(INK);
  T('SERVITEC · ', RX - tw, 204, { align: 'right' });
};

/**
 * Construye el comprobante de pago: genera el PDF (jsPDF vectorial, A5) y arma el
 * mensaje de WhatsApp. Carga jsPDF de forma dinámica.
 * @returns {Promise<{ file: File, mensaje: string, nombreArchivo: string }>}
 */
export const construirComprobantePago = async ({
  cliente,
  prestamo,
  ruta,
  resultado,
  fechaPago = hoy(),
}) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  dibujar(doc, { cliente, prestamo, ruta, resultado, fechaPago });

  const nombreArchivo = nombreArchivoComprobante({ cliente, resultado });
  const blob = doc.output('blob');
  const file = new File([blob], nombreArchivo, { type: 'application/pdf' });
  const mensaje = mensajeComprobante({ cliente, resultado });
  return { file, mensaje, nombreArchivo };
};
