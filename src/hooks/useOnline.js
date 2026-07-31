import { useEffect, useState } from 'react';

/**
 * Estado de conexión del dispositivo.
 *
 * Se apoya en `navigator.onLine`, que es confiable como negativo (false = sin
 * red) pero no como positivo. Alcanza para lo que necesitamos: bloquear las
 * operaciones que exigen red antes de intentarlas (ver utils/conexion.js).
 */
export function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );

  useEffect(() => {
    const conectado = () => setOnline(true);
    const desconectado = () => setOnline(false);
    window.addEventListener('online', conectado);
    window.addEventListener('offline', desconectado);
    // El estado pudo cambiar entre el render inicial y el efecto.
    setOnline(navigator.onLine !== false);
    return () => {
      window.removeEventListener('online', conectado);
      window.removeEventListener('offline', desconectado);
    };
  }, []);

  return online;
}
