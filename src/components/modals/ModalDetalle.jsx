import { useState } from 'react';
import { X, CheckCircle2, Undo2, Wallet, Banknote, FileText } from 'lucide-react';
import { formatMoney, formatFecha } from '@/utils/formatters';
import { diasDeAtraso, frecuenciaPlural } from '@/utils/calculos';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useCobrar } from '@/hooks/useCobrar';
import { useModal } from '@/hooks/useModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ModalPago from '@/components/modals/ModalPago';
import NotasCliente from '@/components/clientes/NotasCliente';

export default function ModalDetalle({ prestamoId, onClose }) {
  const { prestamos, clientes, rutas, revertirCuota } = useApp();
  const toast = useToast();
  const { cobrarCuotaNro } = useCobrar();
  const [confirmRevertir, setConfirmRevertir] = useState(null);
  const [mostrarPago, setMostrarPago] = useState(false);
  useModal(onClose);

  const handleRecibo = async (c) => {
    const { generarRecibo } = await import('@/utils/reciboPdf');
    generarRecibo({
      cliente,
      prestamo,
      cuota: c,
      ruta,
      monto: c.pagado ?? c.monto,
      fecha: c.fechaPago ?? '',
    });
  };

  const prestamo = prestamos.find((p) => p.id === prestamoId);
  if (!prestamo) return null;

  const cliente = clientes.find((c) => c.id === prestamo.clienteId);
  const ruta = rutas.find((r) => r.id === cliente?.rutaId);
  const cuotas = prestamo.cuotasDetalle ?? [];
  const totalPagado = cuotas.reduce((s, c) => s + (c.pagado ?? (c.pagada ? c.monto : 0)), 0);
  const totalDeuda = cuotas.reduce((s, c) => s + c.monto, 0) - totalPagado;
  const hayPendientes = cuotas.some((c) => !c.pagada);

  const handleCobrar = (nro) => cobrarCuotaNro(prestamo.id, nro, cliente?.nombre);

  const handleRevertir = async () => {
    const nro = confirmRevertir;
    try {
      await revertirCuota(prestamo.id, nro);
      toast.info('Cuota revertida', { description: `Cuota ${nro} vuelve a estar pendiente` });
    } catch (err) {
      toast.error('No se pudo revertir', { description: err.message });
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col shadow-popover animate-[pop_0.18s_ease-out]">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: ruta?.color ?? '#64748b' }}
              >
                {cliente?.nombre
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('') ?? '?'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{cliente?.nombre}</h3>
                <p className="text-xs text-slate-500">
                  {cliente?.dni ? `DNI ${cliente.dni} · ` : ''}
                  {ruta?.nombre ?? 'Sin ruta'} · {prestamo.cuotas} cuotas{' '}
                  {frecuenciaPlural(prestamo.frecuenciaDias)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 p-5 bg-gradient-to-br from-slate-50 to-brand-50/30 flex-shrink-0 border-b border-slate-100">
            {[
              { label: 'Capital', value: formatMoney(prestamo.monto), color: 'text-slate-900' },
              { label: 'Cobrado', value: formatMoney(totalPagado), color: 'text-emerald-700' },
              { label: 'Pendiente', value: formatMoney(totalDeuda), color: 'text-rose-700' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {label}
                </div>
                <div className={`text-base sm:text-lg font-bold tabular-nums ${color} truncate`}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {hayPendientes && (
            <div className="px-5 py-3 border-b border-slate-100 bg-white flex-shrink-0">
              <button
                onClick={() => setMostrarPago(true)}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 active:scale-[0.99] shadow-emerald/40 transition-all inline-flex items-center justify-center gap-2"
              >
                <Wallet size={16} /> Cobrar monto
              </button>
            </div>
          )}

          <div className="flex-1 overflow-auto p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Cronograma
            </div>
            <div className="space-y-2">
              {cuotas.map((c) => {
                const atraso = diasDeAtraso(c);
                const pagado = c.pagado ?? (c.pagada ? c.monto : 0);
                const parcial = !c.pagada && pagado > 0;
                return (
                  <div
                    key={c.nro}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      c.pagada
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : parcial
                          ? 'bg-amber-50/50 border-amber-200'
                          : atraso > 0
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        c.pagada
                          ? 'bg-emerald-500 text-white'
                          : parcial
                            ? 'bg-amber-500 text-white'
                            : atraso > 0
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.pagada ? <CheckCircle2 size={14} /> : c.nro}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Cuota {c.nro}</div>
                      <div className="text-xs text-slate-500">
                        {c.pagada
                          ? `Pagada el ${formatFecha(c.fechaPago)}`
                          : parcial
                            ? `Parcial: ${formatMoney(pagado)} / ${formatMoney(c.monto)}`
                            : `Vence ${formatFecha(c.vencimiento)}`}
                        {atraso > 0 && !c.pagada && (
                          <span className="text-rose-600 font-semibold ml-2">· {atraso}d mora</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 flex-shrink-0 tabular-nums">
                      {formatMoney(c.monto)}
                    </div>
                    {c.pagada ? (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleRecibo(c)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
                          title="Descargar recibo"
                          aria-label="Descargar recibo"
                        >
                          <FileText size={12} />
                        </button>
                        <button
                          onClick={() => setConfirmRevertir(c.nro)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
                          title="Revertir cobro"
                        >
                          <Undo2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCobrar(c.nro)}
                        className="flex-shrink-0 px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 transition-all inline-flex items-center gap-1"
                      >
                        <Banknote size={12} /> Cobrar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100">
              <NotasCliente clienteId={prestamo.clienteId} />
            </div>
          </div>
        </div>
      </div>

      {confirmRevertir !== null && (
        <ConfirmDialog
          title={`Revertir cuota ${confirmRevertir}`}
          message="Se marcará como pendiente y se eliminará el movimiento registrado. ¿Confirmás?"
          confirmText="Revertir"
          variant="warn"
          onConfirm={handleRevertir}
          onClose={() => setConfirmRevertir(null)}
        />
      )}

      {mostrarPago && <ModalPago prestamoId={prestamoId} onClose={() => setMostrarPago(false)} />}
    </>
  );
}
