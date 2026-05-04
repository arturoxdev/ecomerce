# ADR-008: Página Home con medio único global (sin variante por locale)

**Fecha:** 2026-05-04
**Estado:** Aceptado

## Contexto

El admin necesita poder reemplazar la imagen del hero del landing (`app/[locale]/page.tsx`) con una foto o video propio. Hoy el hero apunta a una URL hardcodeada de `lh3.googleusercontent.com` que es frágil (la URL puede caer) y no es editable por el dueño de la tienda.

El resto de las páginas administrables (`about`, `contact`, `terms`, `privacy`, `refund-policy`, `faq`) viven en tablas con clave `(storeId, slug, locale)` porque su contenido es texto traducible — cada locale tiene su propia copia. La forma natural de extender ese patrón sería agregar una tabla `home_page_contents` con la misma clave, una row por idioma.

Sin embargo, el contenido editable del hero en esta primera iteración es **sólo el medio (foto o video)**. Los textos del hero (`m.hero.titleStart`, `m.hero.titleHighlight`, descripción, badges, CTAs) siguen viviendo en `messages/{en,es}.json` y se traducen vía i18n estático, no vía DB.

## Decisión

1. **Tabla `home_page_contents` con clave única `(storeId, slug)`**, sin columna `locale`. Una row por tienda.
2. **Enum `home_page_slug = ['home']`** consistente con `aboutPageSlugEnum` / `contactPageSlugEnum`. Reservamos el patrón aunque por ahora sólo haya un valor.
3. **Columna `heroMediaUrl text`** nullable. Inferimos `image` vs `video` en render usando `isImageUrl()` / `isVideoUrl()` de `lib/services/media.ts` — mismo patrón que `products.photos`.
4. **Fallback a la URL hardcodeada actual** cuando `heroMediaUrl` es `null`. Lo movemos del page a `pages-fallbacks.service.ts` para que tenga un solo dueño.
5. **Validaciones de upload**: video ≤20s + ≤20MB (`video.duration` leído en cliente antes de subir); imagen genera warning suave si <1280×720 o aspect <1.3, sin bloqueo. Reutilizamos `/api/admin/upload/presign` extendido con un parámetro `prefix` para meter las piezas en `${storeId}/home/...`.
6. **Reemplazo borra el archivo viejo de S3** después del commit en DB (orden seguro: subir nuevo → update DB → delete old). Si el delete falla, queda archivo huérfano pero el sitio sigue intacto.
7. **Botón "Eliminar"** en el form regresa a `heroMediaUrl = null` y borra el archivo de S3, dejando que el visitante vuelva a ver el fallback.

## Razón

- El hero es **visual, no traducible**. Subir una imagen distinta por locale duplica el upload sin un beneficio real: rara vez vas a tener "imagen para angloparlantes" diferente a "imagen para hispanohablantes". Forzar `(storeId, slug, locale)` añadiría una columna que en la práctica siempre tendría el mismo valor para los dos idiomas.
- El catálogo `staticPageCatalog` y la convención `editorType` permiten agregar `home` como una nueva entrada sin tocar el resto del flujo admin: una nueva branch en `app/admin/(dashboard)/pages/[slug]/page.tsx` para `editorType === "home"`, todo lo demás se reutiliza.
- Inferir `image|video` desde la URL replica el patrón de `products.photos` (que también puede ser foto o video) — los helpers `isImageUrl` / `isVideoUrl` ya existen en `lib/services/media.ts`. Agregar una columna `mediaType` sería redundante con la información que ya carga la URL.
- Borrar el archivo viejo de S3 después del commit (no antes) protege la disponibilidad del sitio: si el delete falla, hay archivo huérfano pero el visitante nunca ve el hero roto.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Tabla `home_page_contents` con clave `(storeId, slug, locale)` (consistente con about/contact) | Duplica el upload del admin sin que cambie nada visible: el hero es visual, no texto. Si en el futuro algún cliente pide imagen distinta por idioma, agregar columna `locale` con default + `unique (storeId, slug, locale)` es una migración simple |
| Columna `heroMediaType` enum (`image\|video`) explícita | Redundante: la extensión de la URL ya determina el tipo, y `isImageUrl/isVideoUrl` están probados en el resto del repo |
| Bloquear upload si la imagen no cumple aspect ratio mínimo | Le da fricción al admin con un warning innecesario; la mayoría de hero images "no perfectas" se ven bien con `object-cover`. Warning suave preserva la flexibilidad |
| Borrar el archivo viejo de S3 antes del commit en DB | Si el commit falla queda DB con URL inválida y archivo borrado: hero roto en producción |
| Mantener la URL de Google como fallback indefinidamente y no permitir "Eliminar" en el admin | El admin necesita una salida para revertir un upload malo sin tener que producir y subir otra pieza |
| Editar también los textos del hero (badge, título, CTAs) | Out of scope: los textos hoy viven en i18n estático y mover a DB requiere doble form (uno por locale), schema mucho más grande, y duplicar lo que i18n ya hace bien. Si después se pide, se agrega como segunda iteración |

## Consecuencias

**Ventajas:**

- Schema chico: una row por tienda, una sola URL nullable.
- Cero impacto en el resto del flujo admin: el catálogo crece en una entrada y el editor reusa toda la infraestructura existente.
- Eliminamos la URL frágil de Google, sin pedirle al admin que haga onboarding obligatorio.

**Limitaciones / cosas a vigilar:**

- Si en el futuro un cliente pide imagen distinta por locale, la migración requiere agregar columna `locale` con default y cambiar el unique. Es directo pero es una migración. Esto está documentado para que el siguiente revisor del schema entienda la divergencia con `about_page_contents`.
- Borrar S3 después del commit puede dejar archivos huérfanos si el delete falla (red, permisos, etc.). No hay un sweeper periódico hoy; los huérfanos pagan storage hasta que alguien los limpie manualmente.
- El fallback queda en `pages-fallbacks.service.ts` y apunta a `lh3.googleusercontent.com`. Si esa URL muere, todas las tiendas que aún no hayan subido una pieza se quedan sin hero hasta que actualicemos el fallback. Vale la pena migrar el fallback a un asset commiteado en `public/` cuando haya tiempo (no en este PR).

## Migración

1. `pnpm drizzle-kit generate` — crea el enum `home_page_slug` y la tabla `home_page_contents` con `unique (storeId, slug)`.
2. Revisar el SQL generado: el enum debe contener sólo `'home'`; la tabla con `heroMediaUrl text` (nullable, sin default).
3. `pnpm drizzle-kit migrate`.
4. Verificar:

   ```sql
   SELECT count(*) FROM home_page_contents;  -- 0 inicialmente
   \d home_page_contents                      -- columnas y unique presentes
   ```

Sin path de rollback automático: revertir requiere `DROP TABLE home_page_contents` y `DROP TYPE home_page_slug`. No hay datos que se pierdan en un revert temprano.
