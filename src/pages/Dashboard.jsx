import { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Wallet,
  AlertCircle,
  Users,
  PiggyBank,
  FileCheck,
  Landmark,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useMetricas } from '@/hooks/useMetricas';
import MetricCard from '@/components/ui/MetricCard';
import RutaSelector from '@/components/ui/RutaSelector';
import ErrorBanner from '@/components/ui/ErrorBanner';
import BarChart from '@/components/dashboard/BarChart';
import MoraChart from '@/components/dashboard/MoraChart';
import RutaPerformance from '@/components/dashboard/RutaPerformance';
import CuotasHoy from '@/components/dashboard/CuotasHoy';
import Onboarding from '@/components/Onboarding';
import { formatMoney, formatFechaLarga } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';

export default function Dashboard() {
  const { rutas, clientes, prestamos, tenantConfig, esCobrador, userDoc, error, syncing } =
    useApp();
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
            Resumen de hoy
          </h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">{formatFechaLarga(hoy())}</p>
        </div>
        {rutas.length > 0 && (
          <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
        )}
      </div>

      {/* Capital del cobrador */}
      {esCobrador &&
        userDoc?.montoAsignado > 0 &&
        (() => {
          const miRuta = rutas[0];
          const capitalEnCalle = prestamos
            .filter((p) => p.estado === 'activo')
            .reduce((sum, p) => sum + (p.monto ?? 0), 0);
          const disponible = userDoc.montoAsignado - capitalEnCalle;
          return (
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Mi capital"
                value={formatMoney(userDoc.montoAsignado)}
                icon={Landmark}
                accent="#0f172a"
                sublabel={miRuta ? `Ruta: ${miRuta.nombre}` : 'Sin ruta'}
              />
              <MetricCard
                label="En calle"
                value={formatMoney(capitalEnCalle)}
                icon={Wallet}
                accent="#8b5cf6"
                sublabel={`${prestamos.filter((p) => p.estado === 'activo').length} préstamos`}
              />
              <MetricCard
                label="Disponible"
                value={formatMoney(disponible)}
                icon={PiggyBank}
                accent={disponible < 0 ? '#ef4444' : '#10b981'}
                sublabel="Para prestar"
              />
            </div>
          );
        })()}

      {/* Capital general */}
      {!esCobrador && tenantConfig?.capitalTotal > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Capital inicial"
            value={formatMoney(tenantConfig.capitalTotal)}
            icon={Landmark}
            accent="#0f172a"
            sublabel="Fondo total invertido"
          />
          <MetricCard
            label="En calle"
            value={formatMoney(m.colocado)}
            icon={Wallet}
            accent="#8b5cf6"
            sublabel={`${m.prestamosActivos} préstamos activos`}
          />
          <MetricCard
            label="Disponible"
            value={formatMoney(tenantConfig.capitalTotal - m.colocado)}
            icon={PiggyBank}
            accent="#10b981"
            sublabel="Para nuevos préstamos"
          />
        </div>
      )}

      {/* Métricas principales */}
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

      {/* Métricas secundarias */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Ganancia estimada"
          value={formatMoney(m.gananciaEstimada)}
          icon={PiggyBank}
          accent="#f59e0b"
          sublabel="Interés total generado"
        />
        <MetricCard
          label="Clientes activos"
          value={m.clientesActivos}
          icon={Users}
          accent="#06b6d4"
          sublabel={`${m.prestamosActivos} préstamos vigentes`}
        />
        <MetricCard
          label="Finalizados"
          value={m.prestamosFinalizados}
          icon={FileCheck}
          accent="#22c55e"
          sublabel="Préstamos completados"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BarChart data={m.evolucion} />
        </div>
        <RutaPerformance porRuta={m.porRuta} />
      </div>

      {/* Tendencia de mora */}
      <MoraChart data={m.moraPorDia} />

      {/* Cuotas del día */}
      {prestamos.length > 0 && <CuotasHoy rutaActiva={rutaActiva} />}
    </div>
  );
}
