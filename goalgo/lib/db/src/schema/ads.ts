import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";

export const adSlotsTable = pgTable("ad_slots", {
  id: serial("id").primaryKey(),
  slotKey: text("slot_key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  html: text("html").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
});

export type AdSlotRow = typeof adSlotsTable.$inferSelect;
