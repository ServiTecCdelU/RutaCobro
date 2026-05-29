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
  crearGasto,
  actualizarGasto,
  eliminarGasto,
} from '@/firebase/services';

const AppContext = createContext(null);

function AppInner({ children }) {
  const auth = useAuth();
  const data = useData();

  const actions = useMemo(
    () => ({
      crearRuta,
      actualizarRuta,
      eliminarRuta,
      crearCliente,
      actualizarCliente,
      eliminarCliente: eliminarClienteCompleto,
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
      actualizarCapitalTotal,
      subscribeNotas,
      crearNota,
      eliminarNota,
      crearGasto,
      actualizarGasto,
      eliminarGasto,
    }),
    [],
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
