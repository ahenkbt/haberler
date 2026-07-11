import { useEffect } from "react";
import { Redirect, useLocation, useParams } from "wouter";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { isYektubeV2Enabled, mapLegacyYektubePathToCanonical } from "@/lib/yektubeV2Feature";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

function LegacyPathRedirect() {
  const [location] = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search;
    const canonical = mapLegacyYektubePathToCanonical(location, search, isYektubeV2Enabled());
    const current = window.location.pathname + window.location.search;
    if (canonical !== current) {
      window.location.replace(canonical);
    }
  }, [location]);
  return null;
}

/** `/tr/:slug/video-tv/playlist/:id` → kanal sayfası (aynı kaynak). */
export function HmYektubePlaylistRedirect() {
  const { slug, id, videoId } = useParams<{ slug: string; id: string; videoId?: string }>();
  if (!slug || !id) return null;
  const base = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/video-tv`;
  if (videoId) return <Redirect to={`${base}/kanal/${id}/${encodeURIComponent(videoId)}`} />;
  return <Redirect to={`${base}/kanal/${id}`} />;
}

/** Eski `/video-galeri` → Yektube (sayısal id ise ilgili kanal sayfası). */
export function VideoGaleriToYektubeRedirect() {
  const { id } = useParams<{ id: string }>();
  const legacy = !id ? "/yektube" : /^\d+$/.test(id) ? `/yektube/kanal/${id}` : "/yektube";
  return <Redirect to={mapLegacyYektubePathToCanonical(legacy, "", isYektubeV2Enabled())} />;
}

/** `/yektube` kök yönlendirmesi (v2 bayrağında v2 URL) */
export function YektubeRootRedirect() {
  return <Redirect to={mapLegacyYektubePathToCanonical("/yektube", "", isYektubeV2Enabled())} />;
}

/** `/yektube/playlist/:id` → kanal sayfası (aynı kaynak) */
export function YektubePlaylistRedirect() {
  const { id, videoId } = useParams<{ id: string; videoId?: string }>();
  if (!id) return null;
  const legacy = videoId ? `/yektube/kanal/${id}/${videoId}` : `/yektube/kanal/${id}`;
  return <Redirect to={mapLegacyYektubePathToCanonical(legacy, "", isYektubeV2Enabled())} />;
}

/** Eski `/video-tv/kanal/...` — HM özel alanında `/tr/{slug}/video-tv/kanal/...`, aksi halde Yektube. */
export function LegacyVideoTvKanalRedirect() {
  const { id, videoId } = useParams<{ id: string; videoId?: string }>();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const { data, isLoading } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !!host && !isDefaultPortalHost(host),
    retry: false,
  });

  if (!id) return null;

  if (typeof window !== "undefined" && !isDefaultPortalHost(host)) {
    if (isLoading) {
      return <div className="py-16 text-center text-sm text-slate-500">Yönlendiriliyor…</div>;
    }
    if (data?.slug) {
      const base = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(data.slug)}/video-tv/kanal/${id}`;
      const target = videoId ? `${base}/${encodeURIComponent(videoId)}` : base;
      return <Redirect to={target} replace />;
    }
  }

  const legacy = videoId ? `/video-tv/kanal/${id}/${videoId}` : `/video-tv/kanal/${id}`;
  const target = mapLegacyYektubePathToCanonical(legacy, "", isYektubeV2Enabled());
  return <Redirect to={target} replace />;
}

/** v1 bölüm slug'ları (videolar, kanallar…) → kanonik rota */
export function YektubeLegacySectionRedirect() {
  return <LegacyPathRedirect />;
}
