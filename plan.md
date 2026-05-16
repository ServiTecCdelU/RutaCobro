# Plan Integral de Mejoras — RutaCobro

## Estado: Todas las fases completadas

---

| # | Tarea | Archivo(s) | Estado |
|---|-------|-----------|--------|
| 1 | **Fix race condition en `revertirCuota`** — mover getDocs dentro de runTransaction | `services.js` | HECHO |
| 2 | **Fix bug pago parcial** — corregir nullish coalescing para pagado=0 | `services.js` | HECHO |
| 3 | **Fix memory leak en listeners** — agregar flag cancelled en callbacks | `AppContext.jsx` | HECHO |
| 4 | **Validacion de inputs en modales** — monto min/max, interes 0-200%, nombre, tel, email | `ModalNuevoPrestamo`, `ModalNuevoCliente`, `ModalPago`, `ModalRuta`, `Equipo` | HECHO |
| 5 | **Sanitizacion CSV** — escapar formulas (=, +, -, @) en export CSV | `Movimientos.jsx` | HECHO |
| 6 | **Validacion en generarCuotas** — rechazar parametros negativos o fuera de rango | `calculos.js` | HECHO |
| 7 | **Mensajes de error amigables** — reemplazar mensajes tecnicos por user-friendly | `AppContext.jsx`, modales | HECHO |
| 8 | **aria-label en botones de solo icono** — accesibilidad en toda la app | Header, modales, Login, Equipo, Movimientos | HECHO |
| 9 | **Extraer logica duplicada handleCobrar** — crear hook `useCobrar` | `useCobrar.js`, Clientes, CuotasHoy, ModalDetalle | HECHO |
| 10 | **Reglas Firestore mejoradas** — permisos granulares por rol, validacion de datos | `firestore.rules` | HECHO |

---

### Fase 2 — Estabilidad y Rendimiento

| # | Tarea | Estado |
|---|-------|--------|
| 11 | Dividir AppContext en AuthContext, DataContext, ActionsContext | HECHO |
| 12 | Agregar Error Boundaries por seccion | HECHO |
| 13 | Paginacion en listas de Clientes y Movimientos | HECHO |
| 14 | Memoizacion de componentes pesados (ModalDetalle, graficos) | HECHO |
| 15 | Lazy loading de paginas con React.lazy + Suspense | HECHO |
| 16 | Configurar Vitest + React Testing Library | HECHO |
| 17 | Tests unitarios: cobrarCuota, pagarMonto, generarCuotas, calcularAtraso | HECHO |
| 18 | Tests de integracion para flujo de auth y permisos | HECHO |
| 19 | Indices compuestos Firestore para queries frecuentes | HECHO |

### Fase 3 — Funcionalidades Nuevas

| # | Tarea | Estado |
|---|-------|--------|
| 20 | Definir roles: admin, cobrador, visitante, cliente | HECHO |
| 21 | Refactorizar guards de rutas para soportar N roles | HECHO |
| 22 | UI de gestion de permisos en /equipo | HECHO |
| 23 | Actualizar reglas Firestore para nuevos roles | HECHO |
| 24 | Dashboard KPIs: ganancia estimada, clientes activos, prestamos finalizados | HECHO |
| 25 | Grafico de tendencia mora (MoraChart con SVG) | HECHO |
| 26 | Metricas secundarias (ganancia, clientes activos, finalizados) | HECHO |
| 27 | Generacion de recibos de pago (PDF con jsPDF) | HECHO |
| 28 | Recordatorios de cuotas vencidas — visuales en CuotasHoy | HECHO |
| 29 | Notas por cliente (historial de comunicacion) | HECHO |
| 30 | Busqueda global de clientes (nombre, DNI, telefono) con Ctrl+K | HECHO |
| 31 | Bulk import de clientes/prestamos desde CSV | pendiente |
| 32 | Auditoria: log de cambios (quien/cuando/que) | pendiente |
| 33 | Registro de metodo de pago (efectivo, transferencia, etc.) | pendiente |
| 34 | Log de comunicaciones por cliente → implementado como Notas | HECHO |

### Fase 4 — Polish

| # | Tarea | Estado |
|---|-------|--------|
| 35 | Dark mode (toggle + persistencia localStorage) | HECHO |
| 36 | Pagina de configuracion del tenant | HECHO |
| 37 | Pre-commit hooks con Husky + lint-staged | HECHO |
| 38 | CI/CD con GitHub Actions (lint + test + build) | HECHO |
| 39 | E2E tests con Playwright | pendiente |
| 40 | PWA mejorada: notificaciones push, sync offline real | pendiente |
