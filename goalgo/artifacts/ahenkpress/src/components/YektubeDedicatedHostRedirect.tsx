import { useLayoutEffect } from "react";
import {
  isYektubeDedicatedHost,
  mapPathToYektubeV2,
  yektubeDedicatedPublicPath,
  yektubeDedicatedTopLevelPaths,
  YEKTUBE_DEDICATED_KIDS_PATH,
  YEKTUBE_DEDICATED_MUSIC_PATH,
  YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH,
  YEKTUBE_V2_PUBLIC_BASE,
} from "@/lib/yektubeV2Feature";

/**
 * yektube.com → /yp, /muzik, /cocuk Yektube SPA (Vercel rewrite + yedek).
 * ahenkpress yanlışlıkla yüklenirse v2 yoluna yönlendir.
 */
export function YektubeDedicatedHostRedirect() {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (!isYektubeDedicatedHost(host)) return;

    const { pathname, search, hash } = window.location;
    const publicBase = yektubeDedicatedPublicPath();
    const assetBase = YEKTUBE_V2_PUBLIC_BASE.replace(/\/+$/, "") || "/yektube-v2";

    const isTopLevel = yektubeDedicatedTopLevelPaths().some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (isTopLevel) {
      const hasV2Bundle = Boolean(document.querySelector('script[src*="/yektube-v2/assets/"]'));
      if (!hasV2Bundle) {
        window.location.replace(`${publicBase}/${search}${hash}`.replace(/\/\?/, "?"));
      }
      return;
    }

    if (pathname === YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH || pathname.startsWith(`${YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH}/`)) {
      window.location.replace(pathname.replace(/^\/tr(?=\/|$)/, publicBase) + search + hash);
      return;
    }

    if (pathname.startsWith(`${assetBase}/`) || pathname === assetBase) {
      const rest = pathname === assetBase ? "/" : pathname.slice(assetBase.length) || "/";
      window.location.replace(`${publicBase}${rest}${search}${hash}`);
      return;
    }

    if (pathname === "/v2" || pathname.startsWith("/v2/")) {
      window.location.replace(pathname.replace(/^\/v2/, publicBase) + search + hash);
      return;
    }

    if (/\.\w+$/.test(pathname.split("/").pop() ?? "")) return;

    if (pathname === "/" || pathname === "") {
      window.location.replace(`${publicBase}/${search}${hash}`.replace(/\/\?/, "?"));
      return;
    }

    if (pathname === YEKTUBE_DEDICATED_MUSIC_PATH || pathname.startsWith(`${YEKTUBE_DEDICATED_MUSIC_PATH}/`)) {
      return;
    }
    if (pathname === YEKTUBE_DEDICATED_KIDS_PATH || pathname.startsWith(`${YEKTUBE_DEDICATED_KIDS_PATH}/`)) {
      return;
    }

    const v2Path = mapPathToYektubeV2(pathname.startsWith("/yektube") ? pathname : `/yektube${pathname}`, search);
    const rest = v2Path.replace(new RegExp(`^${assetBase.replace(/\//g, "\\/")}`), "") || "/";
    window.location.replace(`${publicBase}${rest}${hash}`);
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
      Yektube yükleniyor…
    </div>
  );
}

export function YektubeDedicatedHostGate({ children }: { children: React.ReactNode }) {
  if (typeof window !== "undefined" && isYektubeDedicatedHost(window.location.hostname)) {
    const hasV2Bundle = Boolean(document.querySelector('script[src*="/yektube-v2/assets/"]'));
    if (hasV2Bundle) return <>{children}</>;
    return <YektubeDedicatedHostRedirect />;
  }
  return <>{children}</>;
}
