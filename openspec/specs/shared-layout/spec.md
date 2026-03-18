## Purpose

Layout compartido con header (logo, nav, selector idioma, menú mobile funcional) y footer en todas las páginas públicas, con metadata SEO completa incluyendo OG tags.

## Requirements

### Requirement: Header compartido en todas las páginas públicas
El sistema DEBE renderizar un header con logo, navegación, selector de idioma y menú mobile en todas las páginas bajo `app/[locale]/*`.

#### Scenario: Navegar de landing a catálogo
- **WHEN** un usuario está en la landing page y navega al catálogo
- **THEN** el header permanece visible con la misma estructura (logo, nav, selector idioma)

#### Scenario: Menú mobile funcional
- **WHEN** un usuario en pantalla mobile toca el botón de menú hamburguesa
- **THEN** se despliega un panel con los mismos enlaces de navegación (Home, Catalogue, About, Contact) y el selector de idioma

#### Scenario: Cerrar menú mobile
- **WHEN** el menú mobile está abierto y el usuario toca fuera o el botón de cerrar
- **THEN** el menú se cierra

### Requirement: Footer compartido en todas las páginas públicas
El sistema DEBE renderizar un footer con links sociales y copyright en todas las páginas bajo `app/[locale]/*`.

#### Scenario: Footer visible en todas las páginas
- **WHEN** un usuario navega a cualquier página pública (landing, catálogo, detalle de producto)
- **THEN** el footer con links a Facebook/Instagram y copyright está presente

### Requirement: Metadata SEO completa con OG tags
El sistema DEBE generar metadata con title, description, OG tags y twitter cards por idioma.

#### Scenario: OG tags en página en inglés
- **WHEN** un crawler accede a `/en`
- **THEN** el HTML incluye `og:title`, `og:description`, `og:type`, `og:locale` con valores en inglés

#### Scenario: OG tags en página en español
- **WHEN** un crawler accede a `/es`
- **THEN** el HTML incluye `og:title`, `og:description`, `og:type`, `og:locale` con valores en español
