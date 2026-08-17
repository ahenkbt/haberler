/** Editör RSS kampanyası: bu HM sitesine yazan kayıtlar (çoklu hedef dahil). */

export function parsePositiveInt(raw: unknown): number | null {
  const n = parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Postgres integer[] / JSON / "{1,2}" / tek sayı — hepsini sayı dizisine çevir. */
export function normalizeHmSiteIds(raw: unknown): number[] {
  if (raw == null) return [];
  if (typeof raw === "bigint") {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? [Math.trunc(n)] : [];
  }
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? [Math.trunc(raw)] : [];
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (/^\d+$/.test(s)) return [parseInt(s, 10)];
    const inner = s.replace(/^[{\[]\s*/, "").replace(/\s*[}\]]$/, "");
    if (!inner) return [];
    return inner
      .split(/[\s,]+/)
      .map((x) => parseInt(x.replace(/^["']|["']$/g, ""), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  if (Array.isArray(raw) || (typeof raw === "object" && typeof (raw as { length?: unknown }).length === "number")) {
    const out: number[] = [];
    for (const item of Array.from(raw as ArrayLike<unknown>)) {
      for (const n of normalizeHmSiteIds(item)) {
        if (!out.includes(n)) out.push(n);
      }
    }
    return out;
  }
  return [];
}

export function rssCampaignOwnedByHmSite(
  campaign: { hmSiteIds?: unknown; includeYekpareHaber?: boolean | null },
  siteId: number,
): boolean {
  if (!Number.isFinite(siteId) || siteId <= 0) return false;
  return normalizeHmSiteIds(campaign.hmSiteIds).includes(siteId);
}

export function hostFromMaybeUrl(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  try {
    const href = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/\//, "")}`;
    const host = new URL(href).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export function collectFeedHosts(feeds: unknown): string[] {
  const out: string[] = [];
  const list = Array.isArray(feeds) ? feeds : [];
  for (const item of list) {
    const host = hostFromMaybeUrl(String(item ?? ""));
    if (host && !out.includes(host)) out.push(host);
  }
  return out;
}

/** RSS kaynak URL bu kampanyanın feed hostlarından birine mi ait? */
export function rssSourceMatchesHosts(rssSourceUrl: string | null | undefined, hosts: string[]): boolean {
  const url = String(rssSourceUrl ?? "").trim().toLowerCase();
  if (!url) return false;
  const urlHost = hostFromMaybeUrl(url);
  for (const host of hosts) {
    const h = host.toLowerCase().replace(/^www\./, "");
    if (!h) continue;
    if (url.includes(h)) return true;
    if (urlHost && (urlHost === h || urlHost.endsWith(`.${h}`))) return true;
  }
  return false;
}

export function campaignIdFromRequestPath(
  paramsId: unknown,
  path: string | undefined,
): number | null {
  const fromParam = parsePositiveInt(paramsId);
  if (fromParam != null) return fromParam;
  const m = String(path ?? "").match(/\/rss\/campaigns\/(\d+)(?:\/|$)/i);
  return m ? parsePositiveInt(m[1]) : null;
}
