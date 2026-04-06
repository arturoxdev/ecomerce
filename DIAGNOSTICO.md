# Diagnóstico: ecomerce
**Fecha**: 2026-04-06
**Stack**: Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5 (`strict`), Auth.js v5 beta con credenciales, Drizzle ORM + PostgreSQL, Zod, Tailwind CSS 4, AWS S3/R2 SDK

## Resumen Ejecutivo
El proyecto tiene una base moderna y varias decisiones correctas de tipado y validación, pero hoy está lejos de considerarse listo para crecer o operar con confianza. Los tres problemas más graves son la seguridad inconsistente en endpoints admin y aislamiento multi-tenant incompleto, la ausencia total de tests/CI, y un manejo de errores/observabilidad demasiado débil para producción. También hay una mezcla de patrones arquitectónicos: algunas áreas usan repositorios, pero otras acceden a `db` directamente o hacen bypass del filtro por `storeId`, lo que rompe la consistencia del código y abre riesgo de fuga de datos. Lo primero que debería atacarse es cerrar los gaps de autorización y tenant isolation, luego estabilizar pipeline de calidad (`tsc`, tests, CI), y después normalizar errores/logging.

## Scorecard

| Área | Estado | Severidad |
|------|--------|-----------|
| Estructura | 🟡 Base parcialmente organizada por dominio, pero con patrones mezclados y varios archivos enormes | 🟡 |
| Errores | 🔴 No hay error handling central ni contrato consistente; hay silencios y detalles internos expuestos | 🔴 |
| Logging | 🔴 Prácticamente no existe observabilidad de aplicación | 🔴 |
| Testing | 🔴 No hay tests, ni runner, ni cobertura, ni CI que proteja regresiones | 🔴 |
| Seguridad | 🔴 Hay endpoints admin sin autorización, aislamiento multi-tenant incompleto y dependencias vulnerables | 🔴 |
| Base de datos | 🔴 Drizzle y migraciones existen, pero el filtrado por `storeId` es inconsistente y hay operaciones sensibles sin protección suficiente | 🔴 |
| Frontend | 🟡 Usa Server Components + islas cliente, pero con componentes grandes y lógica/UI mezclada | 🟡 |
| DevOps | 🔴 No hay CI/CD, typecheck falla y el despliegue parece manual | 🔴 |
| TypeScript | 🟡 `strict` está activo y no hay `any`, pero hay `@ts-expect-error`, `skipLibCheck`, `allowJs` y typecheck roto | 🟡 |
| Code smells | 🟡 Hay duplicación, funciones con demasiados parámetros y varios componentes/acciones con demasiadas responsabilidades | 🟡 |

## Detalle por Área

### 1. Estructura
**Estado actual**
- La estructura principal sí está separada por zonas funcionales: `app/[locale]` para storefront, `app/admin` para admin, `lib/repositories` para acceso a datos, `lib/auth` para auth/permisos, y `components/*` para UI.
- El patrón no es completamente consistente. Hay módulos que sí usan repositorios (`app/admin/(dashboard)/products/actions.ts:15-17`, `app/[locale]/page.tsx:14-16`) y otros que acceden directo a `db` desde páginas y server actions (`app/admin/(dashboard)/users/page.tsx:30-33`, `app/admin/(dashboard)/users/actions.ts:57-74`, `app/admin/(dashboard)/users/[id]/edit/page.tsx:29-31`).
- La separación de capas existe solo parcialmente. Productos/categorías/páginas estáticas sí pasan por repositorios; usuarios y parte del admin no.
- Archivos grandes / “god objects” de más de 200 líneas:
  - `components/ui/sidebar.tsx` (723)
  - `app/admin/(dashboard)/products/product-form.tsx` (494)
  - `lib/db/schema.ts` (425)
  - `app/admin/(dashboard)/products/actions.ts` (398)
  - `app/admin/(dashboard)/pages/faq-manager.tsx` (329)
  - `components/public/static-pages.tsx` (319)
  - `components/catalog/availability-checker.tsx` (271)
  - `app/[locale]/page.tsx` (271)
  - `components/ui/dropdown-menu.tsx` (268)
  - `lib/static-pages/fallbacks.ts` (267)
  - `components/ui/carousel.tsx` (242)
  - `app/admin/(dashboard)/products/product-table.tsx` (242)
  - `app/admin/(dashboard)/pages/actions.ts` (223)
  - `components/ui/calendar.tsx` (221)
  - `app/admin/(dashboard)/products/variant-manager.tsx` (212)
  - `lib/db/seed.ts` (207)
  - `components/ui/select.tsx` (201)
  - `components/public/header.tsx` (201)

**Problemas detectados**
- La arquitectura no es homogénea: hay mezcla de feature-based con accesos directos a infraestructura.
- `users` rompe el patrón de repositorio y deja lógica de autorización + queries + mutaciones en el mismo archivo (`app/admin/(dashboard)/users/actions.ts:34-178`).
- Hay demasiada lógica metida en componentes cliente grandes, sobre todo `product-form.tsx`.
- `lib/db/schema.ts` concentra demasiado dominio y dificulta navegación.

**Severidad**: 🟡 Importante

**Archivos clave**
- `app/admin/(dashboard)/users/actions.ts:34-178`
- `app/admin/(dashboard)/users/page.tsx:30-33`
- `app/admin/(dashboard)/products/actions.ts:46-398`
- `app/admin/(dashboard)/products/product-form.tsx:76-494`

### 2. Manejo de Errores
**Estado actual**
- No hay error handler centralizado para API ni middleware de errores.
- No existen custom error classes de dominio; se usa `throw new Error()` directamente en puntos críticos (`auth.ts:70`, `lib/config/tenant.ts:3`, `lib/auth/session.ts:35`).
- Las respuestas de error no siguen un contrato único:
  - API: `{ error }` en `app/api/availability/route.ts:20-27`
  - API: `{ error, detail }` en `app/api/admin/upload/route.ts:43`
  - Server actions: `{ error }`, `{ success }`, `{ fieldErrors }` en `app/admin/(dashboard)/products/actions.ts:64-85`, `91-135`
- Hay `catch` silenciosos que tragan errores y devuelven fallbacks sin registrar nada:
  - `lib/static-pages/service.ts:17-29`, `33-45`, `49-63`, `67-87`
  - `app/admin/(dashboard)/pages/[slug]/page.tsx:59-61`, `80-82`, `105-107`
- Hay `catch` que ocultan causa real y devuelven mensajes genéricos, lo cual dificulta operar y debuggear:
  - `app/admin/(dashboard)/categories/actions.ts:47-52`, `77-82`, `108-110`, `122-127`
  - `app/admin/(dashboard)/products/actions.ts:80-85`, `125-130`, `271-272`, `335-336`, `371-372`, `388-389`

**Problemas detectados**
- No hay distinción formal entre errores operacionales y bugs.
- Se están ocultando errores de lectura de contenido estático; eso puede dejar datos caídos “silenciosamente” en producción.
- Se exponen detalles internos al cliente en `app/api/admin/upload/route.ts:43` con `detail: String(err)`.
- `requireWriteAccess()` lanza un `Error` genérico (`lib/auth/session.ts:35`) sin mapearlo a HTTP/UX consistente.

**Severidad**: 🔴 Crítico

**Archivos clave**
- `app/api/admin/upload/route.ts:35-44`
- `lib/static-pages/service.ts:16-88`
- `app/admin/(dashboard)/pages/[slug]/page.tsx:53-108`
- `lib/auth/session.ts:31-39`

### 3. Logging y Observabilidad
**Estado actual**
- No hay librería de logging estructurado.
- En app productiva solo aparecen `console.error` puntuales:
  - `app/api/admin/upload/delete/route.ts:36`
  - `app/admin/(dashboard)/products/actions.ts:174`
- El resto del logging visible está en scripts (`scripts/db-migrate.ts`, `scripts/migrate-minio-to-r2.ts`, `lib/db/seed.ts`).
- No hay request ID tracking, tracing, métricas ni endpoint `/health`.
- Lo único parecido a healthcheck está en Docker para PostgreSQL (`docker-compose.yml:11-15`), no en la app.

**Problemas detectados**
- La app no tiene observabilidad útil para incidentes reales.
- No hay correlación entre requests, usuarios, acciones ni fallos.
- No hay health endpoint de aplicación para orquestadores o uptime checks.
- No hay evidencia de monitoreo/alertas configuradas.

**Severidad**: 🔴 Crítico

**Archivos clave**
- `app/api/admin/upload/delete/route.ts:28-40`
- `app/admin/(dashboard)/products/actions.ts:167-175`
- `docker-compose.yml:11-15`

### 4. Testing
**Estado actual**
- No existe ningún archivo `*.test.*`, `*.spec.*`, `tests/`, `__tests__/`, Playwright ni Cypress.
- `package.json` no tiene scripts de test ni dependencias de runner (`vitest`, `jest`, `playwright`) (`package.json:5-14`, `47-57`).
- Cobertura aproximada: 0%.
- No hay fixtures, factories, test utils ni mocks centralizados.
- El código es testeable solo en algunas partes:
  - Repositorios y utilidades pequeñas sí se podrían aislar.
  - Pero muchos módulos dependen directamente de `db`, `process.env`, `auth()` o `redirect()` y eso complica unit testing (`lib/db.ts:5-8`, `lib/config/tenant.ts:1-4`, `lib/auth/session.ts:15-39`).

**Problemas detectados**
- No hay red de seguridad para regresiones.
- El proyecto depende demasiado de validación manual.
- Sin tests ni CI, los gaps de tenant isolation y autorización pueden volver a introducirse fácilmente.

**Severidad**: 🔴 Crítico

**Archivos clave**
- `package.json:5-14`
- `lib/auth/session.ts:15-39`
- `app/admin/(dashboard)/users/actions.ts:34-178`

### 5. Seguridad
**Estado actual**
- Autenticación: Auth.js v5 con `Credentials` + bcrypt (`auth.ts:24-57`), sesión JWT (`auth.ts:24`).
- Autorización: hay helpers de rol (`lib/auth/permissions.ts:3-35`) y `requireWriteAccess()` (`lib/auth/session.ts:31-39`), pero no se aplican de forma consistente.
- Validación de input:
  - Sí hay Zod en varias server actions y algunos endpoints (`app/admin/(dashboard)/products/actions.ts:21-42`, `app/admin/(dashboard)/users/actions.ts:15-28`, `app/api/admin/upload/presign/route.ts:15-22`, `app/api/admin/upload/delete/route.ts:7-9`).
  - `app/api/availability/route.ts` valida manualmente con regex/ifs (`7-64`), no con esquema reutilizable.
- SQL injection:
  - En general se usan APIs de Drizzle y SQL parametrizado (`lib/repositories/availability.ts:25-41`, `72-109`), no encontré concatenación de SQL cruda.
- Rate limiting: no hay ninguna señal de rate limiting.
- CORS: no hay configuración explícita.
- Security headers: `next.config.ts` solo configura imágenes (`next.config.ts:3-23`), no headers.
- Secrets:
  - Sí existe `.env.example` (`.env.example:1-27`).
  - Las variables reales no se validan al arranque; se usan `!` y fallan tarde (`lib/db.ts:5-8`, `lib/minio.ts:3-16`, `drizzle.config.ts:4-8`).
- Dependencias: `npm audit --json` reportó 11 vulnerabilidades: 5 altas, 6 moderadas.
  - Directa: `next@16.1.6` vulnerable; fix disponible a `16.2.2`.
  - Transitives altas/moderadas en `hono`, `@hono/node-server`, `path-to-regexp`, `picomatch`, `flatted`, `drizzle-kit`.

**Problemas detectados**
- `app/api/admin/upload/presign/route.ts:24-64` no protege el endpoint con `requireWriteAccess()`. Cualquier caller podría pedir URLs firmadas si llega al endpoint.
- `app/api/admin/upload/delete/route.ts:11-40` tampoco protege el borrado. Es un gap admin directo.
- El aislamiento multi-tenant no es consistente: varios repositorios y páginas no filtran por `storeId`:
  - `lib/repositories/product.ts:17-22`, `42-48`, `71-95`, `98-145`, `147-163`
  - `lib/repositories/variant.ts:6-50`
  - `lib/repositories/availability.ts:10-60`
  - `app/admin/(dashboard)/products/[id]/edit/page.tsx:22-29`
  - `app/admin/(dashboard)/products/[id]/availability/page.tsx:23-26`
  - `app/admin/(dashboard)/users/[id]/edit/page.tsx:29-31`
- El middleware solo revisa presencia de cookie, no validez (`proxy.ts:11-18`). Eso no rompe por completo la app porque luego `getSessionUser()` revalida, pero sigue siendo una barrera débil e inconsistente.
- Se exponen detalles internos en `app/api/admin/upload/route.ts:43`.
- No hay rate limiting para login ni endpoints sensibles.

**Severidad**: 🔴 Crítico

**Archivos clave**
- `app/api/admin/upload/presign/route.ts:24-64`
- `app/api/admin/upload/delete/route.ts:11-40`
- `lib/repositories/product.ts:17-163`
- `lib/repositories/variant.ts:6-50`
- `proxy.ts:11-18`

### 6. Base de Datos
**Estado actual**
- ORM: Drizzle (`lib/db.ts:1-8`, `drizzle.config.ts:4-8`).
- Hay migraciones versionadas en `drizzle/0000_lyrical_hydra.sql` y `drizzle/0001_fix_malformed_slugs.sql`.
- La mayoría de tablas principales sí tienen `created_at` y `updated_at`, pero no todas:
  - Sí: `categories`, `products`, `orders`, `users`, etc. (`lib/db/schema.ts:69-72`, `94-97`, `142-145`, `299-302`)
  - No `updatedAt`: `availability`, `order_items`, `accounts`, `sessions`, `verification_tokens`, `zip_delivery_zones`
- Hay pocos índices explícitos:
  - `idx_availability_lookup` (`lib/db/schema.ts:183`)
  - `idx_faq_locale_order` (`284`)
  - varios `unique(...)`
- Se usan transacciones en puntos concretos:
  - `lib/repositories/category.ts:62-70`
  - `lib/repositories/availability.ts:72-110`
- Borrados: predominan hard deletes (`lib/repositories/category.ts:58-60`, `product.ts:136-138`, `variant.ts:49-50`, `availability.ts:52-54`).

**Problemas detectados**
- En un proyecto con `storeId` multi-tenant, productos, variantes y availability no filtran consistentemente por tenant. Esto es el problema de base de datos más serio del proyecto.
- Hay operaciones multi-query sin transacción donde sí haría falta:
  - `app/admin/(dashboard)/users/actions.ts:128-140` actualiza usuario y luego invalida sesiones fuera de transacción.
  - `app/admin/(dashboard)/users/actions.ts:167-174` idem para toggle activo.
- Riesgo de N+1 / loops con queries individuales:
  - `lib/repositories/category.ts:63-69` hace `update` por item dentro de un `for`.
- Hay pocos índices explícitos para búsquedas frecuentes como `products.name` en `ILIKE` (`lib/repositories/product.ts:38-39`, `155-156`), o para campos FK frecuentes (`categoryId`, `productId`) fuera de unique/index puntuales.
- No hay soft delete.

**Severidad**: 🔴 Crítico

**Archivos clave**
- `lib/repositories/product.ts:17-163`
- `lib/repositories/variant.ts:6-50`
- `lib/repositories/availability.ts:10-110`
- `app/admin/(dashboard)/users/actions.ts:128-140`
- `app/admin/(dashboard)/users/actions.ts:167-174`

### 7. Arquitectura Frontend
**Estado actual**
- El frontend está organizado principalmente por superficie (`app/[locale]`, `app/admin`, `components/public`, `components/admin`, `components/catalog`, `components/ui`), no por feature end-to-end.
- Se usan Server Components en varias páginas y se delega interacción a islas cliente; eso está bien.
- Hay 41 archivos con `"use client"`.
- El fetching moderno tipo TanStack Query/SWR no existe. Predomina:
  - Server Components con fetch/repos server-side (`app/[locale]/page.tsx:32-38`, `app/admin/(dashboard)/products/page.tsx:39-48`)
  - `fetch` manual + `useEffect/useState` en cliente (`components/catalog/availability-checker.tsx:116-145`)
  - Server Actions + `useActionState` en admin (`app/admin/login/page.tsx:10`, `app/admin/(dashboard)/products/product-form.tsx:85`)
- Los filtros/paginación de productos sí viven en URL, lo cual es correcto (`app/admin/(dashboard)/products/page.tsx:17-50`, `app/admin/(dashboard)/products/product-table.tsx:62-69`, `app/admin/(dashboard)/products/product-status-filter.tsx:35-48`).
- No se ve estado global real del negocio; no encontré Zustand/Redux en uso.

**Problemas detectados**
- Componentes grandes con UI + lógica + side effects mezclados:
  - `app/admin/(dashboard)/products/product-form.tsx` (494)
  - `app/admin/(dashboard)/pages/faq-manager.tsx` (329)
  - `components/public/static-pages.tsx` (319)
  - `components/catalog/availability-checker.tsx` (271)
  - `app/[locale]/page.tsx` (271)
  - `app/admin/(dashboard)/products/product-table.tsx` (242)
  - `components/public/header.tsx` (201)
- `product-status-filter.tsx` usa un `setTimeout` dentro de `onChange` con `return () => clearTimeout(timeout)` que no limpia nada realmente (`app/admin/(dashboard)/products/product-status-filter.tsx:71-75`).
- Hay mezcla de componentes puramente de presentación con otros muy acoplados a server actions y side effects.
- Se usan `<img>` sin optimización en varias partes (`app/[locale]/page.tsx:179-183`, `components/public/header.tsx:46`, `components/public/static-pages.tsx:90-94`).

**Severidad**: 🟡 Importante

**Archivos clave**
- `app/admin/(dashboard)/products/product-form.tsx:106-190`
- `components/catalog/availability-checker.tsx:116-145`
- `app/admin/(dashboard)/products/product-status-filter.tsx:71-75`
- `app/admin/(dashboard)/products/page.tsx:39-48`

### 8. DevOps y Deployment
**Estado actual**
- No existe `.github/workflows`; no hay CI visible.
- `eslint` está configurado y `npm run lint` sí corre, pero no hay pipeline que lo ejecute (`eslint.config.mjs:1-16`, `package.json:5-14`).
- `TypeScript` está configurado, pero `npx tsc --noEmit` falla por referencias rotas en `.next/types/validator.ts` a rutas inexistentes:
  - `app/[locale]/cart/page.js`
  - `app/[locale]/order/[orderId]/page.js`
  - `app/admin/(dashboard)/orders/[id]/page.js`
- Hay `.env.example` bastante completo (`.env.example:1-27`).
- No hay validación de variables de entorno al startup; todo usa non-null assertions (`lib/db.ts:5-8`, `lib/minio.ts:3-16`, `drizzle.config.ts:4-8`).
- No hay evidencia de preview deploys.
- El README sugiere un deploy manual/VPS con migraciones corridas durante deploy (`README.md:84-88`).

**Problemas detectados**
- Sin CI, lint y typecheck no protegen nada.
- Typecheck no está verde hoy.
- No hay CD ni estrategia declarada de despliegue automatizado.
- No hay validación temprana de configuración.

**Severidad**: 🔴 Crítico

**Archivos clave**
- `package.json:5-14`
- `eslint.config.mjs:1-16`
- `README.md:84-88`
- `lib/db.ts:5-8`
- `lib/minio.ts:3-16`

### 9. Tipos y TypeScript
**Estado actual**
- `strict: true` está activado (`tsconfig.json:7`).
- No encontré usos de `any` en `app`, `components`, `lib`, `hooks`, `scripts`, `types`.
- Sí hay `skipLibCheck: true` y `allowJs: true` (`tsconfig.json:5-8`).
- Hay extensiones de tipos para Auth.js (`types/next-auth.d.ts`).
- Hay validación runtime con Zod en varias acciones y endpoints.

**Problemas detectados**
- El typecheck está roto ahora mismo (`npx tsc --noEmit` falla).
- Hay `@ts-expect-error` en integración sensible de auth (`auth.ts:18`, `auth.ts:20`).
- No vi tipos compartidos de respuestas API; cada endpoint responde estructuras ad hoc.
- La validación runtime no está aplicada de forma uniforme: availability usa validación manual en vez de esquema (`app/api/availability/route.ts:7-64`).
- `skipLibCheck` + `allowJs` reducen rigor real del TypeScript.

**Severidad**: 🟡 Importante

**Archivos clave**
- `tsconfig.json:5-18`
- `auth.ts:16-23`
- `app/api/availability/route.ts:7-64`

### 10. Code Smells
**Estado actual**
- No encontré `TODO`, `FIXME` ni `HACK`.
- Hay duplicación significativa:
  - Parsing/formData repetido en create/update de productos (`app/admin/(dashboard)/products/actions.ts:51-62`, `97-108`)
  - Patrones de create/update/delete repetidos en categorías, productos, FAQ y páginas estáticas
  - Bloques de fallback/catch repetidos en páginas estáticas (`lib/static-pages/service.ts`, `app/admin/(dashboard)/pages/[slug]/page.tsx`)
- Hay funciones con demasiados parámetros:
  - `ProductTable(...)` recibe 7 props (`app/admin/(dashboard)/products/product-table.tsx:71`)
  - `checkOverlapAndCreate(productId, startDate, endDate, quantity, stock, extra)` recibe 6 (`lib/repositories/availability.ts:62-69`)
  - `saveLegalDocument(slug, localeInput, _prev, formData)` combina demasiadas responsabilidades (`app/admin/(dashboard)/pages/actions.ts:94-121`)
- Hay nesting relevante, sobre todo en:
  - `app/[locale]/page.tsx:146-215`
  - `app/admin/(dashboard)/products/product-form.tsx:106-177`
  - `components/catalog/availability-checker.tsx:83-145`
- Hay warnings de lint por imports/variables no usadas y uso de `<img>`:
  - `app/[locale]/catalog/[slug]/page.tsx:3`
  - `app/admin/(dashboard)/products/product-status-filter.tsx:14`
  - `app/admin/(dashboard)/products/product-table.tsx:5`
  - `app/admin/(dashboard)/users/user-table.tsx:53`
  - `components/admin/sidebar.tsx:25`
  - `components/public/header.tsx:16`

**Problemas detectados**
- Mucha lógica repetida en server actions.
- Demasiadas responsabilidades por archivo en admin products, static pages y forms.
- Lint está “verde” pero con warnings que ya muestran deuda técnica activa.

**Severidad**: 🟡 Importante

**Archivos clave**
- `app/admin/(dashboard)/products/actions.ts:46-398`
- `app/admin/(dashboard)/pages/actions.ts:62-223`
- `lib/static-pages/service.ts:16-88`
- `app/admin/(dashboard)/products/product-table.tsx:71-242`

## Top 10 Acciones Prioritarias
1. Proteger inmediatamente `app/api/admin/upload/presign/route.ts` y `app/api/admin/upload/delete/route.ts` con autorización real (`requireWriteAccess`) y devolver errores sin detalles internos.
2. Corregir aislamiento multi-tenant en `lib/repositories/product.ts`, `lib/repositories/variant.ts` y `lib/repositories/availability.ts` para filtrar por `storeId` en lecturas y escrituras.
3. Corregir accesos directos a `db` que hoy se saltan tenant boundaries, empezando por `app/admin/(dashboard)/users/[id]/edit/page.tsx` y `app/admin/(dashboard)/users/page.tsx`.
4. Introducir un contrato de errores consistente para APIs y server actions; hoy `app/api/admin/upload/route.ts`, `app/api/availability/route.ts` y `app/admin/(dashboard)/*/actions.ts` responden estructuras distintas.
5. Agregar tests mínimos críticos: auth/permisos, tenant isolation y mutations admin (`auth.ts`, `lib/auth/permissions.ts`, `app/admin/(dashboard)/users/actions.ts`, `app/admin/(dashboard)/products/actions.ts`).
6. Montar CI con al menos `npm run lint`, `npx tsc --noEmit` y suite de tests; hoy no existe `.github/workflows` y el typecheck ya falla.
7. Reparar typecheck corrigiendo rutas huérfanas referenciadas por Next (`.next/types/validator.ts` está apuntando a `cart`, `order/[orderId]` y `orders/[id]` inexistentes).
8. Reemplazar `process.env.X!` por validación de configuración al arranque en `lib/db.ts`, `lib/minio.ts`, `drizzle.config.ts` y `lib/config/tenant.ts`.
9. Descomponer `app/admin/(dashboard)/products/product-form.tsx` y `app/admin/(dashboard)/products/actions.ts` en unidades más pequeñas para separar UI, media upload y mutaciones.
10. Añadir logging estructurado, request correlation y un `/health` de aplicación; hoy no hay observabilidad operativa real.
