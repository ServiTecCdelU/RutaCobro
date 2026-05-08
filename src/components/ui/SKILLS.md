# Skills — components/ui/

## Responsabilidad
Componentes visuales genéricos y reutilizables en cualquier página.

## Componentes

### `MetricCard`
Tarjeta de métrica con ícono, valor principal y variación porcentual opcional.

```jsx
<MetricCard
  label="Cobrado total"       // texto pequeño arriba
  value="$150.000"            // valor principal grande
  change={12.5}               // opcional: % cambio (verde si ≥0, rojo si <0)
  icon={TrendingUp}           // componente de lucide-react
  accent="#10b981"            // color hex del acento
  sublabel="Acumulado"        // opcional: texto chico abajo
/>
```

El `accent` controla: color del ícono, fondo suave del ícono y el círculo decorativo de fondo.

### `RutaSelector`
Tabs horizontales con scroll horizontal para filtrar por ruta. Siempre incluye "Todas".

```jsx
<RutaSelector
  rutas={rutas}               // Ruta[] del contexto
  rutaActiva="r1"             // id de ruta o 'all'
  onSelect={(id) => ...}      // callback al cambiar
/>
```

El botón activo usa el `color` de la ruta como background. Tiene `no-scrollbar` para ocultar scrollbar en mobile.

## Agregar componentes UI
Criterio para poner algo aquí: si el componente no tiene lógica de negocio y podría usarse en más de una página → va en `ui/`.

Si tiene lógica específica del dominio (préstamos, clientes, rutas) → va en su módulo específico.
