import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import { proyeccionDeCaja } from '@/utils/proyeccion';
import { formatMoney, formatFecha } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';

const LABELS_SEMANA = ['Esta semana', 'Próxima semana', 'En 3 semanas', 'En 4 semanas'];

/**
 * Proyección de cobranza: cuánto debería entrar por semana en las próximas
 * 4 semanas según los vencimientos, más el atrasado a recuperar.
 */
export default function ProyeccionCaja({ prestamos, clientes, rutaActiva }) {
  const proyeccion = useMemo(() => {
    const visibles =
      rutaActiva && rutaActiva !== 'all'
        ? (() => {
            const ids = new Set(clientes.filter((c) => c.rutaId === rutaActiva).map((c) => c.id));
            return prestamos.filter((p) => ids.has(p.clienteId));
          })()
        : prestamos;
    return proyeccionDeCaja(visibles, hoy(), 4);
  }, [prestamos, clientes, rutaActiva]);

  const max = Math.max(proyeccion.vencido, ...proyeccion.semanas.map((s) => s.esperado), 1);

  const filas = [
    ...(proyeccion.vencido > 0
      ? [{ label: 'Atrasado a recuperar', monto: proyeccion.vencido, esVencido: true }]
      : []),
    ...proyeccion.semanas.map((s, i) => ({
      label: LABELS_SEMANA[i] ?? `Semana ${i + 1}`,
      detalle: `${formatFecha(s.desde)} – ${formatFecha(s.hasta)}`,
      monto: s.esperado,
      cuotas: s.cuotas,
      esVencido: false,
    })),
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-5 shadow-card">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 flex items-center justify-center flex-shrink-0">
            <CalendarRange size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Proyección de cobranza</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Próximas 4 semanas según vencimientos
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total esperado
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatMoney(proyeccion.totalHorizonte)}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {filas.map((f) => (
          <div key={f.label} className="flex items-center gap-3">
            <div className="w-32 sm:w-40 flex-shrink-0">
              <div
                className={`text-xs font-semibold ${f.esVencido ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}
              >
                {f.label}
              </div>
              {f.detalle && (
                <div className="text-[10px] text-slate-400 dark:text-slate-500">{f.detalle}</div>
              )}
            </div>
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  f.esVencido ? 'bg-rose-400' : 'bg-brand-gradient'
                }`}
                style={{ width: `${Math.max(f.monto > 0 ? 4 : 0, (f.monto / max) * 100)}%` }}
              />
            </div>
            <div className="w-24 sm:w-28 text-right flex-shrink-0">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatMoney(f.monto)}
              </span>
              {f.cuotas > 0 && (
                <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500">
                  {' '}
                  · {f.cuotas} c.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
