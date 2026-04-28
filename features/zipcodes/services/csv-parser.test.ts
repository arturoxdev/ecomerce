import { describe, expect, it } from "vitest";

import { parseZipcodeCsv } from "./csv-parser";

describe("csv-parser parseZipcodeCsv", () => {
  it("valid csv with header and 3 rows -> ok with 3 rows", () => {
    // Arrange
    const csv =
      "city,zipcode,fee\nDenver,80202,0\nBoulder,80301,40\nAurora,80010,0\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual({
      city: "Denver",
      zipcode: "80202",
      fee: 0,
    });
  });

  it("same zipcode in two cities -> both persist (different keys)", () => {
    // Arrange
    const csv =
      "city,zipcode,fee\nCentennial,80111,0\nCherry Hills Village,80111,0\nGreenwood Village,80111,0\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(3);
  });

  it("internal duplicates of (city, zipcode) -> last value wins", () => {
    // Arrange
    const csv = "city,zipcode,fee\nDenver,80202,10\nDenver,80202,80\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      city: "Denver",
      zipcode: "80202",
      fee: 80,
    });
  });

  it("dedupe is case-insensitive on city", () => {
    // Arrange
    const csv = "city,zipcode,fee\nDenver,80202,10\ndenver,80202,80\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fee).toBe(80);
  });

  it("invalid header -> error with row 1", () => {
    // Arrange
    const csv = "ciudad,codigo,precio\nDenver,80202,10\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].row).toBe(1);
  });

  it("old header (zipcode,fee) -> error", () => {
    // Arrange
    const csv = "zipcode,fee\n80202,10\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(false);
  });

  it("empty file -> error row 0", () => {
    // Act
    const result = parseZipcodeCsv("");

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].row).toBe(0);
  });

  it("only header -> error", () => {
    // Act
    const result = parseZipcodeCsv("city,zipcode,fee\n");

    // Assert
    expect(result.ok).toBe(false);
  });

  it("invalid fee in row -> reports row number, no rows persisted", () => {
    // Arrange
    const csv = "city,zipcode,fee\nDenver,80202,10\nBoulder,80301,abc\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].row).toBe(3);
  });

  it("row with bad column count -> error", () => {
    // Arrange
    const csv = "city,zipcode,fee\nDenver,80202\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(false);
  });

  it("rejects zipcode with invalid format (regex)", () => {
    // Arrange
    const csv = "city,zipcode,fee\nDenver,802-02,10\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(false);
  });

  it("rejects empty city", () => {
    // Arrange
    const csv = "city,zipcode,fee\n,80202,10\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(false);
  });

  it("handles CRLF line endings", () => {
    // Arrange
    const csv = "city,zipcode,fee\r\nDenver,80202,10\r\nBoulder,80301,40\r\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
  });

  it("strips UTF-8 BOM", () => {
    // Arrange
    const csv = "﻿city,zipcode,fee\nDenver,80202,10\n";

    // Act
    const result = parseZipcodeCsv(csv);

    // Assert
    expect(result.ok).toBe(true);
  });
});
