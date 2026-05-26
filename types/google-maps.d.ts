// Minimal ambient declarations for the slice of the Google Maps JS + Places API
// the app actually uses (classic `places.Autocomplete`). Avoids pulling the full
// `@types/google.maps` dependency for a handful of members.

export {};

declare global {
  namespace google.maps {
    interface MapsEventListener {
      remove(): void;
    }

    namespace event {
      function clearInstanceListeners(instance: object): void;
    }

    namespace places {
      interface ComponentRestrictions {
        country: string | string[];
      }

      interface AutocompleteOptions {
        fields?: string[];
        types?: string[];
        componentRestrictions?: ComponentRestrictions;
      }

      interface PlaceGeometry {
        location?: { lat(): number; lng(): number };
      }

      interface PlaceResult {
        formatted_address?: string;
        name?: string;
        geometry?: PlaceGeometry;
      }

      class Autocomplete {
        constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: () => void): MapsEventListener;
        getPlace(): PlaceResult;
      }
    }
  }

  interface Window {
    google?: typeof google;
  }
}
