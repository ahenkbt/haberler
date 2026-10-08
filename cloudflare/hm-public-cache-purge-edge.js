/**
 * HM vitrin kenar önbellek temizliği (Cloudflare zone purge).
 * Container `hm-public-cache-purge.ts` ile aynı URL listesi.
 */

const CF_API = "https://api.cloudflare.com/client/v4";
const zoneIdCache = new Map();

function cfToken(env) {
  return String(env?.CLOUDFLARE_API_TOKEN || env?.CF_API_TOKEN || "").trim();
}

function cfAccountId(env) {
  return String(env?.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb").trim();
}

function portalOrigin(env) {
  const raw = String(env?.PORTAL_ORIGIN || env?.YEKPARE_PORTAL_ORIGIN || "https://ahenk.net.tr").trim();
  return raw.replace(/\/+$/, "");
}

function normalizeHost(raw) {
  const h = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.replace(/\.$/, "");
  return h || null;
}

function hostVariants(host) {
  const apex = host.replace(/^www\./, "");
  return Array.from(new Set([host, apex, `www.${apex}`]));
}

/** @param {{ slug: string; domain?: string|null; domain2?: string|null; domain3?: string|null; siteId?: number }} input */
export function buildHmSitePublicCacheUrls(env, input) {
  const slug = String(input.slug ?? "")
    .trim()
    .toLowerCase();
  const urls = new Set();
  const portal = portalOrigin(env);

  if (slug) {
    urls.add(`${portal}/api/hm/meta/by-slug/${encodeURIComponent(slug)}`);
    urls.add(`${portal}/api/hm/meta/by-slug/${encodeURIComponent(slug)}?includePageContent=1`);
    urls.add(`${portal}/api/hm/home-bundle?slug=${encodeURIComponent(slug)}`);
    urls.add(`${portal}/api/hm/home-bundle?slug=${encodeURIComponent(slug)}&sliderLimit=15`);
    urls.add(`${portal}/tr/${encodeURIComponent(slug)}`);
    urls.add(`${portal}/tr/${encodeURIComponent(slug)}/`);
  }

  const hosts = [input.domain, input.domain2, input.domain3]
    .map(normalizeHost)
    .filter(Boolean);

  for (const host of hosts) {
    for (const h of hostVariants(host)) {
      urls.add(`${portal}/api/hm/meta/by-domain?domain=${encodeURIComponent(h)}`);
      urls.add(`https://${h}/api/hm/meta/by-domain?domain=${encodeURIComponent(h)}`);
      urls.add(`https://${h}/`);
      if (slug) {
        urls.add(`https://${h}/tr/${encodeURIComponent(slug)}`);
        urls.add(`https://${h}/tr/${encodeURIComponent(slug)}/`);
        urls.add(`https://${h}/api/hm/home-bundle?slug=${encodeURIComponent(slug)}`);
        urls.add(`https://${h}/api/hm/home-bundle?slug=${encodeURIComponent(slug)}&sliderLimit=15`);
      }
    }
  }

  // Extra page URLs on the site's own hosts (e.g. /kategori/x, /haber/y after a per-site override).
  for (const path of Array.isArray(input.extraPaths) ? input.extraPaths.slice(0, 20) : []) {
    const p = String(path || "");
    if (!p.startsWith("/") || p.startsWith("//")) continue;
    for (const host of hosts) for (const h of hostVariants(host)) urls.add(`https://${h}${p}`);
  }

  const siteId = Number(input.siteId);
  if (Number.isFinite(siteId) && siteId > 0) {
    urls.add(`${portal}/api/hm/home-bundle?siteId=${siteId}`);
    urls.add(`${portal}/api/hm/home-bundle?siteId=${siteId}&sliderLimit=15`);
    for (const host of hosts) {
      for (const h of hostVariants(host)) {
        urls.add(`https://${h}/api/hm/home-bundle?siteId=${siteId}`);
        urls.add(`https://${h}/api/hm/home-bundle?siteId=${siteId}&sliderLimit=15`);
      }
    }
  }

  return Array.from(urls);
}

async function resolveZoneId(env, hostname) {
  const apex = hostname.replace(/^www\./, "");
  if (zoneIdCache.has(apex)) return zoneIdCache.get(apex) ?? null;
  const token = cfToken(env);
  if (!token) {
    zoneIdCache.set(apex, null);
    return null;
  }
  try {
    const qs = new URLSearchParams({ name: apex, "account.id": cfAccountId(env) });
    const res = await fetch(`${CF_API}/zones?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const json = await res.json().catch(() => null);
    const id = json?.result?.[0]?.id ? String(json.result[0].id) : null;
    zoneIdCache.set(apex, id);
    return id;
  } catch {
    zoneIdCache.set(apex, null);
    return null;
  }
}

async function purgeFilesOnZone(env, zoneId, files) {
  const token = cfToken(env);
  if (!token || files.length === 0) return 0;
  let purged = 0;
  for (let i = 0; i < files.length; i += 30) {
    const chunk = files.slice(i, i + 30);
    try {
      const res = await fetch(`${CF_API}/zones/${zoneId}/purge_cache`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ files: chunk }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success !== false) purged += chunk.length;
    } catch {
      /* best-effort */
    }
  }
  return purged;
}

/** @param {{ siteId: number; slug: string; domain?: string|null; domain2?: string|null; domain3?: string|null }} input */
export async function purgeHmSitePublicEdgeCache(env, input) {
  const urls = buildHmSitePublicCacheUrls(env, input);
  const token = cfToken(env);
  if (!token) {
    return {
      siteId: input.siteId,
      slug: input.slug,
      urls,
      cfPurged: 0,
      cfSkippedReason: "CLOUDFLARE_API_TOKEN yok",
    };
  }

  const byZone = new Map();
  for (const url of urls) {
    try {
      const host = new URL(url).hostname;
      const zoneId = await resolveZoneId(env, host);
      if (!zoneId) continue;
      const list = byZone.get(zoneId) ?? [];
      list.push(url);
      byZone.set(zoneId, list);
    } catch {
      /* ignore */
    }
  }

  let cfPurged = 0;
  for (const [zoneId, files] of byZone) {
    cfPurged += await purgeFilesOnZone(env, zoneId, files);
  }

  return {
    siteId: input.siteId,
    slug: input.slug,
    urls,
    cfPurged,
    cfSkippedReason: cfPurged === 0 ? "Zone purge eşleşmedi veya yetki yok" : undefined,
  };
}
