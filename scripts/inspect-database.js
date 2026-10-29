import { pool } from "../src/db.js";

async function printQueryResult(title, queryText) {
  const result = await pool.query(queryText);

  console.log(`\n${title}`);
  console.table(result.rows);
}

try {
  await printQueryResult(
    "rooms",
    `
      SELECT
        id::INTEGER AS id,
        code,
        building,
        capacity,
        created_at
      FROM rooms
      ORDER BY id
    `,
  );

  await printQueryResult(
    "facilities",
    `
      SELECT
        id::INTEGER AS id,
        name
      FROM facilities
      ORDER BY id
    `,
  );

  await printQueryResult(
    "room_facilities relationships",
    `
      SELECT
        rooms.id::INTEGER AS room_id,
        rooms.code AS room_code,
        facilities.id::INTEGER AS facility_id,
        facilities.name AS facility_name
      FROM room_facilities
      JOIN rooms ON rooms.id = room_facilities.room_id
      JOIN facilities ON facilities.id = room_facilities.facility_id
      ORDER BY rooms.id, facilities.name
    `,
  );

  await printQueryResult(
    "weekly timetable",
    `
      SELECT
        rooms.code AS room_code,
        timetable_entries.course_code,
        timetable_entries.course_name,
        timetable_entries.weekday,
        timetable_entries.starts_at,
        timetable_entries.ends_at
      FROM timetable_entries
      JOIN rooms ON rooms.id = timetable_entries.room_id
      ORDER BY timetable_entries.weekday, timetable_entries.starts_at, rooms.code
    `,
  );

  await printQueryResult(
    "recent empty-room reports",
    `
      SELECT
        empty_room_reports.id::INTEGER AS id,
        rooms.code AS room_code,
        empty_room_reports.reporter_name,
        empty_room_reports.observed_at,
        empty_room_reports.expires_at,
        empty_room_reports.note
      FROM empty_room_reports
      JOIN rooms ON rooms.id = empty_room_reports.room_id
      ORDER BY empty_room_reports.created_at DESC
      LIMIT 10
    `,
  );

  await printQueryResult(
    "room activity history",
    `
      SELECT
        room_activities.id::INTEGER AS id,
        rooms.code AS room_code,
        room_activities.title,
        room_activities.organizer_name,
        room_activities.start_time,
        room_activities.end_time,
        room_activities.status
      FROM room_activities
      JOIN rooms ON rooms.id = room_activities.room_id
      ORDER BY room_activities.created_at DESC
      LIMIT 10
    `,
  );
} catch (error) {
  console.error("Unable to inspect PostgreSQL:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
