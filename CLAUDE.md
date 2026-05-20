# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma
Siempre responder en español.

# RutaCobro — Contexto del proyecto

## ¿Qué es?
Sistema de gestión de cartera de préstamos organizados por rutas de cobro. Reemplaza a PlutoFM (AdminLTE 2015). Permite registrar clientes, crear préstamos con cuotas semanales, cobrar cuotas en 1 click y ver métricas en tiempo real.

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
├── utils/          formatters (moneda, fechas) + calculos (cuotas, atraso, fechas)
├── components/
│   ├── layout/     Header (nav + hamburger mobile) + Layout (bottom nav mobile)
│   ├── ui/         MetricCard, RutaSelector, Toast, EmptyState, ConfirmDialog, ErrorBanner,
│   │               BusquedaGlobal, Paginacion, ActionMenu
│   ├── dashboard/  BarChart, RutaPerformance, CuotasHoy, MoraChart
│   ├── clientes/   ClienteCard, NotasCliente
│   └── modals/     ModalDetalle, ModalNuevoPrestamo, ModalNuevoCliente, ModalPago, ModalRuta
├── components/     ErrorBoundary, Onboarding, PwaUpdater (raíz de components/)
└── pages/          Login, Dashboard, Clientes, Rutas, Movimientos, Equipo, AceptarInvitacion, Configuracion
```

## Modelo de datos Firestore
Paths planos, sin multi-tenancy. Colecciones en raíz:
```
config/negocio              ← capitalTotal, adminUid, creadoEn

users/{uid}                 ← perfil de auth (rol, email)

rutas/{rutaId}              ← nombre, color (hex), cobrador, creadoEn

clientes/{clienteId}        ← nombre, dni, tel, direccion, rutaId (ref), creadoEn

prestamos/{prestamoId}      ← clienteId, monto, interes, cuotas, fechaInicio,
                              estado: 'activo'|'mora'|'finalizado',
                              cuotasDetalle: Array<{ nro, monto, vencimiento, pagada, fechaPago }>

movimientos/{movId}         ← prestamoId, clienteId, cuotaNro, monto,
                              tipo: 'cuota'|'pago-monto', fecha, creadoEn

usuarios/{uid}              ← membresía (rol, rutaId, montoAsignado, email)

invitaciones/{token}        ← email, rol, rutaId, montoAsignado, creadoEn

notas/{notaId}              ← clienteId, texto, autor, creadoEn
```

## Modelo de negocio único (sin multi-tenancy)
Un solo negocio por instalación. El primer usuario que se registra se convierte en admin. Los cobradores se unen vía invitación. Usuarios nuevos sin invitación son rechazados. `config/negocio` almacena `adminUid` y `capitalTotal`.

El admin define su capital total y asigna una porción a cada cobrador junto con una ruta.

## Arquitectura de contexto (3 capas)
- `AuthContext` — maneja Firebase Auth, login/logout, estado `user`, `esAdmin`, `rol`.
- `DataContext` — abre listeners `onSnapshot` para rutas, clientes y préstamos; expone arrays reactivos.
- `AppContext` — compone Auth + Data + acciones CRUD (expone funciones de `firebase/services.js` directamente, sin currying).

## Roles (Firestore rules)
4 roles: `admin`, `cobrador`, `visitante`, `cliente`. Colección de membresía es `/usuarios/{uid}`. Las reglas validan permisos por rol y por ruta asignada.

## PWA
`vite-plugin-pwa` con `selfDestroying: true` — desregistra el SW automáticamente. No hay Service Worker activo en producción actualmente (decisión deliberada para evitar cache stale).

## Patrones clave
- `cobrarCuota` y `pagarMonto` usan `runTransaction` — actualizan cuota(s) y registran movimiento de forma atómica.
- `pagarMonto` distribuye el monto recibido sobre cuotas pendientes en orden (parciales → completas), registra `tipo: 'pago-monto'`.
- `revertirCuota` deshace un cobro: borra el movimiento y desmarca la cuota como pagada (transacción).
- `DataContext` abre listeners `onSnapshot` al loguearse y los cierra al desloguearse.
- Métricas completamente derivadas de `prestamos + clientes + rutas` en `useMetricas.js` (sin estado propio).
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
- Tests existentes: `src/utils/calculos.test.js`, `src/utils/formatters.test.js`.
- Vitest usa `globals: true` — no hace falta importar `describe`/`it`/`expect`.

## Convenciones de código
- Sin TypeScript — JS puro con JSDoc si es necesario documentar tipos complejos.
- Sin comentarios en código salvo que el WHY no sea obvio.
- Imports con alias `@/` (resuelve a `src/`).
- Formateo monetario siempre con `formatMoney()` de `@/utils/formatters`.
- Fechas siempre en formato `YYYY-MM-DD` internamente; mostrar con `formatFecha()`.
- Colores de ruta se usan inline via `style={{ background: ruta.color }}` — no mapear a clases Tailwind.

## Exportaciones
- `Movimientos` exporta CSV (nativo Blob) y PDF vía `jspdf` + `jspdf-autotable` (import dinámico, se carga solo al usar).
- `subscribeMovimientosPorRango(uid, desde, hasta, cb, onError)` — listener con rango de fechas, fuera del contexto global.
