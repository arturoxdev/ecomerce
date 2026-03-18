import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
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
]);
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

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

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
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
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  deliveryAddress: text("delivery_address"),
  rentStartDate: timestamp("rent_start_date", { precision: 6 }).notNull(),
  rentEndDate: timestamp("rent_end_date", { precision: 6 }).notNull(),
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
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const availability = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
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
  id: text("id").primaryKey().default("global"),
  deliveryMode: deliveryModeEnum("delivery_mode").notNull().default("INCLUDED"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }),
  depositPercent: numeric("deposit_percent", { precision: 5, scale: 4 })
    .notNull()
    .default("0.1"),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const zipDeliveryZones = pgTable("zip_delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  zipCode: text("zip_code").notNull().unique(),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull(),
});

export const aboutPageContents = pgTable(
  "about_page_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  (t) => [unique("idx_about_page_locale").on(t.slug, t.locale)],
);

export const legalPageDocuments = pgTable(
  "legal_page_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  (t) => [unique("idx_legal_page_locale").on(t.slug, t.locale)],
);

export const contactPageContents = pgTable(
  "contact_page_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  (t) => [unique("idx_contact_page_locale").on(t.slug, t.locale)],
);

export const faqEntries = pgTable(
  "faq_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("EMPLOYEE"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdate(() => new Date()),
});

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
  orderItems: many(orderItems),
  availability: many(availability),
}));

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
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  product: one(products, {
    fields: [availability.productId],
    references: [products.id],
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
