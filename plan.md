# Plan de mejoras — RutaCobro

> Documento vivo. Se actualiza el estado de cada tarea a medida que avanza.
> Estados: ⬜ pendiente · 🟡 en progreso · ✅ hecho · ⏸️ pausado/decisión pendiente

Última actualización: 2026-05-28

---

## Resumen ejecutivo

Análisis del proyecto + 4 ejes de mejora pedidos:

1. **Responsive** — el layout funciona pero hay puntos de quiebre flojos (grids de 3 columnas fijas en mobile, header denso, listas sin scroll horizontal controlado).
2. **Estilo** — base sólida (Tailwind + paleta brand), pero falta cohesión en dark mode, estados vacíos y jerarquía visual; el dark mode está parcheado a mano en `index.css` en vez de usar utilidades `dark:`.
3. **Control de gastos** — feature **nuevo** (no existe). Es la pieza que falta para calcular el **resultado neto real** del negocio.
4. **Auditoría de cálculos** — se encontraron **varios bugs e inconsistencias** (detalle abajo). Hay métricas mal etiquetadas y un gráfico de mora que reconstruye mal el histórico.

---

## 🔴 Auditoría de cálculos (Eje 4) — Hallazgos

### BUG-1 · `colocado` incluye préstamos finalizados → **CRÍTICO**
`src/hooks/useMetricas.js:24` suma `p.monto` de **todos** los préstamos filtrados, no solo los activos.
Consecuencias:
- "Capital colocado" / "En calle" (Dashboard) queda **inflado**: incluye préstamos ya cobrados.
- "Disponible" = `capitalTotal − colocado` queda **subestimado de forma permanente**: el capital de préstamos finalizados nunca "vuelve" al disponible.
- El `sublabel` dice *"En préstamos activos"* pero suma todos → contradicción directa.
- **Fix:** separar `colocado` (histórico) de `colocadoActivo` (solo `activo`/`mora`). Usar el activo para capital en calle y disponible.

### BUG-2 · "Ganancia estimada" mal etiquetada → **ALTO**
`Dashboard.jsx:155` la muestra como *"Interés total generado"*, pero `useMetricas` calcula el **interés proyectado de toda la cartera** (cobrado o no).
- **Fix:** renombrar a "Ganancia proyectada" y agregar **"Ganancia realizada"** = interés efectivamente cobrado (`cobradoTotal − capitalRecuperado`).

### BUG-3 · `BarChart` salta el día del medio al calcular tendencia → **MEDIO**
`src/components/dashboard/BarChart.jsx:17-18`: compara `data.slice(0,3)` vs `data.slice(4)` → **ignora `data[3]`** (el día central). El % de cambio es arbitrario.
- **Fix:** comparar bloques consistentes (primeros 3 vs últimos 3).

### BUG-4 · `moraPorDia` reconstruye mal el histórico → **ALTO**
`useMetricas.js:108-122`: para cada día pasado usa el **estado ACTUAL** de pago de las cuotas. Una cuota pagada hoy aparece como "no en mora" hace 5 días, aunque en ese momento sí estaba vencida e impaga. El gráfico de tendencia de mora es **engañoso**.
- **Fix:** documentar limitación y/o reconstruir desde `movimientos`; mínimo re-etiquetar para no afirmar un histórico falso.

### BUG-5 · "Cobranza semanal" no refleja pagos parciales por fecha → **MEDIO**
`useMetricas.js:71-78`: solo cuenta cuotas con `pagada === true` el día de su `fechaPago`, sumando el monto completo. Los pagos parciales (`tipo: 'pago-monto'`) no se reflejan en la fecha real. No coincide con la página **Caja** (que sí lee `movimientos` reales).
- **Fix:** derivar la evolución semanal de `movimientos` (fuente de verdad de la caja).

### OBS-6 · Capital disponible del cobrador no recupera capital cobrado → **DECISIÓN**
`Dashboard.jsx:58-61` y `ModalNuevoPrestamo.jsx:34-37`: `capitalEnCalle` = suma de `p.monto` de activos, sin descontar el capital ya recuperado por cuotas cobradas. Subestima el disponible mientras el préstamo no esté 100% finalizado.
- **Decisión de negocio:** ¿el capital se libera cuota a cuota o solo al finalizar? Documentar y aplicar.

### Información adicional propuesta (Eje 4 — "más información")
Métricas que hoy no existen y aportan valor:
- **Ganancia realizada vs proyectada** y **ROI %** de la cartera.
- **Capital recuperado** (cuánto del capital prestado ya volvió).
- **Resultado neto** = ganancia cobrada − **gastos** (enlaza con Eje 3).
- **Mora por antigüedad** (buckets 1-7 / 8-30 / +30 días).
- **Proyección de cobranza** próximos 7 días (cuotas que vencen).
- **Cumplimiento del día** = cobrado hoy / esperado hoy (%).
- **Ticket promedio** de préstamo.

---

## ⚠️ Hallazgos fuera de alcance (seguridad) — recomendado abordar

- **SEC-1 · `firestore.rules` permite todo a cualquier autenticado** (`allow read, write: if request.auth != null`). El `CLAUDE.md` afirma reglas por rol/ruta, pero el archivo real **no las implementa**. Un cobrador podría leer/escribir datos de otras rutas vía API. → Endurecer reglas por rol.
- **SEC-2 · Email admin hardcodeado** en `AuthContext.jsx:109` (`daromdaro@gmail.com`) otorga acceso admin directo. Mover a config y documentar.

*(Se registran aquí; se abordan solo si se confirma el alcance.)*

---

## Fases de ejecución

### Fase 0 · Análisis y plan ✅
- [x] Leer arquitectura, contextos, servicios, cálculos, páginas y estilos
- [x] Documentar bugs de cálculo
- [x] Crear `plan.md`

### Fase 1 · Auditoría de cálculos + métricas nuevas (Eje 4) ✅
- [x] BUG-1: `colocado` ahora = capital activo/mora; se agregó `colocadoHistorico`
- [x] BUG-2: ganancia realizada vs proyectada + ROI + labels corregidos en Dashboard
- [x] BUG-3: corregido el cálculo de tendencia en `BarChart` (primeros 3 vs últimos 3)
- [x] Nuevas métricas: capital recuperado, ROI, mora por antigüedad (buckets), proyección 7 días, ticket promedio
- [x] Tests de `useMetricas` (4 casos, valida BUG-1 y métricas nuevas) — 41 tests en verde
- [x] BUG-4: `moraPorDia` engañoso eliminado; reemplazado por "Mora por antigüedad" (honesto). `MoraChart.jsx` quedó huérfano → limpiar en Fase 5
- [ ] BUG-5: derivar "Cobranza semanal" de `movimientos` (pendiente; hoy documentado como limitación en el hook)

### Fase 2 · Control de gastos (Eje 3) ✅
Decisiones: categorías **fijas** · gasto **siempre por ruta** · cargan **admin + cobradores**.
- [x] Modelo Firestore `gastos/{id}` (monto, categoría, descripción, fecha, rutaId, autor)
- [x] `firebase/services.js`: CRUD + `subscribeGastos` + `subscribeGastosPorRango`
- [x] Reglas Firestore para `gastos`
- [x] Categorías fijas + totales por categoría (`src/utils/gastos.js`)
- [x] Página `/gastos` + ruta + navegación (Header desktop/mobile + bottom nav)
- [x] Modal alta/edición de gasto (`ModalGasto`, ruta fija para cobrador)
- [x] **Resultado neto** (ganancia cobrada − gastos) integrado en Dashboard
- [x] Export CSV de gastos (patrón de Caja, con sanitización)
- [x] Tests de cálculo de gastos (5 casos) — total 46 tests en verde
- [ ] Export PDF de gastos (opcional, pendiente)

### Fase 3 · Responsive (Eje 1) 🟡
- [x] Grids `grid-cols-3` fijos del Dashboard → responsive (apilados/2-col en mobile)
- [x] **Densidad mobile**: `MetricCard` compacto en mobile (padding, ícono y número más chicos) para ver más datos en pantalla chica
- [x] Login responsive (split en desktop, apilado en mobile)
- [x] Densidad mobile aplicada a **Clientes, Caja y Rutas** (padding/íconos/números compactos)
- [x] Rutas: cards a 2 por fila en mobile
- [x] Bottom nav contempla el nuevo ítem Gastos (íconos/labels compactos)
- [ ] Header: densidad en breakpoints intermedios, evitar overflow de acciones
- [x] **ClienteCard rediseñado vertical** → ahora Clientes muestra 2 cards por fila en mobile (igual que Dashboard/Rutas)
- [x] Índices Firestore de `gastos` agregados (`firestore.indexes.json`) + `firebase.json` referencia indexes
- [x] Eliminado `reglasfirebase.js` (reglas viejas multi-tenant, obsoletas)
- [ ] Verificar 320 / 375 / 768 / 1024 / 1440 con dispositivo/DevTools

### Fase 4 · Estilo (Eje 2) 🟡
- [x] **Login rediseñado**: split-screen con panel de marca "Sistema de gestión de cobros" (gradientes, grilla, mockup de métrica flotante, features), formulario limpio a la derecha, fallback apilado en mobile
- [ ] Migrar dark mode parcheado en `index.css` a utilidades `dark:` reales (deuda técnica)
- [ ] Tokens de diseño: spacing/typography coherente
- [ ] Jerarquía visual en Dashboard (agrupar métricas por significado)
- [ ] Estados vacíos y de carga más cuidados
- [ ] Estados hover/focus/active consistentes y accesibles
- [ ] Revisión de contraste (dark + light) y `focus-ring`

### Fase 5 · Cierre ⬜
- [ ] `npm run lint` + `npm run format` + `npm run test` en verde
- [ ] `npm run build` sin errores
- [ ] Revisión final responsive/dark
- [ ] Actualizar `CLAUDE.md` con el nuevo modelo de datos (gastos) y métricas

---

## Notas de avance

- **2026-05-28** — Análisis completo. Plan creado.
- **2026-05-28** — ✅ Fase 1 (cálculos): fix BUG-1/2/3/4, métricas nuevas, tests (41 verde), build OK.
- **2026-05-28** — ✅ Login rediseñado (split-screen "Sistema de gestión de cobros").
- **2026-05-28** — ✅ Densidad mobile en `MetricCard` (cards y números más chicos en celular) + 2 por fila.
- **2026-05-28** — ✅ Fase 2 (Control de gastos): modelo, servicios, reglas, página `/gastos`, modal, resultado neto en Dashboard, export CSV, tests. 46 tests en verde, build OK.
- **2026-05-28** — ✅ Densidad mobile extendida a Clientes, Caja y Rutas (Rutas a 2 por fila).
- **Próximo:** Fase 4 estilo (migrar dark mode a utilidades `dark:`), Fase 5 cierre (limpiar `MoraChart` huérfano, verificación responsive en dispositivos).

---

## Historial previo (plan anterior — completado)

El proyecto ya pasó por un plan previo de estabilización (race conditions, validaciones,
reglas iniciales, roles, dark mode, tests base, lazy loading, etc.). Pendientes que
quedaron de ese plan y siguen vigentes: bulk import CSV, log de auditoría, método de pago,
E2E con Playwright, PWA con push/sync offline.
