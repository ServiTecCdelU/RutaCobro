import { formatMoney, formatFecha, formatFechaLarga } from '@/utils/formatters';
import { frecuenciaPlural, hoy } from '@/utils/calculos';
import { datosComprobante } from '@/utils/comprobante';
import { normalizarPunitorio } from '@/utils/punitorios';

const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const FAINT = [148, 163, 184];
const HAIR = [228, 230, 238];
const WHITE = [255, 255, 255];

const UNIDADES = [
  '',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];
const DECENAS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

const hasta999 = (n) => {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes = [];
  if (c) partes.push(CENTENAS[c]);
  if (r) {
    if (r < 30) {
      partes.push(UNIDADES[r]);
    } else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d]);
    }
  }
  return partes.join(' ');
};

const apocopar = (s) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');

/**
 * Monto en palabras (español, hasta miles de millones) para el pagaré.
 * Trunca decimales; valores inválidos devuelven 'cero'.
 */
export const montoEnLetras = (monto) => {
  const n = Math.floor(Math.abs(Number(monto)));
  if (!Number.isFinite(n) || n === 0) return 'cero';

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes = [];

  if (millones === 1) partes.push('un millón');
  else if (millones > 1) partes.push(`${apocopar(hasta999(millones))} millones`);

  if (miles === 1) partes.push('mil');
  else if (miles > 1) partes.push(`${apocopar(hasta999(miles))} mil`);

  if (resto) partes.push(hasta999(resto));

  return partes.join(' ');
};

const slugNombre = (nombre) =>
  (nombre ?? 'cliente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);

export const nombreArchivoContrato = ({ cliente }) => `contrato-${slugNombre(cliente?.nombre)}.pdf`;

/**
 * Genera el contrato de préstamo (mutuo) en PDF A4 con cronograma y firmas,
 * y lo descarga. Carga jsPDF + autotable de forma dinámica.
 */
export const generarContrato = async ({ cliente, prestamo, ruta, punitorioConfig }) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const MX = 18;
  const RX = 192;
  const ANCHO = RX - MX;
  const { totalDevolver } = datosComprobante(prestamo);
  const cuotas = prestamo?.cuotasDetalle ?? [];
  const valorCuota = cuotas[0]?.monto ?? 0;
  const punitorio = normalizarPunitorio(punitorioConfig);

  // Encabezado
  doc.setFillColor(...INK);
  doc.roundedRect(MX, 14, 11, 11, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text('RC', MX + 5.5, 21, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('CONTRATO DE PRÉSTAMO', MX + 15, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Mutuo de dinero entre particulares', MX + 15, 25);
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(formatFechaLarga(hoy()), RX, 20, { align: 'right' });

  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.4);
  doc.line(MX, 31, RX, 31);

  // Cuerpo
  const parrafos = [
    `Entre EL ACREEDOR, por una parte, y ${cliente?.nombre ?? '________________'}, ` +
      `DNI ${cliente?.dni ?? '____________'}, con domicilio en ${cliente?.direccion ?? '________________________'}, ` +
      `en adelante EL DEUDOR, se celebra el presente contrato de préstamo de dinero sujeto a las siguientes cláusulas:`,
    `PRIMERA — EL DEUDOR declara recibir en este acto, en efectivo y a su entera conformidad, la suma de ` +
      `${formatMoney(prestamo?.monto)} (pesos ${montoEnLetras(prestamo?.monto)}).`,
    `SEGUNDA — EL DEUDOR se obliga a devolver la suma total de ${formatMoney(totalDevolver)} ` +
      `(pesos ${montoEnLetras(totalDevolver)}), ` +
      `en ${cuotas.length} cuotas ${frecuenciaPlural(prestamo?.frecuenciaDias)} de ${formatMoney(valorCuota)} cada una, ` +
      `conforme al cronograma de vencimientos detallado al pie, siendo el primer vencimiento el día ` +
      `${cuotas[0]?.vencimiento ? formatFecha(cuotas[0].vencimiento) : '____________'}.`,
    punitorio.activo
      ? `TERCERA — La falta de pago en término de cualquier cuota generará un interés punitorio del ` +
        `${punitorio.tasaDiariaPct}% diario sobre el saldo vencido` +
        (punitorio.diasGracia > 0
          ? `, a partir del día ${punitorio.diasGracia + 1} de atraso`
          : '') +
        `, hasta un máximo del ${punitorio.topePct}% del valor de la cuota.`
      : `TERCERA — La falta de pago en término de cualquier cuota constituirá en mora a EL DEUDOR de pleno derecho, ` +
        `sin necesidad de interpelación previa.`,
    `CUARTA — La falta de pago de dos (2) cuotas consecutivas dará derecho a EL ACREEDOR a exigir el pago ` +
      `total del saldo adeudado como si fuera de plazo vencido.`,
    `QUINTA — Ambas partes constituyen domicilio en los indicados y se someten a la justicia ordinaria ` +
      `que corresponda al domicilio de EL ACREEDOR. En prueba de conformidad se firman dos (2) ejemplares ` +
      `de un mismo tenor y a un solo efecto.`,
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  let y = 39;
  for (const p of parrafos) {
    const lineas = doc.splitTextToSize(p, ANCHO);
    doc.text(lineas, MX, y, { lineHeightFactor: 1.45 });
    y += lineas.length * 4.8 + 3.5;
  }

  // Cronograma
  autoTable(doc, {
    startY: y + 2,
    margin: { left: MX, right: 210 - RX },
    head: [['#', 'Vencimiento', 'Monto']],
    body: cuotas.map((c) => [String(c.nro), formatFecha(c.vencimiento), formatMoney(c.monto)]),
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: INK },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right' } },
  });

  // Firmas
  let yFirmas = (doc.lastAutoTable?.finalY ?? y) + 30;
  const hPagina = doc.internal.pageSize.getHeight();
  if (yFirmas > hPagina - 40) {
    doc.addPage();
    yFirmas = 50;
  }
  const wFirma = 70;
  const firmas = [
    [MX, 'EL ACREEDOR'],
    [RX - wFirma, `EL DEUDOR · ${cliente?.nombre ?? ''}`],
  ];
  for (const [x, label] of firmas) {
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.line(x, yFirmas, x + wFirma, yFirmas);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('FIRMA Y ACLARACIÓN', x, yFirmas + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(label, x, yFirmas + 10);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text(
    `Generado con RutaCobro · ${ruta?.nombre ? `Ruta ${ruta.nombre} · ` : ''}${formatFecha(hoy())}`,
    MX,
    hPagina - 10,
  );

  doc.save(nombreArchivoContrato({ cliente }));
};
