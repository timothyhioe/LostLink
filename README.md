# LostLink

Smart lost & found platform for university campuses. This repository contains:

- `backend/`: Node.js + Express + TypeScript API
- `frontend/`: React + Vite (placeholder for future work)
- `docs/`: Planning artefacts (see `docs/PLAN.md`)

## Features (Planned for MVP)

- Lost & found item reporting with image uploads (MinIO/S3)
- Smart matching (text similarity + geo proximity)
- Real-time secure chat (Socket.IO)
- Leaflet map integration
- Notification system (email + in-app)
- University email authentication

Full architecture, roadmap, and schema details live in `docs/PLAN.md`.

---

## Backend Quick Start

```bash
cd backend
npm install
cp .env.example .env          # update secrets/URIs
npm run dev                   # runs ts-node-dev (localhost:5000)
```

### Environment Variables (`backend/.env`)

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` \| `production` |
| `PORT` | HTTP port (default `5000`) |
| `CORS_ORIGIN` | Allowed origins (comma-separated) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `MINIO_*` | MinIO endpoint/credentials/bucket |

See `.env.example` for defaults.

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start server with auto-reload |
| `npm run build` | Type-check + emit JS to `dist/` |
| `npm run start` | Run compiled server |
| `npm run typecheck` | TS compile check |

---

## Docker Compose Workflow

Requirements: Docker + Docker Compose v2.

```bash
docker compose up --build
```

Services:

- `backend`: Express API (port `5000`)
- `mongo`: MongoDB 7 (port `27017`)
- `minio`: MinIO object storage (ports `9000` API / `9001` console)

Volumes persist Mongo/MinIO data between runs. Update `docker-compose.yml` if you need different ports or credentials.

---

## Contribution Notes

1. Use feature branches (`feature/<topic>`) and open PRs.
2. Keep files ASCII unless existing file uses other encodings.
3. Run `npm run typecheck` before committing backend changes.
4. Coordinate schema/API updates with the team (see `docs/PLAN.md`).

Feel free to open issues for questions or follow-ups.

