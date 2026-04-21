# Versionado y Mantenimiento de Specs

## Estados de un spec

| Estado   | Significado                                              |
|----------|----------------------------------------------------------|
| `draft`  | En borrador, puede cambiar sin aviso                     |
| `review` | Completo, pendiente de validación antes de implementar   |
| `stable` | Implementado y testeado, cambios requieren changelog     |

---

## Reglas de versionado

### 1. El spec se modifica ANTES que el código

```
Flujo correcto:
  1. Humano edita el spec (ej: agrega campo phone)
  2. Humano agrega entrada al changelog del spec
  3. Agente genera tests nuevos + implementa

Flujo INCORRECTO:
  1. Humano le dice al agente "agrega phone"
  2. Agente modifica código, tests Y el spec
  ❌ El spec dejó de ser fuente de verdad
```

### 2. Cada cambio tiene entrada en el changelog

```markdown
## Changelog

| Fecha      | Cambio                          | Por    |
|------------|---------------------------------|--------|
| 2026-04-17 | Creación inicial                | humano |
| 2026-04-20 | Agregado campo phone (E.164)    | humano |
| 2026-05-01 | phone ahora es requerido        | humano |
```

### 3. Orden de revisión en cada PR

1. **Spec** → ¿El cambio de comportamiento tiene sentido?
2. **Tests** → ¿Cubren los escenarios nuevos del spec?
3. **Código** → ¿Implementa lo que dice el spec?

Reglas de detección de problemas:
- Spec no cambió pero código sí → preguntarse por qué.
- Spec cambió pero tests no → algo falta.
- Tests cambiaron sin aprobación → rechazar el PR.

### 4. Specs son READ-ONLY para el agente

El agente NUNCA modifica archivos en `docs/specs/` ni `docs/product/`.
Si detecta un caso no cubierto, PAUSA y pregunta.

### 5. Tests existentes están protegidos

- Añadir tests nuevos: libre.
- Modificar test existente: PAUSA + explicar por qué estaba mal.
- Borrar test: PROHIBIDO sin aprobación.
- Si un test falla: la hipótesis es que el código está mal, no el test.
- Nunca usar `.skip`, `.only`, ni aflojar assertions.

---

## Cómo agregar un campo (ejemplo: phone)

### Paso 1 — Actualizar doc de producto

Si hay impacto en UX, agregar scenario en `docs/product/<modulo>.md`:

```markdown
#### Scenario: Crear usuario con teléfono
- **WHEN** un admin llena el formulario incluyendo teléfono
- **THEN** el teléfono se guarda en formato E.164
```

### Paso 2 — Actualizar overview.md

Agregar campo al modelo:
```typescript
phone?: string  // E.164, opcional
```

Agregar invariante si aplica:
```
N. El campo phone, si se provee, debe ser formato E.164.
```

### Paso 3 — Actualizar specs afectados

Para cada spec que toca el campo:
- Agregar al Request (si es input).
- Agregar validación con error code.
- Agregar escenarios de test:
  - Happy: con phone → presente en response.
  - Happy: sin phone → null en response.
  - Validación: phone inválido → 400.
- Agregar al Response (si se retorna).
- Si tiene UI: agregar campo al formulario + validación client-side.

### Paso 4 — Changelog en cada archivo tocado

### Paso 5 — Prompt al agente

```
Los specs de [módulo] cambiaron (overview, create, update, list, get).
Se agregó el campo phone. Actualiza implementación y tests según los specs.
Tests existentes que sigan siendo válidos no los modifiques.
```

---

## Checklist: ¿el spec está bien?

Revisión rápida (< 2 min):

```
□ ¿Se lee en menos de 5 minutos?
□ ¿Cada regla de negocio tiene al menos un test?
□ ¿Cada error tiene status code y error code?
□ ¿Tests cubren happy path, validaciones, auth y edge cases?
□ ¿Tests de UI cubren render, validación client, estados y submit?
□ ¿Máximo 1-2 E2E por módulo?
□ ¿Changelog al día?
□ ¿Dice lo que NO hace?
□ ¿La UI tiene estados para idle, loading, error y success?
```

---

## Cuándo separar specs API y UI

**Un solo archivo (recomendado):** cuando el mismo agente implementa
front y back en el mismo worktree. Menos archivos, menos riesgo de
desincronización.

**Dos archivos (`create-user.md` + `create-user-ui.md`):** cuando hay
dos agentes (uno para API, otro para UI) en worktrees separados, para
que cada agente solo lea lo que le corresponde.
