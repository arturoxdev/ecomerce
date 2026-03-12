## ADDED Requirements

### Requirement: Admin can log in
The system SHALL allow access to the admin dashboard only after successful login with hardcoded credentials (`admin` / `password`).

#### Scenario: Successful login
- **WHEN** an admin submits the login form with username `admin` and password `password`
- **THEN** the system sets an `admin-session` cookie and redirects to `/admin/products`

#### Scenario: Failed login
- **WHEN** an admin submits the login form with incorrect credentials
- **THEN** the system displays an error message and does not set the cookie

### Requirement: Admin is redirected to login when not authenticated
The system SHALL protect all `/admin/*` routes (except `/admin/login`) and redirect unauthenticated requests to `/admin/login`.

#### Scenario: Unauthenticated access to admin route
- **WHEN** a user navigates to any `/admin/*` path without an `admin-session` cookie
- **THEN** the system redirects them to `/admin/login`

#### Scenario: Authenticated access to admin route
- **WHEN** a user navigates to any `/admin/*` path with a valid `admin-session` cookie
- **THEN** the system renders the requested admin page

### Requirement: Admin can view product list
The system SHALL display a paginated list of all products (active and inactive) with name, category, price, stock, and status visible at a glance.

#### Scenario: Admin loads product list
- **WHEN** an admin navigates to `/admin/products`
- **THEN** the system displays a table of products with columns: name, category, base price, stock, active status, and actions

#### Scenario: Empty product catalog
- **WHEN** no products exist in the database
- **THEN** the system displays an empty state message and a "Create product" button

### Requirement: Admin can create a product
The system SHALL allow admins to create a new product with name, slug, description, category, base price, price type, stock, and photos.

#### Scenario: Successful product creation
- **WHEN** an admin submits a valid product form
- **THEN** the system creates the product via Server Action and redirects to the product list with a success notification

#### Scenario: Slug conflict on creation
- **WHEN** an admin submits a product with a slug that already exists
- **THEN** the system displays an inline error on the slug field and does not create the product

#### Scenario: Missing required fields
- **WHEN** an admin submits the form without required fields (name, slug, category, base price, price type)
- **THEN** the system displays field-level validation errors and does not submit

### Requirement: Admin can edit a product
The system SHALL allow admins to update any field of an existing product.

#### Scenario: Successful product update
- **WHEN** an admin edits a product and submits the form
- **THEN** the system updates the product record and shows a success notification

#### Scenario: Deactivate a product
- **WHEN** an admin toggles `isActive` to false and saves
- **THEN** the product is marked inactive and no longer appears on the public storefront

### Requirement: Admin can delete a product
The system SHALL allow admins to delete a product that has no associated order items.

#### Scenario: Delete product with no orders
- **WHEN** an admin confirms deletion of a product with no order items
- **THEN** the system deletes the product and removes it from the list

#### Scenario: Delete blocked by order items
- **WHEN** an admin attempts to delete a product that has associated order items
- **THEN** the system displays an error message and does not delete the product (Prisma `onDelete: Restrict` enforces this)
