import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useModal } from '@/hooks/useModal';

const VACIO = { nombre: '', dni: '', tel: '', direccion: '', rutaId: '' };

export default function ModalNuevoCliente({ onClose, cliente }) {
  const { rutas, crearCliente, actualizarCliente } = useApp();
  const toast = useToast();
  const esEdicion = !!cliente;

  const [form, setForm] = useState(() =>
    cliente
      ? {
          nombre: cliente.nombre ?? '',
          dni: cliente.dni ?? '',
          tel: cliente.tel ?? '',
          direccion: cliente.direccion ?? '',
          rutaId: cliente.rutaId ?? '',
        }
      : VACIO,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useModal(onClose);

  useEffect(() => {
    if (!form.rutaId && rutas.length > 0) {
      setForm((f) => ({ ...f, rutaId: rutas[0].id }));
    }
  }, [rutas, form.rutaId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleGuardar = async () => {
    setError('');
    if (!form.nombre.trim()) {
      setError('Ingresá el nombre');
      return;
    }
    if (form.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (form.nombre.trim().length > 100) {
      setError('El nombre es demasiado largo (máx. 100 caracteres)');
      return;
    }
    if (form.tel && !/^[\d\s\-+().]{6,20}$/.test(form.tel)) {
      setError('El teléfono tiene un formato inválido');
      return;
    }
    if (!form.rutaId) {
      setError('Seleccioná una ruta');
      return;
    }
    setLoading(true);
    try {
      if (esEdicion) {
        await actualizarCliente(cliente.id, form);
        toast.success('Cliente actualizado');
      } else {
        await crearCliente(form);
        toast.success('Cliente creado', { description: form.nombre });
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('No tenés permisos para esta acción. Contactá al administrador.');
      } else {
        setError(err.message ?? 'No se pudo guardar el cliente');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-popover animate-[pop_0.18s_ease-out]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              {esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
            </h3>
            <p className="text-xs text-slate-500">
              {esEdicion ? 'Modificá los datos del cliente' : 'Completá los datos del cliente'}
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

        {rutas.length === 0 ? (
          <div className="p-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Necesitás crear una ruta primero
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Los clientes tienen que estar asignados a una ruta de cobro.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] shadow-brand-sm transition-all"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                    DNI
                  </label>
                  <input
                    type="text"
                    value={form.dni}
                    onChange={(e) => set('dni', e.target.value)}
                    placeholder="30.123.456"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={form.tel}
                    onChange={(e) => set('tel', e.target.value)}
                    placeholder="3442-123456"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                  Dirección
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  placeholder="San Martín 1234"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                  Ruta
                </label>
                <select
                  value={form.rutaId}
                  onChange={(e) => set('rutaId', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white"
                >
                  {rutas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                      {r.cobrador ? ` · ${r.cobrador}` : ''}
                    </option>
                  ))}
                </select>
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
                disabled={loading || !form.nombre.trim() || !form.rutaId}
                className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-brand-sm transition-all"
              >
                {loading ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
