import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  Banknote,
  Eye,
  EyeOff,
  ArrowLeft,
  TrendingUp,
  ShieldCheck,
  Route,
  Wallet,
  ArrowUpRight,
  MessageCircle,
} from 'lucide-react';
import { auth } from '@/firebase/config';
import { servitecWhatsApp } from '@/utils/servitec';

const googleProvider = new GoogleAuthProvider();

const ERROR_MSGS = {
  'auth/user-not-found': 'Usuario no encontrado',
  'auth/wrong-password': 'Contraseña incorrecta',
  'auth/email-already-in-use': 'El email ya está registrado',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
  'auth/invalid-email': 'Email inválido',
  'auth/invalid-credential': 'Credenciales incorrectas',
  'auth/too-many-requests': 'Demasiados intentos. Probá más tarde',
  'auth/missing-email': 'Ingresá un email',
  'auth/popup-closed-by-user': 'Cancelaste el ingreso con Google',
  'auth/popup-blocked': 'El navegador bloqueó el popup. Habilitalo e intentá de nuevo',
  'auth/account-exists-with-different-credential':
    'Ya existe una cuenta con ese email usando otro método',
};

const FEATURES = [
  { icon: Route, title: 'Rutas y cobradores', desc: 'Organizá tu cartera por zonas y equipo.' },
  { icon: Wallet, title: 'Cobro en 1 click', desc: 'Registrá cuotas y pagos al instante.' },
  { icon: TrendingUp, title: 'Métricas en vivo', desc: 'Ganancia, mora y caja en tiempo real.' },
];

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-12 xl:p-16 text-white">
      {/* Capas de color */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 70% at 15% 10%, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0) 55%),\
             radial-gradient(70% 70% at 100% 100%, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0) 55%),\
             radial-gradient(50% 50% at 90% 0%, rgba(56,189,248,0.20) 0%, rgba(56,189,248,0) 60%)',
        }}
      />
      {/* Grilla sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-violet-500/25 blur-3xl" />

      {/* Marca */}
      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur flex items-center justify-center">
          <Banknote size={22} strokeWidth={2.2} />
        </div>
        <span className="font-display font-bold text-lg tracking-tight">RutaCobro</span>
      </div>

      {/* Hero */}
      <div className="relative max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-xs font-semibold text-white/80 mb-6 backdrop-blur">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          En tiempo real
        </div>
        <h1 className="font-display font-bold tracking-tight leading-[1.05] text-balance text-5xl xl:text-6xl">
          Sistema de gestión de cobros
        </h1>
        <p className="mt-5 text-base xl:text-lg text-white/70 leading-relaxed">
          Controlá préstamos, rutas y cobranza desde un solo lugar. Cobrá más rápido, reducí la mora
          y mirá tus números crecer.
        </p>

        {/* Tarjeta métrica flotante (mockup) */}
        <div className="mt-10 max-w-xs rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-xl p-5 shadow-2xl animate-[slideup_0.5s_ease-out]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              Cobrado hoy
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded-lg">
              <ArrowUpRight size={12} /> 12.4%
            </span>
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight">$284.500</div>
          <div className="mt-4 flex items-end gap-1.5 h-14">
            {[40, 55, 35, 70, 60, 85, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-white/30 to-white/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="relative grid gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center flex-shrink-0">
              <Icon size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-white/60">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [modo, setModo] = useState('login'); // 'login' | 'registro' | 'reset'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetFeedback();
    setLoading(true);
    try {
      if (modo === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        navigate(next);
      } else if (modo === 'registro') {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate(next);
      } else if (modo === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setSuccess(
          `Enviamos un mail a ${email}. Revisá tu bandeja (y spam) para restablecer la contraseña.`,
        );
      }
    } catch (err) {
      setError(ERROR_MSGS[err.code] ?? 'Ocurrió un error, intentá de nuevo');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    resetFeedback();
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate(next);
    } catch (err) {
      setError(ERROR_MSGS[err.code] ?? 'No se pudo iniciar con Google');
    } finally {
      setLoading(false);
    }
  };

  const titulos = {
    login: 'Bienvenido de nuevo',
    registro: 'Creá tu cuenta',
    reset: 'Recuperar contraseña',
  };

  const subtitulos = {
    login: 'Ingresá para gestionar tu cartera',
    registro: 'Empezá a administrar tus cobros',
    reset: 'Te enviamos un link para crear una nueva',
  };

  const ctaText = {
    login: 'Ingresar',
    registro: 'Crear cuenta',
    reset: 'Enviar mail de recuperación',
  };

  return (
    <div className="dark min-h-screen grid lg:grid-cols-2 bg-slate-950">
      <BrandPanel />

      {/* Panel de formulario */}
      <div className="relative flex items-center justify-center p-6 sm:p-10 overflow-hidden">
        {/* Fondo decorativo solo visible en mobile/cuando no hay panel */}
        <div
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            background:
              'radial-gradient(70% 50% at 20% 0%, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 60%),\
               radial-gradient(60% 50% at 100% 100%, rgba(139,92,246,0.14) 0%, rgba(139,92,246,0) 55%)',
          }}
        />

        <div className="relative w-full max-w-sm animate-[fadein_0.4s_ease-out]">
          {/* Logo (mobile) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center mb-3 shadow-brand">
              <Banknote size={26} className="text-white" strokeWidth={2.2} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
              RutaCobro
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Sistema de gestión de cobros</p>
          </div>

          <div className="flex items-center gap-2 mb-1">
            {modo === 'reset' && (
              <button
                onClick={() => {
                  setModo('login');
                  resetFeedback();
                }}
                aria-label="Volver al login"
                className="w-8 h-8 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
              {titulos[modo]}
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-7">{subtitulos[modo]}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            {modo !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Contraseña
                  </label>
                  {modo === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setModo('reset');
                        resetFeedback();
                      }}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      ¿La olvidaste?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all shadow-brand"
            >
              {loading ? 'Cargando…' : ctaText[modo]}
            </button>
          </form>

          {modo !== 'reset' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  o
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-3 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar con Google
              </button>
            </>
          )}

          {modo !== 'reset' && (
            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {modo === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
              <button
                onClick={() => {
                  setModo((m) => (m === 'login' ? 'registro' : 'login'));
                  resetFeedback();
                }}
                className="font-semibold text-brand-700 hover:text-brand-900 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
              >
                {modo === 'login' ? 'Crear cuenta' : 'Iniciá sesión'}
              </button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck size={13} />
            Conexión segura · Tus datos están cifrados
          </div>

          {/* Crédito SERVITEC */}
          <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Desarrollado por{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200">SERVITEC</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
              ¿Querés un sistema así para tu negocio?
            </p>
            {servitecWhatsApp() && (
              <a
                href={servitecWhatsApp()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm"
              >
                <MessageCircle size={15} /> Consultar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
