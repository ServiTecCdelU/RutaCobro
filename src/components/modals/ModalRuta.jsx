import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useModal } from '@/hooks/useModal';

const COLORES = [
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

export default function ModalRuta({ onClose, ruta }) {
  const { crearRuta, actualizarRuta } = useApp();
  const toast = useToast();
  const esEdicion = !!ruta;

  const [form, setForm] = useState(() =>
    ruta
      ? {
          nombre: ruta.nombre ?? '',
          cobrador: ruta.cobrador ?? '',
          color: ruta.color ?? COLORES[0],
        }
      : { nombre: '', cobrador: '', color: COLORES[0] },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useModal(onClose);

  const handleGuardar = async () => {
    setError('');
    if (!form.nombre.trim()) {
      setError('Ingresá el nombre de la ruta');
      return;
    }
    if (form.nombre.trim().length > 50) {
      setError('El nombre es demasiado largo (máx. 50 caracteres)');
      return;
    }
    if (!form.cobrador.trim()) {
      setError('Ingresá el cobrador');
      return;
    }
    if (form.cobrador.trim().length > 50) {
      setError('El nombre del cobrador es demasiado largo (máx. 50 caracteres)');
      return;
    }
    setLoading(true);
    try {
      if (esEdicion) {
        await actualizarRuta(ruta.id, form);
        toast.success('Ruta actualizada');
      } else {
        await crearRuta(form);
        toast.success('Ruta creada', { description: form.nombre });
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('No tenés permisos para esta acción. Contactá al administrador.');
      } else {
        setError(err.message ?? 'No se pudo guardar la ruta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-popover animate-[pop_0.18s_ease-out]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">
            {esEdicion ? 'Editar ruta' : 'Nueva ruta'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {[
            ['Nombre de la ruta', 'nombre', 'Ej: Centro'],
            ['Nombre del cobrador', 'cobrador', 'Ej: Juan Pérez'],
          ].map(([label, key, ph]) => (
            <div key={key}>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                {label}
              </label>
              <input
                type="text"
                placeholder={ph}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORES.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
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
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || !form.nombre.trim() || !form.cobrador.trim()}
            className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-brand-sm transition-all"
          >
            {loading ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear ruta'}
          </button>
        </div>
      </div>
    </div>
  );
}
