import { describe, expect, it } from "vitest";

import {
  getStaticPageDefinition,
  isLegalPageSlug,
  isStaticPageSlug,
  staticPageCatalog,
} from "./pages-catalog.service";

describe("pages-catalog service", () => {
  describe("isStaticPageSlug", () => {
    it("about -> true", () => {
      expect(isStaticPageSlug("about")).toBe(true);
    });

    it("faq -> true", () => {
      expect(isStaticPageSlug("faq")).toBe(true);
    });

    it("unknown slug -> false", () => {
      expect(isStaticPageSlug("does-not-exist")).toBe(false);
    });
  });

  describe("isLegalPageSlug", () => {
    it("terms -> true (markdown editor type)", () => {
      expect(isLegalPageSlug("terms")).toBe(true);
    });

    it("privacy -> true", () => {
      expect(isLegalPageSlug("privacy")).toBe(true);
    });

    it("refund-policy -> true", () => {
      expect(isLegalPageSlug("refund-policy")).toBe(true);
    });

    it("about -> false (not markdown editor)", () => {
      expect(isLegalPageSlug("about")).toBe(false);
    });

    it("contact -> false", () => {
      expect(isLegalPageSlug("contact")).toBe(false);
    });

    it("faq -> false", () => {
      expect(isLegalPageSlug("faq")).toBe(false);
    });
  });

  describe("getStaticPageDefinition", () => {
    it("existing slug -> returns matching definition", () => {
      // Act
      const definition = getStaticPageDefinition("about");

      // Assert
      expect(definition).toBeDefined();
      expect(definition?.editorType).toBe("about");
    });

    it("unknown slug -> returns undefined", () => {
      expect(getStaticPageDefinition("nope")).toBeUndefined();
    });
  });

  describe("catalog consistency", () => {
    it("every catalog entry -> passes isStaticPageSlug", () => {
      for (const page of staticPageCatalog) {
        expect(isStaticPageSlug(page.slug)).toBe(true);
      }
    });
  });
});
