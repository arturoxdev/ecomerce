## Purpose

Sistema de autenticación para el panel admin usando Auth.js v5 con Drizzle Adapter, login por credenciales email+bcrypt, sesiones en base de datos y middleware de protección de rutas.

## Requirements

### Requirement: Login por credenciales email y contraseña
El sistema DEBE permitir a los usuarios admin iniciar sesión con email y contraseña verificada con bcrypt mediante Auth.js v5 y Drizzle Adapter.

#### Scenario: Login exitoso
- **WHEN** un usuario ingresa email y contraseña correctos en `/admin/login`
- **THEN** el sistema verifica el hash bcrypt, crea una sesión en la base de datos, y redirige a `/admin/products`

#### Scenario: Login fallido por credenciales incorrectas
- **WHEN** un usuario ingresa email o contraseña incorrectos
- **THEN** el sistema muestra un mensaje de error genérico "Credenciales inválidas" sin revelar si el email existe

#### Scenario: Login con usuario desactivado
- **WHEN** un usuario con `isActive: false` intenta iniciar sesión con credenciales correctas
- **THEN** el sistema DEBE rechazar el login con el mismo mensaje de error genérico

### Requirement: Sesiones en base de datos
El sistema DEBE almacenar sesiones en PostgreSQL usando el Drizzle Adapter de Auth.js, no JWT.

#### Scenario: Sesión persistente tras refresh
- **WHEN** un usuario autenticado recarga la página
- **THEN** la sesión se valida contra la tabla `sessions` en la DB y el usuario permanece autenticado

#### Scenario: Sesión revocada al desactivar usuario
- **WHEN** un admin desactiva un usuario que tiene sesión activa
- **THEN** en el siguiente request del usuario desactivado, el middleware DEBE rechazar la sesión y redirigir a login

### Requirement: Logout
El sistema DEBE permitir cerrar sesión desde el panel admin.

#### Scenario: Logout exitoso
- **WHEN** un usuario autenticado hace click en "Logout" en el sidebar
- **THEN** la sesión se elimina de la DB y el usuario es redirigido a `/admin/login`

### Requirement: Middleware de protección de rutas admin
El sistema DEBE tener un middleware que proteja todas las rutas bajo `/admin/*` excepto `/admin/login`.

#### Scenario: Acceso sin sesión a ruta protegida
- **WHEN** un usuario no autenticado intenta acceder a cualquier ruta `/admin/*`
- **THEN** el sistema redirige a `/admin/login`

#### Scenario: Acceso con sesión válida
- **WHEN** un usuario autenticado accede a una ruta `/admin/*`
- **THEN** el sistema permite el acceso normalmente

#### Scenario: Página de login accesible sin sesión
- **WHEN** un usuario no autenticado accede a `/admin/login`
- **THEN** el sistema muestra el formulario de login sin redirigir
