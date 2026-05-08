# Skills — components/clientes/

## Responsabilidad
Componentes de visualización y acción sobre clientes y sus préstamos.

## Componentes

### `ClienteCard`
Tarjeta de cliente con resumen del préstamo activo, barra de progreso y acciones.

```jsx
<ClienteCard
  cliente={cliente}       // objeto cliente de Firestore
  prestamo={prestamo}     // objeto préstamo asociado
  ruta={ruta}             // objeto ruta (para color y nombre)
  onPagar={fn}            // (prestamoId) => void — cobra siguiente cuota
  onDetalle={fn}          // (prestamoId) => void — abre ModalDetalle
/>
```

**Estados visuales:**
- Normal: barra de progreso en color de ruta
- En mora: barra roja + badge "Xd mora" con ícono de alerta

**Responsive:** el layout interno usa flexbox y `min-w-0 truncate` para que el nombre largo no rompa el layout en mobile.

## Agregar más componentes de clientes
Ejemplos de componentes que podrían agregarse aquí:
- `ClienteListItem` — versión compacta para listas largas
- `ClienteDetallePage` — página de detalle de un cliente con historial completo
- `ClienteStats` — mini stats del cliente (total prestado, total pagado, mora histórica)
