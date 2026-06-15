import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { correrAgente } from './lib/agente.js';
import { hoy } from './lib/calculos.js';

initializeApp();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MAX_MENSAJES = 20;

// Sanea el historial que manda el cliente: solo roles user/assistant con texto.
function sanearMensajes(mensajes) {
  if (!Array.isArray(mensajes)) return [];
  return mensajes
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MENSAJES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

export const asistenteIA = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');

  const db = getFirestore();
  const miembro = await db.collection('usuarios').doc(request.auth.uid).get();
  if (!miembro.exists || miembro.data().rol !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo el administrador puede usar el asistente.');
  }

  const mensajes = sanearMensajes(request.data?.mensajes);
  if (mensajes.length === 0 || mensajes[mensajes.length - 1].role !== 'user') {
    throw new HttpsError('invalid-argument', 'Falta el mensaje del usuario.');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
  try {
    const { respuesta, uso, iteraciones } = await correrAgente({
      client,
      db,
      mensajes,
      hoyStr: hoy(),
    });
    return { respuesta, uso, iteraciones };
  } catch (err) {
    console.error('[asistenteIA]', err);
    throw new HttpsError('internal', 'No se pudo procesar la consulta.');
  }
});
