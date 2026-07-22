import type { WorldBriefContinentGroup, WorldBriefItem } from "@/hooks/useWorldBriefs";
import { isExternalNewsHref, portalRssPreviewPath } from "@/lib/hybridNewsHref";

export function isWorldBriefInternalRssPreviewPath(href: string): boolean {
  return /\/haberler\/rss\//i.test(String(href ?? "").trim());
}

/**
 * Dünyadan Kısa Kısa kartları — Site içi RSS önizlemesi (`/haberler/rss/...`).
 * Harici NTV vb. kaynaklara doğrudan çıkılmaz.
 */
export function resolveWorldBriefHref(h: (path: string) => string, item: WorldBriefItem): string {
  const raw = String(item.href ?? "").trim();
  const id = String(item.id ?? "").trim();

  if (isWorldBriefInternalRssPreviewPath(raw)) {
    return h(raw.startsWith("/") ? raw : `/${raw}`);
  }
  if (id.startsWith("edge-") || id.startsWith("rss:edge-")) {
    const edgeId = id.startsWith("rss:") ? id.slice(4) : id;
    return h(portalRssPreviewPath(edgeId));
  }
  if (raw.startsWith("/") && !isExternalNewsHref(raw)) return h(raw);
  // Eski harici href / ntv: id — site içi önizlemeye zorla (mümkünse edge id yoksa listeye dön)
  if (id && !id.startsWith("db:")) {
    const rssId = id.startsWith("rss:") ? id.slice(4) : id.replace(/^ntv:/, "edge-");
    if (rssId.startsWith("edge-")) return h(portalRssPreviewPath(rssId));
  }
  return h("/kisa-kisa");
}

export function activeWorldBriefContinents(continents: WorldBriefContinentGroup[]): WorldBriefContinentGroup[] {
  return continents.filter((c) => c.items.length > 0 || c.countries.some((co) => co.items.length > 0));
}

/** Kıta / ülke gruplarından tekilleştirilmiş, yeniden eskiye sıralı haber listesi. */
export function flattenWorldBriefItems(
  continents: WorldBriefContinentGroup[],
  opts?: { continentId?: string; limit?: number },
): WorldBriefItem[] {
  const continentId = String(opts?.continentId ?? "").trim();
  const limit = opts?.limit ?? 0;
  const selected = continentId ? continents.filter((c) => c.id === continentId) : continents;

  const seen = new Set<string>();
  const out: WorldBriefItem[] = [];

  for (const continent of selected) {
    for (const item of continent.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    for (const country of continent.countries) {
      for (const item of country.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
  }

  out.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  if (limit > 0) return out.slice(0, limit);
  return out;
}

export function formatWorldBriefTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
