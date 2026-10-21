# AUREVIA — *Learn. Evolve. Excel.*

A full-stack online learning platform: students discover and take courses, instructors build them, admins moderate the platform.

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router, Framer Motion, Lucide, React Hook Form + Zod, Recharts, TanStack Query |
| Backend | Node.js, Express, TypeScript, Zod, JWT in httpOnly cookies, bcrypt, Helmet, rate limiting |
| Database | PostgreSQL 14+ with Prisma ORM (migration + seed included) |
| Tests | Vitest + Supertest (API), Vitest + React Testing Library (UI), Playwright (e2e) |

> **Status note.** This project was generated in an environment with no access to the npm registry, so the
> dependency install, type-check, test suites and production builds **have not been executed yet**. What *was* verified:
> every TypeScript file parses, every relative import/named export resolves, and `server/prisma/migrations/.../migration.sql`
> applies cleanly to a real PostgreSQL 16 and creates all 14 tables. Please run the commands in
> [Verify everything](#verify-everything) first and report/fix anything that surfaces.

---

## 1. Prerequisites

- Node.js **20+** (22 recommended) and npm
- PostgreSQL 14+ (or Docker, using the included `docker-compose.yml`)

## 2. Quick start

```bash
# 1) Install dependencies (root tooling + server + client)
npm install
npm run setup

# 2) Start PostgreSQL (pick ONE)
docker compose up -d                       # creates DBs `aurevia` and `aurevia_test`
#   ...or use your own Postgres, see "Using your own PostgreSQL" below

# 3) Configure the server
cp server/.env.example server/.env
#   Generate a secret and paste it into JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#   Also set SEED_PASSWORD to any password (min 8 chars) for the demo accounts.

# 4) Create tables and demo data
npm run db:deploy          # applies migrations (use `npm run db:migrate` while developing the schema)
npm run db:seed

# 5) Run API (http://localhost:4000) and web app (http://localhost:5173)
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to the API so cookies stay first-party.

### Using your own PostgreSQL

On PostgreSQL 15+ the application role must **own** the database (otherwise `permission denied for schema public`):

```sql
CREATE ROLE aurevia LOGIN PASSWORD 'choose-a-password' CREATEDB;
CREATE DATABASE aurevia      OWNER aurevia;
CREATE DATABASE aurevia_test OWNER aurevia;   -- used only by the test suite
```

Then set `DATABASE_URL` / `TEST_DATABASE_URL` in `server/.env` accordingly.

## 3. Accounts

Demo content is clearly labelled as demonstration data (`isDemo` courses, “(demo)” notifications, `@demo.aurevia.test` addresses).
All seeded accounts use the password you set in `SEED_PASSWORD`.

| Role | Email |
|---|---|
| Student | `alex-student@demo.aurevia.test` (also `priya-learner@…`, `sam-explorer@…`) |
| Instructor | `maya-iyer@demo.aurevia.test` (also `dr-arun-menon@…`, `sofia-laurent@…`, `rohan-desai@…`) |
| Admin | **Not seeded and not self-service.** Create one from the command line (below). |

Public sign-up can only create **Student** or **Instructor** accounts; the validator rejects `ADMIN`.

### Creating an admin securely

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-unique-passphrase' ADMIN_NAME='Your Name' npm run admin:create
```

Credentials come from environment variables only (min 12 chars); the script is idempotent and invalidates existing sessions of that user.
Admins can later change roles from **Admin → Users** (server-enforced; an admin cannot demote or deactivate themselves).

## 4. Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `TEST_DATABASE_URL` | Separate DB used by `npm test` (name must contain “test”; tests wipe it) |
| `JWT_SECRET` | ≥ 32 random chars. The server refuses to start without it |
| `JWT_EXPIRES_IN_HOURS` | Session lifetime (default 168 = 7 days) |
| `PORT`, `NODE_ENV` | Server port (4000) / environment |
| `CLIENT_ORIGIN` | Exact frontend origin — used for CORS and password-reset links |
| `COOKIE_SECURE`, `COOKIE_SAMESITE` | Cookie flags. Production defaults to `secure`. Use `COOKIE_SAMESITE=none` only if the web app and API are on different sites |
| `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` | Optional. Without `SMTP_HOST`, emails are logged to the server console and (non-production only) the reset link is returned in the API response so you can test the flow |
| `SEED_PASSWORD` | Password for seeded demo users |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Used only by `npm run admin:create` |

Client (`client/.env`, optional): `VITE_API_URL` — full API base URL if the API lives on another domain at build time.
Missing/invalid server configuration produces a readable startup error that never prints secret values.

## 5. Commands

| Command | What it does |
|---|---|
| `npm run dev` | API + web app with hot reload |
| `npm run db:migrate` / `db:deploy` | Create+apply migration in dev / apply existing migrations (CI, production) |
| `npm run db:seed` | Reset and load demo data (refuses to run in production) |
| `npm run admin:create` | Provision an admin |
| `npm run typecheck` · `npm run lint` | Strict TypeScript + ESLint for both packages |
| `npm test` | API tests then UI tests |
| `npm run e2e` | Playwright flow (needs both servers running and seeded data) |
| `npm run build` | Production builds (`server/dist`, `client/dist`) |

## Verify everything

```bash
npm install && npm run setup
docker compose up -d                       # or your own Postgres
cp server/.env.example server/.env         # set JWT_SECRET + SEED_PASSWORD
# apply migrations to BOTH databases (the test DB is used by `npm test`)
(cd server && npx prisma migrate deploy)
(cd server && DATABASE_URL="$(grep ^TEST_DATABASE_URL .env | cut -d= -f2- | tr -d '\"')" npx prisma migrate deploy)
npm run typecheck && npm run lint && npm test && npm run build
npm run db:seed && npm run dev
npx --prefix client playwright install chromium && npm run e2e   # with `npm run dev` running
```

## 6. Features

- **Landing page** — hero, animated demo stats (labelled demo), featured courses from the API, categories, why/how, sample testimonials (labelled), instructors, FAQ accordion, newsletter form (validated + stored by the API), footer.
- **Auth** — register, login, logout, forgot/reset password, strength meter, show/hide password, protected routes, session invalidation on logout/password change, rate-limited endpoints.
- **Catalog** — server-side search, category/level/price filters, sort (newest/popular/rating), grid/list toggle, pagination, skeletons, empty states.
- **Course detail** — outcomes, prerequisites, curriculum, reviews, related courses, enrollment (duplicates prevented).
- **Learning player** — section sidebar, video (real URL or explicit “unavailable” state), text lessons, resources, prev/next, mark complete, bookmarks, DB-saved notes, resume at last lesson, progress = completed published lessons ÷ published lessons.
- **Dashboards** — student, instructor, admin, all computed from persisted data with empty states.
- **Course management** — create/edit, sections and lessons (add/edit/reorder/delete with confirmations), draft/publish/unpublish, preview; ownership checks on the server.
- **Admin** — user search/filter/detail, activate/deactivate, role changes, course moderation.
- **Certificates** — backend-verified eligibility, unique ID, print-friendly page (save as PDF from the browser), public verification page.
- **Reviews, wishlist, notifications** (in-app, persisted, mark as read; email only when SMTP is configured), profile & settings (preferences, theme, password change, account deletion).
- **UI** — light/dark themes, responsive layouts, Framer Motion animations honouring `prefers-reduced-motion`.

API reference: all routes live under `/api/v1` (see `server/src/routes/index.ts`); health check at `GET /health`.

## 7. Deployment

1. **Database** — any managed PostgreSQL (Neon, Supabase, Railway, RDS…). Set `DATABASE_URL` (add `?sslmode=require` if the provider needs it).
2. **API** — deploy `server/` (a `Dockerfile` is included; it runs `prisma migrate deploy` then starts the server) to Render/Railway/Fly.io, or run `npm run build && npm run start:prod`.
   Set `NODE_ENV=production`, `JWT_SECRET`, `DATABASE_URL`, `CLIENT_ORIGIN=https://your-web-domain`, and SMTP settings. Health check: `GET /health`.
3. **Web** — build `client/` (`npm run build --prefix client`) and host `client/dist` on Vercel/Netlify/any static host. `client/vercel.json` and `client/public/_redirects` contain SPA rewrites.
   Easiest cookie setup: serve web and API under the same site (e.g. `app.example.com` and `api.example.com`, or proxy `/api` to the API) and keep `COOKIE_SAMESITE=lax`. For fully cross-site hosting set `VITE_API_URL`, `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`.
4. **Monitoring** — logs go to stdout (no passwords, tokens or hashes are logged); ship them with your host's log drain and add an error tracker such as Sentry around `server/src/middleware/error.ts`.

Nothing has been deployed from this repository; the above is guidance only.

## 8. Security notes and known limitations

Implemented: bcrypt (12 rounds), httpOnly + SameSite cookies (`Secure` in production), JWT versioning for server-side session invalidation, server-side role + ownership checks on every mutating route, Zod validation on all inputs (unknown fields stripped → no mass assignment), Helmet, strict CORS origin, request body limit (100 kB), rate limiting on auth/reset/newsletter, hashed single-use reset tokens, anti-enumeration responses, Prisma parameterised queries.

Limitations to be aware of:

- **Payments** — no payment provider is integrated. Paid courses can be created and listed, but enrollment returns HTTP 402 rather than faking a purchase. Integrate Stripe (test mode) before selling courses.
- **File uploads** — none. Avatars and thumbnails are image URLs; add object storage + validation if you need uploads.
- **Certificates** — print/“Save as PDF” from the browser; no server-side PDF generation.
- **Video** — plays any configured video/embed URL; nothing is marked complete automatically by playback.
- **Rate limiting** uses in-memory storage (per instance); use a shared store (e.g. Redis) when running several instances.
- Landing-page statistics and testimonials are demonstration content and are labelled as such.
- Dependencies were not installed/audited in the generation environment; run `npm audit` after installing.
