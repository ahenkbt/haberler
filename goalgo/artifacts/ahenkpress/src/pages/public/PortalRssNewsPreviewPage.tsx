import { useMemo, useEffect, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { fetchHybridNewsList, fetchPortalRssPreview, type HomeHybridNewsItem, type PortalRssPreview } from "@/hooks/useHomeHybridNews";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { readHmRssPreviewFromHomeCache } from "@/lib/hmHomeHybridNewsCache";
import { EditorialNewsDetailHeader } from "@/components/EditorialNewsDetailHeader";
import { EditorialNewsArticleLayout } from "@/components/news/EditorialNewsArticleLayout";
import { NewsArticleBody } from "@/components/NewsArticleBody";
import { resolveClientMediaSrc, normalizeAiNewsHtml, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import { stripDuplicateHeroImageFromHtml } from "@/lib/stripDuplicateHeroImageFromHtml";
import { SADE_PUBLIC_POST_HERO_MAIN_CLASS } from "@/lib/yekpareSadeTheme";
import { estimateNewsReadMinutes } from "@/lib/newsArticleMetrics";
import { NewsShareButtons } from "@/components/news/NewsShareButtons";
import { RssNewsDisclaimer } from "@/components/news/RssNewsDisclaimer";
import { stripExternalAnchorsFromHtml } from "@/lib/sanitizeHtml";

const SADE_ACCENT = "#0EA5E9";
function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripLeadingBodyImage(html: string): string {
  return String(html ?? "")
    .replace(/^\s*<figure\b[^>]*>[\s\S]*?<img\b[\s\S]*?<\/figure>/i, "")
    .replace(/^\s*<p\b[^>]*>\s*<img\b[^>]*>\s*<\/p>/i, "")
    .replace(/^\s*<div\b[^>]*>\s*<img\b[^>]*>\s*<\/div>/i, "")
    .replace(/^\s*<img\b[^>]*>/i, "")
    .trimStart();
}

function RssArticleBlock({
  article,
  accent = SADE_ACCENT,
}: {
  article: PortalRssPreview;
  accent?: string;
}) {
  const image =
    article.imageUrl ? resolveClientMediaSrc(article.imageUrl) || article.imageUrl : null;

  const bodyHtml = useMemo(() => {
    const raw = article.contentHtml || article.spot || "";
    const normalized = rewriteInlineHtmlImgSrc(normalizeAiNewsHtml(raw));
    const withoutExternal = stripExternalAnchorsFromHtml(normalized);
    const deduped = image ? stripDuplicateHeroImageFromHtml(withoutExternal, image) : withoutExternal;
    return image ? stripLeadingBodyImage(deduped) : deduped;
  }, [article, image]);

  const readMin = useMemo(
    () =>
      estimateNewsReadMinutes({
        title: article.title,
        spot: article.spot,
        content: article.contentHtml,
      }),
    [article.contentHtml, article.spot, article.title],
  );

  const feedLabel = "feedLabel" in article ? article.feedLabel : null;
  const sourceScope = "sourceScope" in article ? article.sourceScope : null;
  const sourceName =
    ("sourceName" in article ? article.sourceName : null) ||
    (sourceScope === "editor" ? "Yekpare Haberleri" : null) ||
    feedLabel ||
    "RSS";
  const feedUrl = "feedUrl" in article ? article.feedUrl : null;
  const publishedAt = article.publishedAt || null;

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-sm">
      <div className="p-5 md:p-8">
        <EditorialNewsDetailHeader
          accent={accent}
          title={decodeHtmlEntities(article.title)}
          categoryName={"categoryName" in article ? article.categoryName : undefined}
          categoryVariant="eyebrow"
          dateLabel={fmtDate(publishedAt)}
          readMin={readMin}
          excerpt={bodyHtml && bodyHtml.length > 80 ? null : article.spot}
          imageSrc={image}
          imageAlt={article.title}
          authorSlot={
            feedLabel ? <p className="text-sm font-semibold text-slate-600">{feedLabel}</p> : null
          }
          afterExcerptSlot={<NewsShareButtons title={article.title} compact className="mb-6" />}
        />
        <NewsArticleBody
          html={bodyHtml}
          className="yekpare-rich-content yekpare-news-body yekpare-news-body--column prose prose-lg max-w-none text-slate-800 leading-relaxed
            prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mt-8 prose-headings:mb-4
            prose-p:text-slate-700 prose-p:leading-[1.8] prose-p:mb-[1.25em]
            prose-img:rounded-lg prose-img:w-full prose-img:max-w-full prose-img:my-6 prose-img:shadow-sm
            prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:bg-sky-50 prose-blockquote:px-4 prose-blockquote:py-2
            [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-6 [&_a]:text-[var(--article-link)]"
          style={{ "--article-link": accent } as CSSProperties}
        />
        <RssNewsDisclaimer sourceName={sourceName} feedUrl={feedUrl} sourceScope={sourceScope} />
        <NewsShareButtons title={article.title} className="mt-6" />
      </div>
    </article>
  );
}

/** Harici RSS kaynağından gelen haber — site içi tam içerik önizlemesi. */
export function PortalRssNewsPreviewPage() {
  const params = useParams<{ itemId?: string }>();
  const itemId = params.itemId ?? "";
  const hmCtx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const [, navigate] = useLocation();
  const siteId = hmCtx?.siteId ?? null;

  const cachedPreview = useMemo(() => {
    if (!itemId || siteId == null || siteId <= 0) return null;
    return readHmRssPreviewFromHomeCache(siteId, itemId);
  }, [itemId, siteId]);

  const {
    data: item,
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["/api/news/hybrid/rss", itemId, siteId ?? "portal"],
    queryFn: () => fetchPortalRssPreview(itemId, siteId),
    enabled: Boolean(itemId),
    staleTime: 5 * 60_000,
    retry: 1,
    placeholderData: cachedPreview
      ? ({
          id: String(cachedPreview.id ?? itemId).replace(/^rss:/, ""),
          title: cachedPreview.title,
          spot: cachedPreview.spot ?? null,
          contentHtml: cachedPreview.spot ? `<p>${cachedPreview.spot}</p>` : null,
          imageUrl: cachedPreview.imageUrl ?? null,
          href: cachedPreview.href,
          publishedAt: cachedPreview.publishedAt ?? null,
          categoryName: cachedPreview.categoryName ?? null,
          feedLabel: cachedPreview.feedLabel ?? null,
        } satisfies PortalRssPreview)
      : undefined,
  });

  const error = !itemId
    ? "Haber bulunamadı."
    : queryError
      ? "Haber yüklenemedi."
      : !loading && !item?.title
        ? "Haber bulunamadı veya süresi dolmuş olabilir."
        : null;

  useEffect(() => {
    const slug = String(item?.canonicalSlug ?? "").trim();
    if (!slug || item?.redirect !== true) return;
    navigate(h(`/haber/${encodeURIComponent(slug)}`), { replace: true });
  }, [item?.canonicalSlug, item?.redirect, navigate, h]);

  const { data: related = [] } = useQuery({
    queryKey: ["/api/news/hybrid", "rss-related", hmCtx?.siteId ?? "portal", itemId],
    queryFn: () => fetchHybridNewsList({ siteId: hmCtx?.siteId ?? null, limit: 12, offset: 0, rssScope: "all" }),
    enabled: !!item,
    staleTime: 2 * 60_000,
  });
  const relatedItems = related
    .filter((row) => !String(row.id ?? "").includes(itemId) && row.href !== item?.href)
    .slice(0, 6);

  return (
    <main
      className={`hm-article-detail-page mx-auto w-full max-w-screen-xl px-4 pb-6 md:pb-8 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}
    >
      {loading && !item ? (
        <div className="h-[520px] animate-pulse rounded-[2rem] bg-slate-50" />
      ) : item?.title ? (
        <EditorialNewsArticleLayout
          accent={SADE_ACCENT}
          excludeRssItemId={itemId}
          breadcrumbs={
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
              <Link href={h("/")} className="text-[#0284C7] hover:underline">
                Anasayfa
              </Link>
              <span>/</span>
              <Link href={h(hmCtx ? "/tum-haberler" : "/haberler")} className="text-[#0284C7] hover:underline">
                Haberler
              </Link>
              {item.categoryName ? (
                <>
                  <span>/</span>
                  <span className="text-slate-700">{item.categoryName}</span>
                </>
              ) : null}
            </div>
          }
          articleColumn={
            <>
              <RssArticleBlock article={item} />
              <RssRelatedNewsBox items={relatedItems} accent={SADE_ACCENT} />
            </>
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm font-bold text-slate-500">
          {error ?? "Haber bulunamadı."}
        </div>
      )}
    </main>
  );
}

function RssRelatedNewsBox({ items, accent }: { items: HomeHybridNewsItem[]; accent: string }) {
  const h = useHmPublicHref();
  if (!items.length) return null;
  return (
    <section className="mt-8 overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-sm">
      <div
        className="flex items-center gap-2 border-b border-slate-100 px-4 py-3"
        style={{ background: `linear-gradient(90deg, ${accent}12, #fff)` }}
      >
        <span className="h-5 w-1 rounded-full" style={{ background: accent }} />
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">Benzer haberler</h2>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {items.map((item) => {
          const img = item.imageUrl ? resolveClientMediaSrc(item.imageUrl) || item.imageUrl : null;
          return (
            <Link
              key={`${item.source ?? "news"}:${item.id}`}
              href={h(item.href)}
              className="group flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              {img ? (
                <img src={img} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-24 shrink-0 rounded-lg bg-slate-200" />
              )}
              <div className="min-w-0 flex-1">
                {item.categoryName ? (
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wide" style={{ color: accent }}>
                    {item.categoryName}
                  </p>
                ) : null}
                <h3 className="line-clamp-3 text-sm font-black leading-snug text-slate-900 group-hover:text-sky-700">
                  {item.title}
                </h3>
                {item.publishedAt ? <p className="mt-1 text-[11px] font-semibold text-slate-400">{fmtDate(item.publishedAt)}</p> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
