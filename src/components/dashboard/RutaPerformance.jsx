import { formatMoney } from '@/utils/formatters';

export default function RutaPerformance({ porRuta }) {
  const maxCobrado = Math.max(...porRuta.map(r => r.cobrado), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900">Rendimiento por ruta</h3>
        <p className="text-xs text-slate-500">Cobrado total acumulado</p>
      </div>
      <div className="space-y-4">
        {porRuta.map(r => (
          <div key={r.id}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1" style={{ background: r.color, '--tw-ring-color': `${r.color}33` }} />
                <span className="text-sm font-semibold text-slate-700 truncate">{r.nombre}</span>
                <span className="text-xs text-slate-400 truncate">{r.cobrador}</span>
              </div>
              <span className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">{formatMoney(r.cobrado)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(r.cobrado / maxCobrado) * 100}%`,
                  background: `linear-gradient(90deg, ${r.color}, ${r.color}dd)`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
              {r.porcentaje.toFixed(0)}% cobrado de {formatMoney(r.total)}
            </div>
          </div>
        ))}
        {porRuta.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Sin rutas creadas</p>
        )}
      </div>
    </div>
  );
}
