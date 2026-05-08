# Skills — hooks/

## Responsabilidad
Lógica derivada reutilizable. Los hooks no tienen estado propio ni efectos secundarios — solo computan a partir de los datos del contexto.

## Hooks disponibles

### `useMetricas(prestamos, clientes, rutas, rutaActiva)`
Calcula todas las métricas del dashboard a partir de los datos crudos.

**Retorna:**
```js
{
  cobradoTotal,      // Suma de cuotas pagadas
  porCobrar,         // Suma de cuotas pendientes
  colocado,          // Suma de capitales de préstamos activos
  montoMora,         // Suma de cuotas vencidas sin pagar
  tasaMora,          // % cuotas en mora sobre total de cuotas
  cuotasHoyCant,     // Cantidad de cuotas que vencen hoy
  aCobrarHoy,        // Monto de cuotas que vencen hoy
  enMoraCant,        // Cantidad de cuotas en mora
  porRuta,           // Array con stats por ruta: { ...ruta, cobrado, total, porcentaje }
  evolucion,         // Array[7] con cobrado agrupado por fecha de pago (últimos 7 días)
}
```

**Importante:** filtra por `rutaActiva` — si es `'all'` incluye todos los préstamos.

**Está memoizado con `useMemo`** — solo recalcula cuando cambian `prestamos`, `clientes`, `rutas` o `rutaActiva`.

## Cómo agregar un hook
Crear `src/hooks/useNombre.js`. Si necesita datos, recibirlos como parámetros (no llamar `useApp` dentro — mantener hooks puros y testeables).

## Ejemplo de uso
```jsx
import { useMetricas } from '@/hooks/useMetricas';
const { rutas, clientes, prestamos } = useApp();
const m = useMetricas(prestamos, clientes, rutas, rutaActiva);
```
