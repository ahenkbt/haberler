import { Link } from "wouter";
import { format } from "date-fns";
import { resolveArticlePublicPath } from "@/lib/isKoseArticle";
import { tr } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { YEKPARE_SADE_ACCENT_DARK } from "@/lib/yekpareSadeTheme";

export type KoseArticleBrief = {
  id: number;
  slug: string;
  title: string;
  categoryName?: string | null;
  createdAt: string;
};

export type KoseAuthorBrief = {
  id: number;
  name: string;
  avatarUrl?: string | null;
  articleCount?: number | null;
};

function AuthorAvatar({
  name,
  avatarUrl,
  accent,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  accent: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-12 w-12 text-sm" : size === "lg" ? "h-20 w-20 text-2xl" : "h-14 w-14 text-lg";
  const src = avatarUrl ? resolveClientMediaSrc(avatarUrl) || avatarUrl : "";
  if (src) {
    return <img src={src} alt="" className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-emerald-100`} />;
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full font-black text-white`}
      style={{ background: `linear-gradient(135deg, ${accent}, ${YEKPARE_SADE_ACCENT_DARK})` }}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function KoseAuthorByline({
  author,
  accent,
  href,
}: {
  author: KoseAuthorBrief;
  accent: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 min-w-0">
      <AuthorAvatar name={author.name} avatarUrl={author.avatarUrl} accent={accent} size="md" />
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900 leading-tight">{author.name}</p>
        <p className="text-[11px] font-semibold text-[#0f766e] mt-0.5">Köşe yazarı</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="inline-flex rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 hover:bg-emerald-50 transition-colors">
        {inner}
      </Link>
    );
  }
  return <div className="inline-flex rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">{inner}</div>;
}

function ScrollBandShell({
  title,
  accent,
  moreHref,
  moreLabel = "Tümü",
  children,
}: {
  title: string;
  accent: string;
  moreHref?: string;
  moreLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-emerald-100 bg-white shadow-sm">
      <div
        className="flex items-center gap-2 border-b border-emerald-50 px-4 py-3"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 8%, white), white)` }}
      >
        <span className="h-5 w-1 rounded-full shrink-0" style={{ background: accent }} />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3>
        <div className="flex-1" />
        {moreHref ? (
          <Link href={moreHref} className="text-xs font-black hover:underline" style={{ color: accent }}>
            {moreLabel} <ChevronRight className="inline h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="yekpare-scrollbar flex gap-3 overflow-x-auto p-4 pb-5">
        {children}
      </div>
    </section>
  );
}

export function KoseAuthorArticlesBand({
  title,
  articles,
  accent,
  moreHref,
  moreLabel = "Tümü",
  excludeSlug,
}: {
  title: string;
  articles: KoseArticleBrief[];
  accent: string;
  moreHref?: string;
  moreLabel?: string;
  excludeSlug?: string;
}) {
  const h = useHmPublicHref();
  const items = articles.filter((a) => a.slug !== excludeSlug);
  if (!items.length) return null;

  return (
    <ScrollBandShell title={title} accent={accent} moreHref={moreHref} moreLabel={moreLabel}>
      {items.map((article) => (
        <Link
          key={article.id}
          href={h(resolveArticlePublicPath(article))}
          className="group flex w-[200px] shrink-0 flex-col rounded-xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/80 p-3 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:w-[220px]"
        >
          {article.categoryName ? (
            <span
              className="mb-2 inline-flex w-fit rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
              style={{ background: accent }}
            >
              {article.categoryName}
            </span>
          ) : null}
          <p className="line-clamp-3 flex-1 text-xs font-black leading-snug text-slate-900 group-hover:text-[#039D55]">
            {article.title}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <span className="text-[10px] font-semibold text-slate-500">
              {format(new Date(article.createdAt), "d MMM yyyy", { locale: tr })}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: accent }}>
              Oku →
            </span>
          </div>
        </Link>
      ))}
    </ScrollBandShell>
  );
}

export function KoseOtherAuthorsBand({
  authors,
  accent,
  excludeAuthorId,
  yazarlarHref,
}: {
  authors: KoseAuthorBrief[];
  accent: string;
  excludeAuthorId?: number;
  yazarlarHref?: string;
}) {
  const h = useHmPublicHref();
  const items = authors.filter((a) => a.id !== excludeAuthorId);
  if (!items.length) return null;

  return (
    <ScrollBandShell title="Diğer köşe yazarları" accent={accent} moreHref={yazarlarHref}>
      {items.map((author) => (
        <Link
          key={author.id}
          href={h(`/yazar/${author.id}`)}
          className="group flex w-[100px] shrink-0 flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 text-center transition hover:border-emerald-200 hover:shadow-md sm:w-[108px]"
        >
          <AuthorAvatar name={author.name} avatarUrl={author.avatarUrl} accent={accent} size="sm" />
          <span className="line-clamp-2 text-[11px] font-black leading-tight text-slate-900 group-hover:text-[#039D55]">
            {author.name}
          </span>
          {typeof author.articleCount === "number" ? (
            <span className="text-[9px] font-semibold text-slate-500">{author.articleCount} yazı</span>
          ) : null}
        </Link>
      ))}
    </ScrollBandShell>
  );
}

export function KoseArticleTextCard({
  article,
  accent,
}: {
  article: KoseArticleBrief;
  accent: string;
}) {
  const h = useHmPublicHref();
  return (
    <Link
      href={h(resolveArticlePublicPath(article))}
      className="group flex min-h-[148px] flex-col gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      {article.categoryName ? (
        <span
          className="mb-2 inline-flex w-fit rounded px-2 py-0.5 text-[10px] font-black uppercase text-white"
          style={{ background: accent }}
        >
          {article.categoryName}
        </span>
      ) : null}
      <h3 className="font-bold text-sm leading-relaxed text-slate-900 group-hover:text-[#039D55] line-clamp-3 flex-1">
        {article.title}
      </h3>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>{format(new Date(article.createdAt), "d MMM yyyy", { locale: tr })}</span>
        <span className="font-black uppercase tracking-wide" style={{ color: accent }}>
          Oku →
        </span>
      </div>
    </Link>
  );
}
