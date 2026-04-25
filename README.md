# Glide — accessible routes for Amsterdam

Wheelchair-aware route planner with AI-assisted obstacle reporting.
Single repository, two npm projects:

```
glide/
├── src/                # Vite + React frontend (port 5173)
├── server/             # Next.js backend  (port 3000)
│   ├── app/api/        #   route handlers: /route, /geocode, /obstacles, /reports, /panorama
│   ├── lib/            #   ORS client, accessibility scoring, Claude classifier
│   └── scripts/        #   Python explorer + crowdsourced reports.json
└── package.json        # root — concurrently runs both
```

## First-time setup

```sh
npm run install:all          # installs deps for both client and server
cp .env.example .env.local   # add VITE_MAPBOX_TOKEN
cp server/.env.example server/.env.local   # add ORS_API_KEY + ANTHROPIC_API_KEY
```

Required keys:

- **`VITE_MAPBOX_TOKEN`** — public Mapbox token, [signup](https://account.mapbox.com)
- **`ORS_API_KEY`** — OpenRouteService, [signup](https://openrouteservice.org/dev/#/signup)
- **`ANTHROPIC_API_KEY`** — Claude API, [console](https://console.anthropic.com)

## Run everything

```sh
npm run dev
```

Starts both servers in parallel (color-coded logs):

- **client** → http://localhost:5173 — the user-facing app
- **server** → http://localhost:3000 — API only; Vite proxies `/api/*` to it

Stop with Ctrl-C; `concurrently` shuts both down.

## Run one at a time

```sh
npm run dev:client   # frontend only
npm run dev:server   # backend only
```

## Backend endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/route` | Wheelchair-accessible route planning, returns up to 3 alternatives |
| `GET`  | `/api/geocode?q=…` | Address → lat/lng, biased to Amsterdam |
| `GET`  | `/api/obstacles?osm=1` | Crowdsourced reports + WIOR construction (+ optional OSM permanent layer) |
| `POST` | `/api/reports` | `action: "classify"` → Claude vision classification; `action: "save"` → append to reports.json |
| `GET`  | `/api/panorama` | Amsterdam street-view panorama lookup |

## Optional: validate hotspots offline

```sh
cd server
python3 scripts/explore_amsterdam.py centrum
open scripts/output/map.html
```

Renders OSM permanent obstacles, live WIOR construction, and crowdsourced reports for the chosen Amsterdam neighborhood as a Folium map. Useful for picking demo routes that have visible accessibility issues.
