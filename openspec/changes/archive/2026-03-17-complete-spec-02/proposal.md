## Why

SPEC-02 del roadmap de Festejos Aurora define el shell del sitio, landing completa y panel admin protegido con autenticación y roles. Actualmente solo hay implementaciones parciales: la landing tiene hero pero le falta "cómo funciona", el header/footer no están en un layout compartido, no hay Auth.js (solo un cookie hardcodeado), las rutas admin están expuestas sin protección, no existe sistema de roles ni gestión de usuarios. Sin completar esto, el admin es inseguro y no se puede avanzar a SPECs posteriores que dependen de autenticación y autorización.

## What Changes

- Extraer header y footer a un layout compartido en `app/[locale]/layout.tsx` para que todas las páginas públicas tengan navegación consistente
- Agregar OG tags y twitter cards al metadata por idioma
- Agregar sección "cómo funciona" a la landing page
- Implementar Auth.js v5 con Drizzle Adapter y login por credenciales (email + bcrypt)
- Crear `middleware.ts` que proteja todas las rutas `/admin` redirigiendo a login si no hay sesión
- Completar sidebar del admin con enlaces a pedidos, calendario y configuración (páginas placeholder)
- Implementar sistema de roles: ROOT (único, crea admins), ADMIN (crea employees), EMPLOYEE (solo lectura)
- Crear sección `/admin/users` para gestionar usuarios con CRUD completo
- Actualizar seed para crear usuario ROOT inicial
- Corregir menú mobile (actualmente es un stub sin funcionalidad)

## Capabilities

### New Capabilities
- `auth-system`: Autenticación con Auth.js v5, Drizzle Adapter, login por credenciales email+bcrypt, middleware de protección de rutas `/admin`
- `role-system`: Sistema de roles ROOT/ADMIN/EMPLOYEE con permisos jerárquicos y enforcement en rutas y acciones
- `user-management`: CRUD de usuarios desde el panel admin con asignación de roles según jerarquía
- `shared-layout`: Layout compartido con header (logo, nav, selector idioma, menú mobile funcional) y footer en todas las páginas públicas, metadata SEO completa con OG tags
- `landing-complete`: Sección "cómo funciona" en la landing page y categorías destacadas desde DB
- `admin-shell-complete`: Sidebar completo con todas las secciones del admin (pedidos, calendario, configuración como placeholders)

### Modified Capabilities
<!-- No hay specs existentes que modificar -->

## Impact

- **Dependencias nuevas**: `next-auth@5` (Auth.js v5), `@auth/drizzle-adapter`
- **Schema DB**: Agregar rol `ROOT` al enum `userRoleEnum`
- **Archivos principales afectados**:
  - `lib/db/schema.ts` — enum de roles
  - `app/[locale]/layout.tsx` — header/footer compartido
  - `app/[locale]/page.tsx` — refactor para extraer header/footer + nueva sección
  - `app/admin/layout.tsx` — validación de sesión
  - `app/admin/actions.ts` — reemplazar auth hardcodeado
  - `middleware.ts` — nuevo archivo
  - `lib/auth.ts` o `auth.ts` — configuración Auth.js
  - `app/admin/users/` — nuevo directorio
  - `lib/db/seed.ts` — usuario ROOT
  - `components/admin/sidebar.tsx` — enlaces completos
