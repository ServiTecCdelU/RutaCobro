// Monedas soportadas. El símbolo y locale se aplican en formatMoney.
export const MONEDAS = {
  ARS: { simbolo: '$', locale: 'es-AR', nombre: 'Peso argentino' },
  USD: { simbolo: 'US$', locale: 'en-US', nombre: 'Dólar estadounidense' },
  MXN: { simbolo: '$', locale: 'es-MX', nombre: 'Peso mexicano' },
  COP: { simbolo: '$', locale: 'es-CO', nombre: 'Peso colombiano' },
  PEN: { simbolo: 'S/', locale: 'es-PE', nombre: 'Sol peruano' },
};

// Moneda activa a nivel de módulo: la setea DataContext al cargar la config del
// negocio. Permite que los ~180 usos de formatMoney respeten la moneda elegida
// sin cambiar su firma (incluidos los PDFs y utilidades fuera de React).
let monedaActual = 'ARS';

export const setMoneda = (codigo) => {
  if (MONEDAS[codigo]) monedaActual = codigo;
};

export const getMoneda = () => monedaActual;

export const formatMoney = (n) => {
  const { simbolo, locale } = MONEDAS[monedaActual] ?? MONEDAS.ARS;
  const v = Number(n);
  if (!Number.isFinite(v)) return simbolo + '0';
  return simbolo + v.toLocaleString(locale, { minimumFractionDigits: 0 });
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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
