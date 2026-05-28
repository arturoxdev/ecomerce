# ADR-009: Servicios adicionales (globales y locales)

**Fecha:** 2026-05-27
**Estado:** Aceptado

## Contexto

Los productos rentables necesitan extras pagados opcionales: por ejemplo un brincolín de $100 al que el cliente puede sumar "overnight" (+$25), "waterslide" (+$30) o "seguro" (+$50). Hoy el único mecanismo de opción es la **variante** (`product_variants`), que es de selección única y **reemplaza** el precio base (tiene su propio precio y stock). Los extras pedidos son distintos: **suman** al precio y son **multi-selección**.

Además hay dos alcances con puntos de configuración y selección distintos:

- **Globales**: configurados en `/admin/settings`, elegidos en el checkout, aplican a la orden completa (ej. overnight: "todo se queda la noche y se recoge al día siguiente").
- **Locales**: configurados por producto en una pestaña "servicios adicionales" del editor, elegidos en la página del producto, aplican a una línea concreta de la orden (ej. seguro para ese artículo).

## Decisión

Modelar **Servicio adicional** como un concepto nuevo, separado de las variantes:

- **Aditivo** (suma al precio), **multi-selección**, **sin stock propio**.
- **Monto fijo en dólares** (no porcentaje).
- **Local**: cargo **una vez por línea**, sin importar la cantidad de la línea.
- **Global**: cargo **una vez por orden**, sin importar la cantidad de ítems.

Dos modelos de definición separados, cada uno espejando un precedente existente:

- Locales → inline por producto (como `product_variants`).
- Globales → a nivel tienda (como los tiers de delivery).

Cuatro tablas nuevas: dos de definición (`product_additional_services`, `store_additional_services`) y dos de **snapshot** en la orden (`order_item_services`, `order_services`) que copian nombre + precio al momento del checkout y guardan un FK nullable a la definición.

Totales: `servicesTotal` es una cifra distinta del `subtotal` (solo productos). `total = subtotal + servicesTotal + deliveryFee` y `deposit = (subtotal + servicesTotal) × depositPercent`. El cargo online (`total × portion`) ya incluye servicios sin cambios.

**Los servicios NO afectan disponibilidad en v1.** "Overnight" es solo un cargo; reserva únicamente `rentDate`. La logística de la noche extra la maneja el dueño manualmente.

## Razón

- Sobrecargar `product_variants` con un flag "aditivo + multi" rompería la semántica de "reemplaza precio / selección única" y arriesgaría la lógica viva de carrito y órdenes.
- Dos modelos separados encajan con patrones que el repo ya tiene (variantes para lo local, tiers para lo global), minimizando conceptos nuevos.
- El **snapshot** sigue el precedente de `order_items.unitPrice`: las órdenes históricas no cambian si el admin re-precia o borra un servicio.
- Mantener servicios como **solo-precio** preserva la invariante de [ADR-006](./adr-006-single-day-rental.md) (reserva de un solo día). Bloquear `date+1` por overnight reintroduciría reservas multi-día, que ADR-006 eliminó deliberadamente.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Extender `product_variants` con flag aditivo/multi | Sobrecarga un concepto que significa "reemplaza precio, selección única"; riesgo en pricing/stock existente |
| Tabla única `additional_services` con `scope` y `productId` nullable | La selección (página vs checkout) y la persistencia (línea vs orden) divergen igual; no ahorra el código que de verdad importa |
| Guardar selección por referencia (solo `serviceId`) | Las órdenes históricas mutarían al re-preciar y se romperían al borrar un servicio |
| Columna `jsonb` con la lista de servicios | El repo evita JSON para datos de negocio (solo `audit_log` usa jsonb); difícil de consultar/reportar |
| Overnight bloquea `date+1` en disponibilidad | Reintroduce reservas multi-día (contra ADR-006), complica validación de checkout y vuelve "overnight" un servicio con semántica especial |

## Consecuencias

**Ventajas:**
- Separación limpia: variantes y servicios no se interfieren.
- Reportes claros (productos vs extras) por `servicesTotal` distinto del `subtotal`.
- Órdenes históricas estables gracias al snapshot.
- La invariante de un solo día se mantiene; el motor de disponibilidad no se toca.

**Limitaciones:**
- "Overnight" no refleja en disponibilidad que el artículo está retenido la noche siguiente; el dueño debe gestionarlo fuera del sistema. Si el negocio lo exige, una iteración futura puede añadir `extraDays` al servicio y extender la reserva (revisar ADR-006 antes).
- Cuatro tablas nuevas y lógica de pricing en el server (re-derivación de servicios en `placeOrder`, nunca confiar en el cliente).
