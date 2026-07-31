import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { setDoc, doc } from 'firebase/firestore';

export const PROJECT_ID = 'rutacobro-test';

export const UID = {
  admin: 'uid-admin',
  cobradorNorte: 'uid-cobrador-norte',
  cobradorSur: 'uid-cobrador-sur',
  visitante: 'uid-visitante',
  cliente: 'uid-cliente',
  intruso: 'uid-intruso', // autenticado pero sin doc en /usuarios
};

export const RUTA = { norte: 'ruta-norte', sur: 'ruta-sur' };
export const CLIENTE = { norte: 'cli-norte', sur: 'cli-sur' };

export async function crearEntorno() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

/**
 * Siembra el estado base: un negocio con admin, dos rutas, un cobrador por ruta,
 * un visitante, un cliente y un préstamo + movimiento en cada ruta.
 * Se escribe con reglas desactivadas para no depender de ellas al preparar.
 */
export async function sembrar(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const set = (path, id, data) => setDoc(doc(db, path, id), data);

    await set('config', 'negocio', { adminUid: UID.admin, capitalTotal: 1_000_000 });

    await set('usuarios', UID.admin, { rol: 'admin', rutaId: null, email: 'admin@test.com' });
    await set('usuarios', UID.cobradorNorte, {
      rol: 'cobrador',
      rutaId: RUTA.norte,
      email: 'norte@test.com',
    });
    await set('usuarios', UID.cobradorSur, {
      rol: 'cobrador',
      rutaId: RUTA.sur,
      email: 'sur@test.com',
    });
    await set('usuarios', UID.visitante, { rol: 'visitante', rutaId: null });
    await set('usuarios', UID.cliente, {
      rol: 'cliente',
      rutaId: RUTA.norte,
      clienteId: CLIENTE.norte,
    });

    await set('rutas', RUTA.norte, { nombre: 'Norte', color: '#3b82f6' });
    await set('rutas', RUTA.sur, { nombre: 'Sur', color: '#ef4444' });

    await set('clientes', CLIENTE.norte, {
      nombre: 'Ana Norte',
      dni: '30111222',
      tel: '3400111',
      rutaId: RUTA.norte,
    });
    await set('clientes', CLIENTE.sur, {
      nombre: 'Beto Sur',
      dni: '30333444',
      tel: '3400222',
      rutaId: RUTA.sur,
    });

    for (const [suf, rutaId, clienteId] of [
      ['norte', RUTA.norte, CLIENTE.norte],
      ['sur', RUTA.sur, CLIENTE.sur],
    ]) {
      await set('prestamos', `prestamo-${suf}`, {
        clienteId,
        rutaId,
        monto: 100_000,
        interes: 20,
        cuotas: 4,
        fechaInicio: '2026-07-01',
        frecuenciaDias: 7,
        estado: 'activo',
        cuotasDetalle: [
          { nro: 1, monto: 30_000, vencimiento: '2026-07-08', pagada: false, fechaPago: null },
          { nro: 2, monto: 30_000, vencimiento: '2026-07-15', pagada: false, fechaPago: null },
          { nro: 3, monto: 30_000, vencimiento: '2026-07-22', pagada: false, fechaPago: null },
          { nro: 4, monto: 30_000, vencimiento: '2026-07-29', pagada: false, fechaPago: null },
        ],
      });
      await set('movimientos', `mov-${suf}`, {
        prestamoId: `prestamo-${suf}`,
        clienteId,
        rutaId,
        cuotaNro: 1,
        monto: 30_000,
        fecha: '2026-07-08',
        tipo: 'cuota',
      });
      await set('gastos', `gasto-${suf}`, {
        monto: 5_000,
        categoria: 'combustible',
        fecha: '2026-07-10',
        rutaId,
      });
      await set('notas', `nota-${suf}`, { clienteId, rutaId, texto: 'nota', autor: 'x' });
    }
  });
}

export const db = (testEnv, uid) =>
  uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore();
