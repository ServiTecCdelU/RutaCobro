# Asistente IA para el admin (C6) — Diseño

**Fecha:** 2026-06-14
**Estado:** aprobado (diseño), pendiente plan de implementación

## Objetivo

Un asistente conversacional para el **admin** que responda en lenguaje natural sobre la
cartera de préstamos: *"¿qué clientes están por caer en mora?"*, *"resumime el riesgo de la
ruta Norte"*, *"¿a quién conviene renovar?"*. Diferenciador comercial: convierte los datos
que ya tiene el sistema (métricas, score, BCRA) en respuestas accionables sin que el admin
arme reportes a mano.

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Backend | Firebase Cloud Functions (callable). Plan Blaze + `ANTHROPIC_API_KEY` secreto. |
| Acceso a datos | **Tool use**: el modelo decide qué consultar; la Function ejecuta contra Firestore. |
| Alcance de herramientas | **Solo lectura**. El asistente informa/recomienda; nunca cobra, edita ni borra. |
| Privacidad | Datos completos (incluye DNI/tel). Anthropic no entrena con datos de la API. |
| UI | Panel flotante (burbuja), visible solo para admin. |
| Modelo | `claude-haiku-4-5` (barato y capaz para loop con tools). Sonnet 4.6 como upgrade configurable. |
| Historial | En memoria (no se persiste en v1). |

## Arquitectura

```
[Panel chat flotante]  (solo admin, montado en Layout)
   │ httpsCallable('asistenteIA', { mensajes })
   ▼
[Cloud Function asistenteIA]  (Node 20, firebase-functions v2)
   │  1. valida context.auth y que el uid sea admin en /usuarios/{uid} (server-side)
   │  2. loop de agente con Claude (tool use):
   │       Claude pide herramienta → Function consulta Firestore (Admin SDK) → responde → repite
   │  3. corta a MAX_ITERACIONES (anti-costo) y devuelve el texto final
   ▼
[Anthropic API]  (ANTHROPIC_API_KEY como secreto de Functions)
```

La API key vive solo en el server. El frontend nunca la ve.

## Cloud Function (`functions/` — carpeta nueva)

Hoy el proyecto no tiene backend. Se crea `functions/` con su propio `package.json`
(no se mezcla con el del frontend).

- **Export:** `asistenteIA` = `onCall` (firebase-functions v2, `us-central1`).
- **Auth/rol:** rechaza si no hay `context.auth`; lee `/usuarios/{uid}` con Admin SDK y exige `rol === 'admin'`.
- **Input:** `{ mensajes: Array<{ role: 'user'|'assistant', content: string }> }` (historial del chat).
- **System prompt:** explica el dominio (cartera de préstamos por rutas; estados activo/mora/finalizado;
  cuotasDetalle; definición de mora, score interno, BCRA; que los montos son en la moneda del negocio).
  Reglas: responder en español, conciso; **usar siempre las herramientas para cifras reales, nunca inventar**;
  si no hay datos, decirlo.
- **Modelo:** `claude-haiku-4-5` (configurable por env `MODELO_IA`).
- **Loop de agente:** hasta `MAX_ITERACIONES = 6`. En cada vuelta: si Claude devuelve `tool_use`,
  ejecutar la(s) herramienta(s), agregar los `tool_result` y volver a llamar; si devuelve texto final, terminar.
- **Output:** `{ respuesta: string, uso: { input_tokens, output_tokens }, iteraciones }`.

### Herramientas (solo lectura, contra Firestore Admin SDK)

Todas devuelven JSON acotado (límites para no explotar tokens):

| Herramienta | Parámetros | Devuelve |
|-------------|-----------|----------|
| `obtener_metricas` | `rutaId?` | cobrado, por cobrar, en calle, en mora (monto/cuotas), mora por bucket (1-7/8-30/30+), ROI, ganancia realizada/proyectada, conteos por estado. |
| `listar_clientes_en_mora` | `rutaId?`, `limite?` (def. 20) | clientes con cuota vencida: nombre, ruta, días de atraso, monto pendiente, cuota nro. Ordenado por atraso desc. |
| `buscar_cliente` | `texto` (nombre o DNI) | datos del cliente (incl. DNI/tel), sus préstamos (estado, cuotas pagadas/total, próxima), score interno, último BCRA. |
| `clientes_para_renovar` | `rutaId?` | clientes con préstamo finalizado o casi (≥80% pagado) y buen score. |
| `listar_rutas` | — | rutas con nombre, color, cobrador. |
| `proxima_cobranza` | `dias?` (def. 7) | cuotas que vencen en los próximos N días, agrupadas por día/ruta. |

### Lógica compartida

Las funciones puras de cálculo (días de atraso, mora, métricas) hoy viven en `src/utils` (ESM
del browser). El server replica las mínimas necesarias en `functions/lib/calculos.js` (atraso/mora
son triviales). Se prioriza simplicidad sobre compartir build entre dos runtimes.

## Frontend

- `src/firebase/config.js`: agregar `getFunctions(app)` + export para `httpsCallable`.
- `src/hooks/useAsistente.js`: estado `mensajes`, `enviar(texto)`, `cargando`, `error`. Llama a la
  callable, agrega la respuesta al historial. Historial solo en memoria.
- `src/components/asistente/AsistenteIA.jsx`:
  - FAB (botón flotante abajo-derecha, sobre el bottom-nav en mobile).
  - Panel de chat: lista de mensajes (user/assistant), input + enviar, indicador de "pensando".
  - Sugerencias iniciales (chips) con preguntas de ejemplo.
  - Render de texto con formato básico (negrita, listas, saltos) sin librería pesada.
- Montaje en `src/components/layout/Layout.jsx`, condicionado a `esAdmin`.
- Dark mode: usa las clases que ya tematiza el CSS global de `index.css`.

## Seguridad y costos

- Rol admin verificado **en el server** (no solo en el frontend).
- Herramientas solo lectura; no hay tools de escritura.
- `MAX_ITERACIONES` y tope de largo de historial para acotar costo por request.
- API key como secreto de Functions (`firebase functions:secrets:set ANTHROPIC_API_KEY`).

### Prerequisitos del usuario (manuales)

1. Pasar el proyecto Firebase a plan **Blaze**.
2. Crear API key en console.anthropic.com.
3. `firebase functions:secrets:set ANTHROPIC_API_KEY`.
4. `firebase deploy --only functions`.

## Testing

- **Server (Vitest en `functions/`):** funciones puras de `lib/calculos.js` y el armado de respuestas
  de cada herramienta (con Firestore mockeado).
- **Loop del agente:** test con el cliente de Anthropic **mockeado** (no pega a la API real): verifica
  que ante un `tool_use` se ejecuta la tool y se reenvía el `tool_result`, y que corta en `MAX_ITERACIONES`.
- **Frontend:** test de `useAsistente` (loading/success/error) con la callable mockeada.

## Fuera de alcance (v1 — YAGNI)

- Persistencia del historial de chat.
- Acciones / herramientas de escritura.
- Streaming de la respuesta.
- Rate-limiting sofisticado (solo el tope de iteraciones).
- Multi-idioma.

## Riesgos

- **Costo runaway** si el loop no corta → mitigado con `MAX_ITERACIONES`.
- **Alucinación de cifras** → system prompt fuerza uso de herramientas; las tools devuelven datos reales.
- **Latencia** del loop con varias tool calls → Haiku es rápido; se muestra indicador de "pensando".
- **PII hacia terceros** → aceptado por el usuario; Anthropic no entrena con datos de la API.
