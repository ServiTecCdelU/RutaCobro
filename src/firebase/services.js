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

const col = (tenantId, name) => collection(db, `tenants/${tenantId}/${name}`);
const ref = (tenantId, name, id) => doc(db, `tenants/${tenantId}/${name}`, id);
const userRef = (uid) => doc(db, 'users', uid);
const inviteRef = (tid, token) => doc(db, `tenants/${tid}/invitaciones`, token);
const memberRef = (tid, uid) => doc(db, `tenants/${tid}/usuarios`, uid);

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

// ── Listeners en tiempo real ──────────────────────────────────────────────────

export const subscribeRutas = (tenantId, cb, onError) =>
  listen(col(tenantId, 'rutas'), cb, onError);

export const subscribeClientes = (tenantId, cb, onError) =>
  listen(query(col(tenantId, 'clientes'), orderBy('nombre')), cb, onError);

export const subscribePrestamos = (tenantId, cb, onError) =>
  listen(query(col(tenantId, 'prestamos'), orderBy('fechaInicio', 'desc')), cb, onError);

export const subscribeMovimientosPorRango = (tenantId, desde, hasta, cb, onError) =>
  listen(
    query(
      col(tenantId, 'movimientos'),
      where('fecha', '>=', desde),
      where('fecha', '<=', hasta),
      orderBy('fecha', 'desc'),
    ),
    cb,
    onError,
  );

// ── Rutas ─────────────────────────────────────────────────────────────────────

export const crearRuta = (tenantId, data) =>
  addDoc(col(tenantId, 'rutas'), { ...data, creadoEn: serverTimestamp() });

export const actualizarRuta = (tenantId, id, data) => updateDoc(ref(tenantId, 'rutas', id), data);

export const eliminarRuta = (tenantId, id) => deleteDoc(ref(tenantId, 'rutas', id));

// ── Clientes ──────────────────────────────────────────────────────────────────

export const crearCliente = (tenantId, data) =>
  addDoc(col(tenantId, 'clientes'), { ...data, creadoEn: serverTimestamp() });

export const actualizarCliente = (tenantId, id, data) =>
  updateDoc(ref(tenantId, 'clientes', id), data);

export const eliminarCliente = (tenantId, id) => deleteDoc(ref(tenantId, 'clientes', id));

export const eliminarClienteCompleto = async (tenantId, clienteId) => {
  const prestamosSnap = await getDocs(
    query(col(tenantId, 'prestamos'), where('clienteId', '==', clienteId)),
  );
  const movsSnap = await getDocs(
    query(col(tenantId, 'movimientos'), where('clienteId', '==', clienteId)),
  );
  const batch = writeBatch(db);
  prestamosSnap.docs.forEach((d) => batch.delete(d.ref));
  movsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref(tenantId, 'clientes', clienteId));
  await batch.commit();
};

// ── Préstamos ─────────────────────────────────────────────────────────────────

export const crearPrestamo = (tenantId, data) =>
  addDoc(col(tenantId, 'prestamos'), {
    ...data,
    estado: 'activo',
    creadoEn: serverTimestamp(),
  });

export const actualizarPrestamo = (tenantId, id, data) =>
  updateDoc(ref(tenantId, 'prestamos', id), data);

export const eliminarPrestamo = async (tenantId, id) => {
  const movsSnap = await getDocs(
    query(col(tenantId, 'movimientos'), where('prestamoId', '==', id)),
  );
  const batch = writeBatch(db);
  movsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref(tenantId, 'prestamos', id));
  await batch.commit();
};

export const cobrarCuota = async (tenantId, prestamoId, nroCuota) => {
  const prestamoRef = ref(tenantId, 'prestamos', prestamoId);
  const movRef = doc(col(tenantId, 'movimientos'));
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
      tipo: 'cobro-cuota',
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

export const pagarMonto = async (tenantId, prestamoId, montoPago) => {
  if (!(montoPago > 0)) throw new Error('El monto debe ser mayor a 0');
  const prestamoRef = ref(tenantId, 'prestamos', prestamoId);
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
      const movRef = doc(col(tenantId, 'movimientos'));
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

export const bootstrapAdmin = async (uid, email) => {
  const batch = writeBatch(db);
  batch.set(userRef(uid), {
    tenantId: uid,
    rol: 'admin',
    email,
    creadoEn: serverTimestamp(),
  });
  batch.set(memberRef(uid, uid), {
    rol: 'admin',
    rutaId: null,
    email,
    creadoEn: serverTimestamp(),
  });
  await batch.commit();
};

export const subscribeMiembros = (tenantId, cb, onError) =>
  listen(col(tenantId, 'usuarios'), cb, onError);

export const subscribeInvitaciones = (tenantId, cb, onError) =>
  listen(col(tenantId, 'invitaciones'), cb, onError);

export const crearInvitacion = async (tenantId, { email, rutaId, rol = 'cobrador' }) => {
  const validRoles = ['cobrador', 'visitante', 'cliente'];
  if (!validRoles.includes(rol)) throw new Error(`Rol inválido: ${rol}`);
  const token = randomToken();
  await setDoc(inviteRef(tenantId, token), {
    email: email?.trim().toLowerCase() ?? '',
    rol,
    rutaId: rutaId ?? null,
    creadoEn: serverTimestamp(),
  });
  return token;
};

export const eliminarInvitacion = (tenantId, token) => deleteDoc(inviteRef(tenantId, token));

export const aceptarInvitacion = async (uid, email, tenantId, token) => {
  const invSnap = await getDoc(inviteRef(tenantId, token));
  if (!invSnap.exists()) throw new Error('La invitación no existe o ya fue usada');
  const inv = invSnap.data();

  const batch = writeBatch(db);
  batch.set(memberRef(tenantId, uid), {
    rol: inv.rol,
    rutaId: inv.rutaId ?? null,
    email,
    inviteToken: token,
    creadoEn: serverTimestamp(),
  });
  batch.set(userRef(uid), {
    tenantId,
    rol: inv.rol,
    email,
    creadoEn: serverTimestamp(),
  });
  batch.delete(inviteRef(tenantId, token));
  await batch.commit();

  return { tenantId, rol: inv.rol, rutaId: inv.rutaId ?? null };
};

export const eliminarMiembro = (tenantId, uid) => deleteDoc(memberRef(tenantId, uid));

export const actualizarMiembro = (tenantId, uid, data) => updateDoc(memberRef(tenantId, uid), data);

// ── Notas de cliente ─────────────────────────────────────────────────────────

export const subscribeNotas = (tenantId, clienteId, cb, onError) =>
  listen(
    query(col(tenantId, 'notas'), where('clienteId', '==', clienteId), orderBy('creadoEn', 'desc')),
    cb,
    onError,
  );

export const crearNota = (tenantId, { clienteId, texto, autor }) =>
  addDoc(col(tenantId, 'notas'), {
    clienteId,
    texto: texto.trim(),
    autor: autor ?? '',
    creadoEn: serverTimestamp(),
  });

export const eliminarNota = (tenantId, id) => deleteDoc(ref(tenantId, 'notas', id));

export const revertirCuota = async (tenantId, prestamoId, nroCuota) => {
  const prestamoRef = ref(tenantId, 'prestamos', prestamoId);
  const movsQuery = query(
    col(tenantId, 'movimientos'),
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
