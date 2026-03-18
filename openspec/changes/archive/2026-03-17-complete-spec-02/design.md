## Context

SPEC-02 del roadmap de Festejos Aurora requiere el shell del sitio con navegación compartida, landing completa, y un panel admin protegido con autenticación, roles y gestión de usuarios. Actualmente:

- Header/footer solo viven en `app/[locale]/page.tsx` (landing), no en un layout compartido
- Auth es un cookie hardcodeado (`admin`/`password`) sin verificación real
- No existe `middleware.ts` — rutas admin completamente expuestas
- Sidebar admin solo tiene Products y Categories
- No hay rol ROOT ni enforcement de permisos
- No existe `/admin/users`
- Landing le falta sección "cómo funciona"
- Metadata no tiene OG tags

## Goals / Non-Goals

**Goals:**
- Autenticación segura con Auth.js v5 y Drizzle Adapter
- Middleware que proteja `/admin/*` redirigiendo a login
- Sistema de roles ROOT > ADMIN > EMPLOYEE con enforcement real
- CRUD de usuarios desde el admin
- Layout compartido con header/footer para todas las páginas públicas
- Landing completa con sección "cómo funciona"
- Metadata SEO con OG tags por idioma

**Non-Goals:**
- Implementar las páginas de pedidos, calendario y configuración (son de SPECs posteriores) — solo agregar los links placeholder en el sidebar
- OAuth/social login — solo credenciales email+password
- Internacionalización del admin — se mantiene en inglés
- Notificaciones por email

## Decisions

### D1: Auth.js v5 con Credentials Provider + Drizzle Adapter

**Decisión:** Usar `next-auth@5` con `@auth/drizzle-adapter` y `CredentialsProvider` (email + bcrypt).

**Alternativas consideradas:**
- **Lucia Auth**: Más ligero pero menos ecosistema y sin adapter oficial para Drizzle
- **Custom JWT**: Más control pero reimplementa lo que Auth.js ya resuelve (sesiones, CSRF, cookies seguras)

**Rationale:** Auth.js v5 es el estándar del ecosistema Next.js, tiene adapter oficial para Drizzle, y las sesiones se guardan en la misma DB PostgreSQL sin infraestructura adicional.

### D2: Sesiones en base de datos (no JWT)

**Decisión:** Usar strategy `"database"` en Auth.js, no JWT.

**Rationale:** Con sesiones en DB se puede revocar acceso inmediatamente (desactivar usuario → sesión inválida en el siguiente request). Con JWT habría que esperar a que expire. Para un panel admin con pocos usuarios, el overhead de DB es negligible.

### D3: Rol ROOT como valor del enum, no tabla separada

**Decisión:** Agregar `"ROOT"` al enum `userRoleEnum` existente → `["ROOT", "ADMIN", "EMPLOYEE"]`.

**Rationale:** No se necesita una tabla de permisos separada. La jerarquía es simple y fija: ROOT crea ADMIN, ADMIN crea EMPLOYEE, EMPLOYEE solo lectura. Un enum es suficiente.

**Migración:** Se requiere `ALTER TYPE user_role ADD VALUE 'ROOT'` — Drizzle lo maneja con `drizzle-kit push`.

### D4: Middleware de Next.js para protección de rutas

**Decisión:** Crear `middleware.ts` en la raíz del proyecto que intercepte rutas `/admin/*` (excepto `/admin/login`) y verifique la sesión de Auth.js.

**Rationale:** El middleware de Next.js corre en el edge antes de renderizar la página. Es la forma estándar de proteger rutas con Auth.js v5.

### D5: Layout compartido en `app/[locale]/layout.tsx`

**Decisión:** Extraer header y footer de `app/[locale]/page.tsx` a componentes separados (`components/public/header.tsx`, `components/public/footer.tsx`) y renderizarlos en `app/[locale]/layout.tsx`.

**Rationale:** Todas las páginas públicas bajo `[locale]` necesitan la misma navegación. El layout es el lugar correcto para elementos persistentes entre páginas.

### D6: Menú mobile con estado client-side

**Decisión:** Agregar estado `useState` al header para toggle del menú mobile, renderizando los mismos links de navegación en un panel desplegable.

**Rationale:** Es la forma más simple. No necesita librería externa.

## Risks / Trade-offs

**[Auth.js Credentials Provider limitado]** → Auth.js desalienta el Credentials Provider por seguridad. Mitigation: Es aceptable para un admin interno con pocos usuarios. Se usa bcrypt y sesiones en DB.

**[Migración del enum en producción]** → `ALTER TYPE ADD VALUE` no es reversible en PostgreSQL. Mitigation: Es una adición (`ROOT`), no un cambio. No rompe datos existentes. Si se necesita rollback, el valor simplemente no se usa.

**[Sesiones existentes con cookie hardcodeado]** → Al migrar a Auth.js, cualquier sesión anterior queda inválida. Mitigation: Solo hay un admin en desarrollo. Re-login es trivial.

**[Layout compartido rompe landing]** → Al mover header/footer al layout, la landing page necesita refactoreo. Mitigation: Se elimina header/footer duplicado de `page.tsx` en el mismo PR.
