import yektubeIconUrl from "../../public/yektube-icon.png?url";
import yektubeLogoUrl from "../../public/yektube-logo.png?url";
import yektubeVideoTvLogoUrl from "../../public/yektube-video-tv-logo.png?url";
import yekpareLogoUrl from "../../public/yekpare-logo.png?url";

/** Marka görselleri Vite bundle → /yektube-v2/assets/ (Vercel /yp redirect'inden etkilenmez) */
const BRAND_ASSETS: Record<string, string> = {
  "yektube-icon.png": yektubeIconUrl,
  "yektube-logo.png": yektubeLogoUrl,
  "yektube-video-tv-logo.png": yektubeVideoTvLogoUrl,
  "yekpare-logo.png": yekpareLogoUrl,
};

const V2_ASSET_ROOT = "/yektube-v2/";

export const YEKTUBE_ICON_URL = yektubeIconUrl;
export const YEKTUBE_LOGO_URL = yektubeLogoUrl;
/** YouTube filigranı üstü Yekpare köşe logosu */
export const YEKPARE_LOGO_URL = yekpareLogoUrl;
/** HM editör haber siteleri Video TV markası */
export const YEKTUBE_VIDEO_TV_LOGO_URL = yektubeVideoTvLogoUrl;

export function yektubeAssetUrl(relativePath: string): string {
  const file = relativePath.replace(/^\//, "");
  return BRAND_ASSETS[file] ?? `${V2_ASSET_ROOT}${file}`;
}
