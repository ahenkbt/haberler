/**
 * hm_news_sites.yonelim okuma ve liste SQL süzgeci.
 * Sütun yoksa veya okuma düşerse karma sayılır; haber listesi 500 olmaz.
 */
import { and, sql, type SQL } from "drizzle-orm";
import { newsTable } from "@workspace/db";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import {
  muhalifRssUrlPatternSource,
  normalizeSiteYonelim,
  rssSourceAllowedForSiteYonelim,
  type SiteYonelim,
} from "./hm-rss-kaynak-yonelim.js";

export async function getHmSiteYonelim(siteId: number): Promise<SiteYonelim> {
  if (!Number.isFinite(siteId) || siteId <= 0) return "karma";
  try {
    const row = await getHmNewsSiteByIdCompat(siteId);
    return normalizeSiteYonelim(row?.yonelim);
  } catch {
    return "karma";
  }
}

/** Sol sitede süzgeç yok. Sağ ve karma muhalif rss_source_url satırını görmez. */
export function excludeMuhalifRssSourceSql(): SQL {
  const pattern = muhalifRssUrlPatternSource();
  return sql`NOT (lower(btrim(coalesce(${newsTable.rssSourceUrl}, ''))) ~ ${pattern})`;
}

export async function andSiteRssYonelimSql(siteId: number, scope: SQL): Promise<SQL> {
  const yonelim = await getHmSiteYonelim(siteId);
  if (yonelim === "sol") return scope;
  return and(scope, excludeMuhalifRssSourceSql())!;
}

export async function newsRssVisibleOnSite(rssSourceUrl: string | null | undefined, siteId: number): Promise<boolean> {
  const yonelim = await getHmSiteYonelim(siteId);
  return rssSourceAllowedForSiteYonelim({ url: rssSourceUrl }, yonelim);
}
