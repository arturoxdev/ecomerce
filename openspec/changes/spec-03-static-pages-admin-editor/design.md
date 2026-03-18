## Context

`SPEC-03` del roadmap pide seis páginas públicas de contenido informativo/legal y una sección administrativa para editarlas. El estado actual del proyecto es:

- No existen rutas públicas para `about`, `contact`, `terms`, `privacy`, `refund-policy` ni `faq`
- La navegación pública solo tiene placeholders para `about` y `contact`
- El panel admin solo cubre productos y categorías
- El schema actual no tiene una entidad para contenido editorial
- El sitio ya es bilingüe (`en` / `es`), por lo que el contenido de estas páginas debe resolverse por idioma

Este cambio cruza varias capas del sistema: modelo de datos, repositorios, rutas públicas, navegación pública y panel admin.

La referencia visual actual en Pencil (`untitled.pen`) confirma seis vistas objetivo con comportamientos distintos:
- `About Us`: página estática de storytelling
- `Contact`: vista con bloques estructurados de contacto
- `Terms & Conditions`, `Privacy Policy`, `Refund Policy`: páginas documentales largas
- `FAQ`: lista de preguntas/respuestas estilo accordion

## Goals / Non-Goals

**Goals:**
- Tener páginas públicas localizadas para las seis rutas definidas por `SPEC-03`
- Centralizar el contenido de esas páginas en una fuente persistente común para público y admin
- Permitir edición desde admin sin crear páginas arbitrarias fuera del alcance del roadmap
- Mantener slugs estables para que routing, navegación y editor apunten siempre a la misma entidad
- Permitir un fallback seguro para que una página siga renderizando aunque un idioma todavía no haya sido editado
- Respetar el tipo de dato real de cada vista: markdown legal, FAQ relacional, contacto estructurado y página About estática

**Non-Goals:**
- Construir un CMS genérico con creación libre de páginas, drafts, publishing workflow o versionado
- Implementar rich text avanzado, bloques modulares o editor tipo Notion
- Internacionalizar el panel admin completo
- Resolver SEO avanzado más allá de que existan páginas navegables y contenido correcto

## Decisions

### D1: Persistencia bilingüe obligatoria para cada página pública

**Decisión:** toda página pública del sistema DEBE tener persistencia por idioma, guardando una versión en inglés y una versión en español.

Esto implica modelar las entidades con `locale` o un mecanismo equivalente que garantice dos variantes persistidas por página: `en` y `es`.

**Alternativas consideradas:**
- **JSON hardcodeado en archivos de mensajes**: rápido, pero no editable desde admin
- **Una sola fila con columnas `titleEn`, `titleEs`, `bodyEn`, `bodyEs`**: menos filas, pero escala peor y hace más rígido el acceso por idioma
- **CMS genérico con slug libre**: demasiado amplio para el alcance de `SPEC-03`

**Rationale:** el routing ya está segmentado por locale, y el requerimiento de multilanguage es explícito. Persistir ambas variantes evita mezclar traducciones en código y deja el admin como fuente real de contenido.

### D2: Modelo de datos separado por tipo de vista

**Decisión:** no usar una sola tabla genérica para todo el contenido. El diseño se divide así:

- `about`: contenido estático bilingüe de página
- `terms`, `privacy`, `refund-policy`: documentos markdown bilingües
- `contact`: contenido estructurado bilingüe para `location`, `phone`, `email`, `businessHours`
- `faq`: tabla relacional de preguntas/respuestas con CRUD

**Alternativas consideradas:**
- **Una tabla genérica con un campo `body` para todo**: simple pero no representa bien FAQ ni Contact
- **JSON blob por página**: flexible pero dificulta validación, consultas y formularios tipados

**Rationale:** las pantallas de Pencil muestran necesidades distintas por vista. FAQ necesita múltiples entradas; Contact muestra bloques estructurados; las páginas legales funcionan mejor como markdown.

### D3: Catálogo cerrado de páginas administrables

**Decisión:** el sistema solo administra un conjunto fijo de páginas definidas en código y reflejadas en la DB mediante slugs conocidos.

**Alternativas consideradas:**
- **Permitir crear páginas arbitrarias desde admin**: agrega complejidad de validación, routing y navegación fuera del spec
- **Guardar solo páginas existentes manualmente**: frágil; el admin dependería de que alguien inserte registros a mano

**Rationale:** `SPEC-03` define páginas concretas. Un catálogo cerrado evita alcance extra y hace más fácil validar integridad y navegación.

### D4: Render público según el tipo de contenido

**Decisión:** el render público se resolverá por tipo:

- `about`: página estática con campos de contenido de página
- `terms`, `privacy`, `refund-policy`: render markdown
- `faq`: lista ordenada de preguntas/respuestas
- `contact`: bloques estructurados de contacto

Además, cada página intentará cargar su variante por `slug + locale` y usará contenido seeded o fallback controlado si falta algún dato requerido.

**Alternativas consideradas:**
- **404 si falta contenido**: correcto técnicamente, pero arriesga dejar páginas legales inaccesibles durante carga inicial
- **Hardcodear contenido de respaldo permanente**: duplica la fuente de verdad

**Rationale:** para páginas legales/informativas es preferible una experiencia degradada pero disponible, especialmente mientras se cargan textos reales.

### D5: UI admin orientada a tipos de formulario

**Decisión:** la sección admin de páginas estáticas tendrá vistas de edición diferenciadas:

- editor de markdown para `terms`, `privacy`, `refund-policy`
- formulario estructurado para `contact`
- formulario de contenido estático para `about`
- tabla con CRUD de pregunta/respuesta para `faq`

**Alternativas consideradas:**
- **Un solo formulario idéntico para todas las páginas**: no representa bien FAQ ni Contact
- **Editor WYSIWYG**: dependencia y complejidad innecesarias para el alcance actual

**Rationale:** el panel admin debe controlar las vistas reales, no forzar un esquema editorial artificial. Esta separación mantiene el modelado claro y hace el admin más usable.

### D6: Seed inicial obligatorio para todas las páginas requeridas

**Decisión:** el seed debe asegurar la existencia de contenido inicial para:

- `about` en `en` y `es`
- `terms` en `en` y `es`
- `privacy` en `en` y `es`
- `refund-policy` en `en` y `es`
- `contact` en `en` y `es`
- entradas iniciales de `faq` en `en` y `es`

**Alternativas consideradas:**
- **Crear registros on-demand al primer acceso**: genera rutas inconsistentes y estados difíciles de depurar
- **Requerir inserción manual**: no es repetible para nuevas instancias del negocio

**Rationale:** el proyecto ya busca ser repetible por instancia. Seedear estos registros deja el entorno listo desde el día uno.

## Risks / Trade-offs

**[Contenido legal placeholder en producción]** → Mitigación: marcar claramente en tareas y seed que el contenido inicial es provisional y debe sustituirse antes de release.

**[Markdown legal sin preview]** → Mitigación: mantener un formato markdown simple y dejar el render público como validación principal de la estructura.

**[FAQ requiere CRUD separado]** → Mitigación: modelar FAQ como tabla propia con operaciones acotadas a crear, editar, eliminar y reordenar si se necesita.

**[Contact tiene campos específicos]** → Mitigación: usar un formulario estructurado solo para `location`, `phone`, `email` y `businessHours`, evitando meter HTML o markdown donde no aplica.

**[Rutas públicas disponibles sin contenido final]** → Mitigación: fallback controlado y seed inicial para no dejar páginas vacías o con 404.

## Migration Plan

1. Agregar entidades para contenido estático bilingüe, contacto estructurado y FAQ
2. Extender el seed con registros iniciales en `en` y `es`
3. Crear las rutas públicas bajo `app/[locale]` con render por tipo de contenido
4. Actualizar la navegación pública para enlazar a rutas reales
5. Crear la sección admin con formularios específicos por vista y CRUD de FAQ
6. Validar que contenido editado en admin se refleje en páginas públicas

Rollback:
- Si el cambio necesita revertirse, se pueden retirar rutas y UI admin sin afectar productos, órdenes o categorías
- La tabla nueva queda aislada y no rompe entidades existentes

## Open Questions

- No hay preguntas abiertas por ahora; el alcance editorial quedó definido para markdown legal, FAQ relacional, About estático y Contact estructurado
