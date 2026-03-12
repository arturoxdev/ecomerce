## ADDED Requirements

### Requirement: Campo reason en modelo Availability
El sistema DEBE agregar un campo `reason` de tipo `String?` al modelo `Availability` para almacenar el motivo de bloqueos manuales.

#### Scenario: Migración agrega campo reason
- **WHEN** se ejecuta la migración de Prisma
- **THEN** el modelo `Availability` tiene un campo `reason` nullable de tipo String
- **AND** los registros existentes de Availability no se ven afectados (reason = null)

### Requirement: Crear bloqueo manual de fechas
El sistema DEBE permitir al administrador crear un bloqueo de disponibilidad sin orden asociada para un producto específico, con rango de fechas y motivo opcional.

#### Scenario: Creación exitosa de bloqueo manual
- **WHEN** el admin envía un formulario con productId, startDate, endDate y reason (opcional)
- **AND** el producto existe
- **AND** no hay solapamiento que exceda el stock disponible
- **THEN** el sistema crea un registro en `Availability` con `orderId: null`, las fechas indicadas, `quantity: 1` y el `reason` proporcionado
- **AND** se revalida la página de disponibilidad del producto

#### Scenario: Rechazo por solapamiento de fechas
- **WHEN** el admin intenta crear un bloqueo para un rango de fechas
- **AND** la suma de `quantity` de registros existentes que se solapan con ese rango es >= al `stock` del producto
- **THEN** el sistema DEBE retornar un error indicando que no hay stock disponible para esas fechas

#### Scenario: Rechazo por fecha de inicio en el pasado
- **WHEN** el admin intenta crear un bloqueo con `startDate` anterior a la fecha actual
- **THEN** el sistema DEBE retornar un error de validación indicando que la fecha de inicio no puede ser en el pasado

#### Scenario: Rechazo por rango inválido
- **WHEN** el admin intenta crear un bloqueo donde `endDate` <= `startDate`
- **THEN** el sistema DEBE retornar un error de validación indicando que la fecha de fin debe ser posterior a la de inicio

### Requirement: Eliminar bloqueo manual
El sistema DEBE permitir al administrador eliminar un bloqueo manual existente. Solo se DEBEN poder eliminar bloqueos que no tengan orden asociada.

#### Scenario: Eliminación exitosa de bloqueo manual
- **WHEN** el admin solicita eliminar un bloqueo con `orderId: null`
- **THEN** el sistema elimina el registro de Availability
- **AND** se revalida la página de disponibilidad del producto

#### Scenario: Rechazo de eliminación de reserva de orden
- **WHEN** el admin intenta eliminar un registro de Availability que tiene `orderId` no nulo
- **THEN** el sistema DEBE retornar un error indicando que no se pueden eliminar reservas asociadas a órdenes

### Requirement: Consultar bloqueos de un producto
El sistema DEBE proveer una función para obtener todos los registros de disponibilidad de un producto, incluyendo información de la orden asociada cuando exista.

#### Scenario: Consulta de bloqueos con datos completos
- **WHEN** se consultan los bloqueos de un producto
- **THEN** el sistema retorna una lista ordenada por `startDate` descendente
- **AND** cada registro incluye: id, startDate, endDate, quantity, reason, y la orden asociada (id, customerName) si existe

### Requirement: Página de gestión de disponibilidad
El sistema DEBE proveer una página dedicada en `/admin/products/[id]/availability` para gestionar los bloqueos de disponibilidad de un producto.

#### Scenario: Carga exitosa de la página
- **WHEN** el admin navega a `/admin/products/[id]/availability` con un id de producto válido
- **THEN** la página muestra el nombre del producto en el título
- **AND** muestra el formulario de creación de bloqueos
- **AND** muestra la tabla de bloqueos existentes

#### Scenario: Producto no encontrado
- **WHEN** el admin navega a `/admin/products/[id]/availability` con un id inexistente
- **THEN** el sistema muestra una página 404

### Requirement: Formulario de bloqueo manual
El sistema DEBE proveer un formulario para crear bloqueos manuales con campos de fecha inicio, fecha fin y motivo opcional.

#### Scenario: Envío exitoso del formulario
- **WHEN** el admin completa los campos obligatorios (startDate, endDate) y opcionalmente reason
- **AND** envía el formulario
- **THEN** el sistema ejecuta `createManualBlock`
- **AND** muestra un toast de éxito al completar

#### Scenario: Errores de validación inline
- **WHEN** el admin envía el formulario con datos inválidos
- **THEN** el sistema muestra mensajes de error debajo de cada campo con error
- **AND** muestra errores generales (como solapamiento) en un mensaje global

#### Scenario: Estado de carga durante envío
- **WHEN** el formulario está siendo enviado
- **THEN** el botón de envío se DEBE deshabilitar y mostrar estado de carga

### Requirement: Tabla de bloqueos con diferenciación visual
El sistema DEBE mostrar una tabla con todos los bloqueos del producto, diferenciando visualmente entre bloqueos manuales y reservas de órdenes.

#### Scenario: Visualización diferenciada
- **WHEN** la tabla muestra registros de disponibilidad
- **THEN** los bloqueos manuales (orderId = null) muestran un badge naranja "Bloqueo manual"
- **AND** las reservas de orden muestran un badge azul con "Reserva #" y el nombre del cliente

#### Scenario: Eliminación solo en bloqueos manuales
- **WHEN** la tabla muestra bloqueos
- **THEN** solo los bloqueos manuales (orderId = null) tienen botón de eliminar
- **AND** al presionar eliminar, se muestra un diálogo de confirmación

#### Scenario: Tabla vacía
- **WHEN** no hay registros de disponibilidad para el producto
- **THEN** la tabla muestra el mensaje "No hay bloqueos registrados"

### Requirement: Enlace a disponibilidad desde tabla de productos
El sistema DEBE mostrar un enlace/icono en cada fila de la tabla de productos que lleve a la página de gestión de disponibilidad del producto.

#### Scenario: Navegación a disponibilidad
- **WHEN** el admin hace click en el icono de disponibilidad de un producto
- **THEN** el sistema navega a `/admin/products/[id]/availability`

### Requirement: API pública de disponibilidad considera bloqueos manuales
La API existente `GET /api/availability` DEBE considerar los bloqueos manuales en su cálculo de stock ocupado sin requerir cambios adicionales.

#### Scenario: Stock reducido por bloqueo manual
- **WHEN** un producto tiene un bloqueo manual activo para un rango de fechas
- **AND** se consulta la API de disponibilidad para ese rango
- **THEN** el stock disponible se reduce según la cantidad del bloqueo
- **AND** el comportamiento es idéntico al de una reserva de orden
