# Fire Aware API (NestJS)

Backend API for address geocoding + wildfire lookup (NASA FIRMS).  
Addresses are normalized and cached in PostgreSQL to avoid repeated external calls.

## Features
- `POST /addresses` creates an address (DB-first cache by `addressNormalized`)
- `GET /addresses` gets addresses (DB-first pagination `limit` and `offset)
- `GET /addresses/:id` gets an address by id (DB-first address one by `id`)
- Google Geocoding integration (lat/lng + raw response stored)
- NASA FIRMS wildfire lookup (CSV parsed and stored on the address record)
- PostgreSQL + Sequelize (`sequelize-typescript`)
- Validation + consistent error responses
- Migrations and test scripts included

## Prerequisites
- Node.js 18+
- npm
- Docker (recommended for local Postgres)
- Google Geocoding API key
- NASA FIRMS MAP_KEY

## Setup

### 1) Install deps
```bash
npm install
```
### 2) Environment Variables

Create a `.env` file (or copy from `.env.example`).

- `DATABASE_URL` (recommended)

  Example: `postgres://postgres:postgres@localhost:5432/fire_aware`
- `GOOGLE_MAPS_API_KEY` 
- `FIRMS_MAP_KEY`

Optional (defaults shown):
- `PORT`=3000
- `FIRMS_SOURCE`=VIIRS_SNPP_NRT
- `FIRMS_BBOX_DELTA`=0.1

> Note: If DATABASE_URL is provided, individual DB vars are not required.


### 3) Start Postgres (Docker)
If you have `docker-compose.yml`:

```bash
$ docker compose up -d
```

(Alternative) Run a standalone container:

```bash
$ docker run -d --name fire_awaredb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fire \
  -p 5432:5432 postgres:15

```

### 4) Run Migrations
Generate a migration (when adding schema changes) or run existing migrations:

```bash
./node_modules/.bin/sequelize-cli db:migrate --config sequelize.config.js
```

## API

### POST/addresses

#### Body
```bash
{ "address": "1600 Amphitheatre Parkway, Mountain View, CA" }
```

#### Responses
- `200 OK` returns the address record (includes geocode + wildfire fields)
- `400 Bad Request` invalid payload (missing/empty address)
- `422 Unprocessable Entity` address could not be geocoded
- `502 Bad Gateway` external dependency failure (Google or FIRMS)


Response example:
```json
{
  "id": "0ffae53f-f5c6-4e14-8b51-8d5148fb11b3",
  "address": "3327 20th Street, San Francisco, CA",
  "addressNormalized": "3327 20th street, san francisco, ca",
  "latitude": 37.7587473,
  "longitude": -122.415302,
  "geocodeRaw": {
    "status": "OK",
    "results": [
      {
        "types": [
          "... truncated for brevity ..."        
        ],
        "address_components": ["...truncated for brevity..."]
      }
    ]
  },
  "wildfireData": {
    "bbox": "",
    "count": 0,
    "records": [],
    "rangeDays": 7
  },
  "updatedAt": "2026-01-26T20:22:52.457Z",
  "createdAt": "2026-01-26T20:22:52.457Z",
  "wildfireFetchedAt": null
}
```

### GET /addresses

Query params:
- `limit` (default 20, max 100)
- `offset` (default 0)

Response example:
```json
{
  "total": 1,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "4c814044-ea93-481e-8a93-ee180e58a68a",
      "address": "1600 Amphitheatre Parkway, Mountain View, CA",
      "latitude": 0,
      "longitude": 0
    }
  ]
}
```

### GET /addresses/:id

Fetch a single address by id.

Responses

- `200 OK` record found
- `404 Not Found` no record exists

Response example:
```json
{
  "id": "0ffae53f-f5c6-4e14-8b51-8d5148fb11b3",
  "address": "3327 20th Street, San Francisco, CA",
  "latitude": 37.7587473,
  "longitude": -122.415302,
  "wildfireData": {
    "bbox": "",
    "count": 0,
    "records": [],
    "rangeDays": 7
  }
}
```

### Caching behavior

- The API normalizes the incoming address and checks the DB first (`addressNormalized` is UNIQUE).
- Cache hit: returns stored record without calling external services.
- Cache miss: calls Google Geocoding + FIRMS, persists results, and returns the record.

## Tests

```bash
$ npm run test
$ npm run test:e2e
$ npm run test:cov
```
## Key files

- `src/addresses/addresses.controller.ts` — endpoints + request validation
- `src/addresses/addresses.service.ts` — business logic + external integrations
- `src/database/migrations` — Sequelize migrations
- `sequelize.config.js` — Sequelize CLI config

## API Overview

- `POST /addresses` — create a new address
  - Body: `{ "address": "1600 Amphitheatre Parkway, Mountain View, CA" }`
  - Validates the payload and returns `400 Bad Request` for missing/empty address.
  - On success returns the created address record (including geocode and wildfire data).

- `GET /addresses` — list addresses with pagination
  - Query params: `limit, offset`
  - Defaults: `limit=20` (max 100), `offset=0`
- `GET /addresses/:id` — fetch an address by id
  - Validates `id` param and returns `400 Bad Request` when missing/invalid.
  - Returns `404 Not Found` when no record exists for the given id.

## Important Files
- `src/addresses/addresses.controller.ts` — HTTP endpoints and validation/logging
- `src/addresses/addresses.service.ts` — main business logic (create, find, fetch external APIs)
- `src/database/migrations` — Sequelize migrations
- `sequelize.config.js` — Sequelize CLI configuration

## Logging and Errors

- Controller methods validate inputs and log errors before rethrowing.
- Service methods perform runtime checks (for example: confirming records were created and have an `id`) and throw `InternalServerErrorException` on unexpected failures.
- Not found and validation cases use `NotFoundException` and `BadRequestException` accordingly.

## Optional: Background Job (Wildfire Refresh)

This project includes an optional scheduled background job that periodically refreshes wildfire data for stored addresses.

### Overview
- Implemented using `@nestjs/schedule` and a cron-based job.
- Runs automatically while the application is running.
- Refreshes wildfire data for addresses whose data is considered stale.

### Behavior
- Runs every **6 hours**.
- Selects addresses where:
  - `wildfireFetchedAt` is `NULL`, or
  - `wildfireFetchedAt` is older than a configurable threshold.
- Processes addresses in **small batches** to limit external API usage.
- Updates `wildfireData` and `wildfireFetchedAt` per address.
- Logs failures per address without stopping the entire job.

### Configuration
The job can be tuned using the following environment variables:

```env
WILDFIRE_REFRESH_STALE_HOURS=24   # default: 24
WILDFIRE_REFRESH_BATCH_SIZE=25   # default: 25
```

## Debugging & Development tips

- Use `npm run start:dev` for automatic restarts.
- Check logs for detailed context when external API calls fail (Google Geocoding or FIRMS).
- When throwing exceptions inside a `try` block, ensure you don't immediately catch them locally — perform service call, handle errors, then run existence checks outside the `try` to avoid "throw of exception caught locally" warnings.

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
# fire-aware
