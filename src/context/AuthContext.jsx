import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import {
  getUserDoc,
  bootstrapAdmin,
  getExistingAdmin,
  repairAdminDoc,
  reclaimAdmin,
} from '@/firebase/services';

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
      setAuthError(null);
      return;
    }

    let cancelled = false;
    let unsubListener = null;

    const startListener = (uid) => {
      const memberRef = doc(db, 'usuarios', uid);
      unsubListener = onSnapshot(
        memberRef,
        (snap) => {
          if (!cancelled) {
            setUserDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null);
            setAuthError(null);
          }
        },
        (err) => {
          console.error('[auth] listener error /usuarios/' + uid, err.code);
          // No resetear userDoc en error de listener — mantener el último estado válido
        },
      );
    };

    (async () => {
      try {
        console.warn('[auth] uid:', user.uid, '| email:', user.email);
        const existingDoc = await getUserDoc(user.uid);
        console.warn('[auth] /usuarios/' + user.uid + ':', existingDoc);

        // Caso 1: doc existe y tiene rol válido
        if (existingDoc && existingDoc.rol) {
          console.warn('[auth] rol:', existingDoc.rol);
          if (!cancelled) {
            setUserDoc(existingDoc);
            setAuthError(null);
            startListener(user.uid);
          }
          return;
        }

        // Caso 2: flujo de invitación — dejar pasar sin doc
        const params = new URLSearchParams(window.location.search);
        const isInviteFlow =
          window.location.pathname.includes('/aceptar') ||
          (params.get('next') && params.get('next').includes('/aceptar'));
        if (isInviteFlow) {
          console.warn('[auth] flujo de invitación, esperando');
          if (!cancelled) setUserDoc(null);
          return;
        }

        // Caso 3: verificar si ya hay admin configurado
        const existingAdmin = await getExistingAdmin();
        console.warn('[auth] config/negocio:', existingAdmin);

        if (existingAdmin) {
          console.warn('[auth] adminUid en config:', existingAdmin.adminUid, '| mi uid:', user.uid);
          // Caso 3a: este usuario ES el admin pero falta/corrupto su doc → reparar
          if (existingAdmin.adminUid === user.uid) {
            console.warn('[auth] → reparando doc admin');
            await repairAdminDoc(user.uid, user.email ?? '');
            if (!cancelled) {
              startListener(user.uid);
              setAuthError(null);
            }
            return;
          }

          // Caso 3b: no es el admin registrado — verificar si el admin original aún existe
          const adminOriginal = await getUserDoc(existingAdmin.adminUid);
          if (!adminOriginal) {
            console.warn('[auth] → admin original huérfano, reclamando admin para', user.uid);
            await reclaimAdmin(user.uid, user.email ?? '');
            if (!cancelled) {
              startListener(user.uid);
              setAuthError(null);
            }
            return;
          }

          // Caso 3c: emails con acceso admin directo (sin invitación)
          const adminsDirectos = ['daromdaro@gmail.com'];
          if (adminsDirectos.includes(user.email?.toLowerCase())) {
            console.warn('[auth] → admin directo por email:', user.email);
            await repairAdminDoc(user.uid, user.email);
            if (!cancelled) {
              startListener(user.uid);
              setAuthError(null);
            }
            return;
          }

          // Caso 3d: sin acceso → bloquear
          console.warn('[auth] → bloqueado: uid no coincide con adminUid');
          if (!cancelled) {
            setAuthError('No tenés acceso a este negocio. Pedile una invitación al administrador.');
            setUserDoc(null);
          }
          return;
        }

        // Caso 4: no hay config/negocio — primer usuario, bootstrap como admin
        console.warn('[auth] → primer usuario, bootstrap admin');
        await bootstrapAdmin(user.uid, user.email ?? '');
        if (!cancelled) {
          startListener(user.uid);
          setAuthError(null);
        }
      } catch (err) {
        console.error('[auth] error en init:', err);
        if (!cancelled) {
          setAuthError(`No se pudo cargar tu perfil: ${err.message}`);
          setUserDoc(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubListener?.();
    };
  }, [user]);

  const rol = userDoc?.rol;
  const rutaIdAsignada = userDoc?.rutaId ?? null;
  const clienteIdAsignado = userDoc?.clienteId ?? null;
  const esAdmin = rol === 'admin';
  const esCobrador = rol === 'cobrador';
  const esVisitante = rol === 'visitante';
  const esCliente = rol === 'cliente';
  const puedeEditar = esAdmin || esCobrador;

  const value = useMemo(
    () => ({
      user,
      userDoc,
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
      userDoc,
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
