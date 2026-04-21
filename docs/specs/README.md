# Specs

## Propósito

Esta carpeta contiene la fuente de verdad funcional del sistema. Aquí vive el
estado deseado de cada capability principal del producto.

## Cómo usar esta carpeta

1. Primero cambia el spec.
2. Luego implementa.
3. Si cambia el comportamiento, el spec debe actualizarse antes o junto con el
   código.

## Documentos principales

| Archivo | Qué contiene |
| --- | --- |
| [GUIDE.md](GUIDE.md) | Convenciones de escritura, mantenimiento y división de specs |
| [PLAN.md](PLAN.md) | Orden recomendado para documentar y migrar los specs actuales |

## Módulos

| Módulo | Qué cubre |
| --- | --- |
| [admin-access](admin-access/README.md) | Login admin, sesiones, guards y roles |
| [catalog](catalog/README.md) | Categorías, productos y disponibilidad |
| [orders](orders/README.md) | Operación y seguimiento de órdenes |
| [content](content/README.md) | Páginas públicas informativas y legales |
| [storefront](storefront/README.md) | Layout público, catálogo visible al cliente y checkout |

## Orden recomendado de lectura

1. [GUIDE.md](GUIDE.md)
2. [PLAN.md](PLAN.md)
3. README del módulo
4. Spec específico

## Regla principal

Si no sabes dónde documentar algo, busca el módulo por razón de cambio, no por
pantalla del sidebar.
