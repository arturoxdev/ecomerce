## Contexto

Festejos Aurora opera un e-commerce de renta de artículos para fiestas construido con Next.js 16, React 19, Prisma 7 y PostgreSQL. El panel admin (`/admin`) ya tiene CRUD completo de productos y categorías, subida de fotos a S3/MinIO, y una API de disponibilidad que calcula stock disponible por rango de fechas.

El modelo `Availability` ya soporta `orderId: null` a nivel de BD, lo que permite bloqueos sin orden asociada, pero no existe interfaz ni server actions para gestionarlos. Las categorías no tienen campo de orden. Los productos no tienen toggle rápido ni filtro por estado.

**Stack**: Next.js 16 (App Router), React 19 (`useActionState`), Prisma 7, PostgreSQL, Zod, shadcn/ui, Tailwind 4, Sonner (toasts), Lucide icons.

**Patrones existentes**: Server actions con Zod + `FormState` pattern, `revalidatePath` para invalidación, componentes client con `"use client"` y `useTransition` para mutaciones.

## Objetivos / No-Objetivos

**Objetivos:**
- Permitir al admin bloquear fechas manualmente por producto con motivo opcional
- Visualizar bloqueos manuales diferenciados de reservas de órdenes
- Controlar el orden de categorías en catálogo público y admin
- Activar/desactivar productos rápidamente desde la tabla
- Filtrar productos por estado activo/inactivo

**No-Objetivos:**
- Calendario visual interactivo (se usarán inputs `type="date"` estándar)
- Drag-and-drop para reordenamiento (se usarán botones arriba/abajo)
- Bloqueos recurrentes o reglas automáticas de disponibilidad
- Edición masiva de productos
- Notificaciones por email al bloquear fechas

## Decisiones

### D1: Migración única para `reason` y `sortOrder`

Se agregan ambos campos en una sola migración:
- `Availability.reason String?` — motivo opcional para bloqueos manuales
- `Category.sortOrder Int @default(0) @map("sort_order")` — posición de ordenamiento

**Alternativa considerada**: Dos migraciones separadas. Se descarta porque ambos campos son aditivos, no-breaking, y van en el mismo sprint.

**Backfill**: Script SQL dentro de la migración para asignar `sortOrder` secuencial basado en orden alfabético a categorías existentes.

### D2: Server actions en archivos existentes

Los bloqueos manuales (`createManualBlock`, `deleteManualBlock`, `getProductBlocks`) y el toggle (`toggleProductActive`) van en `app/admin/products/actions.ts`. El reordenamiento (`updateCategoryOrder`) va en `app/admin/categories/actions.ts`.

**Alternativa considerada**: Crear archivos de actions separados por feature. Se descarta porque el volumen de código es pequeño y seguir el patrón existente de un archivo por sección es más consistente.

### D3: Validación de solapamiento dentro de transacción

`createManualBlock` usa `db.$transaction` para:
1. Consultar la suma de `quantity` de registros que se solapan con el rango propuesto
2. Comparar contra `stock` del producto
3. Crear el registro solo si hay capacidad disponible

Esto garantiza atomicidad y previene condiciones de carrera.

**Alternativa considerada**: Validar fuera de transacción y crear después. Se descarta por riesgo de race conditions entre requests concurrentes.

### D4: Página dedicada para disponibilidad

Nueva ruta: `/admin/products/[id]/availability/` con:
- Server component (`page.tsx`) que carga producto y bloqueos
- Client component `manual-block-form.tsx` con `useActionState`
- Client component `availability-block-table.tsx` con `useTransition` para eliminación

**Alternativa considerada**: Modal dentro de la tabla de productos. Se descarta porque la gestión de bloqueos es suficientemente compleja para justificar su propia página y no sobrecargar la tabla.

### D5: Botones arriba/abajo para reordenamiento de categorías

Se agregan botones con iconos `ChevronUp`/`ChevronDown` en cada fila de `CategoryTable`. El reordenamiento se persiste inmediatamente con update optimista y rollback en caso de error.

**Alternativa considerada**: Drag-and-drop con `@dnd-kit`. Se descarta para no agregar dependencias y porque el número de categorías es bajo (<20 esperado).

### D6: Filtro de productos con search params

El filtro de estado usa query params (`?status=active|inactive|all`) procesados server-side en `page.tsx`. Esto mantiene la URL compartible/bookmarkeable y el filtrado se aplica tanto al `findMany` como al `count` de paginación.

### D7: API de disponibilidad sin cambios

La query existente en `GET /api/availability` ya suma **todos** los registros de `availability` independientemente del `orderId`, por lo que los bloqueos manuales (`orderId: null`) ya se consideran en el cálculo de stock ocupado. No se requieren cambios en la API pública.

### D8: Patrón de repositorios con funciones planas

Cada repositorio es un archivo con funciones exportadas (no clases). Se consumen vía `import * as categoryRepo from "@/lib/repositories/category"`. Cada repo importa el singleton `db` de `@/lib/db` internamente.

**Alternativa considerada**: Clases con inyección de dependencias. Se descarta porque agrega complejidad innecesaria para un proyecto de este tamaño y rompe la convención de funciones planas del resto del codebase.

### D9: Consumo dual — server vs client

Server components y server actions importan repositorios directamente. Client components consumen endpoints API (`/api/...`) que internamente usan los mismos repositorios. Esto mantiene la separación server/client de Next.js sin duplicar lógica de queries.

### D10: Server actions como wrappers delgados

Las server actions se mantienen como wrappers delgados: validación con Zod → llamada a repositorio → `revalidatePath` → `redirect`. No contienen lógica de queries directas a `db`.

**Alternativa considerada**: Mover toda la lógica a los repositorios incluyendo validación y revalidación. Se descarta porque Zod y `revalidatePath`/`redirect` son concerns del framework (Next.js), no de acceso a datos.

## Riesgos / Trade-offs

| Riesgo | Mitigación |
|--------|------------|
| Race condition en bloqueos concurrentes | Uso de `$transaction` con consulta + inserción atómica |
| Migración falla en producción | Ambos campos son nullable/default, no hay riesgo de pérdida de datos. Rollback: revertir migración |
| Reordenamiento con muchas categorías es lento | El número esperado es <20. Si crece, considerar batch update con `$executeRaw` |
| El backfill de sortOrder reordena categorías existentes | Se usa orden alfabético como base, que es el orden actual implícito |
| Toggle accidental de isActive | El botón requiere un click deliberado, no hay confirmación extra (trade-off: velocidad vs seguridad) |
