# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma
Siempre responder en español.

# RutaCobro — Contexto del proyecto

## ¿Qué es?
Sistema de gestión de cartera de préstamos organizados por rutas de cobro. Reemplaza a PlutoFM (AdminLTE 2015). Permite registrar clientes, crear préstamos con cuotas de frecuencia configurable (diaria, semanal, quincenal o mensual), cobrar cuotas en 1 click, enviar comprobantes y estados de cuenta por WhatsApp y ver métricas en tiempo real. El estado de cuenta (PDF con el cronograma completo) se genera desde el detalle del préstamo (`ModalDetalle`) vía `src/utils/estadoCuenta.js`. La página **Cobranza del día** (`/cobranza`) lista las cuotas vencidas/de hoy/próximas para cobrar, con recordatorio por WhatsApp y link al mapa de la dirección. La página **Cierre de caja** (`/cierre`, solo admin) muestra la rendición por ruta/cobrador (cobrado − gastos − prestado = neto a rendir) para una fecha o rango, con export a PDF.

## Stack
- **Runtime:** Vite 5 + React 18
- **Estilos:** Tailwind CSS 3 (paleta base: slate, acentos por ruta)
- **Backend:** Firebase 10 — Auth (email/password) + Firestore (tiempo real con onSnapshot)
- **Routing:** React Router 6
- **Iconos:** Lucide React
- **Lenguaje:** JavaScript (sin TypeScript)

## Estructura de carpetas
```
src/
├── firebase/       config.js (init Firebase) + services.js (todas las operaciones Firestore)
├── context/        AuthContext, DataContext, AppContext — 3 capas (ver sección abajo)
├── hooks/          useMetricas, useModal, useCobrar, useDarkMode, usePaginacion
├── utils/          formatters (moneda, fechas), calculos (cuotas, atraso, frecuencia),
│                   comprobante + estadoCuenta + cierre (PDFs jsPDF), compartir (Web Share),
│                   cobranza, refinanciacion, scoreCliente, gastos, servitec
├── components/
│   ├── layout/     Header (nav + hamburger mobile) + Layout (bottom nav mobile)
│   ├── ui/         MetricCard, RutaSelector, Toast, EmptyState, ConfirmDialog, ErrorBanner,
│   │               BusquedaGlobal, Paginacion, ActionMenu, ScoreBadge, BcraPanel
│   ├── dashboard/  BarChart, RutaPerformance, CuotasHoy, MoraChart
│   ├── clientes/   ClienteCard, NotasCliente
│   └── modals/     ModalDetalle, ModalNuevoPrestamo, ModalNuevoCliente, ModalPago,
│                   ModalRefinanciar, ModalRuta
├── components/     ErrorBoundary, Onboarding, PwaUpdater (raíz de components/)
└── pages/          Login, Dashboard, Cobranza, Clientes, Rutas, Movimientos, Cierre, Gastos, Equipo, AceptarInvitacion, Configuracion
```

## Modelo de datos Firestore
Paths planos, sin multi-tenancy. Colecciones en raíz:
```
config/negocio              ← capitalTotal, adminUid, creadoEn

users/{uid}                 ← perfil de auth (rol, email)

rutas/{rutaId}              ← nombre, color (hex), cobrador, creadoEn

clientes/{clienteId}        ← nombre, dni, tel, direccion, rutaId (ref), creadoEn

prestamos/{prestamoId}      ← clienteId, monto, interes, cuotas, fechaInicio, frecuenciaDias,
                              estado: 'activo'|'mora'|'finalizado',
                              cuotasDetalle: Array<{ nro, monto, vencimiento, pagada, fechaPago,
                                                     pagado?, refinanciada? }>,
                              refinanciadoEn?, refinanciaciones?  (al refinanciar)

movimientos/{movId}         ← prestamoId, clienteId, cuotaNro, monto,
                              tipo: 'cuota'|'pago-monto', fecha, creadoEn

usuarios/{uid}              ← membresía (rol, rutaId, montoAsignado, comision (%), email)

invitaciones/{token}        ← email, rol, rutaId, montoAsignado, creadoEn

notas/{notaId}              ← clienteId, texto, autor, creadoEn

gastos/{gastoId}            ← monto, categoria (fija), descripcion, fecha (YYYY-MM-DD),
                              rutaId (siempre asociado a ruta), autor, creadoEn
```

## Control de gastos
Cada gasto se asocia **siempre a una ruta**. Categorías **fijas** (`src/utils/gastos.js`):
combustible, sueldos/comisiones, alquiler, impuestos, mantenimiento, varios. Admin y
cobradores pueden registrar gastos (el cobrador queda fijado a su ruta). La página `/gastos`
usa `subscribeGastosPorRango`; el `DataContext` mantiene una suscripción global (filtrada por
ruta para cobradores) para calcular el **resultado neto** en el Dashboard
(`gananciaRealizada − gastos`).

## Modelo de negocio único (sin multi-tenancy)
Un solo negocio por instalación. El primer usuario que se registra se convierte en admin. Los cobradores se unen vía invitación. Usuarios nuevos sin invitación son rechazados. `config/negocio` almacena `adminUid` y `capitalTotal`.

El admin define su capital total y asigna una porción a cada cobrador junto con una ruta.

## Arquitectura de contexto (3 capas)
- `AuthContext` — maneja Firebase Auth, login/logout, estado `user`, `esAdmin`, `rol`.
- `DataContext` — abre listeners `onSnapshot` para rutas, clientes y préstamos; expone arrays reactivos.
- `AppContext` — compone Auth + Data + acciones CRUD (expone funciones de `firebase/services.js` directamente, sin currying).

## Roles
4 roles: `admin`, `cobrador`, `visitante`, `cliente`. Colección de membresía es `/usuarios/{uid}`. **La lógica de roles se aplica en el frontend** (rutas `AdminOnly`, gating por `puedeEditar`/`esAdmin`, datos filtrados por ruta en `DataContext`), NO en las reglas de Firestore.

## Firestore local
`initializeFirestore` usa `persistentLocalCache` con `persistentMultipleTabManager` — los datos se cachean en IndexedDB y se sincronizan entre pestañas. Esto permite operaciones offline y arranque rápido.

## Firestore Security Rules
Las reglas están en `firestore.rules` y aplican **roles a nivel servidor** (además del gating frontend): `esAdmin()` lee el rol desde `/usuarios/{uid}` (cuesta 1 lectura por operación). Restricciones: nadie puede auto-escalar rol (el doc propio en `usuarios` solo se crea vía bootstrap legítimo — `config.adminUid` libre o propio — o con token de invitación válido cuyo rol coincida); `rutas` solo las escribe admin; `clientes`/`prestamos` solo los borra admin (la UI oculta esos botones para cobradores); `movimientos` son inmutables (`update` denegado); `notas` solo las borra admin; `invitaciones` se listan solo por admin (get individual por token permitido para aceptarlas); `config` no se puede borrar. Tras editar las reglas hay que deployar: `firebase deploy --only firestore:rules`. **Importante:** una consulta que combine `where(campoA)` + `orderBy(campoB)` requiere índice compuesto; por eso `subscribeNotas` filtra por `clienteId` y ordena en el cliente (ver `services.js`).

## Deploy
Firebase Hosting configurado en `.firebaserc` (proyecto: `ciudalemana`). `firebase.json` es un archivo autogenerado y NO debe commitearse con credenciales.

## PWA
`vite-plugin-pwa` con `selfDestroying: true` — desregistra el SW automáticamente. No hay Service Worker activo en producción actualmente (decisión deliberada para evitar cache stale).

## Patrones clave
- `cobrarCuota` y `pagarMonto` usan `runTransaction` — actualizan cuota(s) y registran movimiento de forma atómica.
- `pagarMonto` distribuye el monto recibido sobre cuotas pendientes en orden (parciales → completas), registra `tipo: 'pago-monto'`.
- `revertirCuota` deshace un cobro: borra el movimiento y desmarca la cuota como pagada (transacción).
- `refinanciarPrestamo` reestructura el saldo **en el mismo préstamo** (transacción): conserva lo cobrado, reemplaza las cuotas impagas por un cronograma nuevo (nuevo interés/cantidad/frecuencia) sobre el saldo. No crea préstamo nuevo ni mueve caja, por eso no afecta `colocadoHistorico`/capital. Lógica pura en `src/utils/refinanciacion.js`. La "renovación" (préstamo nuevo al finalizar) reusa `ModalNuevoPrestamo` precargado desde el detalle.
- `DataContext` abre listeners `onSnapshot` al loguearse y los cierra al desloguearse.
- Métricas completamente derivadas de `prestamos + clientes + rutas` en `useMetricas.js` (sin estado propio).
- **PDFs con jsPDF (import dinámico):** comprobante de pago (`comprobante.js`, vectorial A5) y estado de cuenta (`estadoCuenta.js`, A4 con `jspdf-autotable`). Estilo "factura" con acento = color de la ruta. El reparto a WhatsApp lo hace `compartir.js` (Web Share API con archivo en mobile; fallback descarga + `wa.me` en desktop). `wa.me` NO permite adjuntar archivos, por eso el envío usa Web Share.
- **Cobranza del día** (`cobranza.js` + `/cobranza`): `construirItemsCobranza` arma la lista de próximas cuotas a cobrar por urgencia. Reusa `useCobrar`.
- **Cierre de caja** (`cierre.js` + `/cierre`, admin): `construirCierre` calcula por ruta cobrado/gastos/prestado/neto y la **comisión** del cobrador (`usuarios.comision` % × cobrado). Export PDF con `jspdf-autotable`.
- Score de riesgo del cliente (`src/utils/scoreCliente.js`): derivado del historial de pagos (puntualidad, mora actual, refinanciaciones, préstamos finalizados). Categorías: Excelente/Bueno/Regular/Riesgoso/Nuevo. Se muestra con `ScoreBadge` en el detalle del préstamo y al elegir cliente en el alta.
- **Verificación crediticia BCRA** (`src/utils/bcra.js` + `BcraPanel`): consulta la Central de Deudores del BCRA (`api.bcra.gob.ar`, pública, sin auth, con CORS) por CUIT o por DNI (deriva CUILs candidatos 20/27/23/24 con dígito verificador y los prueba en orden). El 404 de la API significa "sin registros", no error. Los montos del BCRA vienen en **miles de pesos** (se convierten a pesos en `resumirDeudas`). Situación 1=normal, 2=riesgo bajo, 3-5=riesgo alto/irrecuperable. El panel está en `ModalNuevoCliente` (bajo el DNI) y `ModalNuevoPrestamo` (junto al ScoreBadge); el último resultado se persiste en `clientes/{id}.bcra` (`{ fecha, cuit, peorSituacion, deudaTotal, ... }`) para no re-consultar. Complementa al score interno: el score mide historial con el negocio, el BCRA mide historial con el sistema financiero.
- **Punitorios por mora** (`src/utils/punitorios.js`): recargo automático sobre cuotas vencidas — tasa diaria % sobre el saldo, con días de gracia y tope (% del monto de la cuota). Config en `config/negocio.punitorio` (`{ activo, tasaDiariaPct, diasGracia, topePct }`), editable por admin en `/configuracion` (`CardPunitorios`). Es **informativo**: se muestra en Cobranza (debajo del pendiente) y en el detalle (`Pendiente + punit.`); no se registra como movimiento al cobrar (pendiente de v2).
- **Proyección de cobranza** (`src/utils/proyeccion.js` + `ProyeccionCaja` en Dashboard): cuotas pendientes agrupadas en semanas de 7 días desde hoy (4 semanas) + acumulado vencido ("atrasado a recuperar"). Respeta el filtro de ruta del Dashboard.
- Modales usan `useModal(onClose)` — bloquea scroll del body y cierra con Escape.
- Modales full-screen en mobile (`items-end`), centrados en desktop (`sm:items-center`).
- Bottom tab bar solo en mobile (`md:hidden`), nav horizontal en desktop.
- `esAdmin`: `true` si el rol del usuario es `'admin'`.
- Cobradores solo ven su ruta; admins ven todo. La página `/equipo` bloquea a no-admins.
- `bootstrapAdmin` crea 3 docs atómicamente: `/users/{uid}`, `/usuarios/{uid}`, `/config/negocio`.

## Variables de entorno
Crear `.env` con credenciales del proyecto Firebase (no existe `.env.example`):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Comandos
```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo (localhost:5173)
npm run build     # build de producción
npm run preview   # previsualizar build
npm run lint      # ESLint
npm run format    # Prettier (fix)
npm run format:check  # Prettier (solo verificar)
npm run test      # Vitest (una sola corrida)
npm run test:watch    # Vitest en modo watch
npx vitest run src/utils/calculos.test.js  # correr un solo archivo de test
```

## Pre-commit hooks
Husky + lint-staged: al hacer commit se ejecuta ESLint (--fix) y Prettier sobre archivos staged `.js/.jsx/.css`. Si lint falla, el commit se bloquea.

## Tests
- Framework: Vitest con jsdom + @testing-library/react.
- Setup global en `src/test/setup.js`.
- Tests de utilidades en `src/utils/*.test.js`: `calculos`, `formatters`, `comprobante`,
  `compartir`, `cobranza`, `cierre`, `refinanciacion`, `scoreCliente`, `estadoCuenta`.
- **Importar los globals de Vitest** (`import { describe, it, expect } from 'vitest'`): aunque
  Vitest corre con `globals: true`, la config de ESLint no los declara, así que sin el import
  el pre-commit (`eslint --max-warnings 0`) bloquea el commit.

## Convenciones de código
- Sin TypeScript — JS puro con JSDoc si es necesario documentar tipos complejos.
- Sin comentarios en código salvo que el WHY no sea obvio.
- Imports con alias `@/` (resuelve a `src/`).
- Formateo monetario siempre con `formatMoney()` de `@/utils/formatters`.
- Fechas siempre en formato `YYYY-MM-DD` internamente; mostrar con `formatFecha()`.
- Colores de ruta se usan inline via `style={{ background: ruta.color }}` — no mapear a clases Tailwind.

## Exportaciones / documentos
- `Movimientos` exporta CSV (nativo Blob) y PDF; `Cierre` exporta el PDF de rendición. Ambos
  vía `jspdf` + `jspdf-autotable` (import dinámico, se carga solo al usar).
- **Comprobante de pago** (al cobrar, desde el toast en `useCobrar`) y **estado de cuenta**
  (desde `ModalDetalle`): PDF + envío por WhatsApp con `compartir.js`.
- `subscribeMovimientosPorRango(desde, hasta, cb, onError)` y `subscribeGastosPorRango(...)` —
  listeners con rango de fechas, fuera del contexto global (los usan `Movimientos` y `Cierre`).
