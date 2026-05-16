import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function BusquedaGlobal() {
  const { clientes, prestamos, rutas } = useApp();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setAbierto((v) => !v);
      }
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const resultados = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    const res = [];

    for (const c of clientes) {
      if (res.length >= 8) break;
      const match =
        c.nombre?.toLowerCase().includes(q) ||
        c.dni?.toLowerCase().includes(q) ||
        c.tel?.toLowerCase().includes(q);
      if (match) {
        const ruta = rutas.find((r) => r.id === c.rutaId);
        const prestamosCliente = prestamos.filter(
          (p) => p.clienteId === c.id && p.estado !== 'finalizado',
        );
        res.push({ tipo: 'cliente', data: c, ruta, prestamosActivos: prestamosCliente.length });
      }
    }
    return res;
  }, [query, clientes, prestamos, rutas]);

  const handleSelect = () => {
    setAbierto(false);
    setQuery('');
    navigate('/clientes');
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-400 text-sm hover:border-slate-300 hover:text-slate-600 transition-colors"
        aria-label="Buscar"
      >
        <Search size={14} />
        <span>Buscar...</span>
        <kbd className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
          Ctrl+K
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setAbierto(false)}
    >
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-lg shadow-popover border border-slate-200 overflow-hidden animate-[pop_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente por nombre, DNI o telefono..."
            className="flex-1 py-3.5 text-sm outline-none bg-transparent"
          />
          <button
            onClick={() => setAbierto(false)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {query.length >= 2 && (
          <div className="max-h-80 overflow-auto">
            {resultados.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Sin resultados</div>
            ) : (
              <div className="py-2">
                {resultados.map((r) => (
                  <button
                    key={r.data.id}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                      style={{ background: r.ruta?.color ?? '#64748b' }}
                    >
                      {r.data.nombre
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {r.data.nombre}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.data.dni && `DNI ${r.data.dni} · `}
                        {r.ruta?.nombre ?? 'Sin ruta'}
                        {r.prestamosActivos > 0 &&
                          ` · ${r.prestamosActivos} prestamo${r.prestamosActivos > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <Users size={14} className="text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="py-6 text-center text-xs text-slate-400">
            Escribi al menos 2 caracteres para buscar
          </div>
        )}
      </div>
    </div>
  );
}
