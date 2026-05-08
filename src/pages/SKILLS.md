# Skills — pages/

## Responsabilidad
Páginas completas ensambladas con componentes. Cada página corresponde a una ruta de React Router.

## Rutas de la aplicación
| Path | Componente | Protegida |
|------|-----------|-----------|
| `/login` | `Login.jsx` | No |
| `/` | `Dashboard.jsx` | Sí |
| `/clientes` | `Clientes.jsx` | Sí |
| `/rutas` | `Rutas.jsx` | Sí |

Las rutas protegidas están envueltas en `<ProtectedRoute>` en `App.jsx`. Si `user === null` redirige a `/login`.

## Páginas

### `Login.jsx`
Pantalla de autenticación. Permite login y registro desde la misma vista (toggle `modo`).
- Maneja errores de Firebase Auth con mensajes en español.
- Muestra/oculta contraseña con toggle.
- Al autenticarse exitosamente → navega a `/`.

### `Dashboard.jsx`
Vista principal con métricas y widgets del día.
- Filtro de ruta con `RutaSelector` — afecta a todas las métricas via `useMetricas`.
- Grid 2 columnas en mobile, 4 en desktop para las métricas.
- Gráfico (2/3) + rendimiento por ruta (1/3) en desktop; apilados en mobile.

### `Clientes.jsx`
Lista de clientes con búsqueda, filtros y acciones.
- Búsqueda por nombre o DNI en tiempo real.
- Panel de filtros colapsable (estado + ruta).
- Grid 1 columna en mobile, 2 en desktop.
- Abre `ModalDetalle` y `ModalNuevoCliente`.

### `Rutas.jsx`
Gestión de rutas con stats por ruta.
- Cards con métricas de cada ruta (clientes, préstamos, cobrado, pendiente).
- Modal inline para crear nueva ruta con selector de color.

## Agregar una página nueva
1. Crear `src/pages/NuevaPagina.jsx`.
2. Importar y agregar `<Route>` en `App.jsx`.
3. Agregar el link en `Header.jsx` (nav desktop + menú mobile) y en `Layout.jsx` (bottom nav mobile).
