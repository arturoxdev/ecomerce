---
name: project-google-maps-places
description: El autocompletado de direcciones depende de la Places API legacy de Google, que suele no estar habilitada en el proyecto de Google Cloud — punto frágil recurrente.
metadata:
  type: project
---

El feature DISTANCE_MILES (rama feat/distance-miles-delivery) usa autocompletado de direcciones vía Google Maps JS API.

**Punto frágil:** `components/maps/place-autocomplete.tsx` instancia `new window.google.maps.places.Autocomplete(...)`, que es el widget **legacy** de Places y consume la **Places API (legacy)** en el backend de Google. Si en Google Cloud Console solo está habilitada **Places API (New)** y NO la legacy, el widget carga el script JS correctamente pero NO devuelve sugerencias. Google responde `REQUEST_DENIED` con "You're calling a legacy API, which is not enabled for your project".

**Cómo distinguirlo rápido (sin navegador):**
- `curl "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=av&key=KEY"` → si da `REQUEST_DENIED` legacy, la legacy está deshabilitada.
- `curl -X POST "https://places.googleapis.com/v1/places:autocomplete" -H "X-Goog-Api-Key: KEY" -d '{"input":"av"}'` → si devuelve suggestions, la New sí está habilitada.

**Why:** la key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env`) puede ser perfectamente válida y aun así fallar el autocomplete, porque el problema no es la key sino qué API está habilitada en el proyecto de GCP.

**How to apply:** ante "no salen sugerencias de direcciones", primero descartar key faltante; si la key existe, sospechar de la API legacy vs New antes que de red/CORS. El doc `docs/google-maps-setup.md` instruye habilitar "Places API" (legacy) — verificar si en GCP se habilitó la New en su lugar.
