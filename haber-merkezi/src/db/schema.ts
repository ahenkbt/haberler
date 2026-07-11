import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** Haber merkezinde kayıtlı vitrin / HM sitesi (Yekpare DB’de değil). */
export const newsSites = pgTable("news_sites", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  primaryDomain: text("primary_domain"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Yekpare (veya başka operatör) API anahtarı — sadece hash saklanır. */
export const operatorApiKeys = pgTable("operator_api_keys", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
