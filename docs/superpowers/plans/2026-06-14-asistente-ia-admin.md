# Asistente IA para el admin (C6) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un panel de chat flotante (solo admin) que responde preguntas sobre la cartera vía una Cloud Function callable que corre un loop de agente con Claude Haiku 4.5 y herramientas de **solo lectura** sobre Firestore.

**Architecture:** Frontend (`httpsCallable`) → Cloud Function `asistenteIA` (valida rol admin server-side, corre el loop de tool use con el SDK de Anthropic) → herramientas que consultan Firestore con el Admin SDK. La API key vive como secreto de Functions, nunca en el browser.

**Tech Stack:** Firebase Cloud Functions v2 (Node 20) · `firebase-admin` · `@anthropic-ai/sdk` · modelo `claude-haiku-4-5` · Vitest (frontend y backend) · React + `firebase/functions` en el cliente.

---

## Notas técnicas (leer antes de empezar)

- **Haiku 4.5 NO soporta `effort` ni `thinking`** (devuelven 400). Usar `client.messages.create` plano con `tools`. No pasar `output_config`/`thinking`.
- **Loop de agente manual:** repetir mientras `response.stop_reason === 'tool_use'`; en cada vuelta agregar el `assistant` (con sus bloques) a `messages`, ejecutar las tools y mandar un `user` con los `tool_result`. Cortar en `MAX_ITERACIONES`.
- `tool.input` ya viene parseado como objeto (no hacer `JSON.parse` sobre él).
- Cloud Functions v2: `onCall` recibe `request` con `request.auth` y `request.data`.
- Secretos: `defineSecret('ANTHROPIC_API_KEY')` + `onCall({ secrets: [...] }, handler)`.
- `functions/` tiene su **propio** `package.json` y sus propios tests; no se mezcla con el frontend.
- El proyecto Firebase es `ciudalemana`. Región de la function: `us-central1` (default).

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `functions/package.json` (crear) | Deps del backend: firebase-functions, firebase-admin, @anthropic-ai/sdk, vitest. |
| `functions/index.js` (crear) | Init admin + export `asistenteIA` (onCall): valida admin, llama al agente. |
| `functions/lib/calculos.js` (crear) | Funciones puras: `diasDeAtraso`, `hoy`. |
| `functions/lib/herramientas.js` (crear) | Definiciones de tools (JSON schema) + ejecutores que leen Firestore. |
| `functions/lib/agente.js` (crear) | Loop de agente con el SDK de Anthropic (inyectable para tests). |
| `functions/lib/calculos.test.js` (crear) | Tests de calculos. |
| `functions/lib/herramientas.test.js` (crear) | Tests de los ejecutores con Firestore mockeado. |
| `functions/lib/agente.test.js` (crear) | Test del loop con el cliente Anthropic mockeado. |
| `src/firebase/config.js` (modificar) | Exportar instancia de `functions` (`getFunctions`). |
| `src/hooks/useAsistente.js` (crear) | Estado del chat + llamada a la callable. |
| `src/hooks/useAsistente.test.js` (crear) | Test del hook (loading/success/error) con callable mockeada. |
| `src/components/asistente/AsistenteIA.jsx` (crear) | FAB + panel de chat. |
| `src/components/layout/Layout.jsx` (modificar) | Montar `<AsistenteIA />` solo si `esAdmin`. |

---

## Task 1: Scaffolding de `functions/` + calculos puros

**Files:**
- Create: `functions/package.json`
- Create: `functions/lib/calculos.js`
- Create: `functions/lib/calculos.test.js`

- [ ] **Step 1: Crear `functions/package.json`**

```json
{
  "name": "rutacobro-functions",
  "type": "module",
  "engines": { "node": "20" },
  "main": "index.js",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.68.0",
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^6.4.0"
  },
  "devDependencies": {
    "vitest": "^4.1.6"
  }
}
```

- [ ] **Step 2: Instalar deps (resolviendo versiones reales)**

Run: `cd functions && npm install @anthropic-ai/sdk@latest firebase-admin@latest firebase-functions@latest && npm install -D vitest@latest`
Expected: crea `functions/node_modules` y `functions/package-lock.json` sin errores, y fija en `package.json` las versiones reales publicadas (sobrescribe los `^` placeholder de arriba). Verificar que `@anthropic-ai/sdk` quedó listado en `dependencies`.

- [ ] **Step 3: Escribir el test de calculos (RED)**

Create `functions/lib/calculos.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { hoy, diasDeAtraso } from './calculos.js';

describe('hoy', () => {
  it('devuelve la fecha en formato YYYY-MM-DD', () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('diasDeAtraso', () => {
  it('es 0 si la cuota está pagada', () => {
    expect(diasDeAtraso({ vencimiento: '2000-01-01', pagada: true }, '2026-06-14')).toBe(0);
  });

  it('es 0 si vence hoy o en el futuro', () => {
    expect(diasDeAtraso({ vencimiento: '2026-06-14', pagada: false }, '2026-06-14')).toBe(0);
    expect(diasDeAtraso({ vencimiento: '2026-06-20', pagada: false }, '2026-06-14')).toBe(0);
  });

  it('cuenta los días vencidos', () => {
    expect(diasDeAtraso({ vencimiento: '2026-06-10', pagada: false }, '2026-06-14')).toBe(4);
  });
});
```

- [ ] **Step 4: Correr el test (verificar que falla)**

Run: `cd functions && npx vitest run lib/calculos.test.js`
Expected: FAIL — `calculos.js` no existe.

- [ ] **Step 5: Implementar `functions/lib/calculos.js` (GREEN)**

```js
// Fecha local en formato YYYY-MM-DD.
export const hoy = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

const MS_DIA = 86400000;

/**
 * Días de atraso de una cuota respecto de `hoyStr` (YYYY-MM-DD).
 * 0 si está pagada o si todavía no venció.
 */
export const diasDeAtraso = (cuota, hoyStr) => {
  if (!cuota || cuota.pagada || !cuota.vencimiento) return 0;
  const venc = new Date(cuota.vencimiento + 'T00:00:00');
  const ref = new Date(hoyStr + 'T00:00:00');
  const diff = Math.floor((ref - venc) / MS_DIA);
  return diff > 0 ? diff : 0;
};
```

- [ ] **Step 6: Correr el test (verificar que pasa)**

Run: `cd functions && npx vitest run lib/calculos.test.js`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/lib/calculos.js functions/lib/calculos.test.js
git commit -m "feat(functions): scaffolding de Cloud Functions y calculos puros del asistente"
```

---

## Task 2: Herramientas de solo lectura (Firestore)

**Files:**
- Create: `functions/lib/herramientas.js`
- Create: `functions/lib/herramientas.test.js`

Diseño: `definicionesTools` es el array de tools (JSON schema) que se manda a Claude. `ejecutarTool(db, nombre, input)` despacha al ejecutor correspondiente usando el Admin SDK (`db`). Los ejecutores reciben `db` por inyección para poder mockearlo en tests.

- [ ] **Step 1: Escribir el test (RED)**

Create `functions/lib/herramientas.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { definicionesTools, ejecutarTool } from './herramientas.js';

// Mock mínimo de Firestore Admin: db.collection(name).get() → { docs }
function dbMock(porColeccion) {
  return {
    collection: (name) => ({
      get: async () => ({
        docs: (porColeccion[name] ?? []).map((d) => ({ id: d.id, data: () => d })),
      }),
    }),
  };
}

describe('definicionesTools', () => {
  it('expone las 6 herramientas con name e input_schema', () => {
    const nombres = definicionesTools.map((t) => t.name);
    expect(nombres).toEqual(
      expect.arrayContaining([
        'obtener_metricas',
        'listar_clientes_en_mora',
        'buscar_cliente',
        'clientes_para_renovar',
        'listar_rutas',
        'proxima_cobranza',
      ]),
    );
    for (const t of definicionesTools) {
      expect(t.input_schema.type).toBe('object');
    }
  });
});

describe('ejecutarTool: listar_clientes_en_mora', () => {
  it('devuelve clientes con cuota vencida ordenados por atraso', async () => {
    const db = dbMock({
      clientes: [{ id: 'c1', nombre: 'Perez', rutaId: 'r1' }],
      prestamos: [
        {
          id: 'p1',
          clienteId: 'c1',
          estado: 'mora',
          cuotasDetalle: [
            { nro: 1, monto: 1000, vencimiento: '2026-06-01', pagada: false, pagado: 0 },
          ],
        },
      ],
      rutas: [{ id: 'r1', nombre: 'Norte' }],
    });
    const res = await ejecutarTool(db, 'listar_clientes_en_mora', {}, '2026-06-14');
    expect(res.clientes[0].nombre).toBe('Perez');
    expect(res.clientes[0].diasAtraso).toBe(13);
    expect(res.clientes[0].montoPendiente).toBe(1000);
  });
});

describe('ejecutarTool: tool desconocida', () => {
  it('lanza error', async () => {
    await expect(ejecutarTool(dbMock({}), 'no_existe', {})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Correr el test (verificar que falla)**

Run: `cd functions && npx vitest run lib/herramientas.test.js`
Expected: FAIL — `herramientas.js` no existe.

- [ ] **Step 3: Implementar `functions/lib/herramientas.js` (GREEN)**

```js
import { diasDeAtraso, hoy } from './calculos.js';

const LIMITE_DEFAULT = 20;

const leer = async (db, col) => {
  const snap = await db.collection(col).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const pagadoDe = (c) => (c.pagada ? (c.pagado ?? c.monto) : (c.pagado ?? 0));

// ── Definiciones (lo que ve Claude) ───────────────────────────────────────────
export const definicionesTools = [
  {
    name: 'obtener_metricas',
    description:
      'Métricas de la cartera: cobrado, por cobrar, capital en calle, monto en mora y cuotas en mora, mora por antigüedad, ganancia. Opcional filtrar por rutaId.',
    input_schema: {
      type: 'object',
      properties: { rutaId: { type: 'string', description: 'ID de ruta para filtrar (opcional)' } },
    },
  },
  {
    name: 'listar_clientes_en_mora',
    description:
      'Clientes con cuotas vencidas impagas, ordenados por días de atraso desc. Devuelve nombre, ruta, días de atraso, monto pendiente.',
    input_schema: {
      type: 'object',
      properties: {
        rutaId: { type: 'string', description: 'Filtrar por ruta (opcional)' },
        limite: { type: 'integer', description: 'Máximo de clientes (default 20)' },
      },
    },
  },
  {
    name: 'buscar_cliente',
    description:
      'Busca un cliente por nombre o DNI y devuelve sus datos (incluye DNI y teléfono), préstamos y estado de cuotas.',
    input_schema: {
      type: 'object',
      properties: { texto: { type: 'string', description: 'Nombre o DNI a buscar' } },
      required: ['texto'],
    },
  },
  {
    name: 'clientes_para_renovar',
    description:
      'Clientes con préstamo finalizado o con ≥80% de cuotas pagadas, candidatos a renovar. Opcional por rutaId.',
    input_schema: {
      type: 'object',
      properties: { rutaId: { type: 'string', description: 'Filtrar por ruta (opcional)' } },
    },
  },
  {
    name: 'listar_rutas',
    description: 'Lista las rutas con su nombre y cobrador.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'proxima_cobranza',
    description:
      'Cuotas pendientes que vencen en los próximos N días (default 7), con cliente, monto y fecha.',
    input_schema: {
      type: 'object',
      properties: { dias: { type: 'integer', description: 'Horizonte en días (default 7)' } },
    },
  },
];

// ── Ejecutores ────────────────────────────────────────────────────────────────
async function obtenerMetricas(db, { rutaId }, hoyStr) {
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const filtrados = rutaId
    ? prestamos.filter((p) => clientePorId.get(p.clienteId)?.rutaId === rutaId)
    : prestamos;

  let cobrado = 0,
    porCobrar = 0,
    enCalle = 0,
    montoMora = 0,
    cuotasMora = 0,
    ganancia = 0;
  for (const p of filtrados) {
    const capital = p.monto ?? 0;
    if (p.estado === 'activo' || p.estado === 'mora') enCalle += capital;
    const cuotas = p.cuotasDetalle ?? [];
    const total = cuotas.reduce((s, c) => s + c.monto, 0);
    ganancia += total - capital;
    for (const c of cuotas) {
      const pg = pagadoDe(c);
      cobrado += pg;
      const pend = c.monto - pg;
      if (pend > 0) {
        porCobrar += pend;
        if (diasDeAtraso(c, hoyStr) > 0) {
          cuotasMora += 1;
          montoMora += pend;
        }
      }
    }
  }
  return {
    cobrado,
    porCobrar,
    capitalEnCalle: enCalle,
    montoMora,
    cuotasEnMora: cuotasMora,
    gananciaProyectada: ganancia,
  };
}

async function listarClientesEnMora(db, { rutaId, limite = LIMITE_DEFAULT }, hoyStr) {
  const [clientes, prestamos, rutas] = await Promise.all([
    leer(db, 'clientes'),
    leer(db, 'prestamos'),
    leer(db, 'rutas'),
  ]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const rutaPorId = new Map(rutas.map((r) => [r.id, r]));
  const filas = [];
  for (const p of prestamos) {
    const cli = clientePorId.get(p.clienteId);
    if (!cli) continue;
    if (rutaId && cli.rutaId !== rutaId) continue;
    for (const c of p.cuotasDetalle ?? []) {
      const atraso = diasDeAtraso(c, hoyStr);
      if (atraso > 0) {
        filas.push({
          nombre: cli.nombre,
          ruta: rutaPorId.get(cli.rutaId)?.nombre ?? null,
          diasAtraso: atraso,
          montoPendiente: c.monto - pagadoDe(c),
          cuotaNro: c.nro,
        });
      }
    }
  }
  filas.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return { clientes: filas.slice(0, limite), total: filas.length };
}

async function buscarCliente(db, { texto }) {
  const q = String(texto ?? '')
    .toLowerCase()
    .trim();
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const cli = clientes.find(
    (c) => c.nombre?.toLowerCase().includes(q) || String(c.dni ?? '').includes(q),
  );
  if (!cli) return { encontrado: false };
  const sus = prestamos
    .filter((p) => p.clienteId === cli.id)
    .map((p) => {
      const cuotas = p.cuotasDetalle ?? [];
      return {
        estado: p.estado,
        monto: p.monto,
        cuotasPagadas: cuotas.filter((c) => c.pagada).length,
        cuotasTotales: cuotas.length,
        proxima: cuotas.find((c) => !c.pagada)?.vencimiento ?? null,
      };
    });
  return {
    encontrado: true,
    cliente: { nombre: cli.nombre, dni: cli.dni ?? null, tel: cli.tel ?? null, bcra: cli.bcra ?? null },
    prestamos: sus,
  };
}

async function clientesParaRenovar(db, { rutaId }) {
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const out = [];
  for (const p of prestamos) {
    const cli = clientePorId.get(p.clienteId);
    if (!cli) continue;
    if (rutaId && cli.rutaId !== rutaId) continue;
    const cuotas = p.cuotasDetalle ?? [];
    const pagadas = cuotas.filter((c) => c.pagada).length;
    const ratio = cuotas.length ? pagadas / cuotas.length : 0;
    if (p.estado === 'finalizado' || ratio >= 0.8) {
      out.push({ nombre: cli.nombre, estado: p.estado, avance: Math.round(ratio * 100) });
    }
  }
  return { clientes: out };
}

async function listarRutas(db) {
  const rutas = await leer(db, 'rutas');
  return { rutas: rutas.map((r) => ({ id: r.id, nombre: r.nombre, cobrador: r.cobrador ?? null })) };
}

async function proximaCobranza(db, { dias = 7 }, hoyStr) {
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const limite = new Date(hoyStr + 'T00:00:00');
  limite.setDate(limite.getDate() + dias);
  const limiteStr = limite.toISOString().slice(0, 10);
  const filas = [];
  for (const p of prestamos) {
    const cli = clientePorId.get(p.clienteId);
    if (!cli) continue;
    for (const c of p.cuotasDetalle ?? []) {
      if (!c.pagada && c.vencimiento >= hoyStr && c.vencimiento <= limiteStr) {
        filas.push({
          nombre: cli.nombre,
          monto: c.monto - pagadoDe(c),
          vencimiento: c.vencimiento,
        });
      }
    }
  }
  filas.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  return { cuotas: filas, total: filas.length };
}

const EJECUTORES = {
  obtener_metricas: obtenerMetricas,
  listar_clientes_en_mora: listarClientesEnMora,
  buscar_cliente: buscarCliente,
  clientes_para_renovar: clientesParaRenovar,
  listar_rutas: listarRutas,
  proxima_cobranza: proximaCobranza,
};

export async function ejecutarTool(db, nombre, input, hoyStr = hoy()) {
  const fn = EJECUTORES[nombre];
  if (!fn) throw new Error(`Herramienta desconocida: ${nombre}`);
  return fn(db, input ?? {}, hoyStr);
}
```

- [ ] **Step 4: Correr el test (verificar que pasa)**

Run: `cd functions && npx vitest run lib/herramientas.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/lib/herramientas.js functions/lib/herramientas.test.js
git commit -m "feat(functions): herramientas de solo lectura del asistente sobre Firestore"
```

---

## Task 3: Loop de agente con Claude

**Files:**
- Create: `functions/lib/agente.js`
- Create: `functions/lib/agente.test.js`

Diseño: `correrAgente({ client, db, mensajes, hoyStr })` corre el loop manual. `client` es el cliente de Anthropic (inyectado para tests). Devuelve `{ respuesta, iteraciones, uso }`.

- [ ] **Step 1: Escribir el test (RED)**

Create `functions/lib/agente.test.js`:

```js
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
        content: [
          { type: 'tool_use', id: 'tu_1', name: 'listar_rutas', input: {} },
        ],
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
```

- [ ] **Step 2: Correr el test (verificar que falla)**

Run: `cd functions && npx vitest run lib/agente.test.js`
Expected: FAIL — `agente.js` no existe.

- [ ] **Step 3: Implementar `functions/lib/agente.js` (GREEN)**

```js
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
```

- [ ] **Step 4: Correr el test (verificar que pasa)**

Run: `cd functions && npx vitest run lib/agente.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/agente.js functions/lib/agente.test.js
git commit -m "feat(functions): loop de agente con tool use para el asistente (Haiku 4.5)"
```

---

## Task 4: Cloud Function `asistenteIA` (onCall + rol admin)

**Files:**
- Create: `functions/index.js`

No tiene test unitario propio (orquesta admin SDK + auth real); su lógica pesada ya está testeada en `agente.js`/`herramientas.js`. Se verifica con lint/build y, manualmente, con el emulador.

- [ ] **Step 1: Implementar `functions/index.js`**

```js
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
```

- [ ] **Step 2: Verificar que el módulo carga sin errores de sintaxis**

Run: `cd functions && node --check index.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "feat(functions): callable asistenteIA con verificacion de rol admin server-side"
```

---

## Task 5: Cliente Firebase — instancia de Functions

**Files:**
- Modify: `src/firebase/config.js`

- [ ] **Step 1: Leer el archivo actual**

Run: revisar `src/firebase/config.js` para ver cómo se exporta `app` y `db`.

- [ ] **Step 2: Agregar el export de `functions`**

Agregar el import y el export (ajustar al patrón existente del archivo):

```js
import { getFunctions } from 'firebase/functions';
// ... después de crear `app`:
export const functions = getFunctions(app);
```

- [ ] **Step 3: Verificar build**

Run: `npx vite build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/firebase/config.js
git commit -m "feat: exportar instancia de Cloud Functions en el cliente Firebase"
```

---

## Task 6: Hook `useAsistente`

**Files:**
- Create: `src/hooks/useAsistente.js`
- Create: `src/hooks/useAsistente.test.js`

Diseño: maneja `mensajes` (en memoria), `enviar(texto)`, `cargando`, `error`. Llama a la callable `asistenteIA`. La llamada se aísla detrás de `httpsCallable` para poder mockear `firebase/functions` en el test.

- [ ] **Step 1: Escribir el test (RED)**

Create `src/hooks/useAsistente.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const callableMock = vi.fn();
vi.mock('firebase/functions', () => ({
  httpsCallable: () => callableMock,
}));
vi.mock('@/firebase/config', () => ({ functions: {} }));

import { useAsistente } from './useAsistente';

describe('useAsistente', () => {
  beforeEach(() => callableMock.mockReset());

  it('agrega el mensaje del usuario y la respuesta del asistente', async () => {
    callableMock.mockResolvedValue({ data: { respuesta: 'Hola, soy el asistente.' } });
    const { result } = renderHook(() => useAsistente());

    await act(async () => {
      await result.current.enviar('hola');
    });

    const roles = result.current.mensajes.map((m) => m.role);
    expect(roles).toEqual(['user', 'assistant']);
    expect(result.current.mensajes[1].content).toBe('Hola, soy el asistente.');
    expect(result.current.cargando).toBe(false);
  });

  it('expone un error si la callable falla', async () => {
    callableMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAsistente());

    await act(async () => {
      await result.current.enviar('hola');
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.cargando).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test (verificar que falla)**

Run: `npx vitest run src/hooks/useAsistente.test.js`
Expected: FAIL — `useAsistente.js` no existe.

- [ ] **Step 3: Implementar `src/hooks/useAsistente.js` (GREEN)**

```js
import { useState, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/config';

export function useAsistente() {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const callableRef = useRef(null);

  const getCallable = () => {
    if (!callableRef.current) callableRef.current = httpsCallable(functions, 'asistenteIA');
    return callableRef.current;
  };

  const enviar = useCallback(
    async (texto) => {
      const limpio = texto.trim();
      if (!limpio || cargando) return;
      setError(null);
      setCargando(true);
      const historial = [...mensajes, { role: 'user', content: limpio }];
      setMensajes(historial);
      try {
        const res = await getCallable()({ mensajes: historial });
        const respuesta = res?.data?.respuesta ?? 'Sin respuesta.';
        setMensajes((prev) => [...prev, { role: 'assistant', content: respuesta }]);
      } catch (err) {
        setError(err.message ?? 'No se pudo consultar al asistente.');
      } finally {
        setCargando(false);
      }
    },
    [mensajes, cargando],
  );

  return { mensajes, enviar, cargando, error };
}
```

- [ ] **Step 4: Correr el test (verificar que pasa)**

Run: `npx vitest run src/hooks/useAsistente.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAsistente.js src/hooks/useAsistente.test.js
git commit -m "feat: hook useAsistente para el chat del asistente IA"
```

---

## Task 7: Componente `AsistenteIA` (FAB + panel)

**Files:**
- Create: `src/components/asistente/AsistenteIA.jsx`

Componente visual; se verifica con build + revisión manual. Usa clases que ya tematiza el dark mode global de `index.css`.

- [ ] **Step 1: Implementar `src/components/asistente/AsistenteIA.jsx`**

```jsx
import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { useAsistente } from '@/hooks/useAsistente';

const SUGERENCIAS = [
  '¿Qué clientes están por caer en mora?',
  'Resumime las métricas de la cartera',
  '¿A quién conviene renovar?',
];

export default function AsistenteIA() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const { mensajes, enviar, cargando, error } = useAsistente();
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const submit = (e) => {
    e.preventDefault();
    enviar(texto);
    setTexto('');
  };

  return (
    <>
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir asistente IA"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand hover:shadow-brand-sm active:scale-95 transition-all"
        >
          <Sparkles size={22} />
        </button>
      )}

      {abierto && (
        <div className="fixed inset-x-3 bottom-3 md:inset-auto md:bottom-6 md:right-6 md:w-96 z-50 flex flex-col rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-popover max-h-[80vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-gradient text-white flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                  Asistente
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Consultá tu cartera</p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {mensajes.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Probá preguntar:</p>
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="block w-full text-left text-sm px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                  Pensando…
                </div>
              </div>
            )}
            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div ref={finRef} />
          </div>

          <form onSubmit={submit} className="p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí tu pregunta…"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={cargando || !texto.trim()}
              aria-label="Enviar"
              className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verificar lint + build**

Run: `npx eslint src/components/asistente/AsistenteIA.jsx && npx vite build`
Expected: lint limpio, build OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/asistente/AsistenteIA.jsx
git commit -m "feat: panel flotante de chat del asistente IA"
```

---

## Task 8: Montar el asistente en el Layout (solo admin)

**Files:**
- Modify: `src/components/layout/Layout.jsx`

- [ ] **Step 1: Importar y usar `esAdmin`**

En `Layout.jsx`, agregar el import:

```jsx
import AsistenteIA from '@/components/asistente/AsistenteIA';
```

Y en el destructuring de `useApp()` agregar `esAdmin` (ya se importa `useApp`):

```jsx
const { syncing, puedeEditar, esAdmin } = useApp();
```

- [ ] **Step 2: Renderizar el componente antes del cierre del contenedor raíz**

Justo antes del `{modalNuevo && ...}` final, agregar:

```jsx
{esAdmin && <AsistenteIA />}
```

- [ ] **Step 3: Verificar build y suite completa**

Run: `npx vitest run && npx vite build`
Expected: todos los tests del frontend pasan; build OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Layout.jsx
git commit -m "feat: montar el asistente IA en el Layout solo para admin"
```

---

## Task 9: Documentar prerequisitos de deploy

**Files:**
- Modify: `CLAUDE.md` (sección de deploy/comandos) — agregar nota breve.

- [ ] **Step 1: Agregar nota en CLAUDE.md**

En la sección de Deploy/Comandos, agregar:

```markdown
## Asistente IA (Cloud Functions)
El asistente (`functions/asistenteIA`) requiere: plan **Blaze**, el secreto
`ANTHROPIC_API_KEY` (`firebase functions:secrets:set ANTHROPIC_API_KEY`) y deploy
con `firebase deploy --only functions`. Es solo-lectura y solo-admin. Modelo: Haiku 4.5.
Tests del backend: `cd functions && npm test`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: prerequisitos de deploy del asistente IA"
```

---

## Verificación final (manual, requiere prerequisitos del usuario)

1. `firebase functions:secrets:set ANTHROPIC_API_KEY` (pegar la key de console.anthropic.com).
2. `firebase deploy --only functions`.
3. En la app, como admin: abrir el FAB, preguntar "¿Qué rutas hay?" y verificar respuesta.
4. Como cobrador: confirmar que el FAB no aparece (gating `esAdmin`) y que la callable rechaza (`permission-denied`) si se invoca igual.

## Riesgos / mitigaciones

- **Costo runaway:** `MAX_ITERACIONES = 6` + `MAX_MENSAJES = 20` + `max_tokens` acotado.
- **Alucinación de cifras:** el system prompt fuerza el uso de tools; las tools devuelven datos reales.
- **Modelo:** Haiku 4.5 no admite `effort`/`thinking` — el código no los pasa (evita 400).
