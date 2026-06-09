import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Banknote, FileText, HandCoins } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney, formatFecha, formatFechaLarga } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';
import { construirCierre } from '@/utils/cierre';
import { subscribeMovimientosPorRango, subscribeGastosPorRango } from '@/firebase/services';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import MetricCard from '@/components/ui/MetricCard';

function Linea({ label, value, color = 'text-slate-900 dark:text-slate-100' }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export default function Cierre() {
  const { user, clientes, rutas, prestamos, error } = useApp();
  const toast = useToast();

  const [fechaDesde, setFechaDesde] = useState(hoy());
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [movimientos, setMovimientos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  const esRango = fechaDesde !== fechaHasta;
  const [desde, hasta] =
    fechaDesde <= fechaHasta ? [fechaDesde, fechaHasta] : [fechaHasta, fechaDesde];

  useEffect(() => {
    if (!user) return;
    setLoadError(null);
    const unsub = subscribeMovimientosPorRango(desde, hasta, setMovimientos, (err) =>
      setLoadError(err.message ?? 'Error cargando movimientos'),
    );
    return unsub;
  }, [user, desde, hasta]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeGastosPorRango(desde, hasta, setGastos, (err) =>
      setLoadError(err.message ?? 'Error cargando gastos'),
    );
    return unsub;
  }, [user, desde, hasta]);

  const { porRuta, totales } = useMemo(
    () => construirCierre({ movimientos, gastos, prestamos, clientes, rutas, desde, hasta }),
    [movimientos, gastos, prestamos, clientes, rutas, desde, hasta],
  );

  const conActividad = porRuta.filter((r) => r.cobrado > 0 || r.gastos > 0 || r.prestado > 0);

  const setHoy = () => {
    const h = hoy();
    setFechaDesde(h);
    setFechaHasta(h);
  };

  const tituloFecha = esRango
    ? `${formatFecha(desde)} — ${formatFecha(hasta)}`
    : formatFechaLarga(desde);

  const exportarPDF = async () => {
    if (porRuta.length === 0) {
      toast.error('No hay datos para exportar');
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
      doc.text('RutaCobro — Rendición de caja', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        esRango
          ? `Período: ${formatFecha(desde)} a ${formatFecha(hasta)}`
          : `Fecha: ${formatFechaLarga(desde)}`,
        14,
        25,
      );
      doc.text(
        `Cobrado: ${formatMoney(totales.cobrado)} · Gastos: ${formatMoney(totales.gastos)} · Neto a rendir: ${formatMoney(totales.neto)}`,
        14,
        31,
      );

      autoTable(doc, {
        startY: 38,
        head: [['Ruta', 'Cobros', 'Cobrado', 'Gastos', 'Prestado', 'Neto a rendir']],
        body: porRuta.map((r) => [
          r.ruta?.nombre ?? 'Sin ruta',
          String(r.cobros),
          formatMoney(r.cobrado),
          formatMoney(r.gastos),
          formatMoney(r.prestado),
          formatMoney(r.neto),
        ]),
        foot: [
          [
            'Total',
            String(totales.cobros),
            formatMoney(totales.cobrado),
            formatMoney(totales.gastos),
            formatMoney(totales.prestado),
            formatMoney(totales.neto),
          ],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      });

      doc.save(`rendicion-${esRango ? `${desde}_a_${hasta}` : desde}.pdf`);
      toast.success('PDF descargado');
    } catch (err) {
      console.error('[pdf]', err);
      toast.error('No se pudo generar el PDF', { description: err.message });
    } finally {
      setExportandoPDF(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {(error || loadError) && <ErrorBanner message={error || loadError} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-display">
            Cierre de caja
          </h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">{tituloFecha}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            max={hoy()}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all dark:bg-slate-800 dark:border-slate-700"
            aria-label="Desde"
          />
          <span className="text-slate-400 text-sm">–</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            max={hoy()}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all dark:bg-slate-800 dark:border-slate-700"
            aria-label="Hasta"
          />
          <button
            onClick={setHoy}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:border-slate-300 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
          >
            Hoy
          </button>
          <button
            onClick={exportarPDF}
            disabled={exportandoPDF}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors inline-flex items-center gap-2 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          >
            <FileText size={15} />{' '}
            <span className="hidden sm:inline">{exportandoPDF ? 'Generando…' : 'PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Cobrado"
          value={formatMoney(totales.cobrado)}
          icon={TrendingUp}
          accent="#10b981"
          sublabel={`${totales.cobros} cobros`}
        />
        <MetricCard
          label="Gastos"
          value={formatMoney(totales.gastos)}
          icon={TrendingDown}
          accent="#f43f5e"
        />
        <MetricCard
          label="Prestado"
          value={formatMoney(totales.prestado)}
          icon={Banknote}
          accent="#8b5cf6"
          sublabel="Capital colocado"
        />
        <MetricCard
          label="Neto a rendir"
          value={formatMoney(totales.neto)}
          icon={Wallet}
          accent="#3b82f6"
          sublabel="Cobrado − gastos − prestado"
        />
      </div>

      {conActividad.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Sin movimientos"
          description="No hubo cobros, gastos ni préstamos en este período."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {porRuta.map((r) => (
            <div
              key={r.ruta?.id ?? 'sin'}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 p-4 shadow-card"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: r.ruta?.color ?? '#94a3b8' }}
                />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 flex-1 truncate">
                  {r.ruta?.nombre ?? 'Sin ruta'}
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {r.cobros} cobros · {r.clientes} clientes
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Linea label="Cobrado" value={formatMoney(r.cobrado)} color="text-emerald-600" />
                <Linea label="Gastos" value={formatMoney(r.gastos)} color="text-rose-600" />
                <Linea label="Prestado" value={formatMoney(r.prestado)} color="text-violet-600" />
                <Linea
                  label="A rendir"
                  value={formatMoney(r.neto)}
                  color={r.neto < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
