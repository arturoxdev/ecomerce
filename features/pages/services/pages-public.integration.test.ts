import { describe, expect, it } from "vitest";

import { schema, testDb } from "@/tests/integration/setup";

import {
  getAboutPage,
  getContactPage,
  getFaqEntries,
  getLegalDocument,
} from "./pages-public.service";

const STORE_ID = process.env.STORE_ID ?? "test-store";

describe("pages-public service — integration", () => {
  describe("getAboutPage", () => {
    it("no row for locale and no DEFAULT_LOCALE row -> source=fallback-bundled", async () => {
      // Act
      const result = await getAboutPage("es");

      // Assert
      expect(result.source).toBe("fallback-bundled");
      expect(result.data.locale).toBe("es");
    });

    it("en row exists but locale is es -> source=fallback-default-locale", async () => {
      // Arrange
      await testDb.insert(schema.aboutPageContents).values({
        storeId: STORE_ID,
        slug: "about",
        locale: "en",
        eyebrow: "Eye",
        title: "Hello",
        subtitle: "Sub",
        storyTitle: "ST",
        storyBody: "SB",
        valuesTitle: "VT",
        valuesBody: "VB",
      });

      // Act
      const result = await getAboutPage("es");

      // Assert
      expect(result.source).toBe("fallback-default-locale");
      expect(result.data.title).toBe("Hello");
      expect(result.data.locale).toBe("es");
    });

    it("row exists for requested locale -> source=db", async () => {
      // Arrange
      await testDb.insert(schema.aboutPageContents).values({
        storeId: STORE_ID,
        slug: "about",
        locale: "es",
        eyebrow: "Eye",
        title: "Hola",
        subtitle: "Sub",
        storyTitle: "ST",
        storyBody: "SB",
        valuesTitle: "VT",
        valuesBody: "VB",
      });

      // Act
      const result = await getAboutPage("es");

      // Assert
      expect(result.source).toBe("db");
      expect(result.data.title).toBe("Hola");
    });
  });

  describe("getFaqEntries", () => {
    it("no rows -> source=fallback-bundled", async () => {
      // Act
      const result = await getFaqEntries("en");

      // Assert
      expect(result.source).toBe("fallback-bundled");
      expect(result.data.length).toBeGreaterThan(0);
    });

    it("rows in 'en' only, request 'es' -> source=fallback-default-locale", async () => {
      // Arrange
      await testDb.insert(schema.faqEntries).values({
        storeId: STORE_ID,
        locale: "en",
        question: "Q",
        answer: "A",
        sortOrder: 0,
      });

      // Act
      const result = await getFaqEntries("es");

      // Assert
      expect(result.source).toBe("fallback-default-locale");
    });
  });

  describe("getLegalDocument", () => {
    it("no row -> source=fallback-bundled", async () => {
      // Act
      const result = await getLegalDocument("terms", "en");

      // Assert
      expect(result.source).toBe("fallback-bundled");
    });
  });

  describe("getContactPage", () => {
    it("no row -> source=fallback-bundled", async () => {
      // Act
      const result = await getContactPage("en");

      // Assert
      expect(result.source).toBe("fallback-bundled");
    });
  });
});
