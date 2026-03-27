# ADR-004: Migrar de Prisma a Drizzle ORM

**Fecha:** 2026-03-12
**Estado:** Aceptado
**Supersede:** ADR-001 (parcialmente — la elección de PostgreSQL se mantiene, solo cambia el ORM)

## Contexto

El proyecto usaba Prisma v7.4.2 con `@prisma/adapter-pg`. Después de varias semanas de desarrollo, tres problemas recurrentes generaron fricción:

1. **Codegen obligatorio:** Cada cambio al schema requiere `prisma generate` antes de que el editor reconozca los tipos. Esto rompe el flujo de desarrollo y causa errores confusos cuando se olvida.
2. **Serialización de Decimal:** Prisma devuelve objetos `Decimal` en lugar de `string` o `number` para campos `@db.Decimal`. Esto causa errores de serialización en React Server Components (`Decimal is not serializable`) que requieren conversiones manuales en cada punto de uso.
3. **Fallos de migración:** `prisma migrate dev` no puede conectar a la base de datos de producción por restricciones de auth del VPS, obligando a aplicar migraciones manualmente.

## Decisión

Migrar el ORM de Prisma a Drizzle ORM, manteniendo PostgreSQL como base de datos y el paquete `pg` como driver.

## Razón

Drizzle resuelve los tres problemas directamente:

- **Sin codegen:** El schema se define en TypeScript puro (`lib/db/schema.ts`). Los tipos se infieren del código — no hay paso de generación.
- **Decimales como strings:** Drizzle devuelve `string` para columnas `numeric`, que es serializable nativamente y se convierte con `parseFloat()` solo donde se necesita.
- **SQL directo:** Para queries complejas (disponibilidad con `SUM + GROUP BY`), Drizzle usa tagged templates (`sql\`...\``) que son más legibles que `$queryRaw` de Prisma.
- **Dependencia más ligera:** Drizzle no requiere un engine binario ni cliente generado.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Mantener Prisma y parchar los problemas | Los tres problemas son inherentes al diseño de Prisma, no bugs. Workarounds agregan complejidad sin resolver la raíz |
| Kysely | Buen query builder pero sin capa relacional (no tiene equivalente a `with: { category: true }`) |
| Raw SQL con pg directo | Demasiado verboso para CRUD simple; sin inferencia de tipos |

## Consecuencias

**Ventajas:**
- Eliminación completa del paso `prisma generate` del flujo de desarrollo y CI
- Serialización de precios funciona sin conversiones en RSC
- Migraciones con `drizzle-kit push` conectan directamente sin restricciones de auth
- `drizzle-kit studio` reemplaza Prisma Studio para explorar datos

**Limitaciones:**
- No existe `Prisma.FindManyArgs` — las funciones del repositorio necesitan parámetros explícitos en lugar de generics flexibles
- Las queries con `with` (relaciones incluidas) requieren funciones separadas para que TypeScript infiera el tipo de retorno correctamente (e.g., `findAll` vs `findAllWithCategory`)
- Auth.js Prisma Adapter ya no es compatible — si se integra Auth.js en el futuro, se necesitará el Drizzle Adapter

**Migración:**
- El schema de base de datos no cambia — solo la capa de acceso
- `drizzle-kit push` aplica las columnas pendientes (`sort_order`, `reason`) que Prisma no pudo migrar
