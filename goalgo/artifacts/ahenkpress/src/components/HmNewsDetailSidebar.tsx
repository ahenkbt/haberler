import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useListAds } from "@workspace/api-client-react";
import { apiRequest } from "@/lib/queryClient";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { resolveHmOrGlobalSlotHtml } from "@/lib/hmResolveAdSlotHtml";
import { rewriteHmSiteAnchorsInHtml } from "@/lib/rewriteNewsBodyLinksForHm";
import { resolveClientMediaSrc, rewriteInlineHtmlImgSrc, apiUrl } from "@/lib/apiBase";
import { defaultNewsSiteLayoutPrefs, isHmHybridRssEnabled, normalizeHmVitrinTheme, resolveHmCorporateAuthorsEnabled, resolveHmNewsSidebarAuthorsEnabled, type NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { fetchHybridNewsList } from "@/hooks/useHomeHybridNews";
import { mapPublicHybridNewsLinkFields } from "@/lib/hybridNewsHref";
import { ChevronRight } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

type AuthorBrief = { id: number; name: string; title?: string | null; avatarUrl?: string | null };
type NewsBrief = { id: number; slug: string; title: string; imageUrl?: string | null; createdAt: string };
type LatestSidebarItem = {
  id: string | number;
  title: string;
  href: string;
  imageUrl?: string | null;
  dateRaw?: string | null;
};

export function HmNewsDetailSidebar({
  accent = "#e61e25",
  layoutPrefs: layoutPrefsProp,
  excludeNewsId,
  excludeSlug,
  excludeRssItemId,
  /** Portal sayfasında HM bağlamı yokken siteId (sorgu parametresi vb.) */
  portalSiteId = null,
  prefetchedAuthors,
  prefetchedPopular,
}: {
  accent?: string;
  layoutPrefs?: NewsSiteLayoutPrefs;
  excludeNewsId?: number;
  excludeSlug?: string;
  excludeRssItemId?: string;
  portalSiteId?: number | null;
  /** Haber detay BFF'den gelen yazar listesi — ayrı /api/authors çağrısını atlar */
  prefetchedAuthors?: AuthorBrief[] | null;
  /** Haber detay BFF'den gelen popüler liste — ayrı /api/news/popular çağrısını atlar */
  prefetchedPopular?: NewsBrief[] | null;
}) {
  const hmCtx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const siteId = hmCtx?.siteId ?? portalSiteId ?? null;
  const slug = hmCtx?.slug ?? "";
  const domain = hmCtx?.domain ?? null;
  const layoutPrefs = layoutPrefsProp ?? hmCtx?.layoutPrefs ?? defaultNewsSiteLayoutPrefs;
  const hmHybridRssEnabled = siteId != null && isHmHybridRssEnabled(layoutPrefs);
  const showAuthorsPanel = useMemo(() => {
    const theme = normalizeHmVitrinTheme(layoutPrefs.hmVitrinTheme);
    if (theme === "corporate") return resolveHmCorporateAuthorsEnabled(layoutPrefs);
    return resolveHmNewsSidebarAuthorsEnabled(layoutPrefs);
  }, [layoutPrefs]);

  const { data: adSlots = [] } = useListAds();
  const sidebarAdRaw = useMemo(
    () => resolveHmOrGlobalSlotHtml(siteId, layoutPrefs, "sidebar_top", adSlots),
    [siteId, layoutPrefs, adSlots],
  );
  const sidebarAdHtml = useMemo(() => {
    let h = sidebarAdRaw ?? "";
    if (h.trim() && siteId != null && slug) {
      h = rewriteHmSiteAnchorsInHtml(h, { slug, siteId, domain });
    }
    return sanitizeHtml(rewriteInlineHtmlImgSrc(h));
  }, [sidebarAdRaw, siteId, slug, domain]);

  const yazarlarHref = h("/yazarlar");

  const { data: authorsRaw } = useQuery({
    queryKey: ["/api/authors", "detail-sidebar", siteId ?? "global"],
    queryFn: () =>
      siteId != null
        ? (apiRequest(`/api/authors?hmSiteId=${encodeURIComponent(String(siteId))}`) as Promise<AuthorBrief[]>)
        : (apiRequest("/api/authors?limit=12") as Promise<AuthorBrief[]>),
    staleTime: 5 * 60_000,
    enabled: prefetchedAuthors === undefined && showAuthorsPanel,
  });
  const authors = useMemo(() => {
    if (!showAuthorsPanel) return [];
    const raw = prefetchedAuthors !== undefined ? (prefetchedAuthors ?? []) : Array.isArray(authorsRaw) ? authorsRaw : [];
    const out = new Map<string, AuthorBrief>();
    for (const a of raw) {
      const key = String(a.name ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
      if (!key) continue;
      const prev = out.get(key);
      const prevScore = prev ? (prev.avatarUrl ? 2 : 0) + (prev.title ? 1 : 0) : -1;
      const nextScore = (a.avatarUrl ? 2 : 0) + (a.title ? 1 : 0);
      if (!prev || nextScore > prevScore) out.set(key, a);
    }
    return Array.from(out.values());
  }, [authorsRaw, prefetchedAuthors, showAuthorsPanel]);

  const { data: popularRaw = [] } = useQuery({
    queryKey: ["/api/news/popular", siteId ?? "all"],
    queryFn: () =>
      siteId != null
        ? (apiRequest(`/api/news/popular?siteId=${encodeURIComponent(String(siteId))}&limit=12`) as Promise<NewsBrief[]>)
        : (apiRequest("/api/news/popular?limit=12") as Promise<NewsBrief[]>),
    staleTime: 3 * 60_000,
    enabled: prefetchedPopular === undefined,
  });
  const popular = useMemo(() => {
    const source = prefetchedPopular !== undefined ? (prefetchedPopular ?? []) : (popularRaw as NewsBrief[]);
    return source.filter(
      (n) =>
        n &&
        (excludeNewsId == null || n.id !== excludeNewsId) &&
        (!excludeSlug || n.slug !== excludeSlug),
    );
  }, [popularRaw, prefetchedPopular, excludeNewsId, excludeSlug]);

  const { data: latestHybridRaw = [] } = useQuery({
    queryKey: ["/api/news/hybrid", "sidebar-latest", siteId ?? "portal", hmHybridRssEnabled ? "hybrid" : "db"],
    queryFn: async (): Promise<LatestSidebarItem[]> => {
      if (siteId != null && hmHybridRssEnabled) {
        const items = await fetchHybridNewsList({ siteId, limit: 12, offset: 0, rssScope: "all" });
        return items.map((row) => ({
          id: row.id,
          title: row.title,
          href: h(row.href),
          imageUrl: row.imageUrl ?? null,
          dateRaw: row.publishedAt ?? null,
        }));
      }
      if (siteId != null) {
        const rows = (await apiRequest(
          `/api/news?status=published&limit=12&siteId=${encodeURIComponent(String(siteId))}`,
        )) as { items?: NewsBrief[] } | NewsBrief[];
        const items = Array.isArray(rows) ? rows : (rows.items ?? []);
        return items.map((row) => ({
          id: row.id,
          title: row.title,
          href: h(`/haber/${encodeURIComponent(row.slug)}`),
          imageUrl: row.imageUrl ?? null,
          dateRaw: row.createdAt,
        }));
      }
      const r = await fetch(apiUrl("/api/news/hybrid?limit=12&offset=0"));
      if (!r.ok) return [];
      const data = (await r.json()) as {
        items?: Array<{
          id?: string;
          title?: string;
          href?: string;
          imageUrl?: string | null;
          publishedAt?: string | null;
        }>;
      };
      return (data.items ?? [])
        .map((row) => {
          const { id, href } = mapPublicHybridNewsLinkFields(row as Record<string, unknown>);
          return {
            id,
            title: String(row.title ?? ""),
            href: h(href),
            imageUrl: row.imageUrl ?? null,
            dateRaw: row.publishedAt ?? null,
          };
        })
        .filter((item) => item.title && item.href);
    },
    staleTime: 2 * 60_000,
  });

  const latestNews = useMemo(() => {
    const rssExclude = String(excludeRssItemId ?? "").trim();
    return latestHybridRaw.filter((n) => {
      if (!n?.title || !n.href) return false;
      if (excludeSlug && n.href.includes(`/haber/${encodeURIComponent(excludeSlug)}`)) return false;
      if (excludeSlug && n.href.endsWith(`/haber/${excludeSlug}`)) return false;
      if (rssExclude && n.href.includes(`/haberler/rss/${encodeURIComponent(rssExclude)}`)) return false;
      if (rssExclude && n.href.endsWith(`/haberler/rss/${rssExclude}`)) return false;
      if (excludeNewsId != null && String(n.id) === `db:${excludeNewsId}`) return false;
      return true;
    });
  }, [latestHybridRaw, excludeSlug, excludeRssItemId, excludeNewsId]);

  return (
    <aside className="hm-article-sidebar space-y-5 lg:sticky lg:top-24 self-start">
      {authors.length > 0 ? (
        <div className="hm-article-sidebar-panel hm-article-authors-panel rounded-lg border border-amber-100 bg-amber-50/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-amber-200/80 bg-amber-100/60">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Köşe yazarları</h3>
            <Link href={yazarlarHref} className="text-[11px] font-bold hover:underline shrink-0" style={{ color: accent }}>
              Tümü <ChevronRight className="inline h-3 w-3 -mt-0.5" />
            </Link>
          </div>
          <ul className="divide-y divide-amber-100/90 bg-white">
            {authors.slice(0, 8).map((a) => (
              <li key={a.id}>
                <Link
                  href={h(`/yazar/${a.id}`)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50/50 transition-colors"
                >
                  {a.avatarUrl ? (
                    <img
                      src={resolveClientMediaSrc(a.avatarUrl) || a.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: `linear-gradient(135deg, ${accent}, #1e293b)` }}
                    >
                      {a.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{a.name}</p>
                    {a.title ? <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">{a.title}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="p-2 bg-slate-900">
            <Link
              href={yazarlarHref}
              className="flex items-center justify-center gap-1 w-full py-2.5 text-xs font-bold text-white uppercase tracking-wide hover:bg-slate-800 rounded-md transition-colors"
            >
              Tüm yazarlar <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      {sidebarAdHtml?.trim() ? (
        <div
          className="hm-article-ad-slot rounded-lg border border-dashed border-slate-200 bg-white p-2 text-center overflow-hidden min-h-[120px] flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: sidebarAdHtml }}
        />
      ) : (
        <div className="hm-article-ad-slot hm-article-ad-slot--placeholder rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] text-xs text-slate-400 font-medium">
          300 × 250 Reklam
        </div>
      )}

      {latestNews.length > 0 ? (
        <div className="hm-article-sidebar-panel hm-article-latest-panel rounded-lg border border-sky-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-sky-100 bg-sky-50/70">
            <span className="text-sky-500 text-sm" aria-hidden>
              ●
            </span>
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Son haberler</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {latestNews.slice(0, 8).map((n) => {
              const img = n.imageUrl ? resolveClientMediaSrc(n.imageUrl) || n.imageUrl : null;
              return (
                <li key={n.id}>
                  <Link href={n.href} className="flex gap-2.5 p-2.5 hover:bg-sky-50/50 transition-colors group">
                    {img ? (
                      <img src={img} alt="" className="w-16 h-11 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-16 h-11 bg-slate-100 rounded shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-sky-700">
                        {n.title}
                      </p>
                      {n.dateRaw ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {format(new Date(n.dateRaw), "d MMM yyyy", { locale: tr })}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {popular.length > 0 ? (
        <div className="hm-article-sidebar-panel hm-article-popular-panel rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-amber-50/50">
            <span className="text-amber-500 text-sm" aria-hidden>
              ●
            </span>
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">En çok okunanlar</h3>
          </div>
          <ol className="p-2 space-y-1">
            {popular.slice(0, 8).map((n, i) => (
              <li key={n.id}>
                <Link href={h(`/haber/${encodeURIComponent(n.slug)}`)} className="flex gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                  <span
                    className="w-6 h-6 shrink-0 rounded flex items-center justify-center text-[11px] font-black text-white"
                    style={{ background: i < 3 ? accent : "#94a3b8" }}
                  >
                    {i + 1}
                  </span>
                  {n.imageUrl ? (
                    <img src={resolveClientMediaSrc(n.imageUrl) || n.imageUrl} alt="" className="w-14 h-10 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-14 h-10 bg-slate-100 rounded shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:opacity-80">{n.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {format(new Date(n.createdAt), "d MMM yyyy", { locale: tr })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
