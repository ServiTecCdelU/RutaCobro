import { useState, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/config';

export function useAsistente() {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const callableRef = useRef(null);

  const getCallable = () => {
    if (!callableRef.current) callableRef.current = httpsCallable(functions, 'asistenteIA');
    return callableRef.current;
  };

  const enviar = useCallback(
    async (texto) => {
      const limpio = texto.trim();
      if (!limpio || cargando) return;
      setError(null);
      setCargando(true);
      const historial = [...mensajes, { role: 'user', content: limpio }];
      setMensajes(historial);
      try {
        const res = await getCallable()({ mensajes: historial });
        const respuesta = res?.data?.respuesta ?? 'Sin respuesta.';
        setMensajes((prev) => [...prev, { role: 'assistant', content: respuesta }]);
      } catch (err) {
        setError(err.message ?? 'No se pudo consultar al asistente.');
      } finally {
        setCargando(false);
      }
    },
    [mensajes, cargando],
  );

  return { mensajes, enviar, cargando, error };
}
