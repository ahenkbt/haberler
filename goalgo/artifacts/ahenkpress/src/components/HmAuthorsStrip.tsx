import { Link } from "wouter";
import { ChevronRight, Users } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";

export type HmAuthorsStripAuthor = {
  id: number | string;
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  latestArticle?: { id: number | string; title: string; slug: string } | null;
};

function authorAvatarSrc(url: string | null | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  return resolveClientMediaSrc(raw) || raw;
}

function dedupeAuthors(authors: HmAuthorsStripAuthor[]): HmAuthorsStripAuthor[] {
  const out = new Map<string, HmAuthorsStripAuthor>();
  for (const author of authors) {
    const key = String(author.name ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
    if (!key) continue;
    const prev = out.get(key);
    const prevScore = prev ? (prev.avatarUrl ? 2 : 0) + (prev.latestArticle ? 2 : 0) + (prev.title ? 1 : 0) : -1;
    const nextScore = (author.avatarUrl ? 2 : 0) + (author.latestArticle ? 2 : 0) + (author.title ? 1 : 0);
    if (!prev || nextScore > prevScore) out.set(key, author);
  }
  return Array.from(out.values());
}

function CorporateAuthorsSection({
  authors,
  yazarlarHref,
}: {
  authors: HmAuthorsStripAuthor[];
  yazarlarHref: string;
}) {
  const h = useHmPublicHref();
  const uniqueAuthors = dedupeAuthors(authors);

  return (
    <section className="vkv-authors vkv-authors--home">
      <div className="vkv-authors-w">
        <div className="vkv-section-head">
          <h2 className="vkv-section-title">Köşe Yazarları</h2>
          <Link href={yazarlarHref} className="vkv-more-link">
            Tümü <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="vkv-authors-grid vkv-authors-grid--strip">
          {uniqueAuthors.map((author) => {
            const src = authorAvatarSrc(author.avatarUrl);
            const latest = author.latestArticle;
            const cardHref = latest?.slug
              ? h(`/haber/${encodeURIComponent(String(latest.slug))}`)
              : h(`/yazar/${author.id}`);
            const articleTitle = latest?.title?.trim() || "";
            const roleTitle = author.title?.trim() || "";
            const subtitle = articleTitle || roleTitle;
            const subtitleIsArticle = Boolean(articleTitle);

            return (
              <Link key={author.id} href={cardHref} className="vkv-author-card">
                {src ? (
                  <img src={src} alt={author.name} className="vkv-author-img" loading="lazy" />
                ) : (
                  <div className="vkv-author-img vkv-author-img--fallback" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    {author.name?.[0] ?? "Y"}
                  </div>
                )}
                <span className="vkv-author-name">{author.name}</span>
                {subtitle ? (
                  <span className={`vkv-author-title${subtitleIsArticle ? " vkv-author-title--article" : ""}`}>{subtitle}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HmAuthorsStrip({
  authors,
  accent,
  yazarlarHref,
  className = "",
  variant = "default",
}: {
  authors: HmAuthorsStripAuthor[];
  accent: string;
  yazarlarHref: string;
  className?: string;
  variant?: "default" | "corporate";
}) {
  const h = useHmPublicHref();
  const uniqueAuthors = dedupeAuthors(authors);
  if (!uniqueAuthors.length) return null;

  if (variant === "corporate") {
    return <CorporateAuthorsSection authors={uniqueAuthors} yazarlarHref={yazarlarHref} />;
  }

  return (
    <div className={`hm-vitrin-sidebar-panel rounded-xl border-t-4 px-4 py-4 shadow ${className}`} style={{ borderTopColor: accent }}>
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 shrink-0" style={{ color: accent }} />
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Köşe Yazarları</h3>
        <div className="flex-1" />
        <Link href={yazarlarHref} className="text-xs font-bold hover:underline" style={{ color: accent }}>
          Tümü →
        </Link>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {uniqueAuthors.map((author) => {
          const src = authorAvatarSrc(author.avatarUrl);
          return (
            <Link
              key={author.id}
              href={h(`/yazar/${author.id}`)}
              className="flex min-w-[88px] max-w-[120px] shrink-0 flex-col items-center gap-1 text-center"
            >
              {src ? (
                <img
                  src={src}
                  alt={author.name}
                  className="h-16 w-16 rounded-full object-cover transition hover:opacity-95"
                  style={{ boxShadow: `0 0 0 3px ${accent}55` }}
                  loading="lazy"
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-black text-white"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: `0 0 0 3px ${accent}55` }}
                >
                  {author.name?.[0] ?? "Y"}
                </div>
              )}
              <span className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-900">{author.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
