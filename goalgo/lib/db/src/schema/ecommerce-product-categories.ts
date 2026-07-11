import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const ecommerceProductCategoriesTable = pgTable("ecommerce_product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id"),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EcommerceProductCategoryRow = typeof ecommerceProductCategoriesTable.$inferSelect;
