# ADR-003: Arquitectura repetible — repo configurable por instancia

**Fecha:** 2026-02-26
**Estado:** Aceptado

## Contexto

Festejos Aurora no es el único negocio de renta de equipo para fiestas que podría usar este sistema. El objetivo desde el inicio es que el mismo repositorio pueda instalarse para otros clientes cambiando únicamente configuración y datos, sin modificar el código fuente.

Esto tiene implicaciones en cómo se organiza el proyecto, cómo se hace el deployment, y cómo se separan los datos de configuración del negocio del código de la aplicación.

## Decisión

El repo es una aplicación Next.js configurable por variables de entorno. La infraestructura (PostgreSQL + cualquier servicio adicional) corre en Docker via `docker-compose.yml`. El frontend se despliega en Vercel. Una nueva instancia del negocio = nuevas variables de entorno + nuevo `docker compose up` en un VPS.

## Razón

Variables de entorno son el mecanismo estándar de configuración en Next.js y son soportadas nativamente por Vercel. Docker hace el setup de la DB reproducible en cualquier VPS sin dependencias de sistema operativo. Separar frontend (Vercel) de DB (VPS) permite escalar cada capa independientemente y mantiene costos bajos para clientes pequeños (~$5-10/mes de VPS para la DB).

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Multi-tenant en una sola instancia (una DB, múltiples clientes) | Mayor complejidad en la lógica de aislamiento de datos; un bug puede afectar a todos los clientes; no vale la pena para el volumen actual |
| CMS externo (Contentful, Sanity) para los datos del negocio | Costo adicional, dependencia externa, y los datos de productos ya están en la DB de la aplicación |
| Serverless DB (PlanetScale, Neon) | Descartado por falta de soporte de FK (PlanetScale) o incertidumbre en el modelo de precios para clientes pequeños |

## Consecuencias

- **Configuración en `.env`:** Nombre del negocio, colores, logo, credenciales de Square, y otras configuraciones específicas del cliente van en variables de entorno — no hardcodeadas en el código.
- **Docker obligatorio:** El VPS del cliente debe tener Docker instalado. Para Hostinger, esto es estándar en los planes VPS.
- **Seed script necesario:** Cada instancia nueva requiere correr el seed con los productos reales del cliente. El seed de desarrollo usa placeholders.
- **Deuda técnica:** La separación config/código no está completamente definida aún. A medida que se desarrolla el proyecto, se deben identificar qué valores van en `.env` vs qué van hardcodeados. Esto se refinará en post-lanzamiento.
