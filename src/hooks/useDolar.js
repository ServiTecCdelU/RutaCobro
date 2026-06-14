import { useState, useEffect, useCallback } from 'react';
import { consultarDolares } from '@/utils/dolar';

// Cache a nivel de módulo: la cotización cambia poco, evita refetch al navegar.
let cache = null;
let cacheTs = 0;
const TTL = 10 * 60 * 1000; // 10 minutos

export function useDolar() {
  const [dolares, setDolares] = useState(cache);
  const [cargando, setCargando] = useState(!cache);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (force = false) => {
    if (!force && cache && Date.now() - cacheTs < TTL) {
      setDolares(cache);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const data = await consultarDolares();
      cache = data;
      cacheTs = Date.now();
      setDolares(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { dolares, cargando, error, refrescar: () => cargar(true) };
}
