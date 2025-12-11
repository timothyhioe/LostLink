# Testing Guide

Instructions for running the test suite locally. Tests currently live in `backend/tests` and use Vitest with Supertest against the Express app.

## Prerequisites

- Node.js (v20+ recommended) and npm
- Docker and Docker Compose
- A local PostgreSQL instance with PostGIS (do **not** point at the Neon cloud database)

## Quick Start

The easiest way to run tests is using the PostgreSQL container defined in `docker-compose.yml`:

### 1. Start the test database

From the project root:

```bash
docker compose up -d postgres
```

This starts a PostGIS-enabled PostgreSQL container with:

- **Host:** `localhost`
- **Port:** `5433` (mapped from container's 5432)
- **User:** `lostlink_test`
- **Password:** `test_password`
- **Database:** `lostlink_test`

Wait for the container to be healthy:

```bash
docker compose ps
# Should show: lostlink-postgres-1 ... (healthy)
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Configure the test database URL

**Option A:** Set the environment variable inline when running tests:

```bash
TEST_DATABASE_URL="postgresql://lostlink_test:test_password@localhost:5433/lostlink_test" npm test
```

**Option B (recommended):** Add to your `backend/.env` file:

```env
TEST_DATABASE_URL=postgresql://lostlink_test:test_password@localhost:5433/lostlink_test
```

Then simply run:

```bash
npm test
```

> **Note:** The tests will refuse to run if the database URL contains `neon.tech` to prevent accidentally hitting production.

### 4. Run the tests

```bash
npm test
```

Expected output:

```
 ✓ tests/auth.integration.test.ts (13 tests) 3699ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
```

## Useful Commands

| Command                                      | Description               |
| -------------------------------------------- | ------------------------- |
| `npm test`                                   | Run all tests once        |
| `npm test -- tests/auth.integration.test.ts` | Run a specific test file  |
| `npx vitest`                                 | Run tests in watch mode   |
| `npx vitest --ui`                            | Open Vitest UI in browser |

## Stopping the Test Database

When you're done testing:

```bash
docker compose stop postgres
```

To completely remove the container and its data:

```bash
docker compose down -v postgres
```

## Troubleshooting

### Tests timeout in `beforeAll`

- **Cause:** The test database is not running or not reachable.
- **Fix:** Ensure the postgres container is running with `docker compose up -d postgres` and check it's healthy with `docker compose ps`.

### "Refusing to run integration tests against a Neon database"

- **Cause:** `TEST_DATABASE_URL` is not set, so tests fall back to `POSTGRESQL_URI` which points to Neon.
- **Fix:** Set `TEST_DATABASE_URL` to your local postgres instance (see step 3 above).

### Connection refused on port 5433

- **Cause:** The postgres container is not running.
- **Fix:** Run `docker compose up -d postgres` and wait for it to be healthy.

## Notes

- Tests clean up the `users` table before each test but otherwise leave the database intact.
- The JWT secret defaults to a test value in the suite; you do not need to set `JWT_SECRET` for local runs.
- The test database uses PostGIS for geographic features. The `docker-compose.yml` uses the `postgis/postgis:17-3.4` image.
