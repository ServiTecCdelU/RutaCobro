import { linkWhatsApp } from '@/utils/formatters';

/** Descarga un File/Blob en el navegador (fallback). */
const descargar = (file) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || 'comprobante.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const puedeCompartirArchivo = (file) => {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
};

/**
 * Comparte el comprobante. En mobile usa el menú nativo (Web Share) con el PDF + el
 * mensaje. Si no se puede compartir archivos, descarga el PDF y abre WhatsApp con el
 * mensaje para adjuntarlo manualmente.
 *
 * @returns {Promise<'compartido' | 'cancelado' | 'fallback'>}
 */
export const compartirComprobante = async ({ file, mensaje, telefono }) => {
  if (puedeCompartirArchivo(file)) {
    try {
      await navigator.share({ files: [file], text: mensaje, title: 'Comprobante de pago' });
      return 'compartido';
    } catch (err) {
      // El usuario canceló el menú: no es un error.
      if (err?.name === 'AbortError') return 'cancelado';
      // Cualquier otra falla cae al respaldo de descarga.
    }
  }

  descargar(file);
  const url = linkWhatsApp(telefono, mensaje);
  if (url) window.open(url, '_blank', 'noopener');
  return 'fallback';
};
