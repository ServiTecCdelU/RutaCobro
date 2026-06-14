import { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Wallet,
  AlertCircle,
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
import RutaPerformance from '@/components/dashboard/RutaPerformance';
import CuotasHoy from '@/components/dashboard/CuotasHoy';
import CotizacionDolar from '@/components/dashboard/CotizacionDolar';
import ProyeccionCaja from '@/components/dashboard/ProyeccionCaja';
import Onboarding from '@/components/Onboarding';
import { formatMoney, formatFechaLarga } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';

export default function Dashboard() {
  const { rutas, clientes, prestamos, gastos, tenantConfig, esCobrador, userDoc, error, syncing } =
    useApp();
  const [rutaActiva, setRutaActiva] = useState('all');
  const m = useMetricas(prestamos, clientes, rutas, rutaActiva);

  const gastosTotal = (gastos ?? [])
    .filter((g) => rutaActiva === 'all' || g.rutaId === rutaActiva)
    .reduce((s, g) => s + (g.monto ?? 0), 0);
  const resultadoNeto = m.gananciaRealizada - gastosTotal;

  // Caja real (flujo de efectivo): capital aportado + todo lo cobrado − todo lo
  // prestado − gastos. A diferencia de "capital − en calle", esta fórmula no se
  // rompe al reinvertir ganancias en nuevos préstamos (el dinero ya cobrado vuelve
  // a estar disponible y la ganancia reinvertida no aparece como saldo negativo).
  const cajaDisponible =
    (tenantConfig?.capitalTotal ?? 0) + m.cobradoTotal - m.colocadoHistorico - gastosTotal;

  // Si no hay rutas ni clientes → mostrar onboarding (pero no si hay error, para no ocultarlo)
  if (!syncing && !error && rutas.length === 0 && clientes.length === 0) {
    return <Onboarding />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
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
          // Caja real: capital asignado + cobrado − colocado histórico − gastos.
          // No queda negativo al reinvertir ganancias en nuevos préstamos.
          const disponible =
            userDoc.montoAsignado + m.cobradoTotal - m.colocadoHistorico - gastosTotal;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            value={formatMoney(cajaDisponible)}
            icon={PiggyBank}
            accent={cajaDisponible < 0 ? '#ef4444' : '#10b981'}
            sublabel="Caja para nuevos préstamos"
          />
        </div>
      )}

      {/* Cotización del dólar (valor real de la cartera) */}
      {!esCobrador && <CotizacionDolar pesos={m.colocado} />}

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Ganancia realizada"
          value={formatMoney(m.gananciaRealizada)}
          icon={PiggyBank}
          accent="#f59e0b"
          sublabel="Interés ya cobrado"
        />
        <MetricCard
          label="Ganancia proyectada"
          value={formatMoney(m.gananciaProyectada)}
          icon={TrendingUp}
          accent="#eab308"
          sublabel={`ROI ${m.roi.toFixed(1)}% sobre capital`}
        />
        <MetricCard
          label="Capital recuperado"
          value={formatMoney(m.capitalRecuperado)}
          icon={Landmark}
          accent="#06b6d4"
          sublabel={`${m.clientesActivos} clientes activos`}
        />
        <MetricCard
          label="Finalizados"
          value={m.prestamosFinalizados}
          icon={FileCheck}
          accent="#22c55e"
          sublabel={`${m.prestamosActivos} vigentes · ${m.prestamosMora} en mora`}
        />
      </div>

      {/* Proyección y mora por antigüedad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MetricCard
          label="A cobrar próximos 7 días"
          value={formatMoney(m.proyeccion7dias)}
          icon={Calendar}
          accent="#3b82f6"
          sublabel="Cuotas que vencen esta semana"
        />
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/70 p-5 shadow-card">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Mora por antigüedad
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['1–7 días', m.moraBuckets.b1_7, '#f59e0b'],
              ['8–30 días', m.moraBuckets.b8_30, '#f97316'],
              ['+30 días', m.moraBuckets.b30plus, '#ef4444'],
            ].map(([label, bucket, color]) => (
              <div key={label} className="min-w-0">
                <div className="text-base font-bold text-slate-900 tabular-nums truncate">
                  {formatMoney(bucket.monto)}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[11px] text-slate-500 truncate">
                    {label} · {bucket.cant}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resultado neto = ganancia cobrada − gastos */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-5 shadow-card">
        <div
          className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-40"
          style={{ background: resultadoNeto >= 0 ? '#10b981' : '#ef4444' }}
        />
        <div className="relative grid grid-cols-3 gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Ganancia cobrada
            </div>
            <div className="text-base sm:text-2xl font-bold tabular-nums truncate text-emerald-300">
              {formatMoney(m.gananciaRealizada)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Gastos
            </div>
            <div className="text-base sm:text-2xl font-bold tabular-nums truncate text-rose-300">
              −{formatMoney(gastosTotal)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Resultado neto
            </div>
            <div
              className={`text-base sm:text-2xl font-bold tabular-nums truncate ${
                resultadoNeto >= 0 ? 'text-white' : 'text-rose-300'
              }`}
            >
              {formatMoney(resultadoNeto)}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BarChart data={m.evolucion} />
        </div>
        <RutaPerformance porRuta={m.porRuta} />
      </div>

      {/* Proyección de cobranza */}
      {prestamos.length > 0 && (
        <ProyeccionCaja prestamos={prestamos} clientes={clientes} rutaActiva={rutaActiva} />
      )}

      {/* Cuotas del día */}
      {prestamos.length > 0 && <CuotasHoy rutaActiva={rutaActiva} />}
    </div>
  );
}
