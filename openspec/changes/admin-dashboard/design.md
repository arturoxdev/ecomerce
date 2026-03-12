## Context

The project is a Next.js App Router ecommerce app with i18n (`app/[locale]/`), Prisma + PostgreSQL. No admin UI exists today. Product and Category models are fully defined in the schema. Admin is internal tooling — no i18n needed.

## Goals / Non-Goals

**Goals:**
- Hardcoded login at `/admin/login` with cookie-based session protection
- Protected admin section at `app/admin/` — middleware redirects unauthenticated requests to login
- Product CRUD: list, create, edit, delete with category assignment and stock management
- Shared admin layout (sidebar) separate from the storefront layout

**Non-Goals:**
- Order management (out of scope for now)
- Analytics or reporting charts
- Customer account management
- Settings/configuration UI
- Role management, user creation, or Auth.js integration for admin
- i18n in admin pages

## Decisions

### Route structure: separate `app/admin/` root (no locale prefix)
Admin is internal tooling used by operators, not customers. Keeping it under `app/admin/` avoids locale prefix complexity and keeps it clearly separated from the storefront. No i18n needed.

### Auth guard: hardcoded credentials + cookie + middleware
Username `admin` / password `password` are checked server-side on login form submit. On success, an `admin-session` cookie is set (httpOnly, path `/admin`). `middleware.ts` validates this cookie on every `/admin/*` request (excluding `/admin/login`) and redirects to `/admin/login` if missing. **No Auth.js or DB lookup involved.** This is MVP/dev mode.

```
POST /admin/login (Server Action)
  → if username === "admin" && password === "password"
  → cookies().set("admin-session", "1", { httpOnly: true, path: "/admin" })
  → redirect("/admin/products")
  → else: return { error: "Invalid credentials" }

middleware.ts
  → match /admin/* (excluding /admin/login)
  → if !cookies().get("admin-session") → redirect("/admin/login")
```

### Data access: Server Actions
Use Next.js Server Actions for mutations (create, update, delete) and Server Components for reads. No new REST API routes needed. This keeps admin logic server-side and avoids exposing admin endpoints publicly.

### UI components: shadcn/ui
Reuse shadcn components (Table, Dialog, Form, Select, Badge) for consistent styling. Admin-specific layout components (sidebar, header) will be custom.

### Image handling: existing `photos` array field
Products already have a `photos: String[]` field. For MVP, accept image URLs manually. File upload support is a future enhancement.

## UI Design System

### Palette (Neutral admin — distinct from storefront)
- Sidebar: `bg-gray-900` text white — dark sidebar, clean separation from storefront orange/green
- Content area: `bg-gray-50` page background, `bg-white` card/panel backgrounds
- Borders: `border-gray-200`
- Active nav item: `bg-gray-800` with white text
- Action accents (buttons, badges): use shadcn defaults (slate/zinc)

### Icon library: Lucide React (already installed)
- Each sidebar nav item has a Lucide icon to its left
- Action icons in table rows: `Pencil` (edit), `Trash2` (delete)
- Login page: `Lock` icon
- Logout button: `LogOut` icon

### Component foundation: shadcn/ui
- Must be installed before building any admin UI (`npx shadcn@latest init`)
- Components to install: `button`, `input`, `label`, `table`, `dialog`, `alert-dialog`, `form`, `select`, `badge`, `pagination`, `card`, `separator`, `toast`
- Form validation via `react-hook-form` + `zod` (shadcn default)

### Sidebar anatomy
- Fixed left sidebar, 240px wide on desktop
- Header: app name "Aurora Admin" with a small logo/icon
- Nav section list — each item has: Lucide icon + label + active state
- Sections added progressively as features are built. Initial section: **Products** (`Package` icon)
- Future sections (not built now): Orders, Categories, Settings
- Footer: Logout button (`LogOut` icon)
- No collapsible behavior needed for MVP — always visible

### Table pagination
- State lives in URL: `?page=1` (searchParam)
- Server component reads `page` param → computes `skip = (page - 1) * PAGE_SIZE`, `take = PAGE_SIZE` (default 20)
- Render shadcn `Pagination` component below the table with prev/next and page numbers
- Each pagination link updates the URL searchParam

### Minimalist principles
- No decorative elements, gradients, or shadows beyond subtle card borders
- Typography: inherit project font (Plus Jakarta Sans) — bold headings, regular body
- Tables: alternating row hover (`hover:bg-gray-50`), no zebra striping
- Dialogs (delete confirmation): simple shadcn `AlertDialog`, no custom styling

## Risks / Trade-offs

- **Hardcoded credentials** → Not suitable for production. Mitigation: document this clearly; replace with real auth before going live.
- **No pagination on first pass** → Large product lists may be slow. Mitigation: add `take`/`skip` defaults (e.g., 50 items) from the start.
- **Server Actions error handling** → Unhandled errors surface as unformatted errors. Mitigation: wrap all actions in try/catch and return typed `{ success, error }` objects.
