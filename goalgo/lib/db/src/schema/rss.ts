import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const rssCampaignsTable = pgTable("rss_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  postType: text("post_type").notNull().default("news"),
  categorySlug: text("category_slug").notNull(),
  tags: text("tags").array().notNull().default([]),
  feeds: text("feeds").array().notNull().default([]),
  sourceType: text("source_type").notNull().default("rss"),
  intervalMinutes: integer("interval_minutes").notNull().default(30),
  daysWindow: integer("days_window").notNull().default(0),
  dailyLimit: integer("daily_limit").notNull().default(0),
  downloadImages: boolean("download_images").notNull().default(false),
  headline: boolean("headline").notNull().default(false),
  breakingKeywords: text("breaking_keywords").array().notNull().default([]),
  minWords: integer("min_words").notNull().default(0),
  translateEnabled: boolean("translate_enabled").notNull().default(false),
  sourceLang: text("source_lang"),
  targetLang: text("target_lang"),
  translateEngine: text("translate_engine"),
  /** Boş: merkez haber (site_id null). Dolu: her hedef site için ayrı kayıt oluşturulur. */
  hmSiteIds: integer("hm_site_ids").array().notNull().default([]),
  /** true: RSS kayıtları merkez akışa (site_id null, Yekpare haberler) da yazılır. */
  includeYekpareHaber: boolean("include_yekpare_haber").notNull().default(false),
  /** true: Haberler.com listesinde yalnızca «tags» ile eşleşen başlıklar kazınır. */
  haberlerFilterByTags: boolean("haberler_filter_by_tags").notNull().default(false),
  addedCount: integer("added_count").notNull().default(0),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rssLogsTable = pgTable("rss_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  level: text("level").notNull().default("info"),
  action: text("action").notNull().default(""),
  message: text("message").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RssCampaignRow = typeof rssCampaignsTable.$inferSelect;
export type RssLogRow = typeof rssLogsTable.$inferSelect;
