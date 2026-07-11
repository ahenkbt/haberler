import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** Silinen / bulunamayan haber slug → arama yönlendirmesi (SEO 301). */
export const newsSlugRedirectsTable = pgTable(
  "news_slug_redirects",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    /** null = Yekpare merkez; HM editör site id. */
    siteId: integer("site_id"),
    title: text("title"),
    categorySlug: text("category_slug"),
    searchQuery: text("search_query").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugSiteUnique: uniqueIndex("news_slug_redirects_slug_site_unique").on(table.slug, table.siteId),
    slugIdx: index("news_slug_redirects_slug_idx").on(table.slug),
  }),
);

export type NewsSlugRedirectRow = typeof newsSlugRedirectsTable.$inferSelect;
export type NewsSlugRedirectInsert = typeof newsSlugRedirectsTable.$inferInsert;
