# Operación y Seguimiento de Órdenes

> Estado: borrador inicial
> Módulo: `orders`

## Propósito

Definir cómo el panel admin lista, filtra, consulta y opera las órdenes una vez
que ya fueron creadas.

## Alcance

- listado de órdenes
- búsqueda, filtros y paginación
- detalle de orden
- estados visibles y transiciones operativas
- visualización administrativa de datos del cliente y pagos

## Fuentes a fusionar

- `docs/roadmap.md` SPEC-09
- `docs/roadmap.md` SPEC-10
- comportamiento actual en `app/admin/(dashboard)/orders/*`

## Notas de migración

El calendario operativo puede salir de aquí más adelante como spec separado, pero
el núcleo de órdenes debe quedar primero consolidado en este archivo.
