import { useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';
import { consultarBcra, nivelRiesgoBcra, normalizarIdentificacion } from '@/utils/bcra';
import { formatMoney, formatFecha } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';

/**
 * Verificación crediticia en la Central de Deudores del BCRA.
 * Consulta por DNI o CUIT/CUIL y muestra semáforo + detalle por entidad.
 * `bcraGuardado` es el último resultado persistido en el cliente;
 * `onResultado(resumen)` permite guardar el resultado de una consulta nueva.
 */
export default function BcraPanel({ dni, bcraGuardado, onResultado }) {
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const identificacion = normalizarIdentificacion(dni);
  const consultable = identificacion.length >= 7 && identificacion.length <= 11;

  const handleVerificar = async () => {
    setError('');
    setLoading(true);
    try {
      const r = await consultarBcra(identificacion);
      const resumen = {
        fecha: hoy(),
        cuit: r.cuit,
        sinDatos: r.sinDatos,
        denominacion: r.deudas?.denominacion ?? '',
        peorSituacion: r.deudas?.peorSituacion ?? null,
        deudaTotal: r.deudas?.deudaTotal ?? 0,
        tieneJudicial: r.deudas?.tieneJudicial ?? false,
        cantCheques: r.cheques?.cantidad ?? 0,
        entidades: r.deudas?.entidades?.slice(0, 5) ?? [],
      };
      setResultado(resumen);
      onResultado?.(resumen);
    } catch (err) {
      console.error(err);
      setError(
        err.message?.includes('inválido')
          ? err.message
          : navigator.onLine === false
            ? 'Sin conexión a internet. Intentá de nuevo cuando tengas señal.'
            : 'El servicio del BCRA no responde en este momento. Suele restablecerse solo: probá de nuevo en unos minutos.',
      );
    } finally {
      setLoading(false);
    }
  };

  const data = resultado ?? bcraGuardado;

  if (!consultable && !data) return null;

  if (!data) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={handleVerificar}
          disabled={loading}
          className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          <ShieldCheck size={14} />
          {loading ? 'Consultando BCRA…' : 'Verificar deudas en BCRA'}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  const nivel = nivelRiesgoBcra(data.sinDatos ? null : data.peorSituacion);
  const esRiesgo = nivel.nivel === 'riesgo';

  return (
    <div
      className="rounded-xl border p-3 space-y-2 text-xs"
      style={{ borderColor: nivel.color + '55', background: nivel.color + '0d' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: nivel.color }}>
          {esRiesgo ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
          BCRA: {data.sinDatos ? 'sin registros' : nivel.label}
        </span>
        <button
          type="button"
          onClick={handleVerificar}
          disabled={loading}
          aria-label="Actualizar consulta BCRA"
          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {!data.sinDatos && (
        <>
          {data.denominacion && (
            <p className="text-slate-600">
              {data.denominacion} · CUIT {data.cuit}
            </p>
          )}
          {data.deudaTotal > 0 && (
            <p className="text-slate-700">
              Deuda informada: <strong>{formatMoney(data.deudaTotal)}</strong>
            </p>
          )}
          {data.entidades?.length > 0 && (
            <ul className="space-y-0.5 text-slate-500">
              {data.entidades.map((e, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{e.entidad}</span>
                  <span className="flex-shrink-0">
                    sit. {e.situacion}
                    {e.diasAtrasoPago > 0 ? ` · ${e.diasAtrasoPago}d atraso` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(data.tieneJudicial || data.cantCheques > 0) && (
            <p className="flex items-center gap-1.5 font-semibold text-rose-600">
              <AlertTriangle size={13} />
              {data.tieneJudicial ? 'En proceso judicial' : ''}
              {data.tieneJudicial && data.cantCheques > 0 ? ' · ' : ''}
              {data.cantCheques > 0 ? `${data.cantCheques} cheque(s) rechazado(s)` : ''}
            </p>
          )}
        </>
      )}

      <p className="text-[10px] text-slate-400">
        Consultado el {formatFecha(data.fecha)} · Central de Deudores BCRA
      </p>
      {error && <p className="text-rose-600">{error}</p>}
    </div>
  );
}
