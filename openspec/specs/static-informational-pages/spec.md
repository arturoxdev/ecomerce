# Purpose

Definir el comportamiento de las páginas públicas informativas y legales del sitio, incluyendo persistencia bilingüe, render por tipo de contenido y fallback seguro cuando aún no exista contenido final.

## Requirements

### Requirement: Rutas públicas para páginas informativas y legales
El sistema DEBE exponer rutas públicas localizadas para `about`, `contact`, `terms`, `privacy`, `refund-policy` y `faq` dentro del árbol `app/[locale]`.

#### Scenario: Acceso a página About en inglés
- **WHEN** un usuario navega a `/en/about`
- **THEN** el sistema renderiza la página About en inglés usando el contenido configurado para el slug `about`

#### Scenario: Acceso a página Privacy en español
- **WHEN** un usuario navega a `/es/privacy`
- **THEN** el sistema renderiza la página Privacy en español usando el contenido configurado para el slug `privacy`

### Requirement: Persistencia bilingüe obligatoria para cada página pública
El sistema DEBE guardar para cada página pública una versión en inglés y una versión en español para soportar multilanguage desde la base de datos.

#### Scenario: Selección correcta de contenido por locale
- **WHEN** existe contenido para el slug `terms` en `en` y `es`
- **THEN** `/en/terms` muestra la variante en inglés y `/es/terms` muestra la variante en español

#### Scenario: Slug compartido entre sitio y admin
- **WHEN** un administrador edita el slug `faq` en el panel admin
- **THEN** la ruta pública `/[locale]/faq` consume exactamente ese mismo registro lógico para cada idioma

### Requirement: Render markdown para páginas legales
El sistema DEBE almacenar y renderizar como markdown las páginas `terms`, `privacy` y `refund-policy`, correspondientes a las vistas legales del sitio.

#### Scenario: Render de Terms & Conditions desde markdown
- **WHEN** un usuario accede a `/en/terms`
- **THEN** el sistema transforma el contenido markdown guardado para `terms` en una página documental legible

#### Scenario: Render de Privacy Policy desde markdown en español
- **WHEN** un usuario accede a `/es/privacy`
- **THEN** el sistema transforma el contenido markdown guardado para `privacy` en español en una página documental legible

### Requirement: FAQ renderizado desde una colección de preguntas y respuestas
La página pública `faq` DEBE renderizar una colección de preguntas y respuestas obtenida desde una tabla dedicada, no desde un bloque único de texto.

#### Scenario: Listado de preguntas en FAQ
- **WHEN** existen múltiples registros de FAQ para un idioma
- **THEN** la página `/[locale]/faq` muestra todas las preguntas y respuestas de ese idioma en formato de lista o accordion

### Requirement: Contact renderizado desde campos estructurados
La página pública `contact` DEBE renderizar los datos `location`, `phone`, `email` y `businessHours` desde contenido estructurado persistido por idioma.

#### Scenario: Render de datos de contacto
- **WHEN** un usuario accede a `/en/contact`
- **THEN** la página muestra los valores guardados de `location`, `phone`, `email` y `businessHours` para inglés

### Requirement: About como página estática del sitio
La página `about` DEBE existir como página estática del sitio con contenido propio por idioma, separada de las páginas markdown legales y de la colección FAQ.

#### Scenario: About renderiza contenido estático
- **WHEN** un usuario accede a `/es/about`
- **THEN** el sistema muestra el contenido estático configurado para About en español

### Requirement: Fallback seguro de contenido
El sistema DEBE renderizar un fallback controlado cuando una página requerida no tenga contenido final cargado para un idioma, en lugar de fallar con un error de aplicación.

#### Scenario: Contenido faltante en un idioma
- **WHEN** un usuario accede a una página requerida y el contenido de ese slug para el idioma solicitado aún no existe o está incompleto
- **THEN** el sistema muestra una versión fallback válida de la página y mantiene la ruta accesible

### Requirement: Navegación pública con enlaces reales
El sistema DEBE enlazar desde la navegación pública a las páginas informativas disponibles en lugar de usar placeholders.

#### Scenario: Link About funcional en header
- **WHEN** un usuario hace click en el enlace About del header
- **THEN** el sistema navega a la ruta pública localizada correspondiente en vez de `#`

#### Scenario: Link Contact funcional en header
- **WHEN** un usuario hace click en el enlace Contact del header
- **THEN** el sistema navega a la ruta pública localizada correspondiente en vez de `#`
