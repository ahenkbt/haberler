import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Editör sitesine özel haber düzenlemesi (per-site override).
 * Yekpare merkez havuzundaki (paylaşılan) bir haberin başlık/spot/içerik/görselini
 * YALNIZCA ilgili editör sitesinde değiştirmek için. Orijinal haber ve diğer siteler
 * değişmez; okuma anında bu site için override uygulanır.
 */
export const newsSiteOverridesTable = pgTable(
  "news_site_overrides",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id").notNull(),
    siteId: integer("site_id").notNull(),
    title: text("title"),
    spot: text("spot"),
    content: text("content"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    articleSiteUnique: uniqueIndex("news_site_overrides_article_site_unique").on(table.articleId, table.siteId),
  }),
);

export type NewsSiteOverrideRow = typeof newsSiteOverridesTable.$inferSelect;
export type NewsSiteOverrideInsert = typeof newsSiteOverridesTable.$inferInsert;
