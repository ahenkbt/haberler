import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Rss } from "lucide-react";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { apiUrl } from "@/lib/apiBase";
import { apiRequest } from "@/lib/queryClient";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

type RssCategoryRow = {
  slug?: string;
  name?: string;
};

function RssLinksSeo() {
  const ctx = useHmPublicLinkContextOptional();
  useEffect(() => {
    if (!ctx) return;
    applyHmNewsSiteHomeMeta({
      siteName: ctx.displayName,
      browserTitle: `RSS beslemeleri · ${ctx.displayName}`,
      description: `${ctx.displayName} kategori RSS besleme bağlantıları`,
      canonicalPath: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(ctx.slug)}/rss-baglantilari`,
      canonicalOrigin: hmPublicSiteOrigin(ctx.domain),
      imageUrl: ctx.layoutPrefs.logoUrl,
      logoUrl: ctx.layoutPrefs.logoUrl,
      faviconUrl: ctx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [ctx?.slug, ctx?.displayName, ctx?.domain, ctx?.layoutPrefs.logoUrl, ctx?.layoutPrefs.faviconUrl]);
  return null;
}

function RssLinksBody() {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const siteId = ctx?.siteId ?? null;
  const rssEnabled = ctx?.layoutPrefs?.hmNewsRssLinksEnabled !== false;
  const hiddenCategorySlugs = useMemo(
    () =>
      new Set(
        (ctx?.layoutPrefs?.hmNavHiddenCategorySlugs ?? [])
          .map((s) => String(s).trim().toLowerCase())
          .filter(Boolean),
      ),
    [ctx?.layoutPrefs?.hmNavHiddenCategorySlugs],
  );

  const { data: categories = [], isLoading } = useQuery<RssCategoryRow[]>({
    queryKey: ["/api/categories", siteId ?? "hm-rss"],
    queryFn: () =>
      siteId != null
        ? (apiRequest(`/api/categories?siteId=${encodeURIComponent(String(siteId))}`) as Promise<RssCategoryRow[]>)
        : Promise.resolve([]),
    enabled: rssEnabled && siteId != null,
    staleTime: 10 * 60 * 1000,
  });

  const rows = useMemo(
    () =>
      categories
        .map((c) => {
          const slug = String(c.slug ?? "").trim().toLowerCase();
          if (!slug || hiddenCategorySlugs.has(slug)) return null;
          return {
            slug,
            label: String(c.name ?? slug).trim() || slug,
            feedUrl: ctx ? apiUrl(`/api/rss/${encodeURIComponent(ctx.slug)}/${encodeURIComponent(slug)}.xml`) : "",
          };
        })
        .filter((r): r is { slug: string; label: string; feedUrl: string } => r != null),
    [categories, ctx?.slug, hiddenCategorySlugs],
  );

  if (!rssEnabled) {
    return (
      <main className="mx-auto w-full max-w-screen-xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Bu haber sitesi için RSS bağlantıları pasif.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-orange-700">
              <Rss className="h-4 w-4" aria-hidden />
              RSS
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              RSS besleme bağlantıları
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {ctx?.displayName ?? "Haber sitesi"} için RSS akışları kategori bazlı yayınlanır. Haber okuyucunuza
              aşağıdaki XML bağlantılarını ekleyebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Kategori akışları</h2>
          <p className="mt-1 text-xs text-slate-500">
            Genel ana RSS endpoint'i yerine mevcut altyapı kategori akışlarını kullanır.
          </p>
        </div>

        {!rssEnabled ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">
            Bu haber sitesi için RSS bağlantıları pasif durumda.
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.slug} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                <div className="min-w-0">
                  <Link
                    href={h(`/kategori/${encodeURIComponent(row.slug)}?siteId=${encodeURIComponent(String(siteId ?? ""))}`)}
                    className="font-bold text-slate-950 hover:text-red-600 hover:underline"
                  >
                    {row.label}
                  </Link>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">{row.feedUrl}</p>
                </div>
                <a
                  href={row.feedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-orange-700 hover:bg-orange-100"
                >
                  <Rss className="h-3.5 w-3.5" aria-hidden />
                  XML'i aç
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">
            Bu site için kategori bulunamadı; RSS akışı oluşturmak için önce editör panelinden kategori ekleyin.
          </div>
        )}
      </section>
    </main>
  );
}

/** `/tr/:slug/rss-baglantilari` */
export default function HmPublicRssLinksRoute() {
  return (
    <HmNestedLayout>
      <RssLinksSeo />
      <RssLinksBody />
    </HmNestedLayout>
  );
}
