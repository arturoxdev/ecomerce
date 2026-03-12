## ADDED Requirements

### Requirement: Toggle rápido de activación/desactivación
El sistema DEBE permitir al administrador cambiar el estado `isActive` de un producto directamente desde la tabla de productos sin necesidad de entrar al formulario de edición.

#### Scenario: Activar producto inactivo
- **WHEN** el admin presiona el toggle de estado en un producto con `isActive: false`
- **THEN** el sistema cambia `isActive` a `true`
- **AND** se revalida la lista de productos
- **AND** se muestra un toast "Producto activado"

#### Scenario: Desactivar producto activo
- **WHEN** el admin presiona el toggle de estado en un producto con `isActive: true`
- **THEN** el sistema cambia `isActive` a `false`
- **AND** se revalida la lista de productos
- **AND** se muestra un toast "Producto desactivado"

#### Scenario: Producto no encontrado
- **WHEN** se intenta hacer toggle de un producto que no existe
- **THEN** el sistema DEBE retornar un error "Producto no encontrado"

### Requirement: Filtro por estado en tabla de productos
El sistema DEBE proveer tabs de filtrado por estado (Todos, Activos, Inactivos) en la página de listado de productos.

#### Scenario: Filtrar productos activos
- **WHEN** el admin selecciona el tab "Activos"
- **THEN** la URL cambia a `?status=active`
- **AND** solo se muestran productos con `isActive: true`
- **AND** la paginación se resetea a página 1
- **AND** el conteo total refleja solo los productos activos

#### Scenario: Filtrar productos inactivos
- **WHEN** el admin selecciona el tab "Inactivos"
- **THEN** la URL cambia a `?status=inactive`
- **AND** solo se muestran productos con `isActive: false`
- **AND** la paginación se resetea a página 1

#### Scenario: Mostrar todos los productos
- **WHEN** el admin selecciona el tab "Todos" o no hay parámetro status
- **THEN** se muestran todos los productos sin filtro de estado

#### Scenario: Parámetro status inválido
- **WHEN** la URL contiene un valor de status no reconocido
- **THEN** el sistema DEBE tratarlo como "all" y mostrar todos los productos

### Requirement: Diferenciación visual de productos inactivos
El sistema DEBE aplicar estilos visuales diferenciados a los productos inactivos en la tabla para facilitar su identificación.

#### Scenario: Fila de producto inactivo con opacidad reducida
- **WHEN** la tabla muestra un producto con `isActive: false`
- **THEN** la fila DEBE tener opacidad reducida (`opacity-50`)

#### Scenario: Badge de estado clickeable
- **WHEN** la tabla muestra el estado de un producto
- **THEN** el badge de estado DEBE ser clickeable y ejecutar el toggle de activación
- **AND** el badge verde indica "Activo" y el badge gris indica "Inactivo"
- **AND** el badge se deshabilita durante la transición

### Requirement: Preservación de filtro en paginación
La paginación DEBE preservar el filtro de estado activo al navegar entre páginas.

#### Scenario: Navegar a siguiente página manteniendo filtro
- **WHEN** el admin está viendo productos filtrados por "Activos" en la página 1
- **AND** navega a la página 2
- **THEN** la URL mantiene `?status=active&page=2`
- **AND** solo se muestran productos activos de la página 2
