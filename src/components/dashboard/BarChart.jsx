import { memo } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default memo(function BarChart({ data }) {
  const max = Math.max(...data, 1);

  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: DIAS_CORTOS[d.getDay()], esHoy: i === 6 };
  });

  const total = data.reduce((s, v) => s + v, 0);
  // Tendencia: primeros 3 días vs últimos 3 (sin saltear ninguno arbitrariamente)
  const mitadAnterior = data.slice(0, 3).reduce((s, v) => s + v, 0);
  const mitadActual = data.slice(-3).reduce((s, v) => s + v, 0);
  const cambio = mitadAnterior > 0 ? ((mitadActual - mitadAnterior) / mitadAnterior) * 100 : null;
  const positivo = cambio !== null && cambio >= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-5 shadow-card">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Cobranza semanal</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {formatMoney(total)} en 7 días
          </p>
        </div>
        {cambio !== null && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
              positivo ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
            }`}
          >
            {positivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {positivo ? '+' : ''}
            {cambio.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="flex items-end gap-1.5 h-36">
        {data.map((v, i) => {
          const { label, esHoy } = labels[i];
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="w-full flex-1 flex items-end relative">
                <div
                  className="w-full rounded-t-lg transition-all group-hover:opacity-90"
                  style={{
                    height: `${(v / max) * 100}%`,
                    minHeight: 4,
                    background: esHoy
                      ? 'linear-gradient(to top, #4f46e5, #818cf8)'
                      : 'linear-gradient(to top, #cbd5e1, #e2e8f0)',
                    boxShadow: esHoy ? '0 4px 12px -2px rgba(79,70,229,0.45)' : 'none',
                  }}
                />
                {v > 0 && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white dark:bg-slate-700 px-2 py-1 rounded-md shadow-popover border border-slate-100 dark:border-slate-600 z-10 pointer-events-none">
                    {formatMoney(v)}
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold ${esHoy ? 'text-brand-700' : 'text-slate-400'}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
