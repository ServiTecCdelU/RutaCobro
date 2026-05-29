import { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  TrendingDown,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  FileDown,
  Receipt,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney, formatFecha, formatFechaLarga } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';
import { categoriaGasto, totalesPorCategoria } from '@/utils/gastos';
import { subscribeGastosPorRango } from '@/firebase/services';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import MetricCard from '@/components/ui/MetricCard';
import RutaSelector from '@/components/ui/RutaSelector';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ActionMenu from '@/components/ui/ActionMenu';
import ModalGasto from '@/components/modals/ModalGasto';
import { usePaginacion } from '@/hooks/usePaginacion';
import Paginacion from '@/components/ui/Paginacion';

export default function Gastos() {
  const { user, rutas, puedeEditar, eliminarGasto, error } = useApp();
  const toast = useToast();

  // Por defecto: mes actual
  const inicioMes = useMemo(() => hoy().slice(0, 8) + '01', []);
  const [fechaDesde, setFechaDesde] = useState(inicioMes);
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [rutaActiva, setRutaActiva] = useState('all');
  const [gastos, setGastos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [modalGasto, setModalGasto] = useState(null); // null | { nuevo } | { editar: gasto }
  const [confirmBorrar, setConfirmBorrar] = useState(null);

  const esRango = fechaDesde !== fechaHasta;

  useEffect(() => {
    if (!user) return;
    setLoadError(null);
    const [desde, hasta] =
      fechaDesde <= fechaHasta ? [fechaDesde, fechaHasta] : [fechaHasta, fechaDesde];
    return subscribeGastosPorRango(desde, hasta, setGastos, (err) =>
      setLoadError(err.message ?? 'Error cargando gastos'),
    );
  }, [user, fechaDesde, fechaHasta]);

  const rutasMap = useMemo(() => new Map(rutas.map((r) => [r.id, r])), [rutas]);

  const items = useMemo(
    () =>
      gastos
        .map((g) => ({ ...g, ruta: rutasMap.get(g.rutaId) }))
        .filter((g) => rutaActiva === 'all' || g.rutaId === rutaActiva),
    [gastos, rutaActiva, rutasMap],
  );

  const pag = usePaginacion(items, 30);
  const resetPag = pag.reset;
  useEffect(() => {
    resetPag();
  }, [fechaDesde, fechaHasta, rutaActiva, resetPag]);

  const total = items.reduce((s, g) => s + (g.monto ?? 0), 0);
  const porCategoria = useMemo(() => totalesPorCategoria(items), [items]);

  const handleEliminar = async () => {
    try {
      await eliminarGasto(confirmBorrar.id);
      toast.success('Gasto eliminado');
    } catch (err) {
      toast.error('No se pudo eliminar', { description: err.message });
    }
  };

  const exportarCSV = () => {
    if (items.length === 0) {
      toast.error('No hay gastos para exportar');
      return;
    }
    const header = ['Fecha', 'Categoría', 'Ruta', 'Descripción', 'Monto'];
    const rows = items.map((g) => [
      g.fecha,
      categoriaGasto(g.categoria).label,
      g.ruta?.nombre ?? '',
      g.descripcion ?? '',
      g.monto,
    ]);
    const sanitize = (v) => {
      let s = String(v).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s}"`;
    };
    const csv = [header, ...rows].map((r) => r.map(sanitize).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos-${fechaDesde}_a_${fechaHasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV descargado', { description: `${items.length} gastos` });
  };

  const tituloFecha = esRango
    ? `${formatFecha(fechaDesde)} — ${formatFecha(fechaHasta)}`
    : formatFechaLarga(fechaDesde);

  return (
    <div className="space-y-4 sm:space-y-5">
      {(error || loadError) && <ErrorBanner message={error || loadError} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
            Gastos
          </h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">{tituloFecha}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            max={hoy()}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            aria-label="Desde"
          />
          <span className="text-slate-400 text-sm">–</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            max={hoy()}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            aria-label="Hasta"
          />
          <button
            onClick={exportarCSV}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors inline-flex items-center gap-2"
          >
            <FileDown size={15} /> <span className="hidden sm:inline">CSV</span>
          </button>
          {puedeEditar && (
            <button
              onClick={() => setModalGasto({ nuevo: true })}
              className="px-3 sm:px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm transition-all inline-flex items-center gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Nuevo gasto</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Total gastos"
          value={formatMoney(total)}
          icon={TrendingDown}
          accent="#ef4444"
          sublabel={`${items.length} registros`}
        />
        <MetricCard
          label="Promedio"
          value={items.length > 0 ? formatMoney(Math.round(total / items.length)) : formatMoney(0)}
          icon={Calendar}
          accent="#f59e0b"
          sublabel="Por gasto"
        />
        <MetricCard
          label="Categorías"
          value={porCategoria.length}
          icon={Wallet}
          accent="#8b5cf6"
          sublabel="Con movimiento"
        />
      </div>

      {porCategoria.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-card">
          <h3 className="font-bold text-slate-900 mb-3">Por categoría</h3>
          <div className="space-y-2.5">
            {porCategoria.map(({ categoria, monto, cant }) => {
              const pct = total > 0 ? (monto / total) * 100 : 0;
              return (
                <div key={categoria.id}>
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: categoria.color }}
                    />
                    <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
                      {categoria.label}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">{cant}</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums w-24 text-right">
                      {formatMoney(monto)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: categoria.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rutas.length > 1 && (
        <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin gastos"
          description="No hay gastos en el período seleccionado."
          action={
            puedeEditar ? (
              <button
                onClick={() => setModalGasto({ nuevo: true })}
                className="px-5 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm transition-all"
              >
                Registrar primer gasto
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/70 divide-y divide-slate-100 shadow-card overflow-hidden">
            {pag.items.map((g) => {
              const cat = categoriaGasto(g.categoria);
              return (
                <div
                  key={g.id}
                  className="px-3 sm:px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white"
                    style={{ background: cat.color }}
                  >
                    <TrendingDown size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {g.descripcion || cat.label}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {cat.label} · {g.ruta?.nombre ?? 'Sin ruta'} · {formatFecha(g.fecha)}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 text-sm tabular-nums flex-shrink-0">
                    {formatMoney(g.monto)}
                  </div>
                  {puedeEditar && (
                    <ActionMenu
                      actions={[
                        {
                          label: 'Editar',
                          icon: Pencil,
                          onClick: () => setModalGasto({ editar: g }),
                        },
                        {
                          label: 'Eliminar',
                          icon: Trash2,
                          danger: true,
                          onClick: () => setConfirmBorrar(g),
                        },
                      ]}
                    />
                  )}
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

      {modalGasto?.nuevo && <ModalGasto onClose={() => setModalGasto(null)} />}
      {modalGasto?.editar && (
        <ModalGasto onClose={() => setModalGasto(null)} gasto={modalGasto.editar} />
      )}

      {confirmBorrar && (
        <ConfirmDialog
          title="Eliminar gasto"
          message={`Se eliminará el gasto de ${formatMoney(confirmBorrar.monto)}. Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          onConfirm={handleEliminar}
          onClose={() => setConfirmBorrar(null)}
        />
      )}
    </div>
  );
}
