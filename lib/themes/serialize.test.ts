import { describe, expect, it } from "vitest";

import { serializeTheme, serializeVars } from "./serialize";
import type { Theme, ThemeVars } from "./types";

describe("theme serialize", () => {
  describe("serializeVars", () => {
    it("empty vars -> empty string", () => {
      expect(serializeVars({})).toBe("");
    });

    it("multiple vars -> concatenated key:value; pairs", () => {
      // Arrange
      const vars: ThemeVars = {
        "--primary": "oklch(0.7 0.2 30)",
        "--radius": "0.5rem",
      };

      // Act
      const result = serializeVars(vars);

      // Assert
      expect(result).toBe("--primary:oklch(0.7 0.2 30);--radius:0.5rem;");
    });
  });

  describe("serializeTheme", () => {
    it("theme with vars -> :root{...} block", () => {
      // Arrange
      const theme: Theme = {
        id: "demo",
        name: "Demo",
        vars: { "--foo": "1px", "--bar": "red" },
      };

      // Act
      const result = serializeTheme(theme);

      // Assert
      expect(result).toBe(":root{--foo:1px;--bar:red;}");
    });
  });
});
