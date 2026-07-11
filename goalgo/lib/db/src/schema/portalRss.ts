import {
  pgTable,
  text,
  serial,
  integer,
  doublePrecision,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Portal/site hibrit RSS haber havuzu — kalıcı DB deposu.
 *
 * RSS beslemeleri artık ARKA PLANDA (scheduler/worker) çekilir ve buraya UPSERT edilir;
 * sayfa açılışında CANLI RSS isteği yapılmaz. Yekpare haberler ve editör siteleri bu
 * tablodan (kategori bazlı) okur. "Kutu içi RSS" (box scope) bu tabloya YAZILMAZ; o
 * widget canlı RSS olarak kalır.
 *
 * Dedupe: global `dedupe_key` (tek satır). dedupe_key = link varsa `link:<lower(link)>`,
 * yoksa `title:<titleKey>` — aynı kaynak URL/guid tekrar eklenmez.
 */
export const portalRssItemsTable = pgTable(
  "portal_rss_items",
  {
    id: serial("id").primaryKey(),
    /** Besleme kimliği: portal `portal-rss-*` veya `hm-<siteId>-site-<localId>`. */
    feedId: text("feed_id").notNull(),
    /** Editör site kimliği; null = Yekpare portal / global havuz. */
    siteId: integer("site_id"),
    categorySlug: text("category_slug").notNull(),
    /** Sabit RSS öğe kimliği (sha1(link||titleKey)[:16]) — detay linki bununla eşleşir. */
    itemKey: text("item_key").notNull(),
    /** Dedupe anahtarı — (feed_id, dedupe_key) tekil. */
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    titleKey: text("title_key").notNull().default(""),
    /** Kaynak makale URL (guid/link). */
    link: text("link").notNull().default(""),
    spot: text("spot"),
    contentHtml: text("content_html"),
    imageUrl: text("image_url"),
    sourceName: text("source_name"),
    lang: text("lang").notNull().default("tr"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    /** Newsmap — besleme merkez koordinatları. */
    geoLat: doublePrecision("geo_lat"),
    geoLng: doublePrecision("geo_lng"),
    regionKey: text("region_key"),
    regionLabel: text("region_label"),
    countryCode: text("country_code"),
    /** Havuza giriş zamanı — 90 günlük portal_rss_items saklama süzgeci. */
    cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    dedupeUnique: uniqueIndex("portal_rss_items_dedupe_unique").on(table.dedupeKey),
    categoryPublishedIdx: index("portal_rss_items_category_published_idx").on(
      table.categorySlug,
      table.publishedAt,
    ),
    sitePublishedIdx: index("portal_rss_items_site_published_idx").on(
      table.siteId,
      table.publishedAt,
    ),
    publishedIdx: index("portal_rss_items_published_idx").on(table.publishedAt),
  }),
);

export type PortalRssItemRow = typeof portalRssItemsTable.$inferSelect;
export type PortalRssItemInsert = typeof portalRssItemsTable.$inferInsert;

/**
 * BİRLEŞİK GLOBAL RSS OKUNMA SAYACI.
 *
 * Bir RSS makalesinin okunma sayısı TEK ve ORTAKTIR: Yekpare portal ve TÜM editör
 * siteleri aynı sayacı paylaşır. Anahtar `item_key` (sha1(link||titleKey)) makale
 * kimliğidir ve besleme/site fark etmeksizin aynı makale için aynıdır. Bu tablo,
 * `portal_rss_items` tablosundan bağımsızdır (öğe havuzdan düşse bile sayaç korunur).
 */
export const portalRssItemViewsTable = pgTable(
  "portal_rss_item_views",
  {
    /** Sabit global makale kimliği — sitelerden bağımsız (sha1(link||titleKey)[:16]). */
    itemKey: text("item_key").primaryKey(),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
);

export type PortalRssItemViewRow = typeof portalRssItemViewsTable.$inferSelect;
export type PortalRssItemViewInsert = typeof portalRssItemViewsTable.$inferInsert;

/** Portal RSS → news import sonrası yalnızca başlık+spot AI özgünleştirme kuyruğu. */
export const portalRssMetaRewriteJobsTable = pgTable(
  "portal_rss_meta_rewrite_jobs",
  {
    id: serial("id").primaryKey(),
    newsId: integer("news_id").notNull(),
    status: text("status").notNull().default("queued"),
    sourceTitle: text("source_title").notNull(),
    sourceSpot: text("source_spot"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => ({
    newsIdUnique: uniqueIndex("portal_rss_meta_rewrite_jobs_news_id_unique").on(table.newsId),
    statusCreatedIdx: index("portal_rss_meta_rewrite_jobs_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export type PortalRssMetaRewriteJobRow = typeof portalRssMetaRewriteJobsTable.$inferSelect;
