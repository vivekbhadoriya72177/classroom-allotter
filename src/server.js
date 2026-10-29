import app from "./app.js";
import { checkDatabaseConnection } from "./db.js";

const port = Number(process.env.PORT ?? 3000);

async function startServer() {
  try {
    await checkDatabaseConnection();

    app.listen(port, () => {
      console.log("PostgreSQL connection verified");
      console.log(`Classroom Allotter listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

// Vercel imports the default export and manages the HTTP listener itself.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
