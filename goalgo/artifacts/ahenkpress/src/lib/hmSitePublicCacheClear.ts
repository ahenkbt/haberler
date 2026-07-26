import type { QueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { clearHmNestedMetaCache } from "@/lib/hmNestedMetaCache";
import {
  clearHmDomainSlugCache,
  HM_DOMAIN_SLUG_LS_PREFIX,
  HM_META_LS_PREFIX,
  normalizeHmSlugSegment,
} from "@/lib/hmNestedMetaStorage";
import { clearHmMetaByDomainSessionCache } from "@/lib/fetchHmMetaByDomain";
import { HM_HOME_HYBRID_STORAGE_PREFIX } from "@/lib/hmHomeHybridNewsCache";
import { dispatchHmLayoutUpdated } from "@/lib/hmLayoutUpdatedEvent";
import { readHmJwt } from "@/lib/hmSession";

export type HmSitePublicCacheClearTarget = {
  siteId: number;
  slug: string;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
};

function hostKeys(raw: string | null | undefined): string[] {
  const host = String(raw ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0];
  if (!host) return [];
  const apex = host.replace(/^www\./, "");
  return Array.from(new Set([host, apex, `www.${apex}`]));
}

/** Editör tarayıcısındaki HM vitrin önbelleklerini (meta, hibrit haber, domain slug) temizler. */
export function clearHmSitePublicBrowserCaches(target: HmSitePublicCacheClearTarget): void {
  if (typeof window === "undefined") return;

  const slug = normalizeHmSlugSegment(target.slug);
  const siteId = target.siteId;
  const domains = Array.from(
    new Set([
      ...hostKeys(target.domain),
      ...hostKeys(target.domain2),
      ...hostKeys(target.domain3),
    ]),
  );

  clearHmNestedMetaCache(slug);

  for (const domain of domains) {
    clearHmDomainSlugCache(domain);
    clearHmMetaByDomainSessionCache(domain);
  }
  clearHmMetaByDomainSessionCache();

  const hybridKey = `${HM_HOME_HYBRID_STORAGE_PREFIX}${siteId}`;
  try {
    localStorage.removeItem(hybridKey);
    sessionStorage.removeItem(hybridKey);
  } catch {
    /* quota / private mode */
  }

  try {
    const early = window.__YEKPARE_HM_HOME_HYBRID__;
    if (early?.siteId === siteId) {
      delete window.__YEKPARE_HM_HOME_HYBRID__;
    }
  } catch {
    /* noop */
  }

  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key === `${HM_META_LS_PREFIX}${slug}`) {
        localStorage.removeItem(key);
        continue;
      }
      if (key.startsWith(HM_HOME_HYBRID_STORAGE_PREFIX) && key.endsWith(String(siteId))) {
        localStorage.removeItem(key);
        continue;
      }
      if (key.startsWith(HM_DOMAIN_SLUG_LS_PREFIX)) {
        const host = key.slice(HM_DOMAIN_SLUG_LS_PREFIX.length).toLowerCase();
        if (domains.some((d) => d === host || d === `www.${host}` || host === `www.${d}`)) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    /* quota / private mode */
  }

  if (slug) dispatchHmLayoutUpdated(slug);
}

/** React Query vitrin/meta/hybrid sorgularını yeniden çeker. */
export async function invalidateHmSitePublicQueryCaches(
  queryClient: QueryClient,
  target: HmSitePublicCacheClearTarget,
): Promise<void> {
  const slug = normalizeHmSlugSegment(target.slug);
  const siteId = target.siteId;

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hm-nested-meta", slug] }),
    queryClient.invalidateQueries({ queryKey: ["hm-nested-meta"] }),
    queryClient.invalidateQueries({ queryKey: ["hm-meta-by-domain"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/hm/meta/by-slug", slug] }),
    queryClient.invalidateQueries({ queryKey: ["/api/news/hybrid", siteId] }),
    queryClient.invalidateQueries({ queryKey: ["/api/news/hybrid"] }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        const joined = key.map(String).join("\0").toLowerCase();
        return (
          joined.includes("hm-home-cat-box") ||
          joined.includes("hm-home-hybrid") ||
          joined.includes(String(siteId))
        );
      },
    }),
  ]);
}

/** Edge (CDN) + tarayıcı önbelleğini temizler. */
export async function purgeHmSitePublicEdgeCache(): Promise<{
  ok: boolean;
  message?: string;
  cfPurged?: number;
}> {
  const token = readHmJwt();
  if (!token) return { ok: false, message: "Oturum yok" };
  try {
    const res = await fetch(apiUrl("/api/hm/editor/purge-public-cache"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      error?: string;
      cfPurged?: number;
    };
    if (!res.ok) return { ok: false, message: j.error || j.message || `HTTP ${res.status}` };
    return { ok: true, message: j.message, cfPurged: j.cfPurged };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearHmSitePublicCaches(
  queryClient: QueryClient,
  target: HmSitePublicCacheClearTarget,
): Promise<{ edgeOk: boolean; edgeMessage?: string }> {
  const edge = await purgeHmSitePublicEdgeCache();
  clearHmSitePublicBrowserCaches(target);
  await invalidateHmSitePublicQueryCaches(queryClient, target);
  return { edgeOk: edge.ok, edgeMessage: edge.message };
}
