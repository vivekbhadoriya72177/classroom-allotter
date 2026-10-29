import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (_request, response, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::INTEGER FROM rooms) AS total_rooms,
        (
          SELECT COUNT(*)::INTEGER
          FROM room_activities
          WHERE status = 'active'
            AND start_time <= CURRENT_TIMESTAMP
            AND end_time > CURRENT_TIMESTAMP
        ) AS rooms_in_use,
        (
          SELECT COUNT(*)::INTEGER
          FROM empty_room_reports
          WHERE expires_at > CURRENT_TIMESTAMP
        ) AS recent_reports
    `);

    response.json({ overview: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
