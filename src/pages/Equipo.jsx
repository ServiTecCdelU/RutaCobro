import { useEffect, useState } from 'react';
import { Users, UserPlus, Copy, Check, Trash2, Shield, Mail } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import ErrorBanner from '@/components/ui/ErrorBanner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function Equipo() {
  const {
    user,
    tenantId,
    esAdmin,
    rutasAll,
    error,
    subscribeMiembros,
    subscribeInvitaciones,
    crearInvitacion,
    eliminarInvitacion,
    eliminarMiembro,
  } = useApp();
  const toast = useToast();

  const [miembros, setMiembros] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [emailNuevo, setEmailNuevo] = useState('');
  const [rolNuevo, setRolNuevo] = useState('cobrador');
  const [rutaNueva, setRutaNueva] = useState('');
  const [creando, setCreando] = useState(false);
  const [copiado, setCopiado] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  useEffect(() => {
    if (!tenantId || !esAdmin) return;
    const u1 = subscribeMiembros(setMiembros);
    const u2 = subscribeInvitaciones(setInvitaciones);
    return () => {
      u1();
      u2();
    };
  }, [tenantId, esAdmin, subscribeMiembros, subscribeInvitaciones]);

  if (!esAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Solo administradores"
        description="Esta sección está disponible únicamente para el dueño del tenant."
      />
    );
  }

  const handleCrear = async () => {
    if (!emailNuevo.trim()) {
      toast.error('Completá el email');
      return;
    }
    if (rolNuevo === 'cobrador' && !rutaNueva) {
      toast.error('Los cobradores necesitan una ruta asignada');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNuevo.trim())) {
      toast.error('El email tiene un formato inválido');
      return;
    }
    setCreando(true);
    try {
      const token = await crearInvitacion({
        email: emailNuevo,
        rutaId: rolNuevo === 'cobrador' ? rutaNueva : null,
        rol: rolNuevo,
      });
      setEmailNuevo('');
      setRolNuevo('cobrador');
      setRutaNueva('');
      const link = buildInviteLink(tenantId, token);
      await navigator.clipboard?.writeText(link).catch(() => {});
      toast.success('Invitación creada', { description: 'Link copiado al portapapeles' });
    } catch (err) {
      toast.error('No se pudo crear', { description: err.message });
    } finally {
      setCreando(false);
    }
  };

  const handleCopiar = async (token) => {
    const link = buildInviteLink(tenantId, token);
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(token);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleEliminarInv = async (token) => {
    try {
      await eliminarInvitacion(token);
      toast.info('Invitación eliminada');
    } catch (err) {
      toast.error('No se pudo eliminar', { description: err.message });
    }
  };

  const handleEliminarMiembro = async () => {
    const m = confirmEliminar;
    try {
      await eliminarMiembro(m.id);
      toast.success('Miembro eliminado', { description: m.email });
    } catch (err) {
      toast.error('No se pudo eliminar', { description: err.message });
    }
  };

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} />}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
          Equipo
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Invitá cobradores y asignales una ruta. El admin (vos) ve todo.
        </p>
      </div>

      {/* Crear invitación */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-sm">
            <UserPlus size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Invitar cobrador</h2>
            <p className="text-xs text-slate-500">Generá un link y compartilo por WhatsApp/email</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={emailNuevo}
              onChange={(e) => setEmailNuevo(e.target.value)}
              placeholder="usuario@email.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Rol
            </label>
            <select
              value={rolNuevo}
              onChange={(e) => setRolNuevo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white"
            >
              <option value="cobrador">Cobrador</option>
              <option value="visitante">Visitante (solo lectura)</option>
              <option value="cliente">Cliente (ve sus préstamos)</option>
            </select>
          </div>
        </div>
        {rolNuevo === 'cobrador' && (
          <div className="mt-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
              Ruta asignada
            </label>
            <select
              value={rutaNueva}
              onChange={(e) => setRutaNueva(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white"
            >
              <option value="">Elegir ruta…</option>
              {rutasAll.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={handleCrear}
          disabled={creando || !emailNuevo.trim() || (rolNuevo === 'cobrador' && !rutaNueva)}
          className="mt-4 w-full sm:w-auto px-5 py-3 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] disabled:opacity-50 shadow-brand-sm hover:shadow-brand transition-all flex items-center justify-center gap-2"
        >
          <Mail size={16} /> {creando ? 'Creando…' : 'Crear invitación'}
        </button>
      </div>

      {/* Invitaciones pendientes */}
      {invitaciones.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <h2 className="font-bold text-slate-900 mb-3">Invitaciones pendientes</h2>
          <div className="space-y-2">
            {invitaciones.map((inv) => {
              const ruta = rutasAll.find((r) => r.id === inv.rutaId);
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Mail size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{inv.email}</p>
                    <p className="text-xs text-slate-500">
                      Ruta: <span className="font-semibold">{ruta?.nombre ?? '—'}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopiar(inv.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 inline-flex items-center gap-1"
                  >
                    {copiado === inv.id ? (
                      <>
                        <Check size={13} /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copiar link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEliminarInv(inv.id)}
                    className="w-9 h-9 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                    title="Cancelar invitación"
                    aria-label="Cancelar invitación"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Miembros activos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Miembros</h2>
            <p className="text-xs text-slate-500">
              {miembros.length} {miembros.length === 1 ? 'persona' : 'personas'}
            </p>
          </div>
        </div>
        {miembros.length === 0 ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="space-y-2">
            {miembros.map((m) => {
              const ruta = rutasAll.find((r) => r.id === m.rutaId);
              const esYo = m.id === user?.uid;
              const esAdminMiembro = m.rol === 'admin';
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      esAdminMiembro ? 'bg-slate-900 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {esAdminMiembro ? <Shield size={16} /> : <Users size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {m.email || m.id}{' '}
                      {esYo && <span className="text-slate-400 font-normal">· vos</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold">{esAdminMiembro ? 'Admin' : 'Cobrador'}</span>
                      {!esAdminMiembro && ruta && (
                        <>
                          {' '}
                          · Ruta: <span className="font-semibold">{ruta.nombre}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {!esAdminMiembro && !esYo && (
                    <button
                      onClick={() => setConfirmEliminar(m)}
                      className="w-9 h-9 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                      title="Quitar del equipo"
                      aria-label="Quitar del equipo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmEliminar && (
        <ConfirmDialog
          title={`Quitar a ${confirmEliminar.email}`}
          message="Perderá acceso al tenant en su próximo login. Su cuenta de Firebase queda intacta."
          confirmText="Quitar miembro"
          onConfirm={handleEliminarMiembro}
          onClose={() => setConfirmEliminar(null)}
        />
      )}
    </div>
  );
}

function buildInviteLink(tenantId, token) {
  const base = `${window.location.origin}/aceptar`;
  const params = new URLSearchParams({ tid: tenantId, token });
  return `${base}?${params.toString()}`;
}
