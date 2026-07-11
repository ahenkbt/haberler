import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";

export const homepageModulesTable = pgTable("homepage_modules", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  position: integer("position").notNull().default(0),
  accentColor: text("accent_color"),
});

export type HomepageModuleRow = typeof homepageModulesTable.$inferSelect;
