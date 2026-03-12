## Por Qué

Festejos Aurora es un negocio de renta de artículos para fiestas. El panel de administración ya cuenta con CRUD de productos y categorías, pero le faltan capacidades críticas para la operación diaria: no hay forma de bloquear fechas manualmente en el calendario de disponibilidad (ej. mantenimiento, reservas externas), las categorías no se pueden reordenar para controlar cómo aparecen en el catálogo público, y la gestión de productos carece de herramientas rápidas para filtrar y activar/desactivar productos. Estas brechas impiden que el administrador opere eficientemente sin intervención técnica.

## Qué Cambia

- **Bloqueo manual de fechas**: Nuevo flujo completo para crear y eliminar bloqueos de disponibilidad sin orden asociada (`orderId: null`). Incluye server actions, página dedicada por producto, formulario de creación y tabla de bloqueos con diferenciación visual entre bloqueos manuales y reservas de órdenes.
- **Campo `reason` en Availability**: Migración para agregar motivo opcional a los bloqueos manuales.
- **Reordenamiento de categorías**: Migración para agregar `sortOrder` al modelo Category, server action de reordenamiento, botones arriba/abajo en la tabla de categorías, y actualización de queries en admin y catálogo público.
- **Toggle rápido de productos**: Server action para cambiar `isActive` desde la tabla sin entrar al formulario de edición.
- **Filtro por estado en productos**: Tabs "Todos / Activos / Inactivos" con filtrado server-side y paginación preservada.
- **Diferenciación visual de productos inactivos**: Opacidad reducida en filas inactivas y badge clickeable de estado.
- **Capa de repositorios** (`lib/repositories/`): Abstracción de acceso a datos por modelo que centraliza todas las queries de Prisma. Refactor del código existente para usar repositorios en lugar de `db` directo.
- **Consumo dual**: Server components importan repositorios directamente; client components consumen endpoints API que internamente usan los mismos repositorios.

## Capacidades

### Capacidades Nuevas
- `bloqueo-manual-fechas`: Creación y eliminación de bloqueos de disponibilidad manuales por producto, con validación de solapamiento, página dedicada, formulario y tabla diferenciada.
- `reordenamiento-categorias`: Ordenamiento personalizado de categorías con persistencia en BD y reflejo en catálogo público.
- `gestion-estado-productos`: Toggle rápido de activación/desactivación y filtrado por estado en la tabla de productos.
- `repositorios-datos`: Capa de repositorios por modelo (category, product, availability, order, setting) con funciones planas exportadas.

### Capacidades Modificadas
<!-- No hay capacidades existentes con spec que requieran cambios a nivel de requisitos -->

## Impacto

- **Prisma schema**: 2 campos nuevos (`Availability.reason`, `Category.sortOrder`) + migración + backfill
- **Server actions**: Nuevas en `products/actions.ts` (bloqueos, toggle) y `categories/actions.ts` (reorder)
- **Páginas nuevas**: `app/admin/products/[id]/availability/` (page + 2 componentes client)
- **Componentes nuevos**: `product-status-filter.tsx`
- **Componentes modificados**: `product-table.tsx` (enlace disponibilidad, toggle, filtro), `category-table.tsx` (botones orden)
- **Páginas modificadas**: `products/page.tsx` (filtro), `categories/page.tsx` + `catalog/page.tsx` + forms de producto (orderBy sortOrder)
- **API existente**: `GET /api/availability` — verificar que ya considera `orderId: null` (no debería requerir cambios)
- **Archivos nuevos**: `lib/repositories/{category,product,availability,order,setting}.ts`
- **Refactor**: ~10 archivos existentes que importan `@/lib/db` directamente migran a usar repositorios
- **Endpoints API nuevos**: Routes que consumen repositorios para servir a client components
- **Dependencias**: No se agregan dependencias nuevas
