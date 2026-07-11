import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const aiSettingsTable = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  openaiApiKey: text("openai_api_key").notNull().default(""),
  openaiModel: text("openai_model").notNull().default("gpt-4o-mini"),
  language: text("language").notNull().default("tr"),
  autoUniquify: boolean("auto_uniquify").notNull().default(false),
  wordCount: integer("word_count").notNull().default(600),
  postStatus: text("post_status").notNull().default("draft"),
  rssUrls: text("rss_urls").notNull().default(""),
  maxPerSource: integer("max_per_source").notNull().default(5),
  intervalHours: integer("interval_hours").notNull().default(24),
  autoRunEnabled: boolean("auto_run_enabled").notNull().default(false),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  totalAiRuns: integer("total_ai_runs").notNull().default(0),
  /** openai | gemini | deepseek | auto (OpenAI → Gemini yedek zinciri) */
  preferredProvider: text("preferred_provider").notNull().default("auto"),
  /** Portal RSS import sonrası başlık+spot AI özgünleştirme kuyruğu */
  portalRssAiMetaEnabled: boolean("portal_rss_ai_meta_enabled").notNull().default(false),
  /** null = env PORTAL_RSS_AI_META_LIMIT (varsayılan 20) */
  portalRssAiMetaHourlyLimit: integer("portal_rss_ai_meta_hourly_limit"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AiSettingsRow = typeof aiSettingsTable.$inferSelect;
