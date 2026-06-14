// Bloque de carga con shimmer. Componer varios para armar placeholders.
export default function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-700/50 ${className}`} />
  );
}

// Placeholder de una tarjeta de métrica (grilla del Dashboard).
export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 p-3 sm:p-5 shadow-card">
      <Skeleton className="w-8 h-8 sm:w-11 sm:h-11 mb-2 sm:mb-3" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

// Placeholder de una fila de cliente (lista de Clientes / Cobranza).
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-3">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg flex-shrink-0" />
    </div>
  );
}
