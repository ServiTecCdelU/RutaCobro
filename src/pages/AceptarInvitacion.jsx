import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Banknote, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { aceptarInvitacion } from '@/firebase/services';

export default function AceptarInvitacion() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { user } = useApp();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('idle'); // 'idle' | 'procesando' | 'ok' | 'error'
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (user === undefined) return;
    if (!user) return;
    if (!token) {
      setEstado('error');
      setMensaje('El link no es válido');
      return;
    }
    let cancelled = false;
    (async () => {
      setEstado('procesando');
      try {
        await aceptarInvitacion(user.uid, user.email ?? '', token);
        if (cancelled) return;
        setEstado('ok');
        setTimeout(() => window.location.assign('/'), 1500);
      } catch (err) {
        if (cancelled) return;
        setEstado('error');
        setMensaje(err.message ?? 'No se pudo aceptar la invitación');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`/aceptar?token=${token ?? ''}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-8 shadow-card text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center mx-auto mb-4">
          <Banknote size={28} className="text-white" strokeWidth={2} />
        </div>

        {estado === 'procesando' && (
          <>
            <h1 className="font-bold text-slate-900">Procesando invitación…</h1>
            <div className="mt-5 w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin mx-auto" />
          </>
        )}

        {estado === 'ok' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h1 className="font-bold text-slate-900">¡Listo!</h1>
            <p className="text-sm text-slate-500 mt-1">Te sumamos al equipo. Redirigiendo…</p>
          </>
        )}

        {estado === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>
            <h1 className="font-bold text-slate-900">No se pudo aceptar</h1>
            <p className="text-sm text-slate-500 mt-1">{mensaje}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Ir al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
