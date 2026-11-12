# ADR-014: Un solo modelo de precio: por unidad, limitado por existencias

**Fecha:** 2026-11-12
**Estado:** Aceptado

## Contexto

Cada producto tenía un `price_type`: `FIXED` ("solo se puede rentar uno por día") o `PER_UNIT` ("se rentan varias unidades"). En un producto `FIXED` la disponibilidad ignoraba el campo Existencias: con una reserva ese día quedaba agotado, tuviera 1 o 250 unidades.

Los dueños de tienda configuraban existencias (p. ej. 250) y no entendían por qué solo se podía reservar una. El tipo de precio no describía un precio distinto, sino un tope de cantidad que ya expresa el campo Existencias.

Además había una incoherencia: la validación al crear la orden (`checkAvailability`) ya comparaba contra existencias sin mirar el tipo; el tope de "solo uno" vivía únicamente en la consulta de disponibilidad y en la interfaz.

## Decisión

1. Se elimina el concepto de tipo de precio: la columna `products.price_type` y el enum `price_type` se borran (migración `0015`).
2. Todo producto se cobra por unidad. Disponible en un día = `stock - ocupado`, usando el stock de la variante cuando hay una elegida.
3. Las existencias que ya tenía cada producto se respetan tal cual; no se resetean. Un producto con 0 existencias no es rentable.
4. El selector de cantidad y el texto de existencias se muestran en todos los productos (tienda, carrito y órdenes manuales del admin), con el máximo según lo disponible ese día.
5. Se quita el sufijo "/ por unidad" junto al precio en tienda y admin.
6. Carrito: agregar otra vez un producto suma cantidad solo si coinciden fecha, variante y servicios elegidos; si algo difiere es una línea aparte.

## Razón

- Un solo control (Existencias) en lugar de dos que podían contradecirse.
- Un producto único (un brincolín) se modela con existencias = 1, sin caso especial.
- La regla de disponibilidad queda igual en la consulta pública y en la creación de la orden.

## Consecuencias

- Productos que eran `FIXED` con existencias mayores a 1 pasan a aceptar esa cantidad de reservas por día. Hay que revisarlos antes de aplicar la migración.
- Productos que eran `FIXED` con existencias en 0 dejan de ser rentables hasta que se corrija el número.
- Reemplaza la respuesta "¿Los precios varían por producto?" de `docs/questions.md`.
- Despliegue: primero el código, después la migración. Entre ambos, crear productos desde el admin falla porque la columna sigue siendo obligatoria.
