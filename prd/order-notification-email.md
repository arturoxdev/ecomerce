# PRD — Notificación de nueva orden por email (Resend)

> Estado: aprobado para implementar. Grilling completo (`/grill-with-docs`, 2026-06-16).
> Al implementar, materializar la **Decisión 7.2** como ADR en `docs/adr/`.

## 1. Objetivo

Avisar al administrador/dueño de la tienda, por correo, cada vez que una orden
queda **pagada y confirmada** en Stripe, incluyendo un enlace directo al detalle
de esa orden en el panel admin.

## 2. Contexto y motivación

- El cliente ya tiene retroalimentación al pagar: la pantalla
  `/order/[id]/success` y el recibo propio de Stripe. **No** hay ninguna señal
  hacia el operador de la tienda de que entró una venta.
- La confirmación de pago ocurre en el webhook de Stripe
  (`app/api/webhooks/stripe/route.ts` → `handleCheckoutCompleted` en
  `features/checkout/data.ts`), que dentro de una transacción mueve la orden a
  `status: CONFIRMED` / `paymentStatus: CAPTURED`. Ese es el punto natural de
  disparo.
- Hoy no existe infraestructura de email en el repo (sin `resend`, sin
  `react-email`, nada en `lib/`). Es greenfield.

## 3. Alcance

### In-scope (v1)

- Un correo **transaccional al admin** cuando una orden transiciona a confirmada.
- Plantilla con React Email acorde a la marca (color desde
  `NEXT_PUBLIC_COLOR_PRIMARY`).
- Botón/CTA al detalle admin de la orden.
- Resumen completo: cliente, dirección, artículos con fecha de renta y desglose
  de dinero (Total / Pagado en línea / Saldo a cobrar en entrega).
- Disparo idempotente que cubre tanto el webhook como el cron de reconciliación.
- Variables nuevas en `.env` y `.env.example`.

### Out-of-scope (v1, futuro)

- Correo de confirmación **al cliente** (Stripe ya manda recibo; la pantalla de
  éxito ya existe).
- Notificaciones por otros canales (SMS, WhatsApp, push).
- Multi-destinatario / multi-tienda (deploy es single-store vía `STORE_ID`).
- Reintentos persistentes / cola de correos. Si Resend falla, se registra y se
  sigue (ver 7.2).
- Plantillas para otros eventos (orden cancelada, reembolso, expirada).

## 4. Usuarios

- **Administrador / dueño de la tienda**: recibe el aviso operativo. Necesita
  saber de un vistazo *cuándo* es el evento (para agendar entrega), *cuánto* se
  cobró en línea y *cuánto* falta cobrar en la entrega, y poder abrir el detalle
  con un clic.

## 5. Requisitos funcionales

- RF1. Al confirmarse el pago de una orden (transición `PENDING → CONFIRMED`), el
  sistema envía un correo a `ORDER_NOTIFICATION_EMAIL`.
- RF2. El correo se envía **una sola vez** por orden, aun si Stripe reenvía el
  evento o si la confirmación llega por el cron de reconciliación.
- RF3. El correo incluye un botón que abre
  `${NEXT_PUBLIC_APP_URL}/admin/orders/${orderId}` (las rutas admin no llevan
  prefijo de locale).
- RF4. El correo muestra: número corto de orden, nombre/email/teléfono del
  cliente, dirección de entrega (si existe), tabla de artículos
  (producto · cantidad · fecha de renta) y las filas de dinero
  **Total**, **Pagado en línea** y **Saldo a cobrar en entrega**.
- RF5. El contenido va en español, consistente con el panel admin.

## 6. Requisitos no funcionales

- RNF1. El envío **nunca** debe provocar que el webhook responda 5xx (ver 7.2).
- RNF2. Si `RESEND_API_KEY` no está definida, el envío hace no-op con `logger.warn`
  (dev/test no rompen; validación de env es de *existencia*, no de formato).
- RNF3. `lib/email/` permanece **agnóstico del dominio**: recibe un payload plano
  tipado, no la fila Drizzle.
- RNF4. Sin cambios de esquema ni migraciones.

## 7. Decisiones técnicas

### 7.1 Destinatario

Admin/dueño, no el cliente. El texto base ("tenemos una orden nueva" + enlace al
detalle admin) y el hecho de que el cliente ya recibe recibo de Stripe lo
confirman. Destinatario en variable dedicada `ORDER_NOTIFICATION_EMAIL` (separada
de `ADMIN_EMAIL` por si ventas ≠ administración).

### 7.2 Disparo y aislamiento de fallos → **ADR al implementar**

Decisión: enviar **post-commit, solo si la transacción realmente transicionó la
orden, fire-and-forget**.

- El envío ocurre **después** de cerrar la transacción que confirma la orden, no
  dentro (evitar mandar correo de algo que luego no commitea y no alargar el lock
  de la fila con una llamada de red).
- La transacción devuelve un flag `didTransition` (true solo si movió
  `PENDING → CONFIRMED/CAPTURED`); solo entonces se envía → idempotente.
- Se ubica dentro de `handleCheckoutCompleted`, que es reutilizado por
  `reconcileStripeOrder` (cron), así que **cubre webhook + reconciliación** con un
  solo punto.
- Envuelto en `try/catch` que registra con `logger` y **nunca lanza**.

Por qué es no obvio (justifica ADR): si el envío lanzara y el webhook devolviera
500, Stripe reintenta, pero `recordEventIfNew` marca el evento como duplicado y el
handler ya no corre → el correo se perdería para siempre *y* además daríamos señal
de fallo de algo que sí se procesó. Tragar el error protege el contrato de
reintentos+idempotencia de Stripe.

Alternativas descartadas: enviar dentro de la transacción (riesgo de correo
fantasma + lock largo); enviar solo desde `route.ts` (deja sin cubrir la ruta del
cron).

### 7.3 Plantilla

React Email (`@react-email/components`): `<Html><Body><Container><Button>` con
estilos inline (los clientes de correo no corren Tailwind/JS, por eso shadcn no
aplica). Color de marca tomado de `NEXT_PUBLIC_COLOR_PRIMARY`. Se pasa el
componente al SDK como **llamada de función** al prop `react`
(`resend.emails.send({ react: NewOrderAdminEmail({...}) })`), no como JSX —
según la doc oficial de Resend.

### 7.4 Ubicación

`lib/email/` desde ya (decisión del equipo, anticipando reúso por auth/orders),
manteniéndolo agnóstico de dominio. `features/checkout/data.ts` arma el payload y
llama a la función de envío (feature → lib es importación permitida).

### 7.5 Origen de los datos

La fecha del evento vive **solo** en `order_items.rentDate`, no en la orden. El
flujo de notificación hace un query extra `order_items ⋈ products` (lee el schema
compartido `lib/db`, **no** el feature de productos → no viola la regla
feature-a-feature) para incluir artículos y fechas.

## 8. Schema — cambios DB

Ninguno.

## 9. Variables de entorno (nuevas)

Agregar a `.env` y `.env.example`:

| Variable | Uso |
|----------|-----|
| `RESEND_API_KEY` | Clave del SDK de Resend. Si falta → no-op + warn. |
| `RESEND_FROM_EMAIL` | Remitente, ej. `Festejos <ordenes@tudominio.com>`. Requiere dominio verificado en Resend. |
| `ORDER_NOTIFICATION_EMAIL` | Destinatario del aviso de nueva orden. |

## 10. Estructura de archivos

```
lib/email/
├── client.ts                     # singleton Resend desde RESEND_API_KEY
├── templates/
│   └── new-order-admin.tsx       # React Email, payload plano tipado
├── send-new-order-notification.ts # arma asunto + llama resend.emails.send({react})
└── index.ts                      # barrel: export send fn + tipo del payload

features/checkout/data.ts          # handleCheckoutCompleted: flag didTransition,
                                   # query items, llamada post-commit fire-and-forget
```

Dependencias nuevas: `resend`, `@react-email/components`.

## 11. Plan de implementación

1. `npm i resend @react-email/components`.
2. Agregar las 3 variables a `.env` y `.env.example`.
3. `lib/email/client.ts` — singleton Resend (lazy; tolera key ausente).
4. `lib/email/templates/new-order-admin.tsx` — plantilla React Email + tipo de
   payload plano.
5. `lib/email/send-new-order-notification.ts` — construye asunto y dispara el
   envío; try/catch + logger; no-op si falta `RESEND_API_KEY`.
6. `lib/email/index.ts` — barrel.
7. `features/checkout/data.ts`:
   - `handleCheckoutCompleted`: que la transacción devuelva `didTransition`.
   - Tras el commit, si `didTransition`: query items+productos, mapear a payload,
     `await` envuelto en su propio try/catch (nunca relanzar).
8. Tests co-localizados (skill de testing, AAA): unit del send (mock Resend, caso
   key ausente, caso éxito) y del disparo (didTransition true/false, error de
   Resend no rompe el handler).
9. Crear `docs/adr/00XX-order-notification-on-payment-webhook.md` con la
   Decisión 7.2.

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Resend caído → correo perdido | Fire-and-forget + log; el panel admin sigue siendo fuente de verdad. v2 podría reintentar. |
| Dominio no verificado → no entrega | `RESEND_FROM_EMAIL` documentado como dominio verificado; en demo, `onboarding@resend.dev` solo llega al correo de la cuenta. |
| Doble envío por reintento/cron | Flag `didTransition` + guarda de transacción ya existente. |
| Filtrar datos sensibles en logs | Loggear solo `orderId` y mensaje de error, no PII del cliente. |

## 13. Criterios de aceptación

- AC1. Pagar una orden en Stripe (test) dispara exactamente **un** correo a
  `ORDER_NOTIFICATION_EMAIL`.
- AC2. El correo abre el detalle correcto en `/admin/orders/[id]`.
- AC3. El correo muestra cliente, artículos con fecha de renta y las tres filas de
  dinero correctas para `FULL_ONLINE` y `SPLIT_50_50`.
- AC4. Reenviar el mismo evento de Stripe **no** genera un segundo correo.
- AC5. Con `RESEND_API_KEY` ausente, el webhook responde 200 y el flujo no rompe.
- AC6. Un error de Resend no convierte el webhook en 5xx.

## 14. Preguntas abiertas / futuro

- Confirmación al cliente como plantilla aparte (reusa `lib/email`).
- Reintentos/cola si la entregabilidad importa.
- Plantillas para cancelación/reembolso/expiración.
