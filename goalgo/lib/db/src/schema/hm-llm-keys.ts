import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Haber Merkezi LLM anahtarları.
 * site_id NULL = merkez (global). Dolu = tek haber sitesi.
 * Canlı hm_news_sites birincil anahtarsız ve yinelenen id içerdiği için site_id FK'sizdir.
 * api_key_enc düz metin olarak API yanıtına konmaz.
 * Şifreleme: goalgo/artifacts/api-server/src/lib/hm-llm-crypto.ts (HM_LLM_KEY_SECRET).
 */
export const hmLlmProviderKeysTable = pgTable("hm_llm_provider_keys", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id"),
  provider: text("provider").notNull(),
  apiKeyEnc: text("api_key_enc").notNull().default(""),
  apiKeyLast4: text("api_key_last4").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  model: text("model").notNull().default(""),
  priority: integer("priority").notNull().default(100),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HmLlmProviderKeyRow = typeof hmLlmProviderKeysTable.$inferSelect;
