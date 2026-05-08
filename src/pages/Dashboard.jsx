import { useState } from 'react';
import { TrendingUp, Calendar, Wallet, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useMetricas } from '@/hooks/useMetricas';
import MetricCard from '@/components/ui/MetricCard';
import RutaSelector from '@/components/ui/RutaSelector';
import ErrorBanner from '@/components/ui/ErrorBanner';
import BarChart from '@/components/dashboard/BarChart';
import RutaPerformance from '@/components/dashboard/RutaPerformance';
import CuotasHoy from '@/components/dashboard/CuotasHoy';
import Onboarding from '@/components/Onboarding';
import { formatMoney, formatFechaLarga } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';

export default function Dashboard() {
  const { rutas, clientes, prestamos, error, syncing } = useApp();
  const [rutaActiva, setRutaActiva] = useState('all');
  const m = useMetricas(prestamos, clientes, rutas, rutaActiva);

  // Si no hay rutas ni clientes → mostrar onboarding (pero no si hay error, para no ocultarlo)
  if (!syncing && !error && rutas.length === 0 && clientes.length === 0) {
    return <Onboarding />;
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} />}

      {/* Título + filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">Resumen de hoy</h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">{formatFechaLarga(hoy())}</p>
        </div>
        {rutas.length > 0 && (
          <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Cobrado total"
          value={formatMoney(m.cobradoTotal)}
          icon={TrendingUp}
          accent="#10b981"
          sublabel="Acumulado en cartera"
        />
        <MetricCard
          label="A cobrar hoy"
          value={formatMoney(m.aCobrarHoy)}
          icon={Calendar}
          accent="#3b82f6"
          sublabel={`${m.cuotasHoyCant} cuotas vencen hoy`}
        />
        <MetricCard
          label="Capital colocado"
          value={formatMoney(m.colocado)}
          icon={Wallet}
          accent="#8b5cf6"
          sublabel="En préstamos activos"
        />
        <MetricCard
          label="En mora"
          value={formatMoney(m.montoMora)}
          icon={AlertCircle}
          accent="#ef4444"
          sublabel={`${m.enMoraCant} cuotas (${m.tasaMora.toFixed(1)}%)`}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BarChart data={m.evolucion} />
        </div>
        <RutaPerformance porRuta={m.porRuta} />
      </div>

      {/* Cuotas del día */}
      {prestamos.length > 0 && <CuotasHoy rutaActiva={rutaActiva} />}
    </div>
  );
}
