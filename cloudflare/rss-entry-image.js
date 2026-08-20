/**
 * RSS/Atom kapak görseli — NTV Dünya gibi feed'ler media:thumbnail yerine
 * enclosure + content HTML <img> kullanır.
 */

function decodeXmlEntities(raw) {
  return String(raw || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .trim();
}

function xmlTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(block || "").match(re);
  return m ? decodeXmlEntities(m[1]) : "";
}

function xmlAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = String(block || "").match(re);
  return m ? decodeXmlEntities(m[1]) : "";
}

function looksLikeImageUrl(url) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u) && !u.startsWith("//")) return false;
  if (/\.(?:avif|gif|jpe?g|png|webp|svg)(?:[?#].*)?$/i.test(u)) return true;
  if (/\/(?:images?|media|uploads?|photos?|static)\//i.test(u)) return true;
  if (/images\.ntv\.com\.tr/i.test(u)) return true;
  return false;
}

/** Türkçe dosya adlarını (Ekrangörüntüsü.png) tarayıcının yükleyeceği hale getir. */
export function encodeHttpImageUrl(raw) {
  const input = String(raw || "")
    .trim()
    .replace(/&amp;/g, "&");
  if (!input) return "";
  const withProto = input.startsWith("//") ? `https:${input}` : input;
  if (!/^https?:\/\//i.test(withProto)) return input;
  try {
    return new URL(withProto).href;
  } catch {
    return withProto;
  }
}

export function extractRssBlockImageUrl(block) {
  const xml = String(block || "");
  const tagged = [
    xmlAttr(xml, "media:thumbnail", "url"),
    xmlAttr(xml, "media:content", "url"),
    xmlAttr(xml, "itunes:image", "href"),
    xmlAttr(xml, "enclosure", "url"),
  ].find((u) => looksLikeImageUrl(u));
  if (tagged) return encodeHttpImageUrl(tagged) || null;

  const html =
    xmlTag(xml, "content:encoded") ||
    xmlTag(xml, "content") ||
    xmlTag(xml, "summary") ||
    xmlTag(xml, "description") ||
    "";
  const img = String(html).match(/<img\b[^>]+src=["']([^"']+)["']/i);
  if (img?.[1] && looksLikeImageUrl(img[1])) {
    return encodeHttpImageUrl(img[1]) || null;
  }
  return null;
}
