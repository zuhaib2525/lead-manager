# Lead Manager

A small full-stack app for capturing and tracking sales leads. Built for the Meru Technosoft Full Stack Developer screening assignment.

## Features

**Core:** add, list, edit (including status), and delete leads (with a confirmation dialog); search by name/email/company; filter by status; validation on both the frontend and the backend.

**Bonus (all done):** signup/login so each user only sees their own leads · sorting and pagination · status counts on a clickable pipeline strip · automated API tests (9 tests).

## Tech and why

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Matches the team's stack; fast dev loop, no framework overhead for a small app |
| Backend | Node.js + Express | Simple, explicit REST API |
| Database | SQLite (`better-sqlite3`) | Zero setup for reviewers; relational schema with indexes. Swapping to Postgres only touches `db.js` and the queries in `app.js` |
| Auth | bcrypt + JWT (7-day) | Stateless, easy to reason about |
| Tests | `node:test` + supertest | No extra test framework needed |

## Run locally

Requires Node 20+ (developed on Node 22).

```bash
npm install
cp server/.env.example server/.env      # set JWT_SECRET
npm run dev                             # API on :4000, web on http://localhost:5173
```

Other commands:

```bash
npm test          # API tests (in-memory SQLite)
npm run build     # build the frontend
npm start         # production: API on :4000 also serves client/dist
```

## API

All `/api/leads*` routes require `Authorization: Bearer <token>`.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | returns `{ token, user }` |
| GET | `/api/auth/me` | current user |
| GET | `/api/leads` | `?search=&status=&sort=name\|company\|status\|created&order=asc\|desc&page=&limit=` → `{ data, meta }` |
| GET | `/api/leads/stats` | `{ total, byStatus }` |
| POST | `/api/leads` | create |
| GET / PUT / DELETE | `/api/leads/:id` | PUT accepts partial updates; other users' leads return 404 |
| GET | `/api/meta` | allowed statuses and sources (single source of truth for the dropdowns) |

Errors use one shape: `{ "message": "...", "errors": { "field": "..." } }` with sensible status codes (400 validation, 401 auth, 404, 409 duplicate email).

## Database

`users` (unique, case-insensitive email) and `leads` (belongs to a user, `ON DELETE CASCADE`). Indexes on `(user_id, status)` and `(user_id, created_at)` cover the filter and default sort. Every query is scoped by `user_id`.

## Assumptions

- All six lead fields are required; status defaults to "New".
- Sources are a fixed list: Website, Referral, LinkedIn, Cold call, Event, Other.
- Search matches name, email, or company (the brief asks for name; the wider match is more useful and costs nothing).
- Phone accepts 7–20 digits with `+`, spaces, dashes, and parentheses; it is not region-specific.
- Dates are stored in UTC and shown in the viewer's locale.

## What I'd improve with more time

- Move JWT to an httpOnly cookie and add rate limiting on the auth routes.
- Migrations (e.g. Knex/Drizzle) and Postgres for multi-instance deployment.
- Refresh stats only on writes rather than on every search keystroke.
- Component tests for the frontend (Vitest + Testing Library) and an end-to-end Playwright test.
- Lead notes / activity history, CSV import/export.
- Deployment (Render or Railway: build `npm install && npm run build`, start `npm start`, set `JWT_SECRET` and a persistent disk for `DB_FILE`).

## Notes

**Proud of:** the status strip doubles as dashboard and filter, and the validation rules live in one place on the server, with the client mirroring them for instant feedback.
**Tricky:** keeping search safe (LIKE wildcards are escaped, sort columns are whitelisted) and handling "deleted the last row on the last page".
