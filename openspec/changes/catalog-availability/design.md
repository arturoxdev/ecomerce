# Design: Catalog & Real-Time Availability (SPEC-03)

**Change name:** catalog-availability
**Linear issue:** CON-71
**Project:** Festejos Aurora
**Status:** Draft
**Date:** 2026-03-12

---

## Technical Approach

Build the public catalog and availability checking layer as a set of Server Components for data-fetching pages and isolated Client Component "islands" for interactivity only. All catalog data is fetched server-side via Prisma; category filtering is URL-driven (`?category=slug`) so pages are SSR-crawlable and shareable. The `AvailabilityChecker` is a standalone Client Component that calls a lightweight `GET /api/availability` endpoint which runs a single parameterized aggregate SQL query and applies business logic.

This approach strictly follows existing patterns: Server Components for data reads (mirroring `app/admin/products/page.tsx`), Client Components for interactions (mirroring `components/locale-switcher.tsx`), `db` singleton from `lib/db.ts`, and i18n via `getMessages()`.

---

## Architecture Decisions

### Decision: Server Component catalog grid with URL-param category filter

**Choice:** `app/[locale]/catalog/page.tsx` is an async Server Component. It reads `searchParams.category` and fetches filtered products server-side. `CategoryFilter` is a `"use client"` component that pushes URL params.

**Alternatives considered:**
- Pure Client Component catalog with local state filter — rejected: breaks SSR, no crawlable URLs, no shareable filtered links.
- SWR/React Query for client-side fetching — rejected: no additional packages, and SSR is superior for SEO.

**Rationale:** Matches the admin dashboard pattern exactly. Next.js re-renders the Server Component on each navigation (category change), which is acceptable for a small catalog (< 100 products). URL state is shareable and bookmarkable.

---

### Decision: `Decimal` → `number` conversion at the Server Component boundary

**Choice:** Convert `product.basePrice` (Prisma `Decimal`) to `number` via `.toNumber()` before passing as props to any Client Component. Pass `number` in props only.

**Alternatives considered:**
- Pass `Decimal` as string — extra parsing complexity.
- Use `JSON.stringify` default — `Decimal` objects may not serialize cleanly.

**Rationale:** Prisma `Decimal` type is not JSON-serializable as a plain number. Converting at the Server Component boundary keeps Client Components simple and avoids runtime serialization errors with React RSC payload.

---

### Decision: Availability query via `db.$queryRaw` (raw SQL)

**Choice:** Use Prisma's `db.$queryRaw` with template literals for the overlap aggregate query.

**Alternatives considered:**
- `db.availability.aggregate({ _sum: { quantity: true }, where: { ... } })` — Prisma ORM `where` does not natively support `startDate < $end AND endDate > $start` using field-to-field comparison; would require `$raw` in the filter anyway.
- `db.availability.findMany` + JS reduce — N+1 avoidance; needlessly loads records into memory.

**Rationale:** The overlap condition (`startDate < $end AND endDate > $start`) is a classic interval overlap that maps cleanly to a single SQL aggregate. `$queryRaw` with template literals is parameterized by Prisma (safe from SQL injection). The `idx_availability_lookup` composite index on `(productId, startDate, endDate)` already exists in the schema.

---

### Decision: Native `<input type="date">` for date picker

**Choice:** Two separate native `<input type="date">` elements for start and end date.

**Alternatives considered:**
- A date range picker library (react-day-picker, etc.) — rejected per NFR-05 (no new packages).
- Single `<input type="date-local">` — not standard across browsers.

**Rationale:** No new npm packages. Native date inputs are accessible, keyboard-navigable, and supported in all modern browsers. Can be upgraded in a later iteration.

---

### Decision: `useEffect` + `setTimeout` debounce (no external hook)

**Choice:** Implement debounce in `AvailabilityChecker` with `useEffect` cleanup pattern: set a `setTimeout` for 400ms on each date change, clear it on cleanup or re-run.

**Alternatives considered:**
- `useDebouncedCallback` from `use-debounce` library — rejected per NFR-05.
- Inline `AbortController` per request — added complexity; debounce already prevents excess requests.

**Rationale:** Standard React pattern, zero dependencies, easy to test.

---

### Decision: `generateMetadata` for product detail SEO

**Choice:** Export `generateMetadata` from `app/[locale]/catalog/[slug]/page.tsx` to set `<title>` and `<meta name="description">` per product.

**Alternatives considered:**
- Static metadata in layout — would be generic, not product-specific.

**Rationale:** NFR-01 requires per-product SEO meta. `generateMetadata` is the App Router standard; same pattern already used in `app/[locale]/layout.tsx`.

---

### Decision: i18n — Messages type must stay compatible

**Choice:** Add new keys to `messages/en.json` and `messages/es.json` under a new `"catalog"` namespace. Server Components call `getMessages(locale)` and pass `m.catalog` to child components as a prop. Client Components receive pre-resolved strings as props (not the full messages object) to avoid passing non-serializable module references.

**Alternatives considered:**
- Pass `locale` to Client Components and call `getMessages` in the Client — `getMessages` reads module-level JSON, which works, but it imports both language files on the client bundle.
- Re-export a subset of translations context — overkill, no library.

**Rationale:** The existing pattern in `app/[locale]/page.tsx` calls `getMessages(locale)` at the top of the Server Component and destructures `m.nav`, `m.hero`, etc. We follow the same pattern. Client Components (`CategoryFilter`, `AvailabilityChecker`) receive only the string values they need as explicit props — keeps them pure and serializable.

---

## Component Tree / RSC vs Client Boundaries

```
app/[locale]/catalog/page.tsx              ← SERVER COMPONENT (async)
│  reads: params.locale, searchParams.category
│  fetches: products + categories from DB
│  resolves: m = getMessages(locale)
│
├── <header> (inline, static JSX)
│
├── <CategoryFilter                         ← CLIENT COMPONENT ("use client")
│     categories={Category[]}
│     currentSlug={string | null}
│     labels={{ all: string }}
│   />
│   uses: usePathname, useRouter (next/navigation)
│   on click: router.push(`/[locale]/catalog?category=slug`)
│
└── <div.grid>
    └── <ProductCard                        ← SERVER COMPONENT (pure, no hooks)
          product={ProductWithCategory}
          locale={locale}
          labels={{ viewDetails: string, perUnit: string, price: string }}
        />  × N
        renders: next/image, Link to /[locale]/catalog/[slug]


app/[locale]/catalog/[slug]/page.tsx       ← SERVER COMPONENT (async)
│  reads: params.locale, params.slug
│  fetches: single product by slug from DB
│  calls: notFound() if not found / not active
│  resolves: m = getMessages(locale)
│  exports: generateMetadata
│
├── Product gallery (next/image, Server)
├── Product info section (Server)
│
└── <AvailabilityChecker                   ← CLIENT COMPONENT ("use client")
      productId={string}
      pricingModel={"FIXED" | "PER_UNIT"}
      stock={number}
      labels={AvailabilityLabels}
    />
    state: startDate, endDate, status, result, error
    effect: debounced fetch to /api/availability
    renders: date inputs + status display


app/api/availability/route.ts              ← API ROUTE (Edge-compatible, Server)
│  GET handler
│  validates: productId (UUID), start (date), end (date), end > start
│  queries DB: product lookup + availability aggregate
│  applies: FIXED / PER_UNIT logic
│  returns: { available: number, pricingModel: string }
```

**RSC vs Client boundary summary:**

| Component | Boundary | Reason |
|-----------|----------|--------|
| `catalog/page.tsx` | Server | DB access, SSR SEO, no interactivity |
| `catalog/[slug]/page.tsx` | Server | DB access, SSR SEO, `generateMetadata` |
| `ProductCard` | Server | Pure presentational, no state/events |
| `CategoryFilter` | Client | Needs `usePathname`, `useRouter` for URL updates |
| `AvailabilityChecker` | Client | Needs `useState`, `useEffect`, `fetch` |
| `availability/route.ts` | Server | DB query, business logic, no UI |

---

## Data Flow

### Catalog page data flow

```
User navigates to /en/catalog?category=inflatables
           │
           ▼
  catalog/page.tsx (Server)
  ├── await params → locale = "en"
  ├── await searchParams → categorySlug = "inflatables"
  ├── getMessages("en") → m (typed dictionary)
  ├── db.category.findMany() → Category[]    ─────┐
  ├── db.product.findMany({                        │
  │     where: {                                   │ parallel
  │       isActive: true,                          │ Promise.all
  │       ...(categorySlug && categorySlug !== "all" │
  │           ? { category: { slug: categorySlug } } │
  │           : {})                                │
  │     },                                         │
  │     include: { category: true },               │
  │     orderBy: { name: "asc" }                   │
  │   }) → Product[]                         ──────┘
  │
  └── renders:
      ├── CategoryFilter (receives Category[], current slug, m.catalog.filterAll)
      └── ProductCard × N (receives product data as plain objects)
```

### Product detail page data flow

```
User navigates to /en/catalog/inflatable-bouncy-castle
           │
           ▼
  catalog/[slug]/page.tsx (Server)
  ├── await params → locale = "en", slug = "inflatable-bouncy-castle"
  ├── getMessages("en") → m
  ├── db.product.findUnique({
  │     where: { slug, isActive: true },
  │     include: { category: true }
  │   }) → Product | null
  ├── if null → notFound()
  │
  └── renders:
      ├── product gallery (next/image)
      ├── product info
      └── AvailabilityChecker (receives productId, pricingModel, stock, labels as props)
                │
                │  (user picks dates → 400ms debounce)
                ▼
  GET /api/availability?productId=X&start=YYYY-MM-DD&end=YYYY-MM-DD
                │
                ▼
  availability/route.ts (Server)
  ├── parse & validate params
  ├── db.product.findUnique({ where: { id: productId, isActive: true } })
  ├── db.$queryRaw`
  │     SELECT COALESCE(SUM(quantity), 0)::int AS occupied
  │     FROM availability
  │     WHERE product_id = ${productId}::uuid
  │       AND start_date < ${endDate}::timestamp
  │       AND end_date > ${startDate}::timestamp
  │   `
  ├── apply FIXED / PER_UNIT logic
  └── return NextResponse.json({ available, pricingModel })
                │
                ▼
  AvailabilityChecker renders result:
  ├── FIXED, available=1   → "Available"
  ├── FIXED, available=0   → "Not available"
  ├── PER_UNIT, available>0 → "{N} units available"
  └── PER_UNIT, available=0 → "Not available"
```

---

## Prisma Queries

### 1. Fetch all categories (for filter)

```typescript
const categories = await db.category.findMany({
  orderBy: { name: 'asc' },
  select: { id: true, name: true, slug: true },
})
```

### 2. Fetch active products (with optional category filter)

```typescript
const products = await db.product.findMany({
  where: {
    isActive: true,
    ...(categorySlug && categorySlug !== 'all'
      ? { category: { slug: categorySlug } }
      : {}),
  },
  include: {
    category: { select: { name: true, slug: true } },
  },
  orderBy: { name: 'asc' },
})
```

### 3. Fetch single product by slug

```typescript
const product = await db.product.findUnique({
  where: { slug },
  include: {
    category: { select: { name: true, slug: true } },
  },
})
// Guard: if (!product || !product.isActive) notFound()
```

### 4. Availability aggregate query (raw SQL)

```typescript
import { Prisma } from '@prisma/client'

type OccupiedResult = [{ occupied: number }]

const result = await db.$queryRaw<OccupiedResult>`
  SELECT COALESCE(SUM(quantity), 0)::int AS occupied
  FROM availability
  WHERE product_id = ${productId}::uuid
    AND start_date < ${new Date(endDate)}::timestamp
    AND end_date > ${new Date(startDate)}::timestamp
`

const occupied = result[0]?.occupied ?? 0
```

> **Note:** Prisma `$queryRaw` with template literals is auto-parameterized — no SQL injection risk. The `::uuid` and `::timestamp` casts are required for PostgreSQL to accept the string parameters correctly.

### 5. Parallel fetch on catalog page

```typescript
const [categories, products] = await Promise.all([
  db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
  db.product.findMany({
    where: { isActive: true, ...categoryFilter },
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { name: 'asc' },
  }),
])
```

---

## Component Contracts (TypeScript Interfaces)

### ProductCard props

```typescript
// components/catalog/product-card.tsx — Server Component (no "use client")

import type { Decimal } from '@prisma/client/runtime/library'

export type ProductCardProduct = {
  id: string
  name: string
  slug: string
  basePrice: Decimal   // Prisma Decimal — convert to number before rendering
  priceType: 'FIXED' | 'PER_UNIT'
  photos: string[]
  category: { name: string; slug: string }
}

export type ProductCardLabels = {
  viewDetails: string   // e.g. "View Details"
  perUnit: string       // e.g. "per unit"
  price: string         // e.g. "Price"
}

export type ProductCardProps = {
  product: ProductCardProduct
  locale: string
  labels: ProductCardLabels
}
```

### CategoryFilter props

```typescript
// components/catalog/category-filter.tsx — "use client"

export type FilterCategory = {
  id: string
  name: string
  slug: string
}

export type CategoryFilterProps = {
  categories: FilterCategory[]
  currentSlug: string | null   // null = "All"
  allLabel: string             // e.g. "All Items"
}
```

### AvailabilityChecker props

```typescript
// components/catalog/availability-checker.tsx — "use client"

export type AvailabilityLabels = {
  checkDates: string         // "Check Availability"
  startDate: string          // "Start Date"
  endDate: string            // "End Date"
  loading: string            // "Checking..."
  available: string          // "Available"
  notAvailable: string       // "Not Available"
  unitsAvailable: string     // "units available" (prepend count)
  invalidRange: string       // "End date must be after start date"
  errorFetch: string         // "Could not check availability. Try again."
}

export type AvailabilityCheckerProps = {
  productId: string
  pricingModel: 'FIXED' | 'PER_UNIT'
  stock: number
  labels: AvailabilityLabels
}

// Internal state shape
type AvailabilityStatus = 'idle' | 'loading' | 'available' | 'unavailable' | 'error' | 'invalid'
```

### API Route response types

```typescript
// app/api/availability/route.ts — internal types

type AvailabilitySuccessResponse = {
  available: number          // integer >= 0
  pricingModel: 'FIXED' | 'PER_UNIT'
}

type AvailabilityErrorResponse = {
  error: string
}

// Query params shape (after parsing)
type AvailabilityParams = {
  productId: string   // UUID
  start: string       // YYYY-MM-DD
  end: string         // YYYY-MM-DD
}
```

---

## Category Filter Mechanics

The `CategoryFilter` component uses `usePathname` + `useRouter` (client hooks) to update the URL while keeping the locale segment:

```typescript
"use client"
import { usePathname, useRouter } from 'next/navigation'

export function CategoryFilter({ categories, currentSlug, allLabel }: CategoryFilterProps) {
  const router = useRouter()
  const pathname = usePathname()  // e.g. "/en/catalog"

  function handleSelect(slug: string | null) {
    const url = new URL(pathname, 'http://x')  // base doesn't matter
    if (slug && slug !== 'all') {
      url.searchParams.set('category', slug)
    } else {
      url.searchParams.delete('category')
    }
    router.push(pathname + (url.search ? url.search : ''))
  }

  // ...renders pill buttons, active state = currentSlug === category.slug
}
```

**Active state detection:** `currentSlug` is passed from the Server Component (it reads `searchParams.category`). The filter button for the matching slug gets the `bg-primary text-white` class (matching the landing page's `equipment.filters` button style).

**"All" button:** Slug `null` (or clicking "All") calls `handleSelect(null)` which removes the `?category` param entirely, triggering a full-page RSC re-render with all products.

**Locale preservation:** Using `pathname` directly preserves the `/en/` or `/es/` prefix — same technique as `LocaleSwitcher`.

---

## Availability Checker Flow

```
State machine:
  idle ──(both dates valid)──→ [debounce 400ms] ──→ loading
  loading ──(fetch ok)──→ available | unavailable
  loading ──(fetch error)──→ error
  (either date changes) ──→ cancel timeout → idle OR new debounce cycle
  (invalid range: end ≤ start) ──→ invalid (no fetch)

useEffect dependencies: [startDate, endDate, productId]

Effect body:
  1. If !startDate || !endDate → setStatus('idle'); return
  2. If endDate <= startDate → setStatus('invalid'); return
  3. const timer = setTimeout(async () => {
       setStatus('loading')
       try {
         const res = await fetch(`/api/availability?productId=${productId}&start=${startDate}&end=${endDate}`)
         if (!res.ok) { setStatus('error'); return }
         const data: AvailabilitySuccessResponse = await res.json()
         setAvailable(data.available)
         setStatus(data.available > 0 ? 'available' : 'unavailable')
       } catch {
         setStatus('error')
       }
     }, 400)
  4. return () => clearTimeout(timer)   // cleanup
```

**Display logic:**

| Status | pricingModel | available | Rendered |
|--------|-------------|-----------|----------|
| `idle` | — | — | "(pick dates to check)" |
| `loading` | — | — | spinner + labels.loading |
| `available` | FIXED | 1 | ✅ labels.available |
| `unavailable` | FIXED | 0 | ❌ labels.notAvailable |
| `available` | PER_UNIT | N>0 | ✅ `N {labels.unitsAvailable}` |
| `unavailable` | PER_UNIT | 0 | ❌ labels.notAvailable |
| `invalid` | — | — | ⚠️ labels.invalidRange |
| `error` | — | — | ⚠️ labels.errorFetch |

**Client-side negative guard:** If `available < 0` (data anomaly), treat as 0 (`unavailable`).

---

## i18n Integration

### New keys to add to `messages/en.json`

Add under a new top-level `"catalog"` key:

```json
"catalog": {
  "title": "Our Catalog",
  "filterAll": "All Items",
  "noProducts": "No products available at this time.",
  "noProductsInCategory": "No products found in this category.",
  "viewDetails": "View Details",
  "product": {
    "price": "Price",
    "pricePerUnit": "per unit",
    "stock": "Stock",
    "category": "Category",
    "gallery": "Product gallery"
  },
  "availability": {
    "title": "Check Availability",
    "startDate": "Start Date",
    "endDate": "End Date",
    "loading": "Checking availability...",
    "available": "Available",
    "notAvailable": "Not available for selected dates",
    "unitsAvailable": "units available",
    "invalidRange": "End date must be after start date",
    "errorFetch": "Could not check availability. Please try again."
  }
}
```

### New keys to add to `messages/es.json`

```json
"catalog": {
  "title": "Nuestro Catálogo",
  "filterAll": "Todo",
  "noProducts": "No hay productos disponibles en este momento.",
  "noProductsInCategory": "No se encontraron productos en esta categoría.",
  "viewDetails": "Ver Detalles",
  "product": {
    "price": "Precio",
    "pricePerUnit": "por unidad",
    "stock": "Stock",
    "category": "Categoría",
    "gallery": "Galería del producto"
  },
  "availability": {
    "title": "Verificar Disponibilidad",
    "startDate": "Fecha de inicio",
    "endDate": "Fecha de fin",
    "loading": "Verificando disponibilidad...",
    "available": "Disponible",
    "notAvailable": "No disponible para las fechas seleccionadas",
    "unitsAvailable": "unidades disponibles",
    "invalidRange": "La fecha de fin debe ser posterior a la de inicio",
    "errorFetch": "No se pudo verificar la disponibilidad. Intenta de nuevo."
  }
}
```

### How to consume in Server Components

```typescript
// catalog/page.tsx
const m = getMessages(locale)
// Pass to CategoryFilter:
<CategoryFilter allLabel={m.catalog.filterAll} ... />
// Pass to ProductCard:
<ProductCard labels={{ viewDetails: m.catalog.viewDetails, perUnit: m.catalog.product.pricePerUnit, price: m.catalog.product.price }} ... />
```

### How to consume in Client Components

Client Components receive pre-resolved string labels as props — they do NOT call `getMessages()` themselves. This avoids bundling both language files on the client.

```typescript
// catalog/[slug]/page.tsx (Server Component)
const m = getMessages(locale)
<AvailabilityChecker
  productId={product.id}
  pricingModel={product.priceType}
  stock={product.stock}
  labels={{
    checkDates: m.catalog.availability.title,
    startDate: m.catalog.availability.startDate,
    endDate: m.catalog.availability.endDate,
    loading: m.catalog.availability.loading,
    available: m.catalog.availability.available,
    notAvailable: m.catalog.availability.notAvailable,
    unitsAvailable: m.catalog.availability.unitsAvailable,
    invalidRange: m.catalog.availability.invalidRange,
    errorFetch: m.catalog.availability.errorFetch,
  }}
/>
```

> **TypeScript safety:** Because `Messages = typeof en`, adding `catalog` to `en.json` but not `es.json` will cause a TypeScript error at `lib/i18n/messages.ts`. Both files must be updated together.

---

## `next.config.ts` Change

Replace the empty config with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // MinIO (local development)
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        // MinIO via S3_PUBLIC_URL env var — production/staging host
        // Add actual hostname when deploying; for now cover localhost
        protocol: "https",
        hostname: process.env.S3_PUBLIC_HOSTNAME ?? "localhost",
        pathname: "/**",
      },
      {
        // Unsplash (seed data photos)
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

> **Note:** `S3_PUBLIC_HOSTNAME` is an env var that can be set for production to allow any MinIO domain without hardcoding. Falls back to `localhost` for dev. The `http://localhost:9000` pattern is needed because MinIO in Docker runs over HTTP in local development (not HTTPS).

---

## Error Handling

### 404 — product not found

```typescript
// catalog/[slug]/page.tsx
import { notFound } from 'next/navigation'
const product = await db.product.findUnique({ where: { slug } })
if (!product || !product.isActive) notFound()
```

Next.js renders the nearest `not-found.tsx` (or the default 404 page). No `not-found.tsx` needs to be created for SPEC-03 — the default is sufficient.

### API validation errors (400/404)

```typescript
// app/api/availability/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  // Presence checks
  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  if (!start)     return NextResponse.json({ error: 'start is required' }, { status: 400 })
  if (!end)       return NextResponse.json({ error: 'end is required' }, { status: 400 })

  // UUID format (simple regex)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(productId)) return NextResponse.json({ error: 'productId must be a valid UUID' }, { status: 400 })

  // Date format (YYYY-MM-DD)
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  if (!DATE_RE.test(start)) return NextResponse.json({ error: 'Invalid date format for start. Use YYYY-MM-DD' }, { status: 400 })
  if (!DATE_RE.test(end))   return NextResponse.json({ error: 'Invalid date format for end. Use YYYY-MM-DD' }, { status: 400 })

  const startDate = new Date(start)
  const endDate = new Date(end)
  if (isNaN(startDate.getTime())) return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
  if (isNaN(endDate.getTime()))   return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
  if (endDate <= startDate)       return NextResponse.json({ error: 'end must be after start' }, { status: 400 })

  // Product lookup
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product || !product.isActive) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Aggregate query + business logic (see Prisma Queries section)
  // ...
  
  // Wrap in try/catch for DB errors
  try {
    // query + logic
    return NextResponse.json({ available, pricingModel: product.priceType })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Network errors in `AvailabilityChecker`

- `fetch()` rejection (network down) → `catch` block → `setStatus('error')`
- Non-200 HTTP response → `if (!res.ok)` → `setStatus('error')`
- Both render `labels.errorFetch` to the user

### Empty product list

Render an empty state message (`m.catalog.noProducts` or `m.catalog.noProductsInCategory`) — no crash, no hidden errors.

---

## File-by-File Implementation Notes

### `app/[locale]/catalog/page.tsx`

```typescript
// Pattern: identical to app/admin/products/page.tsx but with locale
// - async Server Component
// - searchParams is Promise<{ category?: string }> (Next.js 16 App Router)
// - params is Promise<{ locale: string }>
// - Use Promise.all for parallel DB calls
// - Pass m.catalog.* strings to child components
// - Render CategoryFilter + grid of ProductCard
// - Empty state: if products.length === 0, show message paragraph
```

**Key implementation notes:**
1. `searchParams` is a Promise in Next.js 16 — must `await searchParams`.
2. Use `Promise.all([db.category.findMany, db.product.findMany])` for parallel fetching.
3. Pass `categorySlug` (from `searchParams.category`) to both the DB query and `CategoryFilter` as `currentSlug`.
4. Wrap `<CategoryFilter>` in `<Suspense>` if using `useSearchParams` inside (required by Next.js when `CategoryFilter` uses `useSearchParams`). However, since `currentSlug` is passed as prop from server, `CategoryFilter` uses `useRouter` + `usePathname` only — no `useSearchParams` needed, no Suspense boundary required.

### `app/[locale]/catalog/[slug]/page.tsx`

```typescript
// - async Server Component
// - params is Promise<{ locale: string; slug: string }>
// - Export generateMetadata (same pattern as [locale]/layout.tsx)
// - db.product.findUnique({ where: { slug }, include: { category: true } })
// - if (!product || !product.isActive) notFound()
// - Convert product.basePrice.toNumber() before passing to any serialized prop
// - Render photo gallery: map photos[], use next/image for each
//   Fallback: if photos.length === 0, show placeholder div
// - Pass AvailabilityChecker all required labels from m.catalog.availability
```

**generateMetadata pattern:**
```typescript
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const product = await db.product.findUnique({ where: { slug }, select: { name: true, description: true } })
  if (!product) return {}
  return {
    title: `${product.name} | Festejos Aurora`,
    description: product.description ?? undefined,
  }
}
```

### `app/api/availability/route.ts`

```typescript
// - import { db } from '@/lib/db'
// - import { NextRequest, NextResponse } from 'next/server'
// - No authentication required (public endpoint)
// - Validation → product lookup → raw SQL aggregate → business logic → response
// - Use db.$queryRaw<[{ occupied: number }]>`...` with template literals
// - CRITICAL: cast with ::int in SQL since COALESCE(SUM(...)) returns Prisma BigInt
//   Alternative: result[0].occupied may be BigInt → use Number(result[0].occupied)
// - Stock: product.stock is Int in schema, so no Decimal conversion needed
// - FIXED logic: occupied >= 1 ? 0 : 1
// - PER_UNIT logic: Math.max(0, product.stock - occupied)
```

**BigInt note:** Prisma `$queryRaw` maps PostgreSQL `SUM()` result to `BigInt` in JavaScript. Either cast in SQL (`::int`) or wrap with `Number()`: `const occupied = Number(result[0]?.occupied ?? 0)`.

### `components/catalog/product-card.tsx`

```typescript
// - NO "use client" directive — Server Component
// - Import: Link from 'next/link', Image from 'next/image'
// - Import: Badge from '@/components/ui/badge' (already installed)
// - Photo: product.photos[0] ?? null; if null, render placeholder div
// - Price display: `$${product.basePrice.toNumber().toFixed(2)}`
// - PER_UNIT: show labels.perUnit after price
// - "View Details" link: href={`/${locale}/catalog/${product.slug}`}
// - Card style: follow landing page card pattern:
//   "group relative rounded-xl border border-slate-100 bg-background-light p-4 shadow-sm transition-all duration-300 hover:shadow-lg"
// - Badge for category: <Badge variant="outline">{product.category.name}</Badge>
```

### `components/catalog/category-filter.tsx`

```typescript
"use client"
// - Import: usePathname, useRouter from 'next/navigation'
// - Renders "All" button (active when currentSlug is null)
// - Renders one button per category
// - Active style: "bg-primary text-white" — matching landing page filter buttons
// - Inactive style: "bg-slate-100 text-slate-600 hover:bg-slate-200"
// - Button class: "whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold"
// - On click: build new URL, router.push(newUrl)
// - IMPORTANT: use Link or button? Use <button> + router.push (not Link) to avoid
//   prefetching all category pages on render; router.push is sufficient
```

### `components/catalog/availability-checker.tsx`

```typescript
"use client"
// - Import: useState, useEffect from 'react'
// - Input type="date" — native HTML
// - Min date for startDate: today (new Date().toISOString().split('T')[0])
// - Min date for endDate: startDate (dynamically updated)
// - Debounce via useEffect with setTimeout(fn, 400) + cleanup
// - Status display: see state machine above
// - Accessible: role="status" aria-live="polite" on the result div
// - Loading: show a simple text indicator (no Spinner component needed, inline CSS)
// - Use Tailwind for colors: green-600 for available, red-600 for unavailable, 
//   amber-600 for invalid/error
```

### `messages/en.json` and `messages/es.json`

- Add `"catalog": { ... }` key block as shown in i18n section above
- **CRITICAL:** Both files must be updated at the same time — `Messages = typeof en` means TypeScript will error on `es.json` mismatch
- Structure must be identical between both files

### `next.config.ts`

- Replace empty config with `images.remotePatterns` block as shown above
- Add `http://localhost:9000` for MinIO dev
- Add `https://images.unsplash.com` for seed data
- Use `S3_PUBLIC_HOSTNAME` env var for production MinIO domain

### `app/[locale]/page.tsx` (modification)

```typescript
// Change nav links from href="#" to proper routes:
// m.nav.catalogue link → href={`/${locale}/catalog`}
// m.nav.home link → href={`/${locale}`}
// hero primaryCta button → convert to Link href={`/${locale}/catalog`}
// Note: locale is already available in the Server Component (await params)
// Use <Link> component (next/link) instead of <a> for locale nav links
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Availability business logic (FIXED/PER_UNIT, overlap) | Isolate the logic functions from the route handler; pure function tests |
| Unit | Date validation in API route | Test validation helpers independently |
| Integration | `GET /api/availability` endpoint | `fetch()` calls against the running dev server or Next.js route handler mock |
| Integration | Catalog page renders correct products | Next.js `createMocks` or playwright against dev server |
| E2E | Category filter updates URL and filters grid | Playwright: click filter → assert URL + product count |
| E2E | Availability checker debounces and displays result | Playwright: enter dates → wait 400ms → assert status text |
| E2E | 404 on unknown slug | Playwright: navigate to unknown slug → assert 404 |

> **Note:** No test infrastructure currently exists in the project. For SPEC-03, testing is aspirational/future work. The immediate priority is TypeScript correctness (`tsc --noEmit` passes).

---

## Migration / Rollout

**No database migration required.** The `availability`, `products`, and `categories` tables already exist and are seeded.

All changes are additive:
- New pages in `app/[locale]/catalog/` — delete to revert
- New API route in `app/api/availability/` — delete to revert
- New components in `components/catalog/` — delete to revert
- New i18n keys in `messages/*.json` — remove `catalog` block to revert
- `next.config.ts` change — revert to empty config (Unsplash images will also break)
- `app/[locale]/page.tsx` nav link fix — revert to `href="#"`

**Feature flag:** Not required. The catalog pages are new routes — they don't affect any existing functionality until navigated to or linked from the landing page nav.

---

## Open Questions

- [ ] **MinIO production hostname:** What will `S3_PUBLIC_HOSTNAME` be in production/staging? The `next.config.ts` `remotePatterns` needs the actual hostname. For now, `localhost` covers dev. The env var pattern allows config without code change.
- [ ] **Currency display:** `basePrice` is stored as `Decimal`. Currently displayed as `$${price.toFixed(2)}`. Is USD assumed always? No currency field in schema — hardcoding `$` is fine for MVP.
- [ ] **Photo gallery on detail page:** With multiple photos, should there be a carousel/thumbnail row? Design assumes a simple stacked or side-scroll layout (no carousel library, per NFR-05). Implementer can use `flex overflow-x-auto` for multi-photo scroll.
- [ ] **`not-found.tsx`:** Should a custom `/[locale]/catalog/not-found.tsx` be created? Currently the default Next.js 404 page is used. A locale-aware not-found page would be a nice touch but is not required by specs.
