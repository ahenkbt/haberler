import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";
import { hmPublicHref } from "@/lib/hmPublicLinks";
import { coercePublicHybridNewsHref } from "@/lib/hybridNewsHref";
import { fetchHybridNewsList, type HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { resolveSadeAccent } from "@/lib/yekpareSadeTheme";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

function fmt(d: string | null | undefined) {
  if (!d) return "";
  try {
    return format(new Date(d), "HH:mm", { locale: tr });
  } catch {
    return "";
  }
}

type HmMeta = {
  id: number;
  slug: string;
  domain: string | null;
  displayName: string;
  layout?: unknown;
};

function newsDate(n: { createdAt?: string | null; publishedAt?: string | null }) {
  return n.createdAt ?? n.publishedAt ?? null;
}

/** iframe içi: ana siteden query ile; üst menü yok. Haberlere `target="_top"` ile üst pencerede git. */
export default function HaberEmbedWidget() {
  const raw = useSearch();
  const hmCtx = useHmPublicLinkContextOptional();
  const params = useMemo(() => new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw), [raw]);
  const sablon = params.get("sablon") || "manset";
  const showLogo = params.get("logo") !== "0";
  const limit = Math.min(30, Math.max(3, parseInt(params.get("sayi") || "10", 10) || 10));
  const siteIdRaw = params.get("siteId") ?? params.get("hmSiteId");
  const siteIdParsed = parseInt(String(siteIdRaw ?? hmCtx?.siteId ?? ""), 10);
  const siteId = Number.isFinite(siteIdParsed) && siteIdParsed > 0 ? siteIdParsed : null;

  const topOrigin =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";

  const { data: settings } = useGetSiteSettings();
  const platformAccent = resolveSadeAccent(settings?.primaryColor);

  const { data: hmMeta } = useQuery({
    queryKey: ["/api/hm/meta/by-id", siteId],
    queryFn: () => apiRequest(`/api/hm/meta/by-id/${siteId}`) as Promise<HmMeta>,
    enabled: siteId != null,
    staleTime: 5 * 60 * 1000,
  });

  const layoutPrefs = useMemo(() => {
    if (hmMeta?.layout != null) {
      return parseNewsSiteLayoutFromJson(JSON.stringify(hmMeta.layout));
    }
    if (hmCtx?.layoutPrefs) return hmCtx.layoutPrefs;
    return parseNewsSiteLayoutFromJson(null);
  }, [hmMeta?.layout, hmCtx?.layoutPrefs]);

  const accent =
    siteId != null && (layoutPrefs.hmPrimaryColor?.trim() ?? "").length >= 3
      ? layoutPrefs.hmPrimaryColor!.trim()
      : platformAccent;

  const { data: authorsRaw } = useQuery<any[]>({
    queryKey: ["/api/authors", siteId ?? "global", limit],
    queryFn: () =>
      siteId != null
        ? apiRequest(`/api/authors?hmSiteId=${encodeURIComponent(String(siteId))}`)
        : apiRequest("/api/authors"),
    staleTime: 60 * 1000,
  });
  const authorsList = Array.isArray(authorsRaw) ? authorsRaw : (authorsRaw as any)?.authors ?? [];

  const { data: newsList = [] } = useQuery<HomeHybridNewsItem[]>({
    queryKey: ["/api/news/embed-latest", siteId ?? "all", limit, "hybrid"],
    queryFn: () => fetchHybridNewsList({ siteId, limit, offset: 0, rssScope: "all" }),
    staleTime: 60 * 1000,
  });

  const slides = newsList.slice(0, limit);
  const [slideIdx, setSlideIdx] = useState(0);
  const safeIdx = slides.length > 0 ? Math.min(slideIdx, slides.length - 1) : 0;
  const current = slides[safeIdx];

  useEffect(() => {
    setSlideIdx(0);
  }, [siteId, slides.map((s: any) => s?.id).join(",")]);

  const haberHref = (n: { slug?: string | null; id?: string | number | null; href?: string | null; source?: string | null }) => {
    const path = coercePublicHybridNewsHref(n);
    const linkCtx = hmMeta
      ? { domain: hmMeta.domain, slug: hmMeta.slug, siteId: hmMeta.id }
      : hmCtx
        ? { domain: hmCtx.domain, slug: hmCtx.slug, siteId: hmCtx.siteId }
        : null;
    if (linkCtx) {
      return hmPublicHref(path, { ...linkCtx, forceAbsolute: true });
    }
    return `${topOrigin}${path}`;
  };

  const partnerLogoRaw = layoutPrefs.logoUrl?.trim();
  const partnerLogo = partnerLogoRaw ? resolveClientMediaSrc(partnerLogoRaw) || partnerLogoRaw : "";
  const partnerName = hmMeta?.displayName ?? hmCtx?.displayName ?? "";

  return (
    <div className="min-h-0 bg-white text-gray-900 font-sans antialiased">
      {showLogo ? (
        <div className="flex items-center justify-center py-2 border-b border-gray-100">
          {siteId != null && (hmMeta || hmCtx) ? (
            partnerLogo ? (
              <img src={partnerLogo} alt={partnerName} className="h-8 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="text-sm font-black text-gray-900 truncate max-w-[200px] px-2">{partnerName}</span>
            )
          ) : settings?.logoUrl?.trim() ? (
            <img src={settings.logoUrl.trim()} alt="" className="h-8 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="text-lg font-black">
              <span style={{ color: accent }}>{settings?.logoText1 || "Yek"}</span>
              <span>{settings?.logoText2 || "pare"}</span>
            </span>
          )}
        </div>
      ) : null}

      {sablon === "kose" && (
        <div className="p-2 space-y-2">
          {authorsList.slice(0, limit).map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 border-b border-gray-100 pb-2 last:border-0">
              {a.avatarUrl ? (
                <img
                  src={resolveClientMediaSrc(a.avatarUrl) || a.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: accent }}
                >
                  {a.name?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{a.name}</p>
                {a.title ? <p className="text-[10px] text-gray-500 truncate">{a.title}</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {sablon === "son" && (
        <ul className="divide-y divide-gray-100">
          {newsList.slice(0, limit).map((n) => (
            <li key={n.id}>
              <a
                href={haberHref(n)}
                target="_top"
                rel="noopener noreferrer"
                className="flex gap-2 px-2 py-2 hover:bg-gray-50 text-xs font-semibold leading-snug"
              >
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                  style={{ background: accent }}
                >
                  {fmt(newsDate(n))}
                </span>
                <span className="line-clamp-2">{n.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {(sablon === "manset" || sablon === "") && (
        <div className="relative">
          {current ? (
            <a
              href={haberHref(current)}
              target="_top"
              rel="noopener noreferrer"
              className="block relative aspect-[16/10] bg-gray-900"
            >
              {current.imageUrl ? (
                <img
                  src={resolveClientMediaSrc(current.imageUrl) || current.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-black text-sm leading-tight line-clamp-3">{current.title}</p>
              </div>
            </a>
          ) : (
            <div className="p-4 text-center text-gray-400 text-xs">Haber yok</div>
          )}
          {slides.length > 1 ? (
            <div className="flex justify-center gap-1.5 py-2 bg-gray-50" role="tablist" aria-label="Manşet">
              {slides.slice(0, 10).map((s: any, i: number) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIdx}
                  className="rounded-full p-1.5 min-w-[20px] min-h-[20px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{ color: accent }}
                  onClick={() => setSlideIdx(i)}
                >
                  <span
                    className="block w-1.5 h-1.5 rounded-full transition-transform"
                    style={{
                      background: i === safeIdx ? accent : "#d1d5db",
                      transform: i === safeIdx ? "scale(1.35)" : "scale(1)",
                    }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
