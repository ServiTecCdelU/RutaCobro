# Skills — components/dashboard/

## Responsabilidad
Widgets específicos del tablero. Cada uno consume datos del contexto directamente o recibe props desde `Dashboard.jsx`.

## Componentes

### `BarChart`
Gráfico de barras semanal (últimos 7 días de cobranza).

```jsx
<BarChart data={m.evolucion} />
// data: number[7] — índice 0 = lunes, 6 = domingo
```

- La barra de hoy usa gradiente oscuro; las demás gris claro.
- Tooltip con el monto aparece al hacer hover (`:hover` group).
- Calcula automáticamente el día de hoy para resaltar la barra correcta.

### `RutaPerformance`
Barras horizontales comparando cobrado por ruta.

```jsx
<RutaPerformance porRuta={m.porRuta} />
// porRuta: Array<{ ...ruta, cobrado, total, porcentaje }>
```

- El ancho de cada barra es relativo al máximo cobrado entre todas las rutas.
- Muestra porcentaje de avance (cobrado / total).

### `CuotasHoy`
Lista de cuotas que vencen hoy (o ya vencidas). Conectado directamente al contexto — no necesita props de datos, solo el filtro de ruta.

```jsx
<CuotasHoy rutaActiva="all" />
```

- Ordena por días de mora descendente (las más atrasadas primero).
- Botón "Cobrar" llama a `cobrarCuota` del contexto directamente.
- Link "Ver todas" navega a `/clientes`.
- Muestra máximo 6 items. Si no hay cuotas, muestra estado vacío.

## Datos de evolución semanal
`evolucion` en `useMetricas` agrupa pagos reales por `fechaPago`. Si no hay datos históricos en Firestore, todas las barras estarán en 0 — esto es correcto para una cuenta nueva.
