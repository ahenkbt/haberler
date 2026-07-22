import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { apiUrl, resolveClientMediaSrc } from "@/lib/apiBase";
import { useEffect, useMemo } from "react";
import { User } from "lucide-react";
import { HmNewsDetailSidebar } from "@/components/HmNewsDetailSidebar";
import { KoseArticleTextCard, KoseOtherAuthorsBand } from "@/components/HmKoseCarouselBands";
import { resolveSadeAccent, YEKPARE_SADE_ACCENT_DARK } from "@/lib/yekpareSadeTheme";

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
  categorySlug?: string;
  categoryName?: string;
  createdAt: string;
};

export default function YazarPublicYazilari() {
  const params = useParams<{ slug?: string; authorKey?: string }>();
  const authorKey = String(params?.authorKey ?? "").trim();
  const authorId = /^\d+$/.test(authorKey) ? parseInt(authorKey, 10) : NaN;

  const hmCtx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const { data: settings } = useGetSiteSettings();
  const accent = hmCtx
    ? settings?.primaryColor?.trim() || resolveSadeAccent()
    : resolveSadeAccent(settings?.primaryColor);

  const siteId = hmCtx?.siteId ?? null;

  const {
    data: author,
    error: authorErr,
    isLoading: authorLoading,
  } = useQuery({
    queryKey: ["/api/authors", authorId, siteId],
    queryFn: async () => {
      if (!Number.isFinite(authorId) || authorId <= 0 || siteId == null) throw new Error("bad");
      const qs = new URLSearchParams({ siteId: String(siteId) });
      const r = await fetch(apiUrl(`/api/authors/${authorId}?${qs}`));
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as AuthorRow;
    },
    enabled: Number.isFinite(authorId) && authorId > 0 && siteId != null,
    retry: false,
  });

  const listQs = useMemo(() => {
    const q = new URLSearchParams({
      authorId: String(authorId),
      siteId: String(siteId ?? ""),
      status: "published",
      limit: "100",
    });
    return q.toString();
  }, [authorId, siteId]);

  const { data: newsPayload, isLoading: newsLoading } = useQuery({
    queryKey: ["/api/hm/makale", "by-author", authorId, siteId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/hm/makale?${listQs}`));
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as { items?: NewsListItem[] };
    },
    enabled: Number.isFinite(authorId) && authorId > 0 && siteId != null,
  });

  const itemsRaw = Array.isArray(newsPayload?.items) ? newsPayload!.items! : [];
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: NewsListItem[] = [];
    for (const item of itemsRaw) {
      const titleKey = String(item.title ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("tr-TR");
      const key = titleKey || String(item.slug ?? "").trim().toLowerCase() || String(item.id);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }, [itemsRaw]);

  const { data: authorsRaw } = useQuery({
    queryKey: ["/api/authors", "other-authors", siteId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/authors?hmSiteId=${encodeURIComponent(String(siteId))}`));
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as AuthorRow[];
    },
    enabled: siteId != null,
    staleTime: 5 * 60_000,
  });

  const otherAuthors = useMemo(() => {
    const raw = Array.isArray(authorsRaw) ? authorsRaw : [];
    return raw.filter((row) => row.id !== authorId);
  }, [authorsRaw, authorId]);

  useEffect(() => {
    if (!hmCtx || !author) return;
    const path = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmCtx.slug)}/yazar/${authorId}`;
    applyHmNewsSiteHomeMeta({
      siteName: hmCtx.displayName,
      browserTitle: `${author.name} · Köşe yazıları · ${hmCtx.displayName}`,
      description: `${author.name} — köşe yazıları`,
      canonicalPath: path,
      canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
      imageUrl: author.avatarUrl || hmCtx.layoutPrefs.logoUrl,
      logoUrl: hmCtx.layoutPrefs.logoUrl,
      faviconUrl: hmCtx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [hmCtx, author, authorId]);

  if (!Number.isFinite(authorId) || authorId <= 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">
        Geçersiz yazar bağlantısı
      </div>
    );
  }

  if (siteId == null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">
        Haber sitesi bağlamı bulunamadı.
      </div>
    );
  }

  if (authorLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">
        Yükleniyor…
      </div>
    );
  }

  if (authorErr || !author) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-700 font-medium">Yazar bulunamadı veya bu siteye ait değil.</p>
        <Link href={h("/yazarlar")} className="text-sm font-semibold hover:underline" style={{ color: accent }}>
          Yazarlar listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 bg-slate-50/90 pb-10">
      <main className="max-w-screen-xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-5 flex-wrap">
          <Link href={h("/")} className="hover:opacity-80 font-medium" style={{ color: accent }}>
            Anasayfa
          </Link>
          <span className="text-slate-300">/</span>
          <Link href={h("/yazarlar")} className="hover:opacity-80 font-medium" style={{ color: accent }}>
            Köşe yazarları
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate">{author?.name ?? "…"}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-2 space-y-8 min-w-0">
            <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-6 sm:items-start">
                <div
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-slate-100 shrink-0 mx-auto sm:mx-0 ring-4 ring-white shadow-md"
                  style={{ boxShadow: `0 0 0 4px ${accent}18` }}
                >
                  {author?.avatarUrl ? (
                    <img
                      src={resolveClientMediaSrc(author.avatarUrl) || author.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white font-black text-4xl"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${YEKPARE_SADE_ACCENT_DARK})` }}
                    >
                      {author?.name?.[0]?.toUpperCase() ?? <User className="w-12 h-12" />}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{author?.name}</h1>
                  <p className="mt-2 text-sm font-semibold text-[#0f766e]">Köşe yazarı</p>
                </div>
              </div>
            </section>

            <div>
              <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full shrink-0" style={{ background: accent }} />
                Köşe yazıları
              </h2>

              {newsLoading ? (
                <p className="text-slate-500 py-8">Yükleniyor…</p>
              ) : items.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
                  Henüz yayınlanmış yazı yok.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((n) => (
                    <KoseArticleTextCard
                      key={n.id}
                      article={{
                        id: n.id,
                        slug: n.slug,
                        title: n.title,
                        categoryName: n.categoryName,
                        createdAt: n.createdAt,
                      }}
                      accent={accent}
                    />
                  ))}
                </div>
              )}
            </div>

            {otherAuthors.length > 0 ? (
              <KoseOtherAuthorsBand
                authors={otherAuthors}
                accent={accent}
                excludeAuthorId={authorId}
                yazarlarHref={h("/yazarlar")}
              />
            ) : null}
          </div>

          <HmNewsDetailSidebar accent={accent} />
        </div>
      </main>
    </div>
  );
}
