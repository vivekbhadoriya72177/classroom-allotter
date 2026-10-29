import { Router } from "express";
import { pool } from "../db.js";
import {
  optionalTrimmedString,
  parseInterval,
  parsePositiveInteger,
} from "../lib/validation.js";

const router = Router();

router.get("/", async (request, response, next) => {
  const interval = parseInterval(request.query.start, request.query.end);

  if (interval.error) {
    return response.status(400).json({ error: interval.error });
  }

  const minCapacity = request.query.minCapacity
    ? parsePositiveInteger(request.query.minCapacity)
    : 1;

  if (minCapacity === null) {
    return response.status(400).json({
      error: "minCapacity must be a positive whole number",
    });
  }

  const building = optionalTrimmedString(request.query.building, 100);
  const requestedFacility = optionalTrimmedString(request.query.facility, 50);
  const facility = requestedFacility ? requestedFacility.toLowerCase() : requestedFacility;

  if (building === undefined || facility === undefined) {
    return response.status(400).json({ error: "A search filter is invalid" });
  }

  const values = [interval.startIso, interval.endIso, minCapacity];
  const conditions = ["rooms.capacity >= $3"];

  if (building) {
    values.push(building);
    conditions.push(`rooms.building = $${values.length}`);
  }

  if (facility) {
    values.push(facility);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM room_facilities requested_room_facilities
        JOIN facilities requested_facilities
          ON requested_facilities.id = requested_room_facilities.facility_id
        WHERE requested_room_facilities.room_id = rooms.id
          AND requested_facilities.name = $${values.length}
      )
    `);
  }

  const queryText = `
    SELECT
      rooms.id::INTEGER AS id,
      rooms.code,
      rooms.building,
      rooms.capacity,
      COALESCE(
        (
          SELECT ARRAY_AGG(facilities.name ORDER BY facilities.name)
          FROM room_facilities
          JOIN facilities ON facilities.id = room_facilities.facility_id
          WHERE room_facilities.room_id = rooms.id
        ),
        '{}'
      ) AS facilities,
      latest_report.id::INTEGER AS report_id,
      latest_report.reporter_name,
      latest_report.observed_at,
      latest_report.expires_at AS report_expires_at,
      latest_report.note AS report_note
    FROM rooms
    LEFT JOIN LATERAL (
      SELECT id, reporter_name, observed_at, expires_at, note
      FROM empty_room_reports
      WHERE empty_room_reports.room_id = rooms.id
        AND empty_room_reports.expires_at > CURRENT_TIMESTAMP
      ORDER BY empty_room_reports.observed_at DESC
      LIMIT 1
    ) AS latest_report ON TRUE
    WHERE ${conditions.join(" AND ")}
      AND NOT EXISTS (
        SELECT 1
        FROM timetable_entries
        WHERE timetable_entries.room_id = rooms.id
          AND timetable_entries.weekday = EXTRACT(
            DOW FROM ($1::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')
          )
          AND timetable_entries.starts_at < ($2::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')::TIME
          AND timetable_entries.ends_at > ($1::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')::TIME
      )
      AND NOT EXISTS (
        SELECT 1
        FROM room_activities
        WHERE room_activities.room_id = rooms.id
          AND room_activities.status = 'active'
          AND room_activities.start_time < $2::TIMESTAMPTZ
          AND room_activities.end_time > $1::TIMESTAMPTZ
      )
    ORDER BY
      (latest_report.id IS NOT NULL) DESC,
      rooms.capacity,
      rooms.code
  `;

  try {
    const result = await pool.query(queryText, values);
    const rooms = result.rows.map((room) => ({
      id: room.id,
      code: room.code,
      building: room.building,
      capacity: room.capacity,
      facilities: room.facilities,
      timetableStatus: "scheduled-free",
      recentEmptyReport: room.report_id
        ? {
            id: room.report_id,
            reporterName: room.reporter_name,
            observedAt: room.observed_at,
            expiresAt: room.report_expires_at,
            note: room.report_note,
          }
        : null,
    }));

    response.json({
      count: rooms.length,
      interval: { start: interval.startIso, end: interval.endIso },
      rooms,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
