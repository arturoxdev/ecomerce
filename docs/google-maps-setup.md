# Infraestructura Google Maps — Delivery por distancia (`DISTANCE_MILES`)

Guía para dejar lista la infraestructura de Google que necesita el modo de delivery
`DISTANCE_MILES`. Al terminar tendrás **2 API keys** y **3 APIs habilitadas**.

## Qué vamos a crear

| Recurso | Para qué |
|---------|----------|
| **Maps JavaScript API** | Carga el widget de autocompletado en el navegador |
| **Places API (New)** | Sugerencias de direcciones (autocomplete) |
| **Distance Matrix API** | Millas reales por carretera (origen → destino), **solo server** |
| **Llave pública** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) | Navegador, restringida por dominio |
| **Llave servidor** (`GOOGLE_MAPS_SERVER_API_KEY`) | Backend, restringida solo a Distance Matrix |

> Dos llaves separadas = puedes rotar y restringir cada una por su cuenta. Si una se
> filtra, la superficie de abuso es chica.

---

## Paso a paso (Google Cloud Console)

### 1. Proyecto + facturación

1. Entra a <https://console.cloud.google.com/> y crea un proyecto (ej. `ecommerce-prod`).
2. **Billing → Link a billing account.** Google Maps **no funciona sin facturación activa**
   (aunque tiene capa gratuita mensual).

### 2. Alerta de presupuesto ($50/mes)

`Billing → Budgets & alerts → Create budget`:

- Monto: **$50 USD/mes**.
- Alertas al **50% / 90% / 100%**, con email a tu correo.

> El ticket exige una alerta de billing separada para detectar sorpresas de costo rápido.

### 3. Habilitar las 3 APIs

`APIs & Services → Library`, busca y dale **Enable** a cada una:

maps-api: AIzaSyBsZJe6LdEn4BiuvyM6QHXyVZix7NWAdao

- ✅ **Maps JavaScript API**
- ✅ **Places API (New)**
- ✅ **Distance Matrix API**

> ⚠️ Habilita **Places API (New)**, no la "Places API" legacy. El autocompletado
> del navegador usa la New (`AutocompleteSuggestion` / `Place`); la legacy te
> devolvería `REQUEST_DENIED` y no saldrían sugerencias.

### 4. Crear la llave PÚBLICA (navegador)

`APIs & Services → Credentials → Create credentials → API key`.

1. Renómbrala a `maps-public` para identificarla.
2. **Application restrictions → Websites (HTTP referrers).** Agrega:
   ```
   https://TU-DOMINIO.com/*
   https://*.TU-DOMINIO.com/*
   http://localhost:3000/*        ← solo para desarrollo local
   ```
3. **API restrictions → Restrict key →** marca solo:
   - Maps JavaScript API
   - Places API (New)
4. Guarda y **copia la llave** → va en `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

> Esta llave viaja al navegador (es pública). La restricción por referer evita que otro
> sitio gaste tu cuota.

### 5. Crear la llave de SERVIDOR

`Create credentials → API key` otra vez.

1. Renómbrala a `maps-server`.
2. **Application restrictions → None.**
   (Vercel usa IPs dinámicas, así que no se puede restringir por IP de forma fiable;
   la protección real es la restricción por API del siguiente punto.)
3. **API restrictions → Restrict key →** marca **solo**:
   - Distance Matrix API
4. Guarda y **copia la llave** → va en `GOOGLE_MAPS_SERVER_API_KEY`.

> Esta llave nunca sale del backend. Aunque se filtrara, solo sirve para Distance Matrix.

---

## Variables de entorno

### Local (`.env`)

Agrega estas dos líneas a tu `.env`:

```bash
# Google Maps — delivery por distancia
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIza...llave-publica"
GOOGLE_MAPS_SERVER_API_KEY="AIza...llave-servidor"
```

> `NEXT_PUBLIC_APP_URL` ya existe en el proyecto; asegúrate de que apunte a tu dominio
> para que coincida con la restricción por referer de la llave pública.

### Producción (Vercel)

`Project → Settings → Environment Variables`, agrega ambas para **Production** (y
**Preview** si quieres probar en deploys de PR):

| Variable | Valor | Entorno |
|----------|-------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | llave pública | Production / Preview |
| `GOOGLE_MAPS_SERVER_API_KEY` | llave servidor | Production / Preview |

> Configúralas **antes** del primer deploy que active el modo `DISTANCE_MILES`.
> Si usas dominios distintos en Preview, agrega esos referers a la llave pública.

---

## Checklist de verificación

- [ ] Facturación activa en el proyecto.
- [ ] Alerta de presupuesto en **$50/mes** con email.
- [ ] 3 APIs habilitadas (Maps JavaScript, Places API (New), Distance Matrix).
- [ ] Llave pública restringida **por referer** a tu dominio + `localhost` en dev.
- [ ] Llave pública limitada a **Maps JavaScript API + Places API (New)**.
- [ ] Llave servidor restringida **solo a Distance Matrix API**.
- [ ] Las 2 variables en `.env` local y en Vercel (Production).
- [ ] `NEXT_PUBLIC_APP_URL` coincide con el dominio del referer.

---

## Notas

- **Costo:** Google Maps tiene capa gratuita mensual. Cada cotización hace 1 llamada a
  Distance Matrix; el proyecto cachea las millas por par (origen, destino) durante 30 días,
  así que clientes recurrentes y zonas densas no vuelven a pagar la llamada.
- **No mezcles llaves:** la pública nunca debe tener acceso a Distance Matrix; la de
  servidor nunca debe ir a una variable `NEXT_PUBLIC_*` (terminaría en el navegador).
