# Templates de Specs

## Tabla de contenido

1. [Product Template (WHEN/THEN)](#product-template)
2. [Module Overview Template](#module-overview-template)
3. [Operation Template (API + UI)](#operation-template)

---

## Product Template

Documento de producto con escenarios WHEN/THEN. Describe QUÉ quiere el
negocio. No tiene detalles técnicos.

```markdown
# [Módulo] — Producto

> Última actualización: YYYY-MM-DD

## Purpose

Una línea: qué problema de negocio resuelve este módulo.

---

## Requirements

### Requirement: [Nombre del requirement]

El sistema DEBE [descripción clara de la capacidad].

#### Scenario: [Nombre descriptivo — happy path]
- **GIVEN** [precondición, si aplica]
- **WHEN** [acción del usuario o evento]
- **THEN** [resultado esperado]

#### Scenario: [Escenario negativo / alternativo]
- **WHEN** [acción que no debería funcionar]
- **THEN** [cómo rechaza o maneja el sistema]

> **Spec técnico:** [specs/modulo/operacion.md](../specs/modulo/operacion.md)

---

### Requirement: [Lo que NO hace el sistema]

El sistema NO permite [acción]. [Razón breve].

> No tiene spec técnico asociado (no hay implementación).

---

## Changelog

| Fecha      | Cambio                                           |
|------------|--------------------------------------------------|
| YYYY-MM-DD | Creación inicial                                 |
```

### Reglas del doc de producto

- Cada requirement tiene al menos un escenario positivo y uno negativo.
- Cada requirement apunta a su spec técnico (o dice explícitamente que no tiene).
- Lo que el sistema NO hace también se documenta como requirement.
- El changelog registra la fecha de cada cambio.

---

## Module Overview Template

Índice y contexto del módulo. Define modelo de datos, invariantes y
lista de operaciones.

```markdown
# [Módulo] — Overview

> Última actualización: YYYY-MM-DD | Estado: draft | review | stable

## Qué es

2-3 líneas máximo. Contexto de negocio, no técnico.

## Modelo

\```typescript
interface NombreEntidad {
  id: string           // UUID v4, generado
  // ... campos con tipo y comentario corto
  createdAt: Date
  updatedAt: Date
}
\```

## Invariantes

> Reglas que SIEMPRE se cumplen, sin excepción. Son la ley del módulo.

1. Regla inquebrantable 1.
2. Regla inquebrantable 2.

## Jerarquía / Roles (si aplica)

Quién puede hacer qué. Tabla o diagrama simple.

## Operaciones

| Operación        | Spec                              | Estado  |
|------------------|-----------------------------------|---------|
| Crear recurso    | [create-recurso](./create-x.md)   | stable  |
| Listar recursos  | [list-recursos](./list-x.md)      | draft   |

## Lo que NO hace este módulo

> Tan importante como lo que sí hace. Previene que el agente invente features.

- Explícitamente listar lo que está fuera de scope.

## Changelog

| Fecha      | Cambio                          | Por    |
|------------|---------------------------------|--------|
| YYYY-MM-DD | Creación inicial                | humano |
```

### Reglas del overview

- El modelo incluye TODOS los campos con tipo y comentario.
- Cada invariante es una regla que nunca se rompe, sin importar la operación.
- La tabla de operaciones tiene el estado de cada spec.
- "Lo que NO hace" es obligatorio, no opcional.

---

## Operation Template

Spec técnico full-stack. API y UI en un solo archivo. Si la operación
no tiene UI (seed, webhook, job), omitir la sección de UI.

```markdown
# [Nombre de la operación]

> Módulo: `[dominio]` | Última actualización: YYYY-MM-DD | Estado: draft | review | stable

## Qué hace

Una línea. Sin rodeos.

---

## API

### Endpoint

\```
VERBO /api/ruta/:param
\```

Acceso: [quién puede usarlo]

### Request

\```json
{
  "campo": "valor (tipo, requerido/opcional, default si aplica)"
}
\```

### Reglas de negocio

1. Regla clara y numerada.
2. Otra regla.

> Estas reglas son el CORAZÓN del spec. El agente NO puede inventar reglas
> que no estén aquí. Si falta una regla, se agrega al spec primero.

### Validaciones

| Campo | Regla                  | Error code         |
|-------|------------------------|---------------------|
| name  | requerido, 2-100 chars | `name_required`     |

### Respuestas

#### Éxito (2xx)

\```json
// ejemplo del body de respuesta exitosa
\```

#### Errores

| Status | Code                   | Cuándo                          |
|--------|------------------------|---------------------------------|
| 400    | `validation_error`     | Campo inválido                  |
| 401    | `unauthorized`         | No autenticado                  |
| 403    | `forbidden`            | Sin permisos                    |

### Tests API

#### ✅ Happy path → integration
- [ ] Caso normal → status correcto, body correcto.
- [ ] Campos opcionales omitidos → defaults aplicados.

#### 🚫 Validaciones → unit (schema) + integration (endpoint)
- [ ] Campo requerido faltante → 400 con code específico.

#### 🔒 Autorización → integration
- [ ] Rol sin permisos → 403.
- [ ] No autenticado → 401.

#### 💥 Edge cases → integration
- [ ] Body vacío → 400.
- [ ] Campos extra → se ignoran.

---

## UI

> Omitir esta sección si la operación no tiene interfaz.

### Ubicación

Dónde vive: ruta, modal, drawer, página.

### Formulario / Vista

| Campo    | Tipo     | Notas                                    |
|----------|----------|------------------------------------------|
| campo1   | text     | requerido, placeholder "..."             |

### Estados

| Estado      | Qué muestra                                       |
|-------------|---------------------------------------------------|
| idle        | formulario vacío, acción principal activa          |
| validating  | errores inline al blur                             |
| submitting  | botón disabled + spinner, form no editable         |
| success     | cerrar/navegar + feedback                          |
| error:CODE  | mensaje específico según error de la API           |

### Interacciones

1. Acción que dispara la UI.
2. Validación client-side: cuándo y qué.
3. Submit: qué endpoint, qué hace con la respuesta.
4. Cancelar: confirmar si hay cambios sin guardar.

### Tests UI

#### ✅ Render → unit (RTL)
- [ ] Componente renderiza campos/datos esperados.

#### ✅ Validación client-side → unit (RTL)
- [ ] Campos requeridos vacíos → error inline al submit.

#### ✅ Submit + estados → unit (RTL, fetch mockeado)
- [ ] Happy path → estado success.
- [ ] Error API → mensaje correcto.

#### ✅ Flujo completo → E2E (Playwright, máximo 1-2)
- [ ] Happy path end-to-end.

---

## Changelog

| Fecha      | Cambio                        | Por    |
|------------|-------------------------------|--------|
| YYYY-MM-DD | Creación inicial              | humano |
```

### Reglas de la sección API

- Cada validación tiene su error code. No usar genéricos.
- Cada error tiene status code + code + cuándo ocurre.
- El ejemplo de response exitosa incluye TODOS los campos que retorna.
- Marcar explícitamente los campos que NUNCA se retornan (ej: password).

### Reglas de la sección UI

- Cada formulario lista TODOS sus campos con tipo y notas.
- Los estados cubren como mínimo: idle, submitting, success, y al menos un error.
- Las interacciones son una lista numerada de acciones del usuario.
- Si hay render condicional (ej: campos disabled según rol), documentarlo en una tabla de "Casos especiales de render".

### Reglas de los tests

- Cada `- [ ]` es un test que el agente DEBE crear.
- Al lado de cada categoría de test se indica el tipo (unit, integration, E2E).
- Los tests de API y UI van en secciones separadas dentro del mismo spec.
- Máximo 1-2 E2E por operación, solo happy path.
