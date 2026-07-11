import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull().default("#CC0000"),
  /** Doluysa kategori yalnızca bu HM site vitrininde listelenir; merkez `/haberler` ve diğer sitelerde gizlenir. */
  exclusiveSiteId: integer("exclusive_site_id"),
  /** Siteye özel kategorilerde varsayılan sıra; HM vitrin sırası `layout_json.hmCategorySortSlugs` ile geçersiz kılınabilir. */
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Category = typeof categoriesTable.$inferSelect;
