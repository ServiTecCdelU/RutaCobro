import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Receipt,
  TrendingUp,
  Users as UsersIcon,
  Calendar,
  Undo2,
  FileDown,
  FileText,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney, formatFechaLarga, formatFecha } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';
import { subscribeMovimientosPorRango } from '@/firebase/services';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import MetricCard from '@/components/ui/MetricCard';
import RutaSelector from '@/components/ui/RutaSelector';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePaginacion } from '@/hooks/usePaginacion';
import Paginacion from '@/components/ui/Paginacion';

export default function Movimientos() {
  const { user, clientes, rutas, prestamos, revertirCuota, error } = useApp();
  const toast = useToast();

  const [fechaDesde, setFechaDesde] = useState(hoy());
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [rutaActiva, setRutaActiva] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [confirmRevertir, setConfirmRevertir] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  const esRango = fechaDesde !== fechaHasta;

  useEffect(() => {
    if (!user) return;
    setLoadError(null);
    const [desde, hasta] =
      fechaDesde <= fechaHasta ? [fechaDesde, fechaHasta] : [fechaHasta, fechaDesde];
    const unsub = subscribeMovimientosPorRango(desde, hasta, setMovimientos, (err) =>
      setLoadError(err.message ?? 'Error cargando movimientos'),
    );
    return unsub;
  }, [user, fechaDesde, fechaHasta]);

  const clientesMap = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const rutasMap = useMemo(() => new Map(rutas.map((r) => [r.id, r])), [rutas]);
  const prestamosMap = useMemo(() => new Map(prestamos.map((p) => [p.id, p])), [prestamos]);

  const items = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return movimientos
      .map((m) => {
        const cliente = clientesMap.get(m.clienteId);
        const ruta = cliente ? rutasMap.get(cliente.rutaId) : null;
        return { ...m, cliente, ruta };
      })
      .filter((m) => rutaActiva === 'all' || m.cliente?.rutaId === rutaActiva)
      .filter((m) => !q || m.cliente?.nombre.toLowerCase().includes(q));
  }, [movimientos, rutaActiva, busqueda, clientesMap, rutasMap]);

  const pag = usePaginacion(items, 30);
  const resetPag = pag.reset;

  useEffect(() => {
    resetPag();
  }, [fechaDesde, fechaHasta, rutaActiva, busqueda, resetPag]);

  const totalPeriodo = items.reduce((s, m) => s + m.monto, 0);
  const clientesDistintos = new Set(items.map((m) => m.clienteId)).size;

  const porRuta = useMemo(() => {
    const map = new Map();
    items.forEach((m) => {
      const key = m.ruta?.id ?? '—';
      const acc = map.get(key) ?? { ruta: m.ruta, monto: 0, cobros: 0 };
      acc.monto += m.monto;
      acc.cobros += 1;
      map.set(key, acc);
    });
    return [...map.values()].sort((a, b) => b.monto - a.monto);
  }, [items]);

  const handleRevertir = async () => {
    const m = confirmRevertir;
    try {
      await revertirCuota(m.prestamoId, m.cuotaNro);
      toast.info('Cobro revertido', {
        description: `${m.cliente?.nombre ?? 'Cliente'} · Cuota ${m.cuotaNro}`,
      });
    } catch (err) {
      toast.error('No se pudo revertir', { description: err.message });
    }
  };

  const nombreArchivo = esRango
    ? `movimientos-${fechaDesde}_a_${fechaHasta}`
    : `movimientos-${fechaDesde}`;

  const exportarCSV = () => {
    if (items.length === 0) {
      toast.error('No hay movimientos para exportar');
      return;
    }
    const header = ['Fecha', 'Cliente', 'DNI', 'Ruta', 'Cuota', 'Monto'];
    const rows = items.map((m) => [
      m.fecha,
      m.cliente?.nombre ?? '',
      m.cliente?.dni ?? '',
      m.ruta?.nombre ?? '',
      m.cuotaNro,
      m.monto,
    ]);
    const sanitize = (v) => {
      let s = String(v).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s}"`;
    };
    const csv = [header, ...rows].map((r) => r.map(sanitize).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV descargado', { description: `${items.length} movimientos` });
  };

  const exportarPDF = async () => {
    if (items.length === 0) {
      toast.error('No hay movimientos para exportar');
      return;
    }
    setExportandoPDF(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('RutaCobro — Reporte de movimientos', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100);
      const subtitulo = esRango
        ? `Período: ${formatFecha(fechaDesde)} a ${formatFecha(fechaHasta)}`
        : `Fecha: ${formatFechaLarga(fechaDesde)}`;
      doc.text(subtitulo, 14, 25);
      doc.text(
        `Cobros: ${items.length} · Total: ${formatMoney(totalPeriodo)} · Clientes: ${clientesDistintos}`,
        14,
        31,
      );

      autoTable(doc, {
        startY: 38,
        head: [['Fecha', 'Cliente', 'DNI', 'Ruta', 'Cuota', 'Monto']],
        body: items.map((m) => [
          formatFecha(m.fecha),
          m.cliente?.nombre ?? '—',
          m.cliente?.dni ?? '',
          m.ruta?.nombre ?? '—',
          String(m.cuotaNro),
          formatMoney(m.monto),
        ]),
        foot: [['', '', '', '', 'Total', formatMoney(totalPeriodo)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      });

      doc.save(`${nombreArchivo}.pdf`);
      toast.success('PDF descargado', { description: `${items.length} movimientos` });
    } catch (err) {
      console.error('[pdf]', err);
      toast.error('No se pudo generar el PDF', { description: err.message });
    } finally {
      setExportandoPDF(false);
    }
  };

  const setHoy = () => {
    const h = hoy();
    setFechaDesde(h);
    setFechaHasta(h);
  };

  const tituloFecha = esRango
    ? `${formatFecha(fechaDesde)} — ${formatFecha(fechaHasta)}`
    : formatFechaLarga(fechaDesde);

  return (
    <div className="space-y-4 sm:space-y-5">
      {(error || loadError) && <ErrorBanner message={error || loadError} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
            {esRango ? 'Movimientos' : 'Caja del día'}
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
            onClick={setHoy}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:border-slate-300 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={exportarCSV}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors inline-flex items-center gap-2"
          >
            <FileDown size={15} /> <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={exportarPDF}
            disabled={exportandoPDF}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            <FileText size={15} />{' '}
            <span className="hidden sm:inline">{exportandoPDF ? 'Generando…' : 'PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Cobrado"
          value={formatMoney(totalPeriodo)}
          icon={TrendingUp}
          accent="#10b981"
          sublabel={`${items.length} cobros`}
        />
        <MetricCard
          label="Clientes"
          value={clientesDistintos}
          icon={UsersIcon}
          accent="#3b82f6"
          sublabel={esRango ? 'En el período' : 'Cobrados en el día'}
        />
        <MetricCard
          label="Promedio"
          value={
            items.length > 0 ? formatMoney(Math.round(totalPeriodo / items.length)) : formatMoney(0)
          }
          icon={Calendar}
          accent="#8b5cf6"
          sublabel="Por cobro"
        />
      </div>

      {porRuta.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
          <h3 className="font-bold text-slate-900 mb-3">Por ruta</h3>
          <div className="space-y-2">
            {porRuta.map(({ ruta, monto, cobros }) => (
              <div key={ruta?.id ?? '—'} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: ruta?.color ?? '#94a3b8' }}
                />
                <span className="flex-1 text-sm font-semibold text-slate-700">
                  {ruta?.nombre ?? 'Sin ruta'}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">{cobros} cobros</span>
                <span className="text-sm font-bold text-slate-900 w-28 text-right tabular-nums">
                  {formatMoney(monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
        </div>
      </div>

      {rutas.length > 1 && (
        <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin cobros"
          description={
            esRango
              ? 'No hubo cobros en el período seleccionado.'
              : fechaDesde === hoy()
                ? 'Hoy todavía no hay movimientos.'
                : 'No hubo cobros en esa fecha.'
          }
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/70 divide-y divide-slate-100 shadow-card overflow-hidden">
            {pag.items.map((m) => {
              const prestamo = prestamosMap.get(m.prestamoId);
              return (
                <div
                  key={m.id}
                  className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5 sm:gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-sm"
                    style={{ background: m.ruta?.color ?? '#64748b' }}
                  >
                    {m.cliente?.nombre
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('') ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate flex items-center gap-2">
                      <span className="truncate">{m.cliente?.nombre ?? 'Cliente eliminado'}</span>
                      {m.tipo === 'pago-monto' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
                          Parcial
                        </span>
                      )}
                      {m.tipo === 'punitorio' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 flex-shrink-0">
                          Punitorio
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      Cuota {m.cuotaNro}
                      {prestamo ? `/${prestamo.cuotas}` : ''} · {m.ruta?.nombre ?? 'Sin ruta'} ·{' '}
                      {formatFecha(m.fecha)}
                      {m.autorEmail ? ` · ${m.autorEmail}` : ''}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-slate-900 text-sm tabular-nums">
                      {formatMoney(m.monto)}
                    </div>
                  </div>
                  {prestamo && (
                    <button
                      onClick={() => setConfirmRevertir(m)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center transition-colors"
                      title="Revertir cobro"
                      aria-label="Revertir cobro"
                    >
                      <Undo2 size={14} />
                    </button>
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

      {confirmRevertir && (
        <ConfirmDialog
          title="Revertir cobro"
          message={`Se marcará como pendiente la cuota ${confirmRevertir.cuotaNro} de ${confirmRevertir.cliente?.nombre ?? 'este cliente'} y se eliminará el movimiento. ¿Confirmás?`}
          confirmText="Revertir"
          variant="warn"
          onConfirm={handleRevertir}
          onClose={() => setConfirmRevertir(null)}
        />
      )}
    </div>
  );
}
