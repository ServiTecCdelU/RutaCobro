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
├── firebase/       Configuración e inicialización de Firebase + todos los servicios Firestore
├── context/        AppContext — estado global, listeners onSnapshot, acciones CRUD
├── hooks/          useMetricas, useModal
├── utils/          formatters (moneda, fechas) + calculos (cuotas, atraso, fechas)
├── components/
│   ├── layout/     Header (nav + hamburger mobile) + Layout (bottom nav mobile)
│   ├── ui/         MetricCard, RutaSelector, Toast, EmptyState, ConfirmDialog, ErrorBanner
│   ├── dashboard/  BarChart, RutaPerformance, CuotasHoy
│   ├── clientes/   ClienteCard
│   └── modals/     ModalDetalle, ModalNuevoPrestamo, ModalNuevoCliente, ModalPago, ModalRuta
└── pages/          Login, Dashboard, Clientes, Rutas, Movimientos, Equipo, AceptarInvitacion
```

## Modelo de datos Firestore
```
tenants/{userId}/
  rutas/{rutaId}
    nombre: string
    color: string (hex)
    cobrador: string
    creadoEn: Timestamp

  clientes/{clienteId}
    nombre: string
    dni: string
    tel: string
    direccion: string
    rutaId: string (ref a rutas)
    creadoEn: Timestamp

  prestamos/{prestamoId}
    clienteId: string (ref a clientes)
    monto: number (capital)
    interes: number (%)
    cuotas: number (cantidad)
    fechaInicio: string (YYYY-MM-DD)
    estado: 'activo' | 'mora' | 'finalizado'
    cuotasDetalle: Array<{
      nro: number
      monto: number
      vencimiento: string (YYYY-MM-DD)
      pagada: boolean
      fechaPago: string | null
    }>
    creadoEn: Timestamp

  movimientos/{movId}           ← auditoría de cada cobro
    prestamoId: string
    clienteId: string
    cuotaNro: number
    monto: number
    tipo: 'cuota' | 'pago-monto'  ← 'pago-monto' indica pago parcial
    fecha: string (YYYY-MM-DD)
    creadoEn: Timestamp

  miembros/{uid}                ← cobradores del tenant
    email: string
    rol: 'admin' | 'cobrador'
    rutaId: string (solo cobradores)
    creadoEn: Timestamp

  invitaciones/{token}          ← links pendientes de aceptar
    email: string
    rutaId: string
    creadoEn: Timestamp
```

## Multi-tenancy
Cada usuario autenticado es su propio tenant. `tenantId = user.uid`. Todos los paths de Firestore usan `tenants/${tenantId}/...`. Preparado para escalar a múltiples operadores sobre un mismo tenant (agregar roles en Firestore).

## Patrones clave
- `cobrarCuota` y `pagarMonto` usan `runTransaction` — actualizan cuota(s) y registran movimiento de forma atómica.
- `pagarMonto` distribuye el monto recibido sobre cuotas pendientes en orden (parciales → completas), registra `tipo: 'pago-monto'`.
- `revertirCuota` deshace un cobro: borra el movimiento y desmarca la cuota como pagada (transacción).
- `AppContext` abre listeners `onSnapshot` al loguearse y los cierra al desloguearse.
- Métricas completamente derivadas de `prestamos + clientes + rutas` en `useMetricas.js` (sin estado propio).
- Modales usan `useModal(onClose)` — bloquea scroll del body y cierra con Escape.
- Modales full-screen en mobile (`items-end`), centrados en desktop (`sm:items-center`).
- Bottom tab bar solo en mobile (`md:hidden`), nav horizontal en desktop.
- `esAdmin` en AppContext: `true` si `user.uid === tenantId` (dueño del tenant).
- Cobradores solo ven su ruta; admins ven todo. La página `/equipo` bloquea a no-admins.

## Variables de entorno
Copiar `.env.example` → `.env` y completar con credenciales del proyecto Firebase.
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
```

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
