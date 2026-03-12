## Exploration: CON-71 — Catalog & Real-Time Availability (SPEC-03)

### Current State

**Project:** Festejos Aurora — `/Users/arturo/git/ecomerce`
**Next.js version:** 16.1.6 (note: config says Next.js 14 but package.json is 16.1.6)
**React:** 19.2.3
**Prisma:** 7.4.2 with `@prisma/adapter-pg` (edge-compatible pool)

#### What's Already Done

**SPEC-01 (Project Foundation) — COMPLETE:**
- Full Prisma schema: `categories`, `products`, `orders`, `order_items`, `availability`, `settings`, `zip_delivery_zones`, `users`, `accounts`, `sessions`
- Single migration `20260302120000_init` applied — DB is migrated with all tables
- Availability table has the required composite index: `idx_availability_lookup (productId, startDate, endDate)`
- Seed script with 3 products (1 FIXED inflatable, 1 PER_UNIT chair, 1 FIXED table) and 3 categories
- Docker Compose setup (not inspected but implied by `docker-compose.yml` in root)
- i18n: custom solution (no next-intl) — `lib/i18n/config.ts` + `lib/i18n/messages.ts` + `messages/en.json` + `messages/es.json`
- Image storage: MinIO/S3-compatible via `@aws-sdk/client-s3` at `lib/minio.ts`; upload API at `POST /api/admin/upload`

**Admin Dashboard (admin-dashboard change) — COMPLETE:**
- All tasks [x] in `openspec/changes/admin-dashboard/tasks.md`
- Full admin CRUD for products and categories
- Cookie-based auth (hardcoded credentials, NO middleware.ts — auth check likely missing or inline)
- Admin sidebar with Products + Categories nav
- shadcn/ui installed: button, input, label, table, dialog, alert-dialog, select, badge, pagination, card, separator, sonner

**SPEC-02 (Site Shell & Landing Page) — PARTIALLY DONE:**
- Landing page exists at `app/[locale]/page.tsx` with header, hero, product grid (static data), and footer
- Header has locale switcher and nav links (all `href="#"` — not yet real routes)
- Product grid uses hardcoded data from `messages/en.json` (not from DB)
- No separate layout shell with persistent header/footer — everything is inline in `page.tsx`
- Bilingüe: EN/ES via `messages/en.json` and `messages/es.json`
- No separate catalog or product detail pages exist yet

**SPEC-03 (Catalog & Real-Time Availability) — NOT STARTED:**
- No `app/[locale]/catalog/` directory
- No `app/[locale]/products/` directory
- No `app/api/availability/` route
- No date picker component
- No cart state

#### Routing Architecture

```
app/
  layout.tsx                  → Root layout (Geist font, html/body)
  page.tsx                    → Redirects to /en
  globals.css                 → Tailwind + shadcn + brand colors

  [locale]/
    layout.tsx                → Locale validation + lang attr
    page.tsx                  → Full landing page (static, inline)

  admin/                      → Admin section (no locale prefix)
    layout.tsx                → AdminSidebar + Toaster
    page.tsx                  → Redirects to /admin/products
    actions.ts                → loginAdmin + logoutAdmin
    login/page.tsx
    products/                 → CRUD (page, new, [id]/edit, actions.ts, product-form, product-table)
    categories/               → CRUD (page, new, [id]/edit, actions.ts, category-form, category-table)

  api/
    admin/
      upload/route.ts         → POST — MinIO upload
```

**Missing:** No `middleware.ts` in project root! The admin-dashboard tasks list middleware as complete, but the file doesn't exist. This means `/admin` is currently unprotected.

#### i18n Pattern

The project uses a **custom i18n solution**, NOT next-intl:
- `locales = ["en", "es"]`, `defaultLocale = "en"`
- `getMessages(locale)` returns typed dictionary from `messages/en.json` or `messages/es.json`
- Route structure: `app/[locale]/page` → params.locale validated
- LocaleSwitcher replaces first path segment with target locale
- Messages are typed via `typeof en` — adding new keys requires updating BOTH `en.json` and `es.json`
- No `next-intl` library — the tech stack doc mentions next-intl but it's NOT installed

#### Design System

- **Font:** Plus Jakarta Sans (Google Fonts) + Geist fallback
- **Colors:** `--color-primary: #f28b0d` (orange), `--color-secondary: #2d6a4f` (green)
- **Tailwind v4** with `@theme` block in `globals.css` (NOT tailwind.config.js)
- **shadcn/ui** for UI components (Tailwind v4 compatible variant)
- **Lucide React** for icons
- **Sonner** for toasts (already in admin)
- Card style from landing: `rounded-xl border border-slate-100 bg-background-light p-4 shadow-sm hover:shadow-lg`

#### DB Singleton Pattern

```ts
// lib/db.ts — Prisma with PgAdapter (edge-compatible)
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter, log: [...] })
```

#### Server Actions Pattern (admin)

```ts
// "use server" at top of file
export type ProductFormState = { success?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState>
```

#### API Route Pattern

```ts
// app/api/.../route.ts
import { NextRequest, NextResponse } from 'next/server'
export async function POST(request: NextRequest) { ... return NextResponse.json({ url }) }
```

### Affected Areas

For SPEC-03, these are new files to create:

| File | Purpose |
|------|---------|
| `app/[locale]/catalog/page.tsx` | Catalog grid + category filter |
| `app/[locale]/catalog/[slug]/page.tsx` | Product detail page |
| `app/api/availability/route.ts` | GET endpoint for availability check |
| `components/catalog/product-card.tsx` | Product card component (used in grid) |
| `components/catalog/category-filter.tsx` | Category filter buttons (client) |
| `components/catalog/availability-checker.tsx` | Date picker + real-time availability (client) |
| `messages/en.json` | Add catalog + product detail i18n keys |
| `messages/es.json` | Mirror new keys in Spanish |

Also need to update landing page navigation hrefs to point to real `/[locale]/catalog` routes.

### Approaches

#### 1. Full Server Components + URL-state for filter (Recommended)

Catalog page is a Server Component that reads `?category=slug` from searchParams. Category filter is a Client Component that updates URL param using `useRouter().push()`. Product cards link to detail pages. Availability checker is a Client Component making fetch calls to `/api/availability`.

- **Pros:** SEO-friendly, sharable filter URLs, minimal client JS for catalog grid, follows existing admin pattern
- **Cons:** Category filter navigation causes full server round-trip
- **Effort:** Medium

#### 2. Full Client Component catalog

Catalog page is a Client Component with local state for selected category. No URL params.

- **Pros:** Instant filter switching without navigation
- **Cons:** Not SEO-friendly, can't bookmark filtered view, breaks Next.js SSR model used by rest of app
- **Effort:** Low but wrong

#### 3. Server Component + React Server Component streaming

Use Suspense with `loading.tsx` for product grid while category filter is instantly interactive.

- **Pros:** Best perceived performance
- **Cons:** Slightly more complex streaming setup; overkill for small catalog
- **Effort:** Medium-High

### Recommendation

**Approach 1 — Server Components + URL state for filter.**

Matches the existing pattern in admin (Server Components for reads, Client Components for interactions). The catalog is expected to be small (< 100 products), so SSR per filter change is fine. Key design decisions:

1. **Catalog page:** `app/[locale]/catalog/page.tsx` — Server Component; reads `searchParams.category`; fetches products with category include; passes to grid
2. **Category filter:** `components/catalog/category-filter.tsx` — `"use client"` — uses `usePathname` + `useRouter` to push `?category=slug` (mirrors LocaleSwitcher pattern)
3. **Product detail:** `app/[locale]/catalog/[slug]/page.tsx` — Server Component; fetches product by slug with `notFound()` fallback; renders gallery + availability checker
4. **Availability API:** `app/api/availability/route.ts` — `GET /api/availability?productId=&start=&end=` → raw SQL `SELECT SUM(quantity)` with date overlap; returns `{ available: number }`
5. **Availability checker:** Client Component — date range inputs + debounced fetch to `/api/availability`; shows "Available" / "X units available" / "Not available"

**Availability SQL query:**
```sql
SELECT COALESCE(SUM(quantity), 0) as occupied
FROM availability
WHERE product_id = $productId
  AND start_date < $end
  AND end_date > $start
```
Then:
- FIXED: available = occupied >= 1 ? 0 : 1
- PER_UNIT: available = stock - occupied (min 0)

Use `db.$queryRaw` or `db.availability.aggregate` with Prisma.

**Date picker:** No native date range picker exists in shadcn v4 — use native HTML `<input type="date">` for MVP (matches minimal approach in existing code). Can upgrade to a proper picker later.

### Gaps and Unknowns

1. **No middleware.ts** — Admin routes are currently unprotected. Not blocking SPEC-03 but a security gap to note.
2. **`next-intl` not installed** — Tech stack doc mentions it but the project uses a custom messages system. SPEC-03 must add catalog keys to `messages/en.json` and `messages/es.json`.
3. **`next.config.ts` is empty** — No image domains configured. Product photos stored in MinIO. If displaying product images in catalog, may need to add `images.remotePatterns` for MinIO domain.
4. **Product photos from seed are Unsplash URLs** — These work without config. Real MinIO URLs will need `remotePatterns` config.
5. **No cart state yet** — SPEC-03 requires "Book Now" / "Add to Cart" buttons but cart is SPEC-04. SPEC-03 should show availability but the CTA button can be a placeholder or link to checkout with query params.
6. **Landing page product grid is static** — After SPEC-03, nav links should point to `/[locale]/catalog`. The landing page "Our Equipment" section could optionally be connected to real DB data, but that's SPEC-02 territory.
7. **Date overlap logic edge cases** — Need to decide: are start/end dates inclusive? Is a 1-day rental `start = end`? Based on the schema using `Timestamp(6)` (datetime, not date), the overlap query `start_date < $end AND end_date > $start` assumes end is exclusive (return day = next renter's start day).

### Ready for Proposal

**Yes** — the codebase is well-understood. The implementation path is clear. SPEC-03 is a greenfield addition with no conflicts with existing code.

Key decisions to confirm in proposal:
- Date picker: native HTML `<input type="date">` vs. library (react-day-picker or similar)
- CTA button in catalog: "View Details" link → detail page, or "Add to Cart" (premature for SPEC-03)?
- Debounce delay for real-time availability (suggested: 400ms)
- Whether `GET /api/availability` requires authentication (no — it's public catalog data)
