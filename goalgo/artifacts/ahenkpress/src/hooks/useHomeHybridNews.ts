import { useQuery, type QueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { mapPublicHybridNewsLinkFields } from "@/lib/hybridNewsHref";
import {
  readNewsmapHybridNewsCache,
  writeNewsmapHybridNewsCache,
} from "@/lib/newsmapHybridNewsCache";
import type { HmRssNewsBandItem } from "@/components/HmRssNewsBand";
import { resolveNewsItemImageUrl } from "@/components/HmNewsImage";

const STALE_MS = 5 * 60 * 1000;

/** Anasayfa bootstrap hibrit havuzu — RSS ısınması için üst sınır; DB yedek havuz paralel yüklenir. */
export const HM_HYBRID_FETCH_TIMEOUT_MS = 12_000;

/** Kategori kutusu başına hibrit istek — kısa/sert zaman aşımı. Endpoint'ler prod'da <1.5sn
 * dönüyor; timeout yalnız güvenlik ağı. Zaman aşımında sorgu boş çözülür, spinner asılı kalmaz. */
export const HM_HYBRID_CATEGORY_FETCH_TIMEOUT_MS = 6_000;

export type HomeHybridNewsItem = {
  id: string;
  title: string;
  href: string;
  spot?: string | null;
  content?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  source?: "db" | "rss";
  slug?: string | null;
  feedLabel?: string | null;
  hmSyncKind?: "news" | "makale" | null;
  rssSourceUrl?: string | null;
  /** Canonical origin article URL from API (cross-site pool/sync/portal). */
  originUrl?: string | null;
  sourceSiteUrl?: string | null;
  publishedOnSiteId?: number | null;
  sourceSiteSlug?: string | null;
  isEditorManual?: boolean;
  isFeatured?: boolean;
  contentKind?: "news" | "makale";
  authorId?: number | null;
  /** Newsmap — RSS feed geo (API hybrid yanıtı) */
  geoLat?: number | null;
  geoLng?: number | null;
  regionKey?: string | null;
  regionLabel?: string | null;
  countryCode?: string | null;
};

type HybridNewsResponse = {
  items?: Array<Record<string, unknown>>;
  total?: number;
};

export type HybridNewsListResult = {
  items: HomeHybridNewsItem[];
  total: number;
};

function mapHybridNewsRow(row: Record<string, unknown>): HomeHybridNewsItem | null {
  const title = String(row.title ?? "").trim();
  if (!title) return null;
  const { id, slug, source, href } = mapPublicHybridNewsLinkFields(row);
  return {
    id: String(row.id ?? href),
    title,
    href,
    spot: (row.spot as string | null) ?? null,
    content: (row.content as string | null) ?? null,
    categorySlug: (row.categorySlug as string | null) ?? null,
    categoryName: (row.categoryName as string | null) ?? null,
    categoryColor: (row.categoryColor as string | null) ?? null,
    imageUrl:
      String(row.imageUrl ?? row.image ?? row.thumbnailUrl ?? row.thumbnail ?? "").trim() || null,
    publishedAt: (row.publishedAt as string | null) ?? null,
    source,
    slug: (row.slug as string | null) ?? null,
    feedLabel: (row.feedLabel as string | null) ?? null,
    hmSyncKind: (row.hmSyncKind as "news" | "makale" | null) ?? null,
    contentKind: (row.contentKind as "news" | "makale" | undefined) ?? undefined,
    authorId: typeof row.authorId === "number" ? row.authorId : null,
    rssSourceUrl:
      (row.rssSourceUrl as string | null) ??
      (row.externalUrl as string | null) ??
      null,
    originUrl: (row.originUrl as string | null) ?? null,
    sourceSiteUrl: (row.sourceSiteUrl as string | null) ?? null,
    publishedOnSiteId:
      typeof row.publishedOnSiteId === "number" && Number.isFinite(row.publishedOnSiteId)
        ? row.publishedOnSiteId
        : null,
    sourceSiteSlug: (row.sourceSiteSlug as string | null) ?? null,
    isEditorManual: row.isEditorManual === true,
    isFeatured: row.isFeatured === true,
    geoLat: Number.isFinite(Number(row.geoLat)) ? Number(row.geoLat) : null,
    geoLng: Number.isFinite(Number(row.geoLng)) ? Number(row.geoLng) : null,
    regionKey: (row.regionKey as string | null) ?? null,
    regionLabel: (row.regionLabel as string | null) ?? null,
    countryCode: (row.countryCode as string | null) ?? null,
  };
}

export function hybridNewsListQueryKey(opts: {
  siteId?: number | null;
  categorySlug?: string;
  q?: string;
  limit?: number;
  offset?: number;
  rssOnly?: boolean;
  rssScope?: "box" | "site" | "all";
  global?: boolean;
  newsmap?: boolean;
  dbFirst?: boolean;
  fullHybrid?: boolean;
  scope?: string;
}): readonly unknown[] {
  return [
    "/api/news/hybrid",
    opts.scope ?? "list",
    opts.siteId ?? "portal",
    opts.categorySlug ?? "",
    opts.q ?? "",
    opts.limit ?? 20,
    opts.offset ?? 0,
    opts.rssOnly ? "rss-only" : "mixed",
    opts.rssScope ?? "site",
    opts.global ? "global" : "local",
    opts.newsmap ? "newsmap" : "plain",
    opts.fullHybrid ? "full" : opts.dbFirst === false ? "full" : "db-first",
  ];
}

export async function fetchHybridNewsListResult(opts: {
  siteId?: number | null;
  categorySlug?: string;
  q?: string;
  limit?: number;
  offset?: number;
  rssOnly?: boolean;
  rssScope?: "box" | "site" | "all";
  global?: boolean;
  /** Haber haritası modu — siteId ile birlikte editör havuzu + yabancı RSS. */
  newsmap?: boolean;
  /** Editör Yekpare havuzu — yalnızca merkez havuz (site_id NULL) + RSS. */
  yekparePool?: boolean;
  /** true = tam RSS+DB birleşimi (yavaş). Varsayılan: hızlı DB-first. */
  dbFirst?: boolean;
  fullHybrid?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
}): Promise<HybridNewsListResult> {
  const qs = new URLSearchParams({
    limit: String(opts.limit ?? 20),
    offset: String(opts.offset ?? 0),
  });
  if (opts.categorySlug) qs.set("categorySlug", opts.categorySlug);
  if (opts.q) qs.set("q", opts.q);
  if (opts.siteId != null && opts.siteId > 0) qs.set("siteId", String(opts.siteId));
  if (opts.rssOnly) qs.set("rssOnly", "1");
  if (opts.rssScope) qs.set("rssScope", opts.rssScope);
  const useDbFirst =
    opts.fullHybrid !== true &&
    opts.rssOnly !== true &&
    (opts.dbFirst === true || opts.dbFirst !== false);
  if (opts.yekparePool) qs.set("yekparePool", "1");
  if (useDbFirst) qs.set("dbFirst", "1");
  if (opts.newsmap) qs.set("newsmap", "1");
  if (opts.global) {
    qs.set("global", "1");
    if (!opts.newsmap) qs.set("newsmap", "1");
  }

  const { ok, data, status, timedOut } = await fetchPublicJson<HybridNewsResponse>(
    apiUrl(`/api/news/hybrid?${qs.toString()}`),
    {
      retries: opts.retries ?? 0,
      signal: opts.signal,
      timeoutMs: opts.timeoutMs ?? HM_HYBRID_FETCH_TIMEOUT_MS,
    },
  );
  if (!ok) {
    const reason = timedOut ? "timed out" : status ? `HTTP ${status}` : "failed";
    throw new Error(`Hybrid news fetch ${reason}`);
  }
  if (!Array.isArray(data?.items)) {
    throw new Error("Hybrid news fetch malformed response");
  }
  const items = data.items.map((row) => mapHybridNewsRow(row)).filter((row): row is HomeHybridNewsItem => row != null);
  const total = typeof data.total === "number" && Number.isFinite(data.total) ? data.total : items.length;
  return { items, total };
}

export async function fetchHybridNewsList(opts: {
  siteId?: number | null;
  categorySlug?: string;
  q?: string;
  limit?: number;
  offset?: number;
  rssOnly?: boolean;
  rssScope?: "box" | "site" | "all";
  global?: boolean;
  /** Haber haritası modu — siteId ile birlikte editör havuzu + yabancı RSS. */
  newsmap?: boolean;
  /** Editör Yekpare havuzu — yalnızca merkez havuz (site_id NULL) + RSS. */
  yekparePool?: boolean;
  dbFirst?: boolean;
  fullHybrid?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
}): Promise<HomeHybridNewsItem[]> {
  const result = await fetchHybridNewsListResult(opts);
  // Newsmap havuzunu (global) sessionStorage'a yaz — Faz-1 (dbFirst, kalıcı Türkçe RSS dahil) ve
  // Faz-2 (global zenginleştirme) ikisi de önbelleğe alınır; böylece soğuk açılışta harita
  // önceki havuzla ANINDA boyanır, boş kalmaz (son yazan kazanır — daha büyük Faz-2 üstün gelir).
  if (opts.global && result.items.length > 0) {
    writeNewsmapHybridNewsCache(result.items);
  }
  if (opts.newsmap && opts.siteId != null && opts.siteId > 0 && result.items.length > 0) {
    writeNewsmapHybridNewsCache(result.items);
  }
  return result.items;
}

/** Phase-1 newsmap/anasayfa — DB + sessionStorage; hedef <3s. Havuz küçükse harita az callout açar. */
export const NEWSMAP_HYBRID_INITIAL_LIMIT = 150;
/**
 * Phase-2 RSS zenginleştirme — arka planda birleştirilir. Yabancı/global feed'ler akışa hâkim
 * olduğundan (CNN, NOS vb.) il/geo'ya çözülen TR haberleri kuyruğun altında kalır; havuzu geniş
 * tutup daha fazla ile callout açılmasını sağlarız (backend newsmap sınırı 500).
 */
export const NEWSMAP_HYBRID_FULL_LIMIT = 400;
/** @deprecated use NEWSMAP_HYBRID_FULL_LIMIT */
export const NEWSMAP_HYBRID_PREFETCH_LIMIT = NEWSMAP_HYBRID_FULL_LIMIT;

export function newsmapHybridFastQueryKey(siteId?: number | null): readonly unknown[] {
  if (siteId != null && siteId > 0) {
    return hybridNewsListQueryKey({
      siteId,
      limit: NEWSMAP_HYBRID_INITIAL_LIMIT,
      offset: 0,
      rssScope: "all",
      newsmap: true,
      dbFirst: true,
      scope: "haber-haritasi-hm-fast",
    });
  }
  return hybridNewsListQueryKey({
    siteId: null,
    limit: NEWSMAP_HYBRID_INITIAL_LIMIT,
    offset: 0,
    rssScope: "all",
    global: true,
    dbFirst: true,
    scope: "haber-haritasi-fast",
  });
}

export function newsmapHybridNewsQueryKey(siteId?: number | null): readonly unknown[] {
  if (siteId != null && siteId > 0) {
    return hybridNewsListQueryKey({
      siteId,
      limit: NEWSMAP_HYBRID_FULL_LIMIT,
      offset: 0,
      rssScope: "all",
      newsmap: true,
      scope: "haber-haritasi-hm",
    });
  }
  return hybridNewsListQueryKey({
    siteId: null,
    limit: NEWSMAP_HYBRID_FULL_LIMIT,
    offset: 0,
    rssScope: "all",
    global: true,
    scope: "haber-haritasi",
  });
}

function mergeHybridNewsItemsById(...groups: HomeHybridNewsItem[][]): HomeHybridNewsItem[] {
  const merged = new Map<string, HomeHybridNewsItem>();
  for (const group of groups) {
    for (const item of group) {
      const key = String(item.id || item.href || "").trim();
      if (!key) continue;
      merged.set(key, item);
    }
  }
  return [...merged.values()];
}

/** Prefetch newsmap hybrid — idle'da phase-1 DB, ardından phase-2 RSS (main thread bloklamaz). */
export function prefetchNewsmapHybridNews(queryClient: QueryClient): void {
  const cached = readNewsmapHybridNewsCache();
  const schedule =
    typeof requestIdleCallback === "function"
      ? (fn: () => void) => requestIdleCallback(fn, { timeout: 2000 })
      : (fn: () => void) => window.setTimeout(fn, 150);

  schedule(() => {
    void queryClient.prefetchQuery({
      queryKey: newsmapHybridFastQueryKey(),
      queryFn: ({ signal }) =>
        fetchHybridNewsList({
          siteId: null,
          limit: NEWSMAP_HYBRID_INITIAL_LIMIT,
          offset: 0,
          rssScope: "all",
          global: true,
          dbFirst: true,
          signal,
          timeoutMs: 8_000,
          retries: 0,
        }),
      staleTime: STALE_MS,
      ...(cached?.length ? { initialData: cached } : {}),
    });

    window.setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: newsmapHybridNewsQueryKey(),
        queryFn: ({ signal }) =>
          fetchHybridNewsList({
            siteId: null,
            limit: NEWSMAP_HYBRID_FULL_LIMIT,
            offset: 0,
            rssScope: "all",
            global: true,
            signal,
            timeoutMs: HM_HYBRID_FETCH_TIMEOUT_MS,
            retries: 1,
          }),
        staleTime: STALE_MS,
        ...(cached?.length ? { initialData: cached } : {}),
      });
    }, 1200);
  });
}

export function mapHybridNewsToBandItem(row: HomeHybridNewsItem): HmRssNewsBandItem {
  return {
    id: row.id,
    slug: row.slug ?? null,
    title: row.title,
    spot: row.spot ?? null,
    imageUrl: resolveNewsItemImageUrl(row) || null,
    categoryName: row.categoryName ?? null,
    categorySlug: row.categorySlug ?? null,
    categoryColor: row.categoryColor ?? null,
    feedLabel: row.feedLabel ?? null,
    createdAt: row.publishedAt ?? null,
    href: row.href,
    source: row.source,
    hmSyncKind: row.hmSyncKind ?? null,
    contentKind: row.contentKind,
    authorId: row.authorId ?? null,
    rssSourceUrl: row.rssSourceUrl ?? null,
    isEditorManual: row.isEditorManual === true,
    isFeatured: row.isFeatured === true,
  };
}

async function fetchHomeHybridNews(categorySlug?: string): Promise<HomeHybridNewsItem[]> {
  return fetchHybridNewsList({ categorySlug, limit: 10, offset: 0 });
}

export function useHomeHybridNews(categorySlug?: string) {
  return useQuery({
    queryKey: ["home", "hybrid-news", categorySlug ?? "all"],
    queryFn: () => fetchHomeHybridNews(categorySlug),
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
  });
}

export type PortalRssPreview = {
  id: string;
  title: string;
  spot?: string | null;
  contentHtml?: string | null;
  imageUrl?: string | null;
  href?: string;
  publishedAt?: string | null;
  categoryName?: string | null;
  feedLabel?: string | null;
  sourceName?: string | null;
  feedUrl?: string | null;
  /** `news` tablosuna aktarıldıysa kalıcı slug — `/haber/{slug}` yönlendirmesi. */
  canonicalSlug?: string | null;
  redirect?: boolean;
  /** "editor" → Yekpare Haberleri kaynağı; "portal" → orijinal yayıncı. */
  sourceScope?: "editor" | "portal" | null;
  /** Birleşik global okunma sayısı (Yekpare + tüm editör siteleri ortak). */
  readCount?: number | null;
};

type RssBreakingListItem = {
  id?: string | number | null;
  title?: string | null;
  summary?: string | null;
  contentHtml?: string | null;
  contentText?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
};

type RssBreakingListResponse = {
  items?: RssBreakingListItem[];
};

function rssIdsMatch(a: unknown, b: unknown): boolean {
  const left = String(a ?? "").trim();
  const right = String(b ?? "").trim();
  return !!left && !!right && (left === right || left.startsWith(right) || right.startsWith(left));
}

function escapeRssText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchPortalRssPreviewFromBreakingList(
  itemId: string,
  siteId?: number | null,
): Promise<PortalRssPreview | null> {
  const params = new URLSearchParams({ category: "mixed", limit: "10" });
  if (siteId != null && siteId > 0) params.set("siteId", String(siteId));
  const { ok, data } = await fetchPublicJson<RssBreakingListResponse>(
    apiUrl(`/api/hm/rss-breaking?${params.toString()}`),
    { retries: 1 },
  );
  if (!ok || !Array.isArray(data?.items)) return null;
  const item = data.items.find((row) => rssIdsMatch(row.id, itemId));
  const title = String(item?.title ?? "").trim();
  if (!item || !title) return null;
  const contentText = String(item.contentText ?? "").trim();
  const summary = String(item.summary ?? "").trim();
  const contentHtml =
    String(item.contentHtml ?? "").trim() ||
    (contentText ? `<p>${escapeRssText(contentText)}</p>` : "") ||
    (summary ? `<p>${escapeRssText(summary)}</p>` : "");
  return {
    id: String(item.id ?? itemId),
    title,
    spot: summary || contentText || null,
    contentHtml: contentHtml || null,
    imageUrl: item.imageUrl ?? null,
    href: `/haberler/rss/${encodeURIComponent(String(item.id ?? itemId))}`,
    publishedAt: item.publishedAt ?? null,
    categoryName: item.categoryLabel ?? item.category ?? null,
    feedLabel: item.categoryLabel ?? null,
  };
}

export async function fetchPortalRssPreview(itemId: string, siteId?: number | null): Promise<PortalRssPreview | null> {
  const qs = siteId != null && siteId > 0 ? `?siteId=${encodeURIComponent(String(siteId))}` : "";
  const { ok, data } = await fetchPublicJson<PortalRssPreview>(
    apiUrl(`/api/news/hybrid/rss/${encodeURIComponent(itemId)}${qs}`),
    { retries: 1 },
  );
  if (ok && data?.title) return data;

  const fallback = await fetchPublicJson<PortalRssPreview>(
    apiUrl(`/api/hm/rss-breaking/item/${encodeURIComponent(itemId)}${qs}`),
    { retries: 1 },
  );
  if (fallback.ok && fallback.data?.title) return fallback.data;

  const googleNewsFallback = await fetchPublicJson<PortalRssPreview>(
    apiUrl(`/api/hm/google-news/item/${encodeURIComponent(itemId)}${qs}`),
    { retries: 1 },
  );
  if (googleNewsFallback.ok && googleNewsFallback.data?.title) return googleNewsFallback.data;

  return fetchPortalRssPreviewFromBreakingList(itemId, siteId);
}
