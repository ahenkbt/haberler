function hmPublicAsset(relativePath: string): string {
  const base = String(import.meta.env.BASE_URL ?? "/");
  const prefix = base.endsWith("/") ? base : `${base}/`;
  const path = relativePath.replace(/^\/+/, "");
  return `${prefix}${path}`;
}

/**
 * Kamera + kum saati, «Görsel Hazırlanmaktadır».
 * Data URI kullanıyoruz: public JPG/PNG yoksa bile kırık-ikon dönmesin.
 */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="Görsel Hazırlanmaktadır">
  <rect width="640" height="360" fill="#ffffff"/>
  <g fill="#c5c9ce">
    <rect x="268" y="92" width="78" height="28" rx="8"/>
    <rect x="214" y="116" width="176" height="116" rx="18"/>
    <rect x="230" y="128" width="24" height="14" rx="3" fill="#d7dbdf"/>
    <circle cx="292" cy="174" r="34" fill="#e6e8eb"/>
    <circle cx="292" cy="174" r="24" fill="#c5c9ce"/>
    <circle cx="292" cy="174" r="12" fill="#e6e8eb"/>
    <rect x="366" y="102" width="56" height="10" rx="3"/>
    <rect x="366" y="216" width="56" height="10" rx="3"/>
    <rect x="370" y="112" width="8" height="104" rx="3"/>
    <rect x="410" y="112" width="8" height="104" rx="3"/>
    <polygon points="378,114 410,114 394,162"/>
    <polygon points="378,224 410,224 394,176"/>
  </g>
  <text x="320" y="286" text-anchor="middle" fill="#9aa0a6" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700">Görsel Hazırlanmaktadır</text>
</svg>`;

export const HM_NEWS_PLACEHOLDER_SVG = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_SVG)}`;

/** Haber görseli yüklenemezse gösterilen varsayılan (data URI — 404 yok). */
export const HM_NEWS_PLACEHOLDER_IMAGE = HM_NEWS_PLACEHOLDER_SVG;
export const HM_NEWS_PLACEHOLDER_IMAGE_PNG = HM_NEWS_PLACEHOLDER_SVG;
/** İsteğe bağlı statik kopya; asıl kaynak data URI. */
export const HM_NEWS_PLACEHOLDER_FILE = hmPublicAsset("hm/haber-gorsel-hazirlaniyor.svg");

export const HM_NEWS_LOADING_LABEL = "Haberler yükleniyor";

export const HM_CATEGORIES_NEWS_LOADING_LABEL = "Kategoriler ve haberler yükleniyor";

export const HM_SITE_LOADING_LABEL = "Lütfen Bekleyiniz — Site Yükleniyor";

export function isHmNewsPlaceholderSrc(src: string | null | undefined): boolean {
  const t = String(src ?? "").trim();
  if (!t) return false;
  return t === HM_NEWS_PLACEHOLDER_SVG || t.includes("haber-gorsel-hazirlaniyor");
}

/** Anasayfa kartları: boş veya varsayılan «Görsel Hazırlanmaktadır» kapak sayılmaz. */
export function isUsableNewsCoverSrc(src: string | null | undefined): boolean {
  const t = String(src ?? "").trim();
  if (!t) return false;
  return !isHmNewsPlaceholderSrc(t);
}

/** Kırık `<img>` kaynağını varsayılan görselle değiştirir (döngü yok). */
export function applyHmNewsImageFallback(img: HTMLImageElement): void {
  if (img.getAttribute("data-hm-news-placeholder") === "1") return;
  if (isHmNewsPlaceholderSrc(img.currentSrc || img.src)) {
    img.setAttribute("data-hm-news-placeholder", "1");
    return;
  }
  img.setAttribute("data-hm-news-placeholder", "1");
  img.src = HM_NEWS_PLACEHOLDER_SVG;
  img.style.objectFit = "contain";
  img.style.backgroundColor = "#ffffff";
}

export function onHmNewsImageError(
  event: { currentTarget: EventTarget | null; target?: EventTarget | null },
): void {
  const t = event.currentTarget instanceof HTMLImageElement
    ? event.currentTarget
    : event.target instanceof HTMLImageElement
      ? event.target
      : null;
  if (t) applyHmNewsImageFallback(t);
}
