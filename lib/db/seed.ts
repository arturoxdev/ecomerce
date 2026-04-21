import bcrypt from "bcryptjs";
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import {
  aboutPageFallbacks,
  contactPageFallbacks,
  faqFallbacks,
  legalPageFallbacks,
} from "@/features/pages";

import * as schema from "./schema";
import {
  aboutPageContents,
  categories,
  contactPageContents,
  faqEntries,
  legalPageDocuments,
  products,
  settings,
  users,
} from "./schema";

const db = drizzle({ connection: process.env.DATABASE_URL!, schema });

function requireStoreId(): string {
  const id = process.env.STORE_ID;
  if (!id) {
    console.error("STORE_ID env var is required for seeding");
    process.exit(1);
  }
  return id;
}

const storeId: string = requireStoreId();
const isDemo = process.argv.includes("--demo");

// ── Bootstrap: minimal data every new store needs ─────────────

async function bootstrap() {
  // Settings
  await db
    .insert(settings)
    .values({ storeId })
    .onConflictDoUpdate({ target: settings.storeId, set: { storeId } });

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await db
    .insert(users)
    .values({
      storeId,
      name: "Admin",
      email: "admin@admin.com",
      passwordHash: adminPassword,
      role: "ROOT",
    })
    .onConflictDoUpdate({
      target: [users.storeId, users.email],
      set: { name: "Admin", role: "ROOT", passwordHash: adminPassword },
    });

  // Static pages (about, contact, legal, FAQ)
  for (const locale of ["en", "es"] as const) {
    const aboutContent = aboutPageFallbacks[locale];
    await db
      .insert(aboutPageContents)
      .values({ storeId, slug: "about", locale, ...aboutContent })
      .onConflictDoUpdate({
        target: [aboutPageContents.storeId, aboutPageContents.slug, aboutPageContents.locale],
        set: aboutContent,
      });

    const contactContent = contactPageFallbacks[locale];
    await db
      .insert(contactPageContents)
      .values({ storeId, slug: "contact", locale, ...contactContent })
      .onConflictDoUpdate({
        target: [contactPageContents.storeId, contactPageContents.slug, contactPageContents.locale],
        set: contactContent,
      });

    for (const slug of ["terms", "privacy", "refund-policy"] as const) {
      const legalContent = legalPageFallbacks[slug][locale];
      await db
        .insert(legalPageDocuments)
        .values({ storeId, slug, locale, ...legalContent })
        .onConflictDoUpdate({
          target: [legalPageDocuments.storeId, legalPageDocuments.slug, legalPageDocuments.locale],
          set: legalContent,
        });
    }
  }

  await db.delete(faqEntries).where(eq(faqEntries.storeId, storeId));
  await db.insert(faqEntries).values([
    ...faqFallbacks.en.map((f) => ({ ...f, storeId })),
    ...faqFallbacks.es.map((f) => ({ ...f, storeId })),
  ]);
}

// ── Demo: sample categories & products for development ────────

async function demo() {
  const categoryData = [
    {
      slug: "inflables",
      name: "Inflables",
      description: "Brincolines y juegos inflables.",
    },
    {
      slug: "sillas",
      name: "Sillas",
      description: "Sillas para eventos y fiestas.",
    },
    {
      slug: "mesas",
      name: "Mesas",
      description: "Mesas para todo tipo de evento.",
    },
  ];

  for (const category of categoryData) {
    await db
      .insert(categories)
      .values({ storeId, ...category })
      .onConflictDoUpdate({
        target: [categories.storeId, categories.slug],
        set: { name: category.name, description: category.description },
      });
  }

  const inflables = await db.query.categories.findFirst({
    where: and(eq(categories.slug, "inflables"), eq(categories.storeId, storeId)),
    columns: { id: true },
  });
  const sillas = await db.query.categories.findFirst({
    where: and(eq(categories.slug, "sillas"), eq(categories.storeId, storeId)),
    columns: { id: true },
  });
  const mesas = await db.query.categories.findFirst({
    where: and(eq(categories.slug, "mesas"), eq(categories.storeId, storeId)),
    columns: { id: true },
  });

  if (!inflables || !sillas || !mesas) {
    throw new Error("Failed to find seeded categories");
  }

  const productData = [
    {
      slug: "brincolin-castillo",
      name: "Brincolin Castillo",
      description: "Renta por bloque de 8 horas.",
      basePrice: "130.00",
      priceType: "FIXED" as const,
      stock: 1,
      photos: ["https://images.unsplash.com/photo-1529634898247-2f4f95f4e6f7"],
      categoryId: inflables.id,
    },
    {
      slug: "silla-plegable-blanca",
      name: "Silla Plegable Blanca",
      description: "Precio por unidad.",
      basePrice: "2.00",
      priceType: "PER_UNIT" as const,
      stock: 50,
      photos: ["https://images.unsplash.com/photo-1564078516393-cf04bd966897"],
      categoryId: sillas.id,
    },
    {
      slug: "mesa-rectangular-6ft",
      name: "Mesa Rectangular 6ft",
      description: "Mesa plegable para eventos.",
      basePrice: "12.00",
      priceType: "FIXED" as const,
      stock: 20,
      photos: ["https://images.unsplash.com/photo-1517457373958-b7bdd4587205"],
      categoryId: mesas.id,
    },
  ];

  for (const product of productData) {
    await db
      .insert(products)
      .values({ storeId, ...product })
      .onConflictDoUpdate({
        target: [products.storeId, products.slug],
        set: product,
      });
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  await bootstrap();

  if (isDemo) {
    await demo();
    console.log(`Seed (bootstrap + demo) completed for store: ${storeId}`);
  } else {
    console.log(`Seed (bootstrap) completed for store: ${storeId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
