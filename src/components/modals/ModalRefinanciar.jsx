import { useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { calcularSaldo } from '@/utils/refinanciacion';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useModal } from '@/hooks/useModal';

export default function ModalRefinanciar({ prestamo, cliente, onClose, onDone }) {
  const { refinanciarPrestamo } = useApp();
  const toast = useToast();
  useModal(onClose);

  const saldo = calcularSaldo(prestamo);
  const [interes, setInteres] = useState(prestamo?.interes ?? 30);
  const [cuotas, setCuotas] = useState(10);
  const [frecuencia, setFrecuencia] = useState(prestamo?.frecuenciaDias ?? 7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nuevoTotal = Math.round(saldo * (1 + interes / 100));
  const valorCuota = cuotas > 0 ? Math.round(nuevoTotal / cuotas) : 0;
  const ganancia = nuevoTotal - saldo;

  const handleConfirmar = async () => {
    setError('');
    if (!(saldo > 0)) {
      setError('Este préstamo no tiene saldo para refinanciar');
      return;
    }
    if (interes < 0 || interes > 200) {
      setError('El interés debe estar entre 0 y 200%');
      return;
    }
    if (cuotas < 1 || cuotas > 520) {
      setError('La cantidad de cuotas debe estar entre 1 y 520');
      return;
    }
    setLoading(true);
    try {
      await refinanciarPrestamo(prestamo.id, { interes, cuotas, frecuenciaDias: frecuencia });
      toast.success('Préstamo refinanciado', {
        description: `Saldo ${formatMoney(saldo)} → ${cuotas} cuotas de ${formatMoney(valorCuota)}`,
      });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message ?? 'No se pudo refinanciar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-popover animate-[pop_0.18s_ease-out]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <RefreshCw size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Refinanciar préstamo</h3>
              <p className="text-xs text-slate-500">{cliente?.nombre}</p>
            </div>
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
          <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200">
            <AlertCircle size={20} className="text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-violet-900">
              Se reemplazan las cuotas impagas por un cronograma nuevo sobre el{' '}
              <span className="font-bold">saldo pendiente de {formatMoney(saldo)}</span>. Lo ya
              cobrado se conserva. No se mueve dinero de caja.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Nuevo interés %
              </label>
              <input
                type="number"
                value={interes}
                onChange={(e) => setInteres(Number(e.target.value))}
                min="0"
                max="200"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Cuotas
              </label>
              <input
                type="number"
                value={cuotas}
                onChange={(e) => setCuotas(Number(e.target.value))}
                min="1"
                max="520"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Frecuencia
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                ['Diaria', 1],
                ['Semanal', 7],
                ['Quincenal', 15],
                ['Mensual', 30],
              ].map(([label, dias]) => (
                <button
                  key={dias}
                  type="button"
                  onClick={() => setFrecuencia(dias)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    frecuencia === dias
                      ? 'bg-brand-600 text-white shadow-brand-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden bg-brand-gradient rounded-2xl p-4 text-white shadow-brand-sm">
            <div className="grid grid-cols-2 gap-4 relative">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Nueva cuota
                </div>
                <div className="text-2xl font-bold tabular-nums">{formatMoney(valorCuota)}</div>
                <div className="text-[10px] text-white/60">por período</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Nuevo total
                </div>
                <div className="text-xl font-bold tabular-nums">{formatMoney(nuevoTotal)}</div>
                <div className="text-[10px] text-emerald-300 tabular-nums">
                  +{formatMoney(ganancia)} interés
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading || !(saldo > 0)}
            className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-brand-sm transition-all"
          >
            {loading ? 'Procesando…' : 'Refinanciar'}
          </button>
        </div>
      </div>
    </div>
  );
}
