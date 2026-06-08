# Comprobante de pago por WhatsApp — Diseño

**Fecha:** 2026-06-08
**Estado:** Aprobado

## Problema

Cuando un cobrador registra el pago de una cuota, no hay forma de entregarle al
cliente un comprobante. Se quiere generar un comprobante PDF estéticamente cuidado
(datos del cliente, del préstamo y de la cuota abonada) y enviarlo al WhatsApp del
cliente con el menor esfuerzo posible.

## Restricción técnica clave

Los links `wa.me` / `api.whatsapp.com` **solo permiten pre-llenar texto**, no admiten
adjuntar archivos. La app es una PWA sin backend (solo Firebase). Por lo tanto el
envío 100% automático del PDF (WhatsApp Business API) queda descartado por costo y
complejidad.

**Enfoque elegido:** Web Share API nivel 2 (`navigator.share({ files, text })`). En el
celular abre el menú nativo de compartir con el PDF + el mensaje ya armados; el usuario
elige WhatsApp y el contacto. Es lo más cercano a "automático" sin backend y aprovecha
que la app es mobile-first. En escritorio (sin soporte de compartir archivos) cae a un
respaldo: descarga el PDF y abre `wa.me` con el mensaje.

## Decisiones de producto

- **Disparador:** botón "Enviar comprobante" en el toast de éxito tras cobrar, junto a
  "Deshacer". No interrumpe el flujo rápido de cobro; se usa solo cuando se quiere.
- **Contenido del PDF (todo lo elegido):**
  - Saldo y progreso restante (cuotas pagadas/total, saldo pendiente, próxima cuota).
  - Teléfono y dirección del cliente (además de nombre y DNI).
  - Número de comprobante (ID del movimiento).
  - Marca SERVITEC en el pie (igual que login/footer), como publicidad del sistema.

## Flujo

1. El cobrador cobra una cuota (flujo actual) → toast verde "Cuota cobrada".
2. El toast muestra dos botones: `Deshacer` y `Enviar comprobante`.
3. Tap en `Enviar comprobante` → se genera el PDF y se invoca `navigator.share` con el
   archivo + el mensaje → el usuario elige WhatsApp → contacto → enviado.
4. Fallback (escritorio / sin Web Share de archivos): descarga el PDF y abre `wa.me`
   con el mensaje; el usuario adjunta el PDF manualmente.

## Arquitectura

### `src/utils/comprobante.js` (nuevo)

Lógica pura + armado del PDF.

- `construirComprobantePago({ cliente, prestamo, ruta, resultado })` →
  `{ file, mensaje, nombreArchivo }`
- Importa `jsPDF` dinámicamente (igual patrón que `Movimientos.jsx`, se carga solo al
  usar). **Sin** `jspdf-autotable` y **sin** `html2canvas`: dibujado vectorial a medida
  (texto, líneas, rectángulos), lo que da un PDF liviano, nítido y con texto seleccionable
  — importante porque se comparte por WhatsApp desde el celular.
- El dibujado vectorial ya está validado en un script de preview y rasterizado para
  comparar contra el diseño aprobado; se porta tal cual al módulo.
- `mensaje`: texto de WhatsApp pre-armado, p. ej.:
  *"Hola {primerNombre}, adjunto tu comprobante de pago de la cuota X/Y por $… ¡Gracias!"*
- `nombreArchivo`: p. ej. `comprobante-{apellidoOClienteSlug}-cuota-X.pdf`.
- `resultado` es el objeto que devuelve `cobrarCuota`:
  `{ movId, monto, cuotaNro, cuotasPagadas, cuotasTotales, finalizado }`.

### `src/utils/compartir.js` (nuevo)

Entrega multiplataforma.

- `compartirComprobante({ file, mensaje, telefono })`
- Intenta `navigator.canShare?.({ files: [file] })` → `navigator.share({ files, text })`.
- Fallback: descarga el PDF (patrón Blob + `<a download>` como en `Movimientos.exportarCSV`)
  y abre `linkWhatsApp(telefono, mensaje)` en una pestaña nueva.
- `AbortError` (usuario cancela el menú de compartir) se ignora en silencio.
- Debe invocarse desde un gesto de usuario (el tap del botón) para tener activación
  transitoria válida para `navigator.share`.

### `src/components/ui/Toast.jsx` (editar)

Soportar varias acciones.

- Agregar soporte para `actions: [{ label, icon, onClick }]` con ícono por acción.
- Mantener el `action` actual funcionando (otros call sites no se rompen).
- Renderizar los botones en fila, con buen espaciado en mobile.

### `src/hooks/useCobrar.js` (editar)

Cablear el botón.

- Traer `rutas` desde `useApp`.
- Subir `duration` del toast de éxito (~8s) para dar tiempo a tocar el botón.
- Agregar la acción "Enviar comprobante" en `cobrarProxima` y `cobrarCuotaNro`,
  resolviendo `cliente`/`prestamo`/`ruta` desde el estado.
- Para datos frescos al momento del tap (no del cierre del closure), leer el préstamo
  actualizado del estado (vía ref o relectura) y usar `resultado` para los datos
  autoritativos de la cuota/progreso.

## Diseño del PDF (A5 portrait, estilo factura/recibo profesional)

Estética tipo factura corporativa (referencia: invoice de Stripe). Diseño aprobado y
verificado vía rasterizado del PDF vectorial.

- **Encabezado:** monograma "RC" (cuadrado redondeado, fondo slate-900) + marca
  "RutaCobro / Sistema de gestión de cobros" a la izquierda; a la derecha el bloque de
  documento: "COMPROBANTE DE PAGO" (label tracked), "N° RC-XXXXXXXX" (ID del movimiento,
  en monoespaciado/Courier) y la fecha de pago larga. Debajo, una **regla corta con el
  color de la ruta** como acento.
- **Cliente:** label "CLIENTE" + chip-pill con punto del color de la ruta y su nombre a la
  derecha; nombre del cliente en grande; grilla con DNI, Teléfono y Dirección.
- **Detalle del préstamo:** filas tipo línea de factura (clave a la izquierda en gris,
  valor en negrita a la derecha) separadas por hairlines: Monto otorgado, Interés,
  Total a devolver, Plan (N cuotas semanales), Inicio.
- **Caja destacada — Cuota abonada:** panel gris con **barra de acento lateral** del color
  de la ruta; a la izquierda "CUOTA ABONADA", "Cuota X de Y" y "Pagada el {fecha}"; a la
  derecha "TOTAL ABONADO" y el monto grande.
- **Progreso:** "Progreso del préstamo" + "Saldo pendiente {monto}"; barra de progreso
  (pagadas/total) con el color de la ruta; línea "X de Y cuotas pagadas · Próxima cuota:
  {fecha} · {monto}" (o "Préstamo finalizado" si corresponde).
- **Pie:** hairline + "Documento sin valor fiscal · Comprobante interno de pago" a la
  izquierda y "SERVITEC · +54 9 3442 64-6670" (tel en color de acento) a la derecha.
- Paleta sobria: ink `#0f172a`, muted `#64748b`, faint `#94a3b8`, hairline `#e4e6ee`,
  panel `#f7f8fb`; **único acento = `ruta.color`**. Tipografía Helvetica (Courier para el
  N° de comprobante). `roundedRect` para paneles/chips/barras.
- Montos con `formatMoney` y fechas con los formatters de `@/utils/formatters`.

## Tests

- `src/utils/comprobante.test.js`: arma `mensaje` y `nombreArchivo` correctos; devuelve
  un `Blob`/`File` (mockeando `jsPDF`).
- `src/utils/compartir.test.js`: usa Web Share cuando está disponible; cae al fallback
  de descarga + `wa.me` cuando no; ignora `AbortError`.

## Fuera de alcance (YAGNI)

- Sin backend ni WhatsApp Business API.
- Sin guardar el PDF en Firebase Storage (se genera en el momento).
- Sin reenvío histórico de comprobantes (solo el cobro recién hecho); puede sumarse
  después desde el `ModalDetalle`.
