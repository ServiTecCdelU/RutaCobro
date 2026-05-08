# Skills — components/modals/

## Responsabilidad
Modales de creación y detalle. Todos siguen el mismo patrón de presentación responsiva.

## Patrón responsive de modales
```jsx
// Contenedor siempre igual:
<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
  <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[tamaño] shadow-2xl">
    ...
  </div>
</div>
```
- Mobile: aparece desde abajo (sheet), bordes redondeados solo arriba
- Desktop: centrado, bordes redondeados completos, ancho máximo acotado

## Componentes

### `ModalDetalle`
Cronograma completo de cuotas de un préstamo.

```jsx
<ModalDetalle prestamoId="p123" onClose={() => ...} />
```
- Resuelve el préstamo, cliente y ruta internamente desde el contexto.
- Cada cuota tiene botón "Cobrar" si no está pagada.
- El scroll es interno al modal (`flex-1 overflow-auto`).

### `ModalNuevoPrestamo`
Formulario con calculadora automática de cuotas.

```jsx
<ModalNuevoPrestamo onClose={() => ...} clienteIdInicial="c1" />
```
- `clienteIdInicial` es opcional — preselecciona un cliente.
- El resumen en negro (cuota + total + ganancia) se actualiza en tiempo real.
- Al confirmar, llama `crearPrestamo` del contexto y cierra.

### `ModalNuevoCliente`
Formulario para registrar un cliente nuevo.

```jsx
<ModalNuevoCliente onClose={() => ...} />
```
- Campos: nombre, DNI, teléfono, dirección, ruta (select).
- Al confirmar, llama `crearCliente` del contexto y cierra.

## Agregar un modal nuevo
1. Crear el archivo en esta carpeta siguiendo el patrón de contenedor responsive.
2. Si necesita datos, consumir `useApp()` internamente.
3. Siempre manejar estado `loading` para deshabilitar el botón mientras se guarda en Firestore.
4. Exportar como `default`.
