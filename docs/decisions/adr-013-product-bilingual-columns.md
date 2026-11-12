# ADR-013: Textos de producto bilingües con columnas `_en`

**Fecha:** 2026-11-12
**Estado:** Aceptado

## Contexto

El storefront ya es bilingüe (`/en`, `/es`) pero el nombre, la descripción corta y el "Acerca de" de cada producto existían en un solo idioma (español), así que en `/en` el catálogo se veía en español.

## Decisión

1. `products` gana tres columnas nullable: `name_en`, `description_en`, `about_en`. Las columnas existentes (`name`, `description`, `about`) son la copia **en español** y siguen siendo la base.
2. El español es obligatorio (nombre); el inglés es opcional.
3. **Fallback por campo:** en `/en` cada campo usa su traducción si existe y, si no, el español. Un producto nunca se oculta por falta de traducción. La regla vive en `features/products/lib/localize-product.ts`.
4. El slug es único y compartido entre idiomas; se sigue generando desde el nombre en español.
5. En el admin, un solo switch **ES | EN** a nivel de formulario cambia los tres campos; ambos idiomas se guardan juntos con un solo "Guardar". La lista de productos muestra el badge "Sin EN" cuando falta `name_en`.
6. La búsqueda por nombre compara contra `name` y `name_en`.
7. Qué idioma ve cada superficie:

   | Superficie | Nombre que muestra |
   |---|---|
   | Catálogo, detalle, SEO, páginas de orden del cliente | Según el locale de la URL |
   | Carrito | Según el locale activo (el item guarda ambos nombres) |
   | Ticket PDF y email de nueva orden | Inglés, con fallback a español |
   | Panel de admin (productos, órdenes, calendario) | Español |

## Razón

- Son dos idiomas fijos (`content_locale`) y tres campos: columnas evitan joins y no obligan a tocar el admin, las órdenes ni los reportes que ya leen `name`.
- Las órdenes no guardan copia del nombre (`order_items` sólo tiene `product_id`), así que localizar las páginas de orden no requiere guardar el idioma de la orden.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Tabla `product_translations (product_id, locale, …)` como las páginas estáticas | Más joins y más código para dos idiomas fijos. Vale la pena sólo si se agrega un tercer idioma; migrar desde columnas es directo |
| Columna JSONB con todos los idiomas | Pierde tipado y complica la búsqueda por nombre |
| Slug por idioma | Complica URLs, el selector de idioma y los redirects por poco beneficio |
| Guardar el idioma en la orden | Innecesario: no hay email al cliente y las páginas de orden ya traen el locale en la URL |

## Consecuencias

- Variantes, categorías y servicios adicionales **siguen en un solo idioma**: en `/en` un producto traducido puede mostrar variantes y categoría en español. Queda como siguiente iteración. *(Categorías: resuelto en ADR-015.)*
- Los carritos guardados en el navegador antes de este cambio no tienen el nombre en inglés y muestran español hasta que el producto se vuelve a agregar.
- El catálogo se ordena por `name` (español) en ambos idiomas.

## Migración

`drizzle/0014_conscious_human_cannonball.sql`: tres `ADD COLUMN` nullable sobre `products`. Sin backfill ni pérdida de datos; el inglés arranca vacío.
