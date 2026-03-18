## ADDED Requirements

### Requirement: Catálogo fijo de páginas editables en admin
El panel admin DEBE mostrar un catálogo fijo de páginas editables correspondiente a `about`, `contact`, `terms`, `privacy`, `refund-policy` y `faq`.

#### Scenario: Ver lista de páginas del sistema
- **WHEN** un administrador accede a la sección de páginas estáticas
- **THEN** ve las seis páginas requeridas por el roadmap con sus slugs estables

### Requirement: Edición bilingüe por vista pública
El panel admin DEBE permitir editar cada vista pública en sus dos variantes persistidas: inglés y español.

#### Scenario: Editar About en español
- **WHEN** un administrador abre la edición de la página `about` en idioma `es`, modifica el contenido y guarda
- **THEN** el sistema persiste los cambios únicamente para `about` en español

#### Scenario: Editar About en inglés sin afectar español
- **WHEN** un administrador guarda cambios en la variante `en` de la página `about`
- **THEN** la variante `es` existente permanece sin modificaciones

### Requirement: Editor markdown para páginas legales
El panel admin DEBE ofrecer edición markdown para `terms`, `privacy` y `refund-policy`.

#### Scenario: Editar Refund Policy como markdown
- **WHEN** un administrador abre la edición de `refund-policy`
- **THEN** encuentra un editor orientado a markdown y el contenido se guarda como markdown para el idioma seleccionado

### Requirement: CRUD de FAQs
El panel admin DEBE permitir crear, editar y eliminar preguntas y respuestas de FAQ por idioma.

#### Scenario: Crear una nueva FAQ
- **WHEN** un administrador crea una nueva entrada con pregunta y respuesta en español
- **THEN** el sistema guarda un nuevo registro FAQ asociado al idioma `es`

#### Scenario: Editar una FAQ existente
- **WHEN** un administrador modifica la respuesta de una FAQ existente en inglés
- **THEN** el sistema actualiza solo esa entrada FAQ en inglés

#### Scenario: Eliminar una FAQ
- **WHEN** un administrador elimina una pregunta frecuente
- **THEN** la entrada desaparece del panel admin y deja de renderizarse en la página pública correspondiente

### Requirement: Formulario estructurado para Contact
El panel admin DEBE restringir la edición de la página Contact a los campos `location`, `phone`, `email` y `businessHours`.

#### Scenario: Editar campos de Contact
- **WHEN** un administrador abre la vista de Contact
- **THEN** el formulario solo permite editar `location`, `phone`, `email` y `businessHours` para el idioma seleccionado

### Requirement: About administrado como página estática
El panel admin DEBE tratar `about` como una página estática con su propio contenido por idioma, sin usar el editor markdown legal ni el CRUD de FAQ.

#### Scenario: Editar About con formulario de página
- **WHEN** un administrador abre la edición de About
- **THEN** el sistema muestra un formulario de contenido estático de página acorde a esa vista

### Requirement: Persistencia reutilizable por el sitio público
Los cambios guardados desde el panel admin DEBEN quedar disponibles como fuente de verdad para las rutas públicas correspondientes.

#### Scenario: Cambio visible en página pública
- **WHEN** un administrador actualiza el contenido de `refund-policy` en inglés
- **THEN** la ruta pública `/en/refund-policy` refleja el contenido actualizado

### Requirement: Seed inicial de páginas estáticas
El sistema DEBE crear o garantizar en seed los registros iniciales bilingües para las vistas estáticas requeridas y entradas FAQ iniciales.

#### Scenario: Seed en base de datos vacía
- **WHEN** se ejecuta el seed en una base de datos sin contenido estático
- **THEN** el sistema crea registros iniciales para `about`, `contact`, `terms`, `privacy`, `refund-policy` y entradas de `faq` en `en` y `es`
