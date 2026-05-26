import "server-only";

import { logger } from "@/lib/logger";

/**
 * Deep module: the only thing the rest of the app knows about Google Maps is
 * `getDrivingDistanceMiles`. It owns the HTTP call to the Distance Matrix API,
 * response parsing, error mapping and a single transient-failure retry.
 *
 * There is NO haversine / straight-line fallback anywhere: if Google can't
 * answer, we fail loud (`UNAVAILABLE`) rather than silently undercharge.
 */

const DISTANCE_MATRIX_URL =
  "https://maps.googleapis.com/maps/api/distancematrix/json";
const METERS_PER_MILE = 1609.344;

export type LatLng = { lat: number; lng: number };

export type DrivingDistanceResult =
  | { ok: true; miles: number }
  // ZERO_RESULTS = no road route to the destination (out of service area).
  // UNAVAILABLE = Google is unreachable / over quota / malformed (an incident).
  | { ok: false; error: "ZERO_RESULTS" | "UNAVAILABLE" };

export type GetDrivingDistanceDeps = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

type DistanceMatrixElement = {
  status?: string;
  distance?: { value?: number };
};

type DistanceMatrixResponse = {
  status?: string;
  error_message?: string;
  rows?: Array<{ elements?: DistanceMatrixElement[] }>;
};

function buildUrl(origin: LatLng, destination: LatLng, apiKey: string): string {
  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    units: "imperial",
    mode: "driving",
    key: apiKey,
  });
  return `${DISTANCE_MATRIX_URL}?${params.toString()}`;
}

/**
 * @returns `{ ok: true, miles }` on success, or a tagged error.
 * Element `ZERO_RESULTS` / `NOT_FOUND` → `ZERO_RESULTS`; everything else
 * (quota, network, 5xx, malformed, request denied) → `UNAVAILABLE`, logged at
 * error severity so ops sees the incident.
 */
export async function getDrivingDistanceMiles(
  params: { origin: LatLng; destination: LatLng },
  deps: GetDrivingDistanceDeps = {},
): Promise<DrivingDistanceResult> {
  const apiKey = deps.apiKey ?? process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    logger.error("google_maps.missing_server_key");
    return { ok: false, error: "UNAVAILABLE" };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = buildUrl(params.origin, params.destination, apiKey);

  // One retry on transient failures (network error / 5xx / UNKNOWN_ERROR).
  const first = await attempt(fetchImpl, url);
  if (first.kind === "result") return first.value;
  if (first.kind === "permanent") return first.value;

  const second = await attempt(fetchImpl, url);
  if (second.kind === "result") return second.value;
  if (second.kind === "permanent") return second.value;

  logger.error("google_maps.distance_matrix_unavailable", {
    reason: second.reason,
  });
  return { ok: false, error: "UNAVAILABLE" };
}

type Attempt =
  | { kind: "result"; value: DrivingDistanceResult }
  | { kind: "permanent"; value: DrivingDistanceResult }
  | { kind: "transient"; reason: string };

async function attempt(fetchImpl: typeof fetch, url: string): Promise<Attempt> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    return { kind: "transient", reason: "network_error" };
  }

  if (response.status >= 500) {
    return { kind: "transient", reason: `http_${response.status}` };
  }
  if (!response.ok) {
    logger.error("google_maps.distance_matrix_http_error", {
      status: response.status,
    });
    return { kind: "permanent", value: { ok: false, error: "UNAVAILABLE" } };
  }

  let body: DistanceMatrixResponse;
  try {
    body = (await response.json()) as DistanceMatrixResponse;
  } catch {
    logger.error("google_maps.distance_matrix_malformed");
    return { kind: "permanent", value: { ok: false, error: "UNAVAILABLE" } };
  }

  return interpret(body);
}

function interpret(body: DistanceMatrixResponse): Attempt {
  const topStatus = body.status;

  if (topStatus === "OVER_QUERY_LIMIT" || topStatus === "UNKNOWN_ERROR") {
    return { kind: "transient", reason: topStatus };
  }
  if (topStatus !== "OK") {
    logger.error("google_maps.distance_matrix_status", {
      status: topStatus,
      message: body.error_message,
    });
    return { kind: "permanent", value: { ok: false, error: "UNAVAILABLE" } };
  }

  const element = body.rows?.[0]?.elements?.[0];
  const elementStatus = element?.status;

  if (elementStatus === "ZERO_RESULTS" || elementStatus === "NOT_FOUND") {
    return { kind: "permanent", value: { ok: false, error: "ZERO_RESULTS" } };
  }
  if (elementStatus === "MAX_ROUTE_LENGTH_EXCEEDED") {
    // Too far to route — treat as out of service area, same as ZERO_RESULTS.
    return { kind: "permanent", value: { ok: false, error: "ZERO_RESULTS" } };
  }
  if (elementStatus !== "OK") {
    logger.error("google_maps.distance_matrix_element_status", {
      status: elementStatus,
    });
    return { kind: "permanent", value: { ok: false, error: "UNAVAILABLE" } };
  }

  const meters = element?.distance?.value;
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) {
    logger.error("google_maps.distance_matrix_missing_distance");
    return { kind: "permanent", value: { ok: false, error: "UNAVAILABLE" } };
  }

  const miles = Math.round((meters / METERS_PER_MILE) * 100) / 100;
  return { kind: "result", value: { ok: true, miles } };
}
