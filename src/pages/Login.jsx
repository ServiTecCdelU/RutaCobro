import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Banknote, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { auth } from '@/firebase/config';

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
    login: 'Iniciar sesión',
    registro: 'Crear cuenta',
    reset: 'Recuperar contraseña',
  };

  const ctaText = {
    login: 'Ingresar',
    registro: 'Crear cuenta',
    reset: 'Enviar mail de recuperación',
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50">
      {/* Fondo decorativo con gradientes */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 60% at 20% 0%, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0) 60%),\
             radial-gradient(60% 60% at 100% 100%, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0) 55%)',
        }}
      />
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />

      <div className="relative w-full max-w-sm animate-[fadein_0.4s_ease-out]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center mb-4 shadow-brand">
            <Banknote size={30} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">
            RutaCobro
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de cartera de préstamos</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/60 ring-1 ring-slate-900/5 p-6 shadow-elevated">
          <div className="flex items-center gap-2 mb-5">
            {modo === 'reset' && (
              <button
                onClick={() => {
                  setModo('login');
                  resetFeedback();
                }}
                aria-label="Volver al login"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-900">{titulos[modo]}</h2>
          </div>

          {modo === 'reset' && (
            <p className="text-sm text-slate-500 mb-4">
              Ingresá tu email y te mandamos un link para crear una nueva contraseña.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>

            {modo !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Contraseña
                  </label>
                  {modo === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setModo('reset');
                        resetFeedback();
                      }}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline"
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
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
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
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  o
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-3"
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
            <div className="mt-5 text-center text-sm text-slate-500">
              {modo === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
              <button
                onClick={() => {
                  setModo((m) => (m === 'login' ? 'registro' : 'login'));
                  resetFeedback();
                }}
                className="font-semibold text-brand-700 hover:text-brand-900 hover:underline"
              >
                {modo === 'login' ? 'Crear cuenta' : 'Iniciá sesión'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
