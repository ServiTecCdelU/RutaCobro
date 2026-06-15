// Genera un PDF de presentación comercial de RutaCobro a partir del contenido del README.
// Uso: node scripts/generar-pdf-venta.mjs  → produce RutaCobro-presentacion.pdf en la raíz.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFileSync } from 'node:fs';

const BRAND = [79, 70, 229]; // indigo-600
const ACCENT = [124, 58, 237]; // violet-600
const DARK = [15, 23, 42]; // slate-900
const SLATE = [100, 116, 139]; // slate-500
const EMERALD = [16, 185, 129];

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const ML = 48;
const MR = 48;
const MT = 56;
const MB = 56;
const CW = W - ML - MR;
let y = MT;

const ensure = (h) => {
  if (y + h > H - MB) {
    doc.addPage();
    y = MT;
  }
};

const gap = (h) => {
  y += h;
};

function heading(text) {
  ensure(34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...BRAND);
  doc.text(text, ML, y);
  y += 8;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(1.5);
  doc.line(ML, y, ML + 38, y);
  y += 16;
}

function subheading(text) {
  ensure(22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  doc.text(text, ML, y);
  y += 15;
}

function paragraph(text, { size = 10.5, color = SLATE, indent = 0 } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CW - indent);
  for (const line of lines) {
    ensure(size + 4);
    doc.text(line, ML + indent, y);
    y += size + 4;
  }
}

function bullet(text) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...DARK);
  const lines = doc.splitTextToSize(text, CW - 16);
  ensure(14);
  // viñeta
  doc.setFillColor(...EMERALD);
  doc.rect(ML, y - 6, 4, 4, 'F');
  doc.text(lines[0], ML + 12, y);
  y += 14;
  for (let i = 1; i < lines.length; i++) {
    ensure(14);
    doc.text(lines[i], ML + 12, y);
    y += 14;
  }
}

// ── Encabezado / portada ──────────────────────────────────────────────────────
doc.setFillColor(...BRAND);
doc.roundedRect(ML, y, CW, 96, 10, 10, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(30);
doc.text('RutaCobro', ML + 22, y + 42);
doc.setFont('helvetica', 'normal');
doc.setFontSize(12);
doc.text('Gestión profesional de tu cartera de préstamos por rutas de cobro', ML + 22, y + 66);
doc.setFontSize(10);
doc.setTextColor(224, 231, 255);
doc.text('Desarrollado por SERVITEC  ·  WhatsApp +54 9 3442 64-6670', ML + 22, y + 84);
y += 96 + 22;

paragraph(
  'Dejá las planillas y los cuadernos. RutaCobro digitaliza todo tu negocio de préstamos: ' +
    'clientes, cuotas, cobranza diaria, caja, gastos y rendiciones — en tiempo real, desde el ' +
    'celular o la computadora, con comprobantes que enviás por WhatsApp en un toque.',
  { size: 11, color: DARK },
);
gap(10);

// ── Para quién es ─────────────────────────────────────────────────────────────
heading('¿Para quién es?');
paragraph(
  'Para prestamistas y financieras que manejan cartera por rutas: cobradores que recorren ' +
    'clientes, cuotas de frecuencia variable y la necesidad de saber, en cada momento, cuánto ' +
    'hay en la calle, cuánto se cobró y cuánto falta. Si hoy lo llevás en papel o en Excel, ' +
    'RutaCobro te ordena el negocio y te ahorra horas todas las semanas.',
);
gap(8);

// ── Lo que hace por vos ───────────────────────────────────────────────────────
heading('Lo que hace por vos');

const features = [
  [
    'Préstamos y cobranza en 1 click',
    [
      'Alta de clientes y préstamos con cuotas diarias, semanales, quincenales o mensuales.',
      'Cobrá una cuota con un solo toque; el movimiento se registra de forma segura y atómica.',
      'Pago por monto: el sistema reparte solo lo recibido entre las cuotas pendientes.',
      'Revertí un cobro mal hecho sin romper la contabilidad.',
    ],
  ],
  [
    'Cobranza del día',
    [
      'Lista de cuotas vencidas, de hoy y próximas, ordenadas por urgencia.',
      'Recordatorio por WhatsApp pre-armado y link al mapa de la dirección del cliente.',
    ],
  ],
  [
    'Tablero en tiempo real',
    [
      'Capital inicial, en calle y disponible para nuevos préstamos.',
      'Cobrado, a cobrar hoy, mora y ganancia (realizada y proyectada, con ROI).',
      'Mora por antigüedad y proyección de cobranza de las próximas 4 semanas.',
      'Cotización del dólar (oficial y blue) con tu cartera valuada en USD.',
    ],
  ],
  [
    'Comprobantes y documentos por WhatsApp',
    [
      'Comprobante de pago en PDF al cobrar, listo para enviar al cliente.',
      'Estado de cuenta completo (cronograma del préstamo) en PDF.',
      'Contrato / pagaré (mutuo) en PDF para firmar, con cláusulas y monto en letras.',
    ],
  ],
  [
    'Rutas, cobradores y comisiones',
    [
      'Organizá la cartera por rutas con color y cobrador asignado.',
      'Cada cobrador ve solo su ruta; el admin ve todo.',
      'Comisiones por cobrador (% sobre lo cobrado), liquidadas en el cierre.',
    ],
  ],
  [
    'Cierre de caja y control de gastos',
    [
      'Cierre por ruta/cobrador: cobrado − gastos − prestado = neto a rendir, con export PDF.',
      'Registro de gastos por categoría, siempre asociado a una ruta.',
      'Resultado neto del negocio (ganancia cobrada − gastos) en el tablero.',
    ],
  ],
  [
    'Refinanciación, renovación y punitorios',
    [
      'Refinanciá el saldo en un cronograma nuevo conservando lo ya cobrado.',
      'Renová con un préstamo nuevo precargado al finalizar el anterior.',
      'Punitorios por mora automáticos y configurables (tasa, gracia y tope).',
    ],
  ],
  [
    'Evaluá a quién le prestás',
    [
      'Score de riesgo del cliente según su historial: Excelente / Bueno / Regular / Riesgoso / Nuevo.',
      'Verificación crediticia BCRA gratuita por DNI o CUIT (deuda y cheques rechazados).',
    ],
  ],
  [
    'Asistente con Inteligencia Artificial (novedad)',
    [
      'Respondé en lenguaje natural: "¿quién está por caer en mora?", "¿a quién conviene renovar?".',
      'Convierte tus datos en respuestas accionables al instante.',
    ],
  ],
  [
    'Equipo, auditoría y app móvil',
    [
      'Invitá cobradores con un link; cada uno con su rol y permisos.',
      'Auditoría de acciones sensibles con autor (quién revirtió, eliminó o refinanció).',
      'Funciona como app instalable (PWA), mobile-first, con modo oscuro.',
    ],
  ],
];

for (const [titulo, items] of features) {
  subheading(titulo);
  for (const it of items) bullet(it);
  gap(6);
}

// ── Por qué RutaCobro (tabla comparativa) ─────────────────────────────────────
heading('¿Por qué RutaCobro?');
autoTable(doc, {
  startY: y,
  margin: { left: ML, right: MR },
  head: [['Antes (papel / Excel)', 'Con RutaCobro']],
  body: [
    ['No sabés cuánto tenés en la calle', 'Capital, cobrado y disponible en tiempo real'],
    ['Recordás de memoria a quién cobrar', 'Cobranza del día ordenada por urgencia'],
    ['Comprobantes a mano', 'PDF + WhatsApp en un toque'],
    ['Cierres de caja a ojo', 'Rendición por ruta/cobrador con un click'],
    ['No sabés a quién conviene prestar', 'Score interno + BCRA + asistente IA'],
    ['Errores difíciles de rastrear', 'Auditoría con autor de cada acción'],
  ],
  styles: { fontSize: 10, cellPadding: 6, textColor: DARK },
  headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [243, 244, 246] },
  columnStyles: { 1: { textColor: BRAND, fontStyle: 'bold' } },
});
y = doc.lastAutoTable.finalY + 22;

// ── Tecnología ────────────────────────────────────────────────────────────────
heading('Tecnología confiable');
paragraph(
  'Construido con React + Firebase: datos en tiempo real, sincronización entre dispositivos y ' +
    'funcionamiento offline. Hosting en la nube, sin instalaciones complicadas. Tus datos, ' +
    'seguros y siempre disponibles.',
);
gap(12);

// ── CTA final ─────────────────────────────────────────────────────────────────
ensure(80);
doc.setFillColor(...DARK);
doc.roundedRect(ML, y, CW, 64, 10, 10, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.text('Pedí una demo sin compromiso', ML + 20, y + 26);
doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.setTextColor(167, 243, 208);
doc.text('SERVITEC  ·  WhatsApp +54 9 3442 64-6670', ML + 20, y + 47);
y += 64;

// Pie de página en todas las páginas
const total = doc.getNumberOfPages();
for (let p = 1; p <= total; p++) {
  doc.setPage(p);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text('RutaCobro · Desarrollado por SERVITEC', ML, H - 24);
  doc.text(`Página ${p} de ${total}`, W - MR, H - 24, { align: 'right' });
}

const out = 'RutaCobro-presentacion.pdf';
const buf = Buffer.from(doc.output('arraybuffer'));
writeFileSync(out, buf);
console.log(`PDF generado: ${out} (${(buf.length / 1024).toFixed(0)} KB, ${total} páginas)`);
