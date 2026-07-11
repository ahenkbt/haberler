import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const videoSourcesTable = pgTable("video_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull().default("youtube"),
  sourceType: text("source_type").notNull().default("channel"),
  channelId: text("channel_id").notNull(),
  url: text("url"),
  logoUrl: text("logo_url"),
  categorySlug: text("category_slug").notNull().default("haberler"),
  active: boolean("active").notNull().default(true),
  isLive: boolean("is_live").notNull().default(false),
  /** true: YouTube Data API; false: RSS + HTML kazıma yedeği */
  useYoutubeApi: boolean("use_youtube_api").notNull().default(true),
  videoCount: integer("video_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VideoSourceRow = typeof videoSourcesTable.$inferSelect;

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id"),
  platform: text("platform").notNull().default("youtube"),
  videoId: text("video_id").notNull(),
  title: text("title").notNull(),
  /** Google index / meta — kullanıcıya gösterilmez; orijinal title korunur */
  seoTitle: text("seo_title"),
  description: text("description"),
  /** Google index / meta — kullanıcıya gösterilmez */
  seoDescription: text("seo_description"),
  seoUpdatedAt: timestamp("seo_updated_at", { withTimezone: true }),
  thumbnail: text("thumbnail"),
  channelName: text("channel_name"),
  channelId: text("channel_id"),
  publishedAt: text("published_at"),
  duration: text("duration"),
  categorySlug: text("category_slug").notNull().default("haberler"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isHeadline: boolean("is_headline").notNull().default(false),
  isStory: boolean("is_story").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  /** false: sahip embed'i kapattı — Yektube'de kapak + YouTube linki */
  embedAllowed: boolean("embed_allowed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VideoRow = typeof videosTable.$inferSelect;

/** Yektube v2 — üye abonelikleri (kanal kaynakları) */
export const yektubeMemberSubscriptionsTable = pgTable(
  "yektube_member_subscriptions",
  {
    id: serial("id").primaryKey(),
    memberId: text("member_id").notNull(),
    sourceId: integer("source_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** Yektube v2 — izleme geçmişi */
export const yektubeWatchHistoryTable = pgTable("yektube_watch_history", {
  id: serial("id").primaryKey(),
  memberId: text("member_id").notNull(),
  videoId: integer("video_id").notNull(),
  sourceId: integer("source_id"),
  youtubeVideoId: text("youtube_video_id").notNull(),
  watchedAt: timestamp("watched_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Yektube v2 — kullanıcı oynatma listeleri */
export const yektubePlaylistsTable = pgTable("yektube_playlists", {
  id: serial("id").primaryKey(),
  memberId: text("member_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const yektubePlaylistItemsTable = pgTable("yektube_playlist_items", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  videoId: integer("video_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Yektube v2 — bildirim / gizlilik tercihleri */
export const yektubeMemberPrefsTable = pgTable("yektube_member_prefs", {
  memberId: text("member_id").primaryKey(),
  notifyNewVideos: boolean("notify_new_videos").notNull().default(true),
  notifyShorts: boolean("notify_shorts").notNull().default(true),
  notifyLive: boolean("notify_live").notNull().default(false),
  saveHistory: boolean("save_history").notNull().default(true),
  avatarUrl: text("avatar_url"),
  linkedChannelUrl: text("linked_channel_url"),
  pushSubscriptionJson: text("push_subscription_json"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
