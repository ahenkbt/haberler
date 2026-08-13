import { resolveClientMediaSrc } from "@/lib/apiBase";
import { HM_NEWS_PLACEHOLDER_IMAGE, HM_NEWS_PLACEHOLDER_SVG } from "@/lib/hmNewsPlaceholder";
import { isUnusableNewsImageUrl } from "@/lib/unusableNewsImageUrl";

/** Kullanılabilir medya src; Render/boş adreslerde boş string. */
export function resolveUsableClientMediaSrc(url: string | null | undefined): string {
  const t = String(url ?? "").trim();
  if (!t || isUnusableNewsImageUrl(t)) return "";
  const resolved = resolveClientMediaSrc(t);
  if (!resolved || isUnusableNewsImageUrl(resolved)) return "";
  return resolved;
}

/** Haber kartı / kapak: kırık veya eksik görselde varsayılan «Görseli Hazırlanmaktadır». */
export function newsCoverSrc(url: string | null | undefined): string {
  return resolveUsableClientMediaSrc(url) || HM_NEWS_PLACEHOLDER_IMAGE;
}

export function isNewsPlaceholderSrc(url: string | null | undefined): boolean {
  const t = String(url ?? "").trim();
  if (!t) return false;
  return t === HM_NEWS_PLACEHOLDER_IMAGE || t.includes("haber-gorsel-hazirlaniyor");
}

/** Kırık <img> yüklemesinde varsayılan görsele düş. */
export function handleNewsImageError(img: HTMLImageElement): void {
  if (img.src === HM_NEWS_PLACEHOLDER_SVG) return;
  if (isNewsPlaceholderSrc(img.getAttribute("src")) || img.src.includes("haber-gorsel-hazirlaniyor")) {
    img.src = HM_NEWS_PLACEHOLDER_SVG;
    return;
  }
  img.src = HM_NEWS_PLACEHOLDER_IMAGE;
}
