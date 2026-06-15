import { describe, it, expect, vi } from 'vitest';
import { correrAgente, MAX_ITERACIONES } from './agente.js';

// Cliente Anthropic falso: devuelve respuestas de una cola
function clientFake(respuestas) {
  const cola = [...respuestas];
  return {
    messages: {
      create: vi.fn(async () => cola.shift()),
    },
  };
}

const dbFake = {
  collection: () => ({ get: async () => ({ docs: [] }) }),
};

describe('correrAgente', () => {
  it('ejecuta una tool y reenvía el resultado, devolviendo el texto final', async () => {
    const client = clientFake([
      {
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'listar_rutas', input: {} }],
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      {
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'No hay rutas cargadas.' }],
        usage: { input_tokens: 8, output_tokens: 4 },
      },
    ]);

    const res = await correrAgente({
      client,
      db: dbFake,
      mensajes: [{ role: 'user', content: '¿Qué rutas hay?' }],
      hoyStr: '2026-06-14',
    });

    expect(res.respuesta).toBe('No hay rutas cargadas.');
    expect(res.iteraciones).toBe(2);
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });

  it('corta en MAX_ITERACIONES si el modelo nunca termina', async () => {
    const siempreTool = {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu', name: 'listar_rutas', input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
    };
    const client = clientFake(Array.from({ length: MAX_ITERACIONES + 2 }, () => siempreTool));
    const res = await correrAgente({
      client,
      db: dbFake,
      mensajes: [{ role: 'user', content: 'loop' }],
      hoyStr: '2026-06-14',
    });
    expect(res.iteraciones).toBe(MAX_ITERACIONES);
    expect(res.respuesta).toMatch(/no pude/i);
  });
});
