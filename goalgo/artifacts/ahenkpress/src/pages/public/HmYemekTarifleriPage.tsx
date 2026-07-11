import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, PlayCircle } from "lucide-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { apiRequest } from "@/lib/queryClient";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { mapPublicHybridNewsLinkFields } from "@/lib/hybridNewsHref";
import { HmNewsImage } from "@/components/HmNewsImage";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";

const GREEN = "#039D55";
const GREEN_LIGHT = "#E4FFF3";

type RecipeNewsItem = {
  id: number | string;
  title: string;
  slug?: string | null;
  spot?: string | null;
  imageUrl?: string | null;
  href?: string | null;
};

type RecipeVideoItem = {
  id: number | string;
  title: string;
  slug?: string | null;
  thumbnailUrl?: string | null;
  youtubeVideoId?: string | null;
};

function mapDbNews(row: Record<string, unknown>, h: (path: string) => string): RecipeNewsItem {
  const { id, slug, href } = mapPublicHybridNewsLinkFields(row);
  return {
    id,
    slug,
    title: String(row.title ?? "").trim(),
    spot: typeof row.spot === "string" ? row.spot : null,
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    href: href || (slug ? h(`/haber/${slug}`) : null),
  };
}

export default function HmYemekTarifleriPage() {
  const h = useHmPublicHref();
  const ctx = useHmPublicLinkContextOptional();
  const siteId = ctx?.siteId ?? null;
  const siteQs = siteId != null ? `&siteId=${encodeURIComponent(String(siteId))}` : "";
  const shellClass = hmSiteContentShellClass(ctx?.layoutPrefs);

  useEffect(() => {
    applyHmNewsSiteHomeMeta({
      siteName: ctx?.displayName?.trim() || "Yemek Tarifleri",
      description: "Tarif haberleri ve yemek tarifi videoları.",
      canonicalOrigin: hmPublicSiteOrigin(ctx?.domain),
      canonicalPath: h("/yemek-tarifleri"),
      browserTitle: "Yemek Tarifleri",
    });
  }, [ctx?.displayName, ctx?.domain, h]);

  const { data: recipeNews = [], isLoading: newsLoading } = useQuery<RecipeNewsItem[]>({
    queryKey: ["/api/news", "yemek-tarifleri-page", siteId ?? "all"],
    queryFn: async () => {
      const raw = (await apiRequest(
        `/api/news?limit=24&offset=0&status=published&recipePage=1&includeHiddenCategories=1${siteQs}`,
      )) as { items?: unknown[] };
      const rows = raw?.items ?? [];
      return rows.map((n) => mapDbNews(n as Record<string, unknown>, h));
    },
    staleTime: 60_000,
  });

  const { data: recipeVideos = [], isLoading: videosLoading } = useQuery<RecipeVideoItem[]>({
    queryKey: ["/api/video/videos", "yemek-tarifleri-page"],
    queryFn: async () => {
      const res = await fetch(`/api/video/videos?categorySlug=yemek-tarifleri&limit=12`);
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: RecipeVideoItem[] } | RecipeVideoItem[];
      return Array.isArray(data) ? data : (data.items ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasContent = recipeNews.length > 0 || recipeVideos.length > 0;
  const loading = newsLoading || videosLoading;

  const videoCards = useMemo(
    () =>
      recipeVideos.map((video) => {
        const thumb = resolveClientMediaSrc(video.thumbnailUrl ?? "");
        const href = video.slug
          ? `/yektube/video/${video.slug}`
          : video.youtubeVideoId
            ? `/yektube/watch?v=${video.youtubeVideoId}`
            : "/yektube";
        return { ...video, thumb, href };
      }),
    [recipeVideos],
  );

  return (
    <div className="min-h-screen bg-[#f7fbf8]">
      <section className="border-b border-emerald-100 bg-white">
        <div className={`${shellClass} py-10 md:py-14`}>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]" style={{ background: GREEN_LIGHT, color: GREEN }}>
            Yemek Tarifleri
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold text-gray-950 md:text-4xl">Lezzetli tarifler ve videolar</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">
            Editör tarif haberleri ve Yektube yemek tarifi videoları — sipariş ve restoran vitrini olmadan, yalnızca tarif içerikleri.
          </p>
        </div>
      </section>

      <div className={`${shellClass} space-y-12 py-10 md:py-14`}>
        {loading && !hasContent ? (
          <p className="text-sm text-gray-500">Tarifler yükleniyor…</p>
        ) : null}

        {recipeNews.length > 0 ? (
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="text-xl font-black text-gray-900 md:text-2xl" style={{ color: GREEN }}>
                Tarif Haberleri
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recipeNews.map((item) => (
                <Link
                  key={String(item.id)}
                  href={item.href || "#"}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <HmNewsImage
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-bold text-gray-900 group-hover:underline">{item.title}</p>
                    {item.spot ? <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-500">{item.spot}</p> : null}
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold" style={{ color: GREEN }}>
                      Tarifi oku <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {videoCards.length > 0 ? (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-black text-gray-900 md:text-2xl" style={{ color: GREEN }}>
                Tarif Videoları
              </h2>
              <p className="mt-1 text-sm text-gray-500">Yektube yemek tarifleri kategorisi</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videoCards.map((video) => (
                <Link
                  key={String(video.id)}
                  href={video.href}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-video bg-gray-900">
                    {video.thumb ? (
                      <img src={video.thumb} alt={video.title} className="h-full w-full object-cover opacity-90" loading="lazy" />
                    ) : null}
                    <span className="absolute inset-0 grid place-items-center text-white/90">
                      <PlayCircle className="h-12 w-12" />
                    </span>
                  </div>
                  <p className="line-clamp-2 p-4 text-sm font-bold text-gray-900">{video.title}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !hasContent ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">Henüz tarif içeriği eklenmemiş.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
