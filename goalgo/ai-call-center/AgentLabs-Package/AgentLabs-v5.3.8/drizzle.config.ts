import { defineConfig } from "drizzle-kit";
import { databaseNeedsSsl } from "./server/database-pool-options";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ...(databaseNeedsSsl(databaseUrl) ? { ssl: true } : {}),
  },
});
