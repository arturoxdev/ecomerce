## 1. Auth & Route Protection

- [x] 1.1 Add admin route matcher to `middleware.ts` — redirect requests without `admin-session` cookie away from `/admin/*` (excluding `/admin/login`) to `/admin/login`
- [x] 1.2 Create `app/admin/login/page.tsx` — login form with username and password fields
- [x] 1.3 Create Server Action `loginAdmin` — check `username === "admin" && password === "password"`, set `admin-session` cookie (httpOnly, path `/admin`), redirect to `/admin/products` on success or return `{ error }` on failure
- [x] 1.4 Create Server Action `logoutAdmin` — clear `admin-session` cookie and redirect to `/admin/login`
- [x] 1.5 Add logout button to admin layout that calls `logoutAdmin`

## 0. Setup

- [x] 0.1 Install shadcn/ui: `npx shadcn@latest init` — configure for the project, then install required components: `button input label table dialog alert-dialog form select badge pagination card separator`

## 2. Admin Layout

- [x] 2.1 Create `app/admin/layout.tsx` with fixed dark sidebar (`bg-gray-900`, 240px) and `bg-gray-50` content area
- [x] 2.2 Create sidebar component with Lucide icons per nav item (`Package` for Products), active state (`bg-gray-800`), app name "Aurora Admin" header, and logout footer button (`LogOut` icon)

## 3. Product Management

- [x] 3.1 Create `app/admin/products/page.tsx` — server component with `page` searchParam support → Prisma `skip`/`take` (PAGE_SIZE = 20), fetching products and rendering product table
- [x] 3.2 Create product table UI (name, category, price, stock, active status, edit/delete actions); use `Pencil` and `Trash2` Lucide icons for row actions; add shadcn `Pagination` component below table
- [x] 3.3 Create `app/admin/products/new/page.tsx` with product creation form
- [x] 3.4 Create product form component (fields: name, slug, description, category select, base price, price type, stock, photos, isActive)
- [x] 3.5 Create Server Action `createProduct` — validates input, calls `prisma.product.create`, returns `{ success, error }`
- [x] 3.6 Create `app/admin/products/[id]/edit/page.tsx` — fetch product by ID, render pre-filled form
- [x] 3.7 Create Server Action `updateProduct` — validates input, calls `prisma.product.update`
- [x] 3.8 Create Server Action `deleteProduct` — calls `prisma.product.delete`, handles Restrict constraint error gracefully
- [x] 3.9 Add delete confirmation dialog to product table row actions

## 4. Polish & Defaults

- [x] 4.1 Add default pagination (`take: 50`) to all Prisma list queries in admin
- [x] 4.2 Add empty state component for product list
- [x] 4.3 Add success/error toast notifications for all Server Action outcomes
