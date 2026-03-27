# Questions — Festejos Aurora

**Estados:** ⏳ Pendiente · ✅ Respondido · 🚫 Descartado

---

## Pendientes

#### ¿Cómo se maneja la devolución del depósito de garantía?
- **Área:** Pagos / Lógica de negocio
- **Estado:** ⏳ Pendiente
- **Impacto:** Define si se necesita un flujo de reembolso en Square o si queda 100% manual. Afecta el Sprint 3.
- **Respuesta:** —

#### ¿Qué páginas adicionales necesita el sitio además de la landing y el catálogo?
- **Área:** Producto / SEO
- **Estado:** ⏳ Pendiente
- **Impacto:** Define el alcance del sitemap y la estrategia SEO post-deadline. About, Contact, FAQ, Términos.
- **Respuesta:** —

#### ¿Cuál es la mejor arquitectura para hacer el software repetible/reusable?
- **Área:** Infraestructura / Arquitectura
- **Estado:** ⏳ Pendiente
- **Impacto:** Define la estratura de Docker, el mecanismo de multi-tenancy, y cómo se distribuye el repo a otros clientes. Ver ADR-003.
- **Respuesta:** —

---

## Respondidas

#### ¿Es renta o venta?
- **Área:** Modelo de negocio
- **Estado:** ✅ Respondido
- **Impacto:** Define el modelo de datos completo — availability, fechas en orders, lógica de calendario.
- **Respuesta:** Solo renta. Cada item tiene fecha de renta y fecha de devolución. Se necesita disponibilidad por fechas para evitar rentar equipo ya apartado.

#### ¿Los precios varían por producto?
- **Área:** Catálogo / Pagos
- **Estado:** ✅ Respondido
- **Impacto:** Define el enum `price_type` (FIXED vs PER_UNIT) y el cálculo del total en el carrito.
- **Respuesta:** Sí. Dos tipos: FIXED (brincolín: $130/8hrs — precio fijo por tiempo) y PER_UNIT (sillas: $2 c/u — se suma según cantidad).

#### ¿Se cobra depósito de garantía?
- **Área:** Pagos
- **Estado:** ✅ Respondido
- **Impacto:** Agrega `depositAmount` a orders y `depositPercent` a settings. Se cobra junto con el 50% de anticipo.
- **Respuesta:** Sí. Monto configurable desde el admin. La devolución se maneja manualmente fuera del sistema (pendiente de definir flujo exacto).

#### ¿Hay delivery?
- **Área:** Logística / Configuración
- **Estado:** ✅ Respondido
- **Impacto:** Define la tabla `settings.deliveryMode` y `zip_delivery_zones`. Admin lo configura globalmente.
- **Respuesta:** Sí, configurable globalmente. Tres modos: INCLUDED, FIXED_FEE, o variable por ZIP_CODE.

#### ¿Hay paquetes o combos predefinidos?
- **Área:** Catálogo
- **Estado:** ✅ Respondido
- **Impacto:** Simplifica el modelo — no se necesita tabla de paquetes.
- **Respuesta:** No. El usuario arma su propio combo agregando items individuales al carrito.

#### ¿Hay inventario limitado?
- **Área:** Catálogo / Disponibilidad
- **Estado:** ✅ Respondido
- **Impacto:** Requiere la tabla `availability` y la lógica de `FOR UPDATE` en checkout para evitar overbooking.
- **Respuesta:** Sí, muy importante. Inflables: 1 unidad. Sillas: N unidades según stock. El sistema maneja disponibilidad en tiempo real.

#### ¿Cuántos productos hay y hay categorías?
- **Área:** Catálogo
- **Estado:** ✅ Respondido
- **Impacto:** El sistema no tiene límite de productos. Se necesita tabla `categories`.
- **Respuesta:** Ilimitados. Sí hay categorías (mesas, sillas, inflables, decoración, etc.). Sin variantes — cada producto es único.

#### ¿El catálogo necesita panel de administración?
- **Área:** Admin / Gestión de catálogo
- **Estado:** ✅ Respondido
- **Impacto:** El panel admin es parte del scope del proyecto, no opcional.
- **Respuesta:** Sí. El admin puede cambiar precios, stock y propiedades. Los productos se guardan en DB, no en Square.

#### ¿El cliente ya tiene cuenta de Square?
- **Área:** Pagos
- **Estado:** ✅ Respondido
- **Impacto:** Se debe incluir setup de cuenta Square como tarea en Sprint 3.
- **Respuesta:** No. Falta crear y configurar la cuenta de Square.

#### ¿Cómo funciona el cobro?
- **Área:** Pagos
- **Estado:** ✅ Respondido
- **Impacto:** Define el flujo de checkout: Square cobre el 50% online; el 50% restante lo gestiona la admin en físico.
- **Respuesta:** 50% de anticipo al reservar (tarjeta online vía Square). 50% restante al entregar el equipo (efectivo, gestionado por la admin).

#### ¿Qué necesita ver el admin y quién tiene acceso?
- **Área:** Panel Admin
- **Estado:** ✅ Respondido
- **Impacto:** Define secciones del panel: pedidos, inventario, calendario, configuración. Define roles: ADMIN y EMPLOYEE.
- **Respuesta:** Admin (la dueña): control total. Empleados: solo lectura (pedidos + calendario). No se necesitan notificaciones para mantener el sistema simple.

#### ¿Necesita autenticación de usuarios?
- **Área:** Técnico / Auth
- **Estado:** ✅ Respondido
- **Impacto:** Los clientes compran sin crear cuenta — Auth.js solo protege `/admin`.
- **Respuesta:** No para clientes. Solo el panel admin tiene autenticación (Auth.js v5 con roles).

#### ¿Necesita ser bilingüe?
- **Área:** Técnico / i18n
- **Estado:** ✅ Respondido
- **Impacto:** Requiere next-intl, archivos de traducción, y selector de idioma en el header.
- **Respuesta:** Sí — inglés + español.

#### ¿Ya existe diseño o se hace desde cero?
- **Área:** UI / Diseño
- **Estado:** ✅ Respondido
- **Impacto:** Se usa Stitch para generar el código base + branding existente de la clienta.
- **Respuesta:** Ya existe branding (logo, colores, tipografía). Diseño implementado con Stitch como punto de partida.

#### ¿Cómo se coordina la entrega y recolección del equipo?
- **Área:** Logística
- **Estado:** ✅ Respondido
- **Impacto:** El email y teléfono del cliente son los campos críticos del checkout — la admin los usa para coordinar.
- **Respuesta:** La admin lo gestiona manualmente por teléfono/email. Al comprar, el cliente proporciona email y teléfono.
