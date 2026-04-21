---
paths:
  - "app/**"
  - "features/**"
  - "components/**"
  - "hooks/**"
  - "lib/**"
  - "types/**"
---

# Arquitectura Feature-Based — ecomerce (Next.js App Router)

## Estructura de directorios

El repo usa Feature-Based Architecture a nivel root (no hay `apps/web/src/`). El codigo se organiza por dominio de negocio:

```
/
├── app/           # Solo archivos de ruta: page.tsx, layout.tsx, loading.tsx, route.ts
│   ├── [locale]/  # Rutas publicas con i18n (next-intl)
│   ├── admin/     # Rutas admin (login + (dashboard))
│   └── api/       # Route handlers
├── features/      # Modulos de feature por dominio
├── components/    # Componentes UI compartidos
│   ├── admin/     # Compartidos entre rutas admin
│   ├── public/    # Compartidos entre rutas publicas ([locale])
│   ├── cart/      # Compartidos de carrito
│   └── ui/        # Design system (shadcn)
├── hooks/         # Hooks globales compartidos (use-cart, use-mobile, etc.)
├── lib/           # Utilidades core
│   ├── api/       # problemResponse y helpers HTTP
│   ├── config/    # settings, env, problem-response
│   ├── data/      # DAL compartido (usado por 3+ features)
│   ├── db/        # Drizzle client, schema
│   ├── i18n/      # Config de next-intl
│   ├── stores/    # Stores Zustand compartidos (cart-store)
│   ├── themes/    # Tokens/tema
│   ├── problems.ts       # Factories RFC 9457
│   └── utils.ts
└── types/         # Tipos globales
```

## Reglas de features

Cada feature puede contener alguno de estos archivos/carpetas (ninguno es obligatorio salvo `index.ts`):

```
features/<nombre>/
├── data.ts    o   data/       # DAL server-only (Drizzle). Lecturas tipadas.
├── actions.ts                 # Server Actions ("use server"). Mutaciones.
├── components/                # Componentes del feature (client y server)
├── hooks/                     # Hooks especificos del feature (si aplica)
├── catalog.ts / fallbacks.ts  # Datos estaticos o de fallback del dominio
└── index.ts                   # Barrel — OBLIGATORIO
```

No inventes subcarpetas nuevas si un archivo plano basta. Agrega `components/` cuando haya 2+ componentes, agrega `data/` cuando el DAL crezca mas alla de un archivo.

### Reglas de importacion

1. **`app/` importa desde features**: Paginas y route handlers importan usando `@/features/<nombre>`.
2. **`app/` puede componer varios features**: Una page puede usar data/actions/componentes de varios features — es la capa superior.
3. **Features importan desde shared**: `@/components/ui/`, `@/components/admin|cart|public/`, `@/lib/`, `@/hooks/`, `@/lib/data/`, `@/lib/stores/`.
4. **Features NO importan entre si**: Prohibido `@/features/<a>` desde `@/features/<b>`. Si dos features necesitan lo mismo, promueve a shared (ver regla del 3 abajo) o inyecta la dependencia desde la page (`app/`).
5. **Importar desde el barrel**: Siempre importa desde `@/features/<nombre>`. Evita deep imports (`@/features/<x>/components/<y>`), excepto en casos donde el barrel no re-exporta algo server-only (ver regla de server/client abajo).

```tsx
// CORRECTO
import { ProductForm, ProductTable, createProduct } from "@/features/admin-products";
import { findAllProducts, findCategoryBySlug } from "@/features/catalog";
import { getSessionUser } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { cartStore } from "@/lib/stores/cart-store";

// INCORRECTO — deep import
import { ProductForm } from "@/features/admin-products/components/product-form";
// INCORRECTO — feature-to-feature
// (dentro de features/admin-orders/...)
import { findAllProducts } from "@/features/catalog";
```

### Server vs Client (Next.js App Router)

Por restricciones de React Server Components / Turbopack, los barrels no deben re-exportar modulos marcados con `import 'server-only'` junto con componentes client. Dos patrones validos en el repo:

- **Barrel mixto con solo modulos compatibles** (caso comun aqui): `data.ts` y `actions.ts` son server-only pero se importan desde el barrel siempre que los consumidores sean Server Components o Server Actions. Un Client Component NO debe importar nada que arrastre server-only.
- **Barrel solo client-safe + deep import server-side**: Si el feature expone helpers client (stores, hooks, componentes client), re-exporta solo esos en `index.ts` y permite a las pages importar el DAL directo (`@/features/<x>/data`).

Regla practica:
- `"use server"` files (`actions.ts`) son server-only por definicion.
- Archivos con `import 'server-only'` (el DAL, ver `.claude/rules/data-access-layer.md`) jamas pueden ser importados desde un Client Component.
- Stores Zustand y hooks del browser van en `hooks/` del feature o en `@/lib/stores/`, nunca en `data.ts`.

### Data Access y Mutaciones

Este repo **no** usa la division `<feature>.service.ts` / `<feature>.client-service.ts`. Usa el patron nativo de Next.js:

1. **Lecturas server-side** — `features/<x>/data.ts` (o `data/` folder). Server-only, Drizzle directo. Sigue `.claude/rules/data-access-layer.md` (imports `server-only`, `getSessionUser`, validacion de permisos, columnas seguras).
2. **Mutaciones** — `features/<x>/actions.ts`. Todas las funciones abren con `"use server"`, validan con Zod, devuelven `ProblemDetail` en error (ver `.claude/rules/rfc9457-problem-details.md`) y llaman `revalidatePath` al final.
3. **Shared DAL** — `lib/data/` para funciones usadas por 3+ features (regla del 3). Cuando solo dos features lo usan, manten la funcion en el feature dueño y compon en la page.
4. **Route handlers** (`app/api/**`) — Envuelven el DAL o actions; devuelven `problemResponse(...)` en error.
5. **Nunca** hagas `fetch()` ni toques `db` directamente desde un componente o page: siempre pasa por `data.ts`, `actions.ts` o un route handler.

```tsx
// CORRECTO — page Server Component
import { findAllProducts } from "@/features/catalog";
const products = await findAllProducts();

// CORRECTO — client component dispara server action
"use client";
import { createProduct } from "@/features/admin-products";
await createProduct(prevState, formData);

// INCORRECTO — page hace fetch directo
const res = await fetch("/api/products");
// INCORRECTO — client component importa DAL server-only
"use client";
import { findAllProducts } from "@/features/catalog"; // arrastra server-only
```

### Reglas para `page.tsx` y `layout.tsx`

- Son **wrappers delgados**: data fetching + render de componentes de feature.
- Hacen las llamadas al DAL (`findAll...`) o a actions del feature, no `fetch` crudo ni `db` directo.
- Pueden componer datos de multiples features.
- No contienen logica de UI compleja ni formularios — eso va en `features/<x>/components/`.

### Cuando crear un nuevo feature

Crea un nuevo feature cuando:
1. Hay un dominio de negocio distinto con CRUD o workflow propio (`products`, `orders`, `auth`, `media`).
2. Hay 2+ componentes relacionados que comparten tipos o logica.
3. La funcionalidad es autocontenida y no pertenece a un feature existente.

Si el repo ya tiene el par `admin-<x>` + `<x-publico>` (ej. `admin-products` + `catalog`), manten esa separacion: el feature admin concentra acciones/formularios; el publico concentra lecturas read-only para [locale].

### Cuando usar shared (components/, lib/, hooks/)

- `components/ui/` — Design system (shadcn). Antes de crear uno nuevo, verifica con la skill `shadcn`.
- `components/admin/`, `components/public/`, `components/cart/` — Componentes usados por 2+ rutas dentro de la misma zona.
- `lib/` — Utilidades sin logica de dominio (`utils`, `db`, `api`, `i18n`, `themes`).
- `lib/data/` — DAL usado por 3+ features.
- `lib/stores/` — Stores Zustand compartidos (ej. `cart-store`).
- `hooks/` — Hooks genericos (`use-cart`, `use-mobile`, `use-form-action-toast`).

**Regla del 3:** Una funcion DAL, hook o componente se promueve a shared cuando lo usan 3+ features. Con 2 features, se queda en el feature dueño y la page compone. No prematurice.

### Barrel (`index.ts`)

- Exports **nombrados**, nunca `default`.
- Re-exporta solo la API publica: componentes consumibles, funciones DAL, actions, tipos publicos, constantes.
- No re-exportes utilidades internas del feature (helpers privados, schemas Zod, mapeadores).
- Si un simbolo server-only no se puede exponer via el barrel sin romper Client Components consumidores, el barrel queda client-safe y los consumidores server importan directo (`@/features/<x>/data`).

### Nombrado

- Archivos: `kebab-case` (`product-form.tsx`, `cart-item.tsx`, `availability-block-table.tsx`).
- Tipos: `PascalCase` (`Product`, `ProductFormState`).
- Funciones DAL: `findAll`, `findById`, `findBySlug`, `count`, etc. (consistente con los features actuales — ver `features/catalog/data/products.ts`).
- Actions: verbos (`createProduct`, `updateVariant`, `toggleProductActive`).
- Exports en `index.ts`: nombrados y agrupados por seccion con comentarios cortos cuando ayuda (`// Data`, `// Components`).
