# PassMaster Admin Dashboard

Internal command centre for PassMaster Ghana. Next.js 16 · TypeScript 5 · Tailwind CSS v4 · Radix UI · TanStack Query v5 · NextAuth v5 · Recharts · Zustand · React Hook Form · Zod.

Canonical spec: [`../docs/PassMaster_Admin_Dashboard_Engineering_Prompt.docx`](../docs/PassMaster_Admin_Dashboard_Engineering_Prompt.docx).

> ⚠️ This scaffold runs on **Next.js 16**, not Next 14 as the spec document prescribes. The two notable differences:
> 1. Middleware is `proxy.ts` at the project root (not `middleware.ts`).
> 2. Tailwind v4 is CSS-first — no `tailwind.config.js`; theme tokens live in `app/globals.css` under `@theme { … }`.

## Prerequisites

- Node.js 20 LTS
- The PassMaster NestJS backend running at `http://localhost:3000/api/v1` (see `../backend`)

## Getting started

```bash
npm install

# 1. Environment
cp .env.example .env.local
# Fill NEXTAUTH_SECRET (openssl rand -hex 32) and point NEXT_PUBLIC_API_URL
# + BACKEND_URL at your running NestJS backend.

# 2. Run the dev server
npm run dev
```

The admin lives at <http://localhost:3001/login> (use port 3001 to avoid clashing with the NestJS backend on 3000).

Seed an admin account on the backend first:

```bash
cd ../backend
SEED_ADMIN_EMAIL=admin@passmaster.com.gh SEED_ADMIN_PASSWORD=your_password npm run seed:admin
```

## Project structure

```
admin/
├── app/
│   ├── layout.tsx                # Root layout + providers (Auth, Query, Toast)
│   ├── globals.css               # Tailwind v4 @theme tokens
│   ├── not-found.tsx
│   ├── api/auth/[...nextauth]/   # NextAuth handler
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx        # Credentials login form
│   ├── (admin)/
│   │   ├── layout.tsx            # Sidebar + Topbar shell
│   │   └── admin/
│   │       ├── page.tsx          # Dashboard overview + metrics + AI cost chart
│   │       ├── loading.tsx       # Skeleton while route loads
│   │       ├── error.tsx         # Route-level error boundary
│   │       ├── users/            # List + detail (with ban flow)
│   │       ├── questions/        # List + new + import + [id]
│   │       ├── explanations/
│   │       ├── flags/            # Resolve queue
│   │       ├── subscriptions/
│   │       ├── payments/         # Paystack webhook log + raw JSON inspector
│   │       ├── ai/               # Cost by model, by action, top consumers
│   │       ├── jobs/             # BullMQ queue depth (polls every 10s)
│   │       ├── notifications/    # Targeted push/SMS compose form
│   │       ├── leaderboard/
│   │       ├── audit/
│   │       └── schools/          # [P2] scaffold
│   └── (teacher)/                # [P2] Teacher portal route group
├── components/
│   ├── ui/                       # Shadcn-style primitives (Button, Card, Table, Sheet, …)
│   ├── admin/
│   │   ├── layout/               # Sidebar, Topbar, PageHeader, nav registry
│   │   ├── dashboard/            # MetricCard, AiCostChart
│   │   └── questions/            # DifficultyBadge, VerifiedBadge, QuestionForm
│   └── providers/                # AuthProvider, QueryProvider, Toaster
├── lib/
│   ├── api.ts                    # Axios client + session-aware interceptors
│   ├── auth.ts                   # NextAuth v5 config with refresh-token rotation
│   ├── query-keys.ts             # Every TanStack Query key (spec §5.3)
│   ├── utils.ts                  # cn, formatGHS, formatUSD, formatDate, initials
│   ├── constants.ts              # Badge tone maps, role labels, plan labels
│   └── validators/               # Zod schemas: login, question, notification
├── hooks/                        # use-debounce, use-pagination, use-permissions
├── store/                        # Zustand: sidebar, filters (persisted)
├── types/                        # api.ts (DTO mirrors), auth.ts (NextAuth augmentation)
├── proxy.ts                      # Next 16 middleware — role-based routing
└── next.config.ts                # Security headers
```

## Key architectural decisions

- **Role-based routing via `proxy.ts`** — defence-in-depth layer 1. Students get bounced to `/login`; teachers cannot access `/admin/*`; admins cannot access `/school/*`.
- **NextAuth v5 JWT strategy** — access token in session, refresh rotation handled in the `jwt` callback with a 60s buffer before expiry. Session timeout 2h of idle (spec §9.2).
- **Single Axios instance** — browser-side grabs the session token automatically; `serverApi(token)` for Server Components.
- **No inline query keys** — every TanStack Query key is minted from `lib/query-keys.ts` so refactors don't silently desync cache layers.
- **No Tailwind config file** — Tailwind v4 reads `@theme { … }` tokens from `app/globals.css`. Slate neutrals + indigo primary + emerald/amber/rose semantics per spec §8.1.
- **Shadcn-style primitives, zero CLI** — Radix primitives + `class-variance-authority` hand-written in `components/ui/`. Customise by editing files, not by re-installing.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch-mode dev server on :3001 |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint with Next + Core Web Vitals |

## Phase roadmap

- **Phase 1 (ship)** — everything currently wired: dashboard, question bank, AI monitor, flag queue, users, payments, notifications, audit.
- **Phase 2** — schools management (`/admin/schools`), teacher portal (`/school/*`), assignments, PDF progress reports, Nigeria expansion.

## Security posture

- Admin endpoints protected at two layers: `proxy.ts` at the Edge + every NestJS route handler re-checks `RolesGuard`.
- `NEXT_PUBLIC_*` used only for the API base URL — all secrets server-only.
- `NEXTAUTH_SECRET` required; refuse to boot in production without it.
- Helmet-style headers set in `next.config.ts` (X-Frame-Options DENY, strict Referrer-Policy, locked-down Permissions-Policy).
- Destructive mutations (ban user, delete question) require a confirmation prompt in the page handler.

See the full spec in [`../docs/PassMaster_Admin_Dashboard_Engineering_Prompt.docx`](../docs/PassMaster_Admin_Dashboard_Engineering_Prompt.docx) §9 for the complete checklist.
