# Ecommerce — Domain Context

Rental ecommerce for party equipment (bounce houses, etc.). Customers rent
products for a date; the store delivers and picks up. This file captures the
shared language so terms stay precise across product, cart, checkout, and
order code.

## Language

**Product**:
A rentable item with a `basePrice`, a `priceType` (`FIXED` or `PER_UNIT`), and stock.

**Variant**:
A single-select option of a Product that **replaces** the base price and carries its own price and stock (e.g. size "Large"). Exactly one variant applies per line.
_Avoid_: option, modifier (those imply additive).

**Additional Service** (es: _Servicio adicional_):
An optional, paid extra that is **added** to the price and is **multi-selectable** (zero or more per order/line). Has no stock of its own. Distinct from a Variant: a Variant *replaces* the price and is single-select; a Service *adds* to it. Comes in two scopes: **Local Service** and **Global Service** (separate storage; see below).
_Avoid_: add-on, extra, modifier, variant.

**Local Service**:
An Additional Service defined **inline on one Product** (mirrors the Variant precedent). Configured in the product edit page's "servicios adicionales" tab. Selected when the customer adds that product to the cart. Attaches to a single **Order line**.
_Example_: insurance for this specific trampoline.

**Global Service**:
An Additional Service defined **store-wide** (mirrors delivery tiers). Configured in `/admin/settings`. Selected by the customer at **checkout**. Attaches to the **Order** as a whole.
_Example_: overnight — everything stays the night and is picked up the next day.

## Relationships

- A **Product** has zero or more **Variants** (single-select, replaces price).
- A **Product** has zero or more **Local Services** (multi-select, adds to the line).
- A **Store** has zero or more **Global Services** (multi-select at checkout, adds to the order).

## Pricing rules

- Service prices are **flat dollar amounts** (not percentages).
- A **Local Service** is charged **once per line**, regardless of line quantity (insurance on qty 3 is still $50).
- A **Global Service** is charged **once per order**, regardless of item count ("everything stays the night").
- **servicesTotal** = sum of all selected Local + Global Services. It is a distinct figure from **subtotal** (products only).
- `total = subtotal + servicesTotal + deliveryFee`.
- `deposit = (subtotal + servicesTotal) × depositPercent`.
- The online charge (existing) is `total × portion` (100% FULL_ONLINE, 50% SPLIT_50_50), so services are charged automatically through the total.

## Example dialogue

> **Dev:** "Is 'overnight' just another **Variant** of the bounce house?"
> **Domain expert:** "No — a **Variant** like 'Large' *replaces* the $100 base. **overnight** is an **Additional Service**: you keep the $100 and *add* $25. And you can pick overnight *and* insurance together; you can only pick one variant."

## Flagged ambiguities

- "Variant" vs "Additional Service" — resolved: Variant replaces price & is single-select; Additional Service adds to price & is multi-select. They are separate concepts with separate storage.
