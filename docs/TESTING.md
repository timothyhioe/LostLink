# Testing Guide

Instructions for running the test suite locally. Tests currently live in `backend/tests` and use Vitest with Supertest against the Express app.

## Prerequisites

- Node.js (v20+ recommended) and npm
- A local PostgreSQL instance (do **not** point at the Neon cloud database)
  - Provide a dedicated test database, e.g. `lostlink_test`
  - Connection string format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

### Quick PostgreSQL with Docker

```bash
docker run --name lostlink-test-db -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lostlink_test \
  -p 5432:5432 -d postgres:16
```

## Running the backend tests

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Set the test database URL (recommended: use `TEST_DATABASE_URL` so it stays separate from your dev database):
   ```bash
   export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lostlink_test"
   ```
   - The tests will refuse to run if the URL contains `neon.tech` to prevent hitting production.
3. Run all tests:
   ```bash
   npm test
   ```

## Useful commands

- Run a single test file:
  ```bash
  npm test -- tests/auth.integration.test.ts
  ```
- Drop into watch mode (Vitest UI) if desired:
  ```bash
  npx vitest
  ```

## Notes

- Tests clean up the `users` table before each test but otherwise leave the database intact. Use a throwaway database for safety.
- The JWT secret defaults to a test value in the suite; you do not need to set `JWT_SECRET` for local runs.
