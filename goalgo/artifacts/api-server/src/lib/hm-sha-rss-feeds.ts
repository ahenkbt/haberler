/**
 * Şehir Haber Ajansı (sehirhaberajansi.com.tr) RSS paketleri.
 *
 * Feed `kategori` query → hedef site kategori slug eşlemesi:
 *   (boş / rss.php) → gundem     — genel ajans akışı
 *   gundem          → gundem
 *   yerel           → ankara     — ASG/AHG Ankara odaklı; yerel = şehir haberi
 *   dunya           → dunya
 *   siyaset         → politika   — site standart slug (siyaset alias)
 *   ekonomi         → ekonomi
 *   kultur-sanat    → kultur-sanat
 *   spor            → spor
 *   saglik          → saglik
 *   egitim          → egitim
 *
 * Görseller `imageUrl` link olarak kalır (`downloadImages=false`).
 * Aynı haber ASG + AHG’ye ayrı `siteId` satırı olarak yazılır.
 */
import { canonicalizeRssCategorySlug } from "./hm-rss-category-aliases.js";
import { hostFromMaybeUrl } from "./hm-rss-campaigns.js";

export const SHA_HOST = "sehirhaberajansi.com.tr";
export const SHA_CAMPAIGN_NAME = "Şehir Haber Ajansı → ASG + AHG";
export const SHA_CAMPAIGN_TAG = "sehirhaberajansi";
export const MIDNIGHT_TR_CAMPAIGN_TAG = "midnight-tr";

/** Hedef siteler: ankarasehirgazetesi.com (asg) + ankarahabergundemi.com */
export const SHA_TARGET_SITE_SLUGS = ["asg", "ankarahabergundemi"] as const;

export const SHA_RSS_FEEDS = [
  { url: "https://sehirhaberajansi.com.tr/rss.php", kategori: "", categorySlug: "gundem" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=gundem", kategori: "gundem", categorySlug: "gundem" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=yerel", kategori: "yerel", categorySlug: "ankara" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=dunya", kategori: "dunya", categorySlug: "dunya" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=siyaset", kategori: "siyaset", categorySlug: "politika" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=ekonomi", kategori: "ekonomi", categorySlug: "ekonomi" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=kultur-sanat", kategori: "kultur-sanat", categorySlug: "kultur-sanat" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=spor", kategori: "spor", categorySlug: "spor" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=saglik", kategori: "saglik", categorySlug: "saglik" },
  { url: "https://sehirhaberajansi.com.tr/rss.php?kategori=egitim", kategori: "egitim", categorySlug: "egitim" },
] as const;

const SHA_KATEGORI_TO_SLUG: Record<string, string> = Object.fromEntries(
  SHA_RSS_FEEDS.map((f) => [f.kategori, f.categorySlug]),
);

export function shaFeedUrls(): string[] {
  return SHA_RSS_FEEDS.map((f) => f.url);
}

export function isShaHost(raw: string | null | undefined): boolean {
  const host = hostFromMaybeUrl(raw);
  return host === SHA_HOST || (host != null && host.endsWith(`.${SHA_HOST}`));
}

export function shaKategoriFromFeedUrl(feedUrl: string): string {
  try {
    const href = /^https?:\/\//i.test(feedUrl) ? feedUrl : `https://${feedUrl.replace(/^\/\//, "")}`;
    const u = new URL(href);
    if (!isShaHost(u.hostname)) return "";
    return String(u.searchParams.get("kategori") ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
}

/** SHA feed URL → site kategori slug. Tanınmayan SHA feed için gundem. */
export function categorySlugFromShaFeed(feedUrl: string): string | null {
  if (!isShaHost(feedUrl)) return null;
  const kategori = shaKategoriFromFeedUrl(feedUrl);
  if (kategori in SHA_KATEGORI_TO_SLUG) return SHA_KATEGORI_TO_SLUG[kategori]!;
  const canon = canonicalizeRssCategorySlug(kategori || "gundem");
  return canon || "gundem";
}

export function isShaCampaign(campaign: {
  tags?: string[] | null;
  feeds?: unknown;
  name?: string | null;
}): boolean {
  const tags = Array.isArray(campaign.tags) ? campaign.tags.map((t) => String(t).toLowerCase()) : [];
  if (tags.includes(SHA_CAMPAIGN_TAG)) return true;
  if (String(campaign.name ?? "").includes("Şehir Haber Ajansı")) return true;
  const feeds = Array.isArray(campaign.feeds) ? campaign.feeds : [];
  return feeds.some((f) => isShaHost(String(f ?? "")));
}
