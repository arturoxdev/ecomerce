# Disponibilidad, Bloqueos y Reglas de Reserva

> Estado: borrador inicial
> Módulo: `catalog`

## Propósito

Definir cómo se calcula y gestiona la disponibilidad de los productos, incluyendo
bloqueos manuales y reglas que impactan la reserva.

## Alcance

- bloqueos manuales de fechas
- validación de solapamientos
- página admin de disponibilidad por producto
- integración con la API de disponibilidad
- reducción de stock por reservas y bloqueos

## Fuentes a fusionar

- `openspec/changes/admin-inventory-catalog/specs/bloqueo-manual-fechas/spec.md`
- partes de `openspec/changes/spec-03-b-product-about-and-calendar/specs/catalog-date-range-picker/spec.md`
- `docs/roadmap.md` SPEC-07

## Notas de migración

La UX del calendario público puede referenciar este spec, pero las reglas de
negocio de disponibilidad deben vivir aquí.
