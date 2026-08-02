import { resolveClientMediaSrc } from "@/lib/apiBase";

/** HM editör / haber sitesi Video TV markası — site logosu veya varsayılan Yektube görseli. */
export function VideoTvBrandLogo({
  className = "yt-hm-brand-logo block h-10 w-full max-w-full bg-transparent object-contain object-left",
  alt = "Video TV",
  siteLogoUrl,
  siteName,
  preferSiteBranding = false,
}: {
  className?: string;
  alt?: string;
  siteLogoUrl?: string | null;
  siteName?: string | null;
  /** true ise Yektube VIDEO TV görseli yerine site logosu / adı */
  preferSiteBranding?: boolean;
}) {
  const logo = typeof siteLogoUrl === "string" ? siteLogoUrl.trim() : "";
  if (preferSiteBranding && logo) {
    const src = resolveClientMediaSrc(logo) || logo;
    return (
      <img
        src={src}
        alt={siteName?.trim() || alt}
        className={className}
        draggable={false}
      />
    );
  }
  if (preferSiteBranding && siteName?.trim()) {
    return (
      <span
        className={`inline-block max-w-full truncate font-black uppercase tracking-wide text-inherit ${className}`.trim()}
        title={siteName.trim()}
      >
        {siteName.trim()}
      </span>
    );
  }
  return (
    <img
      src="/yektube-video-tv-logo.png"
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}
