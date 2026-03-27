# Base de Datos — Festejos Aurora

**DB:** PostgreSQL | **ORM:** Prisma | **Auth:** Auth.js v5 con Prisma Adapter

---

## Schema completo (DBML)

```dbml
// Festejos Aurora — DB Schema completo
// https://dbdiagram.io

Table categories {
  id          varchar [pk]
  name        varchar [not null]
  slug        varchar [unique, not null]
  description text
  createdAt   timestamp [default: `now()`]
  updatedAt   timestamp
}

Table products {
  id          varchar [pk]
  name        varchar [not null]
  slug        varchar [unique, not null]
  description text
  basePrice   decimal(10,2) [not null]
  priceType   price_type [not null, note: 'FIXED | PER_UNIT']
  stock       int [default: 1]
  photos      text[] [note: 'Array de URLs']
  isActive    boolean [default: true]
  categoryId  varchar [not null, ref: > categories.id]
  createdAt   timestamp [default: `now()`]
  updatedAt   timestamp
}

Table orders {
  id              varchar [pk]
  customerName    varchar [not null]
  customerEmail   varchar [not null]
  customerPhone   varchar [not null]
  deliveryAddress text
  rentStartDate   timestamp [not null, note: 'Todos los items comparten estas fechas. También alimenta el calendario admin.']
  rentEndDate     timestamp [not null]
  subtotal        decimal(10,2) [not null]
  depositAmount   decimal(10,2) [not null]
  deliveryFee     decimal(10,2) [default: 0]
  total           decimal(10,2) [not null]
  amountPaid      decimal(10,2) [not null, note: '50% anticipo cobrado online con Square']
  squarePaymentId varchar
  paymentStatus   payment_status [default: 'AUTHORIZED']
  status          order_status [default: 'PENDING']
  createdAt       timestamp [default: `now()`]
  updatedAt       timestamp
}

Table order_items {
  id        varchar [pk]
  orderId   varchar [not null, ref: > orders.id]
  productId varchar [not null, ref: > products.id]
  quantity  int [not null]
  unitPrice decimal(10,2) [not null]
  subtotal  decimal(10,2) [not null]
}

Table availability {
  id        varchar [pk]
  productId varchar [not null, ref: > products.id]
  startDate timestamp [not null]
  endDate   timestamp [not null]
  quantity  int [not null, default: 1, note: 'Unidades comprometidas. FIXED=1 siempre. PER_UNIT=cantidad rentada.']
  orderId   varchar [ref: > orders.id, note: 'NULL = bloqueo manual por admin']
  createdAt timestamp [default: `now()`]

  indexes {
    (productId, startDate, endDate) [name: 'idx_availability_lookup']
  }
}

Table settings {
  id             varchar [pk, default: 'global']
  deliveryMode   delivery_mode [default: 'INCLUDED']
  deliveryFee    decimal(10,2) [note: 'Solo si deliveryMode = FIXED_FEE']
  depositPercent decimal(5,4) [default: 0.10]
  updatedAt      timestamp
}

Table zip_delivery_zones {
  id      varchar [pk]
  zipCode varchar [unique, not null]
  fee     decimal(10,2) [not null]
  note: 'Activa solo cuando settings.deliveryMode = ZIP_CODE'
}

// --- Auth.js v5 (Prisma Adapter) ---

Table users {
  id            varchar [pk]
  name          varchar
  email         varchar [unique, not null]
  emailVerified timestamp
  image         varchar
  passwordHash  varchar [note: 'bcrypt hash — login con credenciales']
  role          user_role [default: 'EMPLOYEE']
  isActive      boolean [default: true]
  createdAt     timestamp [default: `now()`]
  updatedAt     timestamp
}

Table accounts {
  id                varchar [pk]
  userId            varchar [not null, ref: > users.id]
  type              varchar [not null]
  provider          varchar [not null]
  providerAccountId varchar [not null]
  refresh_token     text
  access_token      text
  expires_at        int
  token_type        varchar
  scope             varchar
  id_token          text
  session_state     varchar

  indexes {
    (provider, providerAccountId) [unique, name: 'idx_accounts_provider']
  }
}

Table sessions {
  id           varchar [pk]
  sessionToken varchar [unique, not null]
  userId       varchar [not null, ref: > users.id]
  expires      timestamp [not null]
}

Table verification_tokens {
  identifier varchar [not null]
  token      varchar [not null]
  expires    timestamp [not null]

  indexes {
    (identifier, token) [unique, name: 'idx_verification_tokens']
  }
}

// --- Enums ---

Enum price_type {
  FIXED     [note: 'Precio fijo por tiempo — ej. brincolín $130/8hrs']
  PER_UNIT  [note: 'Precio por unidad — ej. sillas $2 c/u']
}

Enum payment_status {
  AUTHORIZED  [note: 'Fondos congelados en Square, no cobrado aún']
  CAPTURED    [note: 'Cobrado exitosamente — 50% anticipo']
  VOIDED      [note: 'Autorización cancelada — stock insuficiente u otro error']
  FAILED      [note: 'Error en el proceso de pago']
}

Enum order_status {
  PENDING
  CONFIRMED  [note: 'Anticipo 50% pagado']
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
  ADMIN     [note: 'Control total']
  EMPLOYEE  [note: 'Solo lectura: pedidos y calendario']
}
```

---

## Decisiones de Diseño

**Fechas compartidas por orden, no por item:** Todos los `order_items` de una misma orden comparten `rentStartDate` / `rentEndDate` definidos en `orders`. Simplifica el modelo y es suficiente para el negocio actual (el cliente siempre renta todo para el mismo evento).

**`availability.quantity` para PER_UNIT:** En lugar de crear un registro por unidad, se guarda la cantidad comprometida en un solo registro por rango de fechas. Esto hace el `SUM(quantity) FOR UPDATE` eficiente y el índice compuesto en `(productId, startDate, endDate)` lo acelera.

**`orderId = NULL` en availability:** Permite que el admin bloquee fechas manualmente sin crear una orden (ej. equipo en mantenimiento).

**`squarePaymentId` único para todo el ciclo:** Square usa el mismo `payment.id` para AUTHORIZE, CAPTURE y VOID — no se necesita campo separado para el ID de autorización.

**`settings` con ID fijo `'global'`:** Una sola fila de configuración global. El admin la edita; los cambios aplican a todos los pedidos futuros de inmediato.

**Índice crítico en `availability`:**
```sql
INDEX idx_availability_lookup ON availability(productId, startDate, endDate)
```
Sin este índice, el `FOR UPDATE` haría full table scan en checkout — inaceptable bajo carga concurrente.
