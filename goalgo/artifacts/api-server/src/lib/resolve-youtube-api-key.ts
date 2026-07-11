import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db";

const YOUTUBE_API_KEY_ENV_NAMES = ["YOUTUBE_API_KEY", "GOOGLE_YOUTUBE_API_KEY", "GOOGLE_API_KEY"];

/**
 * YekTube senkronu için YouTube Data API v3 anahtarı.
 * Öncelik: ortam değişkenleri → admin Genel Ayarlar → Entegrasyonlar.
 */
export async function resolveYoutubeApiKey(): Promise<string | undefined> {
  for (const name of YOUTUBE_API_KEY_ENV_NAMES) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }

  const siteRows = await db.select({ k: siteSettingsTable.youtubeApiKey }).from(siteSettingsTable).limit(1);
  const fromSite = siteRows[0]?.k?.trim();
  if (fromSite) return fromSite;

  return undefined;
}

export function youtubeMissingApiKeyWarning(): string {
  return "YOUTUBE_API_KEY tanımlı değil; kanal videoları/playlistleri YouTube RSS ve HTML yedeğiyle sınırlı alınır.";
}
