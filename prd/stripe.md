# PRD v3 — Stripe Integration + Security Hardening

**Proyecto:** Festejos Aurora (ecomerce)
**Fecha:** 2026-04-10
**Owner:** Arturo
**Estado:** Aprobado

---

## 1. Contexto

El e-commerce es una plataforma de renta de artículos para eventos. Hoy `placeOrder()` crea órdenes en estado `CONFIRMED` con `amountPaid = 0` y bloquea inventario sin cobrar. No existe ningún proveedor de pagos activo (columna heredada `squarePaymentId` sin uso). Este PRD integra **Stripe Checkout hospedado**, reestructura el flujo para que la confirmación dependa del webhook, y agrega una capa de seguridad (`Scope D`) que cierra los riesgos detectados en la auditoría previa.

## 2. Decisiones de negocio locked

| # | Decisión |
|---|---|
| 1 | **Payment mode** global configurable en admin: `SPLIT_50_50` (50% online al ordenar, 50% en entrega) o `FULL_ONLINE` (100% online). |
| 2 | **Moneda:** USD fija. |
| 3 | **Precios del catálogo ya incluyen impuestos.** No se maneja tax ni Stripe Tax en v1. |
| 4 | **Reserva estrategia A:** bloquear inventario al crear la sesión de Stripe, liberar vía webhook `checkout.session.expired` + cron de reconciliación + self-heal al leer. |
| 5 | **Stripe hospedado** (redirect a `checkout.stripe.com`). |
| 6 | **Guest checkout** (sin login). |
| 7 | **No** crear `stripe_customer` (sin persistir `stripe_customer_id`). |
| 8 | **Refunds manuales** vía dashboard de Stripe. Nuestra app solo escucha `charge.refunded` para sincronizar. |
| 9 | **Un solo line item** en Stripe con el monto total a cobrar online (calculado según `paymentMode`). |
| 10 | **Delivery fee configurable** en admin: `FREE` o `FIXED_FEE + monto`. |
| 11 | **Sin monto mínimo** de orden (más allá del mínimo técnico de Stripe $0.50 USD). |
| 12 | **Bad debt del 50% restante (split mode) fuera de scope.** Admin lo cobra offline manualmente. |
| 13 | **Rate limiting implementado con Postgres** (sin infra extra). |

## 3. Alcance — 4 scopes

- **Scope A** — Admin Settings UI
- **Scope B** — Stripe Checkout core
- **Scope C** — Liberación y reconciliación de inventario
- **Scope D** — Security hardening (blockers + altos)

---

## 4. Scope A — Admin Settings UI

Hoy `/admin/settings/page.tsx` es un placeholder "Coming soon". Hay que construir el form real porque allí viven las decisiones 1, 2 y 10.

### A.1 Schema (`lib/db/schema.ts`)

La tabla `settings` ya tiene `deliveryMode`, `deliveryFee`, `depositPercent`. Agregar:

```ts
export const paymentModeEnum = pgEnum("payment_mode", [
  "SPLIT_50_50",
  "FULL_ONLINE",
]);

// En la tabla settings:
paymentMode: paymentModeEnum("payment_mode").notNull().default("SPLIT_50_50"),
currency:    text("currency").notNull().default("USD"),
```

`deliveryMode` ya soporta `INCLUDED` (free) y `FIXED_FEE` (con monto en `deliveryFee`) → no hay migración de tipos, solo exponerlos en UI. `ZIP_CODE` se oculta del select en v1.

### A.2 Feature folder

```
features/admin-settings/
├── index.ts              # barrel export
├── data.ts               # getSettings, updateSettings (DAL + Zod + RFC 9457)
├── actions.ts            # updateSettingsAction (server action)
└── components/
    └── settings-form.tsx # Client component con react-hook-form + zod resolver
```

### A.3 Form fields

| Field | Tipo | Validación | Notas |
|---|---|---|---|
| `paymentMode` | select | enum | `SPLIT_50_50` default |
| `deliveryMode` | select | `INCLUDED` \| `FIXED_FEE` | Oculta `ZIP_CODE` |
| `deliveryFee` | number | required si `deliveryMode=FIXED_FEE`, >= 0 | decimal(10,2) |
| `depositPercent` | number | 0 < x <= 1 | Se mantiene utilizable, no afecta Stripe directamente |

### A.4 Auth

Solo `ROOT` y `ADMIN` pueden leer/editar. Usar `requireRole(["ROOT", "ADMIN"])` de `features/auth/permissions.ts` al inicio de cada action.

### A.5 Revalidación

Al guardar:
```ts
revalidatePath("/admin/settings");
revalidatePath("/[locale]", "layout");  // carrito y catálogo recalculan delivery
```

### A.6 Criterios de aceptación Scope A

- [ ] Admin ve form con valores actuales.
- [ ] Cambio de `paymentMode` afecta el monto cobrado en nuevas órdenes.
- [ ] Cambio de `deliveryMode=FIXED_FEE` + monto actualiza el total en el carrito público.
- [ ] Usuario `EMPLOYEE` recibe `forbiddenProblem`.
- [ ] Cada update queda registrado en `audit_log` (ver D.10).

---

## 5. Scope B — Stripe Checkout core

### B.1 Dependencias

```json
{ "dependencies": { "stripe": "^19.1.0" } }
```
Sin `@stripe/stripe-js` (hosted checkout no lo necesita).

### B.2 Variables de entorno

Agregar a `.env.example`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=<random-64-char-hex>
```

### B.3 Schema `orders`

Agregar columnas:
```ts
stripeSessionId:        text("stripe_session_id").unique(),
stripePaymentIntentId:  text("stripe_payment_intent_id"),
stripeSessionExpiresAt: timestamp("stripe_session_expires_at", { withTimezone: true }),
currency:               text("currency").notNull().default("USD"),
```
Cambiar default de `status` a `PENDING` para órdenes creadas desde el checkout público. Agregar valor `SUSPICIOUS` al `paymentStatusEnum` (ver D.3).

Nota operativa: los comandos `drizzle-kit generate` / `migrate` los ejecuta el usuario.

### B.4 Feature folder

```
features/checkout/
├── index.ts
├── client.ts                        # server-only Stripe singleton
├── data.ts                          # createCheckoutSession, handleCheckoutCompleted, handleCheckoutExpired, handleChargeRefunded
├── actions.ts                       # (thin wrappers si se necesitan)
└── components/
    ├── payment-status-badge.tsx
    └── payment-breakdown.tsx        # Muestra "Pagado $X / Saldo $Y" en split mode
```

### B.5 Stripe client

```ts
// features/checkout/client.ts
import "server-only";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

// D.11 — validar env en startup
if (process.env.NODE_ENV === "production"
  && !process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
  throw new Error("Production requires sk_live_ key");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
  typescript: true,
});
```

### B.6 Cálculo del monto online

```ts
// features/checkout/data.ts
function computeOnlineAmountCents(order, settings): number {
  const total = parseFloat(order.total); // subtotal + deliveryFee, tax incluido
  const portion = settings.paymentMode === "FULL_ONLINE" ? 1 : 0.5;
  const cents = Math.round(total * portion * 100);
  if (cents < 50) {
    throw validationProblem("Amount below Stripe minimum ($0.50 USD)");
  }
  return cents;
}
```

### B.7 `createCheckoutSession(orderId)`

```ts
export async function createCheckoutSession(orderId: string): Promise<FormState> {
  const order = await getOrderById(orderId);
  if (!order || order.status !== "PENDING") return notFoundProblem();
  if (order.stripeSessionId) {
    // B.10 — ya existe sesión, reusar en lugar de crear doble
    const existing = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (existing.status === "open") return { success: true, url: existing.url };
  }

  const settings = await getSettings();
  const amount = computeOnlineAmountCents(order, settings);
  const shortId = order.id.slice(0, 8);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: settings.paymentMode === "FULL_ONLINE"
            ? `Orden ${shortId}`
            : `Anticipo 50% - Orden ${shortId}`,
          description: buildDescription(order, settings),
        },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    expires_at: Math.floor(Date.now() / 1000) + 15 * 60, // D.5 — 15 min hold
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/${order.id}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/order/${order.id}/cancelled`,
    metadata: {
      orderId: order.id,
      storeId: order.storeId,
      expectedAmountCents: String(amount),
      paymentMode: settings.paymentMode,
    },
    customer_email: order.customerEmail, // prefill, no crea customer
  });

  await db.update(orders).set({
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
    stripeSessionExpiresAt: new Date(session.expires_at * 1000),
  }).where(eq(orders.id, order.id));

  return { success: true, url: session.url! };
}
```

### B.8 Refactor de `placeOrder`

En `app/[locale]/cart/actions.ts`:
- `status: "PENDING"` (no `CONFIRMED`).
- `amountPaid: "0"`, `paymentStatus: "AUTHORIZED"` (mantiene el enum actual).
- Snapshot `unitPrice = expectedPrice.toFixed(2)` (del DB, no del cliente) → **D.6**.
- Al final, llama `createCheckoutSession(order.id)` y retorna `{ success, orderId, checkoutUrl }`.
- Cliente (`cart-page-client.tsx`) hace `window.location.href = checkoutUrl`.
- **NO** limpia el carrito hasta que el usuario aterrice en `/success`.

### B.9 Webhook handler `app/api/webhooks/stripe/route.ts`

```ts
export const runtime = "nodejs";           // necesita raw body
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.warn("webhook.invalid_signature", { eventId: "unknown" });
    return new Response("Invalid signature", { status: 400 });
  }

  // D.2 — idempotencia
  const recorded = await recordEventIfNew(event);
  if (!recorded) return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":       await handleCheckoutCompleted(event); break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": await handleCheckoutExpired(event); break;
      case "charge.refunded":                  await handleChargeRefunded(event); break;
    }
  } catch (err) {
    logger.error("webhook.handler_error", { eventId: event.id, type: event.type });
    await markEventFailed(event.id);
    return new Response("Handler error", { status: 500 }); // Stripe reintenta
  }

  return Response.json({ received: true });
}
```

### B.10 `handleCheckoutCompleted` — con amount verification (D.3)

```ts
async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  await db.transaction(async (tx) => {
    const order = await getOrderByIdForUpdate(tx, orderId); // SELECT FOR UPDATE
    if (!order) return;
    if (order.paymentStatus === "CAPTURED") return; // idempotente a nivel datos

    const expected = Number(session.metadata?.expectedAmountCents);
    if (session.amount_total !== expected) {
      logger.error("security.amount_mismatch", {
        orderId, expected, received: session.amount_total,
      });
      await tx.update(orders).set({ paymentStatus: "SUSPICIOUS" })
        .where(eq(orders.id, orderId));
      return;
    }
    if (session.currency !== "usd") {
      logger.error("security.currency_mismatch", { orderId, currency: session.currency });
      await tx.update(orders).set({ paymentStatus: "SUSPICIOUS" })
        .where(eq(orders.id, orderId));
      return;
    }
    if (session.payment_status !== "paid") return; // async pending

    await tx.update(orders).set({
      status: "CONFIRMED",
      paymentStatus: "CAPTURED",
      amountPaid: (session.amount_total! / 100).toFixed(2),
      stripePaymentIntentId: session.payment_intent as string,
    }).where(eq(orders.id, orderId));
  });

  revalidatePath(`/order/${orderId}/success`);
  revalidatePath(`/admin/orders/${orderId}`);
}
```

### B.11 `handleCheckoutExpired`

```ts
async function handleCheckoutExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  await db.transaction(async (tx) => {
    const order = await getOrderByIdForUpdate(tx, orderId);
    if (!order || order.paymentStatus === "CAPTURED") return; // no revertir pagos ok

    await tx.update(orders).set({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    }).where(eq(orders.id, orderId));

    await tx.delete(availability).where(eq(availability.orderId, orderId));
  });
}
```

### B.12 `handleChargeRefunded` (D.9)

```ts
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const pi = charge.payment_intent as string;
  if (!pi) return;

  await db.transaction(async (tx) => {
    const order = await getOrderByPaymentIntentForUpdate(tx, pi);
    if (!order) return;

    await tx.update(orders).set({
      status: "CANCELLED",
      paymentStatus: "VOIDED",
      amountPaid: "0",
    }).where(eq(orders.id, order.id));

    await tx.delete(availability).where(eq(availability.orderId, order.id));
  });
}
```

### B.13 Páginas `/success` y `/cancelled` (con D.4)

**`app/[locale]/order/[orderId]/success/page.tsx`** — server component:
```ts
export default async function SuccessPage({ params, searchParams }) {
  const { orderId } = await params;
  const { session_id } = await searchParams;

  const order = await findByIdWithItems(orderId);
  if (!order) notFound();

  // D.4 — triple validación, el query param es solo un hint
  if (session_id && order.stripeSessionId !== session_id) {
    notFound(); // no mostrar orden ajena
  }

  if (order.paymentStatus !== "CAPTURED") {
    return <ProcessingPayment orderId={orderId} />; // polling cada 3s
  }

  return <OrderConfirmation order={order} />;
}
```

**`/cancelled/page.tsx`** — mensaje + botón "volver al carrito" (el carrito sigue intacto en Zustand).

---

## 6. Scope C — Liberación y reconciliación

Tres capas para que el inventario nunca quede atorado.

### C.1 Capa 1 — Webhook `checkout.session.expired`
Ya cubierto en `B.11`. Cubre ~99% de los casos.

### C.2 Capa 2 — Cron de reconciliación

**Endpoint:** `app/api/cron/expire-pending-orders/route.ts`
**Schedule:** cada 10 min (`vercel.json`)
**Protección:** header `Authorization: Bearer $CRON_SECRET`

```ts
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stuck = await db.select().from(orders).where(and(
    eq(orders.status, "PENDING"),
    lt(orders.stripeSessionExpiresAt, new Date(Date.now() - 5 * 60 * 1000)),
  )).limit(100);

  for (const order of stuck) {
    await reconcileStripeOrder(order); // B.10/B.11 logic
  }

  return Response.json({ processed: stuck.length });
}
```

`reconcileStripeOrder` hace `stripe.checkout.sessions.retrieve(sessionId)` y aplica la misma lógica que el webhook según el estado real en Stripe. Usa la misma tabla `stripe_webhook_events` para no doble-procesar (inventa un `eventId` estable: `reconcile:${sessionId}:${status}`).

### C.3 Capa 3 — Self-heal al leer

En `features/admin-orders/data.ts`, al leer una orden `PENDING` con `stripeSessionExpiresAt < now()`, dispara `reconcileStripeOrder` antes de retornar. Abrir la orden en admin la limpia al instante.

### C.4 Ventana máxima de bloqueo

Con `expires_at = 15 min` + cron cada 10 min + margen 5 min → **peor caso 30 min** desde que el cliente abandona. Aceptable para rental.

### C.5 `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/expire-pending-orders", "schedule": "*/10 * * * *" }
  ]
}
```

---

## 7. Scope D — Security hardening

Cada item resuelve uno de los riesgos de la auditoría.

### D.1 — Advisory lock en `placeOrder` (blocker: race condition)

Al inicio de la transacción, ANTES del SELECT de availability:
```ts
// Por cada productId único en el carrito, serializa solo ese producto
const productIds = [...new Set(data.items.map(i => i.productId))].sort();
for (const pid of productIds) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"av:" + pid}))`);
}
```
El lock se libera al commit/rollback automáticamente. Serializa compras del mismo producto pero no bloquea el resto del tráfico. Ordenamos los IDs para evitar deadlock entre transacciones que compartan productos.

### D.2 — Tabla `stripe_webhook_events` + idempotencia (blocker)

```ts
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId:     text("event_id").primaryKey(),
  type:        text("type").notNull(),
  status:      text("status").notNull().default("processed"), // processed | failed
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Helper `recordEventIfNew(event)`:
```ts
const result = await db.insert(stripeWebhookEvents)
  .values({ eventId: event.id, type: event.type })
  .onConflictDoNothing()
  .returning();
return result.length > 0;
```
Purga opcional (cron semanal): borrar registros > 90 días.

### D.3 — Amount & currency verification (blocker)

Ya implementado en `B.10`. Los mismos chequeos se aplican en el cron de reconciliación (C.2) para defensa en profundidad.

Agregar `SUSPICIOUS` al enum de paymentStatus. El dashboard admin muestra un badge rojo + banner "revisar manualmente en Stripe" para órdenes en ese estado.

### D.4 — Success page con triple validación (blocker)

Ya implementado en `B.13`.

Adicional:
- `success_url` y `cancel_url` se construyen server-side con `NEXT_PUBLIC_APP_URL`, nunca desde query params del cliente.
- `notFound()` en vez de redirect para evitar open redirect.

### D.5 — Rate limiting en Postgres (alto)

**Schema:**
```ts
export const rateLimits = pgTable("rate_limits", {
  key:         text("key").primaryKey(),        // "placeOrder:ip:1.2.3.4"
  count:       integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});
```

**Helper `lib/rate-limit.ts`:**
```ts
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    const [row] = await tx.execute(sql`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, ${now})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start < ${windowStart} THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start < ${windowStart} THEN ${now}
          ELSE rate_limits.window_start
        END
      RETURNING count, window_start
    `);

    const count = Number(row.count);
    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetAt: new Date(new Date(row.window_start).getTime() + windowSeconds * 1000),
    };
  });
}
```

**Aplicación:**

| Endpoint | Key | Límite |
|---|---|---|
| `placeOrder` | `placeOrder:ip:${ip}` | 5 / 10 min |
| `placeOrder` | `placeOrder:email:${email}` | 3 / 1 hora |
| `createCheckoutSession` | `checkout:order:${orderId}` | 10 / 1 hora |
| `/api/availability` (GET) | `avail:ip:${ip}` | 60 / 1 min |
| `/order/:id/success` | `success:ip:${ip}` | 30 / 1 min |

**IP source:** `x-forwarded-for` primer segmento, con sanitización. Fallback a `x-real-ip`. Jamás confiar en connection IP detrás de Vercel.

**Purga:** cron semanal borra `rate_limits` con `window_start < now() - 1 día`.

### D.6 — Snapshot `unitPrice` desde DB (alto)

En `placeOrder`, cambiar:
```ts
unitPrice: item.unitPrice.toFixed(2),   // ❌ viene del cliente
```
por:
```ts
unitPrice: expectedPrice.toFixed(2),    // ✅ viene del DB (variant o product)
```
Mismo cambio en el cálculo de `subtotal`: usar `expectedPrice * item.quantity`, no `item.unitPrice * item.quantity`.

### D.7 — Lock post-pago en admin-orders (alto)

En `features/admin-orders/data.ts`, función `update`:
```ts
const IMMUTABLE_FIELDS_WHEN_PAID = ["total", "subtotal", "deliveryFee", "amountPaid", "deliveryAddress"];

if (order.paymentStatus === "CAPTURED") {
  const tryingToChange = Object.keys(data).filter(k => IMMUTABLE_FIELDS_WHEN_PAID.includes(k));
  if (tryingToChange.length > 0) {
    return forbiddenProblem(`Cannot modify ${tryingToChange.join(", ")} after payment capture`);
  }
}
```
Solo se permite cambiar `status` (DELIVERED, RETURNED) post-pago.

### D.8 — Sanitización de logs (alto)

- Crear helper `lib/logger.ts` con wrapper que **nunca** serializa: `customerName`, `customerEmail`, `customerPhone`, `deliveryAddress`, `event.data.object`.
- En todo el feature `checkout`, usar `logger.info/warn/error` en vez de `console.*`.
- El payload crudo del webhook **solo** vive en `stripe_webhook_events.payload` si decidimos almacenarlo (opcional, retención 90 días).

### D.9 — Listener de `charge.refunded` (medio)

Ya cubierto en `B.12`.

### D.10 — Audit log básico (medio)

```ts
export const auditLog = pgTable("audit_log", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").references(() => users.id),
  action:    text("action").notNull(),  // "settings.update", "order.refund.sync"
  entity:    text("entity").notNull(),  // "settings", "order"
  entityId:  text("entity_id"),
  before:    jsonb("before"),
  after:     jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```
Se escribe en: `updateSettingsAction`, `handleCheckoutCompleted`, `handleCheckoutExpired`, `handleChargeRefunded`, `reconcileStripeOrder`. Para webhooks, `userId` queda null y se registra `action: "webhook.*"`.

### D.11 — Validación de env en startup (medio)

Ya cubierto en `B.5`. Adicional:
- `STRIPE_WEBHOOK_SECRET` debe empezar con `whsec_`.
- `NEXT_PUBLIC_APP_URL` debe ser HTTPS en prod.
- `CRON_SECRET` mínimo 32 chars.

---

## 8. Estados de la orden (máquina completa)

| status | paymentStatus | Significado |
|---|---|---|
| `PENDING` | `AUTHORIZED` | Orden creada, esperando pago en Stripe |
| `CONFIRMED` | `CAPTURED` | Pago exitoso, inventario reservado |
| `CONFIRMED` | `SUSPICIOUS` | Amount/currency mismatch — revisar manualmente |
| `CANCELLED` | `FAILED` | Pago falló o session expiró → availability liberada |
| `CANCELLED` | `VOIDED` | Refund ejecutado en Stripe dashboard → sync automático |
| `DELIVERED` | `CAPTURED` | Entregado |
| `RETURNED` | `CAPTURED` | Devuelto |

---

## 9. Variables de entorno finales

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...          # prod: sk_live_
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron
CRON_SECRET=<random-64-hex>
```

## 10. Dependencias nuevas

```json
{ "dependencies": { "stripe": "^19.1.0" } }
```

## 11. Migraciones

Todo lo agregado al schema en un solo cambio:
1. Nuevo enum `payment_mode`
2. Nuevo valor `SUSPICIOUS` en `payment_status`
3. Columnas nuevas en `settings` (paymentMode, currency)
4. Columnas nuevas en `orders` (stripeSessionId, stripePaymentIntentId, stripeSessionExpiresAt, currency)
5. Default de `orders.status` → `PENDING`
6. Tablas nuevas: `stripe_webhook_events`, `rate_limits`, `audit_log`

**El usuario ejecuta las migraciones** — se dejan los edits en `schema.ts` y se listan los comandos:
```bash
npm run db:generate
npm run db:migrate
```

Seed manual: insertar fila en `settings` para el `storeId` activo si no existe, con `paymentMode='SPLIT_50_50'`, `deliveryMode='INCLUDED'`, `currency='USD'`.

## 12. Orden de implementación

1. **Scope A completo** — admin settings UI (puede mergear standalone).
2. **Scope D base** — tablas (`stripe_webhook_events`, `rate_limits`, `audit_log`) + helpers (rate-limit, logger, audit).
3. **Scope D.1** — advisory lock en `placeOrder` actual (aplica antes de Stripe, arregla race condition existente).
4. **Scope D.6** — snapshot de `unitPrice` desde DB.
5. **Scope B.1-B.7** — schema de orders + `features/checkout/`.
6. **Scope B.8** — refactor de `placeOrder` a `PENDING` + llamada a `createCheckoutSession`.
7. **Scope B.9-B.12** — webhook handler + handlers específicos con D.3 integrado.
8. **Scope B.13** — success/cancelled pages con D.4.
9. **Scope D.5** — aplicar rate limits en endpoints.
10. **Scope D.7** — lock post-pago en admin-orders.
11. **Scope D.8** — sanitización de logs y migración de `console.*`.
12. **Scope D.10, D.11** — audit log + env validation.
13. **Scope C.1-C.5** — cron + self-heal + `vercel.json`.
14. E2E con Stripe CLI: happy path, cancelación, expiración, refund, amount mismatch.

## 13. Criterios de aceptación v1

### Funcional
- [ ] Admin en `/admin/settings` cambia `paymentMode` y `deliveryMode`; cambios se reflejan en el carrito y en el monto cobrado.
- [ ] Cliente completa carrito → redirect a Stripe → paga → `/success` con orden `CONFIRMED`.
- [ ] En `SPLIT_50_50`, success page muestra "Pagado: $X / Saldo en entrega: $Y".
- [ ] Cancelar en Stripe → `/cancelled` con carrito intacto + orden `CANCELLED` + availability liberada.
- [ ] Expiración de session → availability liberada en ≤ 1 min (webhook) o ≤ 10 min (cron).
- [ ] Refund manual en Stripe dashboard → orden sync a `VOIDED` + availability liberada.
- [ ] Abrir orden atorada en admin → self-heal inmediato.

### Seguridad
- [ ] Race condition: dos `placeOrder` concurrentes sobre el último item → solo uno tiene éxito (advisory lock).
- [ ] Webhook duplicado (reintento de Stripe o Stripe CLI `trigger` doble) → `amountPaid` se actualiza una sola vez.
- [ ] Amount mismatch simulado → orden queda en `SUSPICIOUS`, no se marca CAPTURED.
- [ ] Enumeración de órdenes: pedir `/order/{otro-orderId}/success?session_id=xxx` con session_id ajeno → `notFound`.
- [ ] Rate limit: 6 `placeOrder` en 10 min desde misma IP → el sexto rechazado.
- [ ] Orden pagada intenta cambiar `total` vía admin → `forbiddenProblem`.
- [ ] Webhook con firma inválida → 400, no se procesa.
- [ ] Logs no contienen `customerEmail`, `customerName`, `customerPhone` ni payloads crudos de Stripe.
- [ ] Cron endpoint sin `CRON_SECRET` → 401.
- [ ] Startup en NODE_ENV=production sin `sk_live_` → error inmediato.

---

## 14. Out of scope v1 (documentado para roadmap)

- Refunds automatizados desde admin UI (hoy manual vía dashboard).
- Cobro del 50% restante vía app en modo split (hoy manual offline).
- Bad debt tracking / reportería de saldos pendientes.
- Delivery mode `ZIP_CODE`.
- Multi-moneda, multi-idioma de recibos.
- Apple/Google Pay botones dedicados (igual los activa Stripe hosted automáticamente).
- Stripe Tax.
- Guardar métodos de pago (cards on file).
- Dispute/chargeback handling formal (`charge.dispute.created` solo se loguea en v1).
- Alertas automáticas para órdenes stuck (solo visibilidad en cron logs v1).
- Rotación de webhook secret.
- Retención/anonimización de datos de guests (GDPR).

## 15. Riesgos residuales aceptados

| Riesgo | Mitigación | Aceptado porque |
|---|---|---|
| Hold de 30 min en peor caso | Advisory lock + expires_at corto | Aceptable para rental de eventos |
| Cliente no paga 50% restante en entrega | Política operativa del chofer | Fuera de scope de la app |
| Webhook perdido >3 días | Cron cada 10 min + self-heal | Probabilidad muy baja, detectable |
| Bot con 1000 IPs distintas | Rate limit por IP + por email | Sube costo del ataque; detección manual |
| Dispute/chargeback recibido | Log en webhook events; admin revisa Stripe dashboard | SMB scale, manejo manual ok |

---

**Veredicto:** Este PRD v3 + implementación correcta = v1 seguro para un negocio pequeño/mediano. No es Shopify, no es PayPal-grade, pero cierra los vectores de ataque explotables con esfuerzo bajo/medio y protege el activo más importante del negocio (inventario limitado + dinero).
