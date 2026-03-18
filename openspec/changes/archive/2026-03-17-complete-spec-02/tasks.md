## 1. Schema y migración de base de datos

- [x] 1.1 Agregar `ROOT` al enum `userRoleEnum` en `lib/db/schema.ts` → `["ROOT", "ADMIN", "EMPLOYEE"]`
- [x] 1.2 Ejecutar `drizzle-kit push` para aplicar la migración del enum

## 2. Auth.js v5 con Drizzle Adapter

- [x] 2.1 Instalar dependencias: `next-auth@5` (beta) y `@auth/drizzle-adapter`
- [x] 2.2 Crear `auth.ts` en la raíz con configuración de Auth.js: Drizzle Adapter, CredentialsProvider (email + bcrypt), strategy `"database"`, callbacks para incluir `role` e `id` en la sesión
- [x] 2.3 Crear `auth.config.ts` con la configuración de páginas (signIn: `/admin/login`)
- [x] 2.4 Crear `middleware.ts` que proteja rutas `/admin/*` excepto `/admin/login` usando `auth()` de Auth.js
- [x] 2.5 Refactorear `app/admin/login/page.tsx` para usar `signIn` de Auth.js en lugar del action hardcodeado
- [x] 2.6 Reemplazar `app/admin/actions.ts` — logout usa `signOut` de Auth.js, eliminar `loginAdmin` hardcodeado
- [x] 2.7 Agregar variables de entorno: `AUTH_SECRET` en `.env`

## 3. Sistema de roles y autorización

- [x] 3.1 Crear helper `lib/auth/permissions.ts` con función `canCreateRole(currentRole, targetRole)` que implemente la jerarquía ROOT > ADMIN > EMPLOYEE
- [x] 3.2 Crear helper `getSessionUser()` que retorne el usuario actual con su rol desde la sesión de Auth.js
- [x] 3.3 Agregar validación de rol en server actions de escritura existentes (productos, categorías): rechazar si el usuario es EMPLOYEE
- [x] 3.4 En componentes del admin, ocultar botones de crear/editar/eliminar si el usuario es EMPLOYEE

## 4. Gestión de usuarios (`/admin/users`)

- [x] 4.1 Crear `app/admin/users/page.tsx` con tabla de usuarios (nombre, email, rol, estado, fecha)
- [x] 4.2 Crear `app/admin/users/actions.ts` con server actions: `createUser`, `updateUser`, `toggleUserActive`
- [x] 4.3 Crear formulario de creación de usuario con validación de email único y selección de rol según jerarquía
- [x] 4.4 Crear formulario de edición de usuario con protección del usuario ROOT (no se puede cambiar rol ni desactivar)
- [x] 4.5 Implementar toggle de activar/desactivar usuario con invalidación de sesión

## 5. Layout compartido (header, footer, metadata)

- [x] 5.1 Extraer header de `app/[locale]/page.tsx` a `components/public/header.tsx` como componente con props `locale` y `messages`
- [x] 5.2 Extraer footer de `app/[locale]/page.tsx` a `components/public/footer.tsx`
- [x] 5.3 Renderizar header y footer en `app/[locale]/layout.tsx`
- [x] 5.4 Eliminar header y footer duplicados de `app/[locale]/page.tsx`
- [x] 5.5 Implementar menú mobile funcional en el header con `useState` para toggle
- [x] 5.6 Agregar OG tags (`openGraph`) y twitter cards al `generateMetadata` en `app/[locale]/layout.tsx`

## 6. Landing page completa

- [x] 6.1 Agregar traducciones de la sección "Cómo funciona" a `messages/en.json` y `messages/es.json` (3-4 pasos: navegar, seleccionar, pagar, recibir)
- [x] 6.2 Crear sección "Cómo funciona" en `app/[locale]/page.tsx` entre el hero y la sección de equipos
- [x] 6.3 Reemplazar categorías/productos hardcodeados en la landing por datos desde la DB (query a categorías + productos destacados)

## 7. Sidebar admin completo

- [x] 7.1 Agregar enlaces a Orders, Calendar, Settings y Users en `components/admin/sidebar.tsx`
- [x] 7.2 Condicionar visibilidad del enlace Users según rol del usuario (solo ROOT/ADMIN)
- [x] 7.3 Crear páginas placeholder para `/admin/orders`, `/admin/calendar`, `/admin/settings` con mensaje "Coming soon"

## 8. Seed actualizado

- [x] 8.1 Actualizar `lib/db/seed.ts` para crear el usuario inicial con rol `ROOT` en lugar de `ADMIN`
