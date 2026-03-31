import bcrypt from "bcryptjs";
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import {
  aboutPageFallbacks,
  contactPageFallbacks,
  faqFallbacks,
  legalPageFallbacks,
} from "@/lib/static-pages/fallbacks";

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

async function main() {
  await db
    .insert(settings)
    .values({ id: "global" })
    .onConflictDoUpdate({ target: settings.id, set: { id: "global" } });

  const adminPassword = await bcrypt.hash("admin123", 10);
  await db
    .insert(users)
    .values({
      name: process.env.NEXT_PUBLIC_ADMIN_TITLE ?? "Admin",
      email: process.env.ADMIN_EMAIL ?? "admin@example.com",
      passwordHash: adminPassword,
      role: "ROOT",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: process.env.NEXT_PUBLIC_ADMIN_TITLE ?? "Admin", role: "ROOT", passwordHash: adminPassword },
    });

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
      .values(category)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: category.name, description: category.description },
      });
  }

  const inflables = await db.query.categories.findFirst({
    where: eq(categories.slug, "inflables"),
    columns: { id: true },
  });
  const sillas = await db.query.categories.findFirst({
    where: eq(categories.slug, "sillas"),
    columns: { id: true },
  });
  const mesas = await db.query.categories.findFirst({
    where: eq(categories.slug, "mesas"),
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
      .values(product)
      .onConflictDoUpdate({
        target: products.slug,
        set: product,
      });
  }

  for (const locale of ["en", "es"] as const) {
    const aboutContent = aboutPageFallbacks[locale];
    await db
      .insert(aboutPageContents)
      .values({
        slug: "about",
        locale,
        ...aboutContent,
      })
      .onConflictDoUpdate({
        target: [aboutPageContents.slug, aboutPageContents.locale],
        set: aboutContent,
      });

    const contactContent = contactPageFallbacks[locale];
    await db
      .insert(contactPageContents)
      .values({
        slug: "contact",
        locale,
        ...contactContent,
      })
      .onConflictDoUpdate({
        target: [contactPageContents.slug, contactPageContents.locale],
        set: contactContent,
      });

    for (const slug of ["terms", "privacy", "refund-policy"] as const) {
      const legalContent = legalPageFallbacks[slug][locale];
      await db
        .insert(legalPageDocuments)
        .values({
          slug,
          locale,
          ...legalContent,
        })
        .onConflictDoUpdate({
          target: [legalPageDocuments.slug, legalPageDocuments.locale],
          set: legalContent,
        });
    }
  }

  await db.delete(faqEntries);
  await db.insert(faqEntries).values([
    ...faqFallbacks.en,
    ...faqFallbacks.es,
  ]);

  console.log("Seed completed successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
