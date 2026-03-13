## Contexto

Festejos Aurora es un e-commerce de renta de artículos para fiestas construido con Next.js 16 (App Router), React 19, Drizzle ORM, PostgreSQL, Tailwind 4 y shadcn/ui. El catálogo público vive en `app/[locale]/catalog/` con filtro de categoría por query param. Cada categoría tiene un `slug` único en la DB. Ya existen repositorios (`lib/repositories/category.ts`, `lib/repositories/product.ts`) y el componente `ProductCard` reutilizable.

**Stack relevante**: Next.js 16, Drizzle ORM, `ProductCard` component, `categoryRepo`, `productRepo`, i18n con `getMessages()`.

## Objetivos / No-Objetivos

**Objetivos:**
- Crear una landing page pública por cada categoría en `/{locale}/{categorySlug}`
- Reutilizar `ProductCard` y el patrón visual existente del catálogo
- Generar metadata SEO dinámica por categoría
- 404 si el slug no corresponde a ninguna categoría

**No-Objetivos:**
- Rediseño del home o del catálogo existente
- Contenido editorial por categoría (hero, descripción larga)
- Rutas anidadas `/{categorySlug}/{productSlug}` para detalle de producto
- Navegación o menú con links a las categorías (puede hacerse después)

## Decisiones

### D1: Ruta dinámica `[categorySlug]` al mismo nivel que `catalog`

Se crea `app/[locale]/[categorySlug]/page.tsx`. Next.js resuelve rutas estáticas antes que dinámicas, así que `/catalog` sigue funcionando sin conflicto. Cualquier slug que no sea `catalog` (u otra ruta estática) cae en `[categorySlug]` y se valida contra la DB.

**Alternativa considerada**: Anidar bajo `/catalog/category/[slug]`. Se descarta porque el usuario quiere rutas top-level limpias (`/es/inflables`).

### D2: Reutilizar `ProductCard` y layout del catálogo

La landing de categoría usa el mismo grid 3 columnas y el mismo `ProductCard` que `/catalog`. No se duplica lógica de presentación.

### D3: `findBySlug` en category repo

Se agrega una función simple `findBySlug(slug)` en `lib/repositories/category.ts` que retorna la categoría completa o `undefined`. Esto se usa tanto para validar que la categoría existe como para obtener su nombre para el heading y metadata.

**Alternativa considerada**: Usar `findAll` y filtrar en JS. Se descarta porque es innecesario cuando Drizzle soporta queries directas por campo.

### D4: Breadcrumb con link al catálogo

La landing de categoría incluye un breadcrumb simple: Home > Catálogo > {Nombre Categoría}. Sigue el patrón ya usado en la página de detalle de producto.

## Componentes

### `app/[locale]/[categorySlug]/page.tsx` (server component)

```
Input:
  params.locale → validar con isLocale()
  params.categorySlug → buscar con categoryRepo.findBySlug()

Flujo:
  1. Validar locale → notFound() si inválido
  2. Buscar categoría por slug → notFound() si no existe
  3. Buscar productos activos de esa categoría con productRepo.findAllByCategorySlug()
  4. Renderizar breadcrumb + heading + grid de ProductCard

Metadata:
  generateMetadata() → { title: "{categoryName} | Festejos Aurora" }
```

### `lib/repositories/category.ts` — agregar `findBySlug`

```typescript
export function findBySlug(slug: string) {
  return db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
}
```
