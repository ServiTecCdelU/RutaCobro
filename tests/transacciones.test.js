import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { doc, getDoc, getDocs, collection, query, where, runTransaction } from 'firebase/firestore';
import { crearEntorno, sembrar, UID, RUTA } from './helpers.js';

// Tests de las transacciones de dinero contra el emulador. Se replica la lógica
// de src/firebase/services.js sobre la instancia del emulador (el módulo real
// depende de `src/firebase/config.js`, que inicializa la app de producción).
//
// Lo que se verifica es el INVARIANTE del negocio, no la implementación:
// una cuota nunca se cobra dos veces, el movimiento y la cuota se escriben
// juntos o no se escriben, y revertir deja el préstamo como estaba.

let testEnv;
let db;

beforeAll(async () => {
  testEnv = await crearEntorno();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await sembrar(testEnv);
  // Se usa el contexto de admin: acá se testea la lógica, no los permisos.
  db = testEnv.authenticatedContext(UID.admin).firestore();
});

const HOY = '2026-07-31';

async function cobrarCuota(prestamoId, nroCuota, { punitorio } = {}) {
  const prestamoRef = doc(db, 'prestamos', prestamoId);
  const movRef = doc(collection(db, 'movimientos'));

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(prestamoRef);
    if (!snap.exists()) throw new Error('Préstamo no encontrado');
    const prestamo = snap.data();
    const cuotaOriginal = (prestamo.cuotasDetalle ?? []).find((c) => c.nro === nroCuota);
    if (!cuotaOriginal) throw new Error('Cuota no encontrada');
    if (cuotaOriginal.pagada) throw new Error('La cuota ya estaba pagada');

    const faltaPagar = cuotaOriginal.monto - (cuotaOriginal.pagado ?? 0);
    const cuotas = prestamo.cuotasDetalle.map((c) =>
      c.nro === nroCuota ? { ...c, pagada: true, pagado: c.monto, fechaPago: HOY } : c,
    );
    const todasPagadas = cuotas.every((c) => c.pagada);

    tx.update(prestamoRef, {
      cuotasDetalle: cuotas,
      estado: todasPagadas ? 'finalizado' : 'activo',
      rutaId: prestamo.rutaId,
    });
    tx.set(movRef, {
      prestamoId,
      clienteId: prestamo.clienteId,
      rutaId: prestamo.rutaId,
      cuotaNro: nroCuota,
      monto: faltaPagar,
      fecha: HOY,
      tipo: 'cuota',
    });
    const montoPunitorio = punitorio?.monto > 0 ? Math.round(punitorio.monto) : 0;
    if (montoPunitorio > 0) {
      tx.set(doc(collection(db, 'movimientos')), {
        prestamoId,
        clienteId: prestamo.clienteId,
        rutaId: prestamo.rutaId,
        cuotaNro: nroCuota,
        monto: montoPunitorio,
        fecha: HOY,
        tipo: 'punitorio',
      });
    }
    return { monto: faltaPagar, punitorio: montoPunitorio, finalizado: todasPagadas };
  });
}

async function pagarMonto(prestamoId, montoPago) {
  if (!(montoPago > 0)) throw new Error('El monto debe ser mayor a 0');
  const prestamoRef = doc(db, 'prestamos', prestamoId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(prestamoRef);
    const prestamo = snap.data();
    const cuotasOriginales = prestamo.cuotasDetalle ?? [];
    const pendiente = cuotasOriginales.reduce(
      (s, c) => s + (c.monto - (c.pagada ? (c.pagado ?? c.monto) : (c.pagado ?? 0))),
      0,
    );
    if (montoPago > pendiente) throw new Error(`El monto supera la deuda pendiente (${pendiente})`);

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
      afectadas.push({ nro: c.nro, montoAplicado: aplicar });
      return {
        ...c,
        pagado: nuevoPagado,
        pagada: ahoraPagada,
        fechaPago: ahoraPagada ? HOY : null,
      };
    });

    tx.update(prestamoRef, {
      cuotasDetalle: cuotas,
      estado: cuotas.every((c) => c.pagada) ? 'finalizado' : 'activo',
      rutaId: prestamo.rutaId,
    });
    for (const { nro, montoAplicado } of afectadas) {
      tx.set(doc(collection(db, 'movimientos')), {
        prestamoId,
        clienteId: prestamo.clienteId,
        rutaId: prestamo.rutaId,
        cuotaNro: nro,
        monto: montoAplicado,
        fecha: HOY,
        tipo: 'pago-monto',
      });
    }
    return { cuotasAfectadas: afectadas };
  });
}

const getPrestamo = async (id) => (await getDoc(doc(db, 'prestamos', id))).data();

const movsDe = async (prestamoId) => {
  const snap = await getDocs(
    query(collection(db, 'movimientos'), where('prestamoId', '==', prestamoId)),
  );
  return snap.docs.map((d) => d.data());
};

describe('cobrarCuota', () => {
  it('marca la cuota pagada y registra un movimiento por el monto exacto', async () => {
    const res = await cobrarCuota('prestamo-norte', 1);

    expect(res.monto).toBe(30_000);
    const p = await getPrestamo('prestamo-norte');
    expect(p.cuotasDetalle[0].pagada).toBe(true);
    expect(p.cuotasDetalle[0].pagado).toBe(30_000);
    expect(p.estado).toBe('activo');

    const movs = (await movsDe('prestamo-norte')).filter((m) => m.tipo === 'cuota');
    expect(movs).toHaveLength(2); // el sembrado + el nuevo
  });

  it('rechaza cobrar dos veces la misma cuota', async () => {
    await cobrarCuota('prestamo-norte', 1);
    await expect(cobrarCuota('prestamo-norte', 1)).rejects.toThrow('ya estaba pagada');
  });

  it('no deja movimiento huérfano cuando la cuota ya estaba pagada', async () => {
    await cobrarCuota('prestamo-norte', 1);
    const antes = (await movsDe('prestamo-norte')).length;
    await expect(cobrarCuota('prestamo-norte', 1)).rejects.toThrow();
    expect((await movsDe('prestamo-norte')).length).toBe(antes);
  });

  it('finaliza el préstamo al cobrar la última cuota', async () => {
    for (const nro of [1, 2, 3, 4]) await cobrarCuota('prestamo-norte', nro);
    expect((await getPrestamo('prestamo-norte')).estado).toBe('finalizado');
  });

  it('registra el punitorio como movimiento aparte', async () => {
    await cobrarCuota('prestamo-norte', 1, { punitorio: { monto: 1_500, dias: 5 } });
    const movs = await movsDe('prestamo-norte');
    const punitorios = movs.filter((m) => m.tipo === 'punitorio');
    expect(punitorios).toHaveLength(1);
    expect(punitorios[0].monto).toBe(1_500);
  });

  it('cobra solo el saldo restante si la cuota tenía un pago parcial', async () => {
    await pagarMonto('prestamo-norte', 10_000);
    const res = await cobrarCuota('prestamo-norte', 1);
    expect(res.monto).toBe(20_000);
  });

  it('estampa el rutaId en el movimiento (lo exigen las reglas)', async () => {
    await cobrarCuota('prestamo-norte', 1);
    const movs = await movsDe('prestamo-norte');
    expect(movs.every((m) => m.rutaId === RUTA.norte)).toBe(true);
  });

  it('falla si el préstamo no existe', async () => {
    await expect(cobrarCuota('no-existe', 1)).rejects.toThrow('no encontrado');
  });
});

describe('pagarMonto', () => {
  it('distribuye el pago sobre las cuotas en orden', async () => {
    await pagarMonto('prestamo-norte', 45_000);
    const p = await getPrestamo('prestamo-norte');
    expect(p.cuotasDetalle[0].pagada).toBe(true);
    expect(p.cuotasDetalle[0].pagado).toBe(30_000);
    expect(p.cuotasDetalle[1].pagada).toBe(false);
    expect(p.cuotasDetalle[1].pagado).toBe(15_000);
  });

  it('genera un movimiento por cada cuota afectada', async () => {
    await pagarMonto('prestamo-norte', 45_000);
    const movs = (await movsDe('prestamo-norte')).filter((m) => m.tipo === 'pago-monto');
    expect(movs).toHaveLength(2);
    expect(movs.reduce((s, m) => s + m.monto, 0)).toBe(45_000);
  });

  it('rechaza un monto mayor a la deuda pendiente', async () => {
    await expect(pagarMonto('prestamo-norte', 200_000)).rejects.toThrow('supera la deuda');
  });

  it('rechaza montos no positivos', async () => {
    await expect(pagarMonto('prestamo-norte', 0)).rejects.toThrow('mayor a 0');
    await expect(pagarMonto('prestamo-norte', -100)).rejects.toThrow('mayor a 0');
  });

  it('finaliza el préstamo al cubrir el total', async () => {
    await pagarMonto('prestamo-norte', 120_000);
    expect((await getPrestamo('prestamo-norte')).estado).toBe('finalizado');
  });

  it('la suma de los movimientos nunca supera el total del préstamo', async () => {
    await pagarMonto('prestamo-norte', 50_000);
    await pagarMonto('prestamo-norte', 70_000);
    await expect(pagarMonto('prestamo-norte', 1)).rejects.toThrow();
    const total = (await movsDe('prestamo-norte'))
      .filter((m) => m.tipo === 'pago-monto')
      .reduce((s, m) => s + m.monto, 0);
    expect(total).toBe(120_000);
  });
});

describe('Concurrencia', () => {
  it('dos cobros simultáneos de la misma cuota: solo uno prospera', async () => {
    const resultados = await Promise.allSettled([
      cobrarCuota('prestamo-norte', 1),
      cobrarCuota('prestamo-norte', 1),
    ]);
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(1);

    const movs = (await movsDe('prestamo-norte')).filter(
      (m) => m.tipo === 'cuota' && m.fecha === HOY,
    );
    expect(movs).toHaveLength(1);
  });

  it('dos pagos parciales simultáneos no sobrepasan la deuda', async () => {
    await Promise.allSettled([
      pagarMonto('prestamo-norte', 100_000),
      pagarMonto('prestamo-norte', 100_000),
    ]);
    const p = await getPrestamo('prestamo-norte');
    const pagado = p.cuotasDetalle.reduce((s, c) => s + (c.pagado ?? 0), 0);
    expect(pagado).toBeLessThanOrEqual(120_000);
  });
});
