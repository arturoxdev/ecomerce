import { describe, expect, it } from "vitest";

import { localizedProductName, localizeProduct } from "./localize-product";

const full = {
  name: "Base para Postres",
  nameEn: "Dessert Stand",
  description: "Descripción",
  descriptionEn: "Description",
  about: "Acerca",
  aboutEn: "About",
};

describe("localizeProduct", () => {
  it("returns the Spanish copy for es", () => {
    expect(localizeProduct(full, "es")).toEqual({
      name: "Base para Postres",
      description: "Descripción",
      about: "Acerca",
    });
  });

  it("returns the English copy for en when present", () => {
    expect(localizeProduct(full, "en")).toEqual({
      name: "Dessert Stand",
      description: "Description",
      about: "About",
    });
  });

  it("falls back to Spanish field by field", () => {
    expect(
      localizeProduct({ ...full, descriptionEn: null, aboutEn: "   " }, "en"),
    ).toEqual({
      name: "Dessert Stand",
      description: "Descripción",
      about: "Acerca",
    });
  });

  it("returns null when neither language has the optional field", () => {
    expect(localizeProduct({ name: "Mesa" }, "en")).toEqual({
      name: "Mesa",
      description: null,
      about: null,
    });
  });
});

describe("localizedProductName", () => {
  it("falls back to Spanish when the English name is missing", () => {
    expect(localizedProductName({ name: "Mesa", nameEn: null }, "en")).toBe("Mesa");
    expect(localizedProductName({ name: "Mesa" }, "en")).toBe("Mesa");
  });

  it("ignores the English name for es", () => {
    expect(localizedProductName({ name: "Mesa", nameEn: "Table" }, "es")).toBe("Mesa");
  });
});
