import { useRef, useEffect, useMemo, type ReactNode } from "react";
import { useLocation, Redirect } from "wouter";
import { YektubeStandaloneShell } from "@/components/YektubeStandaloneShell";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import {
  isYektubeV2Enabled,
  mapToHmYektubeEmbedUrl,
  mapToYektubePublicUrl,
} from "@/lib/yektubeV2Feature";

/** v2 açıkken aynı origin üzerinde /yektube-v2 (yektube.com DNS bozuksa yedek) */
export function YektubeV2Redirect({ fallback }: { fallback?: ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    if (!isYektubeV2Enabled()) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const target = mapToYektubePublicUrl(location, search, hash);
    if (typeof window !== "undefined" && window.location.href !== target) {
      window.location.replace(target);
    }
  }, [location]);

  if (!isYektubeV2Enabled()) return null;

  return (
    fallback ?? (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Yektube yükleniyor…
      </div>
    )
  );
}

/**
 * HM haber sitesi Video TV — yekpare.net/yp ile aynı arayüz (iframe).
 * Üst/alt haber sitesi kromu dış kabukta kalır; üyelik Yekpare oturumunda.
 * Canlı Yayın TV (`/video-tv/canlitv`) bu bileşeni kullanmaz.
 */
export function HmYektubePortalEmbed() {
  const [location] = useLocation();
  const hmCtx = useHmPublicLinkContextOptional();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const src = useMemo(() => {
    if (typeof window === "undefined") return "https://yektube.com/yp/?embed=1";
    const raw = mapToHmYektubeEmbedUrl(window.location.pathname, window.location.search, window.location.hash);
    try {
      const url = new URL(raw, "https://yektube.com");
      url.searchParams.set("embed", "1");
      const path = window.location.pathname;
      if (!url.searchParams.get("hm")) {
        const hmFromPath =
          path.match(/\/tr\/([^/]+)\/video-tv(?:\/|$)/)?.[1] ??
          path.match(/\/([^/]+)\/video-tv(?:\/|$)/)?.[1];
        const hmSlug = hmCtx?.slug?.trim() || (hmFromPath && hmFromPath !== "tr" && hmFromPath !== "hm" ? hmFromPath : null);
        if (hmSlug) url.searchParams.set("hm", hmSlug);
      }
      const displayName = hmCtx?.displayName?.trim();
      if (displayName && !url.searchParams.get("hmName")) {
        url.searchParams.set("hmName", displayName);
      }
      return url.toString();
    } catch {
      return raw.includes("embed=1") ? raw : `${raw}${raw.includes("?") ? "&" : "?"}embed=1`;
    }
  }, [location, hmCtx?.slug, hmCtx?.displayName]);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el || el.src === src) return;
    try {
      el.contentWindow?.location.replace(src);
    } catch {
      el.src = src;
    }
  }, [src]);

  return (
    <iframe
      ref={iframeRef}
      title="Yektube"
      src={src}
      className="hm-video-tv-embed block min-h-0 w-full flex-1 border-0 bg-white"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

/** @deprecated `HmYektubePortalEmbed` kullanın */
export function YektubeV2HmEmbed() {
  return <HmYektubePortalEmbed />;
}

export function YektubeV2OrV1({
  v1,
  hm = false,
}: {
  v1: ReactNode;
  hm?: boolean;
}) {
  if (!isYektubeV2Enabled()) return <>{v1}</>;
  if (hm) return <HmYektubePortalEmbed />;
  return <YektubeV2Redirect />;
}

/** v2 açıkken tam sayfa yönlendirme; kapalıyken v1 standalone shell — yalnızca yekpare.net hub. */
export function YektubeStandaloneRoute({ children }: { children: ReactNode }) {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  if (!isYekparePortalHubOnly(host, null)) {
    return <Redirect to="/" replace />;
  }
  if (isYektubeV2Enabled()) return <YektubeV2Redirect />;
  return <YektubeStandaloneShell>{children}</YektubeStandaloneShell>;
}

/** HM video-tv içeriği — yekpare.net/yp iframe (canlitv hariç). */
export function HmVideoTvRoute({ children: _children }: { children?: ReactNode }) {
  return <HmYektubePortalEmbed />;
}
