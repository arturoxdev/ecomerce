---
name: spec-driven-dev
description: >
  Sistema de Spec-Driven Development para generar specs técnicos full-stack
  (API + UI) y tests desde documentos de producto. Usa esta skill SIEMPRE que
  el usuario quiera crear specs, generar tests desde un spec, implementar una
  feature basada en un spec, agregar un campo o cambiar comportamiento de un
  módulo, o revisar si sus tests están bien. También úsala cuando diga
  "genera los specs", "crea los tests", "implementa este spec", "agrega
  este campo", "revisa los tests", "spec del CRUD de X", "quiero TDD con
  agentes", "spec-driven", o cualquier mención de specs de API, specs de
  producto, WHEN/THEN, o flujos de test con agentes. Úsala aunque el usuario
  no diga "spec" explícitamente — si describe un CRUD, endpoint, o feature
  que necesita tests, esta skill aplica.
---

# Spec-Driven Development

Sistema para desarrollar software con agentes usando specs como fuente de
verdad. Los specs definen el contrato (API + UI + tests), el agente implementa
contra ellos, y los tests verifican que el contrato se cumple.

---

## Conceptos clave

Este sistema tiene tres capas de documentos, cada una con dueño distinto:

| Capa | Qué describe | Quién lo escribe | Quién lo lee | Dónde vive |
|------|-------------|------------------|-------------|------------|
| Producto (WHEN/THEN) | Qué quiere el negocio | Humano/PM | Humanos | `docs/product/` |
| Spec técnico | Cómo se implementa (API + UI + tests) | Humano (dev) | Agente + dev | `docs/specs/` |
| Código + tests | La implementación | Agente | Máquina | `src/` + `tests/` |

El flujo siempre es: **producto → spec → código**. Nunca al revés.

---

## Flujos de trabajo

### 1. Crear specs para un módulo nuevo

Cuando el usuario tiene un doc de producto (WHEN/THEN) o describe una feature:

1. Leer el doc de producto o la descripción del usuario.
2. Identificar las operaciones del módulo (listar, crear, editar, etc.).
3. Generar el overview del módulo usando `references/templates.md` → sección "Module Overview".
4. Generar un spec por operación usando `references/templates.md` → sección "Operation".
5. Generar el doc de producto enriquecido (si no existía o le faltan escenarios negativos).
6. Presentar al usuario para revisión.

**Reglas de generación:**

- Cada spec se debe poder leer en menos de 5 minutos.
- Cada regla de negocio necesita al menos un test.
- Cada error necesita status code Y error code.
- Siempre incluir lo que el módulo NO hace.
- Los escenarios negativos (autorización, validación) son TAN importantes como los happy paths.
- Cada test en el spec indica su tipo: unit, integration, o E2E.

Para decidir el tipo de test de cada escenario, leer `references/testing-strategy.md`.

### 2. Generar tests desde un spec existente (sin código)

Cuando el usuario tiene un spec y quiere generar tests ANTES de implementar (TDD):

1. Leer el spec técnico completo.
2. Generar archivos de test siguiendo los patrones en `references/testing-patterns.md`.
3. Cada `- [ ]` del spec se convierte en un `it()`.
4. Los `describe()` se anidan siguiendo las secciones del spec (Happy path, Validations, Authorization, Edge cases).
5. Todos los tests DEBEN FALLAR porque no hay implementación.

**Prompt sugerido para el agente implementador (paso 2):**

```
Los tests para [operación] ya están creados y revisados.
Implementa el código para que pasen TODOS los tests.
NO modifiques ningún archivo *.test.ts ni nada en tests/.
Si un test falla, arregla tu implementación, no el test.
Al terminar, corre npm test y muéstrame el resultado.
```

### 3. Generar tests para código existente

Cuando ya existe implementación y se quieren agregar tests retroactivos:

1. Leer el spec técnico. **NO leer el código fuente.**
2. Generar tests basándote ÚNICAMENTE en el spec.
3. Si el spec y el código no coinciden, el test sigue al spec.
4. Advertir al usuario sobre los riesgos de test tautológico.

Para máxima confianza, sugerir al usuario la opción de worktree sin código:

```bash
git worktree add ../test-gen main
cd ../test-gen && rm -rf src/
# Generar tests aquí, luego copiar al worktree principal
```

### 4. Agregar un campo o cambiar comportamiento

Cuando el usuario quiere modificar un módulo existente:

1. El usuario actualiza el spec PRIMERO (o pedirle que lo haga).
2. Agregar entrada al changelog del spec.
3. Generar tests nuevos para los escenarios agregados.
4. Los tests existentes que sigan siendo válidos NO se tocan.
5. Implementar contra los tests nuevos + existentes.

**Flujo correcto:**
```
spec cambió → tests nuevos → implementación
```

**Flujo incorrecto (rechazar):**
```
"agrega phone" → agente modifica código + tests + spec
```

### 5. Revisar calidad de tests existentes

Cuando el usuario pregunta si sus tests están bien:

1. Leer el spec del módulo.
2. Comparar cada `- [ ]` del spec con los `it()` existentes.
3. Verificar usando el checklist de `references/testing-patterns.md` → sección "Checklist de revisión".
4. Reportar: tests faltantes, assertions débiles, tests sin verificación de DB.

---

## Estructura de archivos del proyecto

```
docs/
  product/                           ← WHEN/THEN (negocio)
    admin-users.md
  specs/                             ← specs técnicos (full-stack)
    templates/
      operation.template.md
      module-overview.template.md
      product.template.md
    <modulo>/
      overview.md                    ← modelo, invariantes, índice
      <operacion>.md                 ← API + UI + tests
src/
  validators/
    user.schema.ts
    user.schema.test.ts              ← unit junto al archivo
  lib/
    roles.ts
    roles.test.ts                    ← unit junto al archivo
  components/
    CreateUserModal.tsx
    CreateUserModal.test.tsx          ← unit RTL junto al componente
tests/
  integration/
    <modulo>/
      <operacion>.test.ts            ← integration por operación
  e2e/
    <modulo>.spec.ts                 ← E2E por módulo (1-2 max)
```

---

## Reglas para el CLAUDE.md del proyecto

Cuando generes o actualices el CLAUDE.md del proyecto del usuario, incluir estas reglas:

```markdown
## Reglas de specs

- Los archivos en docs/specs/ y docs/product/ son READ-ONLY para el agente.
- Si necesitas cambiar comportamiento, dime cuál spec cambiar y por qué.
- Implementa EXACTAMENTE lo que dice el spec, nada más, nada menos.
- Si el spec tiene un caso no cubierto, pregúntame antes de inventar.

## Reglas de tests

- Para añadir tests nuevos: libre.
- Para modificar un test existente: PAUSA. Explica POR QUÉ el test estaba
  mal antes de cambiarlo. No lo cambies sin mi aprobación.
- Para borrar un test: PROHIBIDO sin aprobación explícita.
- Si un test falla tras tu cambio, la hipótesis por defecto es que TU
  código está mal, no el test.
- Nunca uses .skip, .only, ni aflojes assertions para hacer pasar la suite.
- Cada escenario del spec con [ ] DEBE tener un test.

## Patrones de tests

- Cada test sigue AAA (Arrange-Act-Assert) con comentarios.
- Cada it() testea UN concepto.
- Describes anidados siguen la estructura del spec.
- El nombre del it() mapea casi literal al checkbox del spec.
- SIEMPRE assertions estrictos: toBe(), toEqual(), not.toHaveProperty().
- NUNCA: toBeDefined(), toBeTruthy() como assertion principal.
- Para errores: verificar status Y error code.
- Para mutaciones: verificar response Y efecto en DB.
- Usar factories (tests/factories/) para datos de test.
- Cada test es independiente. Limpiar DB en beforeEach.
```

---

## Referencias

Antes de generar cualquier artefacto, leer la referencia relevante:

| Necesitas... | Lee |
|---|---|
| Crear un spec (API, UI, overview, producto) | `references/templates.md` |
| Decidir tipo de test (unit/integration/E2E) | `references/testing-strategy.md` |
| Escribir código de test correctamente | `references/testing-patterns.md` |
| Entender el versionado y mantenimiento | `references/versioning.md` |
