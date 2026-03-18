## Purpose

Sidebar completo del panel admin con todas las secciones y visibilidad condicionada por rol de usuario.

## Requirements

### Requirement: Sidebar completo con todas las secciones
El sidebar del panel admin DEBE incluir enlaces a todas las secciones: Products, Categories, Users, Orders, Calendar y Settings.

#### Scenario: Ver sidebar completo
- **WHEN** un usuario autenticado accede al panel admin
- **THEN** el sidebar muestra los enlaces: Products, Categories, Users (solo ROOT/ADMIN), Orders, Calendar, Settings

#### Scenario: Secciones placeholder con mensaje
- **WHEN** un usuario navega a Orders, Calendar o Settings
- **THEN** ve una página con un mensaje "Coming soon" o "En construcción" indicando que la funcionalidad está pendiente

### Requirement: Sección Users condicionada por rol
El enlace a Users en el sidebar DEBE ser visible solo para usuarios con rol ROOT o ADMIN.

#### Scenario: EMPLOYEE no ve Users en sidebar
- **WHEN** un usuario con rol EMPLOYEE accede al panel admin
- **THEN** el sidebar NO muestra el enlace a Users

#### Scenario: ADMIN ve Users en sidebar
- **WHEN** un usuario con rol ADMIN accede al panel admin
- **THEN** el sidebar muestra el enlace a Users
