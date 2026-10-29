import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to connect to PostgreSQL");
}

// A pool reuses database connections instead of opening a new connection for
// every query. The connection string stays in .env, never in source code.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
});

export async function checkDatabaseConnection() {
  await pool.query("SELECT 1");
}

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});
