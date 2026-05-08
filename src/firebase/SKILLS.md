# Skills — firebase/

## Responsabilidad
Inicialización de Firebase y todas las operaciones contra Firestore y Auth.

## Archivos
| Archivo | Rol |
|---------|-----|
| `config.js` | Inicializa la app Firebase con variables de entorno. Exporta `auth` y `db`. |
| `services.js` | Todos los servicios CRUD y listeners en tiempo real. |

## Servicios disponibles (`services.js`)

### Listeners (tiempo real)
```js
subscribeRutas(tenantId, cb)      // onSnapshot → rutas[]
subscribeClientes(tenantId, cb)   // onSnapshot → clientes[] ordenados por nombre
subscribePrestamos(tenantId, cb)  // onSnapshot → prestamos[] ordenados por fechaInicio desc
```
Devuelven la función `unsubscribe` — llamarla en el cleanup del useEffect.

### Rutas
```js
crearRuta(tenantId, { nombre, color, cobrador })
actualizarRuta(tenantId, id, data)
eliminarRuta(tenantId, id)
```

### Clientes
```js
crearCliente(tenantId, { nombre, dni, tel, direccion, rutaId })
actualizarCliente(tenantId, id, data)
```

### Préstamos
```js
crearPrestamo(tenantId, { clienteId, monto, interes, cuotas, fechaInicio, cuotasDetalle })
cobrarCuota(tenantId, prestamoId, nroCuota)   // ← usa runTransaction (atómico)
```

## Transacción `cobrarCuota`
Operación crítica. En una sola transacción:
1. Lee el documento del préstamo.
2. Marca la cuota como `pagada: true` con `fechaPago: hoy`.
3. Si todas las cuotas quedaron pagadas → cambia `estado` a `'finalizado'`.
4. Escribe un documento en `movimientos/` como auditoría.

Si algún paso falla, Firestore revierte todo automáticamente.

## Agregar nuevos servicios
- Seguir el patrón `col(tenantId, 'nombre-coleccion')` para los paths.
- Para operaciones que modifiquen más de un documento, usar siempre `runTransaction`.
- Para operaciones de solo lectura masiva, usar `getDocs` en lugar de `onSnapshot`.

## Variables de entorno requeridas
Todas con prefijo `VITE_FIREBASE_` — ver `.env.example` en la raíz.
