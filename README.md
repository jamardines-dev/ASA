# ASA PH — Area Safety Alert

An ashfall area safety map for Cebu. Users see which areas are safe, caution, or unsafe on a live map, check their own location, and get face mask guidance (N95/KN95 required in unsafe areas). Built in response to the July 9, 2026 Kanlaon eruption ashfall.

## Stack

- **Backend** — Java 17, Spring Boot 3, Spring Data JPA, Spring Cache. H2 in-memory database for zero-setup dev; PostgreSQL profile included for production.
- **Frontend** — React 18 + TypeScript + Vite, Leaflet (react-leaflet) with OpenStreetMap tiles.

## Quick start

### 1. Backend

Requires Java 17+ and Maven.

```bash
cd backend
mvn spring-boot:run
```

Runs on http://localhost:8080 and seeds all 53 Cebu province cities/municipalities with statuses based on the July 9 advisories.

### 2. Frontend

Requires Node 18+.

```bash
cd frontend
npm install
npm run dev
```

Opens on http://localhost:5173. Vite proxies `/api` to the backend, so no CORS issues in dev.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/areas/status` | All areas with effective status, mask guidance, and recent crowd report counts. Cached; the map loads from this single call. |
| GET | `/api/safety-check?lat=&lng=` | Resolves coordinates to the nearest tracked area and returns status, mask guidance, and safety advice. |
| POST | `/api/reports` | Submit a crowdsourced ash sighting: `{ "latitude": 10.31, "longitude": 123.88, "note": "heavy ash on cars" }` |
| PUT | `/api/admin/areas/{id}/status` | Set an area's base status from an official advisory: `{ "status": "UNSAFE", "source": "PHIVOLCS bulletin" }` |

## How status is decided

Each area has a **base status** set from official advisories (via the admin endpoint). Crowdsourced reports can **escalate** it, never de-escalate:

- 3+ reports within 8 km of an area in the last 3 hours bumps SAFE → CAUTION or CAUTION → UNSAFE.
- Reports older than 3 hours stop counting, so areas de-escalate naturally once sightings stop and an admin lowers the base status.

Mask guidance follows status:

| Status | Mask guidance |
|---|---|
| SAFE | Not required |
| CAUTION | Recommended when outdoors |
| UNSAFE | N95 or KN95 required outdoors |

## Production notes

- **PostgreSQL**: run with `SPRING_PROFILES_ACTIVE=prod` and set `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`. Create the schema first (`ddl-auto: validate` in prod).
- **Redis cache**: the service uses Spring Cache with the default in-memory manager. To swap to Redis, add `spring-boot-starter-data-redis` and set `spring.cache.type=redis` — no code changes needed since it's behind `@Cacheable`.
- **Security**: `/api/admin/**` is unprotected in this starter. Add Spring Security with a JWT or basic-auth admin role before deploying (same pattern as UniDevs).
- **Rate limiting reports**: consider limiting POST `/api/reports` per IP to prevent spam skewing statuses.

## Roadmap ideas

- Report submission UI (long-press on the map to drop a report pin)
- IDW interpolation of report density for smooth ash-intensity zones instead of hard radius checks (reuse the ResiliNav approach)
- Push notifications when a user's saved area changes status
- Wind direction overlay from PAGASA data to predict spread
