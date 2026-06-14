import { Route } from 'lucide-react';

export default function RutaSelector({ rutas, rutaActiva, onSelect }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      <button
        onClick={() => onSelect('all')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-all flex-shrink-0 ${
          rutaActiva === 'all'
            ? 'bg-brand-gradient text-white shadow-brand-sm'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <Route size={15} /> Todas
      </button>
      {rutas.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-all flex-shrink-0 ${
            rutaActiva === r.id
              ? 'text-white shadow-lg'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          style={
            rutaActiva === r.id
              ? { background: r.color, boxShadow: `0 8px 20px -4px ${r.color}55` }
              : {}
          }
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: rutaActiva === r.id ? 'white' : r.color }}
          />
          {r.nombre}
        </button>
      ))}
    </div>
  );
}
