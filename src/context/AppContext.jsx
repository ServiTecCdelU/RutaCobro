import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import {
  subscribeRutas, subscribeClientes, subscribePrestamos,
  crearRuta, actualizarRuta, eliminarRuta,
  crearCliente, actualizarCliente, eliminarClienteCompleto,
  crearPrestamo, actualizarPrestamo, eliminarPrestamo, cobrarCuota, pagarMonto, revertirCuota,
  getUserDoc, bootstrapAdmin,
  subscribeMiembros, subscribeInvitaciones,
  crearInvitacion, eliminarInvitacion, eliminarMiembro,
} from '@/firebase/services';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [userDoc, setUserDoc] = useState(undefined);
  const [rutas, setRutas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u ?? null));
  }, []);

  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let doc = await getUserDoc(user.uid);
        if (!doc) {
          await bootstrapAdmin(user.uid, user.email ?? '');
          doc = { id: user.uid, tenantId: user.uid, rol: 'admin', email: user.email ?? '' };
        }
        if (!cancelled) setUserDoc(doc);
      } catch (err) {
        if (!cancelled) {
          setError(`No se pudo cargar tu perfil: ${err.message}`);
          setUserDoc(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const tenantId = userDoc?.tenantId;
  const rol = userDoc?.rol;
  const rutaIdAsignada = userDoc?.rutaId ?? null;
  const esAdmin = rol === 'admin';

  useEffect(() => {
    if (!tenantId) {
      setRutas([]);
      setClientes([]);
      setPrestamos([]);
      setSyncing(false);
      setError(null);
      return;
    }

    setSyncing(true);
    setError(null);

    const ready = { rutas: false, clientes: false, prestamos: false };
    const done = () => {
      if (ready.rutas && ready.clientes && ready.prestamos) setSyncing(false);
    };

    const handleError = (err) => {
      setSyncing(false);
      if (err.code === 'permission-denied') {
        setError('Permisos denegados. Revisá las reglas de Firestore.');
      } else if (err.code === 'unavailable') {
        setError('Sin conexión. Reconectando…');
      } else {
        setError(`Error de sincronización: ${err.message}`);
      }
    };

    const unsubs = [
      subscribeRutas(tenantId, d => { setRutas(d); ready.rutas = true; done(); }, handleError),
      subscribeClientes(tenantId, d => { setClientes(d); ready.clientes = true; done(); }, handleError),
      subscribePrestamos(tenantId, d => { setPrestamos(d); ready.prestamos = true; done(); }, handleError),
    ];

    const timeout = setTimeout(() => setSyncing(false), 10_000);

    return () => {
      unsubs.forEach(u => u());
      clearTimeout(timeout);
    };
  }, [tenantId]);

  const rutasVisibles = useMemo(() => {
    if (esAdmin || !rutaIdAsignada) return rutas;
    return rutas.filter(r => r.id === rutaIdAsignada);
  }, [rutas, rutaIdAsignada, esAdmin]);

  const clientesVisibles = useMemo(() => {
    if (esAdmin || !rutaIdAsignada) return clientes;
    return clientes.filter(c => c.rutaId === rutaIdAsignada);
  }, [clientes, rutaIdAsignada, esAdmin]);

  const prestamosVisibles = useMemo(() => {
    if (esAdmin || !rutaIdAsignada) return prestamos;
    const idsPermitidos = new Set(clientesVisibles.map(c => c.id));
    return prestamos.filter(p => idsPermitidos.has(p.clienteId));
  }, [prestamos, clientesVisibles, rutaIdAsignada, esAdmin]);

  const actions = useMemo(() => ({
    crearRuta:         (data)       => crearRuta(tenantId, data),
    actualizarRuta:    (id, data)   => actualizarRuta(tenantId, id, data),
    eliminarRuta:      (id)         => eliminarRuta(tenantId, id),
    crearCliente:      (data)       => crearCliente(tenantId, data),
    actualizarCliente: (id, data)   => actualizarCliente(tenantId, id, data),
    eliminarCliente:   (id)         => eliminarClienteCompleto(tenantId, id),
    crearPrestamo:     (data)       => crearPrestamo(tenantId, data),
    actualizarPrestamo:(id, data)   => actualizarPrestamo(tenantId, id, data),
    eliminarPrestamo:  (id)         => eliminarPrestamo(tenantId, id),
    cobrarCuota:       (pid, nro)   => cobrarCuota(tenantId, pid, nro),
    pagarMonto:        (pid, monto) => pagarMonto(tenantId, pid, monto),
    revertirCuota:     (pid, nro)   => revertirCuota(tenantId, pid, nro),
    subscribeMiembros: (cb, onErr)  => subscribeMiembros(tenantId, cb, onErr),
    subscribeInvitaciones: (cb, onErr) => subscribeInvitaciones(tenantId, cb, onErr),
    crearInvitacion:   (data)       => crearInvitacion(tenantId, data),
    eliminarInvitacion:(token)      => eliminarInvitacion(tenantId, token),
    eliminarMiembro:   (uid)        => eliminarMiembro(tenantId, uid),
  }), [tenantId]);

  const value = useMemo(() => ({
    user, userDoc, tenantId, rol, rutaIdAsignada, esAdmin,
    rutas: rutasVisibles, clientes: clientesVisibles, prestamos: prestamosVisibles,
    rutasAll: rutas,
    syncing, error,
    ...actions,
  }), [user, userDoc, tenantId, rol, rutaIdAsignada, esAdmin,
       rutasVisibles, clientesVisibles, prestamosVisibles, rutas,
       syncing, error, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
