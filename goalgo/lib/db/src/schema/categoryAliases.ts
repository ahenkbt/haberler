import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Kategori birleştirme (merge) sonrası eski slug → hedef kategori eşlemesi.
 * Birleştirilen kategorilerin eski slug'ları bu tablo üzerinden hedefe yönlendirilir,
 * böylece eski linkler kırılmaz.
 */
export const categoryAliasesTable = pgTable(
  "category_aliases",
  {
    id: serial("id").primaryKey(),
    fromSlug: text("from_slug").notNull(),
    toCategoryId: integer("to_category_id").notNull(),
    /** Alias siteye özelse; null = global alias. */
    siteId: integer("site_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fromSlugUnique: uniqueIndex("category_aliases_from_slug_unique").on(table.fromSlug),
  }),
);

export type CategoryAliasRow = typeof categoryAliasesTable.$inferSelect;
export type CategoryAliasInsert = typeof categoryAliasesTable.$inferInsert;
