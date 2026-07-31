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
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { hoy } from '@/utils/calculos';
import { construirRefinanciacion } from '@/utils/refinanciacion';
import { construirExport, COLECCIONES_EXPORTABLES } from '@/utils/exportar';

// Paths planos — negocio único, sin multi-tenancy
const col = (name) => collection(db, name);
const ref = (name, id) => doc(db, name, id);
const configRef = () => doc(db, 'config', 'negocio');
const inviteRef = (token) => doc(db, 'invitaciones', token);
const memberRef = (uid) => doc(db, 'usuarios', uid);

// Autor de las operaciones (lo setea AuthContext al loguear/desloguear).
// Se estampa en movimientos y en el registro de auditoría.
let autorActual = null;
export const setAutorActual = (autor) => {
  autorActual = autor;
};
const autor = () => ({
  autorUid: autorActual?.uid ?? null,
  autorEmail: autorActual?.email ?? null,
});

// Registro de auditoría de acciones sensibles (inmutable; lo lee solo el admin).
const registrarAuditoria = (tx, data) =>
  tx.set(doc(col('auditoria')), { ...data, ...autor(), fecha: hoy(), creadoEn: serverTimestamp() });

const auditar = (data) =>
  addDoc(col('auditoria'), { ...data, ...autor(), fecha: hoy(), creadoEn: serverTimestamp() });

export const subscribeAuditoria = (cb, onError, cantidad = 100) =>
  listen(query(col('auditoria'), orderBy('creadoEn', 'desc'), limit(cantidad)), cb, onError);

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

// Milisegundos de un Timestamp de Firestore (0 si todavía está pendiente/serverTimestamp).
const millis = (ts) => (ts?.toMillis ? ts.toMillis() : 0);

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

export const actualizarPunitorio = (punitorio) =>
  setDoc(configRef(), { punitorio }, { merge: true });

const MONEDAS_VALIDAS = ['ARS', 'USD', 'MXN', 'COP', 'PEN'];

export const actualizarDatosNegocio = ({ nombre, moneda }) => {
  const data = {};
  if (nombre !== undefined) data.nombre = String(nombre).trim().slice(0, 100);
  if (moneda !== undefined) {
    if (!MONEDAS_VALIDAS.includes(moneda)) throw new Error(`Moneda inválida: ${moneda}`);
    data.moneda = moneda;
  }
  return setDoc(configRef(), data, { merge: true });
};

// ── Listeners en tiempo real ──────────────────────────────────────────────────

export const subscribeRutas = (cb, onError) => listen(col('rutas'), cb, onError);

export const subscribeClientes = (cb, onError, { rutaId, clienteId } = {}) => {
  if (clienteId) {
    // Rol cliente: escuchar solo su propio doc
    return onSnapshot(
      ref('clientes', clienteId),
      (snap) => cb(snap.exists() ? [{ id: snap.id, ...snap.data() }] : []),
      (err) => {
        console.error('[firestore]', err);
        onError?.(err);
      },
    );
  }
  const constraints = [orderBy('nombre')];
  if (rutaId) constraints.unshift(where('rutaId', '==', rutaId));
  return listen(query(col('clientes'), ...constraints), cb, onError);
};

// `rutaId` / `clienteId` no son solo un filtro de UI: las reglas de Firestore
// RECHAZAN la consulta entera si un cobrador (o un cliente) la pide sin acotar.
export const subscribePrestamos = (cb, onError, { rutaId, clienteId } = {}) => {
  const constraints = [orderBy('fechaInicio', 'desc')];
  if (clienteId) constraints.unshift(where('clienteId', '==', clienteId));
  else if (rutaId) constraints.unshift(where('rutaId', '==', rutaId));
  return listen(query(col('prestamos'), ...constraints), cb, onError);
};

export const subscribeMovimientosPorRango = (desde, hasta, cb, onError, { rutaId } = {}) => {
  const constraints = [
    where('fecha', '>=', desde),
    where('fecha', '<=', hasta),
    orderBy('fecha', 'desc'),
  ];
  if (rutaId) constraints.unshift(where('rutaId', '==', rutaId));
  return listen(query(col('movimientos'), ...constraints), cb, onError);
};

// ── Rutas ─────────────────────────────────────────────────────────────────────

export const crearRuta = (data) => addDoc(col('rutas'), { ...data, creadoEn: serverTimestamp() });

export const actualizarRuta = (id, data) => updateDoc(ref('rutas', id), data);

export const eliminarRuta = async (id) => {
  const clientesSnap = await getDocs(query(col('clientes'), where('rutaId', '==', id)));
  if (!clientesSnap.empty) {
    throw new Error(
      `No se puede eliminar: hay ${clientesSnap.size} cliente(s) asignados a esta ruta. Reasignalos primero.`,
    );
  }
  await deleteDoc(ref('rutas', id));
};

// ── Clientes ──────────────────────────────────────────────────────────────────

export const crearCliente = (data) =>
  addDoc(col('clientes'), { ...data, creadoEn: serverTimestamp() });

// Si el cliente cambia de ruta hay que arrastrar `rutaId` a sus préstamos y
// movimientos: es el campo del que dependen las reglas de Firestore. Si no se
// propaga, el cobrador de la ruta nueva no ve nada y el de la vieja sigue viendo.
export const actualizarCliente = async (id, data) => {
  const rutaNueva = data.rutaId;
  if (rutaNueva === undefined) return updateDoc(ref('clientes', id), data);

  const snapActual = await getDoc(ref('clientes', id));
  const rutaAnterior = snapActual.data()?.rutaId ?? null;
  await updateDoc(ref('clientes', id), data);
  if (rutaNueva === rutaAnterior) return;

  const [prestamosSnap, movsSnap] = await Promise.all([
    getDocs(query(col('prestamos'), where('clienteId', '==', id))),
    getDocs(query(col('movimientos'), where('clienteId', '==', id))),
  ]);
  await actualizarEnLotes([...prestamosSnap.docs, ...movsSnap.docs], { rutaId: rutaNueva });
};

export const eliminarCliente = (id) => deleteDoc(ref('clientes', id));

const LIMITE_BATCH = 499;

const commitInChunks = async (refs) => {
  for (let i = 0; i < refs.length; i += LIMITE_BATCH) {
    const batch = writeBatch(db);
    refs.slice(i, i + LIMITE_BATCH).forEach((r) => batch.delete(r));
    await batch.commit();
  }
};

const actualizarEnLotes = async (docs, data) => {
  for (let i = 0; i < docs.length; i += LIMITE_BATCH) {
    const batch = writeBatch(db);
    docs.slice(i, i + LIMITE_BATCH).forEach((d) => batch.update(d.ref, data));
    await batch.commit();
  }
};

// Borrado LÓGICO: el cliente y sus préstamos quedan marcados `archivado` y se
// ocultan de la app, pero los datos siguen ahí y la operación es reversible.
// Los movimientos NO se tocan: son el registro contable y deben seguir cuadrando
// el cierre de caja histórico.
export const eliminarClienteCompleto = async (clienteId) => {
  const clienteSnap = await getDoc(ref('clientes', clienteId));
  const prestamosSnap = await getDocs(query(col('prestamos'), where('clienteId', '==', clienteId)));

  const marca = { archivado: true, archivadoEn: hoy() };
  await actualizarEnLotes(prestamosSnap.docs, marca);
  await updateDoc(ref('clientes', clienteId), marca);

  await auditar({
    accion: 'archivar-cliente',
    clienteId,
    detalle: `Cliente "${clienteSnap.data()?.nombre ?? clienteId}" archivado junto con ${prestamosSnap.size} préstamo(s). Reversible.`,
  });
};

export const restaurarCliente = async (clienteId) => {
  const prestamosSnap = await getDocs(query(col('prestamos'), where('clienteId', '==', clienteId)));
  const marca = { archivado: false, archivadoEn: null };
  await actualizarEnLotes(prestamosSnap.docs, marca);
  await updateDoc(ref('clientes', clienteId), marca);
  await auditar({ accion: 'restaurar-cliente', clienteId, detalle: 'Cliente restaurado' });
};

// Borrado físico definitivo. Queda disponible solo para vaciar la papelera de
// forma explícita: destruye préstamos y movimientos sin retorno.
export const eliminarClienteDefinitivo = async (clienteId) => {
  const clienteSnap = await getDoc(ref('clientes', clienteId));
  const prestamosSnap = await getDocs(query(col('prestamos'), where('clienteId', '==', clienteId)));
  const movsSnap = await getDocs(query(col('movimientos'), where('clienteId', '==', clienteId)));
  const allRefs = [
    ...movsSnap.docs.map((d) => d.ref),
    ...prestamosSnap.docs.map((d) => d.ref),
    ref('clientes', clienteId),
  ];
  await commitInChunks(allRefs);
  await auditar({
    accion: 'eliminar-cliente',
    clienteId,
    detalle: `BORRADO DEFINITIVO de "${clienteSnap.data()?.nombre ?? clienteId}" con ${prestamosSnap.size} préstamo(s) y ${movsSnap.size} movimiento(s)`,
  });
};

// ── Préstamos ─────────────────────────────────────────────────────────────────

// Devuelve el `rutaId` del préstamo. Los préstamos creados antes de la
// desnormalización no lo tienen: en ese caso se lee del cliente dentro de la
// misma transacción y el llamador lo persiste (auto-reparación incremental).
const resolverRutaId = async (tx, prestamo) => {
  if (prestamo.rutaId) return prestamo.rutaId;
  if (!prestamo.clienteId) return null;
  const clienteSnap = await tx.get(ref('clientes', prestamo.clienteId));
  return clienteSnap.exists() ? (clienteSnap.data().rutaId ?? null) : null;
};

// `rutaId` se guarda desnormalizado porque es el campo sobre el que las reglas
// de Firestore aíslan al cobrador. Si el llamador no lo pasa, se deriva del cliente.
export const crearPrestamo = async (data) => {
  let { rutaId } = data;
  if (!rutaId) {
    const clienteSnap = await getDoc(ref('clientes', data.clienteId));
    rutaId = clienteSnap.data()?.rutaId ?? null;
  }
  return addDoc(col('prestamos'), {
    ...data,
    rutaId,
    estado: 'activo',
    creadoEn: serverTimestamp(),
  });
};

export const actualizarPrestamo = (id, data) => updateDoc(ref('prestamos', id), data);

// Borrado lógico (ver eliminarClienteCompleto). Los movimientos quedan intactos.
export const eliminarPrestamo = async (id) => {
  const prestamoSnap = await getDoc(ref('prestamos', id));
  await updateDoc(ref('prestamos', id), { archivado: true, archivadoEn: hoy() });
  await auditar({
    accion: 'archivar-prestamo',
    prestamoId: id,
    clienteId: prestamoSnap.data()?.clienteId ?? null,
    monto: prestamoSnap.data()?.monto ?? null,
    detalle: 'Préstamo archivado. Reversible.',
  });
};

export const restaurarPrestamo = async (id) => {
  await updateDoc(ref('prestamos', id), { archivado: false, archivadoEn: null });
  await auditar({ accion: 'restaurar-prestamo', prestamoId: id, detalle: 'Préstamo restaurado' });
};

export const eliminarPrestamoDefinitivo = async (id) => {
  const prestamoSnap = await getDoc(ref('prestamos', id));
  const movsSnap = await getDocs(query(col('movimientos'), where('prestamoId', '==', id)));
  await commitInChunks([...movsSnap.docs.map((d) => d.ref), ref('prestamos', id)]);
  await auditar({
    accion: 'eliminar-prestamo',
    prestamoId: id,
    clienteId: prestamoSnap.data()?.clienteId ?? null,
    monto: prestamoSnap.data()?.monto ?? null,
    detalle: `BORRADO DEFINITIVO del préstamo junto con ${movsSnap.size} movimiento(s)`,
  });
};

// Reestructura el saldo del préstamo en una transacción (mismo préstamo, no mueve caja).
export const refinanciarPrestamo = async (prestamoId, { interes, cuotas, frecuenciaDias }) => {
  const prestamoRef = ref('prestamos', prestamoId);
  const hoyStr = hoy();
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(prestamoRef);
    if (!snap.exists()) throw new Error('Préstamo no encontrado');
    const prestamo = { id: snap.id, ...snap.data() };
    const rutaId = await resolverRutaId(tx, prestamo);
    const { saldo, cuotasDetalle } = construirRefinanciacion(prestamo, {
      interes,
      cuotas,
      frecuenciaDias,
      fechaInicio: hoyStr,
    });
    tx.update(prestamoRef, {
      cuotasDetalle,
      estado: 'activo',
      rutaId,
      refinanciadoEn: hoyStr,
      refinanciaciones: (prestamo.refinanciaciones ?? 0) + 1,
    });
    registrarAuditoria(tx, {
      accion: 'refinanciar',
      prestamoId,
      clienteId: prestamo.clienteId ?? null,
      monto: saldo,
      detalle: `Saldo refinanciado en ${cuotas} cuotas (interés ${interes}%)`,
    });
    return { saldo, cuotasNuevas: cuotas };
  });
};

// `punitorio` ({ monto, dias }) es opcional: si viene con monto > 0 se registra
// un movimiento extra tipo 'punitorio' en la misma transacción (entra al cierre).
export const cobrarCuota = async (prestamoId, nroCuota, { punitorio } = {}) => {
  const prestamoRef = ref('prestamos', prestamoId);
  const movRef = doc(col('movimientos'));
  const hoyStr = hoy();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(prestamoRef);
    if (!snap.exists()) throw new Error('Préstamo no encontrado');

    const prestamo = snap.data();
    const rutaId = await resolverRutaId(tx, prestamo);
    const cuotaOriginal = (prestamo.cuotasDetalle ?? []).find((c) => c.nro === nroCuota);
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
      rutaId,
    });

    tx.set(movRef, {
      prestamoId,
      clienteId: prestamo.clienteId,
      rutaId,
      cuotaNro: nroCuota,
      monto: faltaPagar,
      fecha: hoyStr,
      tipo: 'cuota',
      ...autor(),
      creadoEn: serverTimestamp(),
    });

    const montoPunitorio = punitorio?.monto > 0 ? Math.round(punitorio.monto) : 0;
    if (montoPunitorio > 0) {
      tx.set(doc(col('movimientos')), {
        prestamoId,
        clienteId: prestamo.clienteId,
        rutaId,
        cuotaNro: nroCuota,
        monto: montoPunitorio,
        fecha: hoyStr,
        tipo: 'punitorio',
        diasAtraso: punitorio.dias ?? null,
        ...autor(),
        creadoEn: serverTimestamp(),
      });
    }

    return {
      movId: movRef.id,
      monto: faltaPagar,
      punitorio: montoPunitorio,
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
    const rutaId = await resolverRutaId(tx, prestamo);
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
      rutaId,
    });

    for (const { nro, montoAplicado } of afectadas) {
      const movRef = doc(col('movimientos'));
      tx.set(movRef, {
        prestamoId,
        clienteId: prestamo.clienteId,
        rutaId,
        cuotaNro: nro,
        monto: montoAplicado,
        fecha: hoyStr,
        tipo: 'pago-monto',
        ...autor(),
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
  const snap = await getDoc(memberRef(uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getExistingAdmin = async () => {
  const snap = await getDoc(doc(db, 'config', 'negocio'));
  if (!snap.exists() || !snap.data().adminUid) return null;
  return snap.data();
};

export const bootstrapAdmin = async (uid, email) => {
  console.warn('[bootstrap] Creando admin uid:', uid, 'email:', email);
  try {
    await setDoc(memberRef(uid), {
      rol: 'admin',
      rutaId: null,
      email,
      creadoEn: serverTimestamp(),
    });
    console.warn('[bootstrap] Doc /usuarios/' + uid + ' creado OK');
  } catch (err) {
    console.error('[bootstrap] FALLO al crear /usuarios/' + uid, err.code, err.message);
    throw err;
  }
  try {
    await setDoc(
      configRef(),
      {
        adminUid: uid,
        capitalTotal: 0,
        creadoEn: serverTimestamp(),
      },
      { merge: true },
    );
    console.warn('[bootstrap] Doc /config/negocio creado OK');
  } catch (err) {
    console.error('[bootstrap] FALLO al crear /config/negocio', err.code, err.message);
    throw err;
  }
};

export const repairAdminDoc = async (uid, email) => {
  console.warn('[repair] Reparando admin uid:', uid);
  try {
    await setDoc(memberRef(uid), {
      rol: 'admin',
      rutaId: null,
      email,
      creadoEn: serverTimestamp(),
    });
    console.warn('[repair] Doc /usuarios/' + uid + ' reparado OK');
  } catch (err) {
    console.error('[repair] FALLO al reparar /usuarios/' + uid, err.code, err.message);
    throw err;
  }
};

export const reclaimAdmin = async (uid, email) => {
  console.warn('[reclaim] Reclamando admin para uid:', uid);
  await setDoc(memberRef(uid), {
    rol: 'admin',
    rutaId: null,
    email,
    creadoEn: serverTimestamp(),
  });
  await setDoc(configRef(), { adminUid: uid }, { merge: true });
  console.warn('[reclaim] Admin reclamado OK');
};

export const subscribeMiembros = (cb, onError) => listen(col('usuarios'), cb, onError);

export const subscribeInvitaciones = (cb, onError) => listen(col('invitaciones'), cb, onError);

export const crearInvitacion = async ({
  email,
  rutaId,
  rol = 'cobrador',
  montoAsignado = null,
}) => {
  const validRoles = ['admin', 'cobrador', 'visitante', 'cliente'];
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
  return runTransaction(db, async (tx) => {
    const invSnap = await tx.get(inviteRef(token));
    if (!invSnap.exists()) throw new Error('La invitación no existe o ya fue usada');
    const inv = invSnap.data();

    tx.set(memberRef(uid), {
      rol: inv.rol,
      rutaId: inv.rutaId ?? null,
      montoAsignado: inv.montoAsignado ?? null,
      email,
      inviteToken: token,
      creadoEn: serverTimestamp(),
    });
    tx.delete(inviteRef(token));

    return {
      rol: inv.rol,
      rutaId: inv.rutaId ?? null,
      montoAsignado: inv.montoAsignado ?? null,
    };
  });
};

export const eliminarMiembro = (uid) => deleteDoc(memberRef(uid));

export const actualizarMiembro = (uid, data) => updateDoc(memberRef(uid), data);

// ── Notas de cliente ─────────────────────────────────────────────────────────

// Solo filtra por clienteId (índice de campo único, automático) y ordena en el cliente
// para no requerir un índice compuesto clienteId + creadoEn.
export const subscribeNotas = (clienteId, cb, onError) =>
  listen(
    query(col('notas'), where('clienteId', '==', clienteId)),
    (notas) => cb([...notas].sort((a, b) => millis(b.creadoEn) - millis(a.creadoEn))),
    onError,
  );

export const crearNota = async ({ clienteId, texto, autor, rutaId }) => {
  let ruta = rutaId;
  if (!ruta) {
    const clienteSnap = await getDoc(ref('clientes', clienteId));
    ruta = clienteSnap.data()?.rutaId ?? null;
  }
  return addDoc(col('notas'), {
    clienteId,
    rutaId: ruta,
    texto: texto.trim(),
    autor: autor ?? '',
    creadoEn: serverTimestamp(),
  });
};

export const eliminarNota = (id) => deleteDoc(ref('notas', id));

// ── Gastos ───────────────────────────────────────────────────────────────────
// Modelo: gastos/{id} → { monto, categoria, descripcion, fecha (YYYY-MM-DD),
//                         rutaId, autor, creadoEn }. Siempre asociado a una ruta.

export const subscribeGastos = (cb, onError, { rutaId } = {}) => {
  const constraints = [orderBy('fecha', 'desc')];
  if (rutaId) constraints.unshift(where('rutaId', '==', rutaId));
  return listen(query(col('gastos'), ...constraints), cb, onError);
};

export const subscribeGastosPorRango = (desde, hasta, cb, onError, { rutaId } = {}) => {
  const constraints = [
    where('fecha', '>=', desde),
    where('fecha', '<=', hasta),
    orderBy('fecha', 'desc'),
  ];
  if (rutaId) constraints.unshift(where('rutaId', '==', rutaId));
  return listen(query(col('gastos'), ...constraints), cb, onError);
};

export const crearGasto = ({ monto, categoria, descripcion, fecha, rutaId, autor }) => {
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0');
  if (!rutaId) throw new Error('Seleccioná una ruta');
  return addDoc(col('gastos'), {
    monto,
    categoria: categoria ?? 'varios',
    descripcion: descripcion?.trim() ?? '',
    fecha: fecha ?? hoy(),
    rutaId,
    autor: autor ?? '',
    creadoEn: serverTimestamp(),
  });
};

export const actualizarGasto = (id, data) => updateDoc(ref('gastos', id), data);

export const eliminarGasto = (id) => deleteDoc(ref('gastos', id));

// ── Export / backup ──────────────────────────────────────────────────────────

/**
 * Lee el negocio completo y devuelve el objeto de backup.
 * Solo lo puede correr el admin (las reglas rechazan al resto en `auditoria`
 * y en las listas sin filtro de ruta).
 */
export const exportarNegocio = async () => {
  const [configSnap, ...snaps] = await Promise.all([
    getDoc(configRef()),
    ...COLECCIONES_EXPORTABLES.map((nombre) => getDocs(col(nombre))),
  ]);

  const colecciones = Object.fromEntries(
    COLECCIONES_EXPORTABLES.map((nombre, i) => [
      nombre,
      snaps[i].docs.map((d) => ({ id: d.id, ...d.data() })),
    ]),
  );

  return construirExport({
    colecciones,
    config: configSnap.exists() ? configSnap.data() : null,
  });
};

export const revertirCuota = async (prestamoId, nroCuota) => {
  const prestamoRef = ref('prestamos', prestamoId);
  const movsQuery = query(
    col('movimientos'),
    where('prestamoId', '==', prestamoId),
    where('cuotaNro', '==', nroCuota),
  );

  // Leer movimientos ANTES de la transacción (no soporta queries dentro de tx)
  const movsSnap = await getDocs(movsQuery);
  const movRefs = movsSnap.docs.map((d) => d.ref);

  return runTransaction(db, async (tx) => {
    // Leer préstamo y verificar que los movimientos siguen existiendo dentro de la tx
    const [snap, ...movSnaps] = await Promise.all([
      tx.get(prestamoRef),
      ...movRefs.map((r) => tx.get(r)),
    ]);
    if (!snap.exists()) throw new Error('Préstamo no encontrado');

    const prestamo = snap.data();
    const rutaId = await resolverRutaId(tx, prestamo);
    const cuotas = (prestamo.cuotasDetalle ?? []).map((c) =>
      c.nro === nroCuota ? { ...c, pagada: false, fechaPago: null, pagado: 0 } : c,
    );

    tx.update(prestamoRef, {
      cuotasDetalle: cuotas,
      estado: 'activo',
      rutaId,
    });

    // Solo borrar movimientos que aún existen
    let montoRevertido = 0;
    for (const movSnap of movSnaps) {
      if (movSnap.exists()) {
        montoRevertido += movSnap.data().monto ?? 0;
        tx.delete(movSnap.ref);
      }
    }

    registrarAuditoria(tx, {
      accion: 'revertir-cuota',
      prestamoId,
      clienteId: prestamo.clienteId ?? null,
      cuotaNro: nroCuota,
      monto: montoRevertido,
      detalle: `Cobro de la cuota ${nroCuota} revertido`,
    });

    return { nroCuota, movsEliminados: movSnaps.filter((s) => s.exists()).length };
  });
};
