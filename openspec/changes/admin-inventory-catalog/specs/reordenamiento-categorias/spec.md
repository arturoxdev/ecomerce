## ADDED Requirements

### Requirement: Campo sortOrder en modelo Category
El sistema DEBE agregar un campo `sortOrder` de tipo `Int` con default `0` al modelo `Category` para controlar el orden de visualización.

#### Scenario: Migración agrega campo sortOrder
- **WHEN** se ejecuta la migración de Prisma
- **THEN** el modelo `Category` tiene un campo `sortOrder` de tipo Int con default 0
- **AND** las categorías existentes reciben valores secuenciales basados en orden alfabético por nombre

### Requirement: Reordenar categorías
El sistema DEBE permitir al administrador cambiar el orden de las categorías mediante una server action que recibe las posiciones actualizadas.

#### Scenario: Reordenamiento exitoso
- **WHEN** el admin cambia la posición de una categoría (subir o bajar)
- **THEN** el sistema actualiza el `sortOrder` de todas las categorías afectadas en una transacción
- **AND** se revalida la ruta de categorías admin y el catálogo público

#### Scenario: Validación de datos
- **WHEN** se envían datos de reordenamiento con IDs inválidos
- **THEN** el sistema DEBE retornar un error de validación

### Requirement: Categorías nuevas se agregan al final
El sistema DEBE asignar automáticamente un `sortOrder` al final de la lista al crear una nueva categoría.

#### Scenario: Crear categoría con sortOrder automático
- **WHEN** el admin crea una nueva categoría
- **THEN** el sistema asigna `sortOrder = max(sortOrder existente) + 1`
- **AND** la nueva categoría aparece al final de la lista

### Requirement: Botones de reordenamiento en tabla de categorías
El sistema DEBE mostrar botones arriba/abajo en cada fila de la tabla de categorías para cambiar su posición.

#### Scenario: Mover categoría hacia arriba
- **WHEN** el admin presiona el botón "arriba" en una categoría que no es la primera
- **THEN** la categoría intercambia posición con la categoría inmediatamente superior
- **AND** el cambio se refleja visualmente de inmediato (update optimista)

#### Scenario: Mover categoría hacia abajo
- **WHEN** el admin presiona el botón "abajo" en una categoría que no es la última
- **THEN** la categoría intercambia posición con la categoría inmediatamente inferior
- **AND** el cambio se refleja visualmente de inmediato (update optimista)

#### Scenario: Botones deshabilitados en extremos
- **WHEN** una categoría está en la primera posición
- **THEN** el botón "arriba" DEBE estar deshabilitado
- **WHEN** una categoría está en la última posición
- **THEN** el botón "abajo" DEBE estar deshabilitado

#### Scenario: Rollback en caso de error
- **WHEN** falla la actualización del servidor después del update optimista
- **THEN** el sistema DEBE revertir el orden visual al estado anterior
- **AND** mostrar un toast de error

### Requirement: Ordenamiento por sortOrder en todas las consultas
Todas las consultas que listan categorías DEBEN ordenar por `sortOrder` ascendente en lugar de por nombre.

#### Scenario: Tabla de categorías admin ordenada por sortOrder
- **WHEN** el admin accede a la lista de categorías
- **THEN** las categorías se muestran ordenadas por `sortOrder` ascendente

#### Scenario: Catálogo público ordenado por sortOrder
- **WHEN** un usuario accede al catálogo público
- **THEN** las categorías se muestran ordenadas por `sortOrder` ascendente

#### Scenario: Selectores de categoría en formularios de producto
- **WHEN** se muestra el selector de categoría en el formulario de producto (nuevo o editar)
- **THEN** las categorías se listan ordenadas por `sortOrder` ascendente
