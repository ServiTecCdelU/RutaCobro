export const formatMoney = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '$0';
  return '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 });
};

export const formatFecha = (d) => {
  if (!d) return '—';
  const fecha = new Date(d + 'T00:00:00');
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

export const formatFechaLarga = (d) => {
  if (!d) return '—';
  const fecha = new Date(d + 'T00:00:00');
  return fecha.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

export const telefonoAWhatsApp = (tel) => {
  if (!tel) return null;
  const digits = String(tel).replace(/\D/g, '');
  if (!digits) return null;
  // Si no arranca con 54 (Argentina), lo anteponemos
  return digits.startsWith('54') ? digits : `54${digits}`;
};

export const linkWhatsApp = (tel, mensaje) => {
  const num = telefonoAWhatsApp(tel);
  if (!num) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `https://wa.me/${num}${texto}`;
};
