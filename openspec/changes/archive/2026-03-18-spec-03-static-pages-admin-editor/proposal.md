## Why

El `SPEC-03` del roadmap de Festejos Aurora exige páginas informativas y legales públicas, además de una sección en el panel admin para editar su contenido. Hoy el código no tiene rutas para `/about`, `/contact`, `/terms`, `/privacy`, `/refund-policy` ni `/faq`, y tampoco existe un modelo de datos o UI administrativa para gestionarlas, lo que deja incompleto el sitio público y bloquea cumplimiento legal y editorial.

## What Changes

- Agregar páginas públicas localizadas para About Us, Contact, Terms & Conditions, Privacy Policy, Refund Policy y FAQ dentro del árbol `app/[locale]`
- Incorporar persistencia bilingüe obligatoria en base de datos para cada página pública, con una versión en inglés y otra en español
- Separar el modelo editorial por tipo de página: contenido markdown para Terms/Privacy/Refund, FAQ con CRUD de pregunta/respuesta, Contact con campos estructurados y About como página estática
- Crear una sección administrativa para listar y editar cada vista pública respetando el tipo de datos que consume su pantalla
- Definir slugs y claves estables para estas páginas para que el sitio, el admin y los diseños de Pencil compartan la misma fuente de verdad

## Capabilities

### New Capabilities

- `static-informational-pages`: Páginas públicas localizadas para contenido informativo y legal con rutas estables y renderizado desde contenido persistente
- `admin-static-page-editor`: Gestión administrativa del contenido de páginas estáticas predefinidas, incluyendo listado, edición y guardado por idioma

### Modified Capabilities
<!-- No hay specs existentes que modificar -->

## Impact

- **Schema DB**: entidades nuevas para contenido estático bilingüe, FAQ y contacto estructurado
- **Rutas públicas**: nuevos segmentos dentro de `app/[locale]` para `about`, `contact`, `terms`, `privacy`, `refund-policy` y `faq`
- **Panel admin**: nueva sección para administrar páginas estáticas, con formularios por tipo de contenido y CRUD de FAQs
- **i18n**: cada página pública debe persistir una versión `en` y una versión `es`
- **Diseño de referencia**: alineación con las pantallas de `untitled.pen` para `About Us`, `Contact`, `Terms & Conditions`, `Privacy Policy`, `Refund Policy` y `FAQ`
- **Diseño de referencia panel admin**: alineación con las pantallas de `untitled.pen` para el panel de admin para controla lar informacion de las paginas `Admin — Pages List`, `Admin — Markdown Editor`, `Admin — Contact Editor`, `Admin — FAQ Editor`
- **Archivos principales afectados**:
  - `lib/db/schema.ts`
  - `lib/repositories/`
  - `app/[locale]/`
  - `app/admin/`
  - `components/admin/`
  - `lib/db/seed.ts`
