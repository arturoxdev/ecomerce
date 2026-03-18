## ADDED Requirements

### Requirement: Lista de usuarios en admin
El sistema DEBE mostrar una tabla de todos los usuarios registrados en `/admin/users`.

#### Scenario: Ver lista de usuarios
- **WHEN** un usuario ROOT o ADMIN accede a `/admin/users`
- **THEN** ve una tabla con nombre, email, rol, estado (activo/inactivo) y fecha de creación de cada usuario

### Requirement: Crear usuario
El sistema DEBE permitir crear nuevos usuarios desde el panel admin respetando la jerarquía de roles.

#### Scenario: ROOT crea un ADMIN
- **WHEN** un ROOT llena el formulario de nuevo usuario con nombre, email, contraseña y rol ADMIN
- **THEN** el sistema crea el usuario con la contraseña hasheada con bcrypt y rol ADMIN

#### Scenario: ADMIN crea un EMPLOYEE
- **WHEN** un ADMIN llena el formulario de nuevo usuario
- **THEN** el sistema solo permite seleccionar el rol EMPLOYEE y crea el usuario correctamente

#### Scenario: Email duplicado
- **WHEN** se intenta crear un usuario con un email que ya existe
- **THEN** el sistema muestra un error "Este email ya está registrado"

### Requirement: Editar usuario
El sistema DEBE permitir editar nombre, email, rol y estado de un usuario existente.

#### Scenario: Cambiar rol de usuario
- **WHEN** un ROOT edita un usuario y cambia su rol de EMPLOYEE a ADMIN
- **THEN** el cambio se persiste y aplica en el siguiente login del usuario

#### Scenario: Desactivar usuario
- **WHEN** un admin desactiva un usuario (isActive: false)
- **THEN** el usuario no puede iniciar sesión y su sesión activa se invalida

#### Scenario: No se puede editar al ROOT
- **WHEN** cualquier usuario intenta cambiar el rol o desactivar al usuario ROOT
- **THEN** el sistema DEBE rechazar la operación

### Requirement: Seed del usuario ROOT inicial
El seed script DEBE crear un usuario ROOT con credenciales configurables.

#### Scenario: Ejecutar seed en DB limpia
- **WHEN** se ejecuta `npm run db:seed` en una base de datos sin usuarios
- **THEN** se crea un usuario con rol ROOT, email `admin@festejosaurora.com` y contraseña hasheada con bcrypt
