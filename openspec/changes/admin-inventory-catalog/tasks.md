## 1. Crear Repositorios de Datos

- [x] 1.1 Crear `lib/repositories/category.ts` con funciones: findAll, findById, create, update, delete, updateOrder
- [x] 1.2 Crear `lib/repositories/product.ts` con funciones: findAll, findById, create, update, delete, toggleActive, count
- [x] 1.3 Crear `lib/repositories/availability.ts` con funciones: findByProduct, findByDateRange, createBlock, deleteBlock, checkOverlap
- [x] 1.4 Crear `lib/repositories/order.ts` con funciones: findAll, findById, create, update, findByDateRange
- [x] 1.5 Crear `lib/repositories/setting.ts` con funciones: getAll, getByKey, upsert

## 2. Migrar Código Existente a Repositorios

- [x] 2.1 Migrar server actions en `app/admin/products/actions.ts` para usar `productRepo` y `availabilityRepo` en lugar de `db` directo
- [x] 2.2 Migrar server actions en `app/admin/categories/actions.ts` para usar `categoryRepo`
- [x] 2.3 Migrar server components que importan `@/lib/db` para usar repositorios correspondientes
- [x] 2.4 Migrar API routes existentes para consumir repositorios
- [x] 2.5 Verificar que no quedan imports directos de `@/lib/db` fuera de `lib/repositories/`

## 3. Migración de Base de Datos

- [x] 3.1 Agregar el campo `reason` al schema de `availability` en `lib/db/schema.ts`
- [x] 3.2 Agregar el campo `sortOrder` al schema de `categories` en `lib/db/schema.ts`
- [x] 3.3 Generar y aplicar la migración SQL `add-availability-reason-and-category-sort-order` con Drizzle
- [x] 3.4 Ejecutar backfill SQL para asignar sortOrder secuencial a categorías existentes basado en orden alfabético
- [x] 3.5 Verificar que el schema y los tipos inferidos de Drizzle incluyen los nuevos campos

## 4. Bloqueo Manual de Fechas — Server Actions

- [x] 4.1 Agregar esquema Zod `manualBlockSchema` en `app/admin/products/actions.ts` con validaciones: startDate (requerida, no en pasado), endDate (requerida, posterior a startDate), reason (opcional, max 255)
- [x] 4.2 Implementar `createManualBlock(productId, _prev, formData)` con validación Zod, verificación de producto, transacción con chequeo de solapamiento contra stock, y creación de registro con orderId: null. Usar `availabilityRepo` en lugar de `db` directo
- [x] 4.3 Implementar `deleteManualBlock(blockId)` que valida que orderId === null antes de eliminar. Usar `availabilityRepo`
- [x] 4.4 Implementar `getProductBlocks(productId)` que retorna bloqueos ordenados por startDate desc con datos de orden asociada. Usar `availabilityRepo`

## 5. Bloqueo Manual de Fechas — Interfaz

- [x] 5.1 Crear página server component en `app/admin/products/[id]/availability/page.tsx` que carga producto y bloqueos, muestra 404 si no existe
- [x] 5.2 Crear client component `manual-block-form.tsx` con useActionState, inputs de fecha, campo reason opcional, errores inline y toast de éxito
- [x] 5.3 Crear client component `availability-block-table.tsx` con badges diferenciados (naranja bloqueo manual / azul reserva), botón eliminar solo en manuales, AlertDialog de confirmación, estado vacío
- [x] 5.4 Agregar icono CalendarX2 con Link a disponibilidad en cada fila de `app/admin/products/product-table.tsx`

## 6. Verificación de API de Disponibilidad

- [x] 6.1 Verificar que `GET /api/availability` ya considera registros con orderId=null en su cálculo (la query SQL existente suma todos los registros de availability sin filtrar por orderId)
- [ ] 6.2 Probar manualmente: crear bloqueo manual, consultar API, verificar que stock disponible se reduce correctamente

## 7. Reordenamiento de Categorías — Server Actions

- [x] 7.1 Implementar `updateCategoryOrder(items: {id, sortOrder}[])` en `app/admin/categories/actions.ts` con validación Zod y transacción. Usar `categoryRepo`
- [x] 7.2 Modificar `createCategory` para asignar sortOrder = max existente + 1 al crear nueva categoría. Usar `categoryRepo`

## 8. Reordenamiento de Categorías — Interfaz

- [x] 8.1 Agregar botones ChevronUp/ChevronDown en `app/admin/categories/category-table.tsx` con update optimista, rollback en error, y botones deshabilitados en extremos
- [x] 8.2 Cambiar orderBy a `sortOrder: "asc"` en `app/admin/categories/page.tsx`
- [x] 8.3 Cambiar orderBy a `sortOrder: "asc"` en catálogo público y selectores de categoría en formularios de producto

## 9. Gestión de Estado de Productos — Server Actions

- [x] 9.1 Implementar `toggleProductActive(productId)` en `app/admin/products/actions.ts` que invierte isActive y revalida. Usar `productRepo`

## 10. Gestión de Estado de Productos — Interfaz

- [x] 10.1 Crear `app/admin/products/product-status-filter.tsx` con tabs "Todos / Activos / Inactivos" usando Links con query param status
- [x] 10.2 Modificar `app/admin/products/page.tsx` para leer searchParam status y aplicar filtro where en findMany y count
- [x] 10.3 Modificar `app/admin/products/product-table.tsx`: badge de estado clickeable con toggle, opacidad reducida en inactivos, preservar param status en paginación
