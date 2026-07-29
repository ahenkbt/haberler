import { useRef, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, Redirect } from "wouter";
import { YektubeStandaloneShell } from "@/components/YektubeStandaloneShell";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import {
  isYektubeV2Enabled,
  mapToHmYektubeEmbedUrl,
  mapToYektubePublicUrl,
  YEKTUBE_PORTAL_MIRROR_ORIGIN,
} from "@/lib/yektubeV2Feature";

const YEKTUBE_MIRROR_ORIGIN = YEKTUBE_PORTAL_MIRROR_ORIGIN.replace(/\/+$/, "");

/** yektube.com DNS bozuksa yekpare.net/yp yedeğine zorla. */
function preferYektubeMirrorOrigin(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?yektube\.com(?=\/|$)/i, YEKTUBE_MIRROR_ORIGIN);
}

function buildHmYektubeEmbedSrc(hmCtx: ReturnType<typeof useHmPublicLinkContextOptional>): string {
  const raw = preferYektubeMirrorOrigin(
    mapToHmYektubeEmbedUrl(
      typeof window !== "undefined" ? window.location.pathname : "/video",
      typeof window !== "undefined" ? window.location.search : "",
      typeof window !== "undefined" ? window.location.hash : "",
    ),
  );
  try {
    const url = new URL(raw, `${YEKTUBE_MIRROR_ORIGIN}/`);
    if (url.hostname === "yektube.com" || url.hostname === "www.yektube.com") {
      url.hostname = new URL(`${YEKTUBE_MIRROR_ORIGIN}/`).hostname;
    }
    url.searchParams.set("embed", "1");
    const path = typeof window !== "undefined" ? window.location.pathname : "/video";
    if (!url.searchParams.get("hm")) {
      const hmFromPath =
        path.match(/\/tr\/([^/]+)\/video(?:-tv)?(?:\/|$)/)?.[1] ??
        path.match(/\/([^/]+)\/video(?:-tv)?(?:\/|$)/)?.[1];
      const hmSlug =
        hmCtx?.slug?.trim() ||
        (hmFromPath &&
        hmFromPath !== "tr" &&
        hmFromPath !== "hm" &&
        hmFromPath !== "video" &&
        hmFromPath !== "video-tv"
          ? hmFromPath
          : null);
      if (hmSlug) url.searchParams.set("hm", hmSlug);
    }
    const displayName = hmCtx?.displayName?.trim();
    if (displayName && !url.searchParams.get("hmName")) {
      url.searchParams.set("hmName", displayName);
    }
    const logoRaw = hmCtx?.layoutPrefs?.logoUrl?.trim();
    if (logoRaw && !url.searchParams.get("hmLogo")) {
      const abs =
        /^https?:\/\//i.test(logoRaw)
          ? logoRaw
          : `${window.location.origin}${logoRaw.startsWith("/") ? "" : "/"}${logoRaw}`;
      url.searchParams.set("hmLogo", abs);
    }
    return preferYektubeMirrorOrigin(url.toString());
  } catch {
    const withEmbed = raw.includes("embed=1") ? raw : `${raw}${raw.includes("?") ? "&" : "?"}embed=1`;
    return preferYektubeMirrorOrigin(withEmbed);
  }
}

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
    if (typeof window === "undefined") {
      return `${YEKTUBE_MIRROR_ORIGIN}/yp/?embed=1`;
    }
    return buildHmYektubeEmbedSrc(hmCtx);
  }, [location, hmCtx?.slug, hmCtx?.displayName, hmCtx?.layoutPrefs?.logoUrl]);

  const [activeSrc, setActiveSrc] = useState(src);

  useEffect(() => {
    setActiveSrc(src);
  }, [src]);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el || el.src === activeSrc) return;
    try {
      el.contentWindow?.location.replace(activeSrc);
    } catch {
      el.src = activeSrc;
    }
  }, [activeSrc]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!activeSrc.includes("yektube.com")) return undefined;
    const timer = window.setTimeout(() => {
      setActiveSrc((cur) => preferYektubeMirrorOrigin(cur));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [activeSrc]);

  /** Iframe boyutu: chrome→alt kenar + contained genişlik (CSS fixed ile uyumlu). */
  useEffect(() => {
    const el = iframeRef.current;
    if (!el || typeof window === "undefined") return undefined;

    const applySize = () => {
      const root = el.closest(".hm-vitrin-root") as HTMLElement | null;
      const contained = root?.getAttribute("data-hm-site-layout") === "contained";
      const chromeRaw =
        root?.style.getPropertyValue("--hm-video-tv-chrome-height") ||
        getComputedStyle(document.documentElement).getPropertyValue("--hm-video-tv-chrome-height") ||
        "4.5rem";
      const chromePx = (() => {
        const n = Number.parseFloat(chromeRaw);
        if (!Number.isFinite(n)) return 72;
        return chromeRaw.trim().endsWith("rem") ? n * 16 : n;
      })();
      const top = Math.max(0, Math.round(chromePx));
      const height = Math.max(240, window.innerHeight - top);
      let left = 0;
      let width = window.innerWidth;
      if (contained) {
        const pad = window.innerWidth >= 768 ? 16 : 12;
        const maxW = Math.min(1280, window.innerWidth - pad * 2);
        left = Math.max(pad, Math.round((window.innerWidth - maxW) / 2));
        width = Math.max(280, Math.round(window.innerWidth - left * 2));
      }
      el.style.position = "fixed";
      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.zIndex = "1";
      el.setAttribute("width", String(width));
      el.setAttribute("height", String(height));
    };

    applySize();
    window.addEventListener("resize", applySize);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => applySize())
        : null;
    const root = el.closest(".hm-vitrin-root");
    const chrome = document.querySelector(".hm-video-tv-chrome-stack");
    if (ro && root) ro.observe(root);
    if (ro && chrome) ro.observe(chrome);
    const t1 = window.setTimeout(applySize, 50);
    const t2 = window.setTimeout(applySize, 300);
    const t3 = window.setTimeout(applySize, 1000);
    return () => {
      window.removeEventListener("resize", applySize);
      ro?.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [activeSrc]);

  return (
    <iframe
      ref={iframeRef}
      title="Yektube"
      src={activeSrc}
      className="hm-video-tv-embed block border-0 bg-[#0f0f0f]"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={() => setActiveSrc((cur) => preferYektubeMirrorOrigin(cur))}
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
