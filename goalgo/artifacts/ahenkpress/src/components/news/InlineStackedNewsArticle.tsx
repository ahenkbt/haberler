import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useMemo, type CSSProperties, type RefCallback } from "react";
import { Link } from "wouter";
import { EditorialNewsDetailHeader } from "@/components/EditorialNewsDetailHeader";
import { NewsArticleBody } from "@/components/NewsArticleBody";
import { NewsShareButtons } from "@/components/news/NewsShareButtons";
import { resolveNewsExcerpt } from "@/lib/resolveNewsExcerpt";
import { estimateNewsReadMinutes } from "@/lib/newsArticleMetrics";
import { normalizeAiNewsHtml, resolveClientMediaSrc, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { rewriteNewsBodyLinksForHm } from "@/lib/rewriteNewsBodyLinksForHm";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { StackedNewsArticle } from "@/hooks/useNewsInfiniteScroll";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

type Props = {
  article: StackedNewsArticle;
  accent: string;
  registerRef?: RefCallback<HTMLElement>;
};

/** Sonsuz kaydırma yığınında tam haber gövdesi (köşe/makale değil). */
export function InlineStackedNewsArticle({ article, accent, registerRef }: Props) {
  const h = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();

  const dangerHtml = useMemo(() => {
    if (article.source === "rss" && article.contentHtml) {
      return sanitizeHtml(article.contentHtml);
    }
    let raw = normalizeAiNewsHtml(article.content || "");
    if (hmCtx?.slug) {
      raw = rewriteNewsBodyLinksForHm(raw, {
        slug: hmCtx.slug,
        siteId: hmCtx.siteId,
        domain: hmCtx.domain,
      });
    }
    return rewriteInlineHtmlImgSrc(raw);
  }, [article.content, article.contentHtml, article.source, hmCtx?.domain, hmCtx?.siteId, hmCtx?.slug]);

  const readMin = useMemo(
    () =>
      estimateNewsReadMinutes({
        title: article.title,
        spot: article.spot,
        content: article.content ?? article.contentHtml,
      }),
    [article.content, article.contentHtml, article.spot, article.title],
  );

  const excerpt = resolveNewsExcerpt({
    spot: article.spot,
    summary: article.spot,
    description: article.spot,
  });
  const heroImageSrc = article.imageUrl ? resolveClientMediaSrc(article.imageUrl) || article.imageUrl : null;
  const detailHref = h(article.href.startsWith("/") ? article.href : `/haber/${article.slug ?? ""}`);
  const catHref =
    article.categorySlug != null
      ? h(`/kategori/${encodeURIComponent(article.categorySlug)}`)
      : null;

  return (
    <article
      ref={registerRef}
      className="mt-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
      data-stacked-news-key={article.key}
    >
      <div className="p-6 md:p-8">
        {article.categoryName && catHref ? (
          <Link
            href={catHref}
            className="mb-3 inline-block text-[11px] font-black uppercase tracking-wide hover:opacity-80"
            style={{ color: accent }}
          >
            {article.categoryName}
          </Link>
        ) : article.categoryName ? (
          <p className="mb-3 text-[11px] font-black uppercase tracking-wide" style={{ color: accent }}>
            {article.categoryName}
          </p>
        ) : null}

        <EditorialNewsDetailHeader
          accent={accent}
          title={article.title}
          categoryName={undefined}
          categoryVariant="eyebrow"
          dateLabel={format(new Date(article.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
          readMin={readMin}
          excerpt={excerpt}
          imageSrc={heroImageSrc}
          imageAlt={article.title}
          authorSlot={
            article.authorName ? (
              <p className="text-sm font-semibold text-slate-600">✍️ {article.authorName}</p>
            ) : null
          }
          afterExcerptSlot={<NewsShareButtons title={article.title} compact className="mb-6" />}
        />

        {dangerHtml ? (
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
        ) : (
          <p className="text-sm text-slate-500">
            <Link href={detailHref} className="font-bold hover:underline" style={{ color: accent }}>
              Haberin tamamını oku →
            </Link>
          </p>
        )}

        <NewsShareButtons title={article.title} className="mt-8" />
      </div>
    </article>
  );
}
