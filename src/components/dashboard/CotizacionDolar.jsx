import { DollarSign, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { useDolar } from '@/hooks/useDolar';
import { formatMoney } from '@/utils/formatters';
import { pesosAUsd, formatUsd, brechaPct } from '@/utils/dolar';

function Cotiz({ nombre, dato, acento }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {nombre}
      </div>
      <div className="text-base sm:text-xl font-bold text-slate-900 tabular-nums truncate">
        {dato?.venta != null ? formatMoney(dato.venta) : '—'}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: acento }} />
        <span className="text-[11px] text-slate-500 truncate">
          {dato?.compra != null ? `compra ${formatMoney(dato.compra)}` : 'venta'}
        </span>
      </div>
    </div>
  );
}

/**
 * Panel de cotización del dólar + valor real de la cartera en USD.
 * @param {{ pesos?: number }} props pesos a convertir (capital en calle)
 */
export default function CotizacionDolar({ pesos }) {
  const { dolares, cargando, error, refrescar } = useDolar();

  if (cargando && !dolares) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 shadow-card">
        <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dolares) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
            <span className="truncate">No se pudo cargar la cotización del dólar.</span>
          </div>
          <button
            onClick={refrescar}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex-shrink-0"
          >
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const oficial = dolares.oficial;
  const blue = dolares.blue;
  const brecha = brechaPct(blue?.venta, oficial?.venta);
  const carteraUsd = pesos > 0 ? pesosAUsd(pesos, blue?.venta) : null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 truncate">Cotización del dólar</h2>
            <p className="text-xs text-slate-500 truncate">
              Fuente: dolarapi.com{brecha != null ? ` · brecha ${brecha}%` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={refrescar}
          disabled={cargando}
          aria-label="Actualizar cotización"
          className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
        >
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Cotiz nombre="Oficial" dato={oficial} acento="#10b981" />
        <Cotiz nombre="Blue" dato={blue} acento="#3b82f6" />
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Cartera en USD
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 tabular-nums truncate">
            {carteraUsd != null ? formatUsd(carteraUsd) : '—'}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TrendingUp size={11} className="text-slate-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-500 truncate">al blue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
