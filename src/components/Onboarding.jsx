import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Users, Banknote, Check, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ModalNuevoCliente from '@/components/modals/ModalNuevoCliente';

const COLORES = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];

export default function Onboarding() {
  const { rutas, clientes, crearRuta } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: 'Centro', cobrador: '', color: COLORES[0] });
  const [loading, setLoading] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [error, setError] = useState('');

  const tieneRuta = rutas.length > 0;
  const tieneCliente = clientes.length > 0;

  const handleCrearRuta = async () => {
    setError('');
    if (!form.nombre.trim() || !form.cobrador.trim()) return;
    setLoading(true);
    try {
      await crearRuta(form);
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('Permisos denegados en Firestore. Publicá las reglas de seguridad primero.');
      } else {
        setError(err.message ?? 'No se pudo crear la ruta');
      }
    } finally {
      setLoading(false);
    }
  };

  const pasos = [
    { n: 1, titulo: 'Crear tu primera ruta', completo: tieneRuta },
    { n: 2, titulo: 'Agregar un cliente', completo: tieneCliente },
    { n: 3, titulo: 'Crear un préstamo', completo: false },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto mb-4 shadow-brand">
          <Banknote size={28} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">¡Bienvenido a RutaCobro!</h1>
        <p className="text-sm text-slate-500 mt-1">En 3 pasos tenés tu cartera funcionando</p>
      </div>

      {/* Progreso */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
        <div className="space-y-3">
          {pasos.map((p) => (
            <div key={p.n} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                p.completo ? 'bg-emerald-500 text-white shadow-emerald/40' : 'bg-slate-100 text-slate-500'
              }`}>
                {p.completo ? <Check size={14} /> : p.n}
              </div>
              <span className={`text-sm font-semibold ${p.completo ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {p.titulo}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Paso 1: Ruta */}
      {!tieneRuta && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-sm">
              <Route size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">1. Crear tu primera ruta</h2>
              <p className="text-xs text-slate-500">Agrupá clientes por zona de cobro</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Nombre</label>
                <input
                  type="text" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Cobrador</label>
                <input
                  type="text" value={form.cobrador}
                  placeholder="Tu nombre"
                  onChange={e => setForm(f => ({ ...f, cobrador: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Color</label>
              <div className="flex gap-2">
                {COLORES.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
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
            <button
              onClick={handleCrearRuta}
              disabled={loading || !form.nombre.trim() || !form.cobrador.trim()}
              className="w-full py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-brand-sm hover:shadow-brand transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Creando…' : <>Crear ruta <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Paso 2: Cliente */}
      {tieneRuta && !tieneCliente && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-sm">
              <Users size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">2. Agregá tu primer cliente</h2>
              <p className="text-xs text-slate-500">Registrá los datos para empezar a prestar</p>
            </div>
          </div>
          <button
            onClick={() => setModalCliente(true)}
            className="w-full py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] shadow-brand-sm hover:shadow-brand transition-all flex items-center justify-center gap-2"
          >
            Crear cliente <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Paso 3: Préstamo */}
      {tieneRuta && tieneCliente && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-sm">
              <Banknote size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">3. Crear un préstamo</h2>
              <p className="text-xs text-slate-500">Desde el botón &quot;Nuevo préstamo&quot; arriba a la derecha</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/clientes')}
            className="w-full py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] shadow-brand-sm hover:shadow-brand transition-all flex items-center justify-center gap-2"
          >
            Ir a clientes <ArrowRight size={16} />
          </button>
        </div>
      )}

      {modalCliente && <ModalNuevoCliente onClose={() => setModalCliente(false)} />}
    </div>
  );
}
