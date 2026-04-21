import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────

export const priceTypeEnum = pgEnum("price_type", ["FIXED", "PER_UNIT"]);
export type PriceType = (typeof priceTypeEnum.enumValues)[number];

export const paymentStatusEnum = pgEnum("payment_status", [
  "AUTHORIZED",
  "CAPTURED",
  "VOIDED",
  "FAILED",
  "SUSPICIOUS",
]);
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

export const paymentModeEnum = pgEnum("payment_mode", [
  "SPLIT_50_50",
  "FULL_ONLINE",
]);
export type PaymentMode = (typeof paymentModeEnum.enumValues)[number];

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
]);
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const deliveryModeEnum = pgEnum("delivery_mode", [
  "INCLUDED",
  "FIXED_FEE",
  "ZIP_CODE",
]);
export type DeliveryMode = (typeof deliveryModeEnum.enumValues)[number];

export const userRoleEnum = pgEnum("user_role", ["ROOT", "ADMIN", "EMPLOYEE"]);
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const contentLocaleEnum = pgEnum("content_locale", ["en", "es"]);
export type ContentLocale = (typeof contentLocaleEnum.enumValues)[number];

export const aboutPageSlugEnum = pgEnum("about_page_slug", ["about"]);
export const contactPageSlugEnum = pgEnum("contact_page_slug", ["contact"]);
export const legalPageSlugEnum = pgEnum("legal_page_slug", [
  "terms",
  "privacy",
  "refund-policy",
]);

// ── Tables ─────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("idx_categories_store_slug").on(t.storeId, t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    about: text("about"),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
    priceType: priceTypeEnum("price_type").notNull(),
    stock: integer("stock").notNull().default(1),
    photos: text("photos").array().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("idx_products_store_slug").on(t.storeId, t.slug)],
);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: text("store_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  deliveryAddress: text("delivery_address"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull(),
  squarePaymentId: text("square_payment_id"),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSessionExpiresAt: timestamp("stripe_session_expires_at", {
    withTimezone: true,
  }),
  currency: text("currency").notNull().default("USD"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("AUTHORIZED"),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  rentStartDate: timestamp("rent_start_date", { precision: 6 }).notNull(),
  rentEndDate: timestamp("rent_end_date", { precision: 6 }).notNull(),
});

export const availability = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    startDate: timestamp("start_date", { precision: 6 }).notNull(),
    endDate: timestamp("end_date", { precision: 6 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    reason: text("reason"),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_availability_lookup").on(t.productId, t.startDate, t.endDate)],
);

export const settings = pgTable("settings", {
  storeId: text("store_id").primaryKey(),
  deliveryMode: deliveryModeEnum("delivery_mode").notNull().default("INCLUDED"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }),
  depositPercent: numeric("deposit_percent", { precision: 5, scale: 4 })
    .notNull()
    .default("0.1"),
  paymentMode: paymentModeEnum("payment_mode")
    .notNull()
    .default("SPLIT_50_50"),
  currency: text("currency").notNull().default("USD"),
  themeId: text("theme_id").notNull().default("default"),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

// ── Stripe, rate limiting, audit (PRD Scope D) ─────────────────

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("processed"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const zipDeliveryZones = pgTable(
  "zip_delivery_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    zipCode: text("zip_code").notNull(),
    fee: numeric("fee", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [unique("idx_zip_store_code").on(t.storeId, t.zipCode)],
);

export const aboutPageContents = pgTable(
  "about_page_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    slug: aboutPageSlugEnum("slug").notNull().default("about"),
    locale: contentLocaleEnum("locale").notNull(),
    eyebrow: text("eyebrow").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    storyTitle: text("story_title").notNull(),
    storyBody: text("story_body").notNull(),
    valuesTitle: text("values_title").notNull(),
    valuesBody: text("values_body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("idx_about_page_locale").on(t.storeId, t.slug, t.locale)],
);

export const legalPageDocuments = pgTable(
  "legal_page_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    slug: legalPageSlugEnum("slug").notNull(),
    locale: contentLocaleEnum("locale").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("idx_legal_page_locale").on(t.storeId, t.slug, t.locale)],
);

export const contactPageContents = pgTable(
  "contact_page_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    slug: contactPageSlugEnum("slug").notNull().default("contact"),
    locale: contentLocaleEnum("locale").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    location: text("location").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    businessHours: text("business_hours").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("idx_contact_page_locale").on(t.storeId, t.slug, t.locale)],
);

export const faqEntries = pgTable(
  "faq_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    locale: contentLocaleEnum("locale").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("idx_faq_locale_order").on(t.locale, t.sortOrder)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: text("store_id").notNull(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified"),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("EMPLOYEE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("idx_users_store_email").on(t.storeId, t.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (t) => [unique("idx_accounts_provider").on(t.provider, t.providerAccountId)],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [unique("idx_verification_tokens").on(t.identifier, t.token)],
);

// ── Relations ──────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  orderItems: many(orderItems),
  availability: many(availability),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  }),
);

export const ordersRelations = relations(orders, ({ many }) => ({
  orderItems: many(orderItems),
  availability: many(availability),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  product: one(products, {
    fields: [availability.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [availability.variantId],
    references: [productVariants.id],
  }),
  order: one(orders, {
    fields: [availability.orderId],
    references: [orders.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
