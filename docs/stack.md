# Stack Técnico — Festejos Aurora

## Resumen

| Capa | Tecnología | Para qué |
|---|---|---|
| Framework | Next.js 14 (App Router) | Frontend + API routes en un solo repo |
| Base de datos | PostgreSQL | Almacenamiento principal + queries de disponibilidad |
| ORM | Drizzle ORM | Schema tipado sin codegen, migraciones con drizzle-kit, driver pg nativo |
| Auth | Auth.js v5 | Autenticación del panel admin (roles: ADMIN / EMPLOYEE) |
| Pagos | Square Web Payments SDK | Cobro del 50% de anticipo con Authorize & Capture |
| Infraestructura | Docker + VPS Hostinger | Setup repetible para múltiples instancias del negocio |
| i18n | next-intl | Sitio bilingüe inglés + español |
| Estilos | Tailwind CSS | UI responsive |
| Deploy frontend | Vercel | CI/CD automático desde main |

---

## Detalle por tecnología

### Next.js 14 (App Router)

Framework React con renderizado en servidor. Se usa para todo el sitio público (catálogo, checkout, landing) y las API routes del backend.

**Por qué se eligió:**
El App Router permite SSR granular por página — el catálogo se puede pre-renderizar para SEO mientras el checkout es completamente dinámico. Un solo repositorio para frontend y backend simplifica el deployment y reduce overhead para un proyecto de un solo desarrollador.

**Alternativas descartadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Remix | Menos ecosistema, curva de aprendizaje adicional sin beneficio claro |
| Next.js Pages Router | App Router tiene mejor soporte de layouts y RSC |

---

### PostgreSQL

Base de datos relacional principal.

**Por qué se eligió:**
La lógica de disponibilidad por fechas requiere queries con `FOR UPDATE` (SELECT con lock de fila) para resolver race conditions en el checkout concurrente. PostgreSQL soporta esto nativamente y de forma eficiente con índices compuestos. También es el más soportado por Prisma y por proveedores de VPS.

**Alternativas descartadas:**

| Alternativa | Por qué se descartó |
|---|---|
| MySQL | Soporte de `FOR UPDATE` menos predecible en versiones antiguas |
| SQLite | No apto para producción concurrente |
| PlanetScale | Sin soporte de FK en su variante MySQL — bloquea integridad referencial |

---

### Drizzle ORM

ORM ligero para Node.js/TypeScript. Reemplaza a Prisma desde marzo 2026 (ver ADR-004).

**Por qué se eligió:**
Define el schema en TypeScript puro sin paso de codegen — los tipos se infieren directamente del código. Devuelve `string` para columnas numéricas (serializable en RSC sin conversiones). Usa tagged templates para SQL directo. Driver `pg` nativo sin engine binario.

**Alternativas descartadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Prisma (anterior) | Codegen obligatorio, problemas de serialización Decimal en RSC, fallos de migración por auth del VPS |
| Kysely | Sin capa relacional (no tiene `with` para incluir relaciones) |
| TypeORM | Decoradores legacy; peor DX |

---

### Auth.js v5

Autenticación para el panel admin (`/admin`).

**Por qué se eligió:**
Los usuarios finales compran sin crear cuenta — Auth.js solo protege el panel admin. La v5 con Prisma Adapter guarda sesiones en la misma DB sin infraestructura adicional. Soporta credenciales email + password (bcrypt) para los roles ADMIN y EMPLOYEE.

---

### Square Web Payments SDK

Procesamiento de pagos con tarjeta.

**Por qué se eligió:**
El cliente ya opera con Square para pagos presenciales. Usar el mismo proveedor unifica la administración financiera. Square soporta el patrón Authorize & Capture que resuelve el race condition de disponibilidad (ver ADR-002).

**Alternativas descartadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Stripe | El cliente ya usa Square; cambiar implicaría migrar historial y onboarding |

---

### Docker + VPS Hostinger

Infraestructura para la base de datos.

**Por qué se eligió:**
El objetivo es que este repo sea repetible — instalar una nueva instancia para otro negocio de renta de equipo debe ser cuestión de configurar variables de entorno y correr `docker compose up`. El VPS de Hostinger incluye la DB y tiene costo predecible (~$5-10/mes).

**Nota:** El frontend va en Vercel (gratis para proyectos pequeños); la DB y cualquier servicio adicional van en el VPS via Docker.
