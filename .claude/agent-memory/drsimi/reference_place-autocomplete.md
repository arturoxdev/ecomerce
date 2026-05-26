---
name: reference-place-autocomplete
description: PlaceAutocomplete es un componente compartido único que alimenta tanto el carrito (destino cliente) como el admin (origen de operaciones).
metadata:
  type: reference
---

`components/maps/place-autocomplete.tsx` es el único componente de autocompletado de direcciones. Lo consumen:
- Admin: `features/delivery-pricing/components/origin-form.tsx` (Origen de operaciones, página `/admin/settings/delivery`).
- Cliente: `features/cart/components/cart-page-client.tsx` (Dirección de entrega, solo cuando `isDistanceMode`).

El cargador del SDK es `components/maps/load-google-maps.ts` (carga el script una sola vez por página, con `libraries=places&loading=async`).

**How to apply:** cualquier cambio o bug en el autocompletado afecta ambos lugares a la vez. Relacionado con [[project-google-maps-places]].
