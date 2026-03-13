## Por Qué

El catálogo actual (`/[locale]/catalog`) muestra todos los productos con un filtro de categoría por query param. No existe una URL dedicada por categoría, lo que impide compartir links directos a una categoría específica, dificulta el SEO por categoría, y no permite crear landing pages con identidad propia por tipo de producto. Se necesitan rutas top-level por categoría que funcionen como landing pages independientes.

## Qué Cambia

- **Landing pages por categoría**: Nueva ruta dinámica `app/[locale]/[categorySlug]/page.tsx` que renderiza un grid de productos filtrados por la categoría correspondiente al slug. Si el slug no matchea ninguna categoría en la DB, retorna 404.
- **`findBySlug` en category repo**: Nueva función en `lib/repositories/category.ts` para buscar una categoría por su slug (hoy solo existe `findById`).
- **Metadata dinámica**: `generateMetadata` que usa el nombre de la categoría para title/description.
- **Navegación**: Los links de categoría en el home y el filtro del catálogo pueden apuntar a estas nuevas rutas (opcional, no rompe nada existente).

## Capacidades

### Capacidades Nuevas
- `landing-categorias`: Página pública por categoría en `/{locale}/{categorySlug}` que muestra el grid de productos de esa categoría con metadata SEO.

### Capacidades Modificadas
<!-- Ninguna — las rutas existentes (home, catalog, product detail) no se modifican -->

## Impacto

- **Archivos nuevos**: `app/[locale]/[categorySlug]/page.tsx`
- **Archivos modificados**: `lib/repositories/category.ts` (agregar `findBySlug`)
- **DB/Migraciones**: Ninguna — el schema ya tiene `slug` unique en categories
- **Rutas existentes**: No se tocan. `/catalog`, `/catalog/[slug]`, y home permanecen igual
- **Riesgo de conflicto de rutas**: `[categorySlug]` es dinámico al mismo nivel que `catalog` (estático). Next.js prioriza rutas estáticas sobre dinámicas, así que `catalog` sigue funcionando. Cualquier otro slug que no sea una categoría válida retorna 404.

## Fuera de Alcance

- Rediseño del home
- Modificación de la página de catálogo existente
- Páginas de detalle de producto por categoría (`/{categorySlug}/{productSlug}`) — los productos siguen en `/catalog/[slug]`
- Contenido editorial por categoría (hero, descripción larga, etc.) — por ahora es solo el grid de productos
