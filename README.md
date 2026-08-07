# Task Management System

Enterprise Task Management System — monorepo with npm workspaces.

- `apps/api` — NestJS 11 + Prisma + PostgreSQL + Socket.IO + Swagger (complete)
- `apps/web` — Next.js 15 frontend (App Router, Tailwind v4, TanStack Query)

## Prerequisites

- Node.js 20+ and npm 10+
- Docker (for PostgreSQL) or an existing Postgres 16 instance

## Setup

```bash
# 1. Install dependencies (root installs all workspaces)
npm install

# 2. Start PostgreSQL
docker compose up -d        # postgres:16, db tasksystem, user/pass postgres/postgres
                            # NOTE: mapped to host port 55432 (5432 was occupied on this machine)

# 3. Configure environment
cp .env.example apps/api/.env   # adjust DATABASE_URL port if needed

# 4. Run migrations, generate client, seed
cd apps/api
npx prisma migrate dev
npx prisma generate
npx prisma db seed

# 5. Start the API (from repo root)
npm run dev:api
```

API: `http://localhost:3101/api` — Swagger UI: `http://localhost:3101/api/docs`

## Frontend (apps/web)

Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind v4, with
shadcn/ui-style hand-written components, Framer Motion, TanStack Query, Zustand,
Axios (Bearer + automatic refresh-token retry on 401), next-themes (dark/light),
recharts, sonner, react-hook-form + zod, dnd-kit (Kanban) and socket.io-client.

```bash
npm run dev -w apps/web     # start on http://localhost:3100
npm run build -w apps/web   # production build
npm run lint -w apps/web    # eslint
```

Set `NEXT_PUBLIC_API_URL` (default `http://localhost:3101/api`) and
`NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3101`) in `apps/web/.env.local`
to point elsewhere.

Pages: login (glassmorphism), role-aware dashboard (admin: 8 stat cards + 4 charts;
employee: my-task stats + average progress), tasks list (server pagination,
search, status/priority/assignee filters, sortable columns), Kanban board with
drag-drop wired to the state-machine endpoints (optimistic updates), task details
(status timeline, comments, progress updates, admin approve/return), admin user
management (create/edit dialogs, disable/enable, reset password, delete confirm),
real-time notifications (Socket.IO + toast + TanStack Query invalidation), and
profile/settings (change password, theme toggle).

Route protection lives in `apps/web/src/middleware.ts`: unauthenticated users are
redirected to `/login`, and `/users` is gated to `ADMIN` (via a lightweight
`tms_role` cookie set on login — the API remains the real authorization layer).

An older incomplete scaffold is preserved under `apps/web/.legacy-scaffold/`
(ignored by the build/lint) and can be deleted.

## Default credentials (seed)

| Role     | Email               | Password       |
|----------|---------------------|----------------|
| ADMIN    | `admin@example.com` | `Admin123!`    |
| EMPLOYEE | `alice@example.com` | `Employee123!` |
| EMPLOYEE | `bob@example.com`   | `Employee123!` |
| EMPLOYEE | `carol@example.com` | `Employee123!` |
| EMPLOYEE | `david@example.com` | `Employee123!` |

## Features

- JWT auth: 15-minute access token + 7-day rotating refresh token (hashed in DB),
  httpOnly cookies + Bearer header support, throttled login, audit trail.
- RBAC: `ADMIN` / `EMPLOYEE`; employees only ever see their own tasks
  (scope enforced in `TaskRepository`).
- Task lifecycle state machine: employee `TODO→IN_PROGRESS→TESTING`,
  `RETURNED→IN_PROGRESS`, progress updates; admin `TESTING→COMPLETED` (approve) /
  `TESTING→RETURNED`, full edit. Every transition writes TaskHistory +
  Notification + AuditLog in one transaction.
- Assignment strategies: `MANUAL` (explicit assignee) and `BALANCED`
  (fewest active tasks among active employees, random tie-break, in-transaction).
- Admin dashboard stats + charts (tasks/employee, completed/month, status &
  priority distribution); employee dashboard stats.
- Real-time notifications via Socket.IO (`/notifications` namespace, JWT handshake,
  per-user rooms) + REST list/mark-read + daily cron for due-tomorrow/overdue.
- Admin-only user management (CRUD, disable/enable, reset password, delete) and
  audit log listing.

## Useful commands

```bash
npm run dev:api      # start API in watch mode
npm run build:api    # build API
npm run test:api     # unit tests (jest)
```
