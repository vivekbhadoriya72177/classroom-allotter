import { Router } from "express";
import { pool } from "../db.js";
import {
  parseInterval,
  parsePositiveInteger,
  requiredTrimmedString,
} from "../lib/validation.js";

const router = Router();
const allowedTypes = new Set([
  "rescheduled-lecture",
  "extra-class",
  "study-session",
  "other",
]);

router.get("/", async (request, response, next) => {
  const limit = request.query.limit ? parsePositiveInteger(request.query.limit) : 8;

  if (limit === null || limit > 50) {
    return response.status(400).json({ error: "limit must be between 1 and 50" });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          room_activities.id::INTEGER AS id,
          rooms.id::INTEGER AS room_id,
          rooms.code AS room_code,
          room_activities.activity_type,
          room_activities.title,
          room_activities.organizer_name,
          room_activities.start_time,
          room_activities.end_time,
          CASE
            WHEN room_activities.status = 'active'
              AND room_activities.end_time <= CURRENT_TIMESTAMP
              THEN 'completed'
            ELSE room_activities.status
          END AS status,
          room_activities.released_at,
          room_activities.created_at
        FROM room_activities
        JOIN rooms ON rooms.id = room_activities.room_id
        ORDER BY room_activities.created_at DESC
        LIMIT $1
      `,
      [limit],
    );

    response.json({ count: result.rows.length, activities: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  const { roomId, activityType, start, end } = request.body ?? {};
  const parsedRoomId = parsePositiveInteger(roomId);
  const title = requiredTrimmedString(request.body?.title, 120);
  const organizerName = requiredTrimmedString(request.body?.organizerName, 100);
  const interval = parseInterval(start, end, { futureOnly: true });

  if (parsedRoomId === null) {
    return response.status(400).json({ error: "roomId must be a positive whole number" });
  }

  if (!allowedTypes.has(activityType)) {
    return response.status(400).json({ error: "activityType is invalid" });
  }

  if (!title || !organizerName) {
    return response.status(400).json({ error: "title and organizerName are required" });
  }

  if (interval.error) {
    return response.status(400).json({ error: interval.error });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const roomResult = await client.query(
      `SELECT id::INTEGER AS id, code FROM rooms WHERE id = $1 FOR UPDATE`,
      [parsedRoomId],
    );

    if (!roomResult.rows[0]) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Room not found" });
    }

    const timetableConflict = await client.query(
      `
        SELECT course_code, course_name, starts_at, ends_at
        FROM timetable_entries
        WHERE room_id = $1
          AND weekday = EXTRACT(DOW FROM ($2::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata'))
          AND starts_at < ($3::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')::TIME
          AND ends_at > ($2::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')::TIME
        ORDER BY starts_at
        LIMIT 1
      `,
      [parsedRoomId, interval.startIso, interval.endIso],
    );

    if (timetableConflict.rows[0]) {
      await client.query("ROLLBACK");
      return response.status(409).json({
        error: "The room has a timetable class during this interval",
        conflict: { type: "timetable", ...timetableConflict.rows[0] },
      });
    }

    const activityConflict = await client.query(
      `
        SELECT id::INTEGER AS id, title, organizer_name, start_time, end_time
        FROM room_activities
        WHERE room_id = $1
          AND status = 'active'
          AND start_time < $3::TIMESTAMPTZ
          AND end_time > $2::TIMESTAMPTZ
        ORDER BY start_time
        LIMIT 1
      `,
      [parsedRoomId, interval.startIso, interval.endIso],
    );

    if (activityConflict.rows[0]) {
      await client.query("ROLLBACK");
      return response.status(409).json({
        error: "The room already has an activity during this interval",
        conflict: { type: "activity", ...activityConflict.rows[0] },
      });
    }

    const result = await client.query(
      `
        INSERT INTO room_activities (
          room_id,
          activity_type,
          title,
          organizer_name,
          start_time,
          end_time
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id::INTEGER AS id,
          room_id::INTEGER AS room_id,
          activity_type,
          title,
          organizer_name,
          start_time,
          end_time,
          status,
          created_at
      `,
      [
        parsedRoomId,
        activityType,
        title,
        organizerName,
        interval.startIso,
        interval.endIso,
      ],
    );

    await client.query("COMMIT");
    response.status(201).json({
      activity: { ...result.rows[0], room_code: roomResult.rows[0].code },
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    next(error);
  } finally {
    client?.release();
  }
});

router.patch("/:id/release", async (request, response, next) => {
  const activityId = parsePositiveInteger(request.params.id);

  if (activityId === null) {
    return response.status(400).json({ error: "Activity id must be a positive whole number" });
  }

  try {
    const result = await pool.query(
      `
        UPDATE room_activities
        SET status = 'released', released_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'active'
        RETURNING id::INTEGER AS id, status, released_at
      `,
      [activityId],
    );

    if (result.rows[0]) {
      return response.json({ activity: result.rows[0] });
    }

    const exists = await pool.query(`SELECT status FROM room_activities WHERE id = $1`, [activityId]);

    if (!exists.rows[0]) {
      return response.status(404).json({ error: "Activity not found" });
    }

    response.status(409).json({ error: "Activity has already been released" });
  } catch (error) {
    next(error);
  }
});

export default router;
