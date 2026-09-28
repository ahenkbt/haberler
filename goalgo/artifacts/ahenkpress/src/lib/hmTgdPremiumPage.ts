/**
 * Trafik Güvenliği Derneği arşiv sayfalarını Vatan premium kabuğuna hazırlar.
 * Seed HTML (`hm-tgd-page`) veya `importSource: tgd-archive` ile tespit edilir.
 */

export function isHmTgdPremiumBody(html: string, importSource?: string | null): boolean {
  if (String(importSource ?? "").trim().toLowerCase() === "tgd-archive") return true;
  return /\bhm-tgd-page\b/i.test(String(html ?? ""));
}

function stripTags(raw: string): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export type HmTgdPremiumParsed = {
  title: string;
  lead: string;
  heroImage: string;
  /** Hero'ya taşınan başlık/lead/görsel çıkarıldıktan sonraki gövde. */
  bodyHtml: string;
};

export function parseHmTgdPremiumBody(html: string, fallbackTitle: string): HmTgdPremiumParsed {
  let raw = String(html ?? "").trim();
  if (!raw) {
    return { title: fallbackTitle, lead: "", heroImage: "", bodyHtml: "" };
  }

  // Dış wrapper'ı gevşet — yeniden .hm-tgd-page ile saracağız.
  const wrap = raw.match(/^<div\b[^>]*\bhm-tgd-page\b[^>]*>([\s\S]*)<\/div>\s*$/i);
  if (wrap?.[1]) raw = wrap[1].trim();

  let heroImage = "";
  const imgBlock =
    raw.match(/^\s*<p\b[^>]*>\s*(<img\b[^>]*>)\s*<\/p>/i) ||
    raw.match(/^\s*(<img\b[^>]*>)/i) ||
    raw.match(/<p\b[^>]*>\s*(<img\b[^>]*>)\s*<\/p>/i);
  if (imgBlock?.[0]) {
    const src = imgBlock[0].match(/\bsrc=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
    if (src) {
      heroImage = src;
      raw = raw.replace(imgBlock[0], "").trim();
    }
  }

  const titleMatch = raw.match(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/i);
  const title = stripTags(titleMatch?.[1] ?? "") || fallbackTitle;
  if (titleMatch?.[0]) raw = raw.replace(titleMatch[0], "");

  let lead = "";
  const leadMatch = raw.match(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (leadMatch?.[0]) {
    const candidate = stripTags(leadMatch[1] ?? "");
    if (candidate.length > 40 && !/<img\b/i.test(leadMatch[1] ?? "")) {
      if (candidate.length <= 360) {
        lead = candidate;
        raw = raw.replace(leadMatch[0], "");
      } else {
        lead = `${candidate.slice(0, 280).trim().replace(/\s+\S*$/, "")}…`;
      }
    }
  }

  raw = raw.replace(/<p>\s*<\/p>/gi, "").trim();
  return {
    title,
    lead,
    heroImage,
    bodyHtml: raw ? `<div class="hm-tgd-page">${raw}</div>` : "",
  };
}
