# Roadmap — Festejos Aurora

**Deadline:** 26 de marzo de 2026

---

## SPEC-01 — Fundación del proyecto
Setup inicial del repositorio con todas las dependencias, configuración del entorno y conexión a la base de datos.

- [x] Inicializar proyecto Next.js 14 con App Router y estructura de carpetas
- [x] Configurar Tailwind CSS con el branding de Aurora (colores, tipografía, logo)
- [x] Configurar next-intl con archivos de traducción EN/ES y selector de idioma en el header
- [x] Definir schema completo con Drizzle ORM (`categories`, `products`, `orders`, `availability`, `settings`, `users`, etc.)
- [x] Crear índice compuesto `(productId, startDate, endDate)` en tabla `availability`
- [x] Levantar PostgreSQL local con Docker Compose y correr migraciones con `drizzle-kit push`
- [x] Seed script con datos placeholder funcionales para desarrollo

---

## SPEC-02 — Shell del sitio, landing y panel admin protegido
Páginas públicas principales del sitio y setup del panel administrativo con autenticación y roles.

- [x] Layout raíz con header (logo, navegación, selector de idioma EN/ES) y footer
- [x] Metadatos SEO base (title, description, OG tags) por idioma
- [x] Landing page: hero section con CTA al catálogo, sección "cómo funciona", categorías destacadas
- [x] Configurar Auth.js v5 con Drizzle Adapter (credenciales email + bcrypt)
- [x] Middleware que protege todas las rutas `/admin`
- [x] Layout del panel admin con sidebar de navegación (pedidos, inventario, calendario, configuración)
- [x] Sistema de roles: `ROOT` (único, crea admins), `ADMIN` (crea employees), `EMPLOYEE` (solo lectura)
- [x] Sección en admin para crear y gestionar usuarios
- [x] Seed del usuario ROOT inicial
- [x] Responsive completo, bilingüe EN/ES

---

## SPEC-03 — Páginas informativas y legales con editor en admin
Páginas estáticas del sitio con contenido editable desde el panel admin.

- [x] Página Quiénes somos `/about`
- [x] Página Contacto `/contact`
- [x] Página Términos y Condiciones `/terms` — política de daños, cancelaciones y responsabilidad del cliente con el equipo rentado
- [x] Página Política de Privacidad `/privacy` — requerida por ley en EE.UU. al procesar pagos y guardar datos personales
- [x] Página Política de Reembolsos `/refund-policy` — cancelaciones, equipo dañado y 50% restante no pagado
- [x] Página FAQ `/faq` — proceso de renta, tiempos de entrega, zonas de cobertura y política de daños
- [x] Sección en el panel admin para editar el contenido de cada una de estas páginas

---

## SPEC-03-B Agregar input largo para productos,un producto puede tener variaciones

- [X] en la ruta /admin/products/:id/edit y /admin/products/new
  - [X] debemos agregar un textarea para para el "about this product" el cual recibira markdown, el campo en la db se llamara "about"
  - [X] el slug debemos validarlo para que haga la validacion correcta de un slug todo en minusculas y los espacios sustituidos por "-", cada que se guarde un cambio formatear antes de enviar a la db
  - [X] el description ahora vamos a limitarlo a 150 caracteres entonces , en el input agrega un validador para que el usuario sepa cuantos caracteres le quedan libres
- [X] en la ruta catalog/:slug el cual muestra los detalles de un producto
  - [X] en la seccion check availability el rango debe estar implementado con el componente de shadcn y dentro de un componente podemos seleccionar un rango de fechas
  - [X] el about us sera rendirazada para eso necesitamos un parser de markdown->html, para eso toma el disenio de "pencil" el mcp para crear el disnio ve el frame "Product Detail Page"
---

## SPEC-04 — Catálogo público con SEO y gestión de inventario en admin
Catálogo de productos con rutas dinámicas por categoría optimizadas para SEO y CRUD completo desde el panel admin.

- [ ] Página `/catalogo` con grid de productos y filtro por categoría
- [ ] Rutas dinámicas por categoría (`/mesas`, `/sillas`, etc.) — se generan automáticamente al crear categorías en admin
- [ ] Página de detalle de producto con galería de fotos, descripción y precio
- [ ] CRUD de productos en admin: crear, editar, desactivar
- [ ] Subida de fotos de productos
- [ ] Gestión de categorías en admin: crear, editar, reordenar
- [ ] Edición de precio, tipo (FIXED / PER_UNIT) y stock por producto
- [ ] Bloqueo manual de fechas en `availability` sin orden asociada (mantenimiento, reservas externas)

---

## SPEC-05 — Calendario de disponibilidad en admin
Vista de calendario en el panel admin que refleja todas las órdenes activas con sus productos y horarios.

- [ ] Vista de calendario con entregas y devoluciones próximas agrupadas por fecha
- [ ] Mostrar productos relacionados a cada orden en el calendario
- [ ] Visualización de bloqueos manuales diferenciados de las órdenes reales

---

## SPEC-06 — Carrito con estado global
Los clientes pueden agregar productos al carrito y navegar el sitio sin perder su selección.

- [ ] Agregar y quitar productos desde la página de detalle
- [ ] Cambiar cantidades dentro del carrito
- [ ] Estado global persistente al navegar entre páginas
- [ ] Resumen de orden: subtotal, depósito (% configurable desde settings) y delivery fee según modo activo

---

## SPEC-07 — Carrito con validación de disponibilidad y configuración de delivery
El carrito consulta disponibilidad en tiempo real antes de permitir agregar un producto, y el admin configura las reglas de entrega.

- [ ] Mini-calendario en la página de producto para seleccionar fechas de renta
- [ ] Endpoint `GET /api/availability` con lógica FIXED vs PER_UNIT
- [ ] Bloquear "agregar al carrito" si el producto no está disponible en las fechas seleccionadas
- [ ] Panel en admin para configurar modo de delivery global: INCLUDED / FIXED_FEE / ZIP_CODE
- [ ] Panel en admin para gestionar zonas por ZIP code con precio individual
- [ ] Porcentaje de depósito configurable desde settings del admin

---

## SPEC-08 — Formulario de checkout con datos del cliente
Pantalla previa al pago donde el cliente ingresa sus datos de contacto y entrega.

- [ ] Formulario con campos: nombre, email, teléfono y dirección de entrega
- [ ] Validación de campos requeridos antes de continuar al pago
- [ ] Resumen del carrito visible durante el checkout

---

## SPEC-09 — Integración de pagos con Square y confirmación de orden
Flujo completo de pago con Square usando Authorize & Capture para garantizar disponibilidad sin riesgo de overbooking.

- [ ] Integrar Square Web Payments SDK para tokenización de tarjeta en el frontend
- [ ] API route `POST /api/checkout`: AUTHORIZE en Square (congela fondos, no cobra)
- [ ] Validación atómica de disponibilidad con `SELECT ... FOR UPDATE`
- [ ] Si hay stock: INSERT en `availability` + INSERT en `orders` + CAPTURE del pago
- [ ] Si no hay stock: VOID del pago y respuesta de error al cliente
- [ ] Manejo de edge cases: VOID fallido (loguear + alerta), CAPTURE fallido tras INSERT (rollback + reintento)
- [ ] Página de éxito con resumen de la orden y próximos pasos para el cliente
- [ ] Órdenes confirmadas aparecen en el calendario del admin

---

## SPEC-10 — Administrador de órdenes
Panel para que la admin gestione el ciclo de vida completo de cada pedido.

- [ ] Vista de órdenes con búsqueda y filtros por estado y rango de fechas
- [ ] Estados visibles: PENDING, CONFIRMED, DELIVERED, RETURNED, CANCELLED
- [ ] Detalle de orden: datos del cliente (nombre, email, teléfono), items rentados, fechas, montos y estado de pago en Square
- [ ] Acción "Marcar como entregado" (DELIVERED)
- [ ] Acción "Marcar como devuelto" (RETURNED)
- [ ] Acción "Cancelar orden" solo para rol ADMIN/ROOT

---

## SPEC-11 — Deploy a producción y entrega
El sistema corre en el servidor real con datos reales de la clienta y está listo para operar.

- [ ] `docker-compose.yml` de producción con manejo de secrets y variables de entorno
- [ ] Configurar proyecto en Vercel con variables de entorno
- [ ] Definir qué configuraciones van en `.env` (nombre del negocio, logo, colores, Square credentials, DB, Auth secret)
- [ ] Script de seed de producción con datos reales de la clienta
- [ ] Documentar `.env` completo
- [ ] Health check endpoint
- [ ] Revisión final de error handling y logging

---

## SPEC-12 — Pruebas finales
Validación end-to-end del flujo completo antes de la entrega oficial.

- [ ] Prueba del flujo completo con tarjeta de crédito real en Square
- [ ] Verificar disponibilidad en tiempo real y bloqueo ante concurrencia
- [ ] Verificar que las órdenes aparecen correctamente en el calendario admin
- [ ] Verificar comportamiento bilingüe EN/ES en todo el sitio
