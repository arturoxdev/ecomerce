# ADR-012: Order Ticket en PDF con @react-pdf/renderer (sin Chromium)

**Estado:** Aceptado — 2026-07-07

## Contexto

El admin necesita descargar, desde el detalle de orden
(`/admin/orders/[id]`), un **Order Ticket**: un PDF tamaño carta con el
resumen de la orden (ver `CONTEXT.md`). El requerimiento original pedía
"un diseño en HTML" convertido a PDF, con descarga automática y nombre de
archivo igual al id de la orden.

El repo no tiene ninguna librería de PDF. El frontend se deploya en
**Vercel serverless** (`docs/stack.md`); la única pieza HTML→documento
existente es el template de react-email (`lib/email/templates/new-order-admin.tsx`),
que produce HTML para correo, no PDF.

## Decisión

Generar el PDF **en el servidor con `@react-pdf/renderer`**, en un route
handler `GET app/api/admin/orders/[id]/ticket/route.ts` que valida sesión +
`storeId`, arma los datos con `findByIdWithItems` y responde
`Content-Disposition: attachment; filename="<orderId>.pdf"`.

El diseño del ticket se escribe en las **primitivas de react-pdf**
(`<Document>/<Page>/<View>/<Text>`), **no en HTML/CSS literal**, aunque el
requerimiento decía "diseño en HTML". Lo que se preserva del requerimiento es
el resultado visual (documento sencillo con header, datos del comprador, tabla
de productos y resumen de cobro), no la tecnología de maquetado.

## Por qué es la decisión correcta

Convertir HTML a PDF con fidelidad requiere un motor de navegador. En Vercel
serverless eso significa `@sparticuz/chromium` (+ playwright/puppeteer-core):
~50 MB por función, cold starts de varios segundos y roturas recurrentes al
actualizar versiones de Chromium/Next. `@react-pdf/renderer` produce PDF
nativo (texto seleccionable, decenas de KB) con dependencias puras de JS,
compatible con el runtime de Vercel sin configuración especial.

### Alternativas rechazadas

| Alternativa | Motivo del rechazo |
|---|---|
| HTML + Chromium serverless (`@sparticuz/chromium` + playwright-core) | Cumple "diseño en HTML" literalmente y permitiría reutilizar el template de react-email, pero añade ~50 MB por función, cold starts lentos y fragilidad conocida en Vercel. Coste desproporcionado para un ticket de una página. |
| Cliente: `html2canvas` + `jsPDF` | Sin coste de server, pero el PDF es un raster (texto no seleccionable, borroso al zoom, más pesado). Calidad inaceptable para un documento que se imprime o se reenvía. |
| HTML imprimible + `window.print()` | No cumple el requerimiento: no hay descarga automática ni control del nombre de archivo; el resultado depende del diálogo de impresión de cada navegador. |

## Consecuencias

- El template del ticket **no comparte código de maquetado** con el template
  de correo de react-email; solo comparten la lógica de armado de datos y los
  formatters (`formatAdminCurrency` es USD fijo — el ticket debe formatear con
  `orders.currency`, como ya hace el email).
- Cambiar de motor en el futuro (p. ej. a HTML+Chromium) implica reescribir el
  template, no solo la capa de conversión.
- El PDF se genera **on demand y no se persiste**; regenerarlo tras cambios en
  la orden siempre refleja el estado actual.
- `@react-pdf/renderer` entra como dependencia de producción; las fuentes
  custom (si se quieren) deben registrarse manualmente.
