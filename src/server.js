import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Temporary data for learning how an API returns a collection of records.
// A later block will move room data into MongoDB so it persists after restarts.
const rooms = [
  {
    id: 1,
    code: "A-101",
    building: "Academic Block A",
    capacity: 40,
    facilities: ["whiteboard"],
  },
  {
    id: 2,
    code: "A-204",
    building: "Academic Block A",
    capacity: 60,
    facilities: ["whiteboard", "projector"],
  },
  {
    id: 3,
    code: "B-105",
    building: "Academic Block B",
    capacity: 30,
    facilities: ["smart-board"],
  },
];

// Parse JSON request bodies so later API routes can accept structured data.
app.use(express.json());

// A small route we can use to confirm that the API server is running.
app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "classroom-allotter",
  });
});

// Return rooms, optionally filtered by their minimum seating capacity.
app.get("/api/rooms", (request, response) => {
  const { minCapacity } = request.query;

  if (minCapacity === undefined) {
    return response.json({
      count: rooms.length,
      rooms,
    });
  }

  const parsedMinCapacity = Number(minCapacity);

  if (!Number.isInteger(parsedMinCapacity) || parsedMinCapacity <= 0) {
    return response.status(400).json({
      error: "minCapacity must be a positive whole number",
    });
  }

  const matchingRooms = rooms.filter(
    (room) => room.capacity >= parsedMinCapacity,
  );

  response.json({
    count: matchingRooms.length,
    rooms: matchingRooms,
  });
});

// Create a temporary room from JSON sent in the request body.
app.post("/api/rooms", (request, response) => {
  const { code, building, capacity, facilities = [] } = request.body ?? {};

  if (typeof code !== "string" || code.trim() === "") {
    return response.status(400).json({
      error: "code is required and must be a non-empty string",
    });
  }

  if (typeof building !== "string" || building.trim() === "") {
    return response.status(400).json({
      error: "building is required and must be a non-empty string",
    });
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return response.status(400).json({
      error: "capacity is required and must be a positive whole number",
    });
  }

  const hasInvalidFacility =
    !Array.isArray(facilities) ||
    facilities.some(
      (facility) => typeof facility !== "string" || facility.trim() === "",
    );

  if (hasInvalidFacility) {
    return response.status(400).json({
      error: "facilities must be an array of non-empty strings",
    });
  }

  const normalizedCode = code.trim().toUpperCase();
  const roomAlreadyExists = rooms.some(
    (room) => room.code.toUpperCase() === normalizedCode,
  );

  if (roomAlreadyExists) {
    return response.status(409).json({
      error: "A room with this code already exists",
    });
  }

  const newRoom = {
    id: Math.max(...rooms.map((room) => room.id)) + 1,
    code: normalizedCode,
    building: building.trim(),
    capacity,
    facilities: facilities.map((facility) => facility.trim().toLowerCase()),
  };

  rooms.push(newRoom);

  response.status(201).json({ room: newRoom });
});

// Return one room identified by the id in the URL.
app.get("/api/rooms/:id", (request, response) => {
  const roomId = Number(request.params.id);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return response.status(400).json({
      error: "Room id must be a positive whole number",
    });
  }

  const room = rooms.find((currentRoom) => currentRoom.id === roomId);

  if (room === undefined) {
    return response.status(404).json({
      error: "Room not found",
    });
  }

  response.json({ room });
});

app.listen(port, () => {
  console.log(`Classroom Allotter API listening on port ${port}`);
});
