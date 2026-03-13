## 1. Agregar `findBySlug` al Category Repo

- [x] 1.1 Agregar función `findBySlug(slug: string)` en `lib/repositories/category.ts` que retorna la categoría completa o `undefined` usando `db.query.categories.findFirst` con `eq(categories.slug, slug)`

## 2. Crear Landing Page de Categoría

- [x] 2.1 Crear `app/[locale]/[categorySlug]/page.tsx` como server component con:
  - Validación de locale con `isLocale()` → `notFound()`
  - Búsqueda de categoría con `categoryRepo.findBySlug(categorySlug)` → `notFound()` si no existe
  - Búsqueda de productos con `productRepo.findAllByCategorySlug(categorySlug)` ordenados por nombre asc
  - Breadcrumb: Home > Catálogo > {nombre categoría}
  - Heading con nombre de categoría
  - Grid 3 columnas con `ProductCard` (mismo patrón que `/catalog`)
  - Estado vacío si no hay productos

- [x] 2.2 Agregar `generateMetadata` en la misma página que retorne `{ title: "{categoryName} | Festejos Aurora" }` usando `categoryRepo.findBySlug()`

## 3. Verificación

- [x] 3.1 Verificar que `/[locale]/catalog` sigue funcionando sin conflicto con la ruta dinámica
- [x] 3.2 Verificar que un slug inexistente retorna 404
- [x] 3.3 Verificar que la landing de categoría muestra solo productos activos de esa categoría
