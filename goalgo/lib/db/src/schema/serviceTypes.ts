import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/** Birleşik hizmet / talep tipi sözlüğü (Faz 0 omurga) */
export const yekpareServiceTypesTable = pgTable("yekpare_service_types", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  domain: text("domain").notNull(),
  labelTr: text("label_tr").notNull(),
  descriptionTr: text("description_tr"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type YekpareServiceTypeRow = typeof yekpareServiceTypesTable.$inferSelect;
