/**
 * Fix Haber (fix.tc) — RSS URL → site kategori slug eşlemesi.
 * Kampanya, hibrit vitrin ve içe aktarım aynı tabloyu kullanır.
 */
import { createHash } from "node:crypto";
const FIXHABER_SLUG = "fixhaber";

export type FixHaberRssFeedDef = {
  id: string;
  label: string;
  url: string;
  categorySlug: string;
};

function normalizeFeedUrl(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

/** Teknoloji / bilim + genel haber (gündem, ekonomi, dünya, spor) beslemeleri. */
export const FIXHABER_CAMPAIGN_RSS_FEEDS: FixHaberRssFeedDef[] = [
  { id: "ntv-teknoloji", label: "Teknoloji", url: "https://www.ntv.com.tr/teknoloji.rss", categorySlug: "fixhaber-teknoloji" },
  { id: "ntv-otomobil", label: "Otomobil", url: "https://www.ntv.com.tr/otomobil.rss", categorySlug: "fixhaber-otomobil-mobilite" },
  { id: "ntv-gundem", label: "Gündem", url: "https://www.ntv.com.tr/gundem.rss", categorySlug: "fixhaber-gundem" },
  { id: "ntv-turkiye", label: "Türkiye", url: "https://www.ntv.com.tr/turkiye.rss", categorySlug: "fixhaber-gundem" },
  { id: "ntv-ekonomi", label: "Ekonomi", url: "https://www.ntv.com.tr/ekonomi.rss", categorySlug: "fixhaber-ekonomi" },
  { id: "ntv-dunya", label: "Dünya", url: "https://www.ntv.com.tr/dunya.rss", categorySlug: "fixhaber-dunya" },
  { id: "ntv-spor", label: "Spor", url: "https://www.ntv.com.tr/sporskor.rss", categorySlug: "fixhaber-spor" },
  { id: "ntv-saglik", label: "Sağlık", url: "https://www.ntv.com.tr/saglik.rss", categorySlug: "fixhaber-saglik" },
  { id: "dirilis-teknoloji", label: "Teknoloji", url: "https://www.dirilispostasi.com/rss/teknoloji", categorySlug: "fixhaber-teknoloji" },
  { id: "dirilis-teknoloji-bilim", label: "Bilim", url: "https://www.dirilispostasi.com/rss/teknoloji-ve-bilim", categorySlug: "fixhaber-bilim" },
  { id: "dirilis-gundem", label: "Gündem", url: "https://www.dirilispostasi.com/rss/gundem", categorySlug: "fixhaber-gundem" },
  { id: "dirilis-dunya", label: "Dünya", url: "https://www.dirilispostasi.com/rss/dunya", categorySlug: "fixhaber-dunya" },
  { id: "dirilis-spor", label: "Spor", url: "https://www.dirilispostasi.com/rss/spor", categorySlug: "fixhaber-spor" },
  { id: "birgun-teknoloji", label: "Teknoloji", url: "https://www.birgun.net/rss/kategori/teknoloji-28", categorySlug: "fixhaber-teknoloji" },
  { id: "birgun-bilim", label: "Bilim", url: "https://www.birgun.net/rss/kategori/bilim-40", categorySlug: "fixhaber-bilim" },
  { id: "birgun-bilisim", label: "Yazılım", url: "https://www.birgun.net/rss/kategori/bilisim-25", categorySlug: "fixhaber-yazilim" },
  { id: "birgun-gundem", label: "Gündem", url: "https://www.birgun.net/rss/kategori/guncel-7", categorySlug: "fixhaber-gundem" },
  { id: "birgun-dunya", label: "Dünya", url: "https://www.birgun.net/rss/kategori/dunya-13", categorySlug: "fixhaber-dunya" },
  { id: "birgun-spor", label: "Spor", url: "https://www.birgun.net/rss/kategori/spor-12", categorySlug: "fixhaber-spor" },
  { id: "trt-teknoloji", label: "Teknoloji", url: "https://www.trthaber.com/teknoloji_articles.rss", categorySlug: "fixhaber-teknoloji" },
  { id: "ars-global", label: "Donanım", url: "https://feeds.arstechnica.com/arstechnica/index", categorySlug: "fixhaber-donanim" },
  { id: "verge-global", label: "Teknoloji", url: "https://www.theverge.com/rss/index.xml", categorySlug: "fixhaber-teknoloji" },
  { id: "techcrunch-global", label: "Teknoloji", url: "https://techcrunch.com/feed/", categorySlug: "fixhaber-teknoloji" },
];

const FEED_URL_TO_CATEGORY = new Map<string, string>(
  FIXHABER_CAMPAIGN_RSS_FEEDS.map((f) => [normalizeFeedUrl(f.url), f.categorySlug]),
);

export function fixHaberFeedUrls(): string[] {
  return FIXHABER_CAMPAIGN_RSS_FEEDS.map((f) => f.url);
}

/** Kampanya / RSS çalıştırma — tanınan Fix Haber feed URL’si için site slug. */
export function categorySlugFromFixHaberFeed(feedUrl: string): string | null {
  const key = normalizeFeedUrl(feedUrl);
  if (!key) return null;
  const direct = FEED_URL_TO_CATEGORY.get(key);
  if (direct) return direct;
  try {
    const u = new URL(key.startsWith("http") ? key : `https://${key}`);
    const pathKey = normalizeFeedUrl(`${u.hostname}${u.pathname}${u.search}`);
    return FEED_URL_TO_CATEGORY.get(pathKey) ?? null;
  } catch {
    return null;
  }
}

export function isFixHaberSiteSlug(slug: string | null | undefined): boolean {
  return (
    String(slug ?? "")
      .trim()
      .toLowerCase() === FIXHABER_SLUG
  );
}

/** layout_json.hmNewsSiteRssFeedRows — varsayılan gündem karma paketini devre dışı bırakır. */
export function buildFixHaberSiteRssFeedRows(): Array<{
  id: string;
  label: string;
  url: string;
  categoryKey: string;
}> {
  return FIXHABER_CAMPAIGN_RSS_FEEDS.map((feed) => ({
    id: feed.id,
    label: feed.label,
    url: feed.url,
    categoryKey: feed.categorySlug,
  }));
}

export function fixHaberCampaignFeedFingerprint(): string {
  const payload = FIXHABER_CAMPAIGN_RSS_FEEDS.map((f) => `${f.url}|${f.categorySlug}`).join("\n");
  return createHash("sha1").update(payload).digest("hex").slice(0, 12);
}
