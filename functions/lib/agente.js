import { definicionesTools, ejecutarTool } from './herramientas.js';

export const MAX_ITERACIONES = 6;
const MODELO = process.env.MODELO_IA || 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

const SYSTEM = `Sos el asistente del administrador de RutaCobro, un sistema de gestión de
préstamos organizados por rutas de cobro. Respondés en español, de forma concisa y accionable.

Contexto del dominio:
- Los préstamos tienen estado activo, mora o finalizado, y un arreglo de cuotas (cuotasDetalle).
- "Mora" = cuota vencida e impaga. "En calle" = capital de préstamos activos/mora.
- Hay un score interno por cliente y una verificación crediticia BCRA.
- Los montos están en la moneda del negocio.

Reglas:
- Usá SIEMPRE las herramientas para obtener cifras reales. NUNCA inventes números.
- Si no hay datos, decilo claramente.
- No tenés herramientas de escritura: solo podés consultar e informar.`;

// Convierte el resultado de una tool en un bloque tool_result para Claude.
const toolResult = (id, data) => ({
  type: 'tool_result',
  tool_use_id: id,
  content: JSON.stringify(data),
});

export async function correrAgente({ client, db, mensajes, hoyStr }) {
  const conv = [...mensajes];
  let uso = { input_tokens: 0, output_tokens: 0 };
  let iteraciones = 0;

  while (iteraciones < MAX_ITERACIONES) {
    iteraciones += 1;
    const resp = await client.messages.create({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      tools: definicionesTools,
      messages: conv,
    });
    uso = {
      input_tokens: uso.input_tokens + (resp.usage?.input_tokens ?? 0),
      output_tokens: uso.output_tokens + (resp.usage?.output_tokens ?? 0),
    };

    if (resp.stop_reason !== 'tool_use') {
      const texto = (resp.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { respuesta: texto, iteraciones, uso };
    }

    // Agregar el turno del asistente y ejecutar las tools pedidas.
    conv.push({ role: 'assistant', content: resp.content });
    const usos = resp.content.filter((b) => b.type === 'tool_use');
    const resultados = [];
    for (const u of usos) {
      try {
        const data = await ejecutarTool(db, u.name, u.input, hoyStr);
        resultados.push(toolResult(u.id, data));
      } catch (err) {
        resultados.push({ ...toolResult(u.id, { error: err.message }), is_error: true });
      }
    }
    conv.push({ role: 'user', content: resultados });
  }

  return {
    respuesta: 'No pude completar la consulta (demasiados pasos). Probá reformular la pregunta.',
    iteraciones,
    uso,
  };
}
