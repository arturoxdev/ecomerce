import { describe, expect, it } from "vitest";

import {
  getObjectKeyFromPublicMediaUrl,
  getPublicMediaUrlPrefix,
} from "@/lib/services/media-url.service";

describe("media url service", () => {
  describe("public media prefixes", () => {
    it("public URL without trailing slash -> appends slash", () => {
      // Arrange
      const publicUrl = "https://cdn.example.com";

      // Act
      const result = getPublicMediaUrlPrefix(publicUrl);

      // Assert
      expect(result).toBe("https://cdn.example.com/");
    });
  });

  describe("public media object keys", () => {
    it("URL from same bucket prefix -> returns object key", () => {
      // Arrange
      const publicUrl = "https://cdn.example.com";
      const url = "https://cdn.example.com/store-1/products/file.png";

      // Act
      const result = getObjectKeyFromPublicMediaUrl(url, publicUrl);

      // Assert
      expect(result).toBe("store-1/products/file.png");
    });

    it("URL outside bucket prefix -> returns null", () => {
      // Arrange
      const publicUrl = "https://cdn.example.com";
      const url = "https://other.example.com/store-1/products/file.png";

      // Act
      const result = getObjectKeyFromPublicMediaUrl(url, publicUrl);

      // Assert
      expect(result).toBe(null);
    });
  });
});
