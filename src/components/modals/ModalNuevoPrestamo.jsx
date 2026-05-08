import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { generarCuotas, hoy } from '@/utils/calculos';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useModal } from '@/hooks/useModal';

export default function ModalNuevoPrestamo({ onClose, clienteIdInicial }) {
  const { clientes, rutas, crearPrestamo } = useApp();
  const toast = useToast();
  const [clienteId, setClienteId] = useState(clienteIdInicial ?? '');
  const [monto, setMonto] = useState(100000);
  const [interes, setInteres] = useState(30);
  const [cuotas, setCuotas] = useState(10);
  const [frecuencia, setFrecuencia] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useModal(onClose);

  useEffect(() => {
    if (!clienteId && clientes.length > 0) {
      setClienteId(clientes[0].id);
    }
  }, [clientes, clienteId]);

  const totalConInteres = monto * (1 + interes / 100);
  const valorCuota = Math.round(totalConInteres / cuotas);
  const ganancia = totalConInteres - monto;

  const handleCrear = async () => {
    setError('');
    if (!clienteId) { setError('Seleccioná un cliente'); return; }
    if (monto <= 0) { setError('El capital debe ser mayor a 0'); return; }
    if (cuotas <= 0) { setError('Ingresá al menos 1 cuota'); return; }
    setLoading(true);
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      await crearPrestamo({
        clienteId,
        rutaId: cliente?.rutaId ?? null,
        monto,
        interes,
        cuotas,
        frecuenciaDias: frecuencia,
        fechaInicio: hoy(),
        cuotasDetalle: generarCuotas(monto, interes, cuotas, hoy(), frecuencia),
      });
      toast.success('Préstamo creado', {
        description: `${cliente?.nombre ?? ''} · ${cuotas} cuotas de ${formatMoney(valorCuota)}`,
      });
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('Permisos denegados. Publicá las reglas de Firestore primero.');
      } else {
        setError(err.message ?? 'No se pudo crear el préstamo');
      }
    } finally {
      setLoading(false);
    }
  };

  const sinClientes = clientes.length === 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-popover animate-[pop_0.18s_ease-out]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Nuevo préstamo</h3>
            <p className="text-xs text-slate-500">Calculá las cuotas automáticamente</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        {sinClientes && (
          <div className="p-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Necesitás al menos un cliente</p>
                <p className="text-xs text-amber-700 mt-1">Creá un cliente primero para poder asignarle un préstamo.</p>
              </div>
            </div>
            <button onClick={onClose} className="w-full mt-4 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] shadow-brand-sm transition-all">
              Entendido
            </button>
          </div>
        )}

        {!sinClientes && (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Cliente</label>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white"
              >
                {clientes.map(c => {
                  const ruta = rutas.find(r => r.id === c.rutaId);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · {ruta?.nombre ?? 'Sin ruta'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Capital $</label>
                <input
                  type="number"
                  value={monto}
                  onChange={e => setMonto(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Interés %</label>
                <input
                  type="number"
                  value={interes}
                  onChange={e => setInteres(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Frecuencia</label>
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
                      frecuencia === dias ? 'bg-brand-600 text-white shadow-brand-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Cantidad de cuotas
              </label>
              <input
                type="range" min="2" max="52" value={cuotas}
                onChange={e => setCuotas(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>2</span>
                <span className="font-bold text-slate-900 text-base tabular-nums">{cuotas} cuotas</span>
                <span>52</span>
              </div>
            </div>

            <div className="relative overflow-hidden bg-brand-gradient rounded-2xl p-4 text-white shadow-brand-sm">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="grid grid-cols-2 gap-4 relative">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Cuota</div>
                  <div className="text-2xl font-bold tabular-nums">{formatMoney(valorCuota)}</div>
                  <div className="text-[10px] text-white/60">por período</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Total a cobrar</div>
                  <div className="text-xl font-bold tabular-nums">{formatMoney(Math.round(totalConInteres))}</div>
                  <div className="text-[10px] text-emerald-300 tabular-nums">+{formatMoney(Math.round(ganancia))} ganancia</div>
                </div>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {!sinClientes && (
          <div className="p-5 pt-0 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCrear}
              disabled={loading || !clienteId}
              className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-brand-sm transition-all"
            >
              {loading ? 'Guardando…' : 'Crear préstamo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
