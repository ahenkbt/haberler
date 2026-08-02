import { useEffect, type ReactNode } from "react";
import { useLocation, Redirect } from "wouter";
import { YektubeStandaloneShell } from "@/components/YektubeStandaloneShell";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { isYektubeV2Enabled, mapToYektubePublicUrl } from "@/lib/yektubeV2Feature";
import HmVideoTvPage from "@/pages/public/HmVideoTvPage";

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
 * @deprecated HM Video TV artık iframe kullanmıyor — native `/api/video` vitrini.
 * Geriye dönük importlar için `HmVideoTvPage` döner.
 */
export function HmYektubePortalEmbed() {
  return <HmVideoTvPage />;
}

/** @deprecated `HmYektubePortalEmbed` / `HmVideoTvPage` kullanın */
export function YektubeV2HmEmbed() {
  return <HmVideoTvPage />;
}

export function YektubeV2OrV1({
  v1,
  hm = false,
}: {
  v1: ReactNode;
  hm?: boolean;
}) {
  if (!isYektubeV2Enabled()) return <>{v1}</>;
  if (hm) return <HmVideoTvPage />;
  return <YektubeV2Redirect />;
}

/** v2 açıkken tam sayfa yönlendirme; kapalıyken v1 standalone shell — yalnızca turk.eco hub. */
export function YektubeStandaloneRoute({ children }: { children: ReactNode }) {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  if (!isYekparePortalHubOnly(host, null)) {
    return <Redirect to="/" replace />;
  }
  if (isYektubeV2Enabled()) return <YektubeV2Redirect />;
  return <YektubeStandaloneShell>{children}</YektubeStandaloneShell>;
}

/** HM video-tv içeriği — native `/api/video` (iframe yok). */
export function HmVideoTvRoute({ children: _children }: { children?: ReactNode }) {
  return <HmVideoTvPage />;
}
