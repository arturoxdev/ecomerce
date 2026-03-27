## ADDED Requirements

### Requirement: Campo about en productos
La tabla `products` DEBE tener un campo `about` de tipo TEXT nullable para almacenar contenido largo en formato markdown que describe el producto en detalle.

#### Scenario: Producto sin about
- **WHEN** un producto no tiene valor en el campo `about`
- **THEN** la sección "About This Product" NO se muestra en la página de catálogo

#### Scenario: Producto con about
- **WHEN** un producto tiene contenido markdown en el campo `about`
- **THEN** la sección "About This Product" se muestra en la página de catálogo con el markdown renderizado como HTML

### Requirement: Textarea de about en formulario admin
El formulario de producto en `/admin/products/new` y `/admin/products/:id/edit` DEBE incluir un textarea etiquetado "About this product" que acepte contenido markdown.

#### Scenario: Crear producto con about
- **WHEN** el admin llena el textarea de about con contenido markdown y guarda
- **THEN** el contenido se persiste en el campo `about` de la base de datos

#### Scenario: Editar producto existente
- **WHEN** el admin abre el formulario de edición de un producto que tiene `about`
- **THEN** el textarea de about muestra el contenido existente

### Requirement: Límite de 150 caracteres en description
El campo `description` del formulario admin DEBE estar limitado a 150 caracteres con un contador visual en tiempo real.

#### Scenario: Contador de caracteres visible
- **WHEN** el admin escribe en el textarea de description
- **THEN** se muestra un contador con formato `{caracteres_actuales}/150` debajo del campo

#### Scenario: Validación server-side
- **WHEN** el admin envía un formulario con description mayor a 150 caracteres
- **THEN** el servidor rechaza el formulario con un error de validación

### Requirement: Normalización de slug server-side
El server action DEBE normalizar el slug antes de persistir: convertir a minúsculas, reemplazar espacios por guiones, y eliminar caracteres que no sean letras minúsculas, números o guiones.

#### Scenario: Slug con mayúsculas y espacios
- **WHEN** el admin envía un slug como "Mi Producto Nuevo"
- **THEN** el sistema lo normaliza a "mi-producto-nuevo" antes de guardar

#### Scenario: Slug con caracteres especiales
- **WHEN** el admin envía un slug como "Café & Más!"
- **THEN** el sistema lo normaliza a "caf-ms" antes de guardar

### Requirement: Renderizado de about en catálogo
La página de detalle del producto (`/catalog/:slug`) DEBE renderizar el campo `about` como HTML usando el componente `MarkdownContent` existente, dentro de una card blanca con bordes redondeados siguiendo el diseño de Pencil.

#### Scenario: Sección about con headings y listas
- **WHEN** el campo about contiene headings (`##`), párrafos y listas (`- item`)
- **THEN** se renderizan como elementos HTML semánticos (h2, p, ul/li) con estilos consistentes

#### Scenario: Sección about ubicación en página
- **WHEN** la página de detalle se carga con un producto que tiene `about`
- **THEN** la sección "About This Product" aparece debajo de la grid principal (galería + info), separada por un divider
