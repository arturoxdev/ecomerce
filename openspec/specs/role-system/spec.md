## Purpose

Sistema de roles jerárquico ROOT > ADMIN > EMPLOYEE con permisos diferenciados y enforcement en rutas y acciones del panel admin.

## Requirements

### Requirement: Jerarquía de roles ROOT > ADMIN > EMPLOYEE
El sistema DEBE implementar tres roles con jerarquía fija: ROOT (único, máximo privilegio), ADMIN (gestión), EMPLOYEE (solo lectura).

#### Scenario: ROOT crea usuario ADMIN
- **WHEN** un usuario ROOT accede a `/admin/users` y crea un nuevo usuario
- **THEN** puede asignar los roles ADMIN o EMPLOYEE

#### Scenario: ADMIN crea usuario EMPLOYEE
- **WHEN** un usuario ADMIN accede a `/admin/users` y crea un nuevo usuario
- **THEN** solo puede asignar el rol EMPLOYEE

#### Scenario: EMPLOYEE no puede crear usuarios
- **WHEN** un usuario EMPLOYEE accede al panel admin
- **THEN** NO ve la sección de gestión de usuarios en el sidebar y no puede acceder a `/admin/users`

### Requirement: Enum ROOT en la base de datos
El schema DEBE incluir el valor `ROOT` en el enum `userRoleEnum`: `["ROOT", "ADMIN", "EMPLOYEE"]`.

#### Scenario: Migración del enum
- **WHEN** se ejecuta `drizzle-kit push`
- **THEN** el enum `user_role` en PostgreSQL incluye los valores ROOT, ADMIN y EMPLOYEE

### Requirement: Restricciones de escritura para EMPLOYEE
Los usuarios con rol EMPLOYEE DEBEN tener acceso de solo lectura al panel admin.

#### Scenario: EMPLOYEE accede a página de productos
- **WHEN** un usuario EMPLOYEE navega a `/admin/products`
- **THEN** puede ver la lista de productos pero los botones de crear, editar y eliminar NO están visibles

#### Scenario: EMPLOYEE intenta acción de escritura directa
- **WHEN** un usuario EMPLOYEE ejecuta una server action de escritura (crear, editar, eliminar)
- **THEN** la acción DEBE rechazar la operación con error de autorización
