# Architecture & Implementation Notes

This document describes key architectural and implementation decisions made for this API.
It is intended to provide context beyond the main README.

---

## Framework Choice

The API is built with **NestJS** using TypeScript, following a modular, dependency-injection–driven architecture.

Key NestJS features used:
- Feature modules (`AddressesModule`, `JobsModule`)
- Dependency Injection for services and integrations
- Global validation and exception handling
- Scheduled background jobs via `@nestjs/schedule`

---

## Application Structure

The application is organized by feature rather than by layer:

src/
addresses/
addresses.controller.ts
addresses.service.ts
addresses.module.ts
address.model.ts
integrations/
google/
firms/
jobs/
wildfire-refresh.job.ts
jobs.module.ts
common/
filters/


This keeps domain logic cohesive and minimizes cross-module coupling.

---

## Database Design & ORM Usage

A single `addresses` table is used to store:
- The raw address input
- A normalized address form
- Geocoding results
- Wildfire data
- Metadata timestamps

Design considerations:
- `addressNormalized` is **UNIQUE** to prevent duplicates and enable DB-first caching
- External API responses are stored as `JSONB` to preserve raw data without over-modeling
- Sequelize (with `sequelize-typescript`) is used for:
    - Model definitions
    - Migrations
    - Querying with filters, ordering, pagination

The design intentionally favors simplicity over premature normalization.

---

## Address Normalization & Caching

Addresses are validated and normalized before any database lookup.

Flow:
1. Validate input
2. Normalize address
3. Check database for existing record
4. If found → return cached result
5. If not found → call external APIs and persist result

This avoids unnecessary calls to Google Geocoding and FIRMS APIs.

---

## External Integrations

### Google Geocoding
- Used to resolve latitude/longitude
- Input validation and coordinate sanity checks are enforced
- Non-geocodable addresses return a `422 Unprocessable Entity`

### NASA FIRMS
- Used to fetch wildfire data near an address
- API limitations are handled by splitting requests into supported ranges
- CSV responses are parsed and normalized into structured records

---

## Background Job (Optional Improvement)

A scheduled background job periodically refreshes wildfire data for stored addresses.

- Implemented using `@nestjs/schedule`
- Runs every 6 hours
- Refreshes addresses with stale wildfire data
- Processes records in small batches
- Logs failures without stopping the entire job

Queues were intentionally avoided to keep the scope appropriate for the challenge.

---

## Error Handling

The API differentiates between:
- Client input errors (`400`, `422`)
- External service failures (`502`)
- Internal configuration issues (`500`)

Errors are logged with contextual information while returning consistent HTTP responses.

---

## Testing Strategy

- Unit tests focus on service logic and edge cases
- External integrations are mocked
- End-to-end tests are optional and omitted to keep scope focused

---

## Summary

This implementation prioritizes:
- Clear separation of concerns
- Practical database design
- Defensive error handling
- Minimal but effective use of NestJS features

The goal is a maintainable, readable solution rather than maximal complexity.
