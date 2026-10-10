/**
 * hm_news_sites.yonelim okuma.
 * Muhalif RSS okuma anında gizlenmez; sağ, sol ve karma aynı haber satırını görür.
 * Sütun yoksa veya okuma düşerse yönelim yok sayılır; haber listesi 500 olmaz.
 * null = yönelim atanmamış (mevcut site): ton ve manşet önceliği uygulanmaz.
 */
import type { SQL } from "drizzle-orm";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { effectiveSiteYonelim, type SiteYonelim } from "./hm-rss-kaynak-yonelim.js";

/** null = yönelim atanmamış (mevcut site). */
export async function getHmSiteYonelim(siteId: number): Promise<SiteYonelim | null> {
  if (!Number.isFinite(siteId) || siteId <= 0) return null;
  try {
    const row = await getHmNewsSiteByIdCompat(siteId);
    return effectiveSiteYonelim(row);
  } catch {
    return null;
  }
}

export async function loadHmSiteYonelimMap(
  siteIds: readonly (number | null | undefined)[],
): Promise<Map<number, SiteYonelim | null>> {
  const ids = [...new Set(siteIds.filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0))];
  const map = new Map<number, SiteYonelim | null>();
  await Promise.all(
    ids.map(async (id) => {
      map.set(id, await getHmSiteYonelim(id));
    }),
  );
  return map;
}

/** Eski süzgeç kaldırıldı. Kapsam aynen döner; mevcut liste sorguları bozulmaz. */
export async function andSiteRssYonelimSql(_siteId: number, scope: SQL): Promise<SQL> {
  return scope;
}

/** Muhalif rss_source_url satırı her sitede görünür. */
export async function newsRssVisibleOnSite(
  _rssSourceUrl: string | null | undefined,
  _siteId: number,
): Promise<boolean> {
  return true;
}
