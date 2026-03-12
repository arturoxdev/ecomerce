# Proposal: Catalog & Real-Time Availability (SPEC-03)

**Change name:** catalog-availability  
**Linear issue:** CON-71  
**Project:** Festejos Aurora — `/Users/arturo/git/ecomerce`  
**Status:** Proposed  
**Date:** 2026-03-12

---

## Intent

SPEC-03 delivers the public-facing product catalog and real-time availability checking for Festejos Aurora, a party equipment rental business.

**Problem:** The site currently has a static landing page with hardcoded product data and `href="#"` nav links. Customers cannot browse the actual rental inventory, see product details, or check whether a product is available for their event date. This blocks any path to booking.

**Goal:** Build a fully functional, bilingual (EN/ES) product catalog that:
1. Displays all active products from the database
2. Allows filtering by category
3. Shows individual product detail pages
4. Lets customers check real-time availability for any date range
5. Is SEO-friendly and shareable (URL-driven state)

This change creates the browsing foundation. Cart/checkout/booking flow is deferred to SPEC-04.

---

## Scope

### In Scope

1. **Catalog page** — `/[locale]/catalog` — Server Component grid of all active products with category filter
2. **Category filter** — Client Component, URL-searchParam based (`?category=slug`), shareable, SEO-friendly
3. **Product detail page** — `/[locale]/catalog/[slug]` — Server Component with product info, gallery, and availability checker
4. **Availability API** — `GET /api/availability?productId=&start=&end=` — public endpoint implementing FIXED and PER_UNIT business logic
5. **Availability checker** — Client Component with native date inputs, debounced real-time fetch (400ms delay), displays availability status clearly
6. **i18n keys** — Add all new catalog/product/availability strings to `messages/en.json` and `messages/es.json`
7. **Fix landing nav links** — Update `href="#"` in landing page header to real `/[locale]/catalog` route
8. **Fix next.config.ts** — Add `images.remotePatterns` for MinIO domain (enables real product photos from MinIO in addition to Unsplash seed URLs)
9. **Product card component** — Reusable card used in both catalog grid and (optionally) landing page

### Out of Scope

- **Cart / Add to Cart CTA** — belongs to SPEC-04; product detail will show availability but CTA is "View Details" only (or a placeholder "Request Booking" with no action)
- **Checkout / booking flow** — SPEC-04
- **Landing page product grid DB connection** — connecting the landing page's static product section to real DB data is SPEC-02 territory; out of scope
- **Admin middleware / route protection** — security gap noted but not part of this change
- **Date range picker library** — native `<input type="date">` only for MVP; upgrade is a future enhancement
- **Product reviews or ratings** — not in schema, not needed
- **Search / full-text filter** — category filter only for MVP

---

## Approach

### Architecture: Server Components + URL State

All catalog data-fetching happens in Server Components (no client-side data fetching for the grid). Client Components handle interactivity only (category filter updates, date picker + availability fetch).

This approach:
- Matches existing patterns in the admin dashboard (Server Components for reads, Client Components for mutations/interactions)
- Is SEO-friendly — catalog URLs are crawlable with filter state in URL
- Allows instant hydration with zero layout shift
- Keeps client bundle minimal

### Data Flow

```
URL: /en/catalog?category=inflatables
  │
  ▼
app/[locale]/catalog/page.tsx (Server Component)
  ├── reads searchParams.category
  ├── fetches products from DB via Prisma (with category include)
  └── renders:
      ├── <CategoryFilter /> (Client — updates URL params)
      └── <ProductCard />[] (Server — links to detail pages)

URL: /en/catalog/inflatable-bouncy-castle
  │
  ▼
app/[locale]/catalog/[slug]/page.tsx (Server Component)
  ├── fetches product by slug from DB
  └── renders:
      ├── Product gallery (next/image from MinIO or Unsplash)
      ├── Product info (name, desc, pricing, type)
      └── <AvailabilityChecker productId={...} pricingModel={...} stock={...} /> (Client)

User picks dates in AvailabilityChecker
  │
  ▼ (debounced 400ms)
GET /api/availability?productId=X&start=YYYY-MM-DD&end=YYYY-MM-DD
  │
  ▼
app/api/availability/route.ts
  ├── validates params
  ├── queries DB: SELECT COALESCE(SUM(quantity), 0) as occupied
  │              FROM availability
  │              WHERE product_id = $productId
  │                AND start_date < $end
  │                AND end_date > $start
  ├── applies business logic:
  │   FIXED → available = occupied >= 1 ? 0 : 1
  │   PER_UNIT → available = max(0, stock - occupied)
  └── returns: { available: number, pricingModel: string }
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Category filter state | URL `?category=slug` | Shareable, SEO-friendly, matches Next.js RSC model |
| Date picker | Native `<input type="date">` | No extra dependency, matches minimal approach in existing code; upgrade later |
| Availability debounce | 400ms | Prevents API flood on rapid date typing |
| Overlap SQL | `start < $end AND end > $start` | Standard exclusive-end overlap formula |
| FIXED logic | `occupied >= 1 ? 0 : 1` | Item is either booked or free |
| PER_UNIT logic | `max(0, stock - SUM(occupied))` | Aggregate quantity against stock |
| Auth on availability API | None (public) | Catalog is public; no user auth needed for read |
| CTA on detail page | "View Details" / info only | Cart is SPEC-04; no premature booking button |
| Image display | `next/image` with `remotePatterns` | MinIO + Unsplash both need config |

---

## Key Files

### New Files to Create

| File | Type | Description |
|------|------|-------------|
| `app/[locale]/catalog/page.tsx` | Server Component | Catalog grid; reads `searchParams.category`; fetches all active products with their categories; renders category filter + product card grid |
| `app/[locale]/catalog/[slug]/page.tsx` | Server Component | Product detail; fetches product by slug with `notFound()` fallback; renders gallery, info, and availability checker |
| `app/api/availability/route.ts` | API Route | `GET` handler; validates `productId`, `start`, `end` query params; runs overlap SQL; applies FIXED/PER_UNIT logic; returns `{ available: number }` |
| `components/catalog/product-card.tsx` | Server Component | Reusable card: product image (next/image), name, category badge, pricing info, "View Details" link |
| `components/catalog/category-filter.tsx` | Client Component (`"use client"`) | Pill buttons for each category; reads current filter from `useSearchParams()`; updates via `router.push()` with `?category=slug` |
| `components/catalog/availability-checker.tsx` | Client Component (`"use client"`) | Two `<input type="date">` inputs (start/end); debounced fetch to `/api/availability`; displays loading state + result (available / N units available / not available) |

### Files to Modify

| File | Change |
|------|--------|
| `app/[locale]/page.tsx` | Update nav `href="#"` links to `/[locale]/catalog`; fix "View All" or "Our Equipment" links if present |
| `messages/en.json` | Add catalog namespace: `catalog.title`, `catalog.filterAll`, `catalog.noProducts`, `catalog.viewDetails`, `catalog.availability.*`, `catalog.product.*` |
| `messages/es.json` | Mirror all new English keys in Spanish |
| `next.config.ts` | Add `images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost', port: '9000' }] }` for MinIO; keep Unsplash working too |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `next/image` fails for MinIO URLs (no `remotePatterns`) | High | Medium — product images broken | Fix `next.config.ts` as part of this change; confirmed required |
| Slug collisions (two products with same slug) | Low | Medium — 404 or wrong product shown | Prisma schema has `slug @unique` constraint; DB enforces uniqueness |
| Availability query incorrect (off-by-one on dates) | Medium | High — wrong availability shown to customer | Write explicit unit tests for the overlap logic; use `exclusive end` convention consistently |
| `messages/*.json` key mismatch (added to EN but not ES, or typo) | Medium | Low — translation falls back to key string | Enforce convention: always update both files; TypeScript types will catch missing keys |
| Admin routes still unprotected (no middleware.ts) | High | High (security) | **OUT OF SCOPE** — flag as separate issue; document risk in Linear |
| Landing page static product grid not updated | Low | Low — cosmetic inconsistency | Out of scope; catalog is the canonical product list |
| Prisma `$queryRaw` SQL injection (if params not sanitized) | Medium | High | Use parameterized queries: `db.$queryRaw\`...\`` with template literals (Prisma auto-parameterizes) |
| PER_UNIT stock undefined (product has no stock field) | Low | Medium — division/null error | Guard: if `pricingModel === 'PER_UNIT' && !product.stock` return 0; log warning |

---

## Rollback Plan

All changes in this PR are **additive**:
- New pages in `app/[locale]/catalog/` — delete the directory to revert
- New API route `app/api/availability/` — delete to revert
- New components in `components/catalog/` — delete to revert
- `messages/*.json` additions — remove the `catalog` key block
- `next.config.ts` change — revert `remotePatterns` addition
- Landing page `href` fix — revert to `href="#"` (non-breaking)

No database schema changes. No migrations needed. Rollback is safe and non-destructive.

---

## Dependencies

- **SPEC-01 complete** ✅ — Prisma schema with `products`, `categories`, `availability` tables is migrated and seeded
- **Admin Dashboard complete** ✅ — Products and categories are manageable via admin; catalog displays real data
- **shadcn/ui installed** ✅ — `card`, `badge`, `button` components available
- **Lucide React installed** ✅ — Icons for UI elements
- **MinIO running** — Required for product image uploads; catalog displays these images
- No new npm packages required — everything needed is already installed

---

## Success Criteria

- [ ] `/en/catalog` renders all active products from the database
- [ ] `/es/catalog` renders the same products with Spanish labels
- [ ] Category filter (`?category=slug`) filters the grid correctly; "All" shows everything
- [ ] Clicking a product navigates to `/[locale]/catalog/[slug]` with correct product data
- [ ] Non-existent slugs return 404 (not crash)
- [ ] Availability checker fetches real data from DB when user selects dates
- [ ] FIXED product shows "Available" or "Not available" correctly
- [ ] PER_UNIT product shows correct unit count (e.g., "8 units available")
- [ ] Availability is debounced — no API call until 400ms after last date change
- [ ] Landing page nav links navigate to `/[locale]/catalog` (not `href="#"`)
- [ ] Product images display correctly (MinIO URLs and Unsplash seed URLs)
- [ ] Both EN and ES translations render without missing keys
- [ ] `GET /api/availability` returns 400 for missing/invalid params
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] No runtime errors in development (`next dev`)
