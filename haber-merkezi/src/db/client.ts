import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const url = process.env["DATABASE_URL"]?.trim();
if (!url) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
export { pool };
