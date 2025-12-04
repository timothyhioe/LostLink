# LostLink

Smart lost & found platform for Hochschule Darmstadt. This repository contains:

- `backend/`: Node.js + Express + TypeScript API with PostgreSQL (Neon) + Drizzle ORM
- `frontend/`: React + Vite + TypeScript
- `docs/`: All Documentations including ADRs

---

## Backend Quick Start

### Local Development (without Docker)

```bash
cd backend
npm install
cp .env.example .env          # update secrets/URIs
npm run dev                   # runs ts-node-dev (localhost:5000)
```

### Environment Variables (`backend/.env`)

| Variable           | Description                         | Required                       |
| ------------------ | ----------------------------------- | ------------------------------ |
| `NODE_ENV`         | `development` \| `production`       | No (default: `development`)    |
| `PORT`             | HTTP port                           | No (default: `5000`)           |
| `CORS_ORIGIN`      | Allowed origins (comma-separated)   | No (default: `*`)              |
| `POSTGRESQL_URI`   | PostgreSQL connection string (Neon) | **Yes**                        |
| `JWT_SECRET`       | JWT signing secret (min 16 chars)   | **Yes**                        |
| `MINIO_ENDPOINT`   | MinIO endpoint                      | No (default: `localhost`)      |
| `MINIO_PORT`       | MinIO port                          | No (default: `9000`)           |
| `MINIO_USE_SSL`    | Use SSL for MinIO                   | No (default: `false`)          |
| `MINIO_ACCESS_KEY` | MinIO access key                    | No (default: `minioadmin`)     |
| `MINIO_SECRET_KEY` | MinIO secret key                    | No (default: `minioadmin`)     |
| `MINIO_BUCKET`     | MinIO bucket name                   | No (default: `lostlink-items`) |

### Scripts

| Script                 | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start server with auto-reload (ts-node-dev) |
| `npm run build`        | Type-check + compile TypeScript to `dist/`  |
| `npm run start`        | Run compiled server from `dist/`            |
| `npm run typecheck`    | TypeScript compile check (no emit)          |
| `npm run lint`         | Run ESLint                                  |
| `npm run lint:fix`     | Auto-fix ESLint issues                      |
| `npm run format`       | Format code with Prettier                   |
| `npm run format:check` | Check code formatting                       |

---

## Docker Compose Workflow

Requirements: Docker + Docker Compose v2.

```bash
# Start all services
docker compose up --build

# View logs
docker compose logs -f backend

# Stop all services
docker compose down
```

### Services

- **`backend`**: Express API with hot-reload (port `5000`)
  - Source code mounted for live editing
  - Auto-restarts on file changes
- **`frontend`**: React + Vite dev server (port `5173`)
- **`minio`**: MinIO object storage
  - API: `http://localhost:9000`
  - Console: `http://localhost:9001` (minioadmin/minioadmin)

**Note:** PostgreSQL is hosted on Neon (cloud), not in Docker. No local database container needed.

### Volumes

- `minio-data`: Persists MinIO data between container restarts
- Source code is mounted for hot-reload (backend `src/`, frontend root)

---

## Database

See `docs/DATABASE.md` for complete database documentation, including:

- Database schema and table structure
- Indexes and query optimization
- PostGIS geospatial features
- Drizzle ORM usage
- Migration information

---

## API Documentation

See `docs/API_DOCS.md` for complete API documentation, including:

- All available endpoints
- Authentication flow
- Swagger UI usage
- Request/response examples

---

## Development Workflow

### Code Quality

- **ESLint**: Run `npm run lint` before committing
- **TypeScript**: Type checking via `npm run typecheck`
- **CI/CD**: GitHub Actions runs lint + typecheck on push/PR

### Git Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Run `npm run lint` and `npm run typecheck`
4. Commit and push
5. Open Pull Request
6. CI will automatically validate code

### Adding New Routes

1. Create route file in `backend/src/routes/`
2. Add Swagger documentation (JSDoc comments)
3. Register route in `backend/src/routes/index.ts`
4. Test in Swagger UI at `/api-docs`

---

## Project Structure

```
LostLink/
├── backend/
│   ├── src/
│   │   ├── config/          # Database (Drizzle), MinIO, Swagger, env
│   │   ├── db/              # Drizzle ORM schema definitions
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (storage service)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utilities (logger, etc.)
│   │   ├── websocket/       # Socket.IO handlers
│   │   ├── app.ts           # Express app setup
│   │   └── server.ts        # Server bootstrap
│   ├── drizzle.config.ts    # Drizzle Kit configuration
│   ├── .env                 # Environment variables (not in git)
│   ├── .env.example         # Environment template
│   ├── docker-compose.yml   # Docker services
│   └── package.json
├── frontend/                # React app
├── docs/
│   ├── ADR/                # Architecture Decision Records
│   ├── Uploads/            # Diagrams and assets
│   └── PLAN.md             # Full project plan
└── README.md
```

---
