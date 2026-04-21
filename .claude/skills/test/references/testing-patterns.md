# Patrones de Tests

Guía de cómo escribir código de test de alta calidad. Estos patrones
aplican a Vitest + React Testing Library + Playwright.

---

## Patrón 1: Arrange-Act-Assert (AAA)

Cada test tiene tres secciones separadas con comentarios. Sin excepciones.

```typescript
it("ROOT creates ADMIN → 201 with correct role", async () => {
  // Arrange
  const root = await createTestUser({ role: "ROOT" });
  const input = buildUserInput({ role: "ADMIN" });

  // Act
  const response = await postAsUser(root, "/api/admin/users", input);

  // Assert
  expect(response.status).toBe(201);
  expect(response.body.role).toBe("ADMIN");
  expect(response.body).not.toHaveProperty("password");
});
```

---

## Patrón 2: Un concepto por test

Varios `expect` del MISMO concepto están bien. Dos conceptos distintos
en un solo `it()` no está bien.

```typescript
// ✅ Un concepto: "el response de creación es correcto"
it("returns created user without sensitive fields", async () => {
  const response = await createUser(validInput);
  expect(response.status).toBe(201);
  expect(response.body.id).toBeDefined();
  expect(response.body.email).toBe("test@example.com");
  expect(response.body).not.toHaveProperty("password");
});

// ❌ Dos conceptos mezclados
it("creates user and validates email", async () => {
  const good = await createUser(validInput);
  expect(good.status).toBe(201);
  const bad = await createUser({ ...validInput, email: "invalid" });
  expect(bad.status).toBe(400);
});
```

---

## Patrón 3: Nombres que mapean al spec

El nombre del `it()` es casi una copia del checkbox del spec. Cuando un
test falla, el nombre te dice qué requirement se rompió.

```typescript
// Spec: "- [ ] ADMIN intenta crear ADMIN → 403 role_hierarchy_violation"

// ✅ Mapea al spec
it("ADMIN creating ADMIN → 403 role_hierarchy_violation", async () => {

// ❌ Genérico
it("should not allow admin to create admin users", async () => {

// ❌ Inútil
it("test role validation", async () => {
```

---

## Patrón 4: Describes anidados como el spec

Los `describe()` reflejan las secciones del spec 1:1.

```typescript
describe("POST /api/admin/users", () => {
  describe("✅ Happy path", () => {
    it("ROOT creates ADMIN → 201", async () => { ... });
    it("ROOT creates EMPLOYEE → 201", async () => { ... });
    it("ADMIN creates EMPLOYEE → 201", async () => { ... });
    it("email with uppercase → stored lowercase", async () => { ... });
  });

  describe("🚫 Validations", () => {
    it("missing name → 400 name_required", async () => { ... });
    it("short name (1 char) → 400 name_length", async () => { ... });
    it("invalid email → 400 email_invalid", async () => { ... });
  });

  describe("🔒 Authorization", () => {
    it("EMPLOYEE → 403 forbidden", async () => { ... });
    it("ADMIN creating ADMIN → 403 role_hierarchy_violation", async () => { ... });
    it("unauthenticated → 401", async () => { ... });
  });

  describe("💥 Edge cases", () => {
    it("duplicate email → 409", async () => { ... });
    it("empty body → 400", async () => { ... });
  });
});
```

---

## Patrón 5: Factories de datos

Nunca hardcodear datos en cada test. Usar factories reutilizables.

```typescript
// tests/factories/user.factory.ts

export function buildUserInput(overrides: Partial<CreateUserInput> = {}) {
  return {
    name: "Test User",
    email: `test-${Date.now()}@example.com`, // único por test
    password: "securepass123",
    role: "EMPLOYEE" as const,
    ...overrides,
  };
}

export async function createTestUser(overrides: Partial<User> = {}) {
  const input = buildUserInput(overrides);
  const user = await db.insert(users).values({
    ...input,
    id: crypto.randomUUID(),
    password: await bcrypt.hash(input.password, 10),
    isActive: true,
  }).returning();
  return user[0];
}

// Helper de request autenticado
export async function postAsUser(
  user: User,
  path: string,
  body: unknown
) {
  const token = await generateTestToken(user);
  return request(app)
    .post(path)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}
```

---

## Patrón 6: Assertions estrictos

La diferencia entre un test que protege y un test que adorna.

```typescript
// ❌ Assertions débiles (el agente puede gamear esto fácilmente)
expect(response.status).toBeDefined();
expect(response.body).toBeTruthy();
expect(result).not.toBeNull();

// ✅ Assertions estrictos
expect(response.status).toBe(201);
expect(response.body.role).toBe("ADMIN");
expect(response.body.email).toBe("test@example.com");
expect(response.body).not.toHaveProperty("password");

// ✅ Para errores: SIEMPRE status + code
expect(response.status).toBe(403);
expect(response.body.code).toBe("role_hierarchy_violation");

// ✅ Para listas: verificar contenido, no solo longitud
expect(response.body.data).toHaveLength(3);
expect(response.body.data[0]).toMatchObject({ role: "ADMIN" });
```

---

## Patrón 7: Verificar efectos colaterales

El response HTTP puede mentir. Verificar la DB directamente.

```typescript
it("actually persists user in database", async () => {
  const input = buildUserInput();

  // Act
  const response = await postAsUser(root, "/api/admin/users", input);

  // Assert response
  expect(response.status).toBe(201);

  // Assert DB (el response podría mentir)
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  expect(dbUser).not.toBeNull();
  expect(dbUser!.role).toBe(input.role);
  expect(await bcrypt.compare(input.password, dbUser!.password)).toBe(true);
});

it("deactivation invalidates session", async () => {
  const employee = await createTestUser({ role: "EMPLOYEE" });
  const token = await generateTestToken(employee);

  // Desactivar
  await patchAsUser(root, `/api/admin/users/${employee.id}`, { isActive: false });

  // La sesión del usuario desactivado ya no funciona
  const response = await request(app)
    .get("/api/me")
    .set("Authorization", `Bearer ${token}`);
  expect(response.status).toBe(401);
});
```

---

## Patrón 8: Aislamiento entre tests

Cada test limpia su estado. No dependencias de orden.

```typescript
beforeEach(async () => {
  await db.delete(users);
});

afterAll(async () => {
  await db.delete(users);
  await pool.end();
});
```

Si un test necesita un usuario ROOT existente, lo crea él mismo en su
Arrange, no depende de que otro test lo haya creado antes.

---

## Patrón 9: Tests de UI con RTL

Para componentes React. Testear comportamiento, no implementación.

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("CreateUserModal", () => {
  const user = userEvent.setup();

  it("shows only EMPLOYEE in role select when user is ADMIN", async () => {
    render(<CreateUserModal currentUserRole="ADMIN" />);

    const select = screen.getByLabelText("Rol");
    await user.click(select);

    expect(screen.getByText("EMPLOYEE")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
    expect(screen.queryByText("ROOT")).not.toBeInTheDocument();
  });

  it("shows inline error on blur for invalid email", async () => {
    render(<CreateUserModal currentUserRole="ROOT" />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "not-an-email");
    await user.tab(); // trigger blur

    expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
  });

  it("disables form and shows spinner during submit", async () => {
    // Mock fetch para que tarde
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves

    render(<CreateUserModal currentUserRole="ROOT" />);
    await fillForm({ name: "Test", email: "t@t.com", password: "12345678" });
    await user.click(screen.getByRole("button", { name: /crear/i }));

    expect(screen.getByRole("button", { name: /crear/i })).toBeDisabled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });
});
```

---

## Checklist de revisión de tests

Usar esta lista para revisar tests generados por un agente (< 5 minutos):

```
□ ¿Cada [ ] del spec tiene su it()?
□ ¿Los nombres de los it() mapean al spec?
□ ¿Los describes siguen la estructura del spec?
□ ¿Hay factories o están hardcodeando datos?
□ ¿Assertions estrictos (toBe, no toBeDefined)?
□ ¿Tests de error verifican status Y error code?
□ ¿Tests de create/update verifican la DB directamente?
□ ¿Cada test limpia su estado (beforeEach)?
□ ¿Tests pueden correr en cualquier orden?
□ ¿Tests de UI usan RTL, no snapshots?
□ ¿No hay mocks de implementación interna?
□ ¿Los tests FALLAN sin implementación?
```

---

## Anti-patrones (nunca generar esto)

```typescript
// ❌ Snapshot tests para lógica de negocio
expect(response.body).toMatchSnapshot();

// ❌ Test sin assertions
it("creates user", async () => {
  await createUser(input);
  // ... y ya? ¿qué verifica?
});

// ❌ Test que depende de otro test
it("gets the user created in previous test", async () => {
  const response = await getUser(lastCreatedId); // ← de dónde salió?
});

// ❌ Mockear la DB en integration tests
vi.mock("../../src/db", () => ({ query: vi.fn() }));
// Si mockeas la DB, no estás testeando la integración

// ❌ Assert genérico
expect(response.body).toBeDefined();
expect(result).toBeTruthy();

// ❌ .skip o .only en código mergeado
it.skip("duplicate email → 409", async () => { ... });
it.only("creates user", async () => { ... });
```
