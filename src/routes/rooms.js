import { Router } from "express";
import { pool } from "../db.js";
import { parsePositiveInteger } from "../lib/validation.js";

const router = Router();

const roomSelect = `
  SELECT
    rooms.id::INTEGER AS id,
    rooms.code,
    rooms.building,
    rooms.capacity,
    COALESCE(
      ARRAY_AGG(facilities.name ORDER BY facilities.name)
        FILTER (WHERE facilities.id IS NOT NULL),
      '{}'
    ) AS facilities
  FROM rooms
  LEFT JOIN room_facilities ON room_facilities.room_id = rooms.id
  LEFT JOIN facilities ON facilities.id = room_facilities.facility_id
`;

router.get("/", async (request, response, next) => {
  const { minCapacity } = request.query;
  const values = [];
  let condition = "";

  if (minCapacity !== undefined) {
    const parsedCapacity = parsePositiveInteger(minCapacity);

    if (parsedCapacity === null) {
      return response.status(400).json({
        error: "minCapacity must be a positive whole number",
      });
    }

    values.push(parsedCapacity);
    condition = "WHERE rooms.capacity >= $1";
  }

  try {
    const result = await pool.query(
      `${roomSelect} ${condition} GROUP BY rooms.id ORDER BY rooms.code`,
      values,
    );
    response.json({ count: result.rows.length, rooms: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  const { code, building, capacity, facilities = [] } = request.body ?? {};

  if (typeof code !== "string" || code.trim() === "") {
    return response.status(400).json({ error: "code is required" });
  }

  if (typeof building !== "string" || building.trim() === "") {
    return response.status(400).json({ error: "building is required" });
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return response.status(400).json({ error: "capacity must be a positive whole number" });
  }

  if (
    !Array.isArray(facilities) ||
    facilities.some((facility) => typeof facility !== "string" || facility.trim() === "")
  ) {
    return response.status(400).json({ error: "facilities must be an array of names" });
  }

  const normalizedCode = code.trim().toUpperCase();
  const normalizedFacilities = [
    ...new Set(facilities.map((facility) => facility.trim().toLowerCase())),
  ].sort();
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const roomResult = await client.query(
      `
        INSERT INTO rooms (code, building, capacity)
        VALUES ($1, $2, $3)
        RETURNING id::INTEGER AS id, code, building, capacity
      `,
      [normalizedCode, building.trim(), capacity],
    );
    const room = roomResult.rows[0];

    for (const facilityName of normalizedFacilities) {
      const facilityResult = await client.query(
        `
          INSERT INTO facilities (name)
          VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `,
        [facilityName],
      );
      await client.query(
        `
          INSERT INTO room_facilities (room_id, facility_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [room.id, facilityResult.rows[0].id],
      );
    }

    await client.query("COMMIT");
    response.status(201).json({
      room: { ...room, facilities: normalizedFacilities },
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");

    if (error.code === "23505") {
      return response.status(409).json({ error: "A room with this code already exists" });
    }

    next(error);
  } finally {
    client?.release();
  }
});

router.get("/:id", async (request, response, next) => {
  const roomId = parsePositiveInteger(request.params.id);

  if (roomId === null) {
    return response.status(400).json({ error: "Room id must be a positive whole number" });
  }

  try {
    const result = await pool.query(
      `${roomSelect} WHERE rooms.id = $1 GROUP BY rooms.id`,
      [roomId],
    );

    if (!result.rows[0]) {
      return response.status(404).json({ error: "Room not found" });
    }

    response.json({ room: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
