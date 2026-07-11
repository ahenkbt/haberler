import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

/** Küresel haber haritası RSS kaynakları — kıta/ülke bazlı yönetim. */
export const globalMapNewsFeedsTable = pgTable("global_map_news_feeds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  /** global | europe | asia | africa | americas | oceania | middle-east */
  continent: text("continent").notNull(),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  /** news | video | both */
  category: text("category").notNull().default("news"),
  /** global | continent | country */
  scope: text("scope").notNull().default("country"),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  /** Harita pin koordinatı — RSS öğesinde konum yoksa feed merkezi kullanılır. */
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  /** tr-ankara, kktc-lefkosa, az-baku vb. */
  regionKey: text("region_key"),
  regionLabel: text("region_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GlobalMapNewsFeed = typeof globalMapNewsFeedsTable.$inferSelect;
export type NewGlobalMapNewsFeed = typeof globalMapNewsFeedsTable.$inferInsert;

/**
 * Konum bazlı Bilgi Ağacı / Vikipedi özet önbelleği (cache-through).
 * Anahtar: normalize slug + tür (il/ulke/sehir) + dil. TR il/ülke/şehir kartları
 * ve /bilgiagaci statik linkleri DB'den anında servis edilir; yoksa Vikipedi'den
 * çekilip buraya kaydedilir. `refreshedAt` N günden eskiyse arka planda tazelenir.
 */
export const locationWikiCacheTable = pgTable("location_wiki_cache", {
  id: serial("id").primaryKey(),
  /** Normalize edilmiş yer slug'ı (ASCII, küçük harf) — ör. "istanbul", "almanya". */
  slug: text("slug").notNull(),
  /** il | ulke | sehir | topic */
  placeType: text("place_type").notNull().default("il"),
  /** tr | en */
  lang: text("lang").notNull().default("tr"),
  /** Vikipedi'de çözümlenen kanonik başlık. */
  title: text("title").notNull(),
  /** Özet / extract metni. */
  extract: text("extract").notNull().default(""),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  /** Bu kaydın çözümlendiği dil (tr veya en fallback). */
  resolvedLang: text("resolved_lang"),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Son Vikipedi tazeleme zamanı — TTL/stale hesabı için. */
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LocationWikiCacheRow = typeof locationWikiCacheTable.$inferSelect;
export type NewLocationWikiCacheRow = typeof locationWikiCacheTable.$inferInsert;
