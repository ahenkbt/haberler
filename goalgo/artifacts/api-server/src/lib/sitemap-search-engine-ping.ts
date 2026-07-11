/**
 * Site haritası güncellendiğinde arama motorlarına otomatik ping.
 *
 * Ortam:
 * - SITEMAP_PING_DISABLED=1 — tüm pingleri kapat
 * - SITEMAP_PING_COOLDOWN_MS — aynı URL için minimum aralık (varsayılan 5 dk)
 * - SITE_PUBLIC_ORIGIN — yekpare.net kök
 */
import { eq } from "drizzle-orm";
import { db, hmNewsSitesTable, type NewsRow } from "@workspace/db";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { sitePublicOrigin } from "./site-public-origin.js";
import { logger } from "./logger.js";

const DEFAULT_COOLDOWN_MS = 5 * 60_000;

type PingEngine = {
  id: string;
  label: string;
  buildPingUrl: (sitemapUrl: string) => string;
};

const PING_ENGINES: PingEngine[] = [
  {
    id: "google",
    label: "Google",
    buildPingUrl: (u) => `https://www.google.com/ping?sitemap=${encodeURIComponent(u)}`,
  },
  {
    id: "bing",
    label: "Bing",
    buildPingUrl: (u) => `https://www.bing.com/ping?sitemap=${encodeURIComponent(u)}`,
  },
  {
    id: "yandex",
    label: "Yandex",
    buildPingUrl: (u) => `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(u)}`,
  },
];

const lastPingByUrl = new Map<string, number>();

function pingDisabled(): boolean {
  return process.env.SITEMAP_PING_DISABLED?.trim() === "1";
}

function pingCooldownMs(): number {
  const raw = Number(process.env.SITEMAP_PING_COOLDOWN_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COOLDOWN_MS;
}

function hmSiteOrigin(domain: string | null | undefined, fallback: string): string {
  const d = String(domain ?? "").trim();
  if (!d) return fallback;
  try {
    return new URL(/^https?:\/\//i.test(d) ? d : `https://${d}`).origin;
  } catch {
    return fallback;
  }
}

/** Haber yayını sonrası pinglenecek kanonik site haritası URL'leri (kök /api yok). */
export async function buildNewsSitemapPingUrls(
  row: Pick<NewsRow, "siteId" | "status">,
): Promise<string[]> {
  if (row.status !== "published") return [];
  const portalBase = sitePublicOrigin().replace(/\/+$/, "");
  const urls = new Set<string>();

  if (row.siteId == null) {
    urls.add(`${portalBase}/sitemap.xml`);
    urls.add(`${portalBase}/news-yekpare.xml`);
    return [...urls];
  }

  const site = await getHmNewsSiteByIdCompat(row.siteId);
  if (site) {
    const origin = hmSiteOrigin(site.domain, portalBase);
    urls.add(`${origin}/sitemap.xml`);
    urls.add(`${origin}/news-hm-${encodeURIComponent(site.slug)}.xml`);
    return [...urls];
  }

  urls.add(`${portalBase}/sitemap.xml`);
  return [...urls];
}

/** RSS batch / toplu güncelleme — portal + tüm aktif HM alan adları. */
export async function buildPortalNewsSitemapPingUrls(): Promise<string[]> {
  const portalBase = sitePublicOrigin().replace(/\/+$/, "");
  const urls = new Set<string>([`${portalBase}/sitemap.xml`, `${portalBase}/news-yekpare.xml`]);

  const hmSites = await db
    .select({ slug: hmNewsSitesTable.slug, domain: hmNewsSitesTable.domain })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true));

  for (const site of hmSites) {
    const origin = hmSiteOrigin(site.domain, portalBase);
    urls.add(`${origin}/sitemap.xml`);
    urls.add(`${origin}/news-hm-${encodeURIComponent(site.slug)}.xml`);
  }

  return [...urls];
}

async function pingOneEngine(engine: PingEngine, sitemapUrl: string): Promise<{ ok: boolean; status?: number }> {
  try {
    const res = await fetch(engine.buildPingUrl(sitemapUrl), {
      method: "GET",
      signal: AbortSignal.timeout(12_000),
    });
    return { ok: res.ok || res.status === 200 || res.status === 204, status: res.status };
  } catch (err) {
    logger.debug({ engine: engine.id, sitemapUrl, err }, "[sitemap-ping] ping hatası");
    return { ok: false };
  }
}

/** Tek site haritası URL'sini Google + Bing + Yandex'e bildir (cooldown'lu). */
export async function pingSitemapToSearchEngines(sitemapUrl: string): Promise<void> {
  if (pingDisabled()) return;
  const url = String(sitemapUrl ?? "").trim();
  if (!url.startsWith("http")) return;

  const now = Date.now();
  const last = lastPingByUrl.get(url) ?? 0;
  if (now - last < pingCooldownMs()) return;
  lastPingByUrl.set(url, now);

  for (const engine of PING_ENGINES) {
    const result = await pingOneEngine(engine, url);
    logger.info(
      { engine: engine.id, sitemapUrl: url, status: result.status, ok: result.ok },
      `[sitemap-ping] ${engine.label} bildirimi`,
    );
  }
}

/** Birden fazla site haritasını arama motorlarına bildir (async). */
export function scheduleSitemapSearchEnginePing(urls: string[]): void {
  if (pingDisabled() || urls.length === 0) return;
  void (async () => {
    for (const url of urls) {
      await pingSitemapToSearchEngines(url);
    }
  })().catch((err) => {
    logger.warn({ err }, "[sitemap-ping] toplu ping hatası");
  });
}

/** Haber satırına göre ilgili site haritalarını pingler. */
export function scheduleNewsSitemapPing(row: Pick<NewsRow, "siteId" | "status">): void {
  void buildNewsSitemapPingUrls(row)
    .then((urls) => {
      scheduleSitemapSearchEnginePing(urls);
    })
    .catch((err) => {
      logger.warn({ err }, "[sitemap-ping] haber site haritası ping hatası");
    });
}

/** RSS batch sonrası portal + tüm HM site haritalarını pingler. */
export function schedulePortalNewsSitemapPing(): void {
  void buildPortalNewsSitemapPingUrls()
    .then((urls) => scheduleSitemapSearchEnginePing(urls))
    .catch((err) => logger.warn({ err }, "[sitemap-ping] portal batch ping hatası"));
}
