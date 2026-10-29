import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../src/db.js";

const requestedPath = process.argv[2];

if (!requestedPath) {
  console.error("Usage: node scripts/run-sql-file.js <path-to-sql-file>");
  process.exit(1);
}

const sqlPath = path.resolve(requestedPath);

try {
  const sql = await readFile(sqlPath, "utf8");
  await pool.query(sql);
  console.log(`Applied ${path.relative(process.cwd(), sqlPath)}`);
} catch (error) {
  console.error(`Unable to apply ${path.relative(process.cwd(), sqlPath)}:`, error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
