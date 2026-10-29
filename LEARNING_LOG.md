# Classroom Allotter Learning Log

This log counts active learning/build days. Add one entry after each day we work on the project so the Git history and learning progress stay aligned.

## Day 1 — 2026-10-27

### Learned

- How the project files and directories are organized.
- Client, server, API, endpoint, request, response, JSON, and middleware basics.
- Express routes and route handlers.
- `GET` and `POST` HTTP methods.
- Query parameters and route parameters.
- Input conversion, validation, and normalization.
- JavaScript array methods: `filter`, `find`, `some`, `map`, and `push`.
- HTTP status codes `200`, `201`, `400`, `404`, and `409`.
- The difference between temporary in-memory data and persistent database data.

### Built

- `GET /api/health`
- `GET /api/rooms`
- Optional `minCapacity` room filtering.
- `GET /api/rooms/:id`
- `POST /api/rooms` with validation and duplicate-code protection.
- Day 1 PDF revision notes with diagrams and recall questions.

### Current limitation

Rooms are stored in memory and reset whenever the server restarts.

### Next learning day

- Review the Day 1 recall questions.
- Learn PostgreSQL concepts and relational schema design.
- Begin replacing in-memory room data with persistent storage.

## Day 2 — 2026-10-28

### Revised

- Reviewed the Day 1 request lifecycle, parameters, validation, array methods, status codes, and in-memory storage.
- Compared PostgreSQL with MySQL and chose PostgreSQL for the project.
- Decided to use Neon PostgreSQL for the interview MVP while keeping the data layer portable to Amazon RDS or Aurora PostgreSQL.
- Chose the standard `pg` driver and plain SQL instead of introducing an ORM at this stage.

### Built

- Created the Neon development database and applied `db/schema.sql`.
- Added `DATABASE_URL` through a Git-ignored `.env` file.
- Installed the standard `pg` PostgreSQL driver.
- Added a reusable connection pool in `src/db.js`.
- Changed server startup and `GET /api/health` to verify PostgreSQL connectivity.
- Added repeatable seed SQL for the three sample rooms and their facilities.
- Migrated `GET /api/rooms` and its `minCapacity` filter to PostgreSQL using a parameterized query, joins, grouping, and array aggregation.
- Migrated `GET /api/rooms/:id` to PostgreSQL while preserving the distinction between invalid input and a missing resource.
- Migrated `POST /api/rooms` with one transaction covering the room, facilities, and join-table rows.
- Removed the temporary in-memory room array; all current room endpoints now use PostgreSQL.
- Changed the database learning approach: inspect real table output, run one query at a time, then connect each SQL operation back to the corresponding JavaScript line.

### Why PostgreSQL

- The project has strongly related rooms, timetable entries, reports, activities, and users.
- Foreign keys and constraints can protect those relationships.
- PostgreSQL has strong timestamp, range, transaction, and overlap-protection capabilities for scheduling.
- Standard PostgreSQL keeps the hosting provider replaceable.

### Next

- Review the first relational schema for rooms and facilities.
- Learn primary keys, foreign keys, unique constraints, check constraints, identity columns, and join tables through the schema.
- Connect the API only after the schema and connection flow are understood.
- Learn how `.env`, `DATABASE_URL`, and deployment environment variables keep configuration and secrets outside source code.
- Refactor repeated room-selection SQL after the full room persistence flow is understood.

## Day 3 — 2026-10-29

### Delivery-mode decision

- Switched temporarily from line-by-line learning to completing a deployable interview MVP.
- Kept the code modular and documented so every block can still be studied afterward.
- Defined “complete” as the full working campus workflow, while documenting production features such as institutional login and direct photo upload as deliberate next steps.

### Built

- Added weekly timetable, expiring empty-room report, and room activity tables with constraints and indexes.
- Added a repeatable migration for the existing Neon learning database and expanded the seed data.
- Split the Express application into room, availability, report, activity, and overview route modules.
- Added shared interval, string, and positive-integer validation.
- Built timetable-aware availability search across a full interval with capacity, building, and facility filters.
- Built transaction-based activity booking with a room lock, timetable conflict detection, activity conflict detection, and early release.
- Built 30-minute empty-room observations with optional notes and hosted photo URLs.
- Built a responsive HTML, CSS, and JavaScript interface for search, booking, reporting, dashboard metrics, and activity history.
- Refactored the original single-page interface into four focused routes: room search, booking, empty-room reporting, and activity history. Search results preserve the selected room and interval when opening the booking page.
- Prepared Vercel's zero-configuration Express entry point, static `public/` assets, Singapore compute region, and deployment guide.
- Expanded the database inspection script to print timetable, report, and activity tables.

### Verified

- Applied the migration and seed successfully to Neon without removing existing room data.
- Confirmed the frontend, health route, overview, room filtering, and availability search respond successfully.
- Confirmed timetable and overlapping activity conflicts both return HTTP `409`.
- Confirmed report creation, activity creation, history, and early release persist correctly.
- Confirmed JavaScript syntax checks pass and the production dependency audit reports zero known vulnerabilities.

### Learn next

- Walk through the new schema one table at a time with visual query output.
- Trace one availability request from the browser through Express and SQL to the response.
- Trace the booking transaction and understand why the room row is locked.
- Add authentication and automated integration tests as separate learning blocks.

