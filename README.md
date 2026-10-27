# Classroom Allotter

**Last updated:** 2026-10-27  
**Status:** Block 1 complete; Block 2 started with an in-memory rooms endpoint

## Goal

Help class representatives (CRs) find and coordinate classrooms for rescheduled lectures, extra classes, and other activities. Room availability is difficult to confirm when timetable information is spread across courses and room occupancy changes during the day.

## Core workflow

1. A CR enters the date, start time, duration, class size, and any room requirements.
2. The site checks the college timetable and lists rooms without a scheduled class during that interval.
3. Students can report that a room appears empty, with the room number, observation time, and an optional photo.
4. A CR can mark a room as taken for a rescheduled lecture, extra class, or another activity, including its time range.
5. The site shows the source and freshness of each status so users can judge whether the information is current.

## Status rules

Keep these sources distinct:

- **Timetable status:** scheduled free or scheduled busy according to timetable data.
- **Empty-room report:** a time-stamped observation; it expires so an old report is not treated as current.
- **CR activity:** a room is reserved or in use for an activity during a stated time range. It clears at the end time and can be released early.

Availability is checked for the full requested interval, not just at one instant. Room activity must not silently overwrite timetable entries.

## First version (MVP)

- Start with one building or department and sample or manually uploaded timetable data.
- Let a CR search by date, time, duration, class size, and basic room requirements.
- Show rooms that are timetable-free and indicate recent empty-room reports separately.
- Let students submit an empty-room report with an optional evidence photo.
- Let authorized CRs record and release an activity.
- Include basic input validation, useful error messages, and a simple activity history.

Photo uploads should avoid identifiable people. Store image files separately from the main MongoDB room and report documents; keep the file reference and metadata in MongoDB.

## Technology

- **Backend:** Node.js (LTS), Express.js, MongoDB
- **Frontend:** HTML, CSS, and JavaScript for the first simple website
- **Version control:** Git

## System design

See `classroom-allotter-system-design.png` for the system diagram. The source used to draw it is `scripts/draw_system_design.py`.

The first version is one Express application organized into routes, validation, and service modules. The browser sends requests to the API. The API uses MongoDB for room, timetable, report, activity, and user records. Photo files are stored separately, with their references kept in MongoDB. A small scheduled process will expire old empty-room reports and completed activities.

The diagram is a target architecture, not a claim that every block is already implemented. We will add the blocks in sequence and update this section as each decision changes.

## Learning and build order

Learn the backend through a small working slice, then connect the frontend. Build and explain each block before moving on:

1. JavaScript essentials for Node.js: modules, async/await, promises, and errors.
2. HTTP and Express: routes, middleware, request/response, and status codes.
3. MongoDB: documents, CRUD operations, modeling, and indexes.
4. Build the room/timetable availability endpoint.
5. Add empty-room reports and CR activity updates.
6. Add a simple frontend and connect it to the API.
7. Add expiry handling, tests, documentation, and deploy the finished MVP on Vercel.

### Block progress

- **Block 1 — Express API shell:** complete. `GET /api/health` confirms that the API is running.
- **Block 2 — Room and timetable data:** in progress. The API can list, filter, retrieve, and create validated temporary in-memory rooms; MongoDB persistence and timetable data are next.
- **Block 3 — Availability search:** find rooms free for the full requested interval.
- **Block 4 — Empty-room reports:** accept an observation and optional photo reference, with an expiry time.
- **Block 5 — CR activity updates:** mark a room taken for an activity and release it early or at its end time.
- **Block 6 — Browser interface:** search, report, and update room status.
- **Block 7 — Reliability and delivery:** authorization, validation, history, tests, and Vercel deployment.

## Initial data concepts

- **Room:** building, room number, capacity, facilities.
- **Timetable entry:** course, room, start/end time, recurrence or date.
- **Empty-room report:** room, reporter, observed time, optional image reference, expiry.
- **Room activity:** room, CR, activity type, start/end time, status.
- **User:** identity, role (student, CR, or administrator).

The exact fields and permissions will be refined while implementing the MVP.

## Start the current code

From the project directory, run:

```bash
npm install
npm run dev
```

Then manually check these endpoints:

- `http://localhost:3000/api/health` returns JSON containing `ok: true`.
- `http://localhost:3000/api/rooms` returns three temporary sample rooms and `count: 3`.
- `http://localhost:3000/api/rooms?minCapacity=50` returns only rooms with at least 50 seats.
- `http://localhost:3000/api/rooms?minCapacity=abc` returns HTTP status `400` and a validation error.
- `http://localhost:3000/api/rooms/2` returns room A-204.
- `http://localhost:3000/api/rooms/999` returns HTTP status `404` because the room does not exist.

Create a temporary room with a JSON request:

```bash
curl -i -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"code":"C-301","building":"Academic Block C","capacity":80,"facilities":["projector","whiteboard"]}'
```

The response has HTTP status `201` and contains the created room. Reusing the same room code returns `409`. Because rooms are still stored in memory, the newly created room disappears when the server restarts.

The room records currently live in server memory, so they are recreated whenever the server starts. MongoDB persistence is a later step in Block 2.

## Current API routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Confirm that the API server is running. |
| `GET` | `/api/rooms` | Return temporary room records; optionally filter with a positive whole-number `minCapacity` query parameter. |
| `POST` | `/api/rooms` | Validate a JSON request body and create a temporary room; duplicate room codes return `409`. |
| `GET` | `/api/rooms/:id` | Return one room by its positive whole-number ID, or `404` if it does not exist. |

## Later ideas to evaluate

Only add features when user feedback or implementation needs justify them. Possible extensions include timetable import, facility filters, notifications, admin approval, report trust signals, and usage analytics.

## Learning notes

- `LEARNING_LOG.md` counts active learning/build days and records what was learned, built, and planned next.
- `docs/day-1-revision-notes.pdf` summarizes the backend concepts and room API work completed in the first session, with diagrams, flowcharts, practice commands, and recall questions.
- `docs/day-1-revision-notes.html` is the editable source used to generate that PDF.

## Project log

- **2026-10-27:** Chose the Classroom Allotter idea. Added timetable-based availability, student empty-room reports with optional photo evidence, and CR updates for rooms taken by rescheduled lectures, extra classes, or other activities. Chose Node.js, Express.js, and MongoDB. Agreed to keep this README updated as the project changes.
- **2026-10-27:** Added the system-design diagram and implementation sequence. Started Block 1 with a minimal Express API and a health route.
- **2026-10-27:** Drew the system-design image and added Block 1 source: Node.js/Express server, JSON middleware, and `GET /api/health`.
- **2026-10-27:** Confirmed that the completed MVP will be deployed on Vercel after the local features are built and understood.
- **2026-10-27:** Started Block 2 with `GET /api/rooms`, using three in-memory room records to teach API collections before adding MongoDB.
- **2026-10-27:** Added `minCapacity` filtering and validation to `GET /api/rooms`, including an HTTP `400` response for invalid input.
- **2026-10-27:** Added `GET /api/rooms/:id` to teach route parameters and distinguish invalid IDs (`400`) from missing rooms (`404`).
- **2026-10-27:** Added `POST /api/rooms` with JSON-body validation, normalized values, duplicate-code protection, and a `201 Created` response.
- **2026-10-27:** Added Day 1 PDF revision notes covering the concepts and API behavior learned so far.

