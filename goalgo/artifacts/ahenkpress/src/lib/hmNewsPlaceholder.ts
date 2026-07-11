function hmPublicAsset(relativePath: string): string {
  const base = String(import.meta.env.BASE_URL ?? "/");
  const prefix = base.endsWith("/") ? base : `${base}/`;
  const path = relativePath.replace(/^\/+/, "");
  return `${prefix}${path}`;
}

/** Haber görseli yüklenirken veya kırık bağlantıda gösterilen varsayılan görsel (beyaz arka plan). */
export const HM_NEWS_PLACEHOLDER_IMAGE = hmPublicAsset("hm/haber-gorsel-hazirlaniyor.jpg");
export const HM_NEWS_PLACEHOLDER_IMAGE_PNG = hmPublicAsset("hm/haber-gorsel-hazirlaniyor.png");

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#ffffff"/>
  <g fill="none" stroke="#94a3b8" stroke-width="6">
    <rect x="230" y="108" width="180" height="132" rx="14"/>
    <circle cx="320" cy="158" r="24" fill="#e2e8f0" stroke="#94a3b8"/>
    <path d="M268 216h104" stroke-linecap="round"/>
  </g>
  <text x="320" y="278" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="20">Görseli Hazırlanmaktadır.</text>
</svg>`;

export const HM_NEWS_PLACEHOLDER_SVG = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_SVG)}`;

export const HM_NEWS_LOADING_LABEL = "Haberler yükleniyor";

export const HM_CATEGORIES_NEWS_LOADING_LABEL = "Kategoriler ve haberler yükleniyor";

export const HM_SITE_LOADING_LABEL = "Lütfen Bekleyiniz — Site Yükleniyor";
