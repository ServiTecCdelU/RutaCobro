import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { hoy } from '@/utils/calculos';

// Paths planos — negocio único, sin multi-tenancy
const col = (name) => collection(db, name);
const ref = (name, id) => doc(db, name, id);
const configRef = () => doc(db, 'config', 'negocio');
const userRef = (uid) => doc(db, 'users', uid);
const inviteRef = (token) => doc(db, 'invitaciones', token);
const memberRef = (uid) => doc(db, 'usuarios', uid);

const randomToken = () => {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 22);
};

const listen = (q, cb, onError) =>
  onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error('[firestore]', err);
      onError?.(err);
    },
  );

// ── Config del negocio ───────────────────────────────────────────────────────

export const subscribeNegocioConfig = (cb, onError) =>
  onSnapshot(
    configRef(),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => {
      console.error('[firestore]', err);
      onError?.(err);
    },
  );

export const actualizarCapitalTotal = (capitalTotal) =>
  setDoc(configRef(), { capitalTotal }, { merge: true });

// ── Listeners en tiempo real ──────────────────────────────────────────────────

export const subscribeRutas = (cb, onError) => listen(col('rutas'), cb, onError);

export const subscribeClientes = (cb, onError) =>
  listen(query(col('clientes'), orderBy('nombre')), cb, onError);

export const subscribePrestamos = (cb, onError) =>
  listen(query(col('prestamos'), orderBy('fechaInicio', 'desc')), cb, onError);

export const subscribeMovimientosPorRango = (desde, hasta, cb, onError) =>
  listen(
    query(
      col('movimientos'),
      where('fecha', '>=', desde),
      where('fecha', '<=', hasta),
      orderBy('fecha', 'desc'),
    ),
    cb,
    onError,
  );

// ── Rutas ─────────────────────────────────────────────────────────────────────

export const crearRuta = (data) => addDoc(col('rutas'), { ...data, creadoEn: serverTimestamp() });

export const actualizarRuta = (id, data) => updateDoc(ref('rutas', id), data);

export const eliminarRuta = (id) => deleteDoc(ref('rutas', id));

// ── Clientes ──────────────────────────────────────────────────────────────────

export const crearCliente = (data) =>
  addDoc(col('clientes'), { ...data, creadoEn: serverTimestamp() });

export const actualizarCliente = (id, data) => updateDoc(ref('clientes', id), data);

export const eliminarCliente = (id) => deleteDoc(ref('clientes', id));

export const eliminarClienteCompleto = async (clienteId) => {
  const prestamosSnap = await getDocs(query(col('prestamos'), where('clienteId', '==', clienteId)));
  const movsSnap = await getDocs(query(col('movimientos'), where('clienteId', '==', clienteId)));
  const batch = writeBatch(db);
  prestamosSnap.docs.forEach((d) => batch.delete(d.ref));
  movsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref('clientes', clienteId));
  await batch.commit();
};

// ── Préstamos ─────────────────────────────────────────────────────────────────

export const crearPrestamo = (data) =>
  addDoc(col('prestamos'), {
    ...data,
    estado: 'activo',
    creadoEn: serverTimestamp(),
  });

export const actualizarPrestamo = (id, data) => updateDoc(ref('prestamos', id), data);

export const eliminarPrestamo = async (id) => {
  const movsSnap = await getDocs(query(col('movimientos'), where('prestamoId', '==', id)));
  const batch = writeBatch(db);
  movsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref('prestamos', id));
  await batch.commit();
};

export const cobrarCuota = async (prestamoId, nroCuota) => {
  const prestamoRef = ref('prestamos', prestamoId);
  const movRef = doc(col('movimientos'));
  const hoyStr = hoy();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(prestamoRef);
    if (!snap.exists()) throw new Error('Préstamo no encontrado');

    const prestamo = snap.data();
    const cuotaOriginal = prestamo.cuotasDetalle.find((c) => c.nro === nroCuota);
    if (!cuotaOriginal) throw new Error('Cuota no encontrada');
    if (cuotaOriginal.pagada) throw new Error('La cuota ya estaba pagada');

    const pagadoAntes = cuotaOriginal.pagado ?? 0;
    const faltaPagar = cuotaOriginal.monto - pagadoAntes;

    const cuotas = prestamo.cuotasDetalle.map((c) =>
      c.nro === nroCuota ? { ...c, pagada: true, pagado: c.monto, fechaPago: hoyStr } : c,
    );
    const todasPagadas = cuotas.every((c) => c.pagada);

    tx.update(prestamoRef, {
      cuotasDetalle: cuotas,
      estado: todasPagadas ? 'finalizado' : 'activo',
    });

    tx.set(movRef, {
      prestamoId,
      clienteId: prestamo.clienteId,
      cuotaNro: nroCuota,
      monto: faltaPagar,
      fecha: hoyStr,
      tipo: 'cuota',
      creadoEn: serverTimestamp(),
    });

    return {
      movId: movRef.id,
      monto: faltaPagar,
      cuotaNro: nroCuota,
      cuotasPagadas: cuotas.filter((c) => c.pagada).length,
      cuotasTotales: cuotas.length,
      finalizado: todasPagadas,
    };
  });
};

export const pagarMonto = async (prestamoId, montoPago) => {
  if (!(montoPago > 0)) throw new Error('El monto debe ser mayor a 0');
  const prestamoRef = ref('prestamos', prestamoId);
  const hoyStr = hoy();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(prestamoRef);
    if (!snap.exists()) throw new Error('Préstamo no encontrado');

    const prestamo = snap.data();
    const cuotasOriginales = prestamo.cuotasDetalle ?? [];
    const pendiente = cuotasOriginales.reduce((s, c) => {
      const pagado = c.pagada ? (c.pagado ?? c.monto) : (c.pagado ?? 0);
      return s + (c.monto - pagado);
    }, 0);
    if (montoPago > pendiente) {
      throw new Error(`El monto supera la deuda pendiente (${pendiente})`);
    }

    let restante = montoPago;
    const afectadas = [];
    const cuotas = cuotasOriginales.map((c) => {
      if (restante <= 0) return c;
      const pagadoAntes = c.pagada ? (c.pagado ?? c.monto) : (c.pagado ?? 0);
      const falta = c.monto - pagadoAntes;
      if (falta <= 0) return c;
      const aplicar = Math.min(restante, falta);
      const nuevoPagado = pagadoAntes + aplicar;
      const ahoraPagada = nuevoPagado >= c.monto;
      restante -= aplicar;
      afectadas.push({ nro: c.nro, montoAplicado: aplicar, completada: ahoraPagada });
      return {
        ...c,
        pagado: nuevoPagado,
        pagada: ahoraPagada,
        fechaPago: ahoraPagada ? hoyStr : (c.fechaPago ?? null),
      };
    });

    const todasPagadas = cuotas.every((c) => c.pagada);
    tx.update(prestamoRef, {
      cuotasDetalle: cuotas,
      estado: todasPagadas ? 'finalizado' : 'activo',
    });

    for (const { nro, montoAplicado } of afectadas) {
      const movRef = doc(col('movimientos'));
      tx.set(movRef, {
        prestamoId,
        clienteId: prestamo.clienteId,
        cuotaNro: nro,
        monto: montoAplicado,
        fecha: hoyStr,
        tipo: 'pago-monto',
        creadoEn: serverTimestamp(),
      });
    }

    return {
      montoTotal: montoPago,
      cuotasAfectadas: afectadas,
      finalizado: todasPagadas,
    };
  });
};

// ── Equipo: usuarios, miembros, invitaciones ─────────────────────────────────

export const getUserDoc = async (uid) => {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getExistingAdmin = async () => {
  const snap = await getDoc(doc(db, 'config', 'negocio'));
  if (!snap.exists() || !snap.data().adminUid) return null;
  return snap.data();
};

export const bootstrapAdmin = async (uid, email) => {
  const batch = writeBatch(db);
  batch.set(userRef(uid), {
    rol: 'admin',
    email,
    creadoEn: serverTimestamp(),
  });
  batch.set(memberRef(uid), {
    rol: 'admin',
    rutaId: null,
    email,
    creadoEn: serverTimestamp(),
  });
  batch.set(doc(db, 'config', 'negocio'), {
    adminUid: uid,
    capitalTotal: 0,
    creadoEn: serverTimestamp(),
  });
  await batch.commit();
};

export const subscribeMiembros = (cb, onError) => listen(col('usuarios'), cb, onError);

export const subscribeInvitaciones = (cb, onError) => listen(col('invitaciones'), cb, onError);

export const crearInvitacion = async ({
  email,
  rutaId,
  rol = 'cobrador',
  montoAsignado = null,
}) => {
  const validRoles = ['cobrador', 'visitante', 'cliente'];
  if (!validRoles.includes(rol)) throw new Error(`Rol inválido: ${rol}`);
  const token = randomToken();
  await setDoc(inviteRef(token), {
    email: email?.trim().toLowerCase() ?? '',
    rol,
    rutaId: rutaId ?? null,
    montoAsignado: rol === 'cobrador' ? (montoAsignado ?? 0) : null,
    creadoEn: serverTimestamp(),
  });
  return token;
};

export const eliminarInvitacion = (token) => deleteDoc(inviteRef(token));

export const aceptarInvitacion = async (uid, email, token) => {
  const invSnap = await getDoc(inviteRef(token));
  if (!invSnap.exists()) throw new Error('La invitación no existe o ya fue usada');
  const inv = invSnap.data();

  const batch = writeBatch(db);
  batch.set(memberRef(uid), {
    rol: inv.rol,
    rutaId: inv.rutaId ?? null,
    montoAsignado: inv.montoAsignado ?? null,
    email,
    inviteToken: token,
    creadoEn: serverTimestamp(),
  });
  batch.set(userRef(uid), {
    rol: inv.rol,
    rutaId: inv.rutaId ?? null,
    montoAsignado: inv.montoAsignado ?? null,
    email,
    creadoEn: serverTimestamp(),
  });
  batch.delete(inviteRef(token));
  await batch.commit();

  return {
    rol: inv.rol,
    rutaId: inv.rutaId ?? null,
    montoAsignado: inv.montoAsignado ?? null,
  };
};

export const eliminarMiembro = (uid) => deleteDoc(memberRef(uid));

export const actualizarMiembro = (uid, data) => updateDoc(memberRef(uid), data);

// ── Notas de cliente ─────────────────────────────────────────────────────────

export const subscribeNotas = (clienteId, cb, onError) =>
  listen(
    query(col('notas'), where('clienteId', '==', clienteId), orderBy('creadoEn', 'desc')),
    cb,
    onError,
  );

export const crearNota = ({ clienteId, texto, autor }) =>
  addDoc(col('notas'), {
    clienteId,
    texto: texto.trim(),
    autor: autor ?? '',
    creadoEn: serverTimestamp(),
  });

export const eliminarNota = (id) => deleteDoc(ref('notas', id));

export const revertirCuota = async (prestamoId, nroCuota) => {
  const prestamoRef = ref('prestamos', prestamoId);
  const movsQuery = query(
    col('movimientos'),
    where('prestamoId', '==', prestamoId),
    where('cuotaNro', '==', nroCuota),
  );

  return runTransaction(db, async (tx) => {
    const [snap, movsSnap] = await Promise.all([tx.get(prestamoRef), getDocs(movsQuery)]);
    if (!snap.exists()) throw new Error('Préstamo no encontrado');

    const prestamo = snap.data();
    const cuotas = prestamo.cuotasDetalle.map((c) =>
      c.nro === nroCuota ? { ...c, pagada: false, fechaPago: null, pagado: 0 } : c,
    );

    tx.update(prestamoRef, {
      cuotasDetalle: cuotas,
      estado: 'activo',
    });

    movsSnap.docs.forEach((d) => tx.delete(d.ref));

    return { nroCuota, movsEliminados: movsSnap.size };
  });
};
