#!/usr/bin/env node
/* eslint-disable no-console -- script de CLI: la consola ES la interfaz */
/**
 * Migración: desnormalizar `rutaId` en prestamos, movimientos y notas.
 *
 * Las reglas de Firestore aíslan al cobrador por `rutaId`. Los documentos
 * creados antes de esta migración no tienen ese campo y quedarían invisibles
 * para su cobrador. Este script los completa leyendo la ruta del cliente.
 *
 * ORDEN OBLIGATORIO DE DEPLOY (ver PLAN_HARDENING.md, tarea 1.11):
 *   1. Deployar el código nuevo (ya escribe rutaId en las altas).
 *   2. Correr esta migración.
 *   3. Recién entonces: firebase deploy --only firestore:rules,firestore:indexes
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run migrar:rutaid -- --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run migrar:rutaid
 *
 * Contra el emulador:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run migrar:rutaid
 *
 * Es idempotente: correrlo dos veces no cambia nada la segunda vez.
 */
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'ciudalemana';
const LIMITE_BATCH = 400;

function credencial() {
  if (process.env.FIRESTORE_EMULATOR_HOST) return undefined;
  const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!ruta) {
    console.error(
      'Falta GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON de la cuenta de servicio).\n' +
        'Descargalo en: consola de Firebase → Configuración → Cuentas de servicio.',
    );
    process.exit(1);
  }
  try {
    return cert(JSON.parse(readFileSync(ruta, 'utf8')));
  } catch {
    return applicationDefault();
  }
}

initializeApp({ credential: credencial(), projectId: PROJECT_ID });
const db = getFirestore();

async function mapaRutasPorCliente() {
  const snap = await db.collection('clientes').get();
  const mapa = new Map();
  const sinRuta = [];
  for (const d of snap.docs) {
    const rutaId = d.data().rutaId ?? null;
    mapa.set(d.id, rutaId);
    if (!rutaId) sinRuta.push({ id: d.id, nombre: d.data().nombre ?? '(sin nombre)' });
  }
  return { mapa, sinRuta };
}

async function migrarColeccion(nombre, mapa) {
  const snap = await db.collection(nombre).get();
  const pendientes = [];
  const huerfanos = [];

  for (const d of snap.docs) {
    const data = d.data();
    if (data.rutaId) continue;
    const rutaId = mapa.get(data.clienteId);
    if (!rutaId) {
      huerfanos.push({ id: d.id, clienteId: data.clienteId ?? '(sin clienteId)' });
      continue;
    }
    pendientes.push({ ref: d.ref, rutaId });
  }

  if (!DRY_RUN) {
    for (let i = 0; i < pendientes.length; i += LIMITE_BATCH) {
      const batch = db.batch();
      for (const { ref, rutaId } of pendientes.slice(i, i + LIMITE_BATCH)) {
        batch.update(ref, { rutaId });
      }
      await batch.commit();
      process.stdout.write(
        `  ${nombre}: ${Math.min(i + LIMITE_BATCH, pendientes.length)}/${pendientes.length}\r`,
      );
    }
  }

  return { total: snap.size, actualizados: pendientes.length, huerfanos };
}

async function main() {
  console.log(`\nMigración rutaId — proyecto: ${PROJECT_ID}`);
  console.log(DRY_RUN ? 'MODO SIMULACIÓN (no escribe nada)\n' : 'MODO ESCRITURA\n');

  const { mapa, sinRuta } = await mapaRutasPorCliente();
  console.log(`Clientes leídos: ${mapa.size}`);
  if (sinRuta.length) {
    console.log(`\n⚠  ${sinRuta.length} cliente(s) SIN ruta asignada:`);
    sinRuta.forEach((c) => console.log(`   · ${c.nombre} (${c.id})`));
    console.log('   Sus préstamos y movimientos quedarán sin rutaId y solo los verá el admin.');
    console.log('   Asignales una ruta desde la app y volvé a correr la migración.\n');
  }

  const reporte = {};
  for (const coleccion of ['prestamos', 'movimientos', 'notas']) {
    reporte[coleccion] = await migrarColeccion(coleccion, mapa);
  }

  console.log('\n─────────────────────────────────────────────');
  for (const [coleccion, r] of Object.entries(reporte)) {
    console.log(
      `${coleccion.padEnd(14)} ${String(r.actualizados).padStart(5)} actualizados / ${r.total} totales`,
    );
    if (r.huerfanos.length) {
      console.log(`   ⚠  ${r.huerfanos.length} sin cliente resoluble:`);
      r.huerfanos
        .slice(0, 10)
        .forEach((h) => console.log(`      · ${h.id} → cliente ${h.clienteId}`));
      if (r.huerfanos.length > 10) console.log(`      … y ${r.huerfanos.length - 10} más`);
    }
  }
  console.log('─────────────────────────────────────────────');

  const totalHuerfanos = Object.values(reporte).reduce((s, r) => s + r.huerfanos.length, 0);
  if (DRY_RUN) {
    console.log('\nSimulación terminada. Volvé a correr sin --dry-run para aplicar.');
  } else if (totalHuerfanos > 0 || sinRuta.length > 0) {
    console.log('\n⚠  Migración aplicada CON pendientes. Revisá las advertencias de arriba');
    console.log('   ANTES de deployar las reglas, o esos datos quedarán inaccesibles.');
    process.exitCode = 2;
  } else {
    console.log('\n✅ Migración completa y sin pendientes. Ya podés deployar las reglas:');
    console.log('   firebase deploy --only firestore:rules,firestore:indexes');
  }
}

main().catch((err) => {
  console.error('\nLa migración falló:', err);
  process.exit(1);
});
