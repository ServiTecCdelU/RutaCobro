import { useState } from 'react';
import { Settings, Building2, Palette, Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';

export default function Configuracion() {
  const { user } = useApp();
  const toast = useToast();

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [moneda, setMoneda] = useState('ARS');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
          Configuracion
        </h1>
        <p className="text-sm text-slate-500 mt-1">Ajustes generales de tu cuenta.</p>
      </div>

      {/* Info del tenant */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Datos del negocio</h2>
            <p className="text-xs text-slate-500">Informacion basica de tu operacion</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Email admin
            </label>
            <input
              type="text"
              value={user?.email ?? ''}
              readOnly
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Nombre del negocio
            </label>
            <input
              type="text"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Mi negocio de prestamos"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Moneda
            </label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white"
            >
              <option value="ARS">ARS — Peso argentino</option>
              <option value="USD">USD — Dolar estadounidense</option>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="COP">COP — Peso colombiano</option>
              <option value="PEN">PEN — Sol peruano</option>
            </select>
          </div>
        </div>

        <button
          onClick={() =>
            toast.info('Configuracion guardada (proximamente se persistira en Firestore)')
          }
          className="mt-4 w-full sm:w-auto px-5 py-3 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm hover:shadow-brand transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} /> Guardar cambios
        </button>
      </div>

      {/* Apariencia */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-sm">
            <Palette size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Apariencia</h2>
            <p className="text-xs text-slate-500">Personalizacion visual (proximamente)</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          En futuras versiones podras personalizar colores, logo y tema oscuro.
        </p>
      </div>

      {/* Info tecnica */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Info tecnica</h2>
            <p className="text-xs text-slate-500">Datos del sistema</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500 font-semibold">Version</p>
            <p className="text-slate-900 font-bold">1.0.0</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500 font-semibold">Stack</p>
            <p className="text-slate-900 font-bold">React + Firebase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
