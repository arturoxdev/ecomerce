# Base de Datos

**DB:** PostgreSQL | **ORM:** Drizzle ORM | **Auth:** Auth.js v5 con Drizzle Adapter

---

## Multi-Tenant: Aislamiento por `store_id`

Todas las instancias del template comparten una sola base de datos. Cada tienda se identifica por `STORE_ID` (variable de entorno). Ver [ADR-005](decisions/adr-005-multi-tenant-shared-db.md) para la decision completa.

| Tabla | `store_id` | Aislamiento |
|---|---|---|
| `categories` | Directo | `WHERE store_id = $STORE_ID` |
| `products` | Directo | `WHERE store_id = $STORE_ID` |
| `product_variants` | Indirecto | Via FK a `products` |
| `orders` | Directo | `WHERE store_id = $STORE_ID` |
| `order_items` | Indirecto | Via FK a `orders` |
| `availability` | Indirecto | Via FK a `products` |
| `settings` | Directo | `store_id` es PK |
| `zip_delivery_zones` | Directo | `WHERE store_id = $STORE_ID` |
| `about_page_contents` | Directo | `WHERE store_id = $STORE_ID` |
| `legal_page_documents` | Directo | `WHERE store_id = $STORE_ID` |
| `contact_page_contents` | Directo | `WHERE store_id = $STORE_ID` |
| `faq_entries` | Directo | `WHERE store_id = $STORE_ID` |
| `users` | Directo | `WHERE store_id = $STORE_ID` |
| `accounts` | Indirecto | Via FK a `users` |
| `sessions` | Indirecto | Via FK a `users` |
| `verification_tokens` | Compartido | Tabla global de Auth.js |

La funcion `getStoreId()` en `lib/config/tenant.ts` centraliza la lectura de `STORE_ID` y lanza error si no esta definido.

---

## Schema completo (DBML)

```dbml
// E-commerce Template — DB Schema multi-tenant
// https://dbdiagram.io

Table categories {
  id          uuid [pk]
  store_id    text [not null]
  name        text [not null]
  slug        text [not null]
  description text
  sort_order  int [default: 0]
  created_at  timestamp [default: `now()`]
  updated_at  timestamp

  indexes {
    (store_id, slug) [unique, name: 'idx_categories_store_slug']
  }
}

Table products {
  id          uuid [pk]
  store_id    text [not null]
  name        text [not null]
  slug        text [not null]
  description text
  about       text
  base_price  decimal(10,2) [not null]
  price_type  price_type [not null, note: 'FIXED | PER_UNIT']
  stock       int [default: 1]
  photos      text[] [note: 'Array de URLs']
  is_active   boolean [default: true]
  category_id uuid [not null, ref: > categories.id]
  created_at  timestamp [default: `now()`]
  updated_at  timestamp

  indexes {
    (store_id, slug) [unique, name: 'idx_products_store_slug']
  }
}

Table product_variants {
  id         uuid [pk]
  product_id uuid [not null, ref: > products.id]
  name       text [not null]
  price      decimal(10,2) [not null]
  stock      int [default: 1]
  sort_order int [default: 0]
  is_active  boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp
}

Table orders {
  id               uuid [pk]
  store_id         text [not null]
  customer_name    text [not null]
  customer_email   text [not null]
  customer_phone   text [not null]
  delivery_address text
  rent_start_date  timestamp [not null]
  rent_end_date    timestamp [not null]
  subtotal         decimal(10,2) [not null]
  deposit_amount   decimal(10,2) [not null]
  delivery_fee     decimal(10,2) [default: 0]
  total            decimal(10,2) [not null]
  amount_paid      decimal(10,2) [not null]
  square_payment_id text
  payment_status   payment_status [default: 'AUTHORIZED']
  status           order_status [default: 'PENDING']
  created_at       timestamp [default: `now()`]
  updated_at       timestamp
}

Table order_items {
  id         uuid [pk]
  order_id   uuid [not null, ref: > orders.id]
  product_id uuid [not null, ref: > products.id]
  variant_id uuid [ref: > product_variants.id]
  quantity   int [not null]
  unit_price decimal(10,2) [not null]
  subtotal   decimal(10,2) [not null]
}

Table availability {
  id         uuid [pk]
  product_id uuid [not null, ref: > products.id]
  variant_id uuid [ref: > product_variants.id]
  start_date timestamp [not null]
  end_date   timestamp [not null]
  quantity   int [not null, default: 1]
  reason     text
  order_id   uuid [ref: > orders.id, note: 'NULL = bloqueo manual por admin']
  created_at timestamp [default: `now()`]

  indexes {
    (product_id, start_date, end_date) [name: 'idx_availability_lookup']
  }
}

Table settings {
  store_id        text [pk]
  delivery_mode   delivery_mode [default: 'INCLUDED']
  delivery_fee    decimal(10,2)
  deposit_percent decimal(5,4) [default: 0.10]
  updated_at      timestamp
}

Table zip_delivery_zones {
  id       uuid [pk]
  store_id text [not null]
  zip_code text [not null]
  fee      decimal(10,2) [not null]

  indexes {
    (store_id, zip_code) [unique, name: 'idx_zip_store_code']
  }
}

Table about_page_contents {
  id          uuid [pk]
  store_id    text [not null]
  slug        about_page_slug [default: 'about']
  locale      content_locale [not null]
  eyebrow     text [not null]
  title       text [not null]
  subtitle    text [not null]
  story_title text [not null]
  story_body  text [not null]
  values_title text [not null]
  values_body text [not null]
  created_at  timestamp [default: `now()`]
  updated_at  timestamp

  indexes {
    (store_id, slug, locale) [unique, name: 'idx_about_page_locale']
  }
}

Table legal_page_documents {
  id         uuid [pk]
  store_id   text [not null]
  slug       legal_page_slug [not null]
  locale     content_locale [not null]
  title      text [not null]
  subtitle   text [not null]
  body       text [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp

  indexes {
    (store_id, slug, locale) [unique, name: 'idx_legal_page_locale']
  }
}

Table contact_page_contents {
  id             uuid [pk]
  store_id       text [not null]
  slug           contact_page_slug [default: 'contact']
  locale         content_locale [not null]
  title          text [not null]
  subtitle       text [not null]
  location       text [not null]
  phone          text [not null]
  email          text [not null]
  business_hours text [not null]
  created_at     timestamp [default: `now()`]
  updated_at     timestamp

  indexes {
    (store_id, slug, locale) [unique, name: 'idx_contact_page_locale']
  }
}

Table faq_entries {
  id         uuid [pk]
  store_id   text [not null]
  locale     content_locale [not null]
  question   text [not null]
  answer     text [not null]
  sort_order int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp

  indexes {
    (locale, sort_order) [name: 'idx_faq_locale_order']
  }
}

// --- Auth.js v5 (Drizzle Adapter) ---

Table users {
  id             uuid [pk]
  store_id       text [not null]
  name           text
  email          text [not null]
  email_verified timestamp
  image          text
  password_hash  text
  role           user_role [default: 'EMPLOYEE']
  is_active      boolean [default: true]
  created_at     timestamp [default: `now()`]
  updated_at     timestamp

  indexes {
    (store_id, email) [unique, name: 'idx_users_store_email']
  }
}

Table accounts {
  id                  uuid [pk]
  user_id             uuid [not null, ref: > users.id]
  type                text [not null]
  provider            text [not null]
  provider_account_id text [not null]
  refresh_token       text
  access_token        text
  expires_at          int
  token_type          text
  scope               text
  id_token            text
  session_state       text

  indexes {
    (provider, provider_account_id) [unique, name: 'idx_accounts_provider']
  }
}

Table sessions {
  id            uuid [pk]
  session_token text [unique, not null]
  user_id       uuid [not null, ref: > users.id]
  expires       timestamp [not null]
}

Table verification_tokens {
  identifier text [not null]
  token      text [not null]
  expires    timestamp [not null]

  indexes {
    (identifier, token) [unique, name: 'idx_verification_tokens']
  }
}

// --- Enums ---

Enum price_type {
  FIXED    [note: 'Precio fijo por tiempo']
  PER_UNIT [note: 'Precio por unidad']
}

Enum payment_status {
  AUTHORIZED
  CAPTURED
  VOIDED
  FAILED
}

Enum order_status {
  PENDING
  CONFIRMED
  DELIVERED
  RETURNED
  CANCELLED
}

Enum delivery_mode {
  INCLUDED
  FIXED_FEE
  ZIP_CODE
}

Enum user_role {
  ROOT
  ADMIN
  EMPLOYEE
}

Enum content_locale {
  en
  es
}
```

---

## Decisiones de Diseno

**Fechas compartidas por orden, no por item:** Todos los `order_items` de una misma orden comparten `rent_start_date` / `rent_end_date` definidos en `orders`. Simplifica el modelo y es suficiente para el negocio actual (el cliente siempre renta todo para el mismo evento).

**`availability.quantity` para PER_UNIT:** En lugar de crear un registro por unidad, se guarda la cantidad comprometida en un solo registro por rango de fechas. Esto hace el `SUM(quantity) FOR UPDATE` eficiente y el indice compuesto en `(product_id, start_date, end_date)` lo acelera.

**`order_id = NULL` en availability:** Permite que el admin bloquee fechas manualmente sin crear una orden (ej. equipo en mantenimiento).

**`square_payment_id` unico para todo el ciclo:** Square usa el mismo `payment.id` para AUTHORIZE, CAPTURE y VOID.

**`settings` con PK `store_id`:** Una fila de configuracion por tienda. En el modelo anterior era un ID fijo `'global'`; ahora cada tienda tiene su propia configuracion.

**Unique constraints incluyen `store_id`:** Slugs, emails, y zip codes son unicos por tienda, no globalmente. Dos tiendas pueden tener un producto con slug `sillas-doradas`.

**Indice critico en `availability`:**
```sql
INDEX idx_availability_lookup ON availability(product_id, start_date, end_date)
```
Sin este indice, el `FOR UPDATE` haria full table scan en checkout.
