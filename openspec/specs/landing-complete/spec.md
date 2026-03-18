## Purpose

Landing page completa con sección "cómo funciona" y categorías destacadas desde la base de datos.

## Requirements

### Requirement: Sección "Cómo funciona" en la landing page
La landing page DEBE incluir una sección que explique el proceso de renta en pasos claros.

#### Scenario: Usuario ve la sección "Cómo funciona"
- **WHEN** un usuario accede a la landing page
- **THEN** ve una sección con al menos 3 pasos que explican: navegar catálogo, seleccionar fechas y productos, pagar anticipo online, y recibir entrega

#### Scenario: Sección bilingüe
- **WHEN** un usuario cambia el idioma de EN a ES
- **THEN** la sección "Cómo funciona" muestra los textos traducidos al español

### Requirement: Categorías destacadas desde la base de datos
La landing page DEBE mostrar las categorías de productos obtenidas desde la base de datos, no hardcodeadas.

#### Scenario: Categorías reflejan cambios en admin
- **WHEN** un admin agrega una nueva categoría desde el panel
- **THEN** la landing page muestra la nueva categoría en la sección de equipos destacados
