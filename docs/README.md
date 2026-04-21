# E-commerce Template (Multi-Tenant)

> Template reutilizable de e-commerce para renta de equipo — multiples tiendas comparten una sola base de datos, aisladas por `STORE_ID`.

**Estado:** 🟡 En desarrollo
**Tipo:** E-commerce Template
**Arquitectura:** Multi-tenant (DB compartida, ver [ADR-005](decisions/adr-005-multi-tenant-shared-db.md))

---

## Documentación

| Archivo                      | Qué encuentras ahí                            |
| ---------------------------- | --------------------------------------------- |
| [brief.md](brief.md)         | Qué es, problema que resuelve, estado actual  |
| [stack.md](stack.md)         | Tecnologías y justificación de cada una       |
| [flows.md](flows.md)         | Flujos del sistema con diagramas Mermaid      |
| [database.md](database.md)   | Esquema de base de datos, tablas y relaciones |
| [roadmap.md](roadmap.md)     | Sprints y tareas por semana                   |
| [specs/README.md](specs/README.md) | Fuente de verdad funcional y plan de specs | 
| [questions.md](questions.md) | Preguntas abiertas y respondidas              |
| [resources.md](resources.md) | Links y materiales de referencia              |

---

## Decisiones Técnicas

| # | Decisión | Estado |
|---|---|---|
| ADR-001 | PostgreSQL + Prisma como DB y ORM | Aceptado |
| ADR-002 | Authorize & Capture para resolver race condition en disponibilidad | Aceptado |
| ADR-003 | Arquitectura repetible — repo multi-tenant con config por instancia | Aceptado |
| ADR-004 | Migrar de Prisma a Drizzle ORM | Aceptado |
| ADR-005 | Multi-tenant con base de datos compartida | Aceptado |

→ Ver índice completo en [decisions/README.md](decisions/README.md)

---

## Stack Rápido

- **Framework:** Next.js (App Router) — frontend + backend en un solo repo
- **Base de datos:** PostgreSQL — robustez y queries complejas de disponibilidad
- **ORM:** Drizzle ORM — schema tipado sin codegen, driver pg nativo
- **Auth:** Auth.js v5 con Prisma Adapter — solo para panel admin
- **Pagos:** Square — procesamiento de tarjetas con Authorize & Capture
- **Infraestructura:** Docker + VPS Hostinger — setup repetible
- **i18n:** next-intl — sitio bilingüe inglés + español
