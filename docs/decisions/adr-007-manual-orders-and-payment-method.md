# ADR-007: Órdenes manuales y `payment_method`

**Fecha:** 2026-04-28
**Estado:** Aceptado

## Contexto

Hasta ahora, toda orden vivía dentro del flujo Stripe: el carrito público crea la orden, Stripe captura el pago y los webhooks reconcilian el estado. El dueño del negocio cobra una fracción del inventario fuera del sistema (efectivo, transferencia, saldo previo) y necesitaba registrar esas reservas para que bloqueen el inventario igual que una orden Stripe.

Sin esto:

- El admin no podía cargar reservas pagadas en persona.
- El método de pago de las órdenes Stripe no se persiste — todo es implícitamente "tarjeta".
- No existía un mecanismo para "marcar como pagada" una orden parcial ni para cancelar una orden desde el admin (web hooks atendían sólo el caso refund automático).

## Decisión

1. **Nuevo enum `payment_method = ['CASH', 'CARD', 'TRANSFER']`** y columna `orders.payment_method NOT NULL DEFAULT 'CARD'`. Las órdenes Stripe se persisten con `CARD`; las manuales eligen `CASH` o `TRANSFER` (Q7).
2. **Sheet admin "Crear orden"** en `/admin/orders` con búsqueda de productos, calendario `mode="single"` y typeahead de cliente sobre órdenes previas (Q1). El admin puede reservar desde **HOY** (asimétrico con el carrito público que exige `>= mañana`, Q2).
3. **`createManualOrder` server action** persiste la orden en una transacción que inserta `orders + order_items + availability + audit_log("order.create_manual")`. Stripe NO interviene; tampoco se manda email (Q6).
4. **`paymentStatus` derivado**: `amountPaid >= total ? "CAPTURED" : "AUTHORIZED"`. `status` siempre `CONFIRMED` (Q4/Q5).
5. **Botón "Marcar como pagada"** en el detalle: pasa `AUTHORIZED → CAPTURED` y selecciona el método final (CASH/TRANSFER). Sólo aplica a manuales (no Stripe) (Q5).
6. **Botón "Cancelar"** en el detalle de toda orden (manual o Stripe). Libera siempre `availability.orderId = ?`. Para manuales pasa `paymentStatus → VOIDED`. Para órdenes Stripe ya `CAPTURED` el local pasa a `status = CANCELLED` pero `paymentStatus` permanece `CAPTURED` hasta que el webhook `handleChargeRefunded` (existente) lo mueva a `VOIDED` (Q8b). El admin ve un warning explícito *"El refund se hace desde Stripe Dashboard"*.
7. **Permisos**: `requireWriteAccess()` ya bloquea `EMPLOYEE`. Las 3 acciones (crear, marcar pagada, cancelar) y el botón "Crear orden" se ocultan para EMPLOYEE (Q3).

## Razón

- Mantiene un único set de transiciones de estado (`AUTHORIZED → CAPTURED`, `* → CANCELLED + VOIDED`) que ya conocían `cart-order` y los webhooks; el admin no introduce un flujo paralelo.
- El refund de Stripe se queda donde ya funciona (Stripe Dashboard + webhook). Evitar duplicar el camino de error: cancelar local + refund automático en Stripe Dashboard sería un doble path con su propia lógica de fallback (Q8b).
- Sin tabla `customers`: el typeahead lee `DISTINCT (name, email, phone, MAX(delivery_address))` desde `orders` filtrado por `storeId` (Q1). Cero migración nueva, cero acoplamiento con futuro CRM.
- `payment_method` con default `CARD` cubre filas pre-existentes (todas son Stripe) sin backfill manual.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Refundir desde admin (botón "Refund") para órdenes Stripe CAPTURED | Doble path con su propia lógica de error frente al webhook ya probado. Stripe Dashboard sigue siendo la fuente de verdad |
| Tabla `customers` separada con FK desde `orders` | Sin demanda real (no hay CRM); typeahead resuelve Q1 sin migración |
| Sólo Sheet con un único método de pago | El negocio ya distingue cash/transfer en su contabilidad; persistirlo evita reportes manuales |
| Reusar `cart-order.service` con un flag `isManual` | Las reglas divergen: rate-limit, `getMinBookableDate`, depósito, locale. El factor de churn supera el reuso real |
| `paymentMethod` por ítem (en `order_items`) | PR-001 trata el método como propiedad de la orden completa. Si en el futuro hay split de método por ítem, requerirá migración separada |

## Consecuencias

**Ventajas:**

- El admin tiene paridad operativa con el carrito público para registrar reservas.
- El método de pago real se persiste y queda disponible para reportes/conciliación.
- Las cancelaciones (manual o Stripe) liberan inventario consistentemente desde un solo path.

**Limitaciones / cosas a vigilar:**

- El default `CARD` en la migración asume que todas las filas pre-existentes son Stripe. Si en producción existe alguna orden registrada manualmente antes de PR-001, quedará marcada como `CARD` (no debería haber).
- El admin puede reservar HOY mientras el carrito público sigue exigiendo `>= mañana`. Si el cliente público se queja de la asimetría, hay que documentarlo en `flows.md` y/o ajustar `getMinBookableDate` (no en este PR).
- `cancelOrder` rechaza órdenes ya `CANCELLED`/`DELIVERED`/`RETURNED` (idempotencia explícita). Una segunda llamada falla con 403; la UI debe ocultar el botón en esos estados, lo cual ya hace.

## Migración

1. `pnpm drizzle-kit generate` — añade el enum `payment_method` y la columna `orders.payment_method` con default `CARD`.
2. Revisar el SQL generado: el `ALTER TABLE` debe incluir el `DEFAULT 'CARD'` para no romper filas existentes.
3. `pnpm drizzle-kit migrate`.
4. Verificar:

   ```sql
   SELECT count(*) FROM orders WHERE payment_method IS NULL;        -- 0
   SELECT payment_method, count(*) FROM orders GROUP BY payment_method;
   -- esperado: todas en CARD pre-PR-001; nuevas manuales en CASH/TRANSFER
   ```

Sin path de rollback automático: revertir requiere `ALTER TABLE orders DROP COLUMN payment_method` y `DROP TYPE payment_method`. No hay datos que se pierdan.
