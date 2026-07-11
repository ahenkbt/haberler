import { db, siteSettingsTable } from "@workspace/db";

/** Konu/stock görsel yedekleri için Magnific anahtarı (site ayarı veya ortam değişkeni). */
export async function getMagnificApiKey(): Promise<string | null> {
  const fromEnv = String(process.env.MAGNIFIC_API_KEY ?? "").trim();
  if (fromEnv) return fromEnv;

  const rows = await db
    .select({ magnificApiKey: siteSettingsTable.magnificApiKey })
    .from(siteSettingsTable)
    .limit(1);
  const key = String(rows[0]?.magnificApiKey ?? "").trim();
  return key || null;
}
