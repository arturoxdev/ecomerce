# ADR-006: Reserva por un solo día (single-day rental)

**Fecha:** 2026-04-28
**Estado:** Aceptado

## Contexto

El negocio (Festejos Aurora) opera por evento de un solo día: cada artículo se renta para una fecha específica y vuelve al inventario al día siguiente. La app, sin embargo, fue modelada para rentas multi-día (rangos `start_date` / `end_date`):

- `availability` guarda bloqueos como `(start_date, end_date)`.
- `order_items` guarda `(rent_start_date, rent_end_date)`.
- El datepicker público es `mode="range"` y la API exige `start` y `end`.

En la práctica esto generaba ruido: el equipo siempre seleccionaba el mismo día como inicio y fin, y los reportes contabilizaban "días" que no aplicaban al modelo de negocio. Mantener el modelo de rangos también complicaba el calendario público (no había una forma simple de pintar "días no disponibles").

## Decisión

Migrar el modelo a una sola fecha por reserva:

- `availability.date: timestamp` reemplaza `start_date` / `end_date`.
- `order_items.rent_date: timestamp` reemplaza `rent_start_date` / `rent_end_date`.
- La API rompe el contrato viejo: `GET /api/availability?productId&date=YYYY-MM-DD`. Sin compatibilidad.
- Nuevo endpoint `GET /api/availability/month?productId&month=YYYY-MM` devuelve `{ unavailableDates: string[] }` para que el datepicker pinte los días bloqueados sin un round-trip por día.
- Fecha mínima reservable = mañana (UTC). El admin puede bloquear desde hoy.
- El carrito permite ítems con fechas distintas. Ítems con fecha pasada se marcan visualmente y bloquean checkout.

## Razón

- Alinea el dominio con el negocio: "evento de un día" es la unidad real.
- Simplifica queries: `WHERE date = $d` en lugar de overlap `start < $end AND end > $start`.
- Permite indexar `(product_id, date)` como lookup directo.
- El UI público se reduce a un datepicker `mode="single"` con días deshabilitados, sin "X days" ni rango.
- Elimina ambigüedad en `schedule.service` (no hay que distinguir "delivery day" vs "pickup day").

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Mantener rangos y forzar `start = end` por convención | No resuelve el problema en la UI; sigue obligando a dos columnas y queries de overlap |
| Soportar single-day Y multi-día con discriminador | Duplica lógica en API/UI sin demanda real del negocio |
| Vista materializada por día sobre la tabla actual | Agrega una capa más sin simplificar la fuente de verdad |

## Consecuencias

**Ventajas:**
- Schema más simple. Menos columnas, índice más eficiente.
- API contract más expresivo (`date` único en lugar de `start`/`end`).
- Datepicker público con días deshabilitados sin pedir disponibilidad por día.
- El modelo cuadra con cómo el equipo ya operaba en la práctica.

**Limitaciones:**
- **Migración destructiva e irreversible**: al colapsar `(start_date, end_date)` en `date` se descarta `end_date` (y `rent_end_date`). Si alguna orden histórica tenía rango real (`start ≠ end`), se pierde la fecha de retorno. Antes de correr la migración hay que ejecutar:
  ```sql
  SELECT count(*) FROM order_items WHERE rent_start_date <> rent_end_date;
  SELECT count(*) FROM availability WHERE start_date <> end_date;
  ```
  Si hay filas, comunicarlas al stakeholder antes de ejecutar.
- Los carritos persistidos en `localStorage` con el shape viejo (`startDate`/`endDate`) se descartan vía `persist({ version: 1 })` en el cart-store.
- Los bloqueos manuales del admin que cubrían rangos quedan colapsados a una sola fila (con la fecha de inicio). Si el admin necesita bloquear un rango después del cambio, debe crear N filas.

## Migración

1. `pnpm drizzle-kit generate` — genera el SQL automático.
2. **Editar el SQL generado** para preservar datos antes del DROP:
   ```sql
   ALTER TABLE availability ADD COLUMN date timestamp(6);
   UPDATE availability SET date = start_date;
   ALTER TABLE availability ALTER COLUMN date SET NOT NULL;
   DROP INDEX IF EXISTS idx_availability_lookup;
   CREATE INDEX idx_availability_lookup ON availability(product_id, date);
   ALTER TABLE availability DROP COLUMN start_date, DROP COLUMN end_date;

   ALTER TABLE order_items ADD COLUMN rent_date timestamp(6);
   UPDATE order_items SET rent_date = rent_start_date;
   ALTER TABLE order_items ALTER COLUMN rent_date SET NOT NULL;
   ALTER TABLE order_items DROP COLUMN rent_start_date, DROP COLUMN rent_end_date;
   ```
3. `pnpm drizzle-kit migrate` para aplicar.
4. Verificar:
   ```sql
   SELECT count(*) FROM availability WHERE date IS NULL;          -- esperado: 0
   SELECT count(*) FROM order_items WHERE rent_date IS NULL;       -- esperado: 0
   ```

Sin path de rollback con datos preservados — si hay que revertir, solo es por restore de backup.
