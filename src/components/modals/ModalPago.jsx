import { useMemo, useState } from 'react';
import { X, Wallet, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useModal } from '@/hooks/useModal';

export default function ModalPago({ prestamoId, onClose }) {
  const { prestamos, clientes, pagarMonto } = useApp();
  const toast = useToast();
  useModal(onClose);

  const prestamo = prestamos.find((p) => p.id === prestamoId);
  const cliente = clientes.find((c) => c.id === prestamo?.clienteId);

  const pendientes = useMemo(() => {
    const cuotas = prestamo?.cuotasDetalle ?? [];
    return cuotas
      .filter((c) => !c.pagada)
      .map((c) => ({ ...c, pagado: c.pagado ?? 0, falta: c.monto - (c.pagado ?? 0) }));
  }, [prestamo]);
  const totalPendiente = pendientes.reduce((s, c) => s + c.falta, 0);
  const sugerencia = pendientes[0]?.falta ?? 0;

  const [monto, setMonto] = useState(() => sugerencia);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const preview = useMemo(() => {
    let restante = Number(monto) || 0;
    const afectadas = [];
    for (const c of pendientes) {
      if (restante <= 0) break;
      const aplicar = Math.min(restante, c.falta);
      afectadas.push({ nro: c.nro, monto: c.monto, aplicar, completa: aplicar === c.falta });
      restante -= aplicar;
    }
    return { afectadas, sobrante: restante };
  }, [monto, pendientes]);

  if (!prestamo) return null;

  const handlePagar = async () => {
    setError('');
    const m = Number(monto);
    if (!Number.isFinite(m) || m <= 0) {
      setError('Ingresá un monto válido mayor a 0');
      return;
    }
    if (m > totalPendiente) {
      setError(`Supera la deuda pendiente (${formatMoney(totalPendiente)})`);
      return;
    }
    setLoading(true);
    try {
      const res = await pagarMonto(prestamoId, m);
      const cant = res.cuotasAfectadas.length;
      const completas = res.cuotasAfectadas.filter((a) => a.completada).length;
      toast.success(res.finalizado ? '¡Préstamo finalizado!' : 'Pago registrado', {
        description: `${cliente?.nombre ?? ''} · ${formatMoney(m)} · ${completas}/${cant} cuotas completadas`,
      });
      onClose();
    } catch (err) {
      setError(err.message ?? 'No se pudo registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-popover animate-[pop_0.18s_ease-out]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Cobrar monto</h3>
            <p className="text-xs text-slate-500">
              {cliente?.nombre} · pendiente {formatMoney(totalPendiente)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Monto recibido
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                $
              </span>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-lg font-bold tabular-nums focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              {[sugerencia, sugerencia * 2, sugerencia * 3, totalPendiente]
                .filter((v, i, arr) => v > 0 && v <= totalPendiente && arr.indexOf(v) === i)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMonto(v)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                  >
                    {formatMoney(v)}
                    {v === totalPendiente ? ' (total)' : ''}
                  </button>
                ))}
            </div>
          </div>

          {preview.afectadas.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Se aplicará a {preview.afectadas.length} cuota
                {preview.afectadas.length === 1 ? '' : 's'}
              </p>
              <div className="space-y-1.5">
                {preview.afectadas.map((a) => (
                  <div key={a.nro} className="flex items-center gap-2 text-sm">
                    {a.completa ? (
                      <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Wallet size={14} className="text-amber-600 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-slate-700">
                      Cuota {a.nro} {a.completa ? '(completa)' : '(parcial)'}
                    </span>
                    <span className="font-semibold text-slate-900">{formatMoney(a.aplicar)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handlePagar}
            disabled={loading || !(Number(monto) > 0)}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-50 shadow-emerald/40 transition-all tabular-nums"
          >
            {loading ? 'Registrando…' : `Cobrar ${formatMoney(Number(monto) || 0)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
