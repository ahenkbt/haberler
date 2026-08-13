import { Link } from "wouter";
import { ChevronRight, Users } from "lucide-react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { HmAuthorAvatar } from "@/components/HmAuthorAvatar";

export type HmAuthorsStripAuthor = {
  id: number | string;
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  latestArticle?: { id: number | string; title: string; slug: string } | null;
};

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
                <HmAuthorAvatar
                  src={author.avatarUrl}
                  name={author.name}
                  className="vkv-author-img h-full w-full"
                />
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
        {uniqueAuthors.map((author) => (
            <Link
              key={author.id}
              href={h(`/yazar/${author.id}`)}
              className="flex min-w-[88px] max-w-[120px] shrink-0 flex-col items-center gap-1 text-center"
            >
              <HmAuthorAvatar
                src={author.avatarUrl}
                name={author.name}
                className="h-16 w-16"
                accent={accent}
              />
              <span className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-900">{author.name}</span>
            </Link>
        ))}
      </div>
    </div>
  );
}
