# ADR-001: PostgreSQL + Prisma como base de datos y ORM

**Fecha:** 2026-02-26
**Estado:** Parcialmente supersedido por ADR-004 (PostgreSQL se mantiene; Prisma reemplazado por Drizzle)

## Contexto

El sistema necesita manejar disponibilidad de productos por rango de fechas con múltiples usuarios accediendo simultáneamente. La lógica core del negocio requiere `SELECT ... FOR UPDATE` (lock de filas) para evitar race conditions en el checkout. Sin un mecanismo de lock a nivel de DB, dos usuarios podrían reservar el mismo equipo para las mismas fechas.

También se necesita un ORM que genere tipos TypeScript desde el schema y que tenga soporte nativo para Auth.js v5 (Prisma Adapter).

## Decisión

PostgreSQL como base de datos relacional y Prisma como ORM.

## Razón

PostgreSQL soporta `SELECT ... FOR UPDATE` de forma robusta y predecible, con índices compuestos que hacen el lock eficiente. Es el estándar de facto en el ecosistema Next.js/Vercel. Prisma genera tipos TypeScript desde el schema, detecta errores en compilación, y el Prisma Adapter integra Auth.js v5 sin código adicional. Las migraciones declarativas de Prisma facilitan el mantenimiento y la repetibilidad del setup.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| MySQL | Soporte de `FOR UPDATE` menos consistente en versiones antiguas; menor adopción en el ecosistema Next.js |
| SQLite | No apto para producción concurrente — los locks de SQLite son a nivel de archivo completo |
| PlanetScale (MySQL) | No soporta foreign keys en su variante MySQL distribuida, lo que bloquea la integridad referencial del schema |
| Drizzle ORM | Más verboso para queries complejas con transacciones; menor ecosistema comparado con Prisma |
| TypeORM | Decoradores de estilo legacy; DX inferior a Prisma para proyectos TypeScript modernos |

## Consecuencias

- **Infraestructura:** PostgreSQL requiere un servidor dedicado (VPS Hostinger vía Docker). No es serverless como PlanetScale — tiene costo fijo mensual pero predecible.
- **Repetibilidad:** El `docker-compose.yml` con PostgreSQL hace el setup replicable para nuevas instancias del negocio.
- **Índice crítico:** El índice `(productId, startDate, endDate)` en `availability` es obligatorio para que los `FOR UPDATE` en checkout sean eficientes. Sin él, el lock haría full table scan.
