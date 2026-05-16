import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getUserDoc, bootstrapAdmin } from '@/firebase/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [userDoc, setUserDoc] = useState(undefined);
  const [authError, setAuthError] = useState(null);

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
          setAuthError(`No se pudo cargar tu perfil: ${err.message}`);
          setUserDoc(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tenantId = userDoc?.tenantId;
  const rol = userDoc?.rol;
  const rutaIdAsignada = userDoc?.rutaId ?? null;
  const clienteIdAsignado = userDoc?.clienteId ?? null;
  const esAdmin = rol === 'admin';
  const esCobrador = rol === 'cobrador';
  const esVisitante = rol === 'visitante';
  const esCliente = rol === 'cliente';
  const puedeEditar = esAdmin || esCobrador;

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        tenantId,
        rol,
        rutaIdAsignada,
        clienteIdAsignado,
        esAdmin,
        esCobrador,
        esVisitante,
        esCliente,
        puedeEditar,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
