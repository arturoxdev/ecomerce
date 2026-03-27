# ADR-002: Authorize & Capture para resolver race condition en disponibilidad

**Fecha:** 2026-02-26
**Estado:** Aceptado

## Contexto

El sistema enfrenta un problema de race condition: dos usuarios pueden seleccionar el mismo producto para las mismas fechas simultáneamente. Si ambos llegan al checkout al mismo tiempo, sin un mecanismo de coordinación, ambos podrían confirmar la reserva y el negocio terminaría con overbooking.

Se evaluaron tres enfoques: cobrar primero y reembolsar si falla, usar una reserva temporal (hold), y el patrón Authorize & Capture.

El problema con cobrar primero y reembolsar después: Square y PostgreSQL son sistemas independientes. Si el cobro es exitoso pero la validación de stock falla, el reembolso puede fallar también — el usuario queda cobrado sin reserva.

El problema con reservas temporales (hold): requiere una tabla adicional de holds, un cron job para limpiar holds expirados, y crea el riesgo de que usuarios maliciosos bloqueen stock indefinidamente.

## Decisión

Usar el patrón Authorize & Capture de Square combinado con una transacción atómica en PostgreSQL con `SELECT ... FOR UPDATE`.

## Razón

Square separa el proceso de pago en dos pasos: AUTHORIZE (congela fondos, no cobra) y CAPTURE (ejecuta el cobro). Esto permite validar disponibilidad *antes* de cobrar, y hacer VOID (liberar fondos) si el stock no está disponible, sin que el usuario pierda dinero.

El `FOR UPDATE` en la query de disponibilidad garantiza que solo una transacción a la vez puede validar y escribir en `availability` para un producto dado — el segundo usuario en llegar espera y recalcula con el stock actualizado.

El flujo resultante: AUTHORIZE → validar stock con lock → si OK: INSERT availability + CAPTURE → si no: VOID.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Cobrar → validar → reembolsar | Riesgo de usuario cobrado sin reserva si el reembolso falla; inaceptable para el negocio |
| Reserva temporal (hold) | Complejidad adicional innecesaria: tabla extra, cron job, y superficie de ataque para bloquear stock |

## Consecuencias

- **Cuenta Square requerida:** El cliente debe crear y verificar su cuenta Square antes del Sprint 3. Sin credenciales, no se puede integrar.
- **Mismo `payment_id` para todo el ciclo:** Square usa el mismo `payment.id` para AUTHORIZE, CAPTURE y VOID. El campo `squarePaymentId` en `orders` es suficiente — no se necesita campo separado para el ID de autorización.
- **VOID falla:** Si el VOID falla (edge case), Square libera el hold automáticamente en 7 días. Se debe loguear el error y generar alerta manual.
- **CAPTURE falla después del INSERT:** Si el CAPTURE falla tras insertar en `availability`, se hace rollback del INSERT y se reintenta el CAPTURE (Square es idempotente con el mismo payment ID).
