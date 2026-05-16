import { useEffect, useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';

export default function NotasCliente({ clienteId }) {
  const { subscribeNotas, crearNota, eliminarNota, user, puedeEditar, esAdmin } = useApp();
  const toast = useToast();
  const [notas, setNotas] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    return subscribeNotas(clienteId, setNotas);
  }, [clienteId, subscribeNotas]);

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await crearNota({ clienteId, texto, autor: user?.email ?? '' });
      setTexto('');
    } catch (err) {
      toast.error('No se pudo guardar la nota', { description: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await eliminarNota(id);
      toast.info('Nota eliminada');
    } catch (err) {
      toast.error('No se pudo eliminar', { description: err.message });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const formatTiempo = (ts) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const ahora = new Date();
    const diff = ahora - d;
    if (diff < 60_000) return 'Ahora';
    if (diff < 3_600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `Hace ${Math.floor(diff / 3_600_000)}h`;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
        <MessageSquare size={12} /> Notas ({notas.length})
      </div>

      {puedeEditar && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Agregar nota..."
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
          <button
            onClick={handleEnviar}
            disabled={enviando || !texto.trim()}
            className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all shadow-brand-sm"
            aria-label="Enviar nota"
          >
            <Send size={14} />
          </button>
        </div>
      )}

      {notas.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Sin notas</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-auto">
          {notas.map((n) => (
            <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 group">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words flex-1">
                  {n.texto}
                </p>
                {esAdmin && (
                  <button
                    onClick={() => handleEliminar(n.id)}
                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    aria-label="Eliminar nota"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-400 font-semibold">{n.autor}</span>
                <span className="text-[10px] text-slate-400">{formatTiempo(n.creadoEn)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
