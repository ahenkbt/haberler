import { resolveClientMediaSrc } from "@/lib/apiBase";

function normalizeImageUrlForCompare(url: string): string {
  const t = (url ?? "").trim();
  if (!t) return "";
  try {
    const u = new URL(t, "https://example.invalid");
    return decodeURIComponent(u.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return t.toLowerCase();
  }
}

function imageUrlsReferToSameAsset(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const resolvedA = resolveClientMediaSrc(a) || a;
  const resolvedB = resolveClientMediaSrc(b) || b;
  if (resolvedA === resolvedB) return true;

  if (normalizeImageUrlForCompare(resolvedA) === normalizeImageUrlForCompare(resolvedB)) return true;
  if (normalizeImageUrlForCompare(a) === normalizeImageUrlForCompare(b)) return true;

  const fileA = resolvedA.split("/").pop()?.split("?")[0];
  const fileB = resolvedB.split("/").pop()?.split("?")[0];
  if (fileA && fileB && fileA.length > 8 && fileA === fileB) return true;

  return false;
}

const REMOVABLE_IMG_PARENT_TAGS = new Set(["P", "A", "FIGURE", "DIV"]);

/** RSS gövdesindeki kapak görseli header hero ile aynıysa yalnızca ilk eşleşeni kaldırır. */
export function stripDuplicateHeroImageFromHtml(
  html: string,
  heroUrl: string | null | undefined,
): string {
  const raw = html ?? "";
  const hero = (heroUrl ?? "").trim();
  if (!raw.trim() || !hero) return raw;

  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(raw, "text/html");
      const body = doc.body;
      if (!body) return raw;

      const firstImg = body.querySelector("img[src]");
      if (!firstImg) return raw;

      const src = firstImg.getAttribute("src") ?? "";
      if (!imageUrlsReferToSameAsset(src, hero)) return raw;

      let node: Element | null = firstImg;
      const parent = firstImg.parentElement;
      if (parent && REMOVABLE_IMG_PARENT_TAGS.has(parent.tagName)) {
        const clone = parent.cloneNode(true) as Element;
        clone.querySelectorAll("img").forEach((img) => {
          if (imageUrlsReferToSameAsset(img.getAttribute("src") ?? "", hero)) img.remove();
        });
        const text = (clone.textContent ?? "").replace(/\u00a0/g, " ").trim();
        const hasOtherMedia = clone.querySelector("img, video, iframe");
        if (!text && !hasOtherMedia) node = parent;
      }

      node?.remove();
      return body.innerHTML;
    } catch {
      /* regex fallback */
    }
  }

  let removed = false;
  const stripped = raw.replace(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/i, (match, _q, src) => {
    if (removed) return match;
    if (imageUrlsReferToSameAsset(src, hero)) {
      removed = true;
      return "";
    }
    return match;
  });

  return stripped.replace(/<p>\s*<\/p>/gi, "").trimStart();
}
