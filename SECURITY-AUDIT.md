# Security Audit — Festejos Aurora

**Fecha:** 2026-04-06
**Stack:** Next.js 14 · Auth.js v5 · Drizzle ORM · PostgreSQL

---

## Resumen Ejecutivo

Se auditaron **5 API routes** y **28 server actions** en el proyecto. No existen webhooks implementados. El middleware de protección (`proxy.ts`) está definido pero **no está activo**. La autenticación se aplica a nivel de componente/handler individual.

#Mi duda es: ¿cuándo utilizar estos server actions?

Por ejemplo, si voy a guardar datos y, al final de guardar, necesito re-renderizar algo, ¿podría hacerlo? Por ejemplo, crear un usuario. Se guarda y, después, se tiene que renderizar en la tabla, ¿no? Como el nuevo usuario. O si hay un error que tengo que sacar un anuncio de "no funcionó" o algo así. No podría hacerlo.

Digo, aparte, mira este es el blog de Next y estas son como las recomendaciones para ## Hallazgos Críticos

| Severidad | Cantidad | Descripción |
|-----------|----------|-------------|
| 🔴 CRÍTICO | 2 | Endpoints admin sin autenticación |
| 🟠 ALTO | 1 | Middleware no activo (sin defensa en profundidad) |
| 🟡 MEDIO | 6 | Falta verificación de pertenencia al recurso (ownership) |
| 🔵 BAJO | 3 | Exposición de detalles internos en errores |

---

## 1. API Routes

| Ruta | Método | Auth | Rol | Ownership | Zod | Errores seguros | Estado |
|------|--------|------|-----|-----------|-----|-----------------|--------|
| `/api/auth/[...nextauth]` | GET, POST | ✅ | ✅ | N/A | Parcial | ✅ | ✅ OK |
| `/api/availability` | GET | ❌ (público) | ❌ | ✅ implícito | ❌ (regex manual) | ✅ | ✅ OK (intencional) |
| `/api/admin/upload` | POST | ✅ `requireWriteAccess` | ✅ | ❌ | ❌ (validación manual) | ⚠️ `detail: String(err)` | 🟡 Exposición error |
| `/api/admin/upload/presign` | POST | ❌ **FALTA** | ❌ | ❌ | ✅ | ✅ | 🔴 CRÍTICO |
| `/api/admin/upload/delete` | POST | ❌ **FALTA** | ❌ | Parcial | ✅ | ✅ | 🔴 CRÍTICO |

---

## 2. Server Actions — Admin Login/Logout

| Archivo | Función | Auth | Rol | Ownership | Zod | Errores seguros |
|---------|---------|------|-----|-----------|-----|-----------------|
| `app/admin/login/actions.ts` | `loginAction` | ✅ signIn | ❌ | ❌ | ❌ | ✅ |
| `app/admin/(dashboard)/actions.ts` | `logoutAdmin` | ✅ signOut | ❌ | ❌ | N/A | ✅ |

---

## 3. Server Actions — Categories

| Función | Auth | Rol | Ownership | Zod | Errores seguros |
|---------|------|-----|-----------|-----|-----------------|
| `createCategory` | ✅ | ✅ | ❌ | ✅ | ⚠️ "Slug already exists" |
| `updateCategory` | ✅ | ✅ | ❌ | ✅ | ⚠️ "Slug already exists" |
| `updateCategoryOrder` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `deleteCategory` | ✅ | ✅ | ❌ | ❌ | ⚠️ FK violation expuesta |

**Archivo:** `app/admin/(dashboard)/categories/actions.ts`

---

## 4. Server Actions — Products

| Función | Auth | Rol | Ownership | Zod | Errores seguros |
|---------|------|-----|-----------|-----|-----------------|
| `createProduct` | ✅ | ✅ | ✅ storeId | ✅ | ⚠️ "Slug already exists" |
| `updateProduct` | ✅ | ✅ | ❌ **no verifica store** | ✅ | ⚠️ "Slug already exists" |
| `appendProductPhoto` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `removeProductPhoto` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `createManualBlock` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `deleteManualBlock` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `getProductBlocks` | ❌ **FALTA** | ❌ | ❌ | ❌ | ✅ |
| `toggleProductActive` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `deleteProduct` | ✅ | ✅ | ❌ | ❌ | ⚠️ FK violation expuesta |
| `createVariant` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `updateVariant` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `deleteVariant` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `getProductVariants` | ❌ **FALTA** | ❌ | ❌ | ❌ | ✅ |

**Archivo:** `app/admin/(dashboard)/products/actions.ts`

---

## 5. Server Actions — Pages (About, Legal, Contact, FAQ)

| Función | Auth | Rol | Ownership | Zod | Errores seguros |
|---------|------|-----|-----------|-----|-----------------|
| `saveAboutPage` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `saveLegalDocument` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `saveContactPage` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `createFaqEntry` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `updateFaqEntry` | ✅ | ✅ | Parcial | ✅ | ✅ |
| `deleteFaqEntry` | ✅ | ✅ | ❌ | ❌ | ✅ |

**Archivo:** `app/admin/(dashboard)/pages/actions.ts`

---

## 6. Server Actions — Users

| Función | Auth | Rol | Ownership | Zod | Errores seguros |
|---------|------|-----|-----------|-----|-----------------|
| `createUser` | ✅ | ✅ canCreateRole | ✅ storeId | ✅ | ✅ |
| `updateUser` | ✅ | ✅ canEditUser | ✅ storeId | ✅ | ✅ |
| `toggleUserActive` | ✅ | ✅ canEditUser | ✅ storeId | ❌ | ✅ |

**Archivo:** `app/admin/(dashboard)/users/actions.ts`

---

## 7. Middleware y Auth

| Componente | Estado | Notas |
|------------|--------|-------|
| `auth.ts` (NextAuth config) | ✅ Activo | JWT + bcrypt + re-validación en cada request |
| `auth.config.ts` | ✅ Activo | Redirect a `/admin/login` |
| `proxy.ts` (middleware) | ⚠️ **No activo** | Definido pero no conectado como `middleware.ts` |
| `lib/auth/session.ts` | ✅ Activo | `getSessionUser()`, `requireWriteAccess()` |
| `lib/auth/permissions.ts` | ✅ Activo | `canCreateRole`, `canEditUser`, `canWriteData` |

---

## 8. Webhooks

**No existen webhooks implementados.** La integración con Square (SPEC-09) está pendiente. Cuando se implemente, verificar:
- [ ] Validación de firma del webhook
- [ ] Validación del payload con Zod
- [ ] No exponer detalles internos en errores
- [ ] Idempotencia en el procesamiento

---

## 9. Vulnerabilidades Detalladas

### 🔴 V-01: Upload presign sin autenticación

**Archivo:** `app/api/admin/upload/presign/route.ts`
**Impacto:** Cualquier usuario puede generar URLs pre-firmadas para subir archivos al bucket S3.
**Fix:** Agregar `await requireWriteAccess()` al inicio del handler POST.

### 🔴 V-02: Upload delete sin autenticación

**Archivo:** `app/api/admin/upload/delete/route.ts`
**Impacto:** Cualquier usuario puede eliminar archivos del bucket S3 si conoce la URL.
**Fix:** Agregar `await requireWriteAccess()` al inicio del handler POST.

### 🟠 V-03: Middleware no activo

**Archivo:** `proxy.ts` (no existe `middleware.ts`)
**Impacto:** Sin defensa en profundidad. Si un Server Component olvida llamar `getSessionUser()`, queda expuesto.
**Fix:** Crear `middleware.ts` que importe y active la función `proxy`.

### 🟡 V-04: getProductBlocks y getProductVariants sin auth

**Archivo:** `app/admin/(dashboard)/products/actions.ts`
**Impacto:** Funciones de lectura de datos admin accesibles sin sesión.
**Fix:** Agregar `await getSessionUser()` al inicio de ambas funciones.

### 🟡 V-05: Falta verificación de ownership en operaciones de escritura

**Funciones afectadas:** `updateProduct`, `deleteProduct`, `appendProductPhoto`, `removeProductPhoto`, `deleteManualBlock`, `toggleProductActive`, todas las de categories, `deleteFaqEntry`
**Impacto:** Un admin autenticado de una tienda podría modificar recursos de otra tienda si conoce los IDs (en escenario multi-tenant).
**Fix:** Agregar `WHERE storeId = user.storeId` en cada query de escritura.

### 🟡 V-06: Falta validación Zod en funciones de delete/toggle

**Funciones:** `deleteCategory`, `deleteProduct`, `deleteVariant`, `deleteManualBlock`, `deleteFaqEntry`, `toggleProductActive`, `toggleUserActive`
**Impacto:** IDs no validados pasan directo a queries SQL.
**Fix:** Validar con `z.string().uuid()` antes de ejecutar.

### 🔵 V-07: Exposición de errores internos en upload

**Archivo:** `app/api/admin/upload/route.ts` (línea 43)
**Código:** `detail: String(err)` expone mensajes de error de S3.
**Fix:** Loggear el error y devolver mensaje genérico.

### 🔵 V-08: Mensajes de constraint de BD expuestos

**Funciones:** `createProduct`, `updateProduct`, `createCategory`, `updateCategory`, `deleteProduct`, `deleteCategory`
**Impacto:** Revelan estructura de la BD ("Slug already exists", "Cannot delete: has associated orders/products").
**Fix:** Mapear errores de constraint a mensajes genéricos de usuario.

---

## 10. Resumen de Cobertura

```
                        Auth    Rol    Ownership   Zod    Errores
API Routes (5)         3/5     2/5     1/5        3/5     4/5
Server Actions (28)   25/28   25/28    4/28      17/28   22/28
─────────────────────────────────────────────────────────────────
TOTAL (33)            28/33   27/33    5/33      20/33   26/33
                       85%     82%     15%        61%     79%
```

### Prioridades de Remediación

1. **Inmediato:** V-01, V-02 (auth en presign/delete)
2. **Esta semana:** V-03 (activar middleware), V-04 (auth en reads)
3. **Próximo sprint:** V-05 (ownership checks), V-06 (Zod en deletes)
4. **Backlog:** V-07, V-08 (sanitización de errores)
