import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { apiUrl, resolveClientMediaSrc, rewriteInlineHtmlImgSrc, normalizeAiNewsHtml } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { fetchHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";
import { readHmNewsArticleBundleCache, writeHmNewsArticleBundleCache } from "@/lib/hmNewsArticleCache";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { resolveHmDomainSlugHint, writeHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsArticleMeta, applyHmNewsSiteHomeMeta, applyNewsArticleStructuredData, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { PORTAL_BRAND_SHORT } from "@/lib/portalBrand";
import { hmPublicSeoPath, hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { rewriteNewsBodyLinksForHm } from "@/lib/rewriteNewsBodyLinksForHm";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import HmRedirectToSonDakika from "@/pages/public/HmRedirectToSonDakika";
import { HmYekpareFeaturesBand } from "@/components/HmYekpareFeaturesBand";
import {
  EditorialNewsArticleLayout,
  EditorialNextArticleDivider,
} from "@/components/news/EditorialNewsArticleLayout";
import { InlineStackedNewsArticle } from "@/components/news/InlineStackedNewsArticle";
import { stackedNewsArticleKey, useNewsInfiniteScroll } from "@/hooks/useNewsInfiniteScroll";
import { EditorialNewsDetailHeader } from "@/components/EditorialNewsDetailHeader";
import { NewsArticleBody } from "@/components/NewsArticleBody";
import { resolveNewsExcerpt } from "@/lib/resolveNewsExcerpt";
import { estimateNewsReadMinutes, filterNewsDisplayTags } from "@/lib/newsArticleMetrics";
import { NewsShareButtons } from "@/components/news/NewsShareButtons";
import { resolveSadeAccent, SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";
import {
  KoseAuthorArticlesBand,
  KoseAuthorByline,
  KoseOtherAuthorsBand,
  type KoseAuthorBrief,
} from "@/components/HmKoseCarouselBands";
import { hasKoseAuthorId, isKoseArticle, resolveArticlePublicPath } from "@/lib/isKoseArticle";
import { HmNewsImage } from "@/components/HmNewsImage";
import { normalizeHmVitrinTheme, resolveHmCorporateAuthorsEnabled } from "@/lib/newsSiteLayout";

interface NewsItem {
  id: number;
  slug: string;
  title: string;
  spot?: string;
  summary?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  categorySlug?: string;
  categoryName?: string;
  authorName?: string;
  authorId?: number | null;
  senderFullName?: string | null;
  senderEmail?: string | null;
  senderPhone?: string | null;
  siteId?: number | null;
  /** `makale` = hm_makaleler veya HM senkron köşe; vitrinde yazar kutusu gösterilir */
  contentKind?: "news" | "makale";
  hmSyncKind?: "news" | "makale" | null;
  rssSourceUrl?: string | null;
  tags?: string[];
  createdAt: string;
  views: number;
}

type AuthorProfile = { id: number; name: string; title?: string | null; avatarUrl?: string | null; bio?: string | null };

type NewsPageBundle = {
  article: NewsItem | null;
  related: NewsItem[];
  kose: {
    author: AuthorProfile | null;
    moreArticles: NewsItem[];
    otherAuthors: KoseAuthorBrief[];
  } | null;
  sidebar: {
    authors: KoseAuthorBrief[];
    popular: NewsItem[];
  };
  redirect?: { status: 301; location: string; searchQuery: string };
};

function isKoseVitrinArticle(n: NewsItem | null): boolean {
  return isKoseArticle(n);
}

export default function HaberDetay() {
  const params = useParams();
  const slug = params.id!;
  const [location, navigate] = useLocation();
  const hmCtx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const host =
    typeof window !== "undefined" ? (window.location.hostname.toLowerCase().split(":")[0] ?? "") : "";
  const { data: settings } = useGetSiteSettings();
  const siteIdForQuery = hmCtx?.siteId ?? null;
  const cachedBundle = useMemo(
    () => readHmNewsArticleBundleCache(siteIdForQuery, slug) as NewsPageBundle | undefined,
    [siteIdForQuery, slug],
  );

  const {
    data: bundle,
    isPending: isLoading,
  } = useQuery<NewsPageBundle | null>({
    queryKey: ["/api/news/page-bundle", slug, siteIdForQuery ?? "portal"],
    queryFn: async () => {
      const q = siteIdForQuery != null ? `?siteId=${encodeURIComponent(String(siteIdForQuery))}` : "";
      const { ok, data } = await fetchPublicJson<NewsPageBundle>(
        apiUrl(`/api/news/page-bundle/${encodeURIComponent(slug)}${q}`),
        { timeoutMs: 12_000, retries: 1 },
      );
      if (ok && data) {
        writeHmNewsArticleBundleCache(siteIdForQuery, slug, data);
        return data;
      }
      return null;
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
    retry: 1,
    placeholderData: cachedBundle ?? undefined,
  });

  const news = bundle?.article ?? null;

  useEffect(() => {
    if (news || isLoading) return;
    const redirect = bundle?.redirect;
    if (!redirect?.location) return;
    const target = h(redirect.location.startsWith("/") ? redirect.location : `/${redirect.location}`);
    window.location.replace(target);
  }, [news, isLoading, bundle?.redirect, h]);

  const articlePublicPath = useMemo(
    () => resolveArticlePublicPath(news ? { ...news, slug: news.slug ?? slug } : { slug }),
    [news, slug],
  );

  /** Köşe yazısı `/haber/` altında açıldıysa kalıcı `/makale/` adresine yönlendir. */
  useEffect(() => {
    const path = (location.split("?")[0] ?? "").trim();
    if (!news || !slug || !isKoseVitrinArticle(news)) return;
    if (!path.includes("/haber/")) return;
    const target = h(articlePublicPath);
    const targetPath = target.split("?")[0] ?? target;
    if (path !== targetPath && !path.endsWith(articlePublicPath)) {
      navigate(target, { replace: true });
    }
  }, [location, slug, news, navigate, h, articlePublicPath]);

  /** Özel alanda eski `/haber/...` adresi → `/tr/{siteSlug}/haber/...` */
  useEffect(() => {
    const path = (location.split("?")[0] ?? "").trim();
    if (!slug || !path.startsWith("/haber/")) return;
    if (isDefaultPortalHost(host)) return;
    let cancelled = false;
    const cachedSlug = resolveHmDomainSlugHint(host);
    if (cachedSlug) {
      navigate(
        `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(cachedSlug)}/haber/${encodeURIComponent(slug)}`,
        { replace: true },
      );
      return;
    }
    void (async () => {
      try {
        const meta = await fetchHmMetaByDomain(host, { timeoutMs: 12_000, retries: 1 });
        if (!meta?.slug || cancelled) return;
        writeHmDomainSlugCache(host, meta.slug);
        navigate(
          `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(meta.slug)}/haber/${encodeURIComponent(slug)}`,
          { replace: true },
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location, slug, host, navigate]);

  const relatedItems = useMemo(() => {
    const rows = bundle?.related ?? [];
    return rows
      .filter((item) => item && item.id !== news?.id && item.slug !== news?.slug)
      .slice(0, 6);
  }, [bundle?.related, news?.id, news?.slug]);

  const siteIdEff = hmCtx?.siteId ?? news?.siteId ?? null;
  const corporateAuthorsEnabled = resolveHmCorporateAuthorsEnabled(hmCtx?.layoutPrefs);
  const isCorporateTheme = normalizeHmVitrinTheme(hmCtx?.layoutPrefs?.hmVitrinTheme) === "corporate";
  const showKosePublic = !isCorporateTheme || corporateAuthorsEnabled;
  const koseArticle =
    showKosePublic &&
    isKoseVitrinArticle(news) &&
    hasKoseAuthorId(news) &&
    (hmCtx != null ? siteIdEff != null : true);

  const koseAuthor = bundle?.kose?.author ?? null;

  const koseAuthorDisplay: KoseAuthorBrief | null =
    koseAuthor ??
    (koseArticle && news?.authorId && news.authorName?.trim()
      ? { id: news.authorId, name: news.authorName.trim() }
      : null);

  const koseMoreArticles = useMemo(() => {
    const items = bundle?.kose?.moreArticles ?? [];
    const seen = new Set<string>();
    const out: NewsItem[] = [];
    for (const x of items) {
      if (x.slug === news?.slug) continue;
      const key =
        String(x.title ?? "")
          .trim()
          .replace(/\s+/g, " ")
          .toLocaleLowerCase("tr-TR") || x.slug;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(x);
      if (out.length >= 12) break;
    }
    return out;
  }, [bundle?.kose?.moreArticles, news?.slug]);

  const koseOtherAuthors = useMemo(() => {
    return (bundle?.kose?.otherAuthors ?? []).filter((a) => a.id !== news?.authorId);
  }, [bundle?.kose?.otherAuthors, news?.authorId]);

  const accent = hmCtx
    ? settings?.primaryColor?.trim() || resolveSadeAccent()
    : resolveSadeAccent(settings?.primaryColor);

  const logoText1 = settings?.logoText1 || "Yek";
  const logoText2 = settings?.logoText2 || "pare";

  useEffect(() => {
    if (!hmCtx) return;
    const sitePathOpts = {
      slug: hmCtx.slug,
      domain: hmCtx.domain,
      domain2: hmCtx.domain2,
      domain3: hmCtx.domain3,
    };
    if (!news) {
      applyHmNewsSiteHomeMeta({
        siteName: hmCtx.displayName,
        description: hmCtx.description || `${hmCtx.displayName} güncel haberler ve köşe yazıları`,
        canonicalPath: hmPublicSeoPath("/", sitePathOpts),
        canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
        imageUrl: hmCtx.layoutPrefs.logoUrl,
        logoUrl: hmCtx.layoutPrefs.logoUrl,
        faviconUrl: hmCtx.layoutPrefs.faviconUrl,
      });
      return () => {
        applyHmNewsSiteHomeMeta({
          siteName: hmCtx.displayName,
          description: hmCtx.description || `${hmCtx.displayName} güncel haberler ve köşe yazıları`,
          canonicalPath: hmPublicSeoPath("/", sitePathOpts),
          canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
          imageUrl: hmCtx.layoutPrefs.logoUrl,
          logoUrl: hmCtx.layoutPrefs.logoUrl,
          faviconUrl: hmCtx.layoutPrefs.faviconUrl,
        });
      };
    }
    const path = hmPublicSeoPath(articlePublicPath, sitePathOpts);
    applyHmNewsArticleMeta({
      siteName: hmCtx.displayName,
      articleTitle: news.title,
      description: news.spot ?? news.title,
      canonicalPath: path,
      canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
      imageUrl: news.imageUrl,
      siteIconUrl: hmCtx.layoutPrefs.faviconUrl || hmCtx.layoutPrefs.logoUrl,
    });
    applyNewsArticleStructuredData({
      headline: news.title,
      description: news.spot ?? news.title,
      canonicalPath: path,
      imageUrl: news.imageUrl,
      datePublished: news.createdAt,
      dateModified: news.createdAt,
      publisherName: hmCtx.displayName,
      publisherUrl: hmPublicSiteOrigin(hmCtx.domain),
      publisherLogoUrl: hmCtx.layoutPrefs.faviconUrl || hmCtx.layoutPrefs.logoUrl,
    });
    return () => {
      applyHmNewsSiteHomeMeta({
        siteName: hmCtx.displayName,
        description: hmCtx.description || `${hmCtx.displayName} güncel haberler ve köşe yazıları`,
        canonicalPath: hmPublicSeoPath("/", sitePathOpts),
        canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
        imageUrl: hmCtx.layoutPrefs.logoUrl,
        logoUrl: hmCtx.layoutPrefs.logoUrl,
        faviconUrl: hmCtx.layoutPrefs.faviconUrl,
      });
    };
  }, [hmCtx, news, slug, articlePublicPath]);

  useEffect(() => {
    if (hmCtx || !news) return;
    const path = articlePublicPath;
    applyHmNewsArticleMeta({
      siteName: PORTAL_BRAND_SHORT,
      articleTitle: news.title,
      description: news.spot ?? news.title,
      canonicalPath: path,
      imageUrl: news.imageUrl,
    });
    applyNewsArticleStructuredData({
      headline: news.title,
      description: news.spot ?? news.title,
      canonicalPath: path,
      imageUrl: news.imageUrl,
      datePublished: news.createdAt,
      dateModified: news.createdAt,
      publisherName: PORTAL_BRAND_SHORT,
    });
    return () => resetSeoToSiteDefaults();
  }, [hmCtx, news, slug, articlePublicPath]);

  const navStickyTop = hmCtx ? "top-0" : "top-[52px]";
  const tumListeHref = hmCtx ? h("/tum-haberler") : "/haberler";
  const catHref = (catSlug: string) =>
    hmCtx ? h(`/kategori/${encodeURIComponent(catSlug)}`) : `/kategori/${encodeURIComponent(catSlug)}`;

  const infiniteScrollEnabled = Boolean(news && !koseArticle);
  const initialArticleKey = useMemo(
    () =>
      news
        ? stackedNewsArticleKey({ source: "db", slug: news.slug, id: news.id })
        : "",
    [news?.id, news?.slug],
  );
  const initialArticleHref = useMemo(() => h(articlePublicPath), [h, articlePublicPath]);
  const infiniteSiteId = hmCtx?.siteId ?? news?.siteId ?? null;

  const {
    stack: stackedArticles,
    loading: loadingNextArticle,
    bottomSentinelRef,
    registerArticleRef,
  } = useNewsInfiniteScroll({
    mode: "portal-hybrid",
    initialKey: initialArticleKey,
    initialHref: initialArticleHref,
    initialSlug: news?.slug ?? slug,
    categorySlug: news?.categorySlug ?? null,
    siteId: infiniteSiteId,
    resolveHref: (article) =>
      h(article.href?.startsWith("/") ? article.href : resolveArticlePublicPath(article)),
    enabled: infiniteScrollEnabled,
  });

  const mainArticleRef = useCallback(
    (el: HTMLElement | null) => {
      if (initialArticleKey) registerArticleRef(initialArticleKey, el);
    },
    [initialArticleKey, registerArticleRef],
  );

  if (isLoading && !news) return (
    <div className="min-h-screen hm-article-detail-page">
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accent} transparent transparent transparent` }} />
      </div>
    </div>
  );

  if (!news) {
    if (bundle?.redirect?.location) {
      return (
        <div className="min-h-screen hm-article-detail-page">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-sm text-gray-500">İlgili haberler aranıyor…</p>
          </div>
        </div>
      );
    }
    if (hmCtx) return <HmRedirectToSonDakika />;
    return (
    <div className="min-h-screen hm-article-detail-page">
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-xl font-bold text-gray-600">Haber bulunamadı.</p>
        <Link href="/" className="hover:underline font-semibold" style={{ color: accent }}>
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
    );
  }

  return (
    <div className="min-w-0 hm-article-detail-page">
      {!hmCtx ? (
        <nav className={`sticky ${navStickyTop} z-40`} style={{ background: accent }}>
          <div className="container mx-auto px-4 h-10 flex items-center gap-1 text-[12px] font-bold uppercase text-white/90 overflow-x-auto">
            <Link href={hmCtx ? h("/") : "/"} className="hover:text-white px-3 h-10 flex items-center hover:bg-black/20 transition-colors whitespace-nowrap">
              Anasayfa
            </Link>
            <Link href={tumListeHref} className="hover:text-white px-3 h-10 flex items-center hover:bg-black/20 transition-colors whitespace-nowrap">
              Haberler
            </Link>
            {news.categorySlug && (
              <Link href={catHref(news.categorySlug)} className="hover:text-white px-3 h-10 flex items-center hover:bg-black/20 transition-colors whitespace-nowrap">
                {news.categoryName}
              </Link>
            )}
          </div>
        </nav>
      ) : null}

      <main className={`max-w-screen-xl mx-auto px-4 pb-6 md:pb-8 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <EditorialNewsArticleLayout
          accent={accent}
          excludeNewsId={news.id}
          excludeSlug={news.slug}
          portalSiteId={hmCtx ? null : news.siteId && news.siteId > 0 ? news.siteId : null}
          prefetchedSidebarAuthors={showKosePublic ? (bundle?.sidebar.authors ?? null) : []}
          prefetchedSidebarPopular={bundle?.sidebar.popular ?? null}
          loadingNext={infiniteScrollEnabled && loadingNextArticle}
          bottomSentinel={
            infiniteScrollEnabled ? (
              <div ref={bottomSentinelRef} className="h-2 w-full" aria-hidden data-news-infinite-sentinel />
            ) : null
          }
          breadcrumbs={
            <div className="text-sm text-gray-500 flex items-center gap-1 flex-wrap">
              <Link href={hmCtx ? h("/") : "/"} className="hover:opacity-80 font-medium" style={{ color: accent }}>
                Anasayfa
              </Link>
              {news.categorySlug && (
                <>
                  <span className="text-slate-300">/</span>
                  <Link href={catHref(news.categorySlug)} className="hover:opacity-80 font-medium" style={{ color: accent }}>
                    {news.categoryName}
                  </Link>
                </>
              )}
              <span className="text-slate-300">/</span>
              <span className="text-gray-800 font-semibold line-clamp-1">{news.title}</span>
            </div>
          }
          articleColumn={
            <>
              <div ref={mainArticleRef}>
                <ArticleBody
                  article={news}
                  hmCtx={hmCtx}
                  accent={accent}
                  koseAuthor={koseAuthorDisplay}
                  koseMoreArticles={koseMoreArticles}
                  koseOtherAuthors={koseOtherAuthors}
                  showKoseBlock={!!koseArticle}
                />
              </div>
              {!koseArticle && relatedItems.length > 0 ? (
                <RelatedNewsBox title="Benzer haberler" items={relatedItems} accent={accent} />
              ) : null}
              {infiniteScrollEnabled
                ? stackedArticles.map((stacked) => (
                    <div key={stacked.key} className="mt-8">
                      <EditorialNextArticleDivider accent={accent} />
                      <InlineStackedNewsArticle
                        article={stacked}
                        accent={accent}
                        registerRef={(el) => registerArticleRef(stacked.key, el)}
                      />
                    </div>
                  ))
                : null}
            </>
          }
        />
        {hmCtx ? <HmYekpareFeaturesBand className="mt-6" /> : null}
      </main>

      {!hmCtx ? (
        <footer className="bg-zinc-900 text-white mt-8 py-6">
          <div className="container mx-auto px-4 text-center text-sm text-zinc-400">
            <Link href="/" className="font-bold text-lg" style={{ color: accent }}>
              {logoText1}
              <span className="text-white">{logoText2}</span>
            </Link>
            <p className="mt-2">{settings?.copyrightText || "© Yekpare. Tüm hakları saklıdır."}</p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function ArticleBody({
  article,
  hmCtx,
  accent,
  koseAuthor,
  koseMoreArticles,
  koseOtherAuthors,
  showKoseBlock,
}: {
  article: NewsItem;
  hmCtx: ReturnType<typeof useHmPublicLinkContextOptional>;
  accent: string;
  koseAuthor: KoseAuthorBrief | null;
  koseMoreArticles: NewsItem[];
  koseOtherAuthors: KoseAuthorBrief[];
  showKoseBlock: boolean;
}) {
  const h = useHmPublicHref();
  const dangerHtml = useMemo(() => {
    let raw = normalizeAiNewsHtml(article.content || "");
    if (hmCtx?.slug) {
      raw = rewriteNewsBodyLinksForHm(raw, {
        slug: hmCtx.slug,
        siteId: hmCtx.siteId,
        domain: hmCtx.domain,
      });
    }
    return rewriteInlineHtmlImgSrc(raw);
  }, [article.content, hmCtx?.slug, hmCtx?.siteId, hmCtx?.domain]);

  const readMin = useMemo(
    () =>
      estimateNewsReadMinutes({
        title: article.title,
        spot: article.spot ?? article.summary ?? article.description,
        content: article.content,
      }),
    [article.content, article.description, article.spot, article.summary, article.title],
  );

  const displayTags = useMemo(() => filterNewsDisplayTags(article.tags), [article.tags]);

  const excerpt = resolveNewsExcerpt(article);
  const heroImageSrc = article.imageUrl ? resolveClientMediaSrc(article.imageUrl) || article.imageUrl : null;
  const isPortalLayout = !hmCtx;
  const hasSenderInfo = Boolean(article.senderFullName || article.senderEmail || article.senderPhone);

  const authorSlot =
    showKoseBlock && koseAuthor ? (
      <KoseAuthorByline author={koseAuthor} accent={accent} href={h(`/yazar/${koseAuthor.id}`)} />
    ) : !showKoseBlock && article.authorName ? (
      <p className="text-sm font-semibold text-slate-600">✍️ {article.authorName}</p>
    ) : null;

  const shareRow = <NewsShareButtons title={article.title} compact className="mb-6" />;

  return (
    <div className="min-w-0">
      <article className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="p-6 md:p-8">
          <EditorialNewsDetailHeader
            accent={accent}
            title={article.title}
            categoryName={article.categoryName}
            categoryVariant={isPortalLayout ? "eyebrow" : "badge"}
            dateLabel={format(new Date(article.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
            readMin={readMin}
            excerpt={excerpt}
            imageSrc={heroImageSrc}
            imageAlt={article.title}
            authorSlot={authorSlot}
            afterExcerptSlot={shareRow}
          />

          <NewsArticleBody
            html={dangerHtml}
            className="hm-article-body yekpare-rich-content yekpare-news-body yekpare-news-body--column prose prose-lg max-w-none text-slate-800 leading-relaxed
            prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mt-8 prose-headings:mb-4
            prose-p:text-slate-700 prose-p:leading-[1.8] prose-p:mb-[1.25em]
            prose-img:rounded-lg prose-img:w-full prose-img:max-w-full prose-img:my-6 prose-img:shadow-sm
            prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50 prose-blockquote:px-4 prose-blockquote:py-2
            [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-6 [&_a]:text-[var(--article-link)]"
            style={{ "--article-link": accent } as CSSProperties}
          />
          {hasSenderInfo ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-black text-slate-900">Haberi gönderen</p>
              <p className="mt-1">
                {article.senderFullName ? <span>{article.senderFullName}</span> : null}
                {article.senderEmail ? <span>{article.senderFullName ? " · " : ""}{article.senderEmail}</span> : null}
                {article.senderPhone ? <span>{article.senderFullName || article.senderEmail ? " · " : ""}{article.senderPhone}</span> : null}
              </p>
            </div>
          ) : null}
          {displayTags.length > 0 && (
            <div className="mt-8 pt-6 border-t flex flex-wrap gap-2">
              <span className="font-bold text-slate-500 text-sm mr-2">Etiketler:</span>
              {displayTags.map((tag) => (
                <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <NewsShareButtons title={article.title} className="mt-8" />

          {showKoseBlock && koseAuthor ? (
            <div className="mt-10 space-y-6">
              {koseMoreArticles.length > 0 ? (
                <KoseAuthorArticlesBand
                  title="Yazarın diğer yazıları"
                  articles={koseMoreArticles}
                  accent={accent}
                  moreHref={h(`/yazar/${koseAuthor.id}`)}
                  moreLabel="Tüm yazıları"
                  excludeSlug={article.slug}
                />
              ) : null}
              <KoseOtherAuthorsBand
                authors={koseOtherAuthors}
                accent={accent}
                excludeAuthorId={koseAuthor.id}
                yazarlarHref={h("/yazarlar")}
              />
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function RelatedNewsBox({
  title,
  items,
  accent,
}: {
  title: string;
  items: NewsItem[];
  accent: string;
}) {
  const h = useHmPublicHref();
  if (!items.length) return null;
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div
        className="flex items-center gap-2 border-b border-slate-100 px-4 py-3"
        style={{ background: `linear-gradient(90deg, ${accent}12, #fff)` }}
      >
        <span className="h-5 w-1 rounded-full" style={{ background: accent }} />
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">{title}</h2>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {items.map((item) => {
          return (
            <Link
              key={item.id}
              href={h(resolveArticlePublicPath(item))}
              className="group flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
                <HmNewsImage src={item.imageUrl} alt="" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                {item.categoryName ? (
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wide" style={{ color: accent }}>
                    {item.categoryName}
                  </p>
                ) : null}
                <h3 className="line-clamp-3 text-sm font-black leading-snug text-slate-900 group-hover:text-sky-700">
                  {item.title}
                </h3>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  {format(new Date(item.createdAt), "d MMM yyyy", { locale: tr })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
