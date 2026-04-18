import { describe, expect, it } from "vitest";

import { cn, toSlug } from "./utils";

describe("utils", () => {
  describe("toSlug", () => {
    it("plain lowercase words with spaces -> single dash separator", () => {
      // Arrange
      const input = "hello world";

      // Act
      const result = toSlug(input);

      // Assert
      expect(result).toBe("hello-world");
    });

    it("accented characters -> stripped to ASCII", () => {
      // Arrange
      const input = "Renta de Sillas Árboles Ñame";

      // Act
      const result = toSlug(input);

      // Assert
      expect(result).toBe("renta-de-sillas-arboles-name");
    });

    it("uppercase and extra whitespace -> trimmed and lowercased", () => {
      // Arrange
      const input = "   PRODUCT   Name   ";

      // Act
      const result = toSlug(input);

      // Assert
      expect(result).toBe("product-name");
    });

    it("special characters -> removed completely", () => {
      // Arrange
      const input = "café & deli #1!";

      // Act
      const result = toSlug(input);

      // Assert
      expect(result).toBe("cafe-deli-1");
    });

    it("consecutive separators -> collapsed to a single dash", () => {
      // Arrange
      const input = "foo   bar---baz";

      // Act
      const result = toSlug(input);

      // Assert
      expect(result).toBe("foo-bar-baz");
    });

    it("leading and trailing dashes -> stripped", () => {
      // Arrange
      const input = "--hello--";

      // Act
      const result = toSlug(input);

      // Assert
      expect(result).toBe("hello");
    });

    it("empty string -> empty string", () => {
      // Arrange
      const input = "";

      // Act
      const result = toSlug(input);

      // Assert
      expect(result).toBe("");
    });
  });

  describe("cn", () => {
    it("falsy values and dedup -> merged tailwind classes", () => {
      // Arrange / Act
      const result = cn("p-2", false && "hidden", undefined, "p-4");

      // Assert — twMerge keeps the later p-* that wins
      expect(result).toBe("p-4");
    });
  });
});
