## 1. Base de datos

- [x] 1.1 Agregar campo `about: text("about")` a la tabla `products` en `lib/db/schema.ts`
- [x] 1.2 Generar migración con `npx drizzle-kit generate` y aplicarla con `npx drizzle-kit push`

## 2. Formulario admin — campo about y validaciones

- [x] 2.1 Agregar `about` al tipo `defaultValues` en `product-form.tsx` y al Zod schema en `actions.ts`
- [x] 2.2 Agregar textarea "About this product" al formulario en `product-form.tsx` (debajo de description, rows=6)
- [x] 2.3 Agregar contador de caracteres al campo description: estado controlado, mostrar `{count}/150`, y `maxLength={150}` en el textarea
- [x] 2.4 Agregar `z.string().max(150)` a description en el Zod schema de `actions.ts`
- [x] 2.5 Agregar normalización de slug server-side en `createProduct` y `updateProduct` (lowercase, espacios→guiones, strip caracteres inválidos)
- [x] 2.6 Extraer `about` de FormData y pasarlo al repo en ambas acciones (create/update)
- [x] 2.7 Pasar `about: product.about ?? ""` en defaultValues del `edit/page.tsx`

## 3. Componentes shadcn — Calendar

- [x] 3.1 Instalar componentes shadcn: `npx shadcn@latest add calendar popover`
- [x] 3.2 Verificar que `react-day-picker` y `date-fns` se instalaron correctamente

## 4. Availability checker — Calendar con date range

- [x] 4.1 Refactorizar `availability-checker.tsx`: reemplazar los dos `<input type="date">` por `<Calendar mode="range" />` de shadcn inline
- [x] 4.2 Personalizar estilos del calendario: rango verde oscuro (#2d6a4f) en extremos, verde claro (#dcfce7) en días intermedios, deshabilitar fechas pasadas
- [x] 4.3 Agregar resumen de rango debajo del calendario con iconos de calendario y fechas formateadas (matching diseño Pencil)
- [x] 4.4 Mantener integración con API de disponibilidad: convertir `DateRange` de react-day-picker a strings YYYY-MM-DD para el fetch con debounce de 400ms

## 5. Página de catálogo — Sección "About This Product"

- [x] 5.1 Importar `MarkdownContent` en `app/[locale]/catalog/[slug]/page.tsx`
- [x] 5.2 Agregar sección "About This Product" debajo de la grid principal: divider + título h2 + card blanca con `MarkdownContent` renderizando `product.about`
- [x] 5.3 Condicionar la sección a que `product.about` sea truthy
- [x] 5.4 Estilizar la card según diseño Pencil: `rounded-2xl bg-white border border-slate-100 p-8`, título `text-2xl font-extrabold`

## 6. Verificación

- [x] 6.1 Crear/editar producto en admin con campo about en markdown y description ≤150 chars — verificar persistencia
- [x] 6.2 Verificar que slug se normaliza al guardar (enviar slug con mayúsculas/espacios)
- [x] 6.3 Verificar calendario de disponibilidad en página de catálogo — selección de rango y consulta API
- [x] 6.4 Verificar renderizado de markdown en sección "About This Product" en catálogo
