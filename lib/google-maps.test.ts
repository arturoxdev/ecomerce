import { describe, expect, it, vi } from "vitest";

import { getDrivingDistanceMiles } from "./google-maps";

const ORIGIN = { lat: 25.6866, lng: -100.3161 };
const DESTINATION = { lat: 25.65, lng: -100.28 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function okMatrixBody(meters: number) {
  return {
    status: "OK",
    rows: [{ elements: [{ status: "OK", distance: { value: meters } }] }],
  };
}

describe("getDrivingDistanceMiles", () => {
  it("happy path -> returns miles converted from meters", async () => {
    // Arrange: 8046.72 m == exactly 5 miles
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(okMatrixBody(8046.72)));

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: true, miles: 5 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("element ZERO_RESULTS -> ZERO_RESULTS error", async () => {
    // Arrange
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        rows: [{ elements: [{ status: "ZERO_RESULTS" }] }],
      }),
    );

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: false, error: "ZERO_RESULTS" });
  });

  it("element MAX_ROUTE_LENGTH_EXCEEDED -> ZERO_RESULTS (out of area)", async () => {
    // Arrange
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        rows: [{ elements: [{ status: "MAX_ROUTE_LENGTH_EXCEEDED" }] }],
      }),
    );

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: false, error: "ZERO_RESULTS" });
  });

  it("OVER_QUERY_LIMIT -> retries once then UNAVAILABLE", async () => {
    // Arrange
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "OVER_QUERY_LIMIT" }));

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("REQUEST_DENIED (top-level) -> UNAVAILABLE without retry", async () => {
    // Arrange
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "REQUEST_DENIED" }));

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("network error -> retries once then UNAVAILABLE", async () => {
    // Arrange
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("5xx then success -> retries and returns miles", async () => {
    // Arrange
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse(okMatrixBody(16093.44)));

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: true, miles: 10 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("malformed JSON -> UNAVAILABLE", async () => {
    // Arrange
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("<<not json>>", { status: 200 }));

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "test-key", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
  });

  it("missing server key -> UNAVAILABLE without calling fetch", async () => {
    // Arrange
    const fetchImpl = vi.fn();

    // Act
    const result = await getDrivingDistanceMiles(
      { origin: ORIGIN, destination: DESTINATION },
      { apiKey: "", fetchImpl },
    );

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
