import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useModal } from '@/hooks/useModal';
import { formatMoney } from '@/utils/formatters';
import { hoy } from '@/utils/calculos';
import { CATEGORIAS_GASTO } from '@/utils/gastos';

export default function ModalGasto({ onClose, gasto }) {
  const { rutas, crearGasto, actualizarGasto, user, esCobrador, rutaIdAsignada } = useApp();
  const toast = useToast();
  useModal(onClose);

  const editando = Boolean(gasto);
  const rutaInicial = gasto?.rutaId ?? (esCobrador ? rutaIdAsignada : (rutas[0]?.id ?? ''));

  const [monto, setMonto] = useState(gasto?.monto ?? '');
  const [categoria, setCategoria] = useState(gasto?.categoria ?? CATEGORIAS_GASTO[0].id);
  const [rutaId, setRutaId] = useState(rutaInicial);
  const [fecha, setFecha] = useState(gasto?.fecha ?? hoy());
  const [descripcion, setDescripcion] = useState(gasto?.descripcion ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rutaBloqueada = esCobrador && Boolean(rutaIdAsignada);

  const handleGuardar = async () => {
    setError('');
    const montoNum = Number(monto);
    if (!(montoNum > 0)) {
      setError('Ingresá un monto mayor a 0');
      return;
    }
    if (montoNum > 100_000_000) {
      setError('El monto no puede superar $100.000.000');
      return;
    }
    if (!rutaId) {
      setError('Seleccioná una ruta');
      return;
    }
    setLoading(true);
    try {
      if (editando) {
        await actualizarGasto(gasto.id, {
          monto: montoNum,
          categoria,
          rutaId,
          fecha,
          descripcion: descripcion.trim(),
        });
        toast.success('Gasto actualizado');
      } else {
        await crearGasto({
          monto: montoNum,
          categoria,
          rutaId,
          fecha,
          descripcion,
          autor: user?.email ?? '',
        });
        toast.success('Gasto registrado', { description: formatMoney(montoNum) });
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('No tenés permisos para esta acción.');
      } else {
        setError(err.message ?? 'No se pudo guardar el gasto');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-popover animate-[pop_0.18s_ease-out] max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              {editando ? 'Editar gasto' : 'Nuevo gasto'}
            </h3>
            <p className="text-xs text-slate-500">Registrá un gasto de la operación</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Monto $
              </label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="1"
                placeholder="0"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                max={hoy()}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Categoría
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS_GASTO.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoria(c.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    categoria === c.id
                      ? 'text-white shadow-brand-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={categoria === c.id ? { background: c.color } : undefined}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: categoria === c.id ? 'rgba(255,255,255,0.8)' : c.color }}
                  />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Ruta
            </label>
            <select
              value={rutaId}
              onChange={(e) => setRutaId(e.target.value)}
              disabled={rutaBloqueada}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              {rutas.length === 0 && <option value="">Sin rutas</option>}
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Descripción <span className="text-slate-400 normal-case font-medium">(opcional)</span>
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: nafta moto, comisión semana, etc."
              maxLength={140}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            />
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
            onClick={handleGuardar}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-brand-sm transition-all"
          >
            {loading ? 'Guardando…' : editando ? 'Guardar' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  );
}
