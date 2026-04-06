# ADR-005: Multi-tenant con base de datos compartida

**Fecha:** 2026-04-05
**Estado:** Aceptado
**Evoluciona:** ADR-003

## Contexto

En ADR-003 se decidió que cada instancia del template tendría su propia base de datos. Conforme el proyecto maduró, la columna `store_id` se agregó a todas las tablas principales del schema, y la función `getStoreId()` (`lib/config/tenant.ts`) se implementó para leer `STORE_ID` desde variables de entorno. Esto abre la puerta a una arquitectura más eficiente: una sola base de datos compartida entre múltiples tiendas.

La motivación es reducir costos de infraestructura y simplificar el mantenimiento. Con una DB por cliente, cada nueva instancia requiere provisionar, migrar y mantener una base de datos separada. Con una DB compartida, el onboarding de un nuevo cliente es: crear un `STORE_ID`, hacer seed de sus datos, y desplegar el frontend con la nueva variable de entorno.

## Decision

Todas las instancias del template comparten una sola base de datos PostgreSQL. Cada tienda se identifica por la variable de entorno `STORE_ID`, que se inyecta en todas las queries a través de `getStoreId()` en la capa de repositorios.

### Reglas de aislamiento

1. **Tablas con `store_id` directo** (10 tablas): `categories`, `products`, `orders`, `settings`, `zip_delivery_zones`, `about_page_contents`, `legal_page_documents`, `contact_page_contents`, `faq_entries`, `users`. Cada query de lectura, creacion y mutacion DEBE filtrar por `store_id`.

2. **Tablas hijas sin `store_id`** (3 tablas): `product_variants`, `order_items`, `availability`. Se aíslan indirectamente a través de la FK a su tabla padre (`products` u `orders`). El acceso siempre pasa primero por el repositorio padre que valida `store_id`.

3. **Tablas de Auth.js** (3 tablas): `accounts`, `sessions`, `verification_tokens`. Se aíslan a través de la FK a `users`, que tiene `store_id`. El login (`authorize`) y el JWT callback validan `store_id` explícitamente.

### Patron en repositorios

Cada repositorio sigue este patron (ejemplo: `lib/repositories/category.ts`):

```typescript
import { getStoreId } from "@/lib/config/tenant";

// Lectura: siempre filtrar
export function findById(id: string) {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.storeId, getStoreId())),
  });
}

// Creacion: tipo omite storeId, se inyecta automaticamente
export function create(data: Omit<typeof categories.$inferInsert, "storeId">) {
  return db.insert(categories).values({ ...data, storeId: getStoreId() });
}

// Mutacion: where incluye storeId
export function update(id: string, data: Partial<...>) {
  return db.update(categories).set(data)
    .where(and(eq(categories.id, id), eq(categories.storeId, getStoreId())));
}
```

## Razon

| Factor | DB por instancia (ADR-003) | DB compartida (esta decision) |
|---|---|---|
| Costo infraestructura | $5-10/mes por cliente | $5-10/mes total |
| Onboarding nuevo cliente | Provisionar DB + migrar + seed | Seed + deploy |
| Migraciones | Ejecutar en cada DB | Ejecutar una vez |
| Riesgo de data leak | Nulo (fisicamente separados) | Controlado por `store_id` en queries |
| Complejidad de codigo | Baja | Moderada (cada repo debe filtrar) |

El tradeoff principal es que un bug en un repositorio (olvidar filtrar por `store_id`) puede exponer datos de otra tienda. Esto se mitiga con el patron establecido y la funcion centralizada `getStoreId()`.

## Alternativas consideradas

| Alternativa | Por que se descarto |
|---|---|
| Row-Level Security (RLS) en PostgreSQL | Agrega complejidad en la capa de DB, requiere configurar policies por tabla, y Drizzle ORM no tiene soporte nativo para setear `current_setting` por conexion. Se puede agregar como capa adicional en el futuro. |
| Mantener DB por instancia (ADR-003) | Funciona pero no escala en costos ni en mantenimiento cuando hay 5+ clientes. |

## Consecuencias

- **`STORE_ID` es obligatorio:** La app falla al arrancar si no esta definido (`getStoreId()` lanza error).
- **Cada repositorio nuevo debe seguir el patron:** Importar `getStoreId`, filtrar en lectura, inyectar en creacion, incluir en WHERE de mutaciones.
- **Unique constraints incluyen `store_id`:** Dos tiendas pueden tener un producto con el mismo slug (ej. `idx_products_store_slug` es `UNIQUE(store_id, slug)`).
- **Seeds por tienda:** El seed script debe recibir `STORE_ID` para insertar datos del cliente correcto.
- **Backups compartidos:** Un backup de la DB incluye datos de todas las tiendas. Para restaurar una sola tienda se necesita filtrar por `store_id`.
