import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { apiUrl, resolveClientMediaSrc } from "@/lib/apiBase";
import { User } from "lucide-react";
import { KoseArticleTextCard } from "@/components/HmKoseCarouselBands";
import { resolveSadeAccent, SADE_PUBLIC_POST_HERO_BODY_CLASS, YEKPARE_SADE_ACCENT_DARK } from "@/lib/yekpareSadeTheme";

type AuthorRow = {
  id: number;
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
};

type NewsListItem = {
  id: number;
  slug: string;
  title: string;
  spot?: string | null;
  imageUrl?: string | null;
  createdAt: string;
};

/** Yekpare portalında `/yazar/:id` — merkez (siteScope=portal) köşe yazıları. */
export default function YekparePortalYazarYazilari() {
  const { authorKey } = useParams<{ authorKey: string }>();
  const authorId = /^\d+$/.test(String(authorKey ?? "")) ? parseInt(String(authorKey), 10) : NaN;
  const { data: settings } = useGetSiteSettings();
  const accent = resolveSadeAccent(settings?.primaryColor);

  const { data: author, isLoading: authorLoading } = useQuery({
    queryKey: ["/api/authors", authorId, "portal"],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/authors/${authorId}`));
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as AuthorRow;
    },
    enabled: Number.isFinite(authorId) && authorId > 0,
    retry: false,
  });

  const { data: newsPayload, isLoading: newsLoading } = useQuery({
    queryKey: ["/api/news", "portal-author", authorId],
    queryFn: async () => {
      const qs = new URLSearchParams({
        authorId: String(authorId),
        siteScope: "portal",
        status: "published",
        limit: "100",
        offset: "0",
      });
      const r = await fetch(apiUrl(`/api/news?${qs}`));
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as { items?: NewsListItem[] };
    },
    enabled: Number.isFinite(authorId) && authorId > 0,
  });

  const items = Array.isArray(newsPayload?.items) ? newsPayload!.items! : [];
  const dedupedItems = useMemo(() => {
    const seen = new Set<string>();
    const out: NewsListItem[] = [];
    for (const item of items) {
      const key =
        String(item.title ?? "")
          .trim()
          .replace(/\s+/g, " ")
          .toLocaleLowerCase("tr-TR") || item.slug;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }, [items]);

  if (!Number.isFinite(authorId) || authorId <= 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Geçersiz yazar adresi</div>
    );
  }

  if (authorLoading) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Yükleniyor…</div>;
  }

  if (!author) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Yazar bulunamadı</div>
    );
  }

  const avatarSrc = resolveClientMediaSrc(author.avatarUrl ?? null);

  return (
    <div className="sade-public-page min-h-screen">
      <main className={`max-w-screen-xl mx-auto px-4 pb-8 md:pb-10 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:opacity-80 font-medium" style={{ color: accent }}>
            Anasayfa
          </Link>
          <span>/</span>
          <Link href="/yazarlar" className="hover:opacity-80 font-medium" style={{ color: accent }}>
            Yazarlar
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{author.name}</span>
        </div>

        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-emerald-50">
            {avatarSrc ? (
              <img src={avatarSrc} alt={author.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-2xl font-black text-white"
                style={{ background: `linear-gradient(135deg, ${accent}, ${YEKPARE_SADE_ACCENT_DARK})` }}
              >
                {author.name?.[0]?.toUpperCase() ?? "Y"}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{author.name}</h1>
            <p className="mt-1 text-sm font-semibold text-[#0f766e]">Köşe yazarı</p>
            <p className="mt-2 text-xs text-slate-500">Yekpare Haber Merkezi tarafından eklenmiştir.</p>
          </div>
        </div>

        <h2 className="text-lg font-black text-slate-900 mb-4">Yazılar</h2>
        {newsLoading ? (
          <p className="text-sm text-slate-500">Yazılar yükleniyor…</p>
        ) : dedupedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">
            <User className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>Henüz yayınlanmış yazı yok</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dedupedItems.map((item) => (
              <KoseArticleTextCard
                key={item.id}
                article={{
                  id: item.id,
                  slug: item.slug || String(item.id),
                  title: item.title,
                  createdAt: item.createdAt,
                }}
                accent={accent}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
