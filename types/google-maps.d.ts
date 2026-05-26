// Minimal ambient declarations for the slice of the Google Maps JS + Places API
// (New) the app actually uses: `AutocompleteSuggestion.fetchAutocompleteSuggestions`,
// `AutocompleteSessionToken`, `PlacePrediction.toPlace()` and `Place.fetchFields`.
// Avoids pulling the full `@types/google.maps` dependency for a handful of members.

export {};

declare global {
  namespace google.maps {
    // Subset of LatLng returned by `Place.location`.
    interface LatLngLike {
      lat(): number;
      lng(): number;
    }

    namespace places {
      // Opaque token that groups per-keystroke autocomplete calls + the final
      // details fetch into a single billable session.
      class AutocompleteSessionToken {}

      interface AutocompleteRequest {
        input: string;
        sessionToken?: AutocompleteSessionToken;
        /** CLDR region codes (lowercase ISO 3166-1), e.g. ["us", "mx"]. */
        includedRegionCodes?: string[];
        includedPrimaryTypes?: string[];
        language?: string;
        region?: string;
      }

      // `FormattableText` — only `toString()` is needed here.
      interface FormattableText {
        toString(): string;
      }

      interface FetchFieldsRequest {
        fields: string[];
      }

      class Place {
        formattedAddress?: string | null;
        displayName?: string | null;
        location?: LatLngLike | null;
        fetchFields(request: FetchFieldsRequest): Promise<{ place: Place }>;
      }

      interface PlacePrediction {
        placeId: string;
        text: FormattableText;
        mainText?: FormattableText | null;
        secondaryText?: FormattableText | null;
        toPlace(): Place;
      }

      class AutocompleteSuggestion {
        placePrediction: PlacePrediction | null;
        static fetchAutocompleteSuggestions(
          request: AutocompleteRequest,
        ): Promise<{ suggestions: AutocompleteSuggestion[] }>;
      }
    }
  }

  interface Window {
    google?: typeof google;
  }
}
