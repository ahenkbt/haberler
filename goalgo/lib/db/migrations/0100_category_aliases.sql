CREATE TABLE IF NOT EXISTS "category_aliases" (
  "id" serial PRIMARY KEY NOT NULL,
  "from_slug" text NOT NULL,
  "to_category_id" integer NOT NULL,
  "site_id" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_aliases_from_slug_unique"
  ON "category_aliases" ("from_slug");
