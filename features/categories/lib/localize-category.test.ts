import { describe, expect, it } from "vitest";

import { localizeCategory, localizedCategoryName } from "./localize-category";

const translated = {
  name: "Sillas",
  nameEn: "Chairs",
  description: "Todo tipo de sillas",
  descriptionEn: "All kinds of chairs",
};

describe("localize-category", () => {
  it("es -> always the Spanish copy", () => {
    expect(localizeCategory(translated, "es")).toEqual({
      name: "Sillas",
      description: "Todo tipo de sillas",
    });
  });

  it("en with translation -> English copy", () => {
    expect(localizeCategory(translated, "en")).toEqual({
      name: "Chairs",
      description: "All kinds of chairs",
    });
  });

  it("en without translation -> falls back to Spanish", () => {
    expect(
      localizeCategory(
        { name: "Sillas", nameEn: null, description: "Todo tipo de sillas" },
        "en",
      ),
    ).toEqual({ name: "Sillas", description: "Todo tipo de sillas" });
  });

  it("en -> falls back field by field", () => {
    expect(
      localizeCategory(
        { ...translated, descriptionEn: null },
        "en",
      ),
    ).toEqual({ name: "Chairs", description: "Todo tipo de sillas" });
  });

  it("blank English name -> treated as missing", () => {
    expect(localizedCategoryName({ name: "Sillas", nameEn: "   " }, "en")).toBe(
      "Sillas",
    );
  });

  it("no description in either language -> null", () => {
    expect(localizeCategory({ name: "Sillas" }, "en").description).toBeNull();
  });
});
