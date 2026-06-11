import { useState } from 'react';
import {
  Settings,
  Building2,
  Palette,
  Save,
  MessageCircle,
  Megaphone,
  TimerReset,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { SERVITEC, servitecWhatsApp } from '@/utils/servitec';
import { normalizarPunitorio } from '@/utils/punitorios';

function CardPunitorios() {
  const { negocioConfig, actualizarPunitorio } = useApp();
  const toast = useToast();
  const [form, setForm] = useState(() => normalizarPunitorio(negocioConfig?.punitorio));
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await actualizarPunitorio(normalizarPunitorio(form));
      toast.success('Punitorios guardados');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <TimerReset size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Punitorios por mora</h2>
            <p className="text-xs text-slate-500">
              Recargo automático sobre cuotas vencidas (se muestra en Cobranza y el detalle)
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={form.activo}
          aria-label="Activar punitorios"
          onClick={() => set('activo', !form.activo)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            form.activo ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
              form.activo ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {form.activo && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            ['tasaDiariaPct', '% por día', 'Sobre el saldo de la cuota vencida'],
            ['diasGracia', 'Días de gracia', 'Atraso sin recargo'],
            ['topePct', 'Tope %', 'Máximo recargo (% de la cuota)'],
          ].map(([campo, label, ayuda]) => (
            <div key={campo}>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                {label}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form[campo]}
                onChange={(e) => set(campo, e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">{ayuda}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] disabled:opacity-50 shadow-brand-sm hover:shadow-brand transition-all flex items-center justify-center gap-2"
      >
        <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar punitorios'}
      </button>
    </div>
  );
}

export default function Configuracion() {
  const { user, esAdmin } = useApp();
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

      {esAdmin && <CardPunitorios />}

      {/* SERVITEC — recomendá el sistema */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Megaphone size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Recomendá RutaCobro</h2>
            <p className="text-xs text-slate-500">¿Conocés a alguien que presta plata?</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Este sistema lo desarrolla{' '}
          <span className="font-bold text-slate-900">{SERVITEC.nombre}</span>. Si conocés a alguien
          que necesite gestionar su cartera de préstamos, pasale el contacto y nos consulta sin
          compromiso.
        </p>
        {servitecWhatsApp() && (
          <a
            href={servitecWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 active:scale-[0.98] shadow-sm transition-all"
          >
            <MessageCircle size={16} /> Contactar a SERVITEC · {SERVITEC.telDisplay}
          </a>
        )}
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
