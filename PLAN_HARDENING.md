# Plan de endurecimiento — RutaCobro

> Documento vivo. Se actualiza el estado de cada tarea a medida que avanza.
> Estados: ⬜ pendiente · 🟡 en progreso · ✅ hecho · ⏸️ pausado / decisión pendiente
>
> **Última actualización:** 2026-07-31
> **Rama:** `feat/asistente-ia`
> **Origen:** auditoría del sistema completo (2026-07-31). Se atacan los 3 puntos de
> mayor impacto: seguridad real en el servidor, operación offline y recuperabilidad
> de datos.

---

## Índice

- [Fase 1 — Seguridad: reglas de Firestore + tests con emulador](#fase-1--seguridad-reglas-de-firestore--tests-con-emulador)
- [Fase 2 — Operación offline](#fase-2--operación-offline)
- [Fase 3 — Backup y borrado lógico](#fase-3--backup-y-borrado-lógico)
- [Bitácora de avance](#bitácora-de-avance)
- [Cómo continuar](#cómo-continuar)

---

## Contexto: por qué estas tres

| #   | Problema                                                                                                                                                                                                         | Riesgo hoy                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `firestore.rules` permite a **cualquier usuario autenticado** leer toda la cartera (`clientes`, `prestamos`, `movimientos`, `gastos`). El aislamiento por ruta y el rol `cliente` viven **solo en el frontend**. | Fuga de datos personales de clientes finales (nombre, DNI, teléfono, dirección, deuda). Un cobrador o un usuario rol `cliente` con la consola del navegador se lleva el negocio entero. |
| 2   | `cobrarCuota` / `pagarMonto` / `revertirCuota` usan `runTransaction`, que **exige conexión**. La PWA está en `selfDestroying` (sin Service Worker).                                                              | La app de cobro en la calle no funciona en la calle sin señal. El cobrador puede creer que cobró y no haber cobrado.                                                                    |
| 3   | `eliminarClienteCompleto` / `eliminarPrestamo` borran físicamente e irreversiblemente. No hay export ni backup.                                                                                                  | Un borrado accidental (o malicioso) es pérdida total. La auditoría deja constancia pero no permite restaurar.                                                                           |

---

## Fase 1 — Seguridad: reglas de Firestore + tests con emulador

**Objetivo:** que el aislamiento por rol y por ruta se aplique **en el servidor**, y que
quede cubierto por tests automáticos que corran en CI.

### Diseño

El obstáculo técnico es que hoy `prestamos` y `movimientos` **no saben a qué ruta
pertenecen**: hay que resolverlo saltando a `clientes.rutaId`. Las reglas de Firestore no
pueden hacer ese salto de forma barata en una consulta de lista (`list`), porque el motor
valida la _query_, no cada documento devuelto.

**Solución: desnormalizar `rutaId`** en `prestamos`, `movimientos` y `notas`.

Consecuencia importante y deseada: las queries del cobrador pasan a llevar
`where('rutaId','==',suRuta)`, lo que además **reduce el volumen de datos que baja cada
dispositivo** (ataca de paso el hallazgo #5 de la auditoría).

Modelo de permisos objetivo:

| Colección     | admin       | cobrador      | cliente       | visitante   |
| ------------- | ----------- | ------------- | ------------- | ----------- |
| `rutas`       | RW          | R (la suya)   | —             | R           |
| `clientes`    | RW          | RW (su ruta)  | R (el suyo)   | R           |
| `prestamos`   | RW + delete | RW (su ruta)  | R (los suyos) | R           |
| `movimientos` | R/C/D       | R/C (su ruta) | R (los suyos) | R           |
| `gastos`      | RW          | RW (su ruta)  | —             | R           |
| `notas`       | RW          | RC (su ruta)  | —             | R           |
| `auditoria`   | R           | C             | —             | —           |
| `config`      | RW          | R             | R             | R           |
| `usuarios`    | RW          | R (el suyo)   | R (el suyo)   | R (el suyo) |

### Tareas

| #    | Tarea                                                                             | Estado                        |
| ---- | --------------------------------------------------------------------------------- | ----------------------------- |
| 1.1  | Configurar emulador de Firestore (`firebase.json` + scripts npm)                  | ✅                            |
| 1.2  | Suite de tests de reglas con `@firebase/rules-unit-testing` (47 casos)            | ✅ 47/47 en verde             |
| 1.3  | Desnormalizar `rutaId` en `prestamos` (alta, edición, cambio de ruta del cliente) | ✅                            |
| 1.4  | Desnormalizar `rutaId` en `movimientos` (cobro, pago parcial, punitorio)          | ✅                            |
| 1.5  | Desnormalizar `rutaId` en `notas`                                                 | ✅                            |
| 1.6  | Reescribir `firestore.rules` con aislamiento por rol y ruta                       | ✅                            |
| 1.7  | Adaptar queries del frontend (`services.js`, `DataContext`) al nuevo filtro       | ✅                            |
| 1.8  | Índices compuestos nuevos (`firestore.indexes.json`)                              | ✅                            |
| 1.9  | Script de migración de datos existentes (`scripts/migrar-rutaid.mjs`)             | ✅                            |
| 1.10 | Tests de transacciones de dinero contra el emulador (18 casos)                    | ✅ 18/18 en verde             |
| 1.11 | Correr migración en producción y deployar reglas                                  | ⬜ **requiere acción manual** |

### Requisito para correr las suites del emulador

El emulador de Firestore corre sobre la JVM. Instalado en esta máquina:
**Temurin JDK 21** (`winget install EclipseAdoptium.Temurin.21.JDK --source winget`).

> Nota: `Microsoft.OpenJDK.21` falla en este equipo — la descarga se trunca en 188 KB y el
> hash no valida. **No usar `--ignore-security-hash` para saltearlo**: significaría instalar
> un binario que no es el que el publisher firmó. Temurin baja de otro CDN y funciona.

```bash
npm run test:rules   # levanta el emulador y corre tests/
```

### Lo que la suite encontró (2026-07-31)

**`invitaciones` — borrado imposible tras aceptar la invitación.** La regla era
`esAdmin() || !tieneMembresia()`, pero al aceptar una invitación el usuario primero crea su
doc en `/usuarios` y recién después borra el token: para ese momento ya tiene membresía y la
condición no se cumple.

En producción probablemente no habría explotado, porque `aceptarInvitacion` hace las dos
escrituras en una `runTransaction` y las reglas evalúan cada write contra el estado previo a
la transacción. Pero era una dependencia frágil de un detalle sutil del motor: cualquier
refactor que separara las operaciones habría dejado tokens huérfanos y reutilizables.

Corregido agregando la condición explícita `miDoc().inviteToken == token`, que cubre los dos
momentos del alta y además acota el permiso a _la propia_ invitación del usuario.

### Riesgos y mitigación

- **Deploy de reglas antes de migrar los datos = app rota.** El orden obligatorio es:
  (1) deployar el código nuevo que escribe `rutaId`, (2) correr la migración sobre los
  documentos históricos, (3) deployar las reglas. Documentado en 1.11.
- **Cliente sin ruta:** un `cliente` cuyo doc no tiene `rutaId` queda invisible para su
  cobrador. La migración marca esos casos en el reporte final.

---

## Fase 2 — Operación offline

**Objetivo:** que el cobrador pueda trabajar sin señal, y que **nunca** crea haber cobrado
algo que no se registró.

Se resuelve en dos etapas de esfuerzo muy distinto. La etapa A es barata y elimina el
riesgo peor (el cobro fantasma); la etapa B es la solución completa.

### Etapa A — Honestidad de estado (barata, alto valor)

| #   | Tarea                                                                                          | Estado |
| --- | ---------------------------------------------------------------------------------------------- | ------ |
| 2.1 | Hook `useOnline` (navigator.onLine + eventos + verificación real)                              | ✅     |
| 2.2 | Banner global de "sin conexión" en el Layout                                                   | ✅     |
| 2.3 | Bloquear/avisar en las acciones que exigen red (cobrar, pagar, revertir) con mensaje explícito | ✅     |
| 2.4 | Tests del hook y de la lógica de gating                                                        | ✅     |

### Etapa B — Cola de operaciones pendientes

| #   | Tarea                                                                      | Estado         |
| --- | -------------------------------------------------------------------------- | -------------- |
| 2.5 | Diseño de la cola (IndexedDB, idempotencia, reconciliación al sincronizar) | ✅ documentado |
| 2.6 | Implementación de la cola + reintento al reconectar                        | ⬜             |
| 2.7 | UI de "pendiente de sincronizar" por cuota                                 | ⬜             |
| 2.8 | Reactivar Service Worker (app shell) saliendo de `selfDestroying`          | ⬜             |

**Diseño de la cola (2.5) — decidido:**

- Cada operación se encola como `{ id: uuid, tipo, payload, creadoEn, intentos }` en
  IndexedDB (store `cola-pendientes`).
- **Idempotencia:** el `id` de la operación se usa como ID del documento de `movimientos`.
  Si la operación se reintenta y ya existía, la transacción detecta el movimiento y no
  duplica el cobro.
- **Reconciliación:** al sincronizar, la transacción vuelve a leer el préstamo. Si la cuota
  ya figura pagada por otra vía, la operación se descarta y se le informa al usuario en vez
  de fallar en silencio.
- **Orden:** la cola se procesa FIFO por préstamo (dos cobros al mismo préstamo deben
  aplicarse en orden), en paralelo entre préstamos distintos.
- **Techo:** si una operación falla 5 veces se marca `bloqueada` y se muestra en un panel de
  conflictos para resolución manual. Nunca se descarta plata en silencio.

---

## Fase 3 — Backup y borrado lógico

**Objetivo:** que ningún dato se pierda de forma irreversible y que el dueño pueda llevarse
su información.

| #   | Tarea                                                                             | Estado |
| --- | --------------------------------------------------------------------------------- | ------ |
| 3.1 | Export completo del negocio a JSON (todas las colecciones)                        | ✅     |
| 3.2 | Botón de export en `/configuracion` (solo admin)                                  | ✅     |
| 3.3 | Borrado lógico: `archivado: true` en vez de `deleteDoc` para clientes y préstamos | ✅     |
| 3.4 | Filtrar archivados en listeners y métricas                                        | ✅     |
| 3.5 | Vista de papelera / restauración (solo admin)                                     | ⬜     |
| 3.6 | Export programado a Storage vía Cloud Function (backup automático)                | ⬜     |

---

## Checklist de deploy a producción (tarea 1.11)

**El orden importa. Invertirlo deja la app rota o los datos inaccesibles.**

```bash
# 0 · Verificar que las suites del emulador siguen pasando
npm run test:rules

# 1 · Backup ANTES de tocar nada: entrar a /configuracion como admin
#     y usar "Descargar backup". Guardar el JSON fuera del equipo.

# 2 · Deployar la app nueva (ya escribe rutaId en las altas).
#     Todavía con las reglas VIEJAS: no rompe nada.
npm run build && firebase deploy --only hosting

# 3 · Simular la migración y leer el reporte
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run migrar:rutaid -- --dry-run

# 4 · Si el reporte NO muestra clientes sin ruta ni documentos huérfanos, aplicar
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run migrar:rutaid

# 5 · Índices primero (tardan en construirse), reglas después
firebase deploy --only firestore:indexes
#    …esperar a que la consola muestre los índices en estado "Enabled"…
firebase deploy --only firestore:rules

# 6 · Verificación en vivo: entrar con un cobrador y confirmar que ve
#     SU ruta y que la app no muestra errores de permisos.
```

**Rollback:** si algo sale mal en el paso 5, revertir las reglas es instantáneo
(`git checkout <commit-anterior> firestore.rules && firebase deploy --only firestore:rules`).
El campo `rutaId` agregado por la migración es aditivo y no rompe la versión vieja.

---

## Bitácora de avance

### 2026-07-31 — Sesión 1

**Previo (fuera de plan, reportado por el usuario):**

- ✅ Bug "En calle no baja al cobrar": `useMetricas.js` sumaba `p.monto` íntegro de los
  préstamos vigentes; ahora descuenta el capital ya devuelto
  (`capital − cobrado × ratioCapital`). Se eliminaron dos cálculos duplicados
  (`Dashboard.jsx` vista cobrador, que además ignoraba los préstamos en mora).
- ✅ Comprobante de pago: se quitó la fila "Interés — X%".

**Fase 1 — Seguridad**

- `firestore.rules` reescrito completo: aislamiento por rol y por ruta, `gastos` e
  `invitaciones` cerrados (antes cualquier autenticado los escribía o borraba).
- `rutaId` desnormalizado en `prestamos`, `movimientos` y `notas`. Se escribe en el alta y
  se **auto-repara** dentro de la transacción de cobro para los documentos viejos
  (`resolverRutaId` en `services.js`), así la migración no es un corte duro.
- `actualizarCliente` ahora propaga el cambio de ruta a préstamos y movimientos: sin eso,
  mover un cliente de ruta lo hacía desaparecer para su nuevo cobrador.
- Queries acotadas por `rutaId` en `DataContext`, `Movimientos` y `Gastos` (las reglas
  rechazan la consulta entera si no vienen acotadas). Efecto colateral bueno: el cobrador
  deja de descargar la cartera completa.
- Índices compuestos nuevos: `prestamos(rutaId, fechaInicio)` y `movimientos(rutaId, fecha)`.
- `scripts/migrar-rutaid.mjs`: idempotente, con `--dry-run` y reporte de clientes sin ruta
  y documentos huérfanos.
- 65 casos de test contra el emulador (47 de reglas + 18 de transacciones), **todos en
  verde**. Encontraron un bug real en la regla de `invitaciones` — detalle arriba.

**Fase 2 — Offline (etapa A completa)**

- `utils/conexion.js` + `hooks/useOnline.js`: `navigator.onLine` se usa solo como
  negativo confiable (bloquear), nunca como positivo (dar por buena una operación).
- `BannerSinConexion` fijo en el Layout: "podés consultar, pero no registrar cobros".
- `useCobrar` corta el cobro _antes_ de intentarlo si no hay red, y traduce
  `unavailable` / `permission-denied` / `deadline-exceeded` a mensajes accionables en vez
  de volcar el error crudo de Firestore.
- Etapa B (la cola real) queda diseñada en detalle y sin implementar.

**Fase 3 — Backup**

- `utils/exportar.js` + `exportarNegocio()`: backup JSON versionado de las 8 colecciones,
  con conteos y config del negocio.
- `CardBackup` en `/configuracion` (solo admin), con el desglose por colección.
- Borrado lógico: `eliminarClienteCompleto` y `eliminarPrestamo` ahora **archivan**
  (`archivado: true`) y quedan auditadas como reversibles. Se agregaron
  `restaurarCliente` / `restaurarPrestamo` y los `*Definitivo` para el vaciado explícito.
  **Los movimientos ya no se borran nunca al archivar**: son el registro contable y el
  cierre de caja histórico tiene que seguir cuadrando.
- `DataContext` filtra archivados de todas las vistas y métricas, y los expone aparte en
  `archivados` para la futura papelera (tarea 3.5).

**Verificación de esta sesión**

| Comando              | Resultado                                    |
| -------------------- | -------------------------------------------- |
| `npm test`           | ✅ 176 tests / 23 archivos (antes: 154 / 20) |
| `npx eslint src`     | ✅ sin errores ni warnings                   |
| `npm run build`      | ✅ compila                                   |
| `npm run test:rules` | ✅ 65 tests / 2 archivos (emulador)          |

---

## Cómo continuar

**Próximo paso, en orden:**

1. **Ejecutar el checklist de deploy (tarea 1.11).** Es lo único que falta de la Fase 1: el
   código y las reglas están validados, pero producción sigue corriendo las reglas viejas.
2. Después, seguir con lo que quedó en ⬜: la cola offline (2.6-2.8), la papelera (3.5) y
   el backup automático (3.6).

**Comandos:**

```bash
npm test              # unit + integración (jsdom) — corre siempre
npm run test:rules    # reglas + transacciones contra el emulador — requiere Java 11+
npm run build         # verificar que compila
```

**Archivos tocados en la sesión 1** (por si hace falta revisar o revertir):

```
firestore.rules                          reescrito completo
firestore.indexes.json                   +2 índices
firebase.json                            +emuladores
vite.config.js                           excluye tests/ del run principal
vitest.rules.config.js                   nuevo — config del emulador
package.json                             +test:rules, +migrar:rutaid, +2 devDeps
scripts/migrar-rutaid.mjs                nuevo
tests/helpers.js                         nuevo
tests/reglas.test.js                     nuevo — 46 casos
tests/transacciones.test.js              nuevo — 18 casos
src/firebase/services.js                 rutaId + export + borrado lógico
src/context/DataContext.jsx              filtro de acceso + archivados
src/pages/Movimientos.jsx                query acotada por ruta
src/pages/Gastos.jsx                     query acotada por ruta
src/pages/Configuracion.jsx              +CardBackup
src/utils/conexion.js                    nuevo (+test)
src/utils/exportar.js                    nuevo (+test)
src/hooks/useOnline.js                   nuevo (+test)
src/hooks/useCobrar.js                   gating offline + errores traducidos
src/components/ui/BannerSinConexion.jsx  nuevo
src/components/configuracion/CardBackup.jsx  nuevo
src/components/layout/Layout.jsx         +banner
```

Nada de esto está commiteado todavía.
