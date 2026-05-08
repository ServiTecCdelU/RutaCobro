# Skills — components/layout/

## Responsabilidad
Estructura visual de la aplicación. Define la navegación y el contenedor de cada página.

## Archivos

### `Layout.jsx`
Wrapper que envuelve todas las páginas protegidas. Incluye:
- `<Header>` arriba
- `<main>` con padding responsive y `pb-24` en mobile (para no tapar con el bottom nav)
- Bottom tab bar (`md:hidden`) con links a Tablero, Clientes, Rutas
- `<ModalNuevoPrestamo>` controlado desde aquí para que esté disponible en todas las páginas

**Props:** ninguna. Recibe `children` implícito.

### `Header.jsx`
Barra superior sticky con:
- Logo + nombre de la app
- Navegación horizontal en desktop (`md:flex`)
- Botón "Nuevo préstamo" (texto en sm+, solo ícono en mobile)
- Avatar del usuario + botón logout en desktop
- Hamburger menu en mobile que despliega nav + logout

**Props:**
| Prop | Tipo | Descripción |
|------|------|-------------|
| `onNuevoPrestamo` | `() => void` | Abre el modal de nuevo préstamo |

## Responsive
| Breakpoint | Comportamiento |
|------------|---------------|
| mobile (< md) | Hamburger en header + bottom tab bar fijo |
| desktop (≥ md) | Nav horizontal en header, sin bottom bar |

## Extender la navegación
Agregar entradas en dos lugares:
1. El array en `Header.jsx` (nav links desktop + menú mobile)
2. El array en `Layout.jsx` (bottom tab bar mobile)

Ambos usan `<NavLink>` de React Router — el `isActive` se aplica automáticamente.
