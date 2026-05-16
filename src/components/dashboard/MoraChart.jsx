import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export default memo(function MoraChart({ data }) {
  const max = Math.max(...data, 1);
  const actual = data[data.length - 1] ?? 0;
  const anterior = data[0] ?? 0;
  const cambio = anterior > 0 ? ((actual - anterior) / anterior) * 100 : 0;

  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: DIAS_CORTOS[d.getDay()], esHoy: i === 6 };
  });

  const points = data.map((v, i) => {
    const x = (i / 6) * 100;
    const y = 100 - (v / max) * 100;
    return { x, y, value: v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const areaD = pathD + ` L 100 100 L 0 100 Z`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Tendencia de mora</h3>
            <p className="text-xs text-slate-500 tabular-nums">Monto en mora acumulado — 7 dias</p>
          </div>
        </div>
        {anterior > 0 && (
          <div
            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              cambio <= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
            }`}
          >
            {cambio > 0 ? '+' : ''}
            {cambio.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="relative h-32">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="mora-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#mora-gradient)" />
          <path
            d={pathD}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={labels[i].esHoy ? '#e11d48' : '#f43f5e'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between mt-2">
        {labels.map((l, i) => (
          <span
            key={i}
            className={`text-[10px] font-semibold ${l.esHoy ? 'text-rose-600' : 'text-slate-400'}`}
          >
            {l.label}
          </span>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">Mora actual</span>
        <span className="text-sm font-bold text-rose-600 tabular-nums">{formatMoney(actual)}</span>
      </div>
    </div>
  );
});
