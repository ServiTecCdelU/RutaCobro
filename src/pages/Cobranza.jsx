import { useMemo, useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  MessageCircle,
  Banknote,
  AlertTriangle,
  CalendarClock,
  HandCoins,
  Wallet,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatFecha, formatFechaLarga, linkWhatsApp } from '@/utils/formatters';
import { hoy, sumarDias } from '@/utils/calculos';
import { construirItemsCobranza, mensajeRecordatorio, linkMapa } from '@/utils/cobranza';
import { calcularPunitorio } from '@/utils/punitorios';
import { useCobrar } from '@/hooks/useCobrar';
import { usePaginacion } from '@/hooks/usePaginacion';
import MetricCard from '@/components/ui/MetricCard';
import RutaSelector from '@/components/ui/RutaSelector';
import EmptyState from '@/components/ui/EmptyState';
import Paginacion from '@/components/ui/Paginacion';
import ModalDetalle from '@/components/modals/ModalDetalle';

const FILTROS = [
  { id: 'para_hoy', label: 'Para hoy' },
  { id: 'vencidas', label: 'Vencidas' },
  { id: 'proximas', label: 'Próx. 7 días' },
  { id: 'todas', label: 'Todas' },
];

function Avatar({ nombre, color }) {
  const iniciales = (nombre ?? '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0 shadow-sm"
      style={{ background: color }}
    >
      {iniciales}
    </div>
  );
}

export default function Cobranza() {
  const { prestamos, clientes, rutas, puedeEditar, negocioConfig } = useApp();
  const { cobrarCuotaNro, cobrando } = useCobrar();

  const [filtro, setFiltro] = useState('para_hoy');
  const [rutaActiva, setRutaActiva] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [detalleId, setDetalleId] = useState(null);

  const hoyStr = hoy();
  const limite7 = sumarDias(hoyStr, 7);

  const todos = useMemo(
    () => construirItemsCobranza(prestamos, clientes, rutas, hoyStr),
    [prestamos, clientes, rutas, hoyStr],
  );

  const items = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return todos
      .filter((it) => {
        if (filtro === 'vencidas') return it.categoria === 'vencida';
        if (filtro === 'proximas')
          return it.categoria === 'futura' && it.cuota.vencimiento <= limite7;
        if (filtro === 'para_hoy') return it.categoria === 'vencida' || it.categoria === 'hoy';
        return true; // todas
      })
      .filter((it) => rutaActiva === 'all' || it.cliente?.rutaId === rutaActiva)
      .filter((it) => !q || it.cliente?.nombre.toLowerCase().includes(q));
  }, [todos, filtro, rutaActiva, busqueda, limite7]);

  const pag = usePaginacion(items, 25);
  const resetPag = pag.reset;
  useEffect(() => {
    resetPag();
  }, [filtro, rutaActiva, busqueda, resetPag]);

  // Métricas (sobre la ruta seleccionada, no sobre el filtro de chips)
  const visibles = useMemo(
    () => todos.filter((it) => rutaActiva === 'all' || it.cliente?.rutaId === rutaActiva),
    [todos, rutaActiva],
  );
  const aCobrarHoy = visibles
    .filter((it) => it.categoria === 'vencida' || it.categoria === 'hoy')
    .reduce((s, it) => s + it.pendiente, 0);
  const vencido = visibles
    .filter((it) => it.categoria === 'vencida')
    .reduce((s, it) => s + it.pendiente, 0);
  const clientesParaHoy = new Set(
    visibles
      .filter((it) => it.categoria === 'vencida' || it.categoria === 'hoy')
      .map((it) => it.prestamo.clienteId),
  ).size;

  const recordar = (it) => {
    const url = linkWhatsApp(it.cliente?.tel, mensajeRecordatorio(it.cliente, it.cuota));
    if (url) window.open(url, '_blank', 'noopener');
  };
  const abrirMapa = (it) => {
    const url = linkMapa(it.cliente?.direccion);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-display">
            Cobranza del día
          </h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">{formatFechaLarga(hoyStr)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="A cobrar hoy"
          value={formatMoney(aCobrarHoy)}
          icon={HandCoins}
          accent="#10b981"
          sublabel="Vencidas + de hoy"
        />
        <MetricCard
          label="Clientes"
          value={clientesParaHoy}
          icon={CalendarClock}
          accent="#3b82f6"
          sublabel="Para cobrar hoy"
        />
        <MetricCard
          label="Vencido"
          value={formatMoney(vencido)}
          icon={AlertTriangle}
          accent="#f43f5e"
          sublabel="En mora"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              filtro === f.id
                ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar cliente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      {rutas.length > 1 && (
        <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nada para cobrar"
          description={
            filtro === 'todas'
              ? 'No hay cuotas pendientes con los filtros actuales.'
              : 'No quedan cuotas para cobrar en este período. ¡Buen trabajo!'
          }
        />
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 shadow-card overflow-hidden">
            {pag.items.map((it) => {
              const enMora = it.categoria === 'vencida';
              const tieneMapa = Boolean(linkMapa(it.cliente?.direccion));
              const tieneWpp = Boolean(it.cliente?.tel);
              const punitorio = calcularPunitorio(it.cuota, negocioConfig?.punitorio, hoyStr);
              return (
                <div
                  key={it.prestamo.id}
                  className={`px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5 sm:gap-3 transition-colors ${
                    enMora
                      ? 'bg-rose-50/60 dark:bg-rose-900/10'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <Avatar nombre={it.cliente?.nombre} color={it.ruta?.color ?? '#64748b'} />

                  <button
                    onClick={() => setDetalleId(it.prestamo.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight break-words line-clamp-2">
                      {it.cliente?.nombre ?? 'Cliente eliminado'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums flex items-center gap-1.5 flex-wrap">
                      <span>Cuota {it.cuota.nro}</span>
                      <span>·</span>
                      {enMora ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {it.atraso}d de atraso
                        </span>
                      ) : it.categoria === 'hoy' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Vence hoy
                        </span>
                      ) : (
                        <span>Vence {formatFecha(it.cuota.vencimiento)}</span>
                      )}
                      {it.ruta?.nombre && (
                        <>
                          <span>·</span>
                          <span className="truncate">{it.ruta.nombre}</span>
                        </>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm tabular-nums">
                      {formatMoney(it.pendiente)}
                    </div>
                    {punitorio.monto > 0 && (
                      <div
                        className="text-[10px] font-semibold text-rose-500 tabular-nums leading-none"
                        title={`Punitorio por ${punitorio.dias} día(s) de atraso`}
                      >
                        + {formatMoney(punitorio.monto)} punit.
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {tieneMapa && (
                        <button
                          onClick={() => abrirMapa(it)}
                          title="Ver en el mapa"
                          aria-label="Ver en el mapa"
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center transition-colors"
                        >
                          <MapPin size={14} />
                        </button>
                      )}
                      {tieneWpp && (
                        <button
                          onClick={() => recordar(it)}
                          title="Recordatorio por WhatsApp"
                          aria-label="Recordatorio por WhatsApp"
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 hover:border-emerald-300 flex items-center justify-center transition-colors"
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                      {puedeEditar && (
                        <button
                          onClick={() =>
                            cobrarCuotaNro(it.prestamo.id, it.cuota.nro, it.cliente?.nombre)
                          }
                          disabled={cobrando}
                          className="px-3 h-8 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 disabled:opacity-50 transition-all inline-flex items-center gap-1"
                        >
                          <Banknote size={13} /> <span className="hidden sm:inline">Cobrar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Paginacion
            pagina={pag.pagina}
            totalPaginas={pag.totalPaginas}
            total={pag.total}
            hayAnterior={pag.hayAnterior}
            haySiguiente={pag.haySiguiente}
            anterior={pag.anterior}
            siguiente={pag.siguiente}
          />
        </>
      )}

      {detalleId && <ModalDetalle prestamoId={detalleId} onClose={() => setDetalleId(null)} />}
    </div>
  );
}
