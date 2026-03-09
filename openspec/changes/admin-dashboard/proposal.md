## Why

The ecommerce platform currently has no administrative interface, forcing all product management to happen directly through the database or API calls. An admin dashboard provides a centralized UI for store operators to manage the product catalog efficiently.

## What Changes

- Add a protected `/admin` route section accessible only via hardcoded credentials
- Simple login page at `/admin/login` with hardcoded `admin` / `password` credentials
- New product management UI: create, edit, delete products with category assignment and pricing
- Admin layout with sidebar navigation separate from the storefront layout

## Capabilities

### New Capabilities

- `admin-auth`: Hardcoded login page at `/admin/login` — sets a cookie on success; middleware protects all `/admin/*` routes
- `admin-product-management`: Full CRUD interface for products — create, edit, delete, manage inventory and pricing

### Modified Capabilities

<!-- No existing specs are changing requirements -->

## Impact

- New pages under `app/admin/` (Next.js App Router, no locale prefix — admin is internal tooling)
- Server Actions for mutations
- Simple cookie-based auth middleware (no Auth.js or DB involvement)
- Database: products table already exists from schema setup
