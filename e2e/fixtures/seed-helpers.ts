import bcrypt from "bcryptjs";
import { and, eq, inArray, like, ne, sql } from "drizzle-orm";

import { E2E_PREFIX, TEST_STORE_ID, testDb, schema } from "./db-client";

const {
  availability,
  categories,
  faqEntries,
  orderItems,
  orders,
  productVariants,
  products,
  settings,
  users,
} = schema;

type PriceType = (typeof schema.priceTypeEnum.enumValues)[number];
type OrderStatus = (typeof schema.orderStatusEnum.enumValues)[number];
type DeliveryMode = (typeof schema.deliveryModeEnum.enumValues)[number];
type UserRole = (typeof schema.userRoleEnum.enumValues)[number];

export type TrackedIds = {
  categoryIds: string[];
  productIds: string[];
  variantIds: string[];
  orderIds: string[];
  availabilityIds: string[];
  userIds: string[];
  faqIds: string[];
};

export function emptyTrackedIds(): TrackedIds {
  return {
    categoryIds: [],
    productIds: [],
    variantIds: [],
    orderIds: [],
    availabilityIds: [],
    userIds: [],
    faqIds: [],
  };
}

export function uniqueSlug(prefix: string, workerIndex: number): string {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${E2E_PREFIX}${prefix}-w${workerIndex}-${stamp}`;
}

export function uniqueEmail(prefix: string, workerIndex: number): string {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${E2E_PREFIX}${prefix}-w${workerIndex}-${stamp}@example.com`;
}

// ─── Factories ────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Variant = typeof productVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type AvailabilityRow = typeof availability.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type User = typeof users.$inferSelect;

export type SeedFactories = {
  createCategory(opts?: {
    slug?: string;
    name?: string;
    sortOrder?: number;
  }): Promise<Category>;

  createProduct(opts: {
    categoryId: string;
    slug?: string;
    name?: string;
    basePrice?: string;
    priceType?: PriceType;
    stock?: number;
    isActive?: boolean;
    description?: string;
  }): Promise<Product>;

  createVariant(
    productId: string,
    opts: { name: string; price: string; stock?: number; isActive?: boolean },
  ): Promise<Variant>;

  createOrder(opts: {
    items: Array<{
      productId: string;
      variantId?: string | null;
      quantity: number;
      unitPrice: number;
      start: Date;
      end: Date;
    }>;
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    status?: OrderStatus;
    depositPercent?: number;
    deliveryFee?: number;
  }): Promise<{ order: Order; items: OrderItem[] }>;

  createAvailabilityBlock(
    productId: string,
    opts: {
      start: Date;
      end: Date;
      quantity?: number;
      reason?: string;
      variantId?: string | null;
    },
  ): Promise<AvailabilityRow>;

  createUser(opts: {
    email?: string;
    name?: string;
    role: UserRole;
    password?: string;
    isActive?: boolean;
  }): Promise<{ user: User; password: string }>;
};

export function makeFactories(
  workerIndex: number,
  tracked: TrackedIds,
): SeedFactories {
  return {
    async createCategory(opts = {}) {
      const slug = opts.slug ?? uniqueSlug("cat", workerIndex);
      const name = opts.name ?? `E2E Category ${slug}`;
      const [row] = await testDb
        .insert(categories)
        .values({
          storeId: TEST_STORE_ID,
          slug,
          name,
          sortOrder: opts.sortOrder ?? 0,
        })
        .returning();
      tracked.categoryIds.push(row.id);
      return row;
    },

    async createProduct(opts) {
      const slug = opts.slug ?? uniqueSlug("prod", workerIndex);
      const name = opts.name ?? `E2E Product ${slug}`;
      const [row] = await testDb
        .insert(products)
        .values({
          storeId: TEST_STORE_ID,
          slug,
          name,
          description: opts.description ?? "E2E test product",
          basePrice: opts.basePrice ?? "100.00",
          priceType: opts.priceType ?? "FIXED",
          stock: opts.stock ?? 1,
          isActive: opts.isActive ?? true,
          categoryId: opts.categoryId,
          photos: [],
        })
        .returning();
      tracked.productIds.push(row.id);
      return row;
    },

    async createVariant(productId, opts) {
      const [row] = await testDb
        .insert(productVariants)
        .values({
          productId,
          name: opts.name,
          price: opts.price,
          stock: opts.stock ?? 1,
          isActive: opts.isActive ?? true,
        })
        .returning();
      tracked.variantIds.push(row.id);
      return row;
    },

    async createOrder(opts) {
      const subtotal = opts.items.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0,
      );
      const deliveryFee = opts.deliveryFee ?? 0;
      const depositPercent = opts.depositPercent ?? 0.1;
      const depositAmount = subtotal * depositPercent;
      const total = subtotal + deliveryFee;

      const customer = opts.customer ?? {};
      const email =
        customer.email ?? uniqueEmail("cust", workerIndex);
      const name = customer.name ?? `E2E Customer ${workerIndex}`;
      const phone = customer.phone ?? "+1-555-000-0000";
      const address = customer.address ?? "123 Test St";

      return testDb.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            storeId: TEST_STORE_ID,
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            deliveryAddress: address,
            subtotal: subtotal.toFixed(2),
            depositAmount: depositAmount.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            total: total.toFixed(2),
            amountPaid: "0",
            paymentStatus: "AUTHORIZED",
            status: opts.status ?? "CONFIRMED",
          })
          .returning();
        tracked.orderIds.push(order.id);

        const itemRows: OrderItem[] = [];
        for (const item of opts.items) {
          const [itemRow] = await tx
            .insert(orderItems)
            .values({
              orderId: order.id,
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toFixed(2),
              subtotal: (item.unitPrice * item.quantity).toFixed(2),
              rentStartDate: item.start,
              rentEndDate: item.end,
            })
            .returning();
          itemRows.push(itemRow);

          const [avail] = await tx
            .insert(availability)
            .values({
              productId: item.productId,
              variantId: item.variantId ?? null,
              startDate: item.start,
              endDate: item.end,
              quantity: item.quantity,
              orderId: order.id,
              reason: `${E2E_PREFIX}order-hold`,
            })
            .returning();
          tracked.availabilityIds.push(avail.id);
        }

        return { order, items: itemRows };
      });
    },

    async createAvailabilityBlock(productId, opts) {
      const [row] = await testDb
        .insert(availability)
        .values({
          productId,
          variantId: opts.variantId ?? null,
          startDate: opts.start,
          endDate: opts.end,
          quantity: opts.quantity ?? 1,
          reason: opts.reason ?? `${E2E_PREFIX}manual-block`,
          orderId: null,
        })
        .returning();
      tracked.availabilityIds.push(row.id);
      return row;
    },

    async createUser(opts) {
      const password = opts.password ?? "e2e-pass-123";
      const passwordHash = await bcrypt.hash(password, 10);
      const email = opts.email ?? uniqueEmail("user", workerIndex);
      const name = opts.name ?? `E2E User ${workerIndex}`;
      const [row] = await testDb
        .insert(users)
        .values({
          storeId: TEST_STORE_ID,
          email,
          name,
          passwordHash,
          role: opts.role,
          isActive: opts.isActive ?? true,
        })
        .returning();
      tracked.userIds.push(row.id);
      return { user: row, password };
    },
  };
}

// ─── Settings snapshot/restore ────────────────────────────────────────

export async function readTestSettings(): Promise<Settings> {
  const rows = await testDb
    .select()
    .from(settings)
    .where(eq(settings.storeId, TEST_STORE_ID))
    .limit(1);
  if (rows.length === 0) {
    const [row] = await testDb
      .insert(settings)
      .values({ storeId: TEST_STORE_ID })
      .returning();
    return row;
  }
  return rows[0];
}

export async function upsertTestSettings(values: {
  deliveryMode?: DeliveryMode;
  deliveryFee?: string | null;
  depositPercent?: string;
  paymentMode?: "FULL_ONLINE" | "SPLIT_50_50";
  themeId?: string;
}): Promise<Settings> {
  await readTestSettings();
  const [row] = await testDb
    .update(settings)
    .set({
      ...(values.deliveryMode !== undefined
        ? { deliveryMode: values.deliveryMode }
        : {}),
      ...(values.deliveryFee !== undefined
        ? { deliveryFee: values.deliveryFee }
        : {}),
      ...(values.depositPercent !== undefined
        ? { depositPercent: values.depositPercent }
        : {}),
      ...(values.paymentMode !== undefined
        ? { paymentMode: values.paymentMode }
        : {}),
      ...(values.themeId !== undefined ? { themeId: values.themeId } : {}),
    })
    .where(eq(settings.storeId, TEST_STORE_ID))
    .returning();
  return row;
}

// ─── Cleanup ──────────────────────────────────────────────────────────

/**
 * Deletes only the rows whose ids appear in `tracked`. Safe to call per-test.
 * Order respects FKs: cascades from tracked products to any orders/orderItems/availability
 * that reference them (even if the test didn't track those orders directly,
 * e.g. when the spec exercises `placeOrder` against a seeded product).
 */
export async function cleanupByIds(tracked: TrackedIds): Promise<void> {
  if (tracked.availabilityIds.length > 0) {
    await testDb
      .delete(availability)
      .where(inArray(availability.id, tracked.availabilityIds));
  }

  // Collect every order that touches a tracked product — these may have been
  // created by the app under test (placeOrder) and not directly tracked.
  if (tracked.productIds.length > 0) {
    const relatedOrderIds = (
      await testDb
        .selectDistinct({ orderId: orderItems.orderId })
        .from(orderItems)
        .where(inArray(orderItems.productId, tracked.productIds))
    ).map((r) => r.orderId);
    for (const id of relatedOrderIds) {
      if (!tracked.orderIds.includes(id)) tracked.orderIds.push(id);
    }
  }

  if (tracked.orderIds.length > 0) {
    await testDb
      .delete(availability)
      .where(inArray(availability.orderId, tracked.orderIds));
    await testDb
      .delete(orderItems)
      .where(inArray(orderItems.orderId, tracked.orderIds));
    await testDb.delete(orders).where(inArray(orders.id, tracked.orderIds));
  }

  if (tracked.variantIds.length > 0) {
    await testDb
      .delete(productVariants)
      .where(inArray(productVariants.id, tracked.variantIds));
  }

  if (tracked.productIds.length > 0) {
    await testDb
      .delete(availability)
      .where(inArray(availability.productId, tracked.productIds));
    await testDb
      .delete(productVariants)
      .where(inArray(productVariants.productId, tracked.productIds));
    await testDb.delete(products).where(inArray(products.id, tracked.productIds));
  }

  if (tracked.categoryIds.length > 0) {
    await testDb
      .delete(categories)
      .where(inArray(categories.id, tracked.categoryIds));
  }
  if (tracked.userIds.length > 0) {
    await testDb
      .delete(users)
      .where(and(inArray(users.id, tracked.userIds), ne(users.role, "ROOT")));
  }
  if (tracked.faqIds.length > 0) {
    await testDb
      .delete(faqEntries)
      .where(inArray(faqEntries.id, tracked.faqIds));
  }
}

/**
 * Global teardown barrida. Borra todos los recursos con prefijo `e2e-` del store
 * actual. Red de seguridad: los tests ya deberían haber limpiado por ids.
 *
 * Usa subqueries SQL en vez de capturar ids primero: evita race conditions entre
 * workers paralelos que crean recursos entre el SELECT y el DELETE.
 */
export async function cleanupTestData(): Promise<void> {
  const storeId = TEST_STORE_ID;
  const prefix = `${E2E_PREFIX}%`;

  // 1. availability de productos e2e (via subquery, resuelta por pg en cada DELETE)
  await testDb.execute(sql`
    DELETE FROM availability
    WHERE product_id IN (
      SELECT id FROM products
      WHERE store_id = ${storeId} AND slug LIKE ${prefix}
    )
       OR order_id IN (
      SELECT id FROM orders
      WHERE store_id = ${storeId} AND customer_email LIKE ${prefix}
    )
       OR reason LIKE ${prefix}
  `);

  // 2. orderItems de órdenes e2e
  await testDb.execute(sql`
    DELETE FROM order_items
    WHERE order_id IN (
      SELECT id FROM orders
      WHERE store_id = ${storeId} AND customer_email LIKE ${prefix}
    )
  `);

  // 3. orders con customer prefijado
  await testDb
    .delete(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        like(orders.customerEmail, prefix),
      ),
    );

  // 4. variants de productos e2e
  await testDb.execute(sql`
    DELETE FROM product_variants
    WHERE product_id IN (
      SELECT id FROM products
      WHERE store_id = ${storeId} AND slug LIKE ${prefix}
    )
  `);

  // 5. products con slug e2e
  await testDb
    .delete(products)
    .where(
      and(eq(products.storeId, storeId), like(products.slug, prefix)),
    );

  // 6. categories con slug e2e (después de products por onDelete: restrict)
  await testDb
    .delete(categories)
    .where(
      and(eq(categories.storeId, storeId), like(categories.slug, prefix)),
    );

  // 7. users con email e2e (nunca ROOT)
  await testDb
    .delete(users)
    .where(
      and(
        eq(users.storeId, storeId),
        like(users.email, prefix),
        ne(users.role, "ROOT"),
      ),
    );

  // 8. faq entries con pregunta e2e
  await testDb
    .delete(faqEntries)
    .where(
      and(eq(faqEntries.storeId, storeId), like(faqEntries.question, prefix)),
    );
}

