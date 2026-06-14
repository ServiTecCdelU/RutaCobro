import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function MetricCard({ label, value, change, icon: Icon, accent, sublabel }) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-3 sm:p-5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-card-hover transition-all duration-200 group shadow-card">
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity blur-2xl"
        style={{ background: accent }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.35,
        }}
      />
      <div className="flex items-start justify-between mb-2 sm:mb-3 relative">
        <div
          className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center ring-1 ring-inset"
          style={{
            background: `${accent}14`,
            color: accent,
            boxShadow: `inset 0 0 0 1px ${accent}22`,
          }}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.2} />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg ${
              change >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
            }`}
          >
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 relative truncate">
        {label}
      </div>
      <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate relative">
        {value}
      </div>
      {sublabel && (
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate relative">
          {sublabel}
        </div>
      )}
    </div>
  );
}
