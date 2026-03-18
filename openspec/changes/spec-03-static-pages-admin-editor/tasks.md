## 1. Modelo de contenido estático

- [ ] 1.1 Agregar al schema persistencia bilingüe para páginas públicas, garantizando variantes `en` y `es`
- [ ] 1.2 Modelar por separado el contenido estático de `about`, los documentos markdown de `terms`/`privacy`/`refund-policy`, los campos estructurados de `contact` y la tabla de FAQ
- [ ] 1.3 Crear repositorios para consultar y guardar contenido por tipo de vista y por idioma
- [ ] 1.4 Extender el seed para garantizar registros iniciales bilingües y preguntas FAQ base

## 2. Rutas públicas informativas

- [ ] 2.1 Crear las rutas públicas localizadas para `about`, `contact`, `terms`, `privacy`, `refund-policy` y `faq` dentro de `app/[locale]`
- [ ] 2.2 Implementar render markdown para `terms`, `privacy` y `refund-policy`
- [ ] 2.3 Implementar render estructurado para `contact` y render de colección para `faq`
- [ ] 2.4 Implementar la carga de contenido por idioma con fallback seguro cuando falte contenido final
- [ ] 2.5 Actualizar la navegación pública para que los enlaces informativos apunten a rutas reales en vez de placeholders

## 3. Admin de páginas estáticas

- [ ] 3.1 Agregar una entrada de navegación para páginas estáticas en el sidebar del admin
- [ ] 3.2 Crear la vista administrativa que liste el catálogo fijo de páginas editables con sus slugs
- [ ] 3.3 Crear la pantalla/formulario de edición estática para `about`
- [ ] 3.4 Crear el editor markdown para `terms`, `privacy` y `refund-policy`
- [ ] 3.5 Crear el formulario estructurado de `contact` con `location`, `phone`, `email` y `businessHours`
- [ ] 3.6 Crear la tabla con CRUD de pregunta/respuesta para `faq`
- [ ] 3.7 Implementar el flujo de guardado por idioma sin afectar la otra variante

## 4. Integración y validación

- [ ] 4.1 Verificar que cada página pública consume su tipo de dato correcto y refleja cambios hechos desde admin
- [ ] 4.2 Verificar que el seed deja disponibles las variantes `en` y `es` para las vistas requeridas y preguntas FAQ iniciales
- [ ] 4.3 Ejecutar lint y revisión manual básica de navegación pública y admin para confirmar que `SPEC-03` queda cubierto
