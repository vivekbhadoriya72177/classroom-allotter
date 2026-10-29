import { Router } from "express";
import { pool } from "../db.js";
import {
  optionalTrimmedString,
  parsePositiveInteger,
  requiredTrimmedString,
} from "../lib/validation.js";

const router = Router();
const reportLifetimeMilliseconds = 30 * 60 * 1000;

router.post("/", async (request, response, next) => {
  const parsedRoomId = parsePositiveInteger(request.body?.roomId);
  const reporterName = requiredTrimmedString(request.body?.reporterName, 100);
  const note = optionalTrimmedString(request.body?.note, 300);
  const photoUrl = optionalTrimmedString(request.body?.photoUrl, 2_000);
  const observedAt = request.body?.observedAt
    ? new Date(request.body.observedAt)
    : new Date();

  if (parsedRoomId === null) {
    return response.status(400).json({ error: "roomId must be a positive whole number" });
  }

  if (!reporterName) {
    return response.status(400).json({ error: "reporterName is required" });
  }

  if (note === undefined || photoUrl === undefined) {
    return response.status(400).json({ error: "Report details are invalid or too long" });
  }

  if (Number.isNaN(observedAt.getTime())) {
    return response.status(400).json({ error: "observedAt must be a valid date-time" });
  }

  if (observedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return response.status(400).json({ error: "observedAt cannot be in the future" });
  }

  if (observedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    return response.status(400).json({ error: "observedAt cannot be more than 24 hours old" });
  }

  if (photoUrl && !/^https?:\/\//i.test(photoUrl)) {
    return response.status(400).json({ error: "photoUrl must begin with http:// or https://" });
  }

  const expiresAt = new Date(observedAt.getTime() + reportLifetimeMilliseconds);

  try {
    const result = await pool.query(
      `
        WITH inserted_report AS (
          INSERT INTO empty_room_reports (
            room_id,
            reporter_name,
            observed_at,
            expires_at,
            note,
            photo_url
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        )
        SELECT
          inserted_report.id::INTEGER AS id,
          inserted_report.room_id::INTEGER AS room_id,
          rooms.code AS room_code,
          inserted_report.reporter_name,
          inserted_report.observed_at,
          inserted_report.expires_at,
          inserted_report.note,
          inserted_report.photo_url,
          inserted_report.created_at
        FROM inserted_report
        JOIN rooms ON rooms.id = inserted_report.room_id
      `,
      [
        parsedRoomId,
        reporterName,
        observedAt.toISOString(),
        expiresAt.toISOString(),
        note,
        photoUrl,
      ],
    );

    response.status(201).json({ report: result.rows[0] });
  } catch (error) {
    if (error.code === "23503") {
      return response.status(404).json({ error: "Room not found" });
    }

    next(error);
  }
});

export default router;
