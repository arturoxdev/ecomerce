## Context

El sistema de productos tiene un schema Drizzle en `lib/db/schema.ts` con la tabla `products` que incluye `description` (TEXT, opcional) pero no tiene campo para contenido largo. El formulario admin en `product-form.tsx` genera slugs client-side con `toSlug()` pero el server action no normaliza. La página de catálogo `catalog/[slug]/page.tsx` renderiza descripción como texto plano y usa `<input type="date">` nativos para disponibilidad.

Ya existe `MarkdownContent` en `components/public/markdown-content.tsx` — parser custom que soporta headings, listas, bold y links. shadcn está configurado pero no tiene componente Calendar instalado.

## Goals / Non-Goals

**Goals:**
- Agregar campo `about` (markdown) a productos con textarea en admin y renderizado en catálogo
- Limitar `description` a 150 caracteres con feedback visual en el formulario
- Garantizar que slugs se normalicen server-side antes de persistir
- Reemplazar date inputs nativos con calendario visual shadcn para selección de rango
- Mantener compatibilidad con la API de disponibilidad existente

**Non-Goals:**
- Editor WYSIWYG o preview en vivo de markdown en el admin (solo textarea)
- Variaciones de producto (mencionado en título del spec pero fuera de alcance)
- Cambios al parser de markdown existente (es suficiente para el caso de uso)
- Internacionalización del nuevo campo `about`

## Decisions

### 1. Campo `about` como TEXT plano en DB (no JSONB)

El contenido es markdown que se parsea en render-time. No necesitamos consultar su estructura.

**Alternativa descartada**: JSONB para almacenar bloques — agrega complejidad sin beneficio, el markdown es más portable y editable.

### 2. Reusar `MarkdownContent` existente

El parser custom en `components/public/markdown-content.tsx` ya soporta headings, listas, bold y links. Es suficiente para el contenido de "About This Product".

**Alternativa descartada**: Instalar `react-markdown` + `remark` — agrega ~50KB al bundle para funcionalidad que ya existe.

### 3. Calendar inline (no popover) para date range

El diseño de Pencil muestra el calendario siempre visible dentro de la card de disponibilidad, no detrás de un popover/trigger. Usaremos `<Calendar mode="range" />` de shadcn directamente embebido.

**Alternativa descartada**: Popover con trigger de fecha — no coincide con el diseño y es peor UX para este caso de uso donde el calendario es el elemento principal.

### 4. Normalización de slug en server action (no solo client)

Aplicar `toSlug()` en `createProduct`/`updateProduct` antes de pasar al repo. Esto garantiza consistencia sin importar el origen del dato.

**Alternativa descartada**: Middleware de Drizzle / trigger SQL — más complejo y menos visible.

### 5. Contador de caracteres client-side con validación Zod server-side

El textarea de `description` mostrará `{count}/150` en tiempo real. Zod validará `.max(150)` en el server action como safety net.

## Risks / Trade-offs

- **[Migración DB]** Agregar columna nullable `about` es non-breaking. → Sin riesgo de downtime, `ALTER TABLE ADD COLUMN` con default NULL es instantáneo en PostgreSQL.
- **[react-day-picker bundle]** Agrega ~30KB al client bundle del availability checker. → Aceptable dado que es la única página que lo usa y mejora significativamente la UX.
- **[Markdown XSS]** El parser custom no sanitiza HTML embebido en markdown. → El contenido solo es editable por admins autenticados, riesgo bajo. El parser actual ignora HTML tags raw.
- **[Calendar locale]** `react-day-picker` usa locale del browser por defecto. → Aceptable para MVP, se puede configurar después si es necesario.
