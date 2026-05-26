"use client";

/**
 * Loads the Google Maps JS API (with the Places library) exactly once per page,
 * dependency-free. Returns a promise that resolves when `google.maps.places` is
 * ready. Safe to call repeatedly — concurrent callers share one script load.
 */

const SCRIPT_ID = "google-maps-places-js";

let loaderPromise: Promise<void> | null = null;

export function isGoogleMapsReady(): boolean {
  return typeof window !== "undefined" && Boolean(window.google?.maps?.places);
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (isGoogleMapsReady()) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("google_maps_load_failed")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Allow a later retry by clearing the cached promise.
      loaderPromise = null;
      reject(new Error("google_maps_load_failed"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
