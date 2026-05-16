import { useCallback, useMemo, useState } from 'react';

export function usePaginacion(items, porPagina = 20) {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);

  const paginados = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina;
    return items.slice(inicio, inicio + porPagina);
  }, [items, paginaActual, porPagina]);

  const ir = useCallback((p) => setPagina(Math.max(1, Math.min(p, totalPaginas))), [totalPaginas]);
  const anterior = useCallback(() => ir(paginaActual - 1), [ir, paginaActual]);
  const siguiente = useCallback(() => ir(paginaActual + 1), [ir, paginaActual]);
  const reset = useCallback(() => setPagina(1), []);

  return {
    items: paginados,
    pagina: paginaActual,
    totalPaginas,
    total: items.length,
    hayAnterior: paginaActual > 1,
    haySiguiente: paginaActual < totalPaginas,
    ir,
    anterior,
    siguiente,
    reset,
  };
}
