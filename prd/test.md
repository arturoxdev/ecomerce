# PRD — Suite de Tests E2E con Playwright

**Proyecto:** Festejos Aurora (ecomerce)
**Autor:** Equipo de ingeniería
**Fecha:** 2026-04-13
**Estado:** Draft
**Stack de testing:** Playwright + Chromium (headed/headless), Next.js dev server, Drizzle + Postgres

---

## 1. Contexto

La aplicación es un marketplace de renta de artículos para eventos (inflables, mesas, carpas, equipo). Core del negocio:

- **Storefront público** (`app/[locale]/…`): catálogo, detalle con calendario de disponibilidad, carrito con rango de fechas, checkout.
- **Admin dashboard** (`app/admin/(dashboard)/…`): CRUD de productos/variantes/categorías, bloqueo manual de disponibilidad, órdenes, calendario operativo, usuarios staff, settings (delivery mode, deposit %), CMS de páginas estáticas y theme switcher.
- **Dominio multi-tenant** con roles `ROOT`, `ADMIN`, `EMPLOYEE` protegidos por NextAuth v5 + Credentials.

Hoy existen 3 specs en `e2e/` que cubren solo login admin, listado de catálogo y agregar al carrito. **El camino del dinero (checkout → orden → operación) no está cubierto**, y tampoco la integridad de inventario (doble renta por bloques mal aplicados).

## 2. Problema

Sin una suite de tests e2e que cubra los flujos críticos:

1. **Regresiones silenciosas** al tocar server actions de `placeOrder`, `availability`, `createProduct` o auth.
2. **Doble renta** si el cálculo de disponibilidad cruzado entre admin (bloqueos manuales) y storefront (rango del usuario) se rompe.
3. **Fricción en refactors** como la migración DAL en curso — sin safety net, cada cambio requiere QA manual.
4. **Onboarding lento** de nuevos desarrolladores: no hay documentación ejecutable de los flujos reales.

## 3. Objetivo

Construir una suite de tests e2e con Playwright que cubra el **20% de flujos responsables del 80% del riesgo**, ejecutable localmente (headed/headless) y en CI, con data setup reproducible.

### Métricas de éxito

- **Cobertura funcional:** 7 specs Tier 1 + 4 specs Tier 2 implementados y pasando, con 1 spec Tier 2 bloqueado hasta que exista la UI/flujo correspondiente.
- **Tiempo de ejecución total:** ≤ 3 min en local (headless), ≤ 6 min en CI.
- **Confianza para merge:** 0 regresiones introducidas en producción detectables por esta suite después de 2 sprints.
- **Flakiness:** < 2% de runs fallidos por razones no funcionales.

## 4. Alcance

### 4.1 En alcance (Tier 1 — imprescindibles)

Los 7 flujos que cubren el camino crítico del negocio:

#### T1. Checkout completo y creación de orden (`placeOrder`)
**Archivo propuesto:** `e2e/checkout-order-happy-path.spec.ts`
- Navegar a `/en/catalog/[slug]` de un producto sembrado.
- Seleccionar `rentStartDate` y `rentEndDate` en el calendario de disponibilidad.
- Verificar que el botón "Add to Cart" se habilita solo con rango válido.
- Verificar que el item se persiste en el store de Zustand (`localStorage`) con las fechas correctas.
- Ir a `/en/cart`.
- Llenar datos del cliente (nombre, email, teléfono, dirección).
- Validar cálculo visible de subtotal + depósito + delivery + total, dejando explícito que el depósito se muestra por separado y no se suma al `total` persistido.
- Confirmar orden → verificar redirección a `/en/order/[orderId]`.
- Verificar que la orden aparece en `/admin/orders` con los datos correctos.
- **Criterio de aceptación:** `orders` + `orderItems` + `availability` se escriben en una sola transacción; `subtotal`, `deliveryFee`, `depositAmount` y `total` coinciden entre UI y DB según las reglas actuales del checkout.

#### T2. Protección contra doble renta / disponibilidad tras ordenar
**Archivo propuesto:** `e2e/checkout-availability-guard.spec.ts`
- Crear una orden real con un producto y rango de fechas conocidos.
- En una sesión pública nueva, intentar reservar el mismo producto para el mismo rango.
- Verificar que el checkout rechaza la operación o que la UI reporta indisponibilidad.
- **Criterio de aceptación:** una reserva confirmada bloquea inventario para reservas solapadas.

#### T3. Bloqueo manual de disponibilidad ↔ storefront
**Archivo propuesto:** `e2e/admin-availability-block.spec.ts`
- Admin navega a `/admin/products/[id]/availability` y bloquea un rango.
- En contexto público (nueva session/page), abrir `/en/catalog/[slug]` del mismo producto.
- Seleccionar el mismo rango en el calendario y verificar que la UI reporta indisponibilidad o que el botón "Add to Cart" permanece deshabilitado.
- Eliminar el bloqueo en admin → refrescar storefront y verificar que el rango vuelve a estar disponible.
- **Criterio de aceptación:** los bloqueos admin afectan la disponibilidad visible del storefront en < 1 refresh.

#### T4. Ciclo de vida de producto en admin + visibilidad pública
**Archivo propuesto:** `e2e/admin-product-lifecycle.spec.ts`
- Admin navega a `/admin/products/new`.
- Llenar tabs **Basic Info** (nombre, slug, descripción, categoría, precio, stock).
- Guardar → verificar redirección a `/admin/products` y que aparece en el listado.
- Abrir `/admin/products/[id]/edit`.
- Llenar tab **Variants** con 1-2 variantes (nombre, precio, stock).
- Editar el producto y verificar persistencia.
- Desactivar el producto y verificar que desaparece del storefront.
- Reactivar el producto y verificar que vuelve a aparecer.
- **Criterio de aceptación:** el producto existe en DB, sus variantes se administran desde edición y su flag `isActive` se refleja en el storefront.

#### T5. Admin orders: listado + detalle
**Archivo propuesto:** `e2e/admin-orders.spec.ts`
- Precondición: 1+ orden sembrada con fechas conocidas.
- Navegar a `/admin/orders` → verificar listado paginado con status/customer/total.
- Abrir detalle `/admin/orders/[id]` → verificar items, fechas, dirección.
- **Criterio de aceptación:** el staff puede encontrar una orden y validar sus datos operativos sin falsos negativos.

#### T6. CRUD de categorías + reordenamiento
**Archivo propuesto:** `e2e/admin-categories.spec.ts`
- Admin navega a `/admin/categories`.
- Crear una categoría nueva → verificar que aparece en la lista.
- Reordenar usando controles explícitos de subir/bajar → verificar persistencia (`updateCategoryOrder`).
- Editar nombre/slug → verificar actualización.
- Eliminar categoría sin productos asociados → verificar remoción.
- Verificar que el orden se refleja en el nav lateral del storefront.
- **Criterio de aceptación:** el orden admin == orden público == orden en DB.

#### T7. Auth guards y logout del panel admin
**Archivo propuesto:** `e2e/admin-auth-guards.spec.ts`
- Sin sesión, navegar a `/admin/products` y verificar redirección a `/admin/login`.
- Con sesión válida, navegar al dashboard y verificar acceso.
- Ejecutar logout desde el sidebar.
- Intentar volver a abrir una ruta admin y verificar redirección a login.
- **Criterio de aceptación:** las rutas admin están protegidas y el cierre de sesión invalida el acceso.

### 4.2 En alcance (Tier 2 — siguiente ola)

#### T8. Persistencia del carrito y validaciones de checkout
**Archivo propuesto:** `e2e/cart-validation-and-persistence.spec.ts`
- Agregar 1+ productos al carrito.
- Recargar y verificar persistencia en header y `/en/cart`.
- Validar errores de nombre/email/teléfono requeridos.
- **Criterio de aceptación:** el carrito persiste y el usuario no puede confirmar una orden inválida.

#### T9. Settings operativos → reflejo en checkout
**Archivo propuesto:** `e2e/admin-settings-checkout-rules.spec.ts`
- **Estado actual:** bloqueado.
- La tabla `settings` ya soporta `deliveryMode`, `deliveryFee` y `depositPercent`, pero hoy no existe UI/admin flow implementado para modificarlos desde `/admin/settings`.
- **Criterio de desbloqueo:** implementar primero pantalla y acciones de settings operativos.

#### T10. Gestión de staff y permisos por rol
**Archivo propuesto:** `e2e/admin-users.spec.ts`
- Crear usuario EMPLOYEE, verificar que puede hacer login.
- Verificar que EMPLOYEE no puede crear usuarios y recibe acceso denegado o acceso limitado donde corresponda.
- Verificar que ADMIN solo puede crear/gestionar usuarios EMPLOYEE.
- Verificar que ROOT puede crear/gestionar usuarios ADMIN y EMPLOYEE.
- Desactivar usuario no-ROOT → verificar invalidación del acceso.
- Verificar que el usuario ROOT no puede ser editado/desactivado.
- **Criterio de aceptación:** los permisos por rol se reflejan correctamente en UI y auth.

#### T11. CMS: editar páginas estáticas bilingües
**Archivo propuesto:** `e2e/admin-cms.spec.ts`
- Editar About/Terms/FAQ en admin (en, es).
- Verificar cambios en `/en/about`, `/es/about`, `/en/terms`, etc.

#### T12. Schedule operativo por fecha
**Archivo propuesto:** `e2e/admin-calendar.spec.ts`
- Precondición: 1+ orden con fecha conocida.
- Navegar a `/admin/calendar`.
- Seleccionar la fecha esperada y verificar que la orden aparece en la tabla de schedule con tipo, cliente, items y dirección.
- **Criterio de aceptación:** el staff puede consultar entregas/recolecciones por fecha desde una tabla operativa.

#### T13. Theme switcher
**Archivo propuesto:** `e2e/appearance-theme.spec.ts`
- Cambiar tema en `/admin/settings/appearance`.
- Verificar que admin y storefront reflejan el tema actualizado mediante CSS variables o cambios visibles del tema tras navegación/refresh.
- **Criterio de aceptación:** el tema seleccionado se persiste y se refleja en ambos contextos.

### 4.3 Fuera de alcance

- Integraciones de pago reales (no hay gateway configurado; el flujo termina en `placeOrder`).
- Notificaciones por email/SMS.
- Tests de carga o performance (usar k6/Lighthouse por separado).
- Tests unitarios de lógica pura (Vitest es mejor herramienta).
- Tests de regresión visual pixel-perfect (Chromatic/Percy fuera de scope).
- Flujos OAuth (no hay providers configurados actualmente).
- Login con credenciales inválidas (ya cubierto en `admin-login.spec.ts`).
- Tests de i18n exhaustivos en toda la app — solo validamos que las rutas `/en` y `/es` responden en el CMS.

## 5. Requisitos técnicos

### 5.1 Infraestructura de testing

- **Runner:** Playwright `@playwright/test` (ya instalado, config en `playwright.config.ts`).
- **Browser:** Chromium único (ya configurado).
- **Dev server:** auto-start vía `webServer` en config (`npm run dev`, reuse si ya corre).
- **Auth storageState:** ya existe en `e2e/.auth/admin.json` vía `e2e/fixtures/auth.setup.ts`.

### 5.2 Data setup / fixtures

- **Estado actual:** existe seed base en `lib/db/seed.ts`, pero no está diseñada para aislamiento e2e por worker ni para garantizar exactamente los datos que necesita cada spec.
- **Propuesta:** crear `e2e/fixtures/seed.ts` que inserte/limpie datos en una transacción por worker usando Drizzle directamente, invocado desde un `beforeAll` o `test.beforeEach` por spec según necesidad. **No** usar API/server actions para seed (más lento, más frágil).
- **Aislamiento:** cada spec recibe IDs únicos por worker (`process.env.TEST_WORKER_INDEX`) para evitar colisiones en paralelo, usando prefijo `e2e-`.
- **Tenant:** alinear la estrategia con `STORE_ID`, que es la variable que usa realmente la app en runtime.
- **Cleanup:** `afterAll` elimina lo creado. Nunca borrar filas ajenas (filtrar por prefix `e2e-`).
- **Restricción de datos:** T2 y T3 deben usar productos `FIXED` o con stock `1` para que la expectativa de indisponibilidad sea determinista.

### 5.3 Variables de entorno requeridas

Ya requeridas por la app/tests:
- `TEST_ADMIN_EMAIL`
- `TEST_ADMIN_PASSWORD`
- `DATABASE_URL` (apuntando a DB de test o local)
- `STORE_ID`

A agregar (si no existen):
- `TEST_SEED_PREFIX=e2e-` — para prefijo de recursos creados en tests.

### 5.4 Convenciones de código

- Un spec por flujo. Nombrado `<area>-<flow>.spec.ts` en `e2e/`.
- Page Object Model opcional — usar solo si hay duplicación real entre specs (>3 usos del mismo selector).
- Preferir `getByRole`, `getByLabel`, `getByTestId` sobre CSS selectors.
- Agregar `data-testid` en componentes cuando el rol/label no sea suficiente — mínimo necesario.
- Agregar `aria-label` o `data-testid` a acciones icon-only críticas (reorder, edit, delete, availability, logout) si los locators semánticos no bastan.
- Tests independientes entre sí: ningún spec asume estado dejado por otro.
- Los specs públicos deben forzar `storageState` vacío; el proyecto Chromium usa auth admin por default.
- Los flujos que mezclan admin + storefront deben usar contextos separados dentro del mismo spec.
- Crear helpers de assertions a DB para validar `orders`, `orderItems`, `availability` y totales cuando el criterio de aceptación lo requiera.
- Timeouts explícitos solo cuando se justifique (default 30s es suficiente para la mayoría).

### 5.5 CI

- Agregar workflow GitHub Actions que corra `npx playwright test` en headless contra una DB postgres de servicio.
- Subir reporte HTML como artifact.
- Bloquear merge a `main` si la suite falla (requerirá configurar branch protection).

## 6. Fases de entrega

### Fase 1 — Infraestructura de fixtures (1 día)
- [ ] Crear `e2e/fixtures/seed.ts` con helpers para crear/limpiar productos, categorías, órdenes, bloques de disponibilidad.
- [ ] Actualizar `.env.example` con nuevas variables.
- [ ] Documentar en `e2e/README.md` cómo correr los tests localmente.

### Fase 2 — Tier 1 (camino del dinero) (2-3 días)
- [ ] T1 — Checkout completo y `placeOrder`
- [ ] T2 — Protección contra doble renta / disponibilidad tras ordenar
- [ ] T4 — Ciclo de vida de producto en admin + visibilidad pública

Al final de esta fase: **~60% del riesgo cubierto** con las 3 primeras specs.

### Fase 3 — Tier 1 (integridad y operación) (2 días)
- [ ] T3 — Bloqueo de disponibilidad cross-context
- [ ] T5 — Admin orders: listado + detalle
- [ ] T6 — CRUD + reordenamiento de categorías
- [ ] T7 — Auth guards y logout

Al final de esta fase: **~80% del riesgo cubierto**.

### Fase 4 — Tier 2 (complementarios) (2 días)
- [ ] T8 — Persistencia del carrito + validaciones
- [ ] T9 — Settings → checkout (bloqueado hasta implementar settings operativos)
- [ ] T10 — Staff + roles
- [ ] T11 — CMS bilingüe
- [ ] T12 — Schedule operativo por fecha
- [ ] T13 — Theme switcher

### Fase 5 — CI (0.5 día)
- [ ] Workflow GitHub Actions.
- [ ] Branch protection en `main`.
- [ ] Documentar comandos (`npm run test:e2e`, `npm run test:e2e:debug`, `npm run test:e2e:ui`).

**Estimación total:** 8-10 días-persona.

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Flakiness por estado compartido entre specs | Alto | Aislamiento por worker con prefix en seed + cleanup en `afterAll` |
| Reordenamiento de categorías inestable en headless | Medio | Preferir interacción con controles explícitos de subir/bajar; evitar depender de drag-drop si la UI no lo usa |
| Dev server lento en CI | Medio | Reusar build de producción (`npm run build && npm start`) en CI en vez de dev |
| DB test contaminada | Alto | Prefix `e2e-` en todos los recursos; script `test:e2e:cleanup` manual de emergencia |
| Cambios de UI rompen selectores | Medio | Preferir roles/labels sobre CSS; `data-testid` solo donde el rol sea ambiguo |
| `placeOrder` depende de settings de tienda | Alto | Seed setting específico por test suite; no depender del estado global |
| Specs públicas heredan auth admin por `storageState` default | Medio | Forzar `storageState` vacío en storefront y helpers explícitos para multi-context |
| Diferencia entre `deposit` visible y `total` persistido | Alto | Documentar explícitamente que `deposit` se muestra por separado y no se suma al `total` |
| Acciones icon-only sin nombre accesible estable | Medio | Agregar `aria-label` o `data-testid` mínimos en acciones críticas antes de escribir specs |

## 8. Criterios de aceptación global

- [ ] 11-12 specs ejecutables hoy (7 Tier 1 + 4-5 Tier 2), con T9 bloqueado hasta que exista settings operativo.
- [ ] Tiempo total de ejecución ≤ 3 min headless local, ≤ 6 min CI.
- [ ] `e2e/README.md` documenta: comandos, fixtures, cómo escribir un spec nuevo.
- [ ] Branch protection activa: no se puede mergear a `main` sin suite Tier 1 verde.
- [ ] 0 tests dependientes del orden de ejecución.
- [ ] 0 tests que dependan de datos creados manualmente fuera de fixtures.

## 9. Preguntas abiertas

1. **DB para CI:** ¿usamos Postgres como servicio en GitHub Actions o una DB compartida dedicada a tests? Recomendación: servicio por run (reproducible y aislado).
2. **¿Stripe/pagos?** Hoy `placeOrder` termina sin gateway real. Si se agrega en el futuro, habrá que decidir si mockear con `page.route()` o usar sandbox oficial. Por ahora fuera de scope.
3. **Multi-tenant en tests:** ¿un solo `STORE_ID` fijo o stores por worker? Recomendación: un `STORE_ID` fijo `e2e-store` + prefijo en recursos; crear stores completos añade complejidad sin valor.
4. **Tests de locale:** ¿validamos solo `en` y `es` en CMS, o hacemos matrix testing de todos los locales en todas las specs? Recomendación: matrix solo en CMS, resto en `en`.
5. **Retry policy:** ¿0 retries local y 2 en CI (config actual) o 0 en ambos para forzar tests estables? Recomendación: mantener la config actual; 2 retries en CI es razonable.

## 10. Referencias

- Specs existentes: `e2e/admin-login.spec.ts`, `e2e/catalog.spec.ts`, `e2e/cart.spec.ts`
- Config: `playwright.config.ts`
- Auth setup: `e2e/fixtures/auth.setup.ts`
- Skill: `.claude/skills/playwright-cli/`
- Server actions críticas: `app/[locale]/cart/actions.ts`, `features/admin-products/actions.ts`, `features/admin-categories/actions.ts`, `features/admin-users/actions.ts`
