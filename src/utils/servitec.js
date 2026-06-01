import { linkWhatsApp } from '@/utils/formatters';

// Datos de contacto del desarrollador (SERVITEC) para la publicidad del sistema.
export const SERVITEC = {
  nombre: 'SERVITEC',
  tel: '+54 9 3442 64-6670',
  telDisplay: '+54 9 3442 64-6670',
  mensaje: 'Hola SERVITEC, vi RutaCobro y me gustaría info sobre el sistema de gestión de cobros.',
};

// URL de WhatsApp con mensaje pre-armado para consultar por el sistema.
export const servitecWhatsApp = () => linkWhatsApp(SERVITEC.tel, SERVITEC.mensaje);
