import { cn } from "@/lib/cn";
import { YEKTUBE_VIDEO_TV_LOGO_URL } from "@/lib/assetUrl";
import { readYektubeRuntimeConfig } from "@/lib/runtimeConfig";

type HmEmbedBrandLogoProps = {
  className?: string;
  alt?: string;
};

/** Sol menü / üst çubuk — şeffaf zemin, alanı dolduran Video TV logosu. */
export const HM_EMBED_BRAND_LOGO_CLASS = "yt-hm-brand-logo";

/** HM haber sitesi Video TV embed — Yektube Video TV logosu (site haber logosu değil). */
export function HmEmbedBrandLogo({ className, alt }: HmEmbedBrandLogoProps) {
  const { hmDisplayName } = readYektubeRuntimeConfig();
  const displayName = hmDisplayName?.trim() || "Yektube Video TV";

  return (
    <img
      src={YEKTUBE_VIDEO_TV_LOGO_URL}
      alt={alt ?? displayName}
      className={cn(HM_EMBED_BRAND_LOGO_CLASS, className)}
      draggable={false}
      decoding="async"
    />
  );
}
