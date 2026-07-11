import { db } from "@workspace/db";
import { mapSystemSettingsTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Sunucu tarafı Text Search / Place Details için anahtar.
 * Ortamda: önce **açık sunucu** isimli değişkenler (çoğu kurulumda `GOOGLE_PLACES_API_KEY` yanlışlıkla
 * tarayıcı/referrer anahtarı dolduruluyor ve `GOOGLE_MAPS_API_KEY` hiç kullanılmıyordu).
 * Referrer kısıtlı anahtar sunucuda çalışmaz.
 */
export async function resolveGooglePlacesApiKey(): Promise<string | undefined> {
  const fromEnv =
    (process.env.GOOGLE_MAPS_SERVER_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_PLACES_API_KEY ||
      "")
      .trim();
  if (fromEnv) return fromEnv;

  const mapRows = await db
    .select({ k: mapSystemSettingsTable.googlePlacesApiKey })
    .from(mapSystemSettingsTable)
    .where(eq(mapSystemSettingsTable.id, "system"))
    .limit(1);
  const fromMap = mapRows[0]?.k?.trim();
  if (fromMap) return fromMap;
  const siteRows = await db
    .select({
      places: siteSettingsTable.googlePlacesApiKey,
      mapsServer: siteSettingsTable.googleMapsServerKey,
    })
    .from(siteSettingsTable)
    .limit(1);
  const fromSitePlaces = siteRows[0]?.places?.trim();
  if (fromSitePlaces) return fromSitePlaces;
  /** Genel Ayarlar’da “Google Maps sunucu” alanı — Text Search sunucuda çalışır (referrer’sız / IP kısıtlı olmalı). */
  const fromSiteMapsSrv = siteRows[0]?.mapsServer?.trim();
  if (fromSiteMapsSrv) return fromSiteMapsSrv;
  return undefined;
}
