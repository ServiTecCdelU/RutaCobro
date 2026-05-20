import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { getUserDoc, bootstrapAdmin, getExistingAdmin } from '@/firebase/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [userDoc, setUserDoc] = useState(undefined);
  const [memberDoc, setMemberDoc] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u ?? null));
  }, []);

  // Leer /users/{uid} para obtener rol base
  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      setMemberDoc(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let udoc = await getUserDoc(user.uid);
        if (!udoc) {
          const params = new URLSearchParams(window.location.search);
          const isInviteFlow =
            window.location.pathname.includes('/aceptar') ||
            (params.get('next') && params.get('next').includes('/aceptar'));
          if (isInviteFlow) {
            if (!cancelled) setUserDoc(null);
            return;
          }

          const existingAdmin = await getExistingAdmin();
          if (existingAdmin) {
            if (!cancelled) {
              setAuthError(
                'No tenés acceso a este negocio. Pedile una invitación al administrador.',
              );
              setUserDoc(null);
            }
            return;
          }

          await bootstrapAdmin(user.uid, user.email ?? '');
          udoc = { id: user.uid, rol: 'admin', email: user.email ?? '' };
        }
        if (!cancelled) setUserDoc(udoc);
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

  // Listener en tiempo real del doc de miembro (/usuarios/{uid})
  useEffect(() => {
    const uid = user?.uid;
    if (!userDoc || !uid) {
      setMemberDoc(null);
      return;
    }
    const memberRef = doc(db, 'usuarios', uid);
    return onSnapshot(
      memberRef,
      (snap) => {
        setMemberDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      () => setMemberDoc(null),
    );
  }, [userDoc, user?.uid]);

  // Mergear: memberDoc tiene la info más actualizada (el admin lo edita ahí)
  const rol = memberDoc?.rol ?? userDoc?.rol;
  const rutaIdAsignada = memberDoc?.rutaId ?? userDoc?.rutaId ?? null;
  const montoAsignado = memberDoc?.montoAsignado ?? userDoc?.montoAsignado ?? null;
  const clienteIdAsignado = memberDoc?.clienteId ?? userDoc?.clienteId ?? null;
  const esAdmin = rol === 'admin';
  const esCobrador = rol === 'cobrador';
  const esVisitante = rol === 'visitante';
  const esCliente = rol === 'cliente';
  const puedeEditar = esAdmin || esCobrador;

  // Combinar userDoc con datos frescos del memberDoc
  const mergedUserDoc = useMemo(
    () => (userDoc ? { ...userDoc, rutaId: rutaIdAsignada, montoAsignado, rol } : userDoc),
    [userDoc, rutaIdAsignada, montoAsignado, rol],
  );

  const value = useMemo(
    () => ({
      user,
      userDoc: mergedUserDoc,
      rol,
      rutaIdAsignada,
      clienteIdAsignado,
      esAdmin,
      esCobrador,
      esVisitante,
      esCliente,
      puedeEditar,
      authError,
    }),
    [
      user,
      mergedUserDoc,
      rol,
      rutaIdAsignada,
      clienteIdAsignado,
      esAdmin,
      esCobrador,
      esVisitante,
      esCliente,
      puedeEditar,
      authError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
