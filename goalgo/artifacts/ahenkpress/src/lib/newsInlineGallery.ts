/** Inline haber gövdesi foto galerisi — editör ve vitrin ortak işaretçi. */
export const NEWS_GALLERY_FIGURE_CLASS = "ap-news-gallery";
export const NEWS_GALLERY_DATA_ATTR = "data-ap-gallery";
export const NEWS_GALLERY_IMAGES_ATTR = "data-images";

export type NewsBodyPart =
  | { type: "html"; html: string }
  | { type: "gallery"; images: string[] };

const GALLERY_FIGURE_RE =
  /<figure[^>]*\bdata-ap-gallery\b[^>]*>[\s\S]*?<\/figure>/gi;

export function parseGalleryImagesFromFigureHtml(figureHtml: string): string[] {
  const attr = figureHtml.match(new RegExp(`${NEWS_GALLERY_IMAGES_ATTR}\\s*=\\s*['"]([^'"]+)['"]`, "i"));
  if (attr?.[1]) {
    try {
      const parsed = JSON.parse(attr[1].replace(/&#39;/g, "'")) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((u) => String(u).trim()).filter(Boolean);
      }
    } catch {
      /* img fallback */
    }
  }
  const imgs: string[] = [];
  const imgRe = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(figureHtml)) !== null) {
    const src = m[1]?.trim();
    if (src) imgs.push(src);
  }
  return imgs;
}

/** Haber gövdesini galeri blokları ve HTML parçalarına ayırır. */
export function splitNewsBodyHtml(html: string): NewsBodyPart[] {
  const raw = html ?? "";
  if (!raw.trim()) return [{ type: "html", html: raw }];

  const parts: NewsBodyPart[] = [];
  let last = 0;
  const re = new RegExp(GALLERY_FIGURE_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) {
      parts.push({ type: "html", html: raw.slice(last, match.index) });
    }
    const images = parseGalleryImagesFromFigureHtml(match[0]);
    if (images.length > 0) {
      parts.push({ type: "gallery", images });
    }
    last = match.index + match[0].length;
  }
  if (last < raw.length) {
    parts.push({ type: "html", html: raw.slice(last) });
  }
  if (parts.length === 0) {
    return [{ type: "html", html: raw }];
  }
  return parts;
}

export function buildNewsGalleryFigureHtml(images: string[]): string {
  const urls = images.map((s) => s.trim()).filter(Boolean);
  if (urls.length === 0) return "";
  const payload = JSON.stringify(urls).replace(/'/g, "&#39;");
  const imgs = urls
    .map(
      (src) =>
        `<img src="${src.replace(/"/g, "&quot;")}" alt="" loading="lazy" class="ap-news-gallery__img" />`,
    )
    .join("");
  return (
    `<figure class="${NEWS_GALLERY_FIGURE_CLASS}" ${NEWS_GALLERY_DATA_ATTR}="true" ${NEWS_GALLERY_IMAGES_ATTR}='${payload}'>` +
    `<div class="ap-news-gallery__viewport">${imgs}</div>` +
    `</figure>`
  );
}
