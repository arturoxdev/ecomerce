# PRD — Sistema de Temas (Theme Switcher)

**Fecha:** 2026-04-10
**Estado:** Draft — pendiente de implementación
**Relacionado:** ADR-005 (Multi-tenant shared DB)

---

## 1. Objetivo

Permitir al dueño de una tienda (admin) seleccionar entre un conjunto curado de **5 temas visuales** que se apliquen tanto al **panel de administración** como al **storefront** público, sin necesidad de tocar código ni redesplegar.

## 2. Contexto y motivación

El proyecto usa **shadcn/ui** sobre **Tailwind v4**, y todos los componentes de UI se pintan a partir de CSS variables (`--primary`, `--background`, etc.). Esto hace trivial — con la configuración correcta — que un cambio de variables en runtime repinte toda la aplicación.

[tweakcn.com/editor](https://tweakcn.com/editor) es un editor visual de temas para shadcn que exporta bloques `:root { ... }` con ~45 variables oklch. Curaremos 5 exportes de tweakcn y los ofreceremos al admin como presets seleccionables.

## 3. Alcance

### In-scope (v1)
- 5 presets de tema hardcodeados en el código (curados por el equipo).
- Light mode únicamente.
- Aplicación simultánea a admin panel y storefront (mismo `theme_id` por store).
- Persistencia en la tabla `settings` existente (nueva columna `theme_id`).
- Server-side rendering del tema (sin FOUC, sin JS en cliente).
- Pantalla de selección en el panel admin (`Settings → Appearance`).
- Preview visual de cada tema (swatches) antes de seleccionar.
- Unificación del stack tipográfico a **Poppins / Georgia / Fira Code**.

### Out-of-scope (v1, considerar para v1.1+)
- Dark mode por tema.
- Preview en vivo antes de guardar (aplicar sin persistir).
- Temas custom pegados por el admin desde tweakcn.
- Fuentes variables por tema.
- Temas independientes para admin vs storefront.
- Theme override por producto / categoría / landing.

## 4. Usuarios

| Rol | Interacción |
|---|---|
| **Dueño de la tienda (admin)** | Entra a `Admin → Settings → Appearance`, elige un tema, guarda. Ve el cambio aplicado al admin inmediatamente y al storefront público en la siguiente visita. |
| **Shopper final** | No interactúa con el sistema de temas. Ve siempre el tema elegido por el dueño. |
| **Desarrollador** | Agrega o modifica presets editando `lib/themes/presets/*.ts`. |

## 5. Requisitos funcionales

- **RF-1**: El sistema DEBE exponer exactamente 5 presets de tema en la UI.
- **RF-2**: El admin DEBE poder seleccionar uno y persistirlo en DB.
- **RF-3**: El tema seleccionado DEBE aplicarse al panel admin y al storefront del mismo store.
- **RF-4**: El tema DEBE renderizarse server-side sin flash ni repaint.
- **RF-5**: Si no hay tema persistido, DEBE aplicarse el preset `default`.
- **RF-6**: El server action DEBE validar que el `theme_id` recibido exista en el registry (rechazar strings arbitrarios).
- **RF-7**: El admin DEBE ver un preview visual (swatches de colores principales) de cada preset antes de elegir.
- **RF-8**: El cambio DEBE invalidar el cache de las rutas afectadas (`revalidatePath`).

## 6. Requisitos no funcionales

- **RNF-1**: Cero FOUC — el tema se inyecta en el HTML antes de que pinte el navegador.
- **RNF-2**: Cero JavaScript en cliente para aplicar el tema (solo CSS vars + SSR).
- **RNF-3**: Agregar un 6° preset debe ser solo crear un archivo en `lib/themes/presets/` y registrarlo — sin cambios en layout, DAL ni UI.
- **RNF-4**: Errores del server action siguen **RFC 9457** (factories de `lib/problems.ts`).
- **RNF-5**: Aislamiento multi-tenant — el tema es por `store_id`, nunca se lee de otra tienda (respeta patrón de ADR-005).

## 7. Decisiones técnicas

### 7.1 Dónde vive el tema
- **5 presets hardcodeados** en `lib/themes/presets/*.ts`, uno por archivo.
- **Registry** en `lib/themes/index.ts` que exporta el array de presets y un lookup `getThemeById(id)`.
- Cada preset = objeto TS tipado con las vars oklch del bloque `:root` de tweakcn.

### 7.2 Persistencia
- **Reusar la tabla `settings` existente** (no crear `store_settings`).
- Nueva columna: `theme_id TEXT NOT NULL DEFAULT 'default'`.
- Repositorio `lib/data/settings.ts` gana helpers `getThemeId()` y `setThemeId(id)`.

### 7.3 Aplicación en runtime — Tailwind v4 `@theme inline`
Tailwind v4 con `@theme { ... }` (sin `inline`) **hardcodea** los valores en build time, lo que impide overrides en runtime. tweakcn usa `@theme inline { --color-primary: var(--primary); }` para que las utilidades lean el valor desde `var()` en runtime.

**Acción requerida (Paso 0)**: migrar `app/globals.css` al patrón `@theme inline`, de modo que las utilidades `bg-primary`, `text-foreground`, etc. reaccionen a los overrides de `:root` inyectados por el layout.

### 7.4 Inyección en el layout
En cada layout relevante (admin y storefront):
1. Llamar `getThemeId()` desde la DAL.
2. Buscar el preset en el registry (fallback a `default` si falta).
3. Renderizar `<style>{`:root{${serializeVars(preset.vars)}}`}</style>` en el head.
4. El `:root` base de `globals.css` actúa como fallback; el `<style>` inyectado gana por orden de cascada.

### 7.5 Fonts (congeladas)
El stack tipográfico se **unifica** para todos los temas (los presets NO modifican `--font-*`):

| Variable | Font | Uso |
|---|---|---|
| `--font-sans` | **Poppins** | Default, cuerpo, UI |
| `--font-serif` | **Georgia** | Tipografía editorial / acentos |
| `--font-mono` | **Fira Code** | Código, números tabulares |

Poppins y Fira Code se cargan vía `next/font/google` (self-hosted, óptimo para LCP). Georgia es font del sistema (no requiere carga). Esto reemplaza la actual "Plus Jakarta Sans" del proyecto.

### 7.6 UI del selector
Ruta: `app/admin/settings/appearance/page.tsx` (nueva sección, no existe aún).

- Grid responsive de 5 `Card`s de shadcn.
- Cada card muestra: nombre del tema, 4–5 swatches de preview (primary, background, accent, muted, destructive) leídos del propio preset, radio/checkmark indicando el seleccionado.
- Botón "Guardar" que dispara server action.
- Server action: valida `theme_id` contra registry, hace `settings.upsert({ themeId })`, `revalidatePath("/admin")` y `revalidatePath("/")`. En error retorna `ProblemDetail` via `lib/problems.ts`.

## 8. Schema — cambios DB

```sql
ALTER TABLE settings ADD COLUMN theme_id TEXT NOT NULL DEFAULT 'default';
```

Drizzle schema: agregar `themeId: text("theme_id").notNull().default("default")` en la definición de `settings` en `lib/db/schema.ts`.

**El usuario ejecuta las migraciones** (no el asistente):
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## 9. Estructura de archivos

```
lib/themes/
  index.ts              # registry + getThemeById + types
  types.ts              # Theme, ThemeVars
  serialize.ts          # serializeVars(vars) → "—primary: oklch(...); —..."
  presets/
    default.ts          # tema actual del proyecto, extraído de globals.css
    blue.ts             # preset curado #1
    emerald.ts          # preset curado #2
    rose.ts             # preset curado #3
    slate.ts            # preset curado #4

lib/data/settings.ts    # + getThemeId(), setThemeId()

app/
  globals.css           # REFACTORIZADO con @theme inline
  admin/
    settings/
      appearance/
        page.tsx        # nueva página de selección
        theme-grid.tsx  # client component con la grilla
        actions.ts      # server action updateTheme

app/admin/layout.tsx    # inyecta <style> con tema
app/(storefront)/layout.tsx  # inyecta <style> con tema (ajustar a la ruta real)

prd/themes.md           # este documento
```

## 10. Plan de implementación

| # | Paso | Owner | Output |
|---|---|---|---|
| 0 | Refactor `globals.css` a `@theme inline` + cambio de fuentes a Poppins/Georgia/Fira Code | Dev | PR aislado, verificar que nada visual se rompe |
| 1 | Crear `lib/themes/` con types, serialize y preset `default` extraído del `:root` actual | Dev | Un preset funcional en el registry |
| 2 | Agregar columna `theme_id` al schema Drizzle + generar migración | Dev + User (migra) | Migración aplicada |
| 3 | Extender `lib/data/settings.ts` con `getThemeId`/`setThemeId` | Dev | DAL lista |
| 4 | Inyectar `<style>` en layout del admin → verificar visualmente | Dev | Admin cambia de tema |
| 5 | Inyectar en layout del storefront → verificar visualmente | Dev | Storefront cambia de tema |
| 6 | Crear página `admin/settings/appearance` + server action con validación + RFC 9457 | Dev | Selector funcional |
| 7 | Pegar los 4 presets restantes desde tweakcn | Dev | 5 temas en producción |
| 8 | QA visual: navegar admin y storefront con cada tema | Dev | Checklist de regresiones |

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migrar `@theme` → `@theme inline` rompe estilos existentes | Paso 0 aislado en su propio PR, revisión visual antes de merge |
| Cambio de fuente (Plus Jakarta Sans → Poppins) altera el look actual | Cambio consciente y deseado; validar con stakeholder antes de merge |
| Preset con contraste insuficiente (accesibilidad) | Curar presets verificando WCAG AA en tweakcn antes de copiar |
| Admin selecciona un tema que rompe un componente específico | QA visual por componente crítico (productos, checkout, admin forms) |
| Cache de Next.js muestra tema viejo tras cambio | `revalidatePath` en el server action al guardar |
| Inyección de CSS via `theme_id` arbitrario (XSS) | Validación estricta: solo ids del registry, nunca strings libres en `<style>` |

## 12. Criterios de aceptación

- [ ] Paso 0 mergeado: `globals.css` usa `@theme inline`, Poppins cargada, sin regresiones visuales.
- [ ] Tabla `settings` tiene columna `theme_id` con default `'default'`.
- [ ] `lib/themes/` contiene 5 presets válidos y tipados.
- [ ] Entrar a `/admin/settings/appearance` muestra los 5 temas con swatches.
- [ ] Seleccionar un tema y guardar persiste el cambio en DB.
- [ ] Al recargar el admin, el tema seleccionado sigue aplicado.
- [ ] Al visitar el storefront, el mismo tema está aplicado.
- [ ] No hay flash de colores viejos en la carga inicial (FOUC check).
- [ ] Cambiar tema repetidamente no requiere reinicio del servidor.
- [ ] Server action rechaza `theme_id` no registrados con `ProblemDetail`.

## 13. Preguntas abiertas / futuro

1. **Dark mode**: diferido a v1.1. Cada preset tendría un segundo objeto `.dark`.
2. **Preview en vivo**: aplicar tema al `<html>` temporalmente antes de guardar — mejora UX pero suma complejidad client-side.
3. **Temas custom**: permitir al admin pegar un export de tweakcn. Requiere sanitización cuidadosa del CSS (riesgo XSS).
4. **Telemetría**: ¿trackear qué tema elige cada tienda para entender preferencias?
5. **Semillas por tienda**: ¿asignar un tema por defecto diferente según vertical (ej. tienda de ropa vs evento)?




## temas a configurar


### default

```
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: rgb(255, 255, 255);
  --foreground: rgb(10, 10, 10);
  --card: rgb(255, 255, 255);
  --card-foreground: rgb(10, 10, 10);
  --popover: rgb(255, 255, 255);
  --popover-foreground: rgb(10, 10, 10);
  --primary: rgb(23, 23, 23);
  --primary-foreground: rgb(250, 250, 250);
  --secondary: rgb(245, 245, 245);
  --secondary-foreground: rgb(23, 23, 23);
  --muted: rgb(245, 245, 245);
  --muted-foreground: rgb(115, 115, 115);
  --accent: rgb(245, 245, 245);
  --accent-foreground: rgb(23, 23, 23);
  --destructive: rgb(231, 0, 11);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(229, 229, 229);
  --input: rgb(229, 229, 229);
  --ring: rgb(161, 161, 161);
  --chart-1: rgb(145, 197, 255);
  --chart-2: rgb(58, 129, 246);
  --chart-3: rgb(37, 99, 239);
  --chart-4: rgb(26, 78, 218);
  --chart-5: rgb(31, 63, 173);
  --sidebar: rgb(250, 250, 250);
  --sidebar-foreground: rgb(10, 10, 10);
  --sidebar-primary: rgb(23, 23, 23);
  --sidebar-primary-foreground: rgb(250, 250, 250);
  --sidebar-accent: rgb(245, 245, 245);
  --sidebar-accent-foreground: rgb(23, 23, 23);
  --sidebar-border: rgb(229, 229, 229);
  --sidebar-ring: rgb(161, 161, 161);
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius: 0.625rem;
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: oklch(0 0 0);
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: rgb(10, 10, 10);
  --foreground: rgb(250, 250, 250);
  --card: rgb(23, 23, 23);
  --card-foreground: rgb(250, 250, 250);
  --popover: rgb(38, 38, 38);
  --popover-foreground: rgb(250, 250, 250);
  --primary: rgb(229, 229, 229);
  --primary-foreground: rgb(23, 23, 23);
  --secondary: rgb(38, 38, 38);
  --secondary-foreground: rgb(250, 250, 250);
  --muted: rgb(38, 38, 38);
  --muted-foreground: rgb(161, 161, 161);
  --accent: rgb(64, 64, 64);
  --accent-foreground: rgb(250, 250, 250);
  --destructive: rgb(255, 100, 103);
  --destructive-foreground: rgb(250, 250, 250);
  --border: rgb(40, 40, 40);
  --input: rgb(52, 52, 52);
  --ring: rgb(115, 115, 115);
  --chart-1: rgb(145, 197, 255);
  --chart-2: rgb(58, 129, 246);
  --chart-3: rgb(37, 99, 239);
  --chart-4: rgb(26, 78, 218);
  --chart-5: rgb(31, 63, 173);
  --sidebar: rgb(23, 23, 23);
  --sidebar-foreground: rgb(250, 250, 250);
  --sidebar-primary: rgb(20, 71, 230);
  --sidebar-primary-foreground: rgb(250, 250, 250);
  --sidebar-accent: rgb(38, 38, 38);
  --sidebar-accent-foreground: rgb(250, 250, 250);
  --sidebar-border: rgb(40, 40, 40);
  --sidebar-ring: rgb(82, 82, 82);
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius: 0.625rem;
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: oklch(0 0 0);
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```


## vercel


```
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: rgb(252, 252, 252);
  --foreground: rgb(0, 0, 0);
  --card: rgb(255, 255, 255);
  --card-foreground: rgb(0, 0, 0);
  --popover: rgb(252, 252, 252);
  --popover-foreground: rgb(0, 0, 0);
  --primary: rgb(0, 0, 0);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(235, 235, 235);
  --secondary-foreground: rgb(0, 0, 0);
  --muted: rgb(245, 245, 245);
  --muted-foreground: rgb(82, 82, 82);
  --accent: rgb(235, 235, 235);
  --accent-foreground: rgb(0, 0, 0);
  --destructive: rgb(229, 75, 79);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(228, 228, 228);
  --input: rgb(235, 235, 235);
  --ring: rgb(0, 0, 0);
  --chart-1: rgb(255, 174, 4);
  --chart-2: rgb(45, 98, 239);
  --chart-3: rgb(164, 164, 164);
  --chart-4: rgb(228, 228, 228);
  --chart-5: rgb(116, 116, 116);
  --sidebar: rgb(252, 252, 252);
  --sidebar-foreground: rgb(0, 0, 0);
  --sidebar-primary: rgb(0, 0, 0);
  --sidebar-primary-foreground: rgb(255, 255, 255);
  --sidebar-accent: rgb(235, 235, 235);
  --sidebar-accent-foreground: rgb(0, 0, 0);
  --sidebar-border: rgb(235, 235, 235);
  --sidebar-ring: rgb(0, 0, 0);
  --font-sans: Geist, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Geist Mono, monospace;
  --radius: 0.5rem;
  --shadow-x: 0px;
  --shadow-y: 1px;
  --shadow-blur: 2px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.18;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0px 1px 2px 0px hsl(0 0% 0% / 0.09);
  --shadow-xs: 0px 1px 2px 0px hsl(0 0% 0% / 0.09);
  --shadow-sm: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 1px 2px -1px hsl(0 0% 0% / 0.18);
  --shadow: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 1px 2px -1px hsl(0 0% 0% / 0.18);
  --shadow-md: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 2px 4px -1px hsl(0 0% 0% / 0.18);
  --shadow-lg: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 4px 6px -1px hsl(0 0% 0% / 0.18);
  --shadow-xl: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 8px 10px -1px hsl(0 0% 0% / 0.18);
  --shadow-2xl: 0px 1px 2px 0px hsl(0 0% 0% / 0.45);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: rgb(0, 0, 0);
  --foreground: rgb(255, 255, 255);
  --card: rgb(9, 9, 9);
  --card-foreground: rgb(255, 255, 255);
  --popover: rgb(18, 18, 18);
  --popover-foreground: rgb(255, 255, 255);
  --primary: rgb(255, 255, 255);
  --primary-foreground: rgb(0, 0, 0);
  --secondary: rgb(34, 34, 34);
  --secondary-foreground: rgb(255, 255, 255);
  --muted: rgb(29, 29, 29);
  --muted-foreground: rgb(164, 164, 164);
  --accent: rgb(51, 51, 51);
  --accent-foreground: rgb(255, 255, 255);
  --destructive: rgb(255, 91, 91);
  --destructive-foreground: rgb(0, 0, 0);
  --border: rgb(36, 36, 36);
  --input: rgb(51, 51, 51);
  --ring: rgb(164, 164, 164);
  --chart-1: rgb(255, 174, 4);
  --chart-2: rgb(38, 113, 244);
  --chart-3: rgb(116, 116, 116);
  --chart-4: rgb(82, 82, 82);
  --chart-5: rgb(228, 228, 228);
  --sidebar: rgb(18, 18, 18);
  --sidebar-foreground: rgb(255, 255, 255);
  --sidebar-primary: rgb(255, 255, 255);
  --sidebar-primary-foreground: rgb(0, 0, 0);
  --sidebar-accent: rgb(51, 51, 51);
  --sidebar-accent-foreground: rgb(255, 255, 255);
  --sidebar-border: rgb(51, 51, 51);
  --sidebar-ring: rgb(164, 164, 164);
  --font-sans: Geist, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Geist Mono, monospace;
  --radius: 0.5rem;
  --shadow-x: 0px;
  --shadow-y: 1px;
  --shadow-blur: 2px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.18;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0px 1px 2px 0px hsl(0 0% 0% / 0.09);
  --shadow-xs: 0px 1px 2px 0px hsl(0 0% 0% / 0.09);
  --shadow-sm: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 1px 2px -1px hsl(0 0% 0% / 0.18);
  --shadow: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 1px 2px -1px hsl(0 0% 0% / 0.18);
  --shadow-md: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 2px 4px -1px hsl(0 0% 0% / 0.18);
  --shadow-lg: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 4px 6px -1px hsl(0 0% 0% / 0.18);
  --shadow-xl: 0px 1px 2px 0px hsl(0 0% 0% / 0.18), 0px 8px 10px -1px hsl(0 0% 0% / 0.18);
  --shadow-2xl: 0px 1px 2px 0px hsl(0 0% 0% / 0.45);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## twitter

```
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: rgb(255, 255, 255);
  --foreground: rgb(15, 20, 25);
  --card: rgb(247, 248, 248);
  --card-foreground: rgb(15, 20, 25);
  --popover: rgb(255, 255, 255);
  --popover-foreground: rgb(15, 20, 25);
  --primary: rgb(30, 157, 241);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(15, 20, 25);
  --secondary-foreground: rgb(255, 255, 255);
  --muted: rgb(229, 229, 230);
  --muted-foreground: rgb(15, 20, 25);
  --accent: rgb(227, 236, 246);
  --accent-foreground: rgb(30, 157, 241);
  --destructive: rgb(244, 33, 46);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(225, 234, 239);
  --input: rgb(247, 249, 250);
  --ring: rgb(29, 161, 242);
  --chart-1: rgb(30, 157, 241);
  --chart-2: rgb(0, 184, 122);
  --chart-3: rgb(247, 185, 40);
  --chart-4: rgb(23, 191, 99);
  --chart-5: rgb(224, 36, 94);
  --sidebar: rgb(247, 248, 248);
  --sidebar-foreground: rgb(15, 20, 25);
  --sidebar-primary: rgb(30, 157, 241);
  --sidebar-primary-foreground: rgb(255, 255, 255);
  --sidebar-accent: rgb(227, 236, 246);
  --sidebar-accent-foreground: rgb(30, 157, 241);
  --sidebar-border: rgb(225, 232, 237);
  --sidebar-ring: rgb(29, 161, 242);
  --font-sans: Open Sans, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;
  --radius: 1.3rem;
  --shadow-x: 0px;
  --shadow-y: 2px;
  --shadow-blur: 0px;
  --shadow-spread: 0px;
  --shadow-opacity: 0;
  --shadow-color: rgba(29,161,242,0.15);
  --shadow-2xs: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-xs: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-sm: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 1px 2px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 1px 2px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-md: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 2px 4px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-lg: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 4px 6px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-xl: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 8px 10px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-2xl: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: rgb(0, 0, 0);
  --foreground: rgb(231, 233, 234);
  --card: rgb(23, 24, 28);
  --card-foreground: rgb(217, 217, 217);
  --popover: rgb(0, 0, 0);
  --popover-foreground: rgb(231, 233, 234);
  --primary: rgb(28, 156, 240);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(240, 243, 244);
  --secondary-foreground: rgb(15, 20, 25);
  --muted: rgb(24, 24, 24);
  --muted-foreground: rgb(114, 118, 122);
  --accent: rgb(6, 22, 34);
  --accent-foreground: rgb(28, 156, 240);
  --destructive: rgb(244, 33, 46);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(36, 38, 40);
  --input: rgb(34, 48, 60);
  --ring: rgb(29, 161, 242);
  --chart-1: rgb(30, 157, 241);
  --chart-2: rgb(0, 184, 122);
  --chart-3: rgb(247, 185, 40);
  --chart-4: rgb(23, 191, 99);
  --chart-5: rgb(224, 36, 94);
  --sidebar: rgb(23, 24, 28);
  --sidebar-foreground: rgb(217, 217, 217);
  --sidebar-primary: rgb(29, 161, 242);
  --sidebar-primary-foreground: rgb(255, 255, 255);
  --sidebar-accent: rgb(6, 22, 34);
  --sidebar-accent-foreground: rgb(28, 156, 240);
  --sidebar-border: rgb(56, 68, 77);
  --sidebar-ring: rgb(29, 161, 242);
  --font-sans: Open Sans, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;
  --radius: 1.3rem;
  --shadow-x: 0px;
  --shadow-y: 2px;
  --shadow-blur: 0px;
  --shadow-spread: 0px;
  --shadow-opacity: 0;
  --shadow-color: rgba(29,161,242,0.25);
  --shadow-2xs: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-xs: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-sm: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 1px 2px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 1px 2px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-md: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 2px 4px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-lg: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 4px 6px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-xl: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 8px 10px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
  --shadow-2xl: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```


## sunset 


```
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: rgb(255, 249, 245);
  --foreground: rgb(61, 52, 54);
  --card: rgb(255, 255, 255);
  --card-foreground: rgb(61, 52, 54);
  --popover: rgb(255, 255, 255);
  --popover-foreground: rgb(61, 52, 54);
  --primary: rgb(255, 126, 95);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(255, 237, 234);
  --secondary-foreground: rgb(179, 83, 64);
  --muted: rgb(255, 240, 235);
  --muted-foreground: rgb(120, 113, 108);
  --accent: rgb(254, 180, 123);
  --accent-foreground: rgb(61, 52, 54);
  --destructive: rgb(230, 57, 70);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(255, 224, 214);
  --input: rgb(255, 224, 214);
  --ring: rgb(255, 126, 95);
  --chart-1: rgb(255, 126, 95);
  --chart-2: rgb(254, 180, 123);
  --chart-3: rgb(255, 202, 167);
  --chart-4: rgb(255, 173, 143);
  --chart-5: rgb(206, 106, 87);
  --sidebar: rgb(255, 240, 235);
  --sidebar-foreground: rgb(61, 52, 54);
  --sidebar-primary: rgb(255, 126, 95);
  --sidebar-primary-foreground: rgb(255, 255, 255);
  --sidebar-accent: rgb(254, 180, 123);
  --sidebar-accent-foreground: rgb(61, 52, 54);
  --sidebar-border: rgb(255, 224, 214);
  --sidebar-ring: rgb(255, 126, 95);
  --font-sans: Montserrat, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: Ubuntu Mono, monospace;
  --radius: 0.625rem;
  --shadow-x: 0px;
  --shadow-y: 6px;
  --shadow-blur: 12px;
  --shadow-spread: -3px;
  --shadow-opacity: 0.09;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0px 6px 12px -3px hsl(0 0% 0% / 0.04);
  --shadow-xs: 0px 6px 12px -3px hsl(0 0% 0% / 0.04);
  --shadow-sm: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 1px 2px -4px hsl(0 0% 0% / 0.09);
  --shadow: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 1px 2px -4px hsl(0 0% 0% / 0.09);
  --shadow-md: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 2px 4px -4px hsl(0 0% 0% / 0.09);
  --shadow-lg: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 4px 6px -4px hsl(0 0% 0% / 0.09);
  --shadow-xl: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 8px 10px -4px hsl(0 0% 0% / 0.09);
  --shadow-2xl: 0px 6px 12px -3px hsl(0 0% 0% / 0.22);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: rgb(42, 32, 36);
  --foreground: rgb(242, 233, 228);
  --card: rgb(57, 47, 53);
  --card-foreground: rgb(242, 233, 228);
  --popover: rgb(57, 47, 53);
  --popover-foreground: rgb(242, 233, 228);
  --primary: rgb(255, 126, 95);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(70, 58, 65);
  --secondary-foreground: rgb(242, 233, 228);
  --muted: rgb(48, 39, 44);
  --muted-foreground: rgb(215, 198, 188);
  --accent: rgb(254, 180, 123);
  --accent-foreground: rgb(42, 32, 36);
  --destructive: rgb(230, 57, 70);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(70, 58, 65);
  --input: rgb(70, 58, 65);
  --ring: rgb(255, 126, 95);
  --chart-1: rgb(255, 126, 95);
  --chart-2: rgb(254, 180, 123);
  --chart-3: rgb(255, 202, 167);
  --chart-4: rgb(255, 173, 143);
  --chart-5: rgb(206, 106, 87);
  --sidebar: rgb(42, 32, 36);
  --sidebar-foreground: rgb(242, 233, 228);
  --sidebar-primary: rgb(255, 126, 95);
  --sidebar-primary-foreground: rgb(255, 255, 255);
  --sidebar-accent: rgb(254, 180, 123);
  --sidebar-accent-foreground: rgb(42, 32, 36);
  --sidebar-border: rgb(70, 58, 65);
  --sidebar-ring: rgb(255, 126, 95);
  --font-sans: Montserrat, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: Ubuntu Mono, monospace;
  --radius: 0.625rem;
  --shadow-x: 0px;
  --shadow-y: 6px;
  --shadow-blur: 12px;
  --shadow-spread: -3px;
  --shadow-opacity: 0.09;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0px 6px 12px -3px hsl(0 0% 0% / 0.04);
  --shadow-xs: 0px 6px 12px -3px hsl(0 0% 0% / 0.04);
  --shadow-sm: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 1px 2px -4px hsl(0 0% 0% / 0.09);
  --shadow: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 1px 2px -4px hsl(0 0% 0% / 0.09);
  --shadow-md: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 2px 4px -4px hsl(0 0% 0% / 0.09);
  --shadow-lg: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 4px 6px -4px hsl(0 0% 0% / 0.09);
  --shadow-xl: 0px 6px 12px -3px hsl(0 0% 0% / 0.09), 0px 8px 10px -4px hsl(0 0% 0% / 0.09);
  --shadow-2xl: 0px 6px 12px -3px hsl(0 0% 0% / 0.22);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## cosmic night

```
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: rgb(245, 245, 255);
  --foreground: rgb(42, 42, 74);
  --card: rgb(255, 255, 255);
  --card-foreground: rgb(42, 42, 74);
  --popover: rgb(255, 255, 255);
  --popover-foreground: rgb(42, 42, 74);
  --primary: rgb(110, 86, 207);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(228, 223, 255);
  --secondary-foreground: rgb(74, 64, 128);
  --muted: rgb(240, 240, 250);
  --muted-foreground: rgb(108, 108, 138);
  --accent: rgb(216, 230, 255);
  --accent-foreground: rgb(42, 42, 74);
  --destructive: rgb(255, 84, 112);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(224, 224, 240);
  --input: rgb(224, 224, 240);
  --ring: rgb(110, 86, 207);
  --chart-1: rgb(110, 86, 207);
  --chart-2: rgb(158, 140, 252);
  --chart-3: rgb(93, 95, 239);
  --chart-4: rgb(124, 117, 250);
  --chart-5: rgb(71, 64, 179);
  --sidebar: rgb(240, 240, 250);
  --sidebar-foreground: rgb(42, 42, 74);
  --sidebar-primary: rgb(110, 86, 207);
  --sidebar-primary-foreground: rgb(255, 255, 255);
  --sidebar-accent: rgb(216, 230, 255);
  --sidebar-accent-foreground: rgb(42, 42, 74);
  --sidebar-border: rgb(224, 224, 240);
  --sidebar-ring: rgb(110, 86, 207);
  --font-sans: Inter, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: JetBrains Mono, monospace;
  --radius: 0.5rem;
  --shadow-x: 0px;
  --shadow-y: 4px;
  --shadow-blur: 10px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.12;
  --shadow-color: hsl(240 30% 25%);
  --shadow-2xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-sm: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow-md: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 2px 4px -1px hsl(240 30% 25% / 0.12);
  --shadow-lg: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 4px 6px -1px hsl(240 30% 25% / 0.12);
  --shadow-xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 8px 10px -1px hsl(240 30% 25% / 0.12);
  --shadow-2xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.30);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: rgb(15, 15, 26);
  --foreground: rgb(226, 226, 245);
  --card: rgb(26, 26, 46);
  --card-foreground: rgb(226, 226, 245);
  --popover: rgb(26, 26, 46);
  --popover-foreground: rgb(226, 226, 245);
  --primary: rgb(164, 143, 255);
  --primary-foreground: rgb(15, 15, 26);
  --secondary: rgb(45, 43, 85);
  --secondary-foreground: rgb(196, 194, 255);
  --muted: rgb(34, 34, 68);
  --muted-foreground: rgb(160, 160, 192);
  --accent: rgb(48, 48, 96);
  --accent-foreground: rgb(226, 226, 245);
  --destructive: rgb(255, 84, 112);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(48, 48, 82);
  --input: rgb(48, 48, 82);
  --ring: rgb(164, 143, 255);
  --chart-1: rgb(164, 143, 255);
  --chart-2: rgb(121, 134, 203);
  --chart-3: rgb(100, 181, 246);
  --chart-4: rgb(77, 182, 172);
  --chart-5: rgb(255, 121, 198);
  --sidebar: rgb(26, 26, 46);
  --sidebar-foreground: rgb(226, 226, 245);
  --sidebar-primary: rgb(164, 143, 255);
  --sidebar-primary-foreground: rgb(15, 15, 26);
  --sidebar-accent: rgb(48, 48, 96);
  --sidebar-accent-foreground: rgb(226, 226, 245);
  --sidebar-border: rgb(48, 48, 82);
  --sidebar-ring: rgb(164, 143, 255);
  --font-sans: Inter, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: JetBrains Mono, monospace;
  --radius: 0.5rem;
  --shadow-x: 0px;
  --shadow-y: 4px;
  --shadow-blur: 10px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.12;
  --shadow-color: hsl(240 30% 25%);
  --shadow-2xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-sm: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow-md: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 2px 4px -1px hsl(240 30% 25% / 0.12);
  --shadow-lg: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 4px 6px -1px hsl(240 30% 25% / 0.12);
  --shadow-xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 8px 10px -1px hsl(240 30% 25% / 0.12);
  --shadow-2xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.30);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### nice sunset


```
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: rgb(245, 245, 255);
  --foreground: rgb(42, 42, 74);
  --card: rgb(255, 255, 255);
  --card-foreground: rgb(42, 42, 74);
  --popover: rgb(255, 255, 255);
  --popover-foreground: rgb(42, 42, 74);
  --primary: rgb(110, 86, 207);
  --primary-foreground: rgb(255, 255, 255);
  --secondary: rgb(228, 223, 255);
  --secondary-foreground: rgb(74, 64, 128);
  --muted: rgb(240, 240, 250);
  --muted-foreground: rgb(108, 108, 138);
  --accent: rgb(216, 230, 255);
  --accent-foreground: rgb(42, 42, 74);
  --destructive: rgb(255, 84, 112);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(224, 224, 240);
  --input: rgb(224, 224, 240);
  --ring: rgb(110, 86, 207);
  --chart-1: rgb(110, 86, 207);
  --chart-2: rgb(158, 140, 252);
  --chart-3: rgb(93, 95, 239);
  --chart-4: rgb(124, 117, 250);
  --chart-5: rgb(71, 64, 179);
  --sidebar: rgb(240, 240, 250);
  --sidebar-foreground: rgb(42, 42, 74);
  --sidebar-primary: rgb(110, 86, 207);
  --sidebar-primary-foreground: rgb(255, 255, 255);
  --sidebar-accent: rgb(216, 230, 255);
  --sidebar-accent-foreground: rgb(42, 42, 74);
  --sidebar-border: rgb(224, 224, 240);
  --sidebar-ring: rgb(110, 86, 207);
  --font-sans: Inter, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: JetBrains Mono, monospace;
  --radius: 0.5rem;
  --shadow-x: 0px;
  --shadow-y: 4px;
  --shadow-blur: 10px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.12;
  --shadow-color: hsl(240 30% 25%);
  --shadow-2xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-sm: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow-md: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 2px 4px -1px hsl(240 30% 25% / 0.12);
  --shadow-lg: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 4px 6px -1px hsl(240 30% 25% / 0.12);
  --shadow-xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 8px 10px -1px hsl(240 30% 25% / 0.12);
  --shadow-2xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.30);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: rgb(15, 15, 26);
  --foreground: rgb(226, 226, 245);
  --card: rgb(26, 26, 46);
  --card-foreground: rgb(226, 226, 245);
  --popover: rgb(26, 26, 46);
  --popover-foreground: rgb(226, 226, 245);
  --primary: rgb(164, 143, 255);
  --primary-foreground: rgb(15, 15, 26);
  --secondary: rgb(45, 43, 85);
  --secondary-foreground: rgb(196, 194, 255);
  --muted: rgb(34, 34, 68);
  --muted-foreground: rgb(160, 160, 192);
  --accent: rgb(48, 48, 96);
  --accent-foreground: rgb(226, 226, 245);
  --destructive: rgb(255, 84, 112);
  --destructive-foreground: rgb(255, 255, 255);
  --border: rgb(48, 48, 82);
  --input: rgb(48, 48, 82);
  --ring: rgb(164, 143, 255);
  --chart-1: rgb(164, 143, 255);
  --chart-2: rgb(121, 134, 203);
  --chart-3: rgb(100, 181, 246);
  --chart-4: rgb(77, 182, 172);
  --chart-5: rgb(255, 121, 198);
  --sidebar: rgb(26, 26, 46);
  --sidebar-foreground: rgb(226, 226, 245);
  --sidebar-primary: rgb(164, 143, 255);
  --sidebar-primary-foreground: rgb(15, 15, 26);
  --sidebar-accent: rgb(48, 48, 96);
  --sidebar-accent-foreground: rgb(226, 226, 245);
  --sidebar-border: rgb(48, 48, 82);
  --sidebar-ring: rgb(164, 143, 255);
  --font-sans: Inter, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: JetBrains Mono, monospace;
  --radius: 0.5rem;
  --shadow-x: 0px;
  --shadow-y: 4px;
  --shadow-blur: 10px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.12;
  --shadow-color: hsl(240 30% 25%);
  --shadow-2xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-xs: 0px 4px 10px 0px hsl(240 30% 25% / 0.06);
  --shadow-sm: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow-md: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 2px 4px -1px hsl(240 30% 25% / 0.12);
  --shadow-lg: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 4px 6px -1px hsl(240 30% 25% / 0.12);
  --shadow-xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 8px 10px -1px hsl(240 30% 25% / 0.12);
  --shadow-2xl: 0px 4px 10px 0px hsl(240 30% 25% / 0.30);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```
