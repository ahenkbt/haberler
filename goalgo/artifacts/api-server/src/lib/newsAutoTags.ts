/** Haber başlık/spot/içerikten otomatik etiket üretimi (AI olmadan, deterministik). */

export const RSS_AUTO_TAG = "rss-auto";

export const INTERNAL_NEWS_TAGS = new Set([RSS_AUTO_TAG, "meta-ai", "haber-gonder", "haber"]);

const TR_STOP = new Set([
  "ve",
  "veya",
  "ile",
  "için",
  "bir",
  "bu",
  "şu",
  "o",
  "da",
  "de",
  "ki",
  "mi",
  "mu",
  "mı",
  "mü",
  "gibi",
  "kadar",
  "daha",
  "en",
  "çok",
  "az",
  "her",
  "hiç",
  "olan",
  "oldu",
  "olduğu",
  "olarak",
  "üzerine",
  "sonra",
  "önce",
  "arasında",
  "hakkında",
  "haber",
  "haberler",
  "gündem",
  "son",
  "dakika",
  "detay",
  "detayları",
  "açıklama",
  "yapılan",
  "yapildi",
  "dedi",
  "diye",
  "gore",
  "göre",
  "tarafindan",
  "tarafından",
  "icin",
  "itibaren",
  "the",
  "and",
]);

const TAG_FALLBACKS_TR = [
  "gündem",
  "türkiye",
  "haberler",
  "son dakika",
  "güncel",
  "spor",
  "ekonomi",
  "siyaset",
  "dünya",
  "teknoloji",
];

function stripHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** SEO etiketleri — Türkçe karakterler korunur (ş, ğ, ü, ö, ç, ı). */
export function normalizeTurkishKeyword(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .slice(0, 48);
}

function slugifyTag(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function tokenize(text: string): string[] {
  return stripHtml(text)
    .toLocaleLowerCase("tr-TR")
    .split(/[^\p{L}\p{N}]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && w.length <= 32 && !TR_STOP.has(w));
}

export function filterNewsDisplayTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((raw) => {
    const t = normalizeTurkishKeyword(raw);
    const slug = slugifyTag(raw);
    return t.length > 0 && !INTERNAL_NEWS_TAGS.has(slug) && !INTERNAL_NEWS_TAGS.has(t);
  });
}

function meaningfulExisting(tags: string[] | null | undefined): string[] {
  return filterNewsDisplayTags(tags)
    .map((t) => normalizeTurkishKeyword(t))
    .filter((t) => t.length >= 3);
}

export function deriveNewsTagsFromContent(opts: {
  title: string;
  spot?: string | null;
  content?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  existingTags?: string[] | null;
  minTags?: number;
  maxTags?: number;
}): string[] {
  const minTags = Math.max(1, opts.minTags ?? 10);
  const max = Math.min(Math.max(opts.maxTags ?? 14, minTags), 16);
  const kept = meaningfulExisting(opts.existingTags);
  if (kept.length >= minTags) return kept.slice(0, max);

  const freq = new Map<string, number>();
  const bump = (phrase: string, weight: number) => {
    const kw = normalizeTurkishKeyword(phrase);
    const slug = slugifyTag(phrase);
    if (!kw || kw.length < 3 || TR_STOP.has(kw)) return;
    if (INTERNAL_NEWS_TAGS.has(slug) || INTERNAL_NEWS_TAGS.has(kw)) return;
    freq.set(kw, (freq.get(kw) ?? 0) + weight);
  };

  for (const w of tokenize(opts.title)) bump(w, 4);
  for (const w of tokenize(opts.spot ?? "")) bump(w, 2);
  for (const w of tokenize(stripHtml(opts.content ?? "").slice(0, 4000))) bump(w, 1);

  const catName = String(opts.categoryName ?? "").trim();
  const catSlug = String(opts.categorySlug ?? "").trim();
  if (catName) bump(catName, 5);
  if (catSlug && slugifyTag(catName) !== slugifyTag(catSlug)) {
    bump(catSlug.replace(/-/g, " "), 4);
  }

  const titleWords = tokenize(opts.title);
  if (titleWords.length >= 2) {
    bump(titleWords.slice(0, 3).join(" "), 3);
  }

  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kw]) => kw);

  const out = new Set<string>(kept);
  for (const kw of ranked) {
    if (out.size >= max) break;
    out.add(kw);
  }
  if (catName) out.add(normalizeTurkishKeyword(catName));
  for (const fb of TAG_FALLBACKS_TR) {
    if (out.size >= minTags) break;
    out.add(fb);
  }
  if (out.size === 0) out.add("gündem");
  return [...out].slice(0, max);
}

/** RSS içe aktarım: başlık + spot'tan en az 10 etiket + `rss-auto` işareti. */
export function deriveRssImportNewsTags(opts: {
  title: string;
  spot?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
}): string[] {
  const generated = deriveNewsTagsFromContent({
    title: opts.title,
    spot: opts.spot,
    content: null,
    categoryName: opts.categoryName,
    categorySlug: opts.categorySlug,
    minTags: 10,
  });
  return [...new Set([...generated, RSS_AUTO_TAG])];
}
