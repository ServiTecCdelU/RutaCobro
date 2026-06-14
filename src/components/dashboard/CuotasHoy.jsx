import { ChevronRight, AlertTriangle } from 'lucide-react';
import { formatMoney, formatFecha } from '@/utils/formatters';
import { diasDeAtraso, hoy } from '@/utils/calculos';
import { useApp } from '@/context/AppContext';
import { useCobrar } from '@/hooks/useCobrar';
import { useNavigate } from 'react-router-dom';

export default function CuotasHoy({ rutaActiva }) {
  const { prestamos, clientes, rutas } = useApp();
  const { cobrarCuotaNro } = useCobrar();
  const navigate = useNavigate();
  const hoyStr = hoy();

  const items = prestamos
    .map((p) => {
      const cliente = clientes.find((c) => c.id === p.clienteId);
      if (!cliente) return null;
      if (rutaActiva !== 'all' && cliente.rutaId !== rutaActiva) return null;
      const proxima = (p.cuotasDetalle ?? []).find((c) => !c.pagada);
      if (!proxima) return null;
      return { prestamo: p, cliente, proxima, ruta: rutas.find((r) => r.id === cliente.rutaId) };
    })
    .filter(Boolean)
    .filter(({ proxima }) => proxima.vencimiento <= hoyStr)
    .sort((a, b) => diasDeAtraso(b.proxima) - diasDeAtraso(a.proxima));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden shadow-card">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Cuotas que vencen hoy</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {items.length} pendientes de cobro
          </p>
        </div>
        <button
          onClick={() => navigate('/clientes')}
          className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1 transition-colors"
        >
          Ver todas <ChevronRight size={14} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
          No hay cuotas para hoy
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.slice(0, 6).map(({ prestamo, cliente, proxima, ruta }) => {
            const atraso = diasDeAtraso(proxima);
            return (
              <div
                key={prestamo.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-sm"
                  style={{ background: ruta?.color ?? '#64748b' }}
                >
                  {cliente.nombre
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                      {cliente.nombre}
                    </span>
                    {atraso > 0 && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                        <AlertTriangle size={9} /> {atraso}d mora
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Cuota {proxima.nro}/{prestamo.cuotasDetalle.length} · {ruta?.nombre}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm tabular-nums">
                    {formatMoney(proxima.monto)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    Vence {formatFecha(proxima.vencimiento)}
                  </div>
                </div>
                <button
                  onClick={() => cobrarCuotaNro(prestamo.id, proxima.nro, cliente.nombre)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 active:scale-95 shadow-emerald/40 transition-all"
                >
                  Cobrar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
