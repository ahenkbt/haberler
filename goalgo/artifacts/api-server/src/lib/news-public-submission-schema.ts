import { db, executeNewsDbWrite, getNewsDbForRead } from "@workspace/db";
import { sql } from "drizzle-orm";

let newsPublicSubmissionColumnsPromise: Promise<void> | null = null;

/**
 * Prod can receive code before the migration job finishes. Since Drizzle's
 * `select()` includes every schema column, missing public-submission columns
 * break all public news reads until the migration catches up.
 * Includes food-recipe columns (0114) — Render prod was 500 on GET /api/news without them.
 */
export function ensureNewsPublicSubmissionColumns(): Promise<void> {
  if (newsPublicSubmissionColumnsPromise) return newsPublicSubmissionColumnsPromise;

  const patch = sql`
    ALTER TABLE "news"
      ADD COLUMN IF NOT EXISTS "sender_full_name" text,
      ADD COLUMN IF NOT EXISTS "sender_email" text,
      ADD COLUMN IF NOT EXISTS "sender_phone" text,
      ADD COLUMN IF NOT EXISTS "is_food_recipe" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "food_recipe_category_slug" text
  `;

  newsPublicSubmissionColumnsPromise = (async () => {
    await executeNewsDbWrite(patch);
    const readDb = getNewsDbForRead();
    if (readDb !== db) {
      await readDb.execute(patch);
    }
  })().catch((e) => {
    newsPublicSubmissionColumnsPromise = null;
    throw e;
  });

  return newsPublicSubmissionColumnsPromise;
}
