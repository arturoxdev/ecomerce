import { CSV_HEADER, csvRowSchema, ZIPCODE_REGEX } from "./zipcodes-admin.schemas";

export type CsvRowError = {
  row: number;
  city?: string;
  zipcode?: string;
  error: string;
};

export type ParsedCsvRow = { city: string; zipcode: string; fee: number };

export type CsvParseSuccess = {
  ok: true;
  rows: ParsedCsvRow[];
};

export type CsvParseFailure = {
  ok: false;
  errors: CsvRowError[];
};

export type CsvParseResult = CsvParseSuccess | CsvParseFailure;

function splitLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

function dedupeKey(city: string, zipcode: string): string {
  return `${city.toLowerCase()}|${zipcode}`;
}

export function parseZipcodeCsv(text: string): CsvParseResult {
  const normalized = text.replace(/﻿/g, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      errors: [{ row: 0, error: "El archivo está vacío" }],
    };
  }

  const header = lines[0].toLowerCase();
  if (header.replace(/\s+/g, "") !== CSV_HEADER) {
    return {
      ok: false,
      errors: [
        { row: 1, error: `Header inválido, esperado "${CSV_HEADER}"` },
      ],
    };
  }

  const dataLines = lines.slice(1);
  if (dataLines.length === 0) {
    return {
      ok: false,
      errors: [{ row: 1, error: "El archivo no contiene filas de datos" }],
    };
  }

  const errors: CsvRowError[] = [];
  const dedupe = new Map<string, ParsedCsvRow>();

  dataLines.forEach((line, index) => {
    const rowNumber = index + 2; // header is row 1
    const cells = splitLine(line);
    if (cells.length !== 3) {
      errors.push({
        row: rowNumber,
        error: "Cada fila debe tener exactamente 3 columnas (city, zipcode, fee)",
      });
      return;
    }

    const [rawCity, rawZip, rawFee] = cells;
    const parsed = csvRowSchema.safeParse({
      city: rawCity,
      zipcode: rawZip,
      fee: rawFee,
    });
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        city: rawCity,
        zipcode: rawZip,
        error: parsed.error.issues[0]?.message ?? "Fila inválida",
      });
      return;
    }

    if (!ZIPCODE_REGEX.test(parsed.data.zipcode)) {
      errors.push({
        row: rowNumber,
        city: rawCity,
        zipcode: rawZip,
        error: "Zipcode debe ser alfanumérico de 1 a 8 caracteres",
      });
      return;
    }

    dedupe.set(dedupeKey(parsed.data.city, parsed.data.zipcode), parsed.data);
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    rows: Array.from(dedupe.values()),
  };
}
