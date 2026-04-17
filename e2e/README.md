# E2E tests (Playwright)

Pruebas end-to-end del storefront y del panel admin usando [Playwright](https://playwright.dev/).

## Requisitos

1. Dependencias instaladas: `npm install -D @playwright/test` y `npx playwright install chromium`.
2. Variables de entorno en `.env.local`:
   - `DATABASE_URL`, `STORE_ID`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (las que ya usa el proyecto).
   - `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD` apuntando a un usuario admin existente en la BD de desarrollo.
3. La BD de desarrollo debe tener al menos un producto publicado para que el test de catálogo pase. Usa `npm run db:seed:demo` si necesitas datos de prueba.

## Correr los tests

```bash
npm run test:e2e              # headless, todos los tests
npm run test:e2e:ui           # UI mode interactivo (recomendado para desarrollar)
npm run test:e2e:debug        # modo debug (inspector paso a paso)
npm run test:e2e:report       # abre el reporte HTML del último run
```

El script arranca `next dev` automáticamente en `http://localhost:3000`. Si ya tienes un dev server corriendo, lo reutiliza.

## Estructura

```
e2e/
├── fixtures/
│   ├── auth.setup.ts            # Login admin, guarda storage state
│   ├── db-client.ts             # Cliente Drizzle aislado para tests
│   ├── seed-helpers.ts          # Factories + cleanup (prefijo e2e-)
│   ├── test-context.ts          # `test` extendido con { seed, tracked }
│   ├── storefront-helpers.ts    # selectDateRange, addToCart, submitOrder, …
│   ├── global-teardown.ts       # Cleanup final de recursos e2e-%
│   └── cleanup-cli.ts           # Script manual (npm run test:e2e:cleanup)
├── .auth/                       # Storage state generado (git-ignored)
├── admin-login.spec.ts          # Flujo de autenticación admin
├── catalog.spec.ts              # Flujo público de catálogo
├── cart.spec.ts                 # Agregar al carrito (con mock de availability)
└── README.md
```

## Fixtures, factories y cleanup

Los specs nuevos usan el `test` extendido de `fixtures/test-context.ts` en vez de
`@playwright/test`:

```ts
import { test, expect, upsertTestSettings } from "./fixtures/test-context";

test("crea producto y lo muestra en storefront", async ({ page, seed }) => {
  const category = await seed.createCategory();
  const product = await seed.createProduct({ categoryId: category.id, stock: 2 });
  // …
});
```

El fixture `seed` crea recursos con slugs prefijados (`e2e-...`) y los rastrea en
el fixture `tracked`. Al terminar cada test, el `afterEach` de `test-context`
elimina sólo los ids creados por ese test (cleanup scoped).

`global-teardown.ts` corre una vez al final de toda la suite y hace una barrida
por prefijo como red de seguridad (borra todo con slug/email/reason `e2e-%`).
Nunca toca rows fuera de ese prefijo ni desactiva el admin seed (`role = ROOT`).

Para limpieza manual fuera de ejecuciones:

```bash
npm run test:e2e:cleanup
```

## Settings compartidos

Los specs que cambian settings globales (delivery mode, deposit %, theme)
deben:

1. Declarar `test.describe.configure({ mode: "serial" })` en el describe afectado.
2. Tomar snapshot en `beforeAll` con `readTestSettings()`.
3. Aplicar cambios con `upsertTestSettings({...})`.
4. Restaurar el snapshot en `afterAll`.

## Data-testids disponibles

La suite usa selectores semánticos (`getByRole`, `getByLabel`) por default. Sólo
se agregaron `data-testid` quirúrgicos donde el texto es i18n o el rol es
ambiguo:

- `availability-status` — estado del calendario en detalle de producto.
- `add-to-cart-button` — botón principal de añadir al carrito.
- `cart-summary-{subtotal|delivery|deposit|total}` — celdas del summary del carrito.
- `order-confirmation-number` — número corto de la orden en la página de confirmación.
- `admin-order-row` — filas del listado admin de órdenes (con `data-order-id`).
- `logout-button` — entrada "Log out" del dropdown del sidebar admin.
- `theme-option-{themeId}` — cards del selector de tema.

## Cómo funciona la autenticación

`auth.setup.ts` corre una vez antes de los demás tests. Hace login en `/admin/login` con las credenciales de `.env.local` y guarda la cookie de sesión en `e2e/.auth/admin.json`. Cualquier test en el proyecto `chromium` arranca ya autenticado.

Si un test necesita correr como usuario anónimo (por ejemplo el catálogo público), sobreescribe el storage state:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

## Escribir un test nuevo

1. Crea `e2e/mi-flujo.spec.ts`.
2. Usa `page.goto("/ruta")` — el `baseURL` ya está configurado.
3. Prefiere locators semánticos: `page.getByRole`, `page.getByLabel`, `page.getByText`.
4. Corre `npm run test:e2e:ui` para desarrollarlo interactivamente.

## Troubleshooting

- **`TEST_ADMIN_EMAIL ... must be set`**: agrega las variables a `.env.local`.
- **El test de catálogo no encuentra productos**: corre `npm run db:seed:demo`.
- **El server no arranca**: verifica que `npm run dev` funciona manualmente primero.
- **Ver qué falló**: `npm run test:e2e:report` — el reporte incluye screenshots, video y trace.
