import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkDatabaseConnection } from "./db.js";
import activitiesRouter from "./routes/activities.js";
import availabilityRouter from "./routes/availability.js";
import overviewRouter from "./routes/overview.js";
import reportsRouter from "./routes/reports.js";
import roomsRouter from "./routes/rooms.js";

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(currentDirectory, "..", "public");

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(publicDirectory));

app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.get("/api/health", async (_request, response) => {
  try {
    await checkDatabaseConnection();
    response.json({
      ok: true,
      service: "classroom-allotter",
      database: { connected: true },
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    response.status(503).json({
      ok: false,
      service: "classroom-allotter",
      database: { connected: false },
    });
  }
});

app.use("/api/rooms", roomsRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/overview", overviewRouter);

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found" });
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return response.status(400).json({ error: "Request body must be valid JSON" });
  }

  console.error("Unhandled request error:", error);
  response.status(500).json({ error: "Unexpected server error" });
});

export default app;
