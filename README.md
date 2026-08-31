# Instant Mechanic — Live Operations Dashboard

A full-stack monorepo for **Instant Mechanic**, a vehicle service company's live operations dashboard. Built for ops teams to monitor bookings, mechanics, revenue, and real-time status updates.

## Project Overview

This project delivers a production-quality SaaS-style dashboard for monitoring vehicle service operations in real time. The primary user is the **ADMIN/OPS** team, who can view aggregated stats, search and filter bookings, track mechanic availability, analyze trends, and watch booking statuses update live via WebSockets.

The monorepo contains:
- **`frontend/`** — React + Vite SPA deployed to Vercel
- **`backend/`** — Express REST API + Socket.IO deployed to Render
- PostgreSQL database hosted on Neon (production) or Docker (local)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime / Package Manager | **Bun** |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn-style UI, react-router, TanStack Query, Recharts, Socket.IO client, Sonner |
| Backend | Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Zod validation |
| Database | PostgreSQL (Neon free tier in prod, Docker locally) |
| Auth | JWT in httpOnly cookies, role-based access control |
| LLM | Google Gemini 3.7 Flash via `llmService.js` |
| API Docs | Swagger/OpenAPI at `/api-docs` |
| CI | GitHub Actions (lint + build) |
| Deployment | Vercel (frontend), Render (backend), Neon (DB) |

## Architecture

```mermaid
flowchart LR
  subgraph Client
    FE[React Frontend<br/>Vercel]
  end

  subgraph Server
    API[Express REST API]
    WS[Socket.IO]
  end

  subgraph Data
    DB[(PostgreSQL<br/>Neon)]
  end

  FE -->|REST + cookies| API
  FE <-->|WebSocket| WS
  API --> DB
  WS --> API
  API -->|LLM summaries| Gemini[Google Gemini API]
```

**WebSocket layer:** Socket.IO is attached to the same HTTP server as Express. When a booking status changes (`PATCH /api/bookings/:id/status`), the server broadcasts `booking:updated` to all connected clients. The frontend updates TanStack Query cache in place so tables and stats refresh without a page reload.

**Double-booking safety:** Mechanic assignment uses a Prisma transaction with `SELECT ... FOR UPDATE` row-level locking on the mechanic row. Before assigning, the transaction checks for overlapping ACTIVE bookings (ASSIGNED, MECHANIC_ON_THE_WAY, IN_PROGRESS). Optimistic concurrency via a `version` field on Booking prevents lost updates when two status changes race. This is documented as a deliberate engineering choice for concurrency safety.

## Local Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- Docker (optional, for local PostgreSQL)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd LiveDashboardTask
bun install
```

### 2. Start PostgreSQL (local)

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your `DATABASE_URL`. Default for Docker:

```
DATABASE_URL="postgresql://user:password@localhost:5432/instant_mechanic?schema=public"
```

### 4. Database migrate + seed

```bash
cd backend
bun run db:generate
bun run db:push
bun run db:seed
```

### 5. Run development servers

From the monorepo root:

```bash
bun run dev:backend   # http://localhost:3001
bun run dev:frontend  # http://localhost:5173
```

Or both:

```bash
bun run dev
```

### 6. Login

- **Email:** `admin@instantmechanic.com`
- **Password:** `password123`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon or local) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `PORT` | Server port (default `3001`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Vercel frontend URL for CORS (e.g. `http://localhost:5173`) |
| `GEMINI_API_KEY` | Google AI Studio / Gemini API key for LLM summaries |
| `GEMINI_MODEL` | Gemini model ID (default: `gemini-3.7-flash`) |
| `API_URL` | Public API URL for Swagger docs |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g. `http://localhost:3001` or Render URL) |

## API Documentation

- **Local:** http://localhost:3001/api-docs
- **Production:** `https://<your-render-app>.onrender.com/api-docs`

### Major Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check for uptime pinging |
| POST | `/api/auth/login` | Login (sets httpOnly cookie) |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/dashboard` | Aggregated dashboard stats |
| GET | `/api/bookings` | Paginated, filterable bookings list |
| GET | `/api/bookings/:id` | Booking detail with LLM summaries |
| PATCH | `/api/bookings/:id/status` | Update status (WebSocket broadcast) |
| GET | `/api/mechanics` | Mechanics list with current booking |
| GET | `/api/mechanics/:id` | Mechanic detail |
| GET | `/api/customers` | Customers list (admin) |
| GET | `/api/analytics/*` | Chart data endpoints |
| POST | `/api/demo/simulate` | Advance random bookings for live demo |

## Deployment

### Frontend (Vercel)

1. Connect the GitHub repo to Vercel
2. Set root directory to `frontend`
3. Build command: `bun run build`
4. Set `VITE_API_URL` to your Render backend URL

### Backend (Render)

1. Create a Web Service on Render
2. Root directory: `backend`
3. Build: `bun install && bun run db:generate && bun run build`
4. Start: `bun run start`
5. Add environment variables from the table above
6. Connect Neon `DATABASE_URL`

### Database (Neon)

1. Create a free Neon project
2. Copy the connection string to Render's `DATABASE_URL`
3. Run migrations: `bun run db:push` (from CI or manually)

### Render Cold-Start Trade-off

Render's free tier spins down after ~15 minutes of inactivity. The next request can take **30–50 seconds** to wake the server.

**Mitigations implemented:**

1. **Backend:** `GET /health` returns `{ status: "ok" }` instantly once warm — designed for external uptime pingers.
2. **Frontend:** API fetch wrapper with timeout, retry/backoff, and a friendly **"Waking up the server"** overlay after 3 seconds on cold start instead of a blank hang.
3. **Production recommendation:** Use a paid always-on Render instance, or configure a free external cron (e.g. [cron-job.org](https://cron-job.org) or UptimeRobot) to ping `/health` every 10 minutes.

**Optional keep-alive setup:**

1. Sign up for UptimeRobot or cron-job.org (free)
2. Create a monitor/cron hitting `https://<your-app>.onrender.com/health` every 10 minutes
3. This keeps the instance warm but depends on an external service outside the repo

## AI Usage

| Tool | Used For | Personally Modified |
|------|----------|---------------------|
| Cursor / Claude | Scaffolded monorepo structure, Prisma schema, Express routes, React pages, seed script, README | WebSocket broadcast + TanStack Query cache integration, double-booking transaction with `FOR UPDATE`, cold-start fetch wrapper and waking-up UI |
| Google Gemini API | Pre/post-visit booking summaries via `llmService.js` (`gemini-3.7-flash`) | Prompt structure, retries on 503, template fallback when API unavailable |
| — | — | Auth RBAC middleware, optimistic concurrency `version` field, CSV export, dark mode, demo simulate button |

**Honest breakdown:** AI assisted with scaffolding and boilerplate (component structure, route patterns, seed data generation). The concurrency-safe mechanic assignment, real-time cache updates, and cold-start UX were implemented and tested manually. LLM integration includes template fallbacks so the app works without API keys.

## Bonus Features Included

- Swagger/OpenAPI docs at `/api-docs`
- Dark mode toggle
- Booking detail + mechanic detail pages
- CSV export from bookings table
- API rate limiting (200 req / 15 min)
- Docker Compose for local PostgreSQL
- GitHub Actions CI (lint + build)
- Live demo: "Simulate Live Updates" button + `POST /api/demo/simulate`

## Scripts

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev` | Run frontend + backend in dev mode |
| `bun run build` | Build both packages |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:seed` | Seed database with fake data |
| `bun run --filter backend simulate` | Advance random bookings (CLI) |

## License

MIT
