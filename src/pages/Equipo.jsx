import { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Shield,
  Mail,
  DollarSign,
  Pencil,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/utils/formatters';
import EmptyState from '@/components/ui/EmptyState';
import ErrorBanner from '@/components/ui/ErrorBanner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function Equipo() {
  const {
    user,
    esAdmin,
    rutasAll,
    prestamosAll,
    tenantConfig,
    error,
    subscribeMiembros,
    subscribeInvitaciones,
    crearInvitacion,
    eliminarInvitacion,
    eliminarMiembro,
    actualizarMiembro,
    actualizarCapitalTotal,
  } = useApp();
  const toast = useToast();

  const [miembros, setMiembros] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [emailNuevo, setEmailNuevo] = useState('');
  const [rolNuevo, setRolNuevo] = useState('cobrador');
  const [rutaNueva, setRutaNueva] = useState('');
  const [montoNuevo, setMontoNuevo] = useState(0);
  const [creando, setCreando] = useState(false);
  const [copiado, setCopiado] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  // Capital total
  const [editandoCapital, setEditandoCapital] = useState(false);
  const [capitalInput, setCapitalInput] = useState('');

  // Editar monto de miembro
  const [editandoMiembro, setEditandoMiembro] = useState(null);
  const [montoEditInput, setMontoEditInput] = useState('');

  useEffect(() => {
    if (!esAdmin) return;
    const u1 = subscribeMiembros(setMiembros);
    const u2 = subscribeInvitaciones(setInvitaciones);
    return () => {
      u1();
      u2();
    };
  }, [esAdmin, subscribeMiembros, subscribeInvitaciones]);

  if (!esAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Solo administradores"
        description="Esta sección está disponible únicamente para el administrador."
      />
    );
  }

  const capitalTotal = tenantConfig?.capitalTotal ?? 0;

  // Capital en calle TOTAL (todos los préstamos activos)
  const capitalEnCalleTotal = (prestamosAll ?? [])
    .filter((p) => p.estado === 'activo')
    .reduce((sum, p) => sum + (p.monto ?? 0), 0);

  // Capital disponible real = lo que puse - lo que ya está prestado
  const capitalDisponibleReal = capitalTotal - capitalEnCalleTotal;

  // Calcular capital en calle por ruta (para cada cobrador)
  const getCapitalEnCalle = (rutaId) => {
    if (!rutaId || !prestamosAll) return 0;
    return prestamosAll
      .filter((p) => p.estado === 'activo' && p.rutaId === rutaId)
      .reduce((sum, p) => sum + (p.monto ?? 0), 0);
  };

  // Total asignado a cobradores
  const totalAsignado = miembros
    .filter((m) => m.rol === 'cobrador')
    .reduce((sum, m) => sum + (m.montoAsignado ?? 0), 0);

  // Cuánto queda sin asignar a cobradores
  const sinAsignar = capitalTotal - totalAsignado;

  // Cantidad de préstamos activos
  const prestamosActivos = (prestamosAll ?? []).filter((p) => p.estado === 'activo').length;

  // ── Handlers ──

  const handleGuardarCapital = async () => {
    const valor = Number(capitalInput);
    if (isNaN(valor) || valor < 0) {
      toast.error('Ingresá un monto válido');
      return;
    }
    try {
      await actualizarCapitalTotal(valor);
      toast.success('Capital total actualizado');
      setEditandoCapital(false);
    } catch (err) {
      toast.error('No se pudo actualizar', { description: err.message });
    }
  };

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
    if (rolNuevo === 'cobrador' && montoNuevo <= 0) {
      toast.error('Asigná un monto mayor a 0');
      return;
    }
    if (rolNuevo === 'cobrador' && montoNuevo > sinAsignar) {
      toast.error(`El monto excede lo disponible para asignar (${formatMoney(sinAsignar)})`);
      return;
    }
    setCreando(true);
    try {
      const token = await crearInvitacion({
        email: emailNuevo,
        rutaId: rolNuevo === 'cobrador' ? rutaNueva : null,
        rol: rolNuevo,
        montoAsignado: rolNuevo === 'cobrador' ? montoNuevo : null,
      });
      setEmailNuevo('');
      setRolNuevo('cobrador');
      setRutaNueva('');
      setMontoNuevo(0);
      const link = buildInviteLink(token);
      await navigator.clipboard?.writeText(link).catch(() => {});
      toast.success('Invitación creada', { description: 'Link copiado al portapapeles' });
    } catch (err) {
      toast.error('No se pudo crear', { description: err.message });
    } finally {
      setCreando(false);
    }
  };

  const handleCopiar = async (token) => {
    const link = buildInviteLink(token);
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

  const handleGuardarMontoMiembro = async () => {
    const valor = Number(montoEditInput);
    if (isNaN(valor) || valor < 0) {
      toast.error('Ingresá un monto válido');
      return;
    }
    try {
      await actualizarMiembro(editandoMiembro.id, { montoAsignado: valor });
      toast.success('Monto actualizado');
      setEditandoMiembro(null);
    } catch (err) {
      toast.error('No se pudo actualizar', { description: err.message });
    }
  };

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} />}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
          Equipo
        </h1>
        <p className="text-sm text-slate-500 mt-1">Administrá tu capital, cobradores y rutas.</p>
      </div>

      {/* Capital total */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <DollarSign size={18} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">Capital total</h2>
            <p className="text-xs text-slate-500">
              Definí cuánta plata tenés para distribuir entre vos y tus cobradores
            </p>
          </div>
        </div>
        {editandoCapital ? (
          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={capitalInput}
              onChange={(e) => setCapitalInput(e.target.value)}
              min="0"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              placeholder="Ej: 5000000"
              autoFocus
            />
            <button
              onClick={handleGuardarCapital}
              className="px-4 py-3 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 shadow-brand-sm transition-all"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditandoCapital(false)}
              className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Capital inicial
                </div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatMoney(capitalTotal)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  En calle
                </div>
                <div className="text-lg font-bold text-amber-600 tabular-nums">
                  {formatMoney(capitalEnCalleTotal)}
                </div>
                <div className="text-[10px] text-slate-400">{prestamosActivos} préstamos</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Disponible
                </div>
                <div
                  className={`text-lg font-bold tabular-nums ${capitalDisponibleReal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  {formatMoney(capitalDisponibleReal)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Asignado a cobradores
                </div>
                <div className="text-lg font-bold text-blue-600 tabular-nums">
                  {formatMoney(totalAsignado)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Sin asignar: {formatMoney(sinAsignar)}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setCapitalInput(String(capitalTotal));
                  setEditandoCapital(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <Pencil size={14} /> Editar capital
              </button>
            </div>
          </div>
        )}
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
          <>
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
            <div className="mt-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                Monto asignado $
              </label>
              <input
                type="number"
                value={montoNuevo || ''}
                onChange={(e) => setMontoNuevo(Number(e.target.value))}
                min="0"
                placeholder="Ej: 500000"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">
                Disponible para asignar: {formatMoney(sinAsignar)}
              </p>
            </div>
          </>
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
                      {inv.montoAsignado > 0 && (
                        <>
                          {' '}
                          · Monto:{' '}
                          <span className="font-semibold">{formatMoney(inv.montoAsignado)}</span>
                        </>
                      )}
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
              const capitalEnCalle = !esAdminMiembro ? getCapitalEnCalle(m.rutaId) : 0;
              const montoAsig = m.montoAsignado ?? 0;
              const disponibleMiembro = montoAsig - capitalEnCalle;

              return (
                <div key={m.id} className="p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        esAdminMiembro
                          ? 'bg-slate-900 text-white'
                          : 'bg-emerald-100 text-emerald-700'
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
                        <span className="font-semibold">
                          {esAdminMiembro ? 'Admin' : 'Cobrador'}
                        </span>
                        {!esAdminMiembro && ruta && (
                          <>
                            {' '}
                            · Ruta: <span className="font-semibold">{ruta.nombre}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!esAdminMiembro && (
                        <button
                          onClick={() => {
                            setEditandoMiembro(m);
                            setMontoEditInput(String(montoAsig));
                          }}
                          className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                          title="Editar monto"
                          aria-label="Editar monto"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
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
                  </div>

                  {/* Resumen de capital del cobrador */}
                  {!esAdminMiembro && montoAsig > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="px-2 py-1.5 rounded-lg bg-slate-50 text-center">
                        <div className="text-[9px] font-bold uppercase text-slate-400">
                          Asignado
                        </div>
                        <div className="text-xs font-bold text-slate-700 tabular-nums">
                          {formatMoney(montoAsig)}
                        </div>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-slate-50 text-center">
                        <div className="text-[9px] font-bold uppercase text-slate-400">
                          En calle
                        </div>
                        <div className="text-xs font-bold text-amber-600 tabular-nums">
                          {formatMoney(capitalEnCalle)}
                        </div>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-slate-50 text-center">
                        <div className="text-[9px] font-bold uppercase text-slate-400">
                          Disponible
                        </div>
                        <div
                          className={`text-xs font-bold tabular-nums ${disponibleMiembro < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                        >
                          {formatMoney(disponibleMiembro)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal editar monto de miembro */}
      {editandoMiembro && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-popover">
            <h3 className="font-bold text-slate-900 mb-1">Editar monto asignado</h3>
            <p className="text-xs text-slate-500 mb-4">{editandoMiembro.email}</p>
            <input
              type="number"
              value={montoEditInput}
              onChange={(e) => setMontoEditInput(e.target.value)}
              min="0"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditandoMiembro(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarMontoMiembro}
                className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-semibold text-sm hover:opacity-95 shadow-brand-sm transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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

function buildInviteLink(token) {
  const base = `${window.location.origin}/aceptar`;
  const params = new URLSearchParams({ token });
  return `${base}?${params.toString()}`;
}
