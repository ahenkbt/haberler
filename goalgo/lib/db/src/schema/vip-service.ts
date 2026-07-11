import { pgTable, serial, varchar, boolean, integer, numeric, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { mapBusinessesTable } from "./haritalar";

export const vipServiceVehiclesTable = pgTable("vip_service_vehicles", {
  id: serial("id").primaryKey(),
  mapBusinessId: varchar("map_business_id")
    .notNull()
    .references(() => mapBusinessesTable.id, { onDelete: "cascade" }),
  segment: text("segment").notNull().default("Premium Sedan"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  maxPassengers: integer("max_passengers").notNull().default(4),
  maxLuggage: integer("max_luggage").notNull().default(2),
  amenities: jsonb("amenities").notNull().default([]),
  imageUrl: text("image_url"),
  hourlyPrice: numeric("hourly_price", { precision: 12, scale: 2 }),
  dailyPrice: numeric("daily_price", { precision: 12, scale: 2 }),
  zonePrice: numeric("zone_price", { precision: 12, scale: 2 }),
  kdvDahil: boolean("kdv_dahil").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
