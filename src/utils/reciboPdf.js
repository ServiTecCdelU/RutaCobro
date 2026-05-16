export async function generarRecibo({ cliente, prestamo, cuota, ruta, monto, fecha }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: [80, 150] });

  const w = 80;
  let y = 10;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGO', w / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RutaCobro', w / 2, y, { align: 'center' });
  y += 5;

  // Linea separadora
  doc.setDrawColor(200);
  doc.line(5, y, w - 5, y);
  y += 6;

  // Datos
  const datos = [
    ['Fecha:', fecha],
    ['Cliente:', cliente?.nombre ?? '—'],
    ['DNI:', cliente?.dni ?? '—'],
    ['Ruta:', ruta?.nombre ?? '—'],
    ['Cuota:', `${cuota.nro}/${prestamo.cuotasDetalle?.length ?? '?'}`],
    ['Monto:', `$${Number(monto).toLocaleString('es-AR')}`],
  ];

  doc.setFontSize(9);
  for (const [label, value] of datos) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 8, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 30, y);
    y += 5;
  }

  y += 3;
  doc.setDrawColor(200);
  doc.line(5, y, w - 5, y);
  y += 6;

  // Estado
  const pendientes = (prestamo.cuotasDetalle ?? []).filter((c) => !c.pagada).length;
  doc.setFontSize(8);
  doc.text(`Cuotas restantes: ${pendientes}`, w / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Documento generado automaticamente', w / 2, y, { align: 'center' });
  y += 4;
  doc.text(`ID: ${prestamo.id?.slice(0, 8) ?? ''}`, w / 2, y, { align: 'center' });

  doc.save(`recibo_${cliente?.nombre?.replace(/\s/g, '_') ?? 'pago'}_cuota${cuota.nro}.pdf`);
}
