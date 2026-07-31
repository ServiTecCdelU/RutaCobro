const VERSION_FORMATO = 1;

export const COLECCIONES_EXPORTABLES = [
  'rutas',
  'clientes',
  'prestamos',
  'movimientos',
  'gastos',
  'notas',
  'usuarios',
  'auditoria',
];

/**
 * Arma el objeto de backup a partir de las colecciones ya leídas.
 * Función pura: la I/O vive en services.js (`exportarNegocio`).
 *
 * `generadoEn` va en ISO para que el archivo sea comparable entre backups
 * aunque se abra en otra zona horaria.
 */
export function construirExport({ colecciones, config, generadoEn = new Date() }) {
  const conteos = Object.fromEntries(
    Object.entries(colecciones).map(([nombre, docs]) => [nombre, docs.length]),
  );

  return {
    formato: VERSION_FORMATO,
    generadoEn: generadoEn.toISOString(),
    negocio: config ?? null,
    conteos,
    totalDocumentos: Object.values(conteos).reduce((s, n) => s + n, 0),
    datos: colecciones,
  };
}

export const nombreArchivoExport = (fecha = new Date()) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `rutacobro-backup-${y}${m}${d}-${hh}${mm}.json`;
};

/** Dispara la descarga del backup en el navegador. */
export function descargarJson(objeto, nombreArchivo) {
  const blob = new Blob([JSON.stringify(objeto, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera en el siguiente tick: Safari cancela la descarga si se revoca antes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
