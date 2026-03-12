# Tasks: Catalog & Real-Time Availability (SPEC-03)

**Change name:** catalog-availability  
**Linear issue:** CON-71  
**Project:** Festejos Aurora  
**Status:** Complete — all 11 tasks done (Batch 1+2+3)  
**Date:** 2026-03-12

---

## Overview

9 files to create, 3 files to modify, across 5 phases. All tasks are ordered by dependency. No database migrations needed — schema is already seeded.

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 0 | 3 | Config & i18n |
| Phase 1 | 3 | Shared components |
| Phase 2 | 1 | Availability API route |
| Phase 3 | 2 | Catalog pages |
| Phase 4 | 2 | Integration & fixes |
| **Total** | **11** | |

---

## Phase 0: Config & i18n

> **Why first:** `next.config.ts` must allow image domains before any page renders product images. The i18n `catalog` namespace must exist in both locale files before Server Components try to read from it — TypeScript enforces this.

### Task 0.1 — Add `images.remotePatterns` to `next.config.ts`

**File:** `next.config.ts` (modify)  
**Satisfies:** REQ-12, NFR-04

**Action:** Replace the current empty/default config with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: process.env.S3_PUBLIC_HOSTNAME ?? "localhost",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

**Acceptance criteria:**
- [x] `next dev` starts without config warnings
- [x] A `<Image>` component pointing to `http://localhost:9000/bucket/file.jpg` does NOT throw "hostname not configured" error
- [x] A `<Image>` pointing to `https://images.unsplash.com/...` still renders (regression)
- [x] TypeScript: `tsc --noEmit` passes on this file

---

### Task 0.2 — Add `catalog` namespace to `messages/en.json`

**File:** `messages/en.json` (modify)  
**Satisfies:** REQ-06, NFR-04

**Action:** Add the following top-level key to the JSON (alongside existing `nav`, `hero`, etc.):

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

**Acceptance criteria:**
- [x] `messages/en.json` is valid JSON (no parse errors)
- [x] All 17 required keys from REQ-06 are present
- [x] TypeScript: `tsc --noEmit` passes (if `Messages = typeof en` pattern is in use)

---

### Task 0.3 — Add `catalog` namespace to `messages/es.json`

**File:** `messages/es.json` (modify)  
**Satisfies:** REQ-06, NFR-04

**Action:** Mirror the exact same key structure as `en.json`, with Spanish translations:

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

**Acceptance criteria:**
- [x] `messages/es.json` is valid JSON (no parse errors)
- [x] Key structure is **identical** to `en.json` (same paths, same count)
- [x] TypeScript: `tsc --noEmit` passes — no `Messages` type mismatch between en/es
- [x] **Must be done together with Task 0.2** — never update one file without the other

---

## Phase 1: Shared Components

> **Why before pages:** Pages import these components. Build them first so pages compile immediately.

### Task 1.1 — Create `components/catalog/product-card.tsx` (Server Component)

**File:** `components/catalog/product-card.tsx` (create)  
**Satisfies:** REQ-01, REQ-03, NFR-01, NFR-03, NFR-04, NFR-05

**Action:** Create a Server Component (no `"use client"` directive). Implement the following contract:

**Props:**
```typescript
export type ProductCardProduct = {
  id: string
  name: string
  slug: string
  basePrice: number       // Already converted from Decimal via .toNumber() by the parent
  priceType: 'FIXED' | 'PER_UNIT'
  photos: string[]
  category: { name: string; slug: string }
}

export type ProductCardLabels = {
  viewDetails: string   // m.catalog.viewDetails
  perUnit: string       // m.catalog.product.pricePerUnit
  price: string         // m.catalog.product.price
}

export type ProductCardProps = {
  product: ProductCardProduct
  locale: string
  labels: ProductCardLabels
}
```

**Implementation notes:**
- Import `Image` from `next/image`, `Link` from `next/link`
- Import `Badge` from `@/components/ui/badge`
- Photo: `product.photos[0]` if exists, else render a `<div>` placeholder with a neutral background and an icon (Lucide `ImageOff` or similar)
- Price display: `$${product.basePrice.toFixed(2)}` — for PER_UNIT, append `/ {labels.perUnit}`
- "View Details" link: `href={/${locale}/catalog/${product.slug}}`
- Card style: `"group relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg"`
- Category badge: `<Badge variant="outline">{product.category.name}</Badge>`
- Image `alt`: product name (accessibility — NFR-03)
- `<Image>` must have `width`, `height`, and `className` for aspect ratio

**Acceptance criteria:**
- [x] No `"use client"` directive — renders as a Server Component
- [x] Renders image from `photos[0]` when array is non-empty (REQ-03)
- [x] Renders placeholder (no crash) when `photos` is empty (REQ-03, Edge Cases)
- [x] Displays name, category badge, price, pricing type indicator (REQ-03)
- [x] "View Details" link points to `/${locale}/catalog/${slug}` (REQ-03)
- [x] `alt` text is meaningful (NFR-03)
- [x] No new npm packages used (NFR-05)
- [x] `tsc --noEmit` passes on this file

---

### Task 1.2 — Create `components/catalog/category-filter.tsx` (Client Component)

**File:** `components/catalog/category-filter.tsx` (create)  
**Satisfies:** REQ-02, NFR-03, NFR-04, NFR-05

**Action:** Create a Client Component with `"use client"` as the first line.

**Props:**
```typescript
export type FilterCategory = {
  id: string
  name: string
  slug: string
}

export type CategoryFilterProps = {
  categories: FilterCategory[]
  currentSlug: string | null   // null = "All" is active
  allLabel: string             // m.catalog.filterAll
}
```

**Implementation notes:**
- Import `usePathname`, `useRouter` from `next/navigation`
- Render "All" pill button first; active when `currentSlug` is null
- Render one pill button per category
- Active style: `"bg-primary text-white"` (matches landing page filter pattern)
- Inactive style: `"bg-slate-100 text-slate-600 hover:bg-slate-200"`
- Button class: `"whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors"`
- On "All" click: `router.push(pathname)` (no search params — full catalog)
- On category click: `router.push(\`${pathname}?category=${slug}\`)`
- Use `pathname` (from `usePathname()`) to preserve the `/en/` or `/es/` prefix — never hardcode locale
- Use `<button>` elements (not `<Link>`) to avoid prefetching all category pages on render

**Acceptance criteria:**
- [x] `"use client"` is the first line
- [x] Clicking a category updates URL to `?category={slug}` (REQ-02)
- [x] Clicking "All" removes `?category` param (REQ-02)
- [x] Active state visually indicated on the currently selected filter (REQ-02)
- [x] Locale prefix preserved across all navigations (REQ-11 pattern)
- [x] All buttons are keyboard-navigable (NFR-03)
- [x] No new npm packages (NFR-05)
- [x] `tsc --noEmit` passes

---

### Task 1.3 — Create `components/catalog/availability-checker.tsx` (Client Component)

**File:** `components/catalog/availability-checker.tsx` (create)  
**Satisfies:** REQ-05, REQ-10, NFR-02, NFR-03, NFR-04, NFR-05

**Action:** Create a Client Component with `"use client"` as the first line.

**Props:**
```typescript
export type AvailabilityLabels = {
  checkDates: string      // "Check Availability"
  startDate: string       // "Start Date"
  endDate: string         // "End Date"
  loading: string         // "Checking availability..."
  available: string       // "Available"
  notAvailable: string    // "Not available for selected dates"
  unitsAvailable: string  // "units available"
  invalidRange: string    // "End date must be after start date"
  errorFetch: string      // "Could not check availability. Please try again."
}

export type AvailabilityCheckerProps = {
  productId: string
  pricingModel: 'FIXED' | 'PER_UNIT'
  stock: number
  labels: AvailabilityLabels
}

type AvailabilityStatus = 'idle' | 'loading' | 'available' | 'unavailable' | 'error' | 'invalid'
```

**Implementation notes (state machine):**
```
State: { startDate, endDate, status, available, error }

useEffect([startDate, endDate, productId]):
  1. if !startDate || !endDate → setStatus('idle'); return
  2. if endDate <= startDate → setStatus('invalid'); return
  3. const timer = setTimeout(async () => {
       setStatus('loading')
       try {
         const res = await fetch(`/api/availability?productId=${productId}&start=${startDate}&end=${endDate}`)
         if (!res.ok) { setStatus('error'); return }
         const data = await res.json()
         const avail = Math.max(0, data.available)  // client-side guard: no negatives
         setAvailable(avail)
         setStatus(avail > 0 ? 'available' : 'unavailable')
       } catch {
         setStatus('error')
       }
     }, 400)
  return () => clearTimeout(timer)  // cleanup on re-run
```

**Display logic:**
- `idle`: neutral text "(select dates to check availability)"
- `loading`: spinner animation or text indicator + `labels.loading`
- `available` + FIXED: green ✅ + `labels.available`
- `unavailable` + FIXED: red ❌ + `labels.notAvailable`
- `available` + PER_UNIT: green ✅ + `${available} ${labels.unitsAvailable}`
- `unavailable` + PER_UNIT: red ❌ + `labels.notAvailable`
- `invalid`: amber ⚠️ + `labels.invalidRange`
- `error`: amber ⚠️ + `labels.errorFetch`

**Accessibility:** result container uses `role="status"` + `aria-live="polite"` (NFR-03)

**Min date attributes:** `startDate` input `min` = today; `endDate` input `min` = startDate

**Acceptance criteria:**
- [x] `"use client"` is the first line
- [x] No API call made when either date is empty (REQ-05)
- [x] No API call when `end <= start`; shows `labels.invalidRange` (REQ-05)
- [x] No API call when end equals start (same-day — REQ-05)
- [x] Exactly 1 API call after 400ms debounce even with rapid date changes (REQ-05, NFR-02)
- [x] Loading state shown while request is in flight (REQ-05)
- [x] FIXED product: shows "Available" for `available=1`, "Not available" for `available=0` (REQ-05)
- [x] PER_UNIT product: shows "N units available" for `available=N>0`, "Not available" for `available=0` (REQ-05)
- [x] Negative available values displayed as 0 (not available) — Edge Cases
- [x] `role="status"` and `aria-live="polite"` on result container (NFR-03)
- [x] No new npm packages (NFR-05)
- [x] `tsc --noEmit` passes

---

## Phase 2: API Route

> **Why before pages:** The `AvailabilityChecker` component calls this endpoint. The page files import `AvailabilityChecker`. Building the API route now gives us type definitions to reference and allows isolated testing.

### Task 2.1 — Create `app/api/availability/route.ts`

**File:** `app/api/availability/route.ts` (create)  
**Satisfies:** REQ-07, REQ-08, REQ-09, REQ-10, NFR-02, NFR-04

**Action:** Create a Next.js App Router API route. Export only a `GET` handler.

**Imports:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
```

**Validation sequence (return early on each failure):**
1. `productId` present → else 400 `"productId is required"`
2. `start` present → else 400 `"start is required"`
3. `end` present → else 400 `"end is required"`
4. `productId` is empty string → 400 `"productId is required"`
5. UUID format check: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` → else 400 `"productId must be a valid UUID"`
6. Date format check for `start`: `/^\d{4}-\d{2}-\d{2}$/` → else 400 `"Invalid date format for start. Use YYYY-MM-DD"`
7. Date format check for `end` → else 400 same pattern
8. `new Date(start)` is valid (not NaN) → else 400 `"Invalid start date"`
9. `new Date(end)` is valid → else 400 `"Invalid end date"`
10. `endDate <= startDate` → 400 `"end must be after start"`

**Database queries (after validation):**
```typescript
// 1. Product lookup
const product = await db.product.findUnique({ where: { id: productId } })
if (!product || !product.isActive) {
  return NextResponse.json({ error: 'Product not found' }, { status: 404 })
}

// 2. Availability aggregate (raw SQL — overlap condition)
type OccupiedResult = [{ occupied: number }]
const result = await db.$queryRaw<OccupiedResult>`
  SELECT COALESCE(SUM(quantity), 0)::int AS occupied
  FROM availability
  WHERE product_id = ${productId}::uuid
    AND start_date < ${new Date(end)}::timestamp
    AND end_date > ${new Date(start)}::timestamp
`
const occupied = Number(result[0]?.occupied ?? 0)
```

**Business logic:**
```typescript
let available: number
if (product.priceType === 'FIXED') {
  available = occupied >= 1 ? 0 : 1
} else {
  // PER_UNIT
  const stock = product.stock ?? 0
  available = Math.max(0, stock - occupied)
}
```

**Response:**
```typescript
return NextResponse.json({ available, pricingModel: product.priceType })
```

**Wrap DB calls in try/catch:** catch returns 500 `"Internal server error"`

**Acceptance criteria:**
- [x] `GET /api/availability?productId={uuid}&start=2026-05-10&end=2026-05-12` returns 200 with `{ available, pricingModel }` (REQ-07, REQ-10)
- [x] Missing `productId` → 400 (REQ-09)
- [x] Missing `start` → 400 (REQ-09)
- [x] Missing `end` → 400 (REQ-09)
- [x] Non-UUID `productId` → 400 (REQ-09)
- [x] Invalid date format → 400 (REQ-09)
- [x] `end <= start` → 400 (REQ-09)
- [x] Non-existent productId (valid UUID) → 404 (REQ-09)
- [x] Inactive product → 404 (REQ-09)
- [x] FIXED product with overlap → `available = 0` (REQ-08)
- [x] FIXED product without overlap → `available = 1` (REQ-08)
- [x] PER_UNIT: `available = MAX(0, stock - occupied)` (REQ-08)
- [x] COALESCE handles NULL (no bookings) as occupied = 0 (REQ-08)
- [x] Adjacent bookings (exclusive end) do NOT count as overlap (REQ-08)
- [x] PER_UNIT with null/0 stock → `available = 0` (Edge Cases)
- [x] `Content-Type: application/json` on all responses (REQ-10)
- [x] `available` is always a non-negative integer (REQ-10)
- [x] No authentication required (REQ-07)
- [x] `tsc --noEmit` passes

---

## Phase 3: Pages

> **Why after components and API:** Pages compose all of the above. They compile cleanly only when their imports already exist.

### Task 3.1 — Create `app/[locale]/catalog/page.tsx` (Server Component catalog grid)

**File:** `app/[locale]/catalog/page.tsx` (create)  
**Satisfies:** REQ-01, REQ-02, REQ-06, NFR-01, NFR-02, NFR-03, NFR-04

**Action:** Create an async Server Component. No `"use client"` directive.

**Page signature:**
```typescript
export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string }>
})
```

**Implementation steps:**
1. `const { locale } = await params`
2. `const { category: categorySlug } = await searchParams`
3. `const m = getMessages(locale)` (use existing `getMessages` helper from `lib/i18n`)
4. Parallel fetch:
   ```typescript
   const [categories, products] = await Promise.all([
     db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
     db.product.findMany({
       where: {
         isActive: true,
         ...(categorySlug && categorySlug !== 'all'
           ? { category: { slug: categorySlug } }
           : {}),
       },
       include: { category: { select: { name: true, slug: true } } },
       orderBy: { name: 'asc' },
     }),
   ])
   ```
5. Convert `basePrice` for each product: `product.basePrice.toNumber()`
6. Render `<CategoryFilter categories={categories} currentSlug={categorySlug ?? null} allLabel={m.catalog.filterAll} />`
7. Render product grid:
   - If `products.length === 0`: show empty state message
     - If `categorySlug`: `m.catalog.noProductsInCategory`
     - Else: `m.catalog.noProducts`
   - Else: grid of `<ProductCard>` with converted products and labels
8. Pass labels to `ProductCard`:
   ```typescript
   labels={{ viewDetails: m.catalog.viewDetails, perUnit: m.catalog.product.pricePerUnit, price: m.catalog.product.price }}
   ```

**Page title:** Add a static export or use existing layout for title. At minimum: `<h1>{m.catalog.title}</h1>` visible on page.

**Acceptance criteria:**
- [x] `/en/catalog` renders all active products (REQ-01)
- [x] `/es/catalog` renders all active products with Spanish labels (REQ-06)
- [x] Inactive products are NOT shown (REQ-01)
- [x] Empty state shows when no products exist (REQ-01)
- [x] `?category=inflatables` filters to only that category (REQ-02)
- [x] `?category=all` shows all products (REQ-02)
- [x] Unknown category slug shows empty state (no 500) (REQ-02 Edge Cases)
- [x] No URL param shows full catalog (REQ-02)
- [x] `basePrice` converts from Decimal to number before passing as props (NFR-04)
- [x] Page is server-rendered — no data fetching on the client (NFR-01, NFR-02)
- [x] `tsc --noEmit` passes

---

### Task 3.2 — Create `app/[locale]/catalog/[slug]/page.tsx` (Server Component product detail)

**File:** `app/[locale]/catalog/[slug]/page.tsx` (create)  
**Satisfies:** REQ-04, REQ-05, REQ-06, NFR-01, NFR-03, NFR-04

**Action:** Create an async Server Component. Export both the default page and `generateMetadata`.

**generateMetadata export:**
```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true },
  })
  if (!product) return {}
  return {
    title: `${product.name} | Festejos Aurora`,
    description: product.description ?? undefined,
  }
}
```

**Page implementation:**
1. `const { locale, slug } = await params`
2. `const m = getMessages(locale)`
3. Fetch product:
   ```typescript
   const product = await db.product.findUnique({
     where: { slug },
     include: { category: { select: { name: true, slug: true } } },
   })
   if (!product || !product.isActive) notFound()
   ```
4. Convert: `const basePrice = product.basePrice.toNumber()`
5. Render product gallery:
   - If `product.photos.length > 0`: map photos into `<Image>` components
   - Else: render placeholder div (`m.catalog.product.gallery` as aria-label)
6. Render product info: name, category, price (`$${basePrice.toFixed(2)}`), priceType label
7. If `priceType === 'PER_UNIT'`: show stock count using `m.catalog.product.stock`
8. Render `<AvailabilityChecker>`:
   ```typescript
   <AvailabilityChecker
     productId={product.id}
     pricingModel={product.priceType}
     stock={product.stock ?? 0}
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

**Acceptance criteria:**
- [x] `/en/catalog/{slug}` renders product name, description, price, category (REQ-04)
- [x] Product gallery renders all photos from `photos[]` (REQ-04)
- [x] Placeholder shown when `photos[]` is empty (REQ-04 Edge Cases)
- [x] `AvailabilityChecker` component is present on the page (REQ-04, REQ-05)
- [x] Non-existent slug → 404 via `notFound()` (REQ-04)
- [x] Inactive product (`isActive = false`) → 404 (REQ-04)
- [x] `generateMetadata` sets `<title>` and `<meta name="description">` per product (NFR-01)
- [x] Page renders in both EN and ES with correct labels (REQ-06)
- [x] PER_UNIT product shows stock count (REQ-04)
- [x] `basePrice.toNumber()` used before prop serialization — no Decimal in client props (NFR-04)
- [x] `tsc --noEmit` passes

---

## Phase 4: Integration & Fixes

> **Why last:** These tasks tie the catalog into the existing landing page and do a final sanity check. They depend on all pages existing first.

### Task 4.1 — Fix landing page `href="#"` nav links in `app/[locale]/page.tsx`

**File:** `app/[locale]/page.tsx` (modify)  
**Satisfies:** REQ-11, NFR-04

**Action:** Find all navigation links that should point to the catalog and update them from `href="#"` to real routes.

**Steps:**
1. Read the current `app/[locale]/page.tsx` to locate all `href="#"` or placeholder links
2. Identify which links are intended for the catalog (typically: navigation header link for "Catalog", "Products", or "Our Equipment"; any "View All" or "See All Products" CTAs in the hero or products section)
3. Replace each with `<Link href={`/${locale}/catalog`}>` (using Next.js `Link`)
4. Ensure `locale` is available in the component (it comes from `await params`)
5. Leave other `href="#"` links untouched if they serve other purposes

**Note on locale:** The Server Component already has `params.locale` available. Use `/${locale}/catalog` — not a hardcoded `/en/catalog`.

**Acceptance criteria:**
- [x] No catalog-related nav link uses `href="#"` after this task (REQ-11)
- [x] Clicking the catalog nav link on `/en` navigates to `/en/catalog` (REQ-11)
- [x] Clicking the catalog nav link on `/es` navigates to `/es/catalog` (REQ-11)
- [x] No other existing links are accidentally broken
- [x] `<Link>` from `next/link` is used (not `<a>`) for proper client-side navigation
- [x] `tsc --noEmit` passes

---

### Task 4.2 — Smoke test: verify all routes and TypeScript

**Satisfies:** NFR-01, NFR-02, NFR-03, NFR-04, all REQs (integration)

**Action:** Run a manual integration check to verify the end-to-end flow works in `next dev`.

**Steps:**
1. Run `tsc --noEmit` — must exit 0 with no errors
2. Start `next dev` — must start without warnings about missing image domains or config errors
3. Navigate to `http://localhost:3000/en/catalog`:
   - [ ] Product grid renders with real DB data
   - [ ] Category filter buttons appear (one per category + "All Items")
   - [ ] Clicking a category updates URL and filters grid
   - [ ] "All Items" clears the filter
4. Click any product card "View Details":
   - [ ] Product detail page renders at `/en/catalog/{slug}`
   - [ ] Product name, description, price, category are visible
   - [ ] Product gallery renders (images or placeholder)
   - [ ] `AvailabilityChecker` date inputs are visible
5. Enter valid dates in `AvailabilityChecker`:
   - [ ] After 400ms, API is called (check Network tab)
   - [ ] Availability result is displayed
   - [ ] Loading state shows while request is in-flight
6. Test invalid date range (end before start):
   - [ ] No API call made
   - [ ] Error message shown inline
7. Navigate to `http://localhost:3000/en/catalog/this-slug-does-not-exist`:
   - [ ] 404 page renders (no 500)
8. Navigate to `http://localhost:3000/es/catalog`:
   - [ ] Spanish labels render correctly
9. Call the API directly: `curl "http://localhost:3000/api/availability?productId=invalid"`:
   - [ ] Returns 400 JSON with error message
10. Check product image renders (MinIO or Unsplash URL):
    - [ ] No "hostname not configured" error in console

**Acceptance criteria:**
- [x] `tsc --noEmit` exits 0 (NFR-04)
- [x] `next build` completes without errors (NFR-04)
- [x] All routes visible in build output: `/[locale]/catalog`, `/[locale]/catalog/[slug]`, `/api/availability`
- [x] No i18n key fallback strings visible in either locale (REQ-06)
- [x] No new npm packages were added (NFR-05) — `package.json` unchanged

---

## Implementation Notes

### Key gotchas to watch for

1. **`searchParams` and `params` are Promises in Next.js 16 App Router** — always `await` them, never destructure directly.

2. **`basePrice` is a Prisma `Decimal`, NOT a plain number** — always call `.toNumber()` at the Server Component boundary before passing to any child component prop. Forgetting this causes RSC serialization errors at runtime.

3. **`$queryRaw` SUM returns BigInt, not number** — either use `::int` cast in SQL or wrap with `Number()`: `const occupied = Number(result[0]?.occupied ?? 0)`. Forgetting this causes `BigInt can't be serialized` errors when trying to use the value in arithmetic.

4. **Both `en.json` and `es.json` must be updated together** — `Messages = typeof en` means any key missing from `es.json` will be a TypeScript error. Update both files in the same commit.

5. **`CategoryFilter` uses `usePathname()` + `useRouter()`, not `useSearchParams()`** — it reads `currentSlug` from the parent Server Component. This means NO Suspense boundary is required around `CategoryFilter`.

6. **`AvailabilityChecker` labels must come from the Server Component** — the Client Component must NOT call `getMessages()` itself. Pass all labels as explicit string props. This keeps the client bundle lean.

7. **`product.stock` can be null for FIXED products** — always guard: `product.stock ?? 0` before arithmetic.

---

## File Summary

| Task | File | Action |
|------|------|--------|
| 0.1 | `next.config.ts` | Modify — add `images.remotePatterns` |
| 0.2 | `messages/en.json` | Modify — add `catalog` namespace |
| 0.3 | `messages/es.json` | Modify — add `catalog` namespace |
| 1.1 | `components/catalog/product-card.tsx` | Create — Server Component |
| 1.2 | `components/catalog/category-filter.tsx` | Create — Client Component |
| 1.3 | `components/catalog/availability-checker.tsx` | Create — Client Component |
| 2.1 | `app/api/availability/route.ts` | Create — API Route |
| 3.1 | `app/[locale]/catalog/page.tsx` | Create — Server Component |
| 3.2 | `app/[locale]/catalog/[slug]/page.tsx` | Create — Server Component |
| 4.1 | `app/[locale]/page.tsx` | Modify — fix `href="#"` nav links |
| 4.2 | _(smoke test)_ | Manual verification |
