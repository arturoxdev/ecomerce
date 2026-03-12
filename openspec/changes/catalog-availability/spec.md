# Catálogo y Disponibilidad en Tiempo Real — Especificación (SPEC-03)

**Nombre del cambio:** catalog-availability
**Issue en Linear:** CON-71
**Proyecto:** Festejos Aurora
**Estado:** Borrador
**Fecha:** 2026-03-12

---

## Descripción General del Dominio

Esta es una especificación de **nuevo dominio** (no existe spec de catálogo previa). Cubre tres subdominios:

1. **Catálogo UI** — Páginas públicas de navegación de productos
2. **API de Disponibilidad** — Endpoint de disponibilidad en tiempo real
3. **Navegación y Configuración** — Correcciones de navegación en la landing page y configuración de imágenes

---

# Subdominio 1: Catálogo UI

## Propósito

Permitir a los clientes navegar el inventario de productos de renta, filtrar por categoría y ver el detalle de cada producto en una experiencia pública bilingüe (EN/ES).

---

## Requisitos Funcionales

### REQ-01 — La Página del Catálogo Muestra los Productos Activos

El sistema DEBE renderizar una página en `/[locale]/catalog` que muestre todos los productos donde `isActive = true` en la base de datos.

La página NO DEBE mostrar productos donde `isActive = false`.

La página DEBERÁ mostrar cada producto como una tarjeta que contenga como mínimo: nombre del producto, badge de categoría, precio base, indicador del tipo de precio e imagen principal del producto.

#### Escenario: Navegar el catálogo con productos activos

- DADO que la base de datos contiene 3 productos activos y 1 inactivo
- CUANDO un usuario navega a `/en/catalog`
- ENTONCES la página renderiza exactamente 3 tarjetas de producto
- Y el producto inactivo no aparece

#### Escenario: La página del catálogo está vacía cuando no existen productos

- DADO que la base de datos no contiene productos activos
- CUANDO un usuario navega a `/en/catalog`
- ENTONCES la página renderiza un mensaje de estado vacío "no hay productos disponibles"
- Y no se muestran tarjetas de producto

---

### REQ-02 — Filtro por Categoría vía Parámetros de URL

El sistema DEBE proveer una UI de filtro por categoría en la página del catálogo.

El filtro de categoría DEBE actualizar la URL con `?category={slug}` cuando se selecciona una categoría.

Cuando `?category={slug}` está presente, el catálogo DEBE mostrar únicamente los productos que pertenezcan a esa categoría.

Cuando no hay parámetro `?category` (o `?category=all`), el catálogo DEBE mostrar todos los productos activos.

La categoría seleccionada DEBE estar visualmente indicada en la UI del filtro (estado activo).

La URL filtrada DEBE ser compartible — navegar a `/en/catalog?category=inflatables` debe renderizar la vista filtrada directamente.

#### Escenario: Filtrar el catálogo por categoría

- DADO que el catálogo contiene productos en las categorías "Inflables" (slug: `inflatables`) y "Sillas" (slug: `chairs`)
- CUANDO un usuario selecciona el filtro "Inflables"
- ENTONCES la URL se convierte en `/[locale]/catalog?category=inflatables`
- Y solo se muestran los productos de la categoría "Inflables"
- Y el botón de filtro "Inflables" aparece como activo

#### Escenario: Limpiar el filtro de categoría regresa al catálogo completo

- DADO que la URL es `/en/catalog?category=inflatables`
- CUANDO un usuario selecciona la opción de filtro "Todos"
- ENTONCES la URL se convierte en `/en/catalog` (sin parámetro de categoría)
- Y todos los productos activos se muestran

#### Escenario: Navegar directamente a una URL filtrada

- DADO que la URL `/en/catalog?category=chairs` se carga directamente (por ejemplo, desde un marcador)
- CUANDO la página se renderiza
- ENTONCES solo se muestran los productos de la categoría "Sillas"
- Y el botón de filtro "Sillas" aparece como activo

#### Escenario: Filtro de categoría sin productos coincidentes

- DADO que una categoría "Mesas" existe pero no tiene productos activos
- CUANDO un usuario selecciona el filtro "Mesas"
- ENTONCES la URL se convierte en `/[locale]/catalog?category=tables`
- Y se muestra un mensaje de estado vacío ("no hay productos en esta categoría" o equivalente)

#### Escenario: Slug de categoría desconocido en la URL

- DADO que la URL es `/en/catalog?category=does-not-exist`
- CUANDO la página se renderiza
- ENTONCES la página renderiza una cuadrícula de productos vacía (sin errores, sin error 500)
- Y la UI del filtro no muestra ninguna selección activa

---

### REQ-03 — Contenido de la Tarjeta de Producto

Cada tarjeta de producto en la cuadrícula del catálogo DEBE mostrar:
- Imagen principal del producto (la primera en el arreglo `photos[]`, o un marcador si no hay fotos)
- Nombre del producto
- Nombre de la categoría como badge
- Precio base con símbolo de moneda
- Indicador del tipo de precio (por ejemplo, "por unidad" para PER_UNIT, o simplemente el precio para FIXED)
- Un enlace "Ver Detalles" que navega a `/[locale]/catalog/[slug]`

La tarjeta de producto NO DEBE incluir un botón "Agregar al Carrito" ni ningún CTA de reserva (el carrito es SPEC-04).

#### Escenario: Tarjeta de producto con imagen

- DADO que un producto tiene al menos una URL en su arreglo `photos[]`
- CUANDO el catálogo renderiza esa tarjeta de producto
- ENTONCES la primera URL de foto se usa como imagen de la tarjeta mediante `next/image`
- Y la imagen se renderiza sin errores

#### Escenario: Tarjeta de producto sin imagen

- DADO que un producto tiene un arreglo `photos[]` vacío
- CUANDO el catálogo renderiza esa tarjeta de producto
- ENTONCES se muestra una imagen o icono de marcador en lugar de la foto del producto

---

### REQ-04 — Página de Detalle del Producto

El sistema DEBE renderizar una página en `/[locale]/catalog/[slug]` para cada producto activo.

La página de detalle del producto DEBE mostrar:
- Todas las imágenes del producto en una galería (o una sola imagen si solo hay una foto)
- Nombre del producto
- Descripción del producto
- Precio base y tipo de precio
- Nombre de la categoría
- Cantidad en stock (si `priceType = PER_UNIT`)
- El componente Verificador de Disponibilidad

#### Escenario: Ver página de detalle del producto

- DADO que un producto con slug `inflatable-bouncy-castle` existe y está activo
- CUANDO un usuario navega a `/en/catalog/inflatable-bouncy-castle`
- ENTONCES la página se renderiza con el nombre, descripción, precio e imágenes correctos del producto
- Y el componente Verificador de Disponibilidad está presente

#### Escenario: Página de detalle del producto con múltiples imágenes

- DADO que un producto tiene 3 URLs en su arreglo `photos[]`
- CUANDO la página de detalle del producto se renderiza
- ENTONCES las 3 imágenes se muestran (vista de galería)

#### Escenario: Página de detalle del producto — producto no encontrado (404)

- DADO que ningún producto con slug `ghost-product` existe en la base de datos
- CUANDO un usuario navega a `/en/catalog/ghost-product`
- ENTONCES la página devuelve una respuesta HTTP 404
- Y Next.js renderiza la página de no encontrado (mediante `notFound()`)

#### Escenario: Página de detalle del producto — producto inactivo

- DADO que un producto con slug `old-equipment` existe pero `isActive = false`
- CUANDO un usuario navega a `/en/catalog/old-equipment`
- ENTONCES la página devuelve una respuesta HTTP 404
- Y los detalles del producto NO se muestran

---

### REQ-05 — Componente Verificador de Disponibilidad

La página de detalle del producto DEBE incluir un componente cliente Verificador de Disponibilidad.

El Verificador de Disponibilidad DEBE proveer dos campos de fecha: una fecha de inicio y una fecha de fin.

El Verificador de Disponibilidad DEBE aplicar un debounce de 400ms a las solicitudes de disponibilidad — no se realiza ninguna llamada a la API hasta que hayan pasado 400ms desde el último cambio de fecha.

El Verificador de Disponibilidad DEBE mostrar un estado de carga mientras una solicitud está en curso.

El Verificador de Disponibilidad DEBE mostrar el resultado de disponibilidad tras recibir una respuesta.

El Verificador de Disponibilidad NO DEBE realizar una llamada a la API cuando la fecha de inicio o la fecha de fin estén vacías.

El Verificador de Disponibilidad NO DEBE realizar una llamada a la API cuando la fecha de fin sea anterior o igual a la fecha de inicio.

#### Escenario: Verificar disponibilidad — producto FIXED, disponible

- DADO un producto con tipo de precio FIXED sin reservas superpuestas para el 10–12 de mayo
- CUANDO un usuario selecciona inicio = 2026-05-10 y fin = 2026-05-12
- ENTONCES tras 400ms de debounce el verificador consulta `/api/availability?productId=X&start=2026-05-10&end=2026-05-12`
- Y la respuesta muestra `{ available: 1 }`
- Y la UI muestra un estado "Disponible"

#### Escenario: Verificar disponibilidad — producto FIXED, no disponible

- DADO un producto con tipo de precio FIXED con una reserva existente que se superpone al 10–12 de mayo
- CUANDO un usuario selecciona inicio = 2026-05-10 y fin = 2026-05-12
- ENTONCES tras el debounce el verificador consulta la API de disponibilidad
- Y la respuesta muestra `{ available: 0 }`
- Y la UI muestra un estado "No disponible"

#### Escenario: Verificar disponibilidad — producto PER_UNIT, unidades disponibles

- DADO un producto PER_UNIT con stock = 10 y 3 unidades reservadas para el 10–12 de mayo
- CUANDO un usuario selecciona inicio = 2026-05-10 y fin = 2026-05-12
- ENTONCES tras el debounce la respuesta muestra `{ available: 7 }`
- Y la UI muestra "7 unidades disponibles"

#### Escenario: Verificar disponibilidad — producto PER_UNIT, totalmente reservado

- DADO un producto PER_UNIT con stock = 10 y 10 unidades reservadas para el 10–12 de mayo
- CUANDO un usuario selecciona inicio = 2026-05-10 y fin = 2026-05-12
- ENTONCES tras el debounce la respuesta muestra `{ available: 0 }`
- Y la UI muestra un estado "No disponible" / "Agotado"

#### Escenario: Verificar disponibilidad — producto PER_UNIT, protección contra sobrerreserva

- DADO un producto PER_UNIT con stock = 5 y (de algún modo) 7 unidades reservadas para el 10–12 de mayo
- CUANDO el verificador recibe `{ available: -2 }` (negativo)
- ENTONCES la UI muestra "No disponible" (trata el valor negativo como 0 disponibles)

#### Escenario: Rango de fechas inválido — fin antes que inicio

- DADO que un usuario selecciona inicio = 2026-05-15 y fin = 2026-05-10 (fin antes que inicio)
- CUANDO se establecen los valores de fecha
- ENTONCES no se realiza ninguna llamada a la API
- Y la UI muestra un error de validación en línea ("La fecha de fin debe ser posterior a la fecha de inicio" o equivalente)

#### Escenario: Rango de fechas inválido — mismo día

- DADO que un usuario selecciona inicio = 2026-05-10 y fin = 2026-05-10 (mismo día)
- CUANDO se establecen los valores de fecha
- ENTONCES no se realiza ninguna llamada a la API
- Y la UI muestra un error de validación en línea

#### Escenario: Debounce — escritura rápida de fechas

- DADO que un usuario escribe/cambia fechas rápidamente, generando 5 eventos de cambio en 300ms
- CUANDO ocurren los 5 cambios
- ENTONCES solo se realiza 1 llamada a la API (400ms después del último cambio)

#### Escenario: Estado de carga durante la petición

- DADO que un usuario ha ingresado un rango de fechas válido
- CUANDO la solicitud a la API está en curso
- ENTONCES el verificador muestra un indicador de carga (spinner o texto "Verificando...")
- Y el resultado de una consulta anterior no se muestra hasta que llega la nueva respuesta

---

### REQ-06 — Soporte Bilingüe (EN/ES)

Todo el texto visible para el usuario en las páginas del catálogo y detalle de producto DEBE provenir del sistema de traducciones `messages/{locale}.json` (nunca cadenas hardcodeadas en JSX).

El catálogo DEBE renderizarse correctamente en `/en/catalog` y `/es/catalog` con etiquetas apropiadas para cada idioma.

Todas las nuevas claves i18n DEBEN existir tanto en `messages/en.json` como en `messages/es.json`.

Claves de mensaje nuevas requeridas (mínimo):
- `catalog.title`
- `catalog.filterAll`
- `catalog.noProducts`
- `catalog.noProductsInCategory`
- `catalog.viewDetails`
- `catalog.product.price`
- `catalog.product.pricePerUnit`
- `catalog.product.stock`
- `catalog.product.category`
- `catalog.availability.checkDates`
- `catalog.availability.startDate`
- `catalog.availability.endDate`
- `catalog.availability.loading`
- `catalog.availability.available`
- `catalog.availability.notAvailable`
- `catalog.availability.unitsAvailable` (con interpolación `{count}`)
- `catalog.availability.invalidRange`

#### Escenario: El catálogo se renderiza en español

- DADO que un usuario navega a `/es/catalog`
- CUANDO la página se renderiza
- ENTONCES todas las etiquetas, encabezados y texto de la UI aparecen en español
- Y no se muestran cadenas de respaldo de claves i18n (nombres de clave sin traducir)

#### Escenario: El detalle del producto se renderiza en inglés

- DADO que un usuario navega a `/en/catalog/some-slug`
- CUANDO la página se renderiza
- ENTONCES todas las etiquetas y texto de la UI aparecen en inglés

---

# Subdominio 2: API de Disponibilidad

## Propósito

Proveer un endpoint HTTP público que calcule la disponibilidad en tiempo real de un producto para un rango de fechas determinado, implementando la lógica de negocio para FIXED y PER_UNIT.

---

## Requisitos Funcionales

### REQ-07 — Endpoint GET /api/availability

El sistema DEBE exponer un endpoint `GET /api/availability`.

El endpoint DEBE aceptar los siguientes parámetros de consulta:
- `productId` (requerido) — el UUID del producto
- `start` (requerido) — fecha de inicio en formato `YYYY-MM-DD`
- `end` (requerido) — fecha de fin en formato `YYYY-MM-DD` (fin exclusivo)

El endpoint NO DEBE requerir autenticación (endpoint público).

#### Escenario: Verificación de disponibilidad exitosa — producto FIXED

- DADO un producto FIXED válido sin reservas superpuestas
- CUANDO se llama a `GET /api/availability?productId={id}&start=2026-05-10&end=2026-05-11`
- ENTONCES el estado de respuesta es 200
- Y el cuerpo de la respuesta es `{ "available": 1, "pricingModel": "FIXED" }`

#### Escenario: Verificación de disponibilidad exitosa — producto PER_UNIT

- DADO un producto PER_UNIT válido con stock = 10, y 4 unidades ocupadas para el rango dado
- CUANDO se llama a `GET /api/availability?productId={id}&start=2026-05-10&end=2026-05-12`
- ENTONCES el estado de respuesta es 200
- Y el cuerpo de la respuesta es `{ "available": 6, "pricingModel": "PER_UNIT" }`

---

### REQ-08 — Lógica de Negocio de Disponibilidad

**Tipo de precio FIXED:**
El sistema DEBE calcular la disponibilidad así: si `SUM(cantidad ocupada de reservas superpuestas) >= 1` entonces `available = 0`, de lo contrario `available = 1`.

**Tipo de precio PER_UNIT:**
El sistema DEBE calcular la disponibilidad así: `available = MAX(0, product.stock - SUM(cantidad ocupada de reservas superpuestas))`.

La consulta de superposición DEBE usar la condición: `startDate < $end AND endDate > $start` (superposición de intervalo con fin exclusivo).

El sistema DEBE tratar `NULL` (sin reservas) como `occupied = 0` (usar `COALESCE(SUM, 0)`).

#### Escenario: Producto FIXED — superposición detectada

- DADO un registro de disponibilidad con startDate=2026-05-09, endDate=2026-05-12, quantity=1
- CUANDO se verifica disponibilidad para start=2026-05-10, end=2026-05-11
- ENTONCES occupied = 1, por lo que `available = 0`

#### Escenario: Producto FIXED — reservas adyacentes no se superponen

- DADO una reserva con startDate=2026-05-10, endDate=2026-05-12 (fin exclusivo)
- CUANDO se verifica disponibilidad para start=2026-05-12, end=2026-05-14
- ENTONCES sin superposición: `start_date(2026-05-10) < $end(2026-05-14)` es VERDADERO, pero `end_date(2026-05-12) > $start(2026-05-12)` es FALSO (no estrictamente mayor)
- Y occupied = 0, por lo que `available = 1`

#### Escenario: PER_UNIT — disponibilidad parcial

- DADO un producto con stock=8 y 3 reservados para el rango solicitado
- CUANDO se calcula la disponibilidad
- ENTONCES `available = MAX(0, 8 - 3) = 5`

#### Escenario: PER_UNIT — protección contra stock cero

- DADO un producto PER_UNIT donde `stock` es NULL o 0
- CUANDO se llama al endpoint de disponibilidad
- ENTONCES se devuelve `available = 0` (sin errores de división, sin números negativos)

---

### REQ-09 — Validación de Entradas de la API

El endpoint DEBE devolver HTTP 400 con un cuerpo de error si falta algún parámetro requerido.

El endpoint DEBE devolver HTTP 400 si `start` o `end` no es una cadena de fecha válida.

El endpoint DEBE devolver HTTP 400 si `end` es anterior o igual a `start`.

El endpoint DEBE devolver HTTP 404 si no existe ningún producto con el `productId` dado o el producto está inactivo.

El endpoint DEBE devolver HTTP 400 si `productId` está presente pero no tiene un formato UUID válido.

Las respuestas de error DEBEN seguir la forma: `{ "error": "<mensaje legible por humanos>" }`

#### Escenario: productId faltante

- DADO una solicitud a `GET /api/availability?start=2026-05-10&end=2026-05-12` (sin productId)
- CUANDO la solicitud es procesada
- ENTONCES el estado de respuesta es 400
- Y el cuerpo contiene `{ "error": "productId is required" }` (o equivalente)

#### Escenario: Fecha de inicio faltante

- DADO una solicitud a `GET /api/availability?productId={id}&end=2026-05-12`
- CUANDO la solicitud es procesada
- ENTONCES el estado de respuesta es 400
- Y el cuerpo contiene un error sobre la fecha de inicio faltante

#### Escenario: Fecha de fin faltante

- DADO una solicitud a `GET /api/availability?productId={id}&start=2026-05-10`
- CUANDO la solicitud es procesada
- ENTONCES el estado de respuesta es 400

#### Escenario: Formato de fecha inválido

- DADO una solicitud a `GET /api/availability?productId={id}&start=not-a-date&end=2026-05-12`
- CUANDO la solicitud es procesada
- ENTONCES el estado de respuesta es 400
- Y el cuerpo contiene un error sobre formato de fecha inválido

#### Escenario: Fecha de fin anterior a la fecha de inicio

- DADO una solicitud con start=2026-05-15, end=2026-05-10 (fin antes que inicio)
- CUANDO la solicitud es procesada
- ENTONCES el estado de respuesta es 400
- Y el cuerpo contiene un error sobre rango de fechas inválido

#### Escenario: Producto no encontrado

- DADO un UUID válido que no corresponde a ningún producto
- CUANDO `GET /api/availability?productId={nonexistent-uuid}&start=2026-05-10&end=2026-05-12`
- ENTONCES el estado de respuesta es 404
- Y el cuerpo contiene `{ "error": "Product not found" }`

#### Escenario: Producto inactivo

- DADO un producto con `isActive = false`
- CUANDO se llama al endpoint de disponibilidad con el ID de ese producto
- ENTONCES el estado de respuesta es 404

#### Escenario: Formato de UUID inválido

- DADO una solicitud con `productId=not-a-uuid`
- CUANDO la solicitud es procesada
- ENTONCES el estado de respuesta es 400

---

### REQ-10 — Esquema de Respuesta de la API

Las respuestas exitosas DEBEN cumplir con:

```json
{
  "available": <entero, >= 0>,
  "pricingModel": "FIXED" | "PER_UNIT"
}
```

Las respuestas de error DEBEN cumplir con:

```json
{
  "error": "<cadena>"
}
```

El campo `available` DEBE ser siempre un entero no negativo (nunca null, nunca negativo).

El `Content-Type` de todas las respuestas DEBE ser `application/json`.

---

# Subdominio 3: Navegación y Configuración

## Propósito

Corregir los enlaces de navegación rotos en la landing page y configurar los dominios de imágenes de Next.js para admitir fotos de productos desde MinIO.

---

## Requisitos Funcionales

### REQ-11 — Enlaces de Navegación de la Landing Page

El sistema DEBE actualizar todos los enlaces de navegación `href="#"` en la landing page que estén destinados a apuntar al catálogo.

Los enlaces de navegación del encabezado de la landing page que referencien el catálogo de productos DEBEN apuntar a `/[locale]/catalog`.

Los botones CTA "Ver Todos" o "Ver Todos los Productos" en la landing page DEBEN apuntar a `/[locale]/catalog`.

El prefijo de idioma DEBE preservarse — el enlace para un usuario en `/es/` DEBE apuntar a `/es/catalog`, no a `/en/catalog`.

#### Escenario: El enlace de navegación al catálogo de la landing page funciona

- DADO que un usuario está en `/en` (la landing page en inglés)
- CUANDO hace clic en el enlace de navegación al catálogo
- ENTONCES navega a `/en/catalog`
- Y no ocurre ningún comportamiento de 404 o `href="#"` sin efecto

#### Escenario: El enlace al catálogo en la landing page en español preserva el idioma

- DADO que un usuario está en `/es` (la landing page en español)
- CUANDO hace clic en el enlace de navegación al catálogo
- ENTONCES navega a `/es/catalog`

---

### REQ-12 — Patrones Remotos de Imágenes en Next.js

El archivo `next.config.ts` DEBE incluir una entrada de configuración `remotePatterns` que permita a `next/image` servir imágenes desde el servidor MinIO (localhost:9000 o el hostname de MinIO configurado).

El dominio de Unsplash (`images.unsplash.com`) TAMBIÉN DEBE estar permitido para que las imágenes de productos sembradas continúen renderizándose.

#### Escenario: La imagen de un producto desde MinIO se renderiza

- DADO un producto con una URL de foto apuntando a `http://localhost:9000/festejos/product.jpg`
- CUANDO la página del catálogo o de detalle del producto se renderiza
- ENTONCES `next/image` renderiza la imagen sin un error de "hostname no configurado"

#### Escenario: La imagen de un producto sembrada desde Unsplash sigue renderizándose

- DADO un producto sembrado con una URL de foto de Unsplash
- CUANDO la página del catálogo o de detalle del producto se renderiza
- ENTONCES la imagen de Unsplash se renderiza sin errores

---

# Contrato de la API: GET /api/availability

## Endpoint

```
GET /api/availability
```

## Parámetros de Consulta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `productId` | Cadena UUID | Sí | Identificador único del producto |
| `start` | `YYYY-MM-DD` | Sí | Fecha de inicio de la renta (inclusivo) |
| `end` | `YYYY-MM-DD` | Sí | Fecha de fin de la renta (exclusivo — día de devolución/recogida) |

## Respuesta Exitosa (200 OK)

```json
{
  "available": 5,
  "pricingModel": "PER_UNIT"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `available` | entero ≥ 0 | Unidades disponibles. `1` significa disponible para FIXED; `0` significa no disponible; `N` para PER_UNIT |
| `pricingModel` | `"FIXED"` \| `"PER_UNIT"` | El modelo de precio del producto |

## Respuestas de Error

| Estado HTTP | Condición | Ejemplo de cuerpo |
|-------------|-----------|-------------------|
| 400 | Parámetro requerido faltante | `{ "error": "productId is required" }` |
| 400 | Formato de fecha inválido | `{ "error": "Invalid date format for start. Use YYYY-MM-DD" }` |
| 400 | Fin ≤ inicio | `{ "error": "end must be after start" }` |
| 400 | Formato de UUID inválido | `{ "error": "productId must be a valid UUID" }` |
| 404 | Producto no encontrado o inactivo | `{ "error": "Product not found" }` |
| 500 | Error inesperado del servidor | `{ "error": "Internal server error" }` |

## Semántica de Fechas

Las fechas siguen el modelo de **intervalo con fin exclusivo**:

- Una reserva del 10 al 12 de mayo significa "rentado el 10 y 11 de mayo, devuelto el 12 de mayo".
- El 12 de mayo queda libre para rentar de nuevo (inicio = 2026-05-12 NO se superpone con fin = 2026-05-12).
- Condición de superposición: `booking.startDate < queryEnd AND booking.endDate > queryStart`

---

# Requisitos No Funcionales

### NFR-01 — SEO (Renderizado del Lado del Servidor)

La página del catálogo y las páginas de detalle del producto DEBEN renderizarse del lado del servidor (no solo en el cliente).

Cada página de detalle del producto DEBE generar etiquetas `<title>` y `<meta name="description">` apropiadas usando el nombre y la descripción del producto.

El estado de filtro basado en URL (`?category=slug`) DEBE ser legible por los rastreadores de motores de búsqueda.

### NFR-02 — Rendimiento

La página del catálogo DEBE renderizar la cuadrícula de productos sin obtención de datos del lado del cliente (los Server Components manejan todas las consultas a la base de datos).

El tiempo de respuesta de la API de disponibilidad DEBERÍA ser inferior a 200ms para cargas típicas (una sola consulta parametrizada a la base de datos con columnas indexadas).

El verificador de disponibilidad DEBE aplicar debounce a las solicitudes para evitar saturar la API.

### NFR-03 — Accesibilidad

Todos los elementos interactivos (botones de filtro por categoría, campos de fecha) DEBEN ser navegables con teclado.

Las imágenes de los productos DEBEN tener texto `alt` significativo (nombre o descripción del producto).

El resultado de disponibilidad DEBE ser legible por lectores de pantalla (se RECOMIENDAN regiones ARIA live o elementos semánticos de estado).

### NFR-04 — Seguridad de Tipos

Todos los nuevos componentes y rutas de API DEBEN compilar sin errores de TypeScript (`tsc --noEmit` debe pasar).

Las claves de mensajes i18n agregadas en este cambio DEBEN estar presentes en AMBOS archivos `en.json` Y `es.json`.

### NFR-05 — Sin Nuevas Dependencias

Este cambio NO DEBE introducir nuevos paquetes npm. Todas las librerías requeridas (shadcn/ui, Lucide, Tailwind v4, Prisma, Next.js) ya están instaladas.

---

# Casos Borde

| Caso Borde | Comportamiento Esperado |
|------------|-------------------------|
| El arreglo `photos[]` del producto está vacío | Mostrar imagen de marcador; sin errores |
| El arreglo `photos[]` contiene URLs inválidas | Fallback de `next/image`; sin errores |
| El `stock` de un producto PER_UNIT es null | La API devuelve `available = 0` |
| `SUM(quantity)` devuelve null (sin reservas) | COALESCE a 0; el producto está totalmente disponible |
| El slug de categoría en la URL no coincide con ninguna categoría | Cuadrícula de productos vacía (sin error 500) |
| Solicitudes de disponibilidad concurrentes | Cada solicitud es independiente; condición de carrera N/A (solo lectura) |
| API llamada con end = start (rango de 0 días) | Error 400; las rentas de 0 días son inválidas |
| Valores de fecha muy grandes (año 9999) | Validar como fecha parseable; devolver normalmente o 400 |
| Parámetro `productId` presente pero cadena vacía | Error 400 (tratado como faltante) |
| Idioma no existente en la URL (por ejemplo, `/de/catalog`) | La validación de idioma de Next.js redirige o devuelve 404; mismo comportamiento existente |
| Unidades disponibles negativas (anomalía de datos en PER_UNIT) | Limitar a 0; nunca devolver negativo |
