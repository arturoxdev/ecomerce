# Gestión de Productos y Variantes del Inventario

> Estado: draft
> Módulo: `catalog`
> Última actualización: 2026-04-17

## Propósito

Definir cómo el panel admin gestiona productos y variantes del inventario, y qué
impacto tiene esa gestión sobre el catálogo público.

## Alcance

Este spec cubre:

- listado admin de productos
- creación de productos
- edición de productos
- activación y desactivación rápida
- variantes de producto
- normalización de slug
- límite de `description`
- campo `about` en markdown
- efecto de `isActive` sobre el storefront

## No cubre

Este spec no cubre:

- categorías y su orden
- disponibilidad por fechas y bloqueos manuales
- carrito y checkout
- subida detallada de media si después se extrae a otro spec


## Modelo funcional

Un producto representa una unidad rentable del catálogo.

Campos principales:

- `name`
- `slug`
- `description`
- `about`
- `categoryId`
- `basePrice`
- `priceType`
- `stock`
- `photos`
- `isArchived`
- `isActive`

Una variante representa una opción del producto con nombre, precio, stock y
estado propio.

## Reglas de negocio

### Regla: Un producto debe poder administrarse desde el panel

El admin DEBE poder ver todos los productos, activos e inactivos, desde
`/admin/products`.

#### Scenario: Lista de productos en admin
- **WHEN** un usuario con permiso de escritura entra a `/admin/products`
- **THEN** ve una tabla con nombre, categoría, precio base, stock, estado y acciones

#### Scenario: Catálogo vacío
- **WHEN** no existen productos en la tienda
- **THEN** la tabla muestra un estado vacío con una acción para crear el primer producto

### Regla: Crear producto con datos mínimos válidos

El sistema DEBE permitir crear un producto con los campos requeridos del modelo.

Campos requeridos:

- `name`
- `slug`
- `categoryId`
- `basePrice`
- `priceType`

#### Scenario: Creación exitosa
- **WHEN** el admin envía un formulario válido
- **THEN** el sistema crea el producto y redirige al listado con confirmación de éxito

#### Scenario: Campos requeridos faltantes
- **WHEN** el admin envía el formulario sin uno o más campos requeridos
- **THEN** el sistema rechaza la operación y muestra errores inline por campo

### Regla: El slug debe ser estable y normalizado por el servidor

El sistema DEBE normalizar el slug antes de persistirlo.

La normalización incluye:

- convertir a minúsculas
- reemplazar espacios por `-`
- remover caracteres no permitidos

#### Scenario: Slug con mayúsculas y espacios
- **WHEN** el admin envía `Mi Producto Nuevo`
- **THEN** el sistema guarda `mi-producto-nuevo`

#### Scenario: Slug duplicado
- **WHEN** el admin intenta guardar un slug ya existente dentro de la misma tienda
- **THEN** el sistema rechaza la operación y muestra un error en el campo `slug`

### Regla: La descripción corta debe mantenerse acotada

El campo `description` DEBE tener un límite máximo de 150 caracteres.

#### Scenario: Contador visible
- **WHEN** el admin escribe en `description`
- **THEN** el formulario muestra el conteo actual sobre 150 caracteres

#### Scenario: Exceso de longitud
- **WHEN** el admin intenta guardar una descripción mayor a 150 caracteres
- **THEN** el servidor rechaza la operación con error de validación

### Regla: El producto puede incluir contenido largo en markdown

El campo `about` DEBE aceptar contenido markdown para describir el producto en
detalle.

#### Scenario: Crear producto con about
- **WHEN** el admin completa `about` y guarda el producto
- **THEN** el markdown se persiste sin perder formato

#### Scenario: Producto sin about
- **WHEN** un producto no tiene contenido en `about`
- **THEN** la sección larga de detalle no se renderiza en el storefront

### Regla: Editar cualquier campo permitido del producto

El admin DEBE poder editar los campos administrables de un producto existente.

#### Scenario: Edición exitosa
- **WHEN** el admin modifica un producto existente y guarda
- **THEN** el sistema actualiza el registro y confirma la operación

#### Scenario: Producto inexistente
- **WHEN** el admin intenta editar un producto que ya no existe
- **THEN** el sistema responde con error de producto no encontrado

### Regla: Activar o desactivar productos sin entrar al formulario

El estado `isActive` DEBE poder cambiarse desde la tabla de productos.

#### Scenario: Desactivar producto activo
- **WHEN** el admin usa el toggle o badge de estado sobre un producto activo
- **THEN** el sistema cambia `isActive` a `false`, revalida la tabla y muestra confirmación

#### Scenario: Activar producto inactivo
- **WHEN** el admin usa el toggle o badge de estado sobre un producto inactivo
- **THEN** el sistema cambia `isActive` a `true`, revalida la tabla y muestra confirmación

### Regla: El estado del producto impacta el storefront

Un producto inactivo NO DEBE mostrarse en el catálogo público navegable.

#### Scenario: Producto inactivo oculto
- **WHEN** un producto está marcado como inactivo
- **THEN** deja de aparecer en el listado público del catálogo

#### Scenario: Producto reactivado
- **WHEN** el admin reactiva un producto
- **THEN** vuelve a ser elegible para mostrarse en el storefront

### Regla: Las variantes forman parte del producto

Un producto PUEDE tener variantes con precio, stock y estado propio.

#### Scenario: Producto con variantes activas
- **WHEN** el producto tiene variantes activas
- **THEN** el sistema usa las variantes para mostrar opciones y precio mínimo cuando aplique

#### Scenario: Variante inactiva
- **WHEN** una variante se marca como inactiva
- **THEN** deja de estar disponible para selección pública sin eliminar el producto base

## Reglas de UI admin

### Tabla de productos

La tabla DEBE permitir:

- identificar productos activos e inactivos visualmente
- navegar a edición
- cambiar estado rápidamente
- acceder a disponibilidad desde la fila si aplica

#### Scenario: Producto inactivo diferenciable
- **WHEN** la tabla muestra un producto inactivo
- **THEN** la fila o badge usa un tratamiento visual reducido o diferenciado

### Filtros del listado

La pantalla DEBE soportar filtros por estado y, cuando aplique, por categoría y búsqueda.

#### Scenario: Filtro por activos
- **WHEN** el admin filtra por productos activos
- **THEN** la URL conserva `status=active` y la tabla muestra solo activos

#### Scenario: Filtro inválido
- **WHEN** la URL contiene un valor de filtro no reconocido
- **THEN** el sistema lo trata como sin filtro válido y evita romper la vista

## Reglas de integridad

### Unicidad por tienda

- el `slug` debe ser único por `storeId`

### Eliminación

Hay dos maneras de borrado archivar y borrador

el borrado elimina el producto y todo lo relacionado a el
el archivado solo lo oculta de todos lados y ya no se pueden ver datos tanto en el strorefront ni en el admin panel

