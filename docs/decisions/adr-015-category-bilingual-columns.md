# ADR-015: Textos de categoría bilingües con columnas `_en`

**Fecha:** 2026-11-12
**Estado:** Aceptado

## Contexto

ADR-013 dejó las categorías en un solo idioma: en `/en` el menú, los filtros del catálogo y la página de categoría seguían en español aunque los productos ya estuvieran traducidos.

## Decisión

Se aplica a `categories` el mismo modelo que ADR-013 usa para productos:

1. `categories` gana dos columnas nullable: `name_en` y `description_en`. `name` y `description` son la copia **en español** y siguen siendo la base.
2. El español es obligatorio (nombre); el inglés es opcional y arranca vacío.
3. **Fallback por campo:** en `/en` cada campo usa su traducción si existe y, si no, el español. La regla vive en `features/categories/lib/localize-category.ts`.
4. El slug es único y compartido entre idiomas.
5. En el admin, el formulario usa el mismo switch **ES | EN** que productos (`components/admin/content-locale-switch.tsx`); ambos idiomas se guardan juntos. La lista muestra el badge "Sin EN" cuando falta `name_en`, y la búsqueda compara contra `name` y `name_en`.
6. El storefront (menú, home, catálogo, página de categoría, detalle de producto y su SEO) muestra la categoría según el locale de la URL. El panel de admin la muestra en español.

## Razón

Las mismas que ADR-013: dos idiomas fijos y pocos campos; columnas evitan joins y no obligan a tocar lo que ya lee `name`.

## Consecuencias

- Variantes y servicios adicionales siguen en un solo idioma.
- El orden de las categorías no cambia (`sort_order`).

## Migración

`drizzle/0016_conscious_bloodaxe.sql`: dos `ADD COLUMN` nullable sobre `categories`. Sin backfill ni pérdida de datos.
