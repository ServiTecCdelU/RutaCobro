# Skills — context/

## Responsabilidad
Estado global de la aplicación. Conecta Firebase con los componentes React mediante `useContext`.

## Archivos
| Archivo | Rol |
|---------|-----|
| `AppContext.jsx` | Provider con estado de auth, datos en tiempo real y acciones CRUD. |

## Estado expuesto por `useApp()`
```js
{
  user,          // FirebaseUser | null | undefined (undefined = cargando auth)
  rutas,         // Ruta[]
  clientes,      // Cliente[]
  prestamos,     // Prestamo[]
  dataLoading,   // boolean — true mientras los 3 listeners no confirmaron su primera carga

  // Acciones (wrappean services.js con el tenantId ya inyectado)
  crearRuta(data),
  actualizarRuta(id, data),
  crearCliente(data),
  actualizarCliente(id, data),
  crearPrestamo(data),
  cobrarCuota(prestamoId, nroCuota),
}
```

## Ciclo de vida de los listeners
- Al cambiar `user` → si hay usuario, abre 3 `onSnapshot` y espera confirmación de los 3 antes de apagar `dataLoading`.
- Al desloguearse → llama los 3 `unsubscribe` y resetea arrays a `[]`.
- `user === undefined` significa que Firebase todavía no resolvió el estado de auth (primer render).

## Cómo consumir
```jsx
import { useApp } from '@/context/AppContext';

const { clientes, crearCliente } = useApp();
```

## Cómo extender
Para agregar una nueva colección (ej: `movimientos`):
1. Agregar `subscribeMovimientos` en `services.js`.
2. Agregar `useState([])` y el listener en el `useEffect` de `AppContext`.
3. Sumar al objeto de la condición `loaded` y exponerlo en el `value`.
