# Classroom Allotter

A full-stack campus coordination MVP for finding timetable-free classrooms, recording extra activities, and sharing fresh empty-room observations.

**Status:** deployable MVP completed on 2026-10-29
**Stack:** Node.js, Express, PostgreSQL (Neon), HTML, CSS, JavaScript, Vercel

**Live demo:** [https://classroom-allotter.vercel.app](https://classroom-allotter.vercel.app)

## Why this project exists

Class representatives often need a room for a rescheduled lecture, doubt session, or extra class, but availability is spread across timetables and word-of-mouth updates. Classroom Allotter combines three signals without confusing them:

1. **Timetable status** — whether a regular class overlaps the requested interval.
2. **CR activity** — whether someone has already reserved that room for another activity.
3. **Empty-room report** — a time-stamped student observation that expires after 30 minutes.

An observation improves confidence, but it never overrides a timetable entry or active booking.

## Working features

- Search rooms by date, full time interval, minimum capacity, building, and facility.
- Reject a room if any timetable entry or active activity overlaps the requested interval.
- Show recent empty-room observations separately from verified timetable availability.
- Record rescheduled lectures, extra classes, study sessions, and other activities.
- Prevent concurrent double-booking by locking the room row during the conflict check and insert transaction.
- Release an active room reservation early and retain activity history.
- Submit an empty-room observation with a reporter, note, and optional photo URL.
- Persist all rooms, facilities, timetable entries, reports, and activities in PostgreSQL.
- Serve a responsive browser interface and JSON API from one Express application.
- Run locally as a normal Node server and deploy to Vercel as one Express Function.

## Architecture

```text
Browser (HTML/CSS/JS)
        │
        │ fetch JSON
        ▼
Express application
  ├── validation
  ├── room routes
  ├── availability route
  ├── report route
  └── activity routes + transaction
        │
        │ parameterized SQL
        ▼
Neon PostgreSQL
  ├── rooms + facilities
  ├── weekly timetable
  ├── expiring observations
  └── activity history
```

The source diagram is also available as `classroom-allotter-system-design.png` and can be regenerated with `scripts/draw_system_design.py`.

## Availability rule

For a requested interval `[start, end)`, a room is returned only when:

```text
capacity is sufficient
AND requested building/facility filters match
AND no timetable entry starts before end and ends after start
AND no active CR activity starts before end and ends after start
```

Using a half-open interval means one activity may begin exactly when another ends without being treated as an overlap.

## Data model

| Table | Purpose |
|---|---|
| `rooms` | Room code, building, capacity, and creation time. |
| `facilities` | Normalized facility names such as `projector`. |
| `room_facilities` | Many-to-many relationship between rooms and facilities. |
| `timetable_entries` | Weekly course schedule by room, weekday, start time, and end time. |
| `empty_room_reports` | Expiring observations with optional note and photo URL. |
| `room_activities` | Time-bounded CR activities with active/released state. |

Foreign keys, unique constraints, check constraints, indexes, parameterized SQL, and transactions protect database integrity.

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check Express and PostgreSQL connectivity. |
| `GET` | `/api/overview` | Return dashboard totals. |
| `GET` | `/api/rooms` | List rooms; accepts optional `minCapacity`. |
| `POST` | `/api/rooms` | Create a room and its facility relationships. |
| `GET` | `/api/rooms/:id` | Return one room by ID. |
| `GET` | `/api/availability` | Find rooms free for `start` through `end`; accepts capacity, building, and facility filters. |
| `GET` | `/api/activities` | Return recent activity history. |
| `POST` | `/api/activities` | Reserve a conflict-free room interval. |
| `PATCH` | `/api/activities/:id/release` | Release an active reservation early. |
| `POST` | `/api/reports` | Create a 30-minute empty-room observation. |

Validation errors return `400`, missing records return `404`, timetable or activity conflicts return `409`, database health failures return `503`, and unexpected server errors return `500`.

## Project structure

```text
classroom-allotter/
├── db/
│   ├── migrations/002_mvp_features.sql
│   ├── schema.sql
│   └── seed.sql
├── public/
│   ├── app.js
│   ├── favicon.svg
│   ├── index.html
│   └── styles.css
├── scripts/
│   ├── inspect-database.js
│   ├── run-sql-file.js
│   └── draw_system_design.py
├── src/
│   ├── lib/validation.js
│   ├── routes/
│   │   ├── activities.js
│   │   ├── availability.js
│   │   ├── overview.js
│   │   ├── reports.js
│   │   └── rooms.js
│   ├── app.js
│   ├── db.js
│   └── server.js
├── .env.example
├── DEPLOYMENT.md
├── LEARNING_LOG.md
├── package.json
└── vercel.json
```

## Run locally

Requirements: Node.js 22 or newer and a PostgreSQL database.

```bash
npm install
cp .env.example .env
```

Put a pooled PostgreSQL connection string in `.env` as `DATABASE_URL`. Never commit that file.

For a completely new database, apply `db/schema.sql` and then run:

```bash
npm run db:seed
```

For the original learning database that already has the room/facility tables, run:

```bash
npm run db:migrate:mvp
npm run db:seed
```

Start the application:

```bash
npm run dev
```

Open `http://localhost:3000`. Useful commands:

```bash
npm run check       # JavaScript syntax checks
npm run db:inspect  # Read-only terminal tables for all important records
npm start           # Production-style local start
```

## Deployment

The repository is prepared for Vercel zero-configuration Express deployment:

- `src/server.js` default-exports the Express app for Vercel and only opens a port locally.
- `public/` contains CDN-served browser assets.
- `vercel.json` places server compute in Singapore (`sin1`), close to the current Neon database.
- `.vercelignore` explicitly excludes local secrets, Git metadata, dependencies, and learning PDFs from uploads.
- `DATABASE_URL` is supplied through Vercel environment variables, never source control.

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the exact dashboard and CLI steps plus post-deployment checks.

The production deployment was verified on 2026-10-29 at `https://classroom-allotter.vercel.app`.
The initial version was deployed through Vercel CLI; `DEPLOYMENT.md` explains the one-time private-repository permission needed for automatic Git deployments.

## Verification completed

The MVP was manually exercised against the live Neon development database:

- Health, dashboard, room list, and frontend returned successful responses.
- Capacity and interval availability filters returned the expected rooms.
- A current timetable overlap returned HTTP `409`.
- A second overlapping CR activity returned HTTP `409`.
- Empty-room report creation, activity creation, history, and early release succeeded.
- `npm audit --omit=dev` reported zero known vulnerabilities.

## Current MVP boundaries

This is an honest interview MVP, not a production university rollout:

- Names are demo identity fields; institutional authentication and role authorization are not yet implemented.
- The UI accepts an optional hosted photo URL; direct image upload needs object storage and moderation.
- Timetable data is seeded SQL; an administrator CSV import flow is a future feature.
- Campus timetable interpretation is fixed to `Asia/Kolkata` and searches are limited to one campus day.
- Automated integration tests should be added before production adoption; current verification is manual plus syntax and dependency checks.

These are useful interview discussion points because they show a deliberate MVP boundary and a clear production roadmap.

## Resume-ready description

**Classroom Allotter — Full-stack scheduling MVP**

- Built a responsive room-discovery and coordination application using Node.js, Express, PostgreSQL, and vanilla JavaScript.
- Designed timetable-aware interval queries and transaction-based conflict prevention to stop overlapping classroom reservations.
- Modeled normalized room/facility relationships, expiring crowd reports, weekly timetable entries, and activity history with PostgreSQL constraints and indexes.
- Deployed a single full-stack Express application with Neon PostgreSQL on Vercel-ready infrastructure.

## Learning record

`LEARNING_LOG.md` tracks each active learning/build day. `docs/day-1-revision-notes.pdf` contains the first backend revision guide with diagrams and recall questions.
