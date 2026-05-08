# Skills — utils/

## Responsabilidad
Funciones puras de formateo y cálculo. Sin estado, sin efectos secundarios, sin dependencias de React.

## `formatters.js`

| Función | Uso |
|---------|-----|
| `formatMoney(n)` | `150000` → `$150.000` (locale es-AR) |
| `formatFecha(str)` | `'2026-04-18'` → `'18 abr'` |
| `formatFechaLarga(str)` | `'2026-04-18'` → `'sábado, 18 de abril de 2026'` |

**Regla:** nunca formatear fechas ni moneda manualmente en los componentes — siempre usar estas funciones.

## `calculos.js`

| Función | Uso |
|---------|-----|
| `hoy()` | Devuelve la fecha de hoy como `YYYY-MM-DD` |
| `sumarDias(fechaStr, dias)` | Suma días a una fecha string, devuelve string |
| `diasDeAtraso(cuota)` | Días de mora de una cuota no pagada. Devuelve 0 si está pagada o no venció. |
| `generarCuotas(monto, interes, cant, fechaInicio, frecDias?)` | Genera el array `cuotasDetalle` para un préstamo nuevo. `frecDias` default 7 (semanal). |
| `proximaCuotaPendiente(prestamo)` | Primera cuota del préstamo que no esté pagada, o `null`. |

## Convenciones de fecha
- Internamente siempre `YYYY-MM-DD` (string ISO).
- Al construir `new Date()` desde string, agregar `'T00:00:00'` para evitar desfasaje de timezone: `new Date(str + 'T00:00:00')`.
- Nunca usar `new Date()` directamente en componentes — usar `hoy()`.
