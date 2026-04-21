# Estrategia de Testing

## Cómo decidir el tipo de test

No lo decide el spec, lo decide la **capa que atraviesa el test**.

### Árbol de decisión

```
¿Necesita el browser real?
  └─ Sí → E2E (Playwright)
  └─ No
      ¿Necesita DB o HTTP?
        └─ Sí → Integration (Vitest + DB de test)
        └─ No
            ¿Es lógica pura (función)?
              └─ Sí → Unit (Vitest)
              └─ No → Probablemente integration
```

### Mapeo por tipo de escenario

| Escenario del spec              | Tipo de test                    | Ejemplo                          |
|---------------------------------|---------------------------------|----------------------------------|
| Validación de campo             | Unit (schema Zod)               | email inválido → error           |
| Normalización (lowercase, trim) | Unit (función pura)             | normalizeEmail()                 |
| Regla de negocio pura           | Unit (función)                  | canCreateRole(ROOT, ADMIN)       |
| Crear/leer/editar en DB         | Integration (Vitest + DB)       | insertar user, verificar hash    |
| Endpoint completo               | Integration (request/response)  | POST → 201, POST duplicado → 409|
| Autorización (quién puede qué)  | Integration (endpoint)          | ADMIN POST → 403                 |
| Render de componente            | Unit (React Testing Library)    | modal muestra 4 campos           |
| Validación client-side          | Unit (React Testing Library)    | blur email inválido → error      |
| Estados del componente          | Unit (RTL, fetch mockeado)      | submit → spinner → toast         |
| Flujo UI completo               | E2E (Playwright)                | abrir → llenar → submit → tabla  |

### Proporción saludable

```
70% Unit      → schemas, validators, helpers, funciones de negocio,
                componentes React con RTL
20% Integration → endpoints, queries DB, autorización
10% E2E         → 1-2 por módulo, solo happy path crítico
```

En apps con mucha DB (Drizzle), subir integration a 30% y bajar unit a 60%.

### Tests que se duplican (y está bien)

Un escenario como "email inválido → 400" se testea DOS veces:

1. **Unit** del schema Zod → rápido, preciso, verifica la regla existe.
2. **Integration** del endpoint → verifica que el endpoint USA el schema.

La duplicación es intencional. El unit dice "la regla existe", el integration
dice "la regla se aplica en producción".

### Dónde viven los archivos de test

```
src/
  validators/
    user.schema.test.ts           ← unit: junto al archivo
  lib/
    roles.test.ts                 ← unit: junto al archivo
  components/
    CreateUserModal.test.tsx       ← unit (RTL): junto al componente
tests/
  factories/
    user.factory.ts               ← factories compartidas
  integration/
    admin-users/
      create-user.test.ts         ← integration: por operación
  e2e/
    admin-users.spec.ts            ← E2E: por módulo
```

---

## Flujos de generación de tests

### Flujo A: TDD (tests primero, sin código)

El flujo más seguro. El agente no puede hacer test tautológico porque
no hay implementación cuando escribe los tests.

```
Paso 1: Agente lee spec → genera SOLO tests → todos FALLAN
Paso 2: Humano revisa tests (5-10 min)
Paso 3: Agente implementa → NO puede tocar tests → todos PASAN
Paso 4: Verificar que diff de tests/ está vacío
```

### Flujo B: Tests para código existente

Más peligroso. Riesgo de test tautológico. Mitigaciones:

1. El agente lee SOLO el spec, NO el código fuente.
2. Si es crítico, usar worktree sin código:
   ```bash
   git worktree add ../test-gen main
   cd ../test-gen && rm -rf src/
   ```
3. Después de generar: romper una regla en el código a propósito
   y verificar que el test falla (mutation testing manual).

### Flujo C: Agregar tests por cambio en spec

```
Spec cambió → agregar tests NUEVOS → no tocar tests existentes → implementar
```

Si un test existente necesita cambiar, el agente PAUSA y explica por qué
antes de modificarlo.

---

## Señales de alarma al revisar tests

```
🚩 El test usa valores que solo están en el código, no en el spec
   it("returns 422") ← el spec dice 400

🚩 El test mockea la implementación interna exacta
   jest.mock("../../src/data/users", () => ...)

🚩 Assertions débiles
   expect(x).toBeDefined()   ← inútil
   expect(x).toBeTruthy()    ← inútil

🚩 Faltan tests negativos del spec
   Spec tiene 5 errores, tests solo cubren 2

🚩 El test verifica forma, no comportamiento
   expect(fn).toHaveBeenCalled()  ← verifica que se llamó algo
   vs.
   expect(db.email).toBe("x")    ← verifica el efecto real

🚩 Tests que pasan sin implementación real
   Si borras el cuerpo de la función y los tests pasan, son inútiles
```
