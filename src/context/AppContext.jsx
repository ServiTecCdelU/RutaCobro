import { createContext, useContext, useMemo } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { DataProvider, useData } from './DataContext';
import {
  crearRuta,
  actualizarRuta,
  eliminarRuta,
  crearCliente,
  actualizarCliente,
  eliminarClienteCompleto,
  crearPrestamo,
  actualizarPrestamo,
  eliminarPrestamo,
  cobrarCuota,
  pagarMonto,
  revertirCuota,
  subscribeMiembros,
  subscribeInvitaciones,
  crearInvitacion,
  eliminarInvitacion,
  eliminarMiembro,
  actualizarMiembro,
  subscribeNotas,
  crearNota,
  eliminarNota,
  actualizarCapitalTotal,
} from '@/firebase/services';

const AppContext = createContext(null);

function AppInner({ children }) {
  const auth = useAuth();
  const data = useData();

  const { tenantId } = auth;

  const actions = useMemo(
    () => ({
      crearRuta: (d) => crearRuta(tenantId, d),
      actualizarRuta: (id, d) => actualizarRuta(tenantId, id, d),
      eliminarRuta: (id) => eliminarRuta(tenantId, id),
      crearCliente: (d) => crearCliente(tenantId, d),
      actualizarCliente: (id, d) => actualizarCliente(tenantId, id, d),
      eliminarCliente: (id) => eliminarClienteCompleto(tenantId, id),
      crearPrestamo: (d) => crearPrestamo(tenantId, d),
      actualizarPrestamo: (id, d) => actualizarPrestamo(tenantId, id, d),
      eliminarPrestamo: (id) => eliminarPrestamo(tenantId, id),
      cobrarCuota: (pid, nro) => cobrarCuota(tenantId, pid, nro),
      pagarMonto: (pid, monto) => pagarMonto(tenantId, pid, monto),
      revertirCuota: (pid, nro) => revertirCuota(tenantId, pid, nro),
      subscribeMiembros: (cb, onErr) => subscribeMiembros(tenantId, cb, onErr),
      subscribeInvitaciones: (cb, onErr) => subscribeInvitaciones(tenantId, cb, onErr),
      crearInvitacion: (d) => crearInvitacion(tenantId, d),
      eliminarInvitacion: (token) => eliminarInvitacion(tenantId, token),
      eliminarMiembro: (uid) => eliminarMiembro(tenantId, uid),
      actualizarMiembro: (uid, d) => actualizarMiembro(tenantId, uid, d),
      actualizarCapitalTotal: (monto) => actualizarCapitalTotal(tenantId, monto),
      subscribeNotas: (clienteId, cb, onErr) => subscribeNotas(tenantId, clienteId, cb, onErr),
      crearNota: (d) => crearNota(tenantId, d),
      eliminarNota: (id) => eliminarNota(tenantId, id),
    }),
    [tenantId],
  );

  const error = auth.authError || data.dataError;

  const value = useMemo(
    () => ({
      ...auth,
      ...data,
      error,
      ...actions,
    }),
    [auth, data, error, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <DataProvider>
        <AppInner>{children}</AppInner>
      </DataProvider>
    </AuthProvider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
