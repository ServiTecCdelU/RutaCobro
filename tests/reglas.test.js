import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { crearEntorno, sembrar, db, UID, RUTA, CLIENTE } from './helpers.js';

let testEnv;

beforeAll(async () => {
  testEnv = await crearEntorno();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await sembrar(testEnv);
});

const leerDoc = (uid, col, id) => getDoc(doc(db(testEnv, uid), col, id));
const listarTodo = (uid, col) => getDocs(collection(db(testEnv, uid), col));
const listarRuta = (uid, col, rutaId) =>
  getDocs(query(collection(db(testEnv, uid), col), where('rutaId', '==', rutaId)));

describe('Sin autenticar', () => {
  it('no puede leer clientes', async () => {
    await assertFails(leerDoc(null, 'clientes', CLIENTE.norte));
  });

  it('no puede leer préstamos', async () => {
    await assertFails(leerDoc(null, 'prestamos', 'prestamo-norte'));
  });
});

describe('Usuario autenticado sin membresía (intruso)', () => {
  it('no puede leer clientes', async () => {
    await assertFails(leerDoc(UID.intruso, 'clientes', CLIENTE.norte));
  });

  it('no puede leer préstamos ni movimientos', async () => {
    await assertFails(leerDoc(UID.intruso, 'prestamos', 'prestamo-norte'));
    await assertFails(leerDoc(UID.intruso, 'movimientos', 'mov-norte'));
  });

  it('no puede listar la cartera', async () => {
    await assertFails(listarTodo(UID.intruso, 'prestamos'));
  });

  it('no puede auto-asignarse el rol admin (ya hay admin)', async () => {
    await assertFails(
      setDoc(doc(db(testEnv, UID.intruso), 'usuarios', UID.intruso), {
        rol: 'admin',
        rutaId: null,
      }),
    );
  });

  it('no puede auto-asignarse rol de cobrador sin invitación', async () => {
    await assertFails(
      setDoc(doc(db(testEnv, UID.intruso), 'usuarios', UID.intruso), {
        rol: 'cobrador',
        rutaId: RUTA.norte,
      }),
    );
  });
});

describe('Admin', () => {
  it('lee toda la cartera sin filtros', async () => {
    await assertSucceeds(listarTodo(UID.admin, 'prestamos'));
    await assertSucceeds(listarTodo(UID.admin, 'clientes'));
    await assertSucceeds(listarTodo(UID.admin, 'movimientos'));
  });

  it('puede borrar un préstamo', async () => {
    await assertSucceeds(deleteDoc(doc(db(testEnv, UID.admin), 'prestamos', 'prestamo-norte')));
  });

  it('puede escribir rutas', async () => {
    await assertSucceeds(
      setDoc(doc(db(testEnv, UID.admin), 'rutas', 'ruta-nueva'), { nombre: 'Este' }),
    );
  });

  it('lee la auditoría', async () => {
    await assertSucceeds(listarTodo(UID.admin, 'auditoria'));
  });
});

describe('Cobrador — aislamiento por ruta (el hallazgo crítico)', () => {
  it('lee un cliente de SU ruta', async () => {
    await assertSucceeds(leerDoc(UID.cobradorNorte, 'clientes', CLIENTE.norte));
  });

  it('NO lee un cliente de otra ruta', async () => {
    await assertFails(leerDoc(UID.cobradorNorte, 'clientes', CLIENTE.sur));
  });

  it('NO lee un préstamo de otra ruta', async () => {
    await assertFails(leerDoc(UID.cobradorNorte, 'prestamos', 'prestamo-sur'));
  });

  it('NO lee un movimiento de otra ruta', async () => {
    await assertFails(leerDoc(UID.cobradorNorte, 'movimientos', 'mov-sur'));
  });

  it('NO puede listar la cartera completa sin filtrar por ruta', async () => {
    await assertFails(listarTodo(UID.cobradorNorte, 'prestamos'));
    await assertFails(listarTodo(UID.cobradorNorte, 'clientes'));
    await assertFails(listarTodo(UID.cobradorNorte, 'movimientos'));
  });

  it('SÍ puede listar acotando por su ruta', async () => {
    await assertSucceeds(listarRuta(UID.cobradorNorte, 'prestamos', RUTA.norte));
    await assertSucceeds(listarRuta(UID.cobradorNorte, 'clientes', RUTA.norte));
    await assertSucceeds(listarRuta(UID.cobradorNorte, 'movimientos', RUTA.norte));
  });

  it('NO puede listar pidiendo la ruta ajena', async () => {
    await assertFails(listarRuta(UID.cobradorNorte, 'prestamos', RUTA.sur));
  });

  it('NO puede crear un préstamo en otra ruta', async () => {
    await assertFails(
      setDoc(doc(db(testEnv, UID.cobradorNorte), 'prestamos', 'nuevo'), {
        clienteId: CLIENTE.sur,
        rutaId: RUTA.sur,
        monto: 50_000,
        estado: 'activo',
      }),
    );
  });

  it('SÍ puede crear un préstamo en su ruta', async () => {
    await assertSucceeds(
      setDoc(doc(db(testEnv, UID.cobradorNorte), 'prestamos', 'nuevo'), {
        clienteId: CLIENTE.norte,
        rutaId: RUTA.norte,
        monto: 50_000,
        estado: 'activo',
      }),
    );
  });

  it('NO puede mudar un cliente a su ruta para robárselo', async () => {
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.cobradorNorte), 'clientes', CLIENTE.sur),
        { rutaId: RUTA.norte },
        { merge: true },
      ),
    );
  });

  it('NO puede borrar clientes ni préstamos', async () => {
    await assertFails(deleteDoc(doc(db(testEnv, UID.cobradorNorte), 'clientes', CLIENTE.norte)));
    await assertFails(
      deleteDoc(doc(db(testEnv, UID.cobradorNorte), 'prestamos', 'prestamo-norte')),
    );
  });

  it('NO puede escribir rutas', async () => {
    await assertFails(
      setDoc(doc(db(testEnv, UID.cobradorNorte), 'rutas', RUTA.norte), { nombre: 'Hackeada' }),
    );
  });

  it('NO puede leer la auditoría', async () => {
    await assertFails(listarTodo(UID.cobradorNorte, 'auditoria'));
  });

  it('NO puede tocar gastos de otra ruta', async () => {
    await assertFails(deleteDoc(doc(db(testEnv, UID.cobradorNorte), 'gastos', 'gasto-sur')));
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.cobradorNorte), 'gastos', 'gasto-sur'),
        { monto: 1 },
        { merge: true },
      ),
    );
  });

  it('SÍ puede borrar un gasto de su ruta', async () => {
    await assertSucceeds(deleteDoc(doc(db(testEnv, UID.cobradorNorte), 'gastos', 'gasto-norte')));
  });

  it('puede revertir un cobro de su ruta (borra el movimiento)', async () => {
    await assertSucceeds(
      deleteDoc(doc(db(testEnv, UID.cobradorNorte), 'movimientos', 'mov-norte')),
    );
  });

  it('NO puede borrar un movimiento de otra ruta', async () => {
    await assertFails(deleteDoc(doc(db(testEnv, UID.cobradorNorte), 'movimientos', 'mov-sur')));
  });

  it('NO puede modificar un movimiento (son inmutables)', async () => {
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.cobradorNorte), 'movimientos', 'mov-norte'),
        { monto: 1 },
        { merge: true },
      ),
    );
  });

  it('NO puede auto-promoverse a admin', async () => {
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.cobradorNorte), 'usuarios', UID.cobradorNorte),
        { rol: 'admin' },
        { merge: true },
      ),
    );
  });

  it('NO puede cambiarse de ruta a sí mismo', async () => {
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.cobradorNorte), 'usuarios', UID.cobradorNorte),
        { rol: 'cobrador', rutaId: RUTA.sur },
        { merge: true },
      ),
    );
  });

  it('NO puede leer el doc de membresía de otro usuario', async () => {
    await assertFails(leerDoc(UID.cobradorNorte, 'usuarios', UID.cobradorSur));
  });
});

describe('Rol cliente — solo ve lo suyo', () => {
  it('lee su propio doc de cliente', async () => {
    await assertSucceeds(leerDoc(UID.cliente, 'clientes', CLIENTE.norte));
  });

  it('NO lee el doc de otro cliente', async () => {
    await assertFails(leerDoc(UID.cliente, 'clientes', CLIENTE.sur));
  });

  it('lee sus préstamos acotando por clienteId', async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(db(testEnv, UID.cliente), 'prestamos'),
          where('clienteId', '==', CLIENTE.norte),
        ),
      ),
    );
  });

  it('NO puede listar todos los préstamos', async () => {
    await assertFails(listarTodo(UID.cliente, 'prestamos'));
  });

  it('NO puede listar préstamos de otro cliente', async () => {
    await assertFails(
      getDocs(
        query(
          collection(db(testEnv, UID.cliente), 'prestamos'),
          where('clienteId', '==', CLIENTE.sur),
        ),
      ),
    );
  });

  it('NO puede crear ni modificar préstamos', async () => {
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.cliente), 'prestamos', 'prestamo-norte'),
        { monto: 1 },
        { merge: true },
      ),
    );
  });

  it('NO puede leer gastos del negocio', async () => {
    await assertFails(leerDoc(UID.cliente, 'gastos', 'gasto-norte'));
  });
});

describe('Rol visitante — solo lectura', () => {
  it('lee toda la cartera', async () => {
    await assertSucceeds(listarTodo(UID.visitante, 'prestamos'));
    await assertSucceeds(listarTodo(UID.visitante, 'clientes'));
  });

  it('NO puede escribir', async () => {
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.visitante), 'prestamos', 'prestamo-norte'),
        { monto: 1 },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(doc(db(testEnv, UID.visitante), 'clientes', 'nuevo'), {
        nombre: 'X',
        rutaId: RUTA.norte,
      }),
    );
  });

  it('NO puede leer la auditoría', async () => {
    await assertFails(listarTodo(UID.visitante, 'auditoria'));
  });
});

describe('Auditoría e invitaciones', () => {
  it('la auditoría es inmutable incluso para el admin', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'auditoria', 'a1'), { accion: 'x' });
    });
    await assertFails(
      setDoc(doc(db(testEnv, UID.admin), 'auditoria', 'a1'), { accion: 'y' }, { merge: true }),
    );
    await assertFails(deleteDoc(doc(db(testEnv, UID.admin), 'auditoria', 'a1')));
  });

  it('un cobrador no puede listar invitaciones', async () => {
    await assertFails(listarTodo(UID.cobradorNorte, 'invitaciones'));
  });

  it('un cobrador no puede borrar invitaciones ajenas', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invitaciones', 'tok1'), { rol: 'cobrador' });
    });
    await assertFails(deleteDoc(doc(db(testEnv, UID.cobradorNorte), 'invitaciones', 'tok1')));
  });

  it('un usuario nuevo sí puede consumir su invitación', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invitaciones', 'tok2'), {
        rol: 'cobrador',
        rutaId: RUTA.sur,
      });
    });
    await assertSucceeds(
      setDoc(doc(db(testEnv, UID.intruso), 'usuarios', UID.intruso), {
        rol: 'cobrador',
        rutaId: RUTA.sur,
        inviteToken: 'tok2',
      }),
    );
    await assertSucceeds(deleteDoc(doc(db(testEnv, UID.intruso), 'invitaciones', 'tok2')));
  });

  it('un usuario nuevo NO puede inflar el rol de su invitación', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invitaciones', 'tok3'), { rol: 'cobrador' });
    });
    await assertFails(
      setDoc(doc(db(testEnv, UID.intruso), 'usuarios', UID.intruso), {
        rol: 'admin',
        inviteToken: 'tok3',
      }),
    );
  });

  it('nadie puede borrar la config del negocio', async () => {
    await assertFails(deleteDoc(doc(db(testEnv, UID.admin), 'config', 'negocio')));
  });

  it('un cobrador no puede cambiar el capital del negocio', async () => {
    await assertFails(
      setDoc(
        doc(db(testEnv, UID.cobradorNorte), 'config', 'negocio'),
        { capitalTotal: 0 },
        { merge: true },
      ),
    );
  });
});
