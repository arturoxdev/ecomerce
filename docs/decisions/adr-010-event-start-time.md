# ADR-010: Hora de inicio del evento (a nivel orden, informativa)

**Estado:** Aceptado — 2026-05-31

## Contexto

El negocio (renta de inflables/equipo para fiestas) necesita saber **a qué hora
inicia el evento del cliente** para planear la entrega. Hoy el carrito captura
solo la **fecha** por línea (`orderItems.rentDate`); no existe ningún concepto de
hora en el código. [ADR-006](./adr-006-single-day-rental.md) fijó la
disponibilidad a nivel **día**.

El borrador original ("agregar la hora del evento al carrito") mezclaba dos
conceptos —"hora del evento" y "hora de entrega"— y no definía granularidad,
alcance ni si la hora debía afectar la disponibilidad.

## Decisión

- El cliente elige **una sola "hora de inicio del evento" por orden**, en el
  **checkout** (no al agregar al carrito).
- La selección está limitada por una **ventana global** (hora mínima y máxima,
  un solo rango para todos los días) configurable en `/admin/settings`
  ("Horario de eventos").
- La hora es **informativa para fulfillment**: le dice al operador
  aproximadamente cuándo entregar. **No afecta la disponibilidad/stock**, que
  sigue siendo por día (ADR-006 se mantiene). La hora de salida real de la
  entrega la decide el operador por separado.
- **Almacenamiento:** texto `"HH:MM"` (24h, hora de pared de la tienda).
  - `orders.event_start_time` — columna nullable.
  - `settings.event_window_start` / `settings.event_window_end` — dos columnas
    nullable.
  - No se combina con `rentDate` ni se convierte a UTC.
- **UX:** `Select` con saltos de 1 hora, opciones generadas de la ventana.
  **Requerido solo si la ventana está configurada**; si no hay ventana, el campo
  se oculta y el checkout funciona como antes. No se persiste en el cart store
  (vive en el estado del formulario de checkout).
- **Validación en servidor** al crear la orden: si hay ventana, la hora es
  obligatoria y debe caer dentro del rango.

### Alternativas rechazadas

- **Disponibilidad por franja/hora (time slots):** contradice ADR-006 y dispara
  el alcance (repensar tabla y chequeo de disponibilidad); no encaja con una
  hora a nivel orden.
- **Combinar fecha+hora en un `timestamp`:** una orden puede tener varias fechas
  por línea (¿con cuál se combina?) y reintroduce problemas de timezone.
- **Hora por línea:** el negocio quiere una sola hora de evento; el plan dice
  "la hora" (singular).
- **Forzar una sola fecha por carrito:** se decidió no tocar el carrito; conserva
  varias fechas posibles aunque la hora sea una sola (ambigüedad aceptada).

## Consecuencias

- Implementación pequeña; sin migración de datos (todas las columnas nullable,
  feature "apagada" hasta que el admin configure la ventana).
- Un carrito con fechas distintas conserva **una sola** hora de evento; cuando
  las fechas difieren, la hora se entiende como el inicio del evento declarado
  por el cliente, no atada a una línea.
- Si en el futuro se requiere disponibilidad por franja horaria u hora por línea,
  habrá que rediseñar y migrar.
- El catálogo se nombra **"Horario de eventos"** (no "horarios de entrega") para
  evitar confusión; ver `CONTEXT.md` (términos *Event Start Time* / *Event
  Window*).
