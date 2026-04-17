# Carrito, Checkout y Confirmación de Compra

> Estado: borrador inicial
> Módulo: `storefront`

## Propósito

Definir el flujo que va desde agregar productos al carrito hasta crear una orden
y mostrar la confirmación al cliente.

## Alcance

- carrito persistente
- validación de disponibilidad antes de agregar
- resumen de orden
- formulario de checkout
- pago y confirmación final

## Fuentes a fusionar

- `docs/roadmap.md` SPEC-06
- `docs/roadmap.md` SPEC-07
- `docs/roadmap.md` SPEC-08
- `docs/roadmap.md` SPEC-09

## Notas de migración

Hoy la fuente funcional está más repartida entre roadmap, código y tests E2E. Por
eso este archivo empieza como spec de consolidación.
