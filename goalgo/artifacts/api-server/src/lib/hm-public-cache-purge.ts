import { eq } from "drizzle-orm";
import { getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { PORTAL_ORIGIN } from "./portalBrand.js";

export type HmPublicCachePurgeResult = {
  siteId: number;
  slug: string;
  urls: string[];
  cfPurged: number;
  cfSkippedReason?: string;
};

const CF_API = "https://api.cloudflare.com/client/v4";
const zoneIdCache = new Map<string, string | null>();

function cfToken(): string {
  return String(process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "").trim();
}

function cfAccountId(): string {
  return String(process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb").trim();
}

function normalizeHost(raw: string | null | undefined): string | null {
  const h = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.replace(/\.$/, "");
  return h || null;
}

function hostVariants(host: string): string[] {
  const apex = host.replace(/^www\./, "");
  return Array.from(new Set([host, apex, `www.${apex}`]));
}

/** Ziyaretçi teması / menü bu uçlardan okunur — kenar önbelleği bayat kalırsa tema değişmez. */
export function buildHmSitePublicCacheUrls(input: {
  slug: string;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  siteId?: number;
}): string[] {
  const slug = String(input.slug ?? "")
    .trim()
    .toLowerCase();
  const urls = new Set<string>();
  const portalOrigins = [
    PORTAL_ORIGIN.replace(/\/+$/, ""),
    "https://yekpare.net", // geçiş: eski köken cache temizliği
  ];

  if (slug) {
    for (const portal of portalOrigins) {
      urls.add(`${portal}/api/hm/meta/by-slug/${encodeURIComponent(slug)}`);
      urls.add(`${portal}/api/hm/meta/by-slug/${encodeURIComponent(slug)}?includePageContent=1`);
      urls.add(`${portal}/tr/${encodeURIComponent(slug)}`);
      urls.add(`${portal}/tr/${encodeURIComponent(slug)}/`);
    }
  }

  const hosts = [input.domain, input.domain2, input.domain3]
    .map(normalizeHost)
    .filter((h): h is string => Boolean(h));

  for (const host of hosts) {
    for (const h of hostVariants(host)) {
      for (const portal of portalOrigins) {
        urls.add(`${portal}/api/hm/meta/by-domain?domain=${encodeURIComponent(h)}`);
      }
      urls.add(`https://${h}/api/hm/meta/by-domain?domain=${encodeURIComponent(h)}`);
      urls.add(`https://${h}/`);
      if (slug) {
        urls.add(`https://${h}/tr/${encodeURIComponent(slug)}`);
        urls.add(`https://${h}/tr/${encodeURIComponent(slug)}/`);
      }
    }
  }

  const siteId = Number(input.siteId);
  if (Number.isFinite(siteId) && siteId > 0) {
    for (const portal of portalOrigins) {
      urls.add(`${portal}/api/hm/home-bundle?siteId=${siteId}`);
    }
    for (const host of hosts) {
      for (const h of hostVariants(host)) {
        urls.add(`https://${h}/api/hm/home-bundle?siteId=${siteId}`);
      }
    }
  }

  return Array.from(urls);
}

async function resolveZoneId(hostname: string): Promise<string | null> {
  const apex = hostname.replace(/^www\./, "");
  if (zoneIdCache.has(apex)) return zoneIdCache.get(apex) ?? null;
  const token = cfToken();
  if (!token) {
    zoneIdCache.set(apex, null);
    return null;
  }
  try {
    const account = cfAccountId();
    const qs = new URLSearchParams({ name: apex, "account.id": account });
    const res = await fetch(`${CF_API}/zones?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      result?: Array<{ id?: string }>;
    } | null;
    const id = json?.result?.[0]?.id ? String(json.result[0].id) : null;
    zoneIdCache.set(apex, id);
    return id;
  } catch {
    zoneIdCache.set(apex, null);
    return null;
  }
}

async function purgeFilesOnZone(zoneId: string, files: string[]): Promise<number> {
  const token = cfToken();
  if (!token || files.length === 0) return 0;
  let purged = 0;
  // CF purge_cache files max ~30 per request
  for (let i = 0; i < files.length; i += 30) {
    const chunk = files.slice(i, i + 30);
    try {
      const res = await fetch(`${CF_API}/zones/${zoneId}/purge_cache`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ files: chunk }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
      if (res.ok && json?.success !== false) purged += chunk.length;
    } catch {
      /* best-effort */
    }
  }
  return purged;
}

/** Cloudflare zone purge (token varsa). Token yoksa urls yine döner — Worker meta cache kapalı olmalı. */
export async function purgeHmSitePublicEdgeCache(input: {
  siteId: number;
  slug: string;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): Promise<HmPublicCachePurgeResult> {
  const urls = buildHmSitePublicCacheUrls(input);
  const token = cfToken();
  if (!token) {
    return {
      siteId: input.siteId,
      slug: input.slug,
      urls,
      cfPurged: 0,
      cfSkippedReason: "CLOUDFLARE_API_TOKEN yok — kenar meta önbelleği Worker'da kapatıldı; tarayıcı önbelleği temizlendi.",
    };
  }

  const byZone = new Map<string, string[]>();
  for (const url of urls) {
    try {
      const host = new URL(url).hostname;
      const zoneId = await resolveZoneId(host);
      if (!zoneId) continue;
      const list = byZone.get(zoneId) ?? [];
      list.push(url);
      byZone.set(zoneId, list);
    } catch {
      /* ignore bad url */
    }
  }

  let cfPurged = 0;
  for (const [zoneId, files] of byZone) {
    cfPurged += await purgeFilesOnZone(zoneId, files);
  }

  return {
    siteId: input.siteId,
    slug: input.slug,
    urls,
    cfPurged,
    cfSkippedReason: cfPurged === 0 ? "Zone purge eşleşmedi veya yetki yok" : undefined,
  };
}

export async function purgeHmSitePublicEdgeCacheBySiteId(siteId: number): Promise<HmPublicCachePurgeResult | null> {
  const [row] = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  if (!row) return null;
  return purgeHmSitePublicEdgeCache({
    siteId: row.id,
    slug: row.slug,
    domain: row.domain,
    domain2: row.domain2,
    domain3: row.domain3,
  });
}
