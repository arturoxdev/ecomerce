# Plan

## Objetivo

Construir `docs/specs` como la fuente viva de documentación funcional del
proyecto, manteniendo una estructura simple y fácil de sostener.

## Principios de este plan

- Pocos módulos.
- Pocos archivos por módulo.
- Nombres obvios.
- Migrar desde `openspec/` sin copiar ruido innecesario.
- Priorizar primero los specs que sostienen el flujo principal del negocio.

## Estructura objetivo

```text
docs/specs/
├── README.md
├── GUIDE.md
├── PLAN.md
├── admin-access/
│   ├── README.md
│   ├── auth.md
│   └── roles.md
├── catalog/
│   ├── README.md
│   ├── categories.md
│   ├── products.md
│   └── availability.md
├── orders/
│   ├── README.md
│   └── orders.md
├── content/
│   ├── README.md
│   └── public-pages.md
└── storefront/
    ├── README.md
    ├── layout.md
    ├── catalog.md
    └── checkout.md
```

## Fase 1: Base documental

Crear primero los documentos que definen la estructura:

1. `docs/specs/README.md`
2. `docs/specs/GUIDE.md`
3. `README.md` de cada módulo

Objetivo: fijar la estructura antes de migrar comportamiento.

## Fase 2: Los 10 specs core

Documentar en este orden:

| Orden | Archivo | Título | Fuente principal a fusionar |
| --- | --- | --- | --- |
| 1 | `admin-access/auth.md` | Autenticación y Sesiones del Panel Admin | `openspec/specs/auth-system/spec.md` |
| 2 | `admin-access/roles.md` | Roles, Permisos y Visibilidad del Panel Admin | `openspec/specs/role-system/spec.md`, `openspec/specs/admin-shell-complete/spec.md` |
| 3 | `catalog/categories.md` | Gestión y Orden del Catálogo de Categorías | `openspec/changes/admin-inventory-catalog/specs/reordenamiento-categorias/spec.md`, `docs/roadmap.md` SPEC-04 |
| 4 | `catalog/products.md` | Gestión de Productos y Variantes del Inventario | `openspec/changes/admin-dashboard/specs/admin-product-management/spec.md`, `openspec/changes/admin-inventory-catalog/specs/gestion-estado-productos/spec.md`, `openspec/changes/spec-03-b-product-about-and-calendar/specs/product-about-field/spec.md` |
| 5 | `catalog/availability.md` | Disponibilidad, Bloqueos y Reglas de Reserva | `openspec/changes/admin-inventory-catalog/specs/bloqueo-manual-fechas/spec.md`, partes de `catalog-date-range-picker/spec.md`, `docs/roadmap.md` SPEC-07 |
| 6 | `storefront/layout.md` | Layout Público, Navegación e Infraestructura de SEO | `openspec/specs/shared-layout/spec.md` |
| 7 | `storefront/catalog.md` | Experiencia Pública de Catálogo y Detalle de Producto | `openspec/specs/landing-complete/spec.md`, partes públicas de `product-about-field/spec.md`, partes públicas de `catalog-date-range-picker/spec.md`, `docs/roadmap.md` SPEC-04 |
| 8 | `storefront/checkout.md` | Carrito, Checkout y Confirmación de Compra | `docs/roadmap.md` SPEC-06, SPEC-07, SPEC-08 y SPEC-09 |
| 9 | `orders/orders.md` | Operación y Seguimiento de Órdenes | `docs/roadmap.md` SPEC-09 y SPEC-10, comportamiento actual en `app/admin/(dashboard)/orders/*` |
| 10 | `content/public-pages.md` | Páginas Públicas Informativas y Legales | `openspec/specs/static-informational-pages/spec.md` |

## Fase 3: Specs diferidos

Estos pueden añadirse después sin bloquear el núcleo del producto:

- `admin-access/users.md`
- `orders/calendar.md`
- `content/admin-pages.md`
- `settings/appearance.md`
- `settings/store-rules.md`

## Reglas de migración desde OpenSpec

- No copiar tal cual si el spec histórico está demasiado fragmentado.
- Fusionar varios specs pequeños cuando cambian juntos.
- Mantener un solo archivo por capability coherente.
- Preferir nombres de archivo estables y fáciles de recordar.

## Señales de éxito

- Es fácil responder “dónde va este cambio”.
- La mayoría de cambios funcionales caben en uno o dos specs.
- Cada spec puede leerse rápido y mantenerse sin miedo.
