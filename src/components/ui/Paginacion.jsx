import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Paginacion({
  pagina,
  totalPaginas,
  total,
  hayAnterior,
  haySiguiente,
  anterior,
  siguiente,
}) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        {total} resultados · Página {pagina}/{totalPaginas}
      </span>
      <div className="flex gap-1">
        <button
          onClick={anterior}
          disabled={!hayAnterior}
          aria-label="Página anterior"
          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={siguiente}
          disabled={!haySiguiente}
          aria-label="Página siguiente"
          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
