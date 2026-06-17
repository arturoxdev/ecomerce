# ADR-011: Notificación de nueva orden post-commit (fire-and-forget)

**Estado:** Aceptado — 2026-06-16

## Contexto

Al confirmarse el pago de una orden (transición `PENDING → CONFIRMED/CAPTURED`)
el operador de la tienda no recibe ninguna señal. La confirmación ocurre dentro
de `handleCheckoutCompleted` en `features/checkout/data.ts`, que es invocado
tanto por el webhook de Stripe (`app/api/webhooks/stripe/route.ts`) como por el
cron de reconciliación (`reconcileStripeOrder`).

El módulo `lib/email/` (Resend + React Email) ya existe y expone
`sendNewOrderNotification(payload)`. Ahora hay que decidir **dónde y cómo**
disparar ese envío dentro del flujo de confirmación de pago.

Tres variables de entorno nuevas son necesarias para activar el envío:
`RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `ORDER_NOTIFICATION_EMAIL`. Los archivos
`.env*` están en `.gitignore`; `.env.example` documenta las tres variables.
Si `RESEND_API_KEY` no está definida, `sendNewOrderNotification` hace no-op con
`logger.warn` (comportamiento defensivo implementado en `lib/email/`).

## Decisión

El correo se envía **post-commit, fire-and-forget, solo si la transacción
realmente transicionó la orden**, envuelto en `try/catch` que nunca relanza.

Concretamente, dentro de `handleCheckoutCompleted`:

1. Se declara `let didTransition = false;` en el closure externo a la
   transacción.
2. Dentro del `db.transaction`, justo después del `tx.update(...)` que mueve la
   orden a `CONFIRMED/CAPTURED`, se asigna `didTransition = true`. El guard de
   idempotencia (`if (order.paymentStatus === "CAPTURED") return;`) evita que
   se asigne en reentradas.
3. **Después** de cerrar la transacción, si `didTransition` es `true`, se
   realiza un query extra (`orders` + `orderItems ⋈ products`) para armar el
   payload y se llama `await sendNewOrderNotification(payload)` envuelto en
   `try/catch` que registra con `logger.warn` y **nunca lanza**.

Este único punto en `handleCheckoutCompleted` cubre automáticamente tanto el
webhook como el cron, ya que `reconcileStripeOrder` reutiliza la misma función.

## Por qué es la decisión correcta

El aspecto no obvio es que el envío **nunca debe provocar un 500 del webhook**.
Si el handler lanzara, el webhook respondería 500 y Stripe reintentaría el
evento — pero `recordEventIfNew` ya marcó ese `event_id` como procesado, por lo
que en la rereintención el handler sale al principio (`recordEventIfNew` devuelve
`false`) y el correo se perdería para siempre, además de dar señal de fallo en
algo que *sí* se procesó correctamente. Tragar el error de correo protege el
contrato de reintentos + idempotencia de Stripe.

### Alternativas rechazadas

| Alternativa | Motivo del rechazo |
|---|---|
| Enviar **dentro de la transacción** (antes del commit) | Riesgo de "correo fantasma": si el commit falla después del envío, el correo ya salió pero la orden no quedó confirmada. Además alarga el lock de la fila con una llamada de red externa. |
| Enviar solo desde `route.ts` (handler del webhook) | Deja sin cobertura la ruta del cron (`reconcileStripeOrder`). Requiere duplicar la lógica o añadir un parámetro de retorno a `handleCheckoutCompleted`. |
| Enviar con un job/queue asíncrono | Introduce infraestructura de colas inexistente en el repo. El PRD acota v1 a fire-and-forget; los reintentos son trabajo futuro explícito (sección 14). |

## Consecuencias

- Un correo por cada transición real `PENDING → CONFIRMED`; ninguno en
  reentradas idempotentes ni en órdenes marcadas como `SUSPICIOUS`.
- Si Resend falla o las variables de entorno no están configuradas, el flujo de
  pago no se ve afectado; solo se genera un `logger.warn` con `orderId` (sin
  PII del cliente).
- El query adicional post-commit (`orders` + `orderItems ⋈ products`) es
  liviano y fuera de la transacción, por lo que no incrementa el tiempo de lock.
- En el futuro, si se requieren reintentos persistentes, basta con reemplazar el
  `try/catch` por un enqueue a una cola durable sin cambiar la lógica de
  `didTransition`.
