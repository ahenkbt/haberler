/**
 * turkatahaber.com & yerel.net.tr — kamu + yerel (Cumha birincil RSS).
 */
import {
  buildKamuYerelCategories,
  buildKamuYerelCorporateMenuItems,
  buildKamuYerelHmNewsSiteRssFeedRows,
  buildKamuYerelIllerExtraPage,
  listKamuYerelCampaignFeedUrls,
  listKamuYerelNavHiddenCategorySlugs,
  listKamuYerelNavTopCategorySlugs,
  type KamuYerelCategoryDef,
} from "./hm-cumha-kamu-yerel-catalog.js";
import { TURKATA_HAKKIMIZDA_HTML, TURKATA_YS_KUNYE } from "./hm-gundemi-regional-sites.js";
import {
  HM_RSS_KARMA_DEFAULTS_REV,
  HM_RSS_SOURCE_PACKS_ALL_OFF,
} from "./hm-rss-source-packs.js";

export const TURKATAHABER_SLUG = "turkatahaber";
export const TURKATAHABER_DOMAIN = "turkatahaber.com";
export const YERELNET_SLUG = "yerelnet";
export const YERELNET_DOMAIN = "yerel.net.tr";
export const KAMU_YEREL_CAMPAIGN_TAG = "kamu-yerel-cumha";

export type KamuYerelSiteDef = {
  slug: typeof TURKATAHABER_SLUG | typeof YERELNET_SLUG;
  domain: string;
  displayName: string;
  description: string;
  hmYsMansetPreset: "odatv" | "sabah" | "takvim" | "mynet" | "nefes";
  hmVitrinTheme: "yenisafak" | "esen";
  hmPrimaryColor: string;
  hmSecondaryColor: string;
  hmYsSlogan: string;
  logoPath: string;
  faviconPath: string;
  kunyeEmail: string;
  footerAboutHtml: string;
  categories: KamuYerelCategoryDef[];
  sampleHeadlines: Array<{ title: string; spot: string; categorySlug: string; featured?: boolean }>;
  rssFeeds: string[];
};

export const KAMU_YEREL_SHARED_CATEGORIES = buildKamuYerelCategories();

export const TURKATAHABER_SITE: KamuYerelSiteDef = {
  slug: TURKATAHABER_SLUG,
  domain: TURKATAHABER_DOMAIN,
  displayName: "TÜRKATA HABER AJANSI",
  description:
    "TÜRKATA Haber Ajansı — kamu kurumları, yerel yönetimler ve 81 il gündemi. Yerelin sesini geleceğe taşıyan güvenilir haber ağı.",
  hmYsMansetPreset: "odatv",
  hmVitrinTheme: "yenisafak",
  hmPrimaryColor: "#0b3362",
  hmSecondaryColor: "#c00005",
  hmYsSlogan: "Yerelin sesini geleceğe taşıyan güvenilir haber ağı",
  /** PHP VPS `/brand/turkata/*` — `/turkata/*` SPA yolu canlıda 404. */
  logoPath: "/brand/turkata/turkata-logo-light.png",
  faviconPath: "/brand/turkata/favicon.ico",
  kunyeEmail: TURKATA_YS_KUNYE.email,
  footerAboutHtml: TURKATA_HAKKIMIZDA_HTML,
  categories: KAMU_YEREL_SHARED_CATEGORIES,
  sampleHeadlines: [
    {
      title: "Yerel yönetimlerde günün öne çıkan kararları",
      spot: "Belediye meclisleri ve il genel meclislerinde alınan başlıca kararlar özetlendi.",
      categorySlug: "yerel-yonetimler",
      featured: true,
    },
    {
      title: "Kamu kurumlarında atama ve duyuru gündemi",
      spot: "Merkezi ve yerel kamu kurumlarından güncel duyurular aktarıldı.",
      categorySlug: "kamu-kurumlari",
    },
    {
      title: "Ankara’da yerel gündemden seçilenler",
      spot: "Başkentte valilik, belediye ve STK haberleri.",
      categorySlug: "ankara",
    },
  ],
  rssFeeds: listKamuYerelCampaignFeedUrls(),
};

export const YERELNET_SITE: KamuYerelSiteDef = {
  slug: YERELNET_SLUG,
  domain: YERELNET_DOMAIN,
  displayName: "Yerel Haber",
  description: "Türkiye'nin yerel haber ağı: kamu kurumları, yerel yönetimler ve 81 il gündemi.",
  hmYsMansetPreset: "mynet",
  hmVitrinTheme: "esen",
  hmPrimaryColor: "#0b6e4f",
  hmSecondaryColor: "#c45c00",
  hmYsSlogan: "Türkiye'nin kamu ve yerel haber ağı",
  logoPath: "/brand/turkata/turkata-mark.png",
  faviconPath: "/brand/turkata/turkata-mark.png",
  kunyeEmail: "bilgi@yerel.net.tr",
  footerAboutHtml:
    "<p>Türkiye'nin yerel haber ağı: il, ilçe, kamu kurumları ve yerel yönetim haberleri. Birincil RSS kaynağı Cumhur Haber Ajansı (cumha.com.tr) kategori ve lokasyon beslemeleridir.</p>",
  categories: KAMU_YEREL_SHARED_CATEGORIES,
  sampleHeadlines: [
    {
      title: "İl ve ilçe teşkilatlarından günün haberleri",
      spot: "Siyasi parti il ve ilçe başkanlıklarından öne çıkan açıklamalar.",
      categorySlug: "il-ilce-baskanliklari",
      featured: true,
    },
    {
      title: "Valilik ve kaymakamlık duyuruları",
      spot: "Mülki idare birimlerinden güncel duyuru ve bilgilendirmeler.",
      categorySlug: "valilikler",
    },
    {
      title: "İzmir yerel gündem özeti",
      spot: "Ege'nin metropolünden yerel yönetim ve kamu haberleri.",
      categorySlug: "izmir",
    },
  ],
  rssFeeds: listKamuYerelCampaignFeedUrls(),
};

export const KAMU_YEREL_SITES: readonly KamuYerelSiteDef[] = [TURKATAHABER_SITE, YERELNET_SITE];

export function isKamuYerelHmSlug(slug: string | null | undefined): boolean {
  const key = String(slug ?? "")
    .trim()
    .toLowerCase();
  return key === TURKATAHABER_SLUG || key === YERELNET_SLUG;
}

export function isTurkatahaberHost(host: string | null | undefined): boolean {
  const h = String(host ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return h === TURKATAHABER_DOMAIN;
}

export function isYerelnetHost(host: string | null | undefined): boolean {
  const h = String(host ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return h === YERELNET_DOMAIN;
}

export function findKamuYerelSite(slugOrDomain: string): KamuYerelSiteDef | undefined {
  const key = String(slugOrDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return KAMU_YEREL_SITES.find((s) => s.slug === key || s.domain === key);
}

export function buildKamuYerelLayoutJson(site: KamuYerelSiteDef): Record<string, unknown> {
  const categorySlugs = site.categories.map((c) => c.slug);
  const rssRows = buildKamuYerelHmNewsSiteRssFeedRows();
  const kunye =
    site.slug === TURKATAHABER_SLUG
      ? { ...TURKATA_YS_KUNYE }
      : {
          lead: site.description,
          yayin: site.displayName.toUpperCase(),
          genelMudur: TURKATA_YS_KUNYE.genelMudur,
          yayinYonetmeni: TURKATA_YS_KUNYE.yayinYonetmeni,
          yaziIsleri: TURKATA_YS_KUNYE.yaziIsleri,
          address: TURKATA_YS_KUNYE.address,
          phone: TURKATA_YS_KUNYE.phone,
          email: site.kunyeEmail,
          tuzel: "Türkoğlu Teknoloji",
          yayinIlkeleri: TURKATA_YS_KUNYE.yayinIlkeleri,
        };

  return {
    phpTheme: true,
    frontend: "php",
    hmVitrinTheme: site.hmVitrinTheme,
    hmYsMansetPreset: site.hmYsMansetPreset,
    hmPrimaryColor: site.hmPrimaryColor,
    hmSecondaryColor: site.hmSecondaryColor,
    logoUrl: site.logoPath,
    faviconUrl: site.faviconPath,
    hmYsSlogan: site.hmYsSlogan,
    hmYsKunye: kunye,
    hmFooterAboutHtml: site.footerAboutHtml,
    hmNewsYsTickerEnabled: true,
    hmNewsYsMansetEnabled: true,
    hmNewsYsSideHeadlinesEnabled: true,
    hmNewsYsCategoryBlocksEnabled: true,
    hmNewsYsVideoBandEnabled: true,
    hmNewsYsAuthorsEnabled: true,
    hmNewsYsMostReadEnabled: true,
    hmNewsYsGalleryEnabled: true,
    hmNewsBreakingBandEnabled: true,
    hmNewsSliderEnabled: true,
    hmNewsHeaderMenuEnabled: true,
    hmNewsFooterEnabled: true,
    hmNewsCategorySectionsEnabled: true,
    hmCategorySortSlugs: categorySlugs,
    hmNavOnlyCategorySlugs: listKamuYerelNavTopCategorySlugs(),
    hmNavHiddenCategorySlugs: listKamuYerelNavHiddenCategorySlugs(),
    hmCorporateMenuItems: buildKamuYerelCorporateMenuItems(),
    hmExtraPages: [buildKamuYerelIllerExtraPage()],
    hmNewsHomeModuleItemCounts: { ysAuthors: 13 },
    mansetCategorySlug: "yerel",
    hybridRssEnabled: true,
    showPlatformNav: false,
    hmRssKarmaDefaultsRev: HM_RSS_KARMA_DEFAULTS_REV,
    hmRssSourcePacks: { ...HM_RSS_SOURCE_PACKS_ALL_OFF },
    hmNewsSiteRssFeedRows: rssRows,
    hmNewsBreakingRssFeedRows: [],
    portalHybridRssFeeds: [],
    hmNewsGoogleNewsBandEnabled: false,
    hmCorporateGoogleNewsBandEnabled: false,
  };
}
