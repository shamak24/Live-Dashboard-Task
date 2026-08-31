# Instant Mechanic — Live Operations Platform

A full-stack monorepo for **Instant Mechanic**, an on-demand vehicle service company. The app includes a public marketing site, a **customer mobile-first portal**, a **mechanic job view**, and an **admin operations console** with real-time booking updates via WebSockets.

---

## ⚠️ Live demo — Render free tier cold start

The **backend is deployed on Render’s free tier**. After ~15 minutes of inactivity, the service spins down. The **first request after sleep can take up to ~1 minute** to respond while the container wakes up.

**What you’ll see:**

- A **“Waking up the server”** overlay may appear on the frontend (usually after a few seconds of waiting).
- Login, dashboard stats, and bookings may feel slow on the **first load**; subsequent requests are fast until the server sleeps again.

**This is expected on free tier — not a bug.** For production, use a paid always-on Render plan or ping `GET /health` every 10 minutes (e.g. UptimeRobot, cron-job.org).

---

## Project overview

| Surface | Audience | Purpose |
|---------|----------|---------|
| **Landing** (`/`) | Everyone | Marketing, trust content, sign-in links; shows personalized greeting when logged in |
| **Customer portal** (`/app`) | Customers | Book services (multi-select), live job tracking, history, vehicles, account |
| **Mechanic view** (`/app`) | Mechanics | Active job focus, quick status updates, assignment list |
| **Ops dashboard** (`/app`) | Admin | Overview, analytics, bookings, mechanics fleet, customers, activity log |

### Monorepo layout

| Package | Stack | Deploy target |
|---------|-------|---------------|
| `frontend/` | React 19, Vite, TypeScript, Tailwind v4, TanStack Query, Recharts, Socket.IO | Vercel |
| `backend/` | Express, Prisma, Socket.IO, Zod, JWT cookies | Render (free tier) |
| Database | PostgreSQL | Neon (prod) / Docker (local) |

---

## Features

### Admin operations console

- **Overview** — Hero-weighted stats (today’s bookings, revenue), fleet metrics, live **activity log** (DB-backed, max 15 entries)
- **Analytics** — Bookings/revenue over time, status pie chart, service category breakdown
- **Bookings** — Search, filter, sort, CSV export, live row flash on WebSocket updates; mobile card layout
- **Mechanics** — Fleet status, jobs completed, current booking; name search
- **Customers** — Profiles, lifetime value, drill-down to customer detail; name search
- **Booking detail** — Status workflow, mechanic assignment, pre/post-visit LLM summaries
- **Simulate updates** — Admin button + `POST /api/demo/simulate` to advance random bookings for demos
- **Dark mode** — Shared across marketing and app shells

### Customer portal (consumer UI)

- Mobile **bottom tab navigation**; desktop **top nav** in header
- **Home** — Live step tracker + abstract map when a job is active; book CTA when idle
- **Book** — Vehicle → multi-select services → schedule → confirm → celebration screen
- **History** — Card list with AI post-visit summaries and “Book again”
- **Vehicles** — Add/remove vehicles
- **Account** — Profile and sign out
- Brand title links to landing page

### Mechanic view

- **My Jobs** — Current job hero card with large status actions (on the way → in progress → completed)
- Jobs completed count, other active assignments list
- Mobile-friendly ops styling

### Platform

- **Auth** — JWT in `httpOnly` cookies; roles: `ADMIN`, `MECHANIC`, `CUSTOMER`
- **Real-time** — `booking:updated` over Socket.IO; TanStack Query cache updates in place
- **LLM** — Google Gemini pre/post-visit summaries with template fallback if API unavailable
- **Concurrency** — Mechanic assignment with row locking; booking `version` field for optimistic updates
- **API docs** — Swagger at `/api-docs`
- **Cold-start UX** — Retries + “Waking up the server” overlay when backend is slow

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime / PM | **Bun** workspaces |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS v4, Geist fonts, react-router 7, TanStack Query, Recharts, Socket.IO client, Sonner |
| Backend | Express 4, TypeScript, Prisma 6, Socket.IO, Zod, bcrypt, express-rate-limit |
| Database | PostgreSQL |
| Auth | JWT (`httpOnly` cookie), RBAC middleware |
| LLM | Google Gemini (`GEMINI_API_KEY`, default model `gemini-3.6-flash`) |
| CI | GitHub Actions (lint + build) |

---

## Architecture

```mermaid
flowchart LR
  subgraph Client
    LP[Landing / Marketing]
    CP[Customer Portal]
    OPS[Admin + Mechanic Ops]
  end

  subgraph Server["Render (free tier)"]
    API[Express REST]
    WS[Socket.IO]
  end

  subgraph Data
    DB[(PostgreSQL / Neon)]
  end

  LP --> API
  CP --> API
  OPS --> API
  CP <-->|booking:updated| WS
  OPS <-->|booking:updated| WS
  API --> DB
  API --> Gemini[Gemini API]
```

**Status flow:** `PENDING` → `ASSIGNED` → `MECHANIC_ON_THE_WAY` → `IN_PROGRESS` → `COMPLETED` (or `CANCELLED`).

**Assignable mechanics:** Not `OFFLINE` and no active booking in `ASSIGNED`, `MECHANIC_ON_THE_WAY`, or `IN_PROGRESS`.

---

## Local setup

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- Docker (optional, for local PostgreSQL)

### 1. Clone and install

```bash
git clone https://github.com/shamak24/Live-Dashboard-Task.git
cd Live-Dashboard-Task
bun install
```

### 2. Start PostgreSQL (local)

```bash
docker compose up -d
```

### 3. Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Backend** — set `DATABASE_URL` (Docker default):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/instant_mechanic?schema=public"
```

**Frontend** — leave `VITE_API_URL` empty for local dev (Vite proxies `/api` and WebSocket to port 3001).

### 4. Database migrate + seed

```bash
cd backend
bun run db:generate
bun run db:push
bun run db:seed
```

### 5. Run dev servers

From monorepo root:

```bash
bun run dev          # frontend + backend
# or separately:
bun run dev:backend  # http://localhost:3001
bun run dev:frontend # http://localhost:5173
```

### 6. Open the app

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Landing page |
| http://localhost:5173/login | Sign in (Customer/Mechanic or Admin tab) |
| http://localhost:5173/login?mode=admin | Admin sign-in directly |
| http://localhost:5173/signup | Register as customer or mechanic |
| http://localhost:5173/app | App home (role-based routing) |

---

## Demo accounts

Run `bun run db:seed` in `backend/` before using seeded accounts.

### Admin (full ops dashboard)

| Field | Value |
|-------|-------|
| **Email** | `admin@instantmechanic.com` |
| **Password** | `password123` |

Use the **Admin** tab on `/login` or `/login?mode=admin`. Routes to Overview, Analytics, Bookings, Mechanics, Customers.

### Customer & mechanic

- **Sign up:** `/signup` — choose customer or mechanic.
- **Sign in:** `/login` — Customer / Mechanic tab.
- **Seeded users:** Faker-generated emails from seed, password **`password123`** for all seeded non-admin users.

---

## App routes (frontend)

### Public

| Path | Page |
|------|------|
| `/` | Landing (personalized if signed in) |
| `/login` | Login |
| `/signup` | Registration |

### Authenticated (`/app`)

| Path | Role | Description |
|------|------|-------------|
| `/app` | All | Home — Overview (admin), My Jobs (mechanic), live tracking (customer) |
| `/app/analytics` | Admin | Charts |
| `/app/bookings` | Admin, Mechanic | Bookings table / assignments |
| `/app/bookings/:id` | All* | Booking detail + status actions |
| `/app/mechanics` | Admin | Fleet list |
| `/app/mechanics/:id` | Admin, Mechanic† | Mechanic profile |
| `/app/customers` | Admin | Customer list |
| `/app/customers/:id` | Admin | Customer profile |
| `/app/book` | Customer | Book a service (multi-service) |
| `/app/history` | Customer | Past bookings |
| `/app/vehicles` | Customer | Vehicle management |
| `/app/account` | Customer | Account settings |

\*Customers only see their own bookings; mechanics only assigned jobs.  
†Mechanics can only view their own mechanic profile.

---

## API overview

**Local docs:** http://localhost:3001/api-docs  
**Production:** `https://<your-render-app>.onrender.com/api-docs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check (use for uptime pings) |
| POST | `/api/auth/login` | — | Login, sets cookie |
| POST | `/api/auth/register` | — | Register customer/mechanic |
| POST | `/api/auth/logout` | — | Clear session |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/dashboard` | Admin | Dashboard stats |
| GET | `/api/dashboard/activity-logs` | Admin | Recent activity (max 15) |
| GET | `/api/dashboard/charts/*` | Admin | Analytics chart data |
| GET | `/api/bookings` | ✓ | List bookings (scoped by role) |
| POST | `/api/bookings` | Customer | Create booking(s) |
| GET | `/api/bookings/:id` | ✓ | Booking detail |
| PATCH | `/api/bookings/:id/status` | Admin, Mechanic | Update status (+ WebSocket) |
| POST | `/api/bookings/:id/retry-summary` | Admin | Regenerate LLM summary |
| GET | `/api/mechanics` | Admin, Mechanic | List mechanics (`?available=true` for assignable) |
| GET | `/api/mechanics/:id` | Admin, Mechanic | Mechanic detail |
| GET | `/api/customers` | Admin | List customers |
| GET | `/api/customers/:id` | Admin | Customer detail |
| GET | `/api/customers/me` | Customer | Own profile |
| PATCH | `/api/customers/me` | Customer | Update profile |
| POST/DELETE | `/api/customers/me/vehicles` | Customer | Manage vehicles |
| GET | `/api/service-categories` | ✓ | Service categories + prices |
| POST | `/api/demo/simulate` | Admin* | Advance random bookings for demo |

\*Simulate endpoint is mounted without role guard in code but is intended for admin demo use from the dashboard button.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random secret for JWT signing |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `PORT` | No | Default `3001` |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Prod | Vercel URL for CORS (e.g. `https://your-app.vercel.app`) |
| `GEMINI_API_KEY` | No | Gemini API key for LLM summaries |
| `GEMINI_MODEL` | No | Default `gemini-3.6-flash` |
| `DEMO_AUTO_SIMULATE` | No | `true` to auto-advance bookings in dev |
| `DEMO_AUTO_SIMULATE_MS` | No | Interval ms (default 30000) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Prod | Render backend URL (e.g. `https://your-app.onrender.com`). Leave empty locally. |

---

## Deployment

### Frontend (Vercel)

1. Connect repo; set **Root Directory** to `frontend`
2. Build: `bun run build`
3. Set `VITE_API_URL` to your Render backend URL (no trailing slash)

### Backend (Render free tier)

1. New **Web Service**; root `backend`
2. Build: `bun install && bun run db:generate && bun run build`
3. Start: `bun run start`
4. Add env vars (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, optional `GEMINI_API_KEY`)
5. **Expect cold starts** — see warning at top of this README

### Database (Neon)

1. Create Neon project; copy connection string to Render `DATABASE_URL`
2. Apply schema: `cd backend && bun run db:push`
3. Seed (optional): `bun run db:seed`

### Keep backend warm (optional)

Free tier sleeps after inactivity. To reduce **~1 minute** wake-up delays:

1. Use [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org)
2. Ping `GET https://<your-app>.onrender.com/health` every **10 minutes**
3. Or upgrade Render to a paid always-on instance

The frontend already shows a friendly **“Waking up the server”** state and retries slow requests.

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev` | Run frontend + backend in dev mode |
| `bun run dev:frontend` | Vite dev server only |
| `bun run dev:backend` | Express + Socket.IO with watch |
| `bun run build` | Production build (both packages) |
| `bun run db:migrate` | Prisma migrate dev |
| `bun run db:seed` | Seed fake customers, mechanics, bookings |
| `cd backend && bun run simulate` | CLI: advance random bookings |

---

## Design notes

- **Ops UI** — Dense, flat, scan-fast console for admin/mechanic (unified status colors, tabular numbers, mobile bottom nav for admin)
- **Customer UI** — Warm, spacious, mobile-first portal (separate from ops styling)
- **Brand** — Geist / Geist Mono, primary `#2F5DFF`, shared status color tokens across badges and charts

---

## AI usage (transparency)

| Tool | Used for |
|------|----------|
| Cursor / Claude | Scaffold, routes, components, seed data, README drafts |
| Google Gemini | Pre/post-visit booking summaries |
| Manual implementation | WebSocket + Query cache sync, mechanic `FOR UPDATE` assignment, cold-start UX, customer portal, activity log, multi-service booking flow |

LLM summaries fall back to templates when `GEMINI_API_KEY` is missing or the API errors.

---

## License

MIT
