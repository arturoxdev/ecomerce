## Why

Los productos actualmente solo tienen un campo `description` corto y sin formato. Los clientes necesitan ver información detallada del producto (materiales, dimensiones, qué incluye) en formato enriquecido. Además, el selector de fechas de disponibilidad usa inputs nativos HTML5 que no coinciden con el diseño del sistema y no ofrecen buena UX para seleccionar rangos. El slug tampoco se normaliza en el servidor, permitiendo inconsistencias.

## What Changes

- **Nuevo campo `about`** (TEXT) en la tabla `products` para contenido largo en markdown ("About This Product")
- **Límite de 150 caracteres** en `description` con contador en vivo en el formulario admin
- **Normalización de slug server-side**: lowercase, espacios→guiones, eliminar caracteres inválidos antes de guardar
- **Reemplazo del date picker** nativo por un Calendar inline de shadcn con selección de rango (matching diseño Pencil)
- **Renderizado de markdown** del campo `about` en la página de detalle del catálogo usando el componente `MarkdownContent` existente

## Capabilities

### New Capabilities
- `product-about-field`: Campo largo de producto en markdown, incluyendo textarea admin, validación, y renderizado en catálogo
- `catalog-date-range-picker`: Selector de rango de fechas con calendario visual shadcn para la sección de disponibilidad

### Modified Capabilities
_(ninguna — no se modifican requisitos de specs existentes, solo se agregan capacidades nuevas)_

## Impact

- **Base de datos**: Migración Drizzle para agregar columna `about` a `products`
- **Admin forms**: `product-form.tsx`, `actions.ts`, `edit/page.tsx` — nuevos campos y validación
- **Catálogo**: `availability-checker.tsx` — reescritura del date picker; `catalog/[slug]/page.tsx` — nueva sección "About"
- **Dependencias nuevas**: `react-day-picker`, `date-fns` (via `npx shadcn add calendar`)
- **Componentes shadcn nuevos**: `calendar.tsx`, `popover.tsx`
- **Reutilización**: `MarkdownContent` de `components/public/markdown-content.tsx`
