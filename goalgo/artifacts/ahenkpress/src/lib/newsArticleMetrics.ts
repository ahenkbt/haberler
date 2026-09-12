/** Haber detay: okuma süresi, görünür etiketler (iç sistem etiketleri hariç). */
import { format, isValid } from "date-fns";
import { tr } from "date-fns/locale";

export const INTERNAL_NEWS_TAGS = new Set(["rss-auto", "meta-ai", "haber-gonder", "haber"]);

/** date-fns `format` Invalid Date'de RangeError atar — boş bırak, sayfayı düşürme. */
export function formatNewsDateLabel(
  value: string | number | Date | null | undefined,
  pattern: string,
): string {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (!isValid(d)) return "";
  try {
    return format(d, pattern, { locale: tr });
  } catch {
    return "";
  }
}

export function filterNewsDisplayTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((raw) => {
    const t = String(raw ?? "").trim().toLowerCase();
    return t.length > 0 && !INTERNAL_NEWS_TAGS.has(t);
  });
}

function stripHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Türkçe haber metni için yaklaşık okuma süresi (dakika). */
export function estimateNewsReadMinutes(opts: {
  title?: string | null;
  spot?: string | null;
  content?: string | null;
}): number {
  const text = [opts.title, opts.spot, stripHtml(opts.content ?? "")]
    .filter(Boolean)
    .join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
