import type {
  NewsRow,
  Category,
  RssCampaignRow,
  RssLogRow,
  VideoSourceRow,
  VideoRow,
  HomepageModuleRow,
  AdSlotRow,
  SiteSettingsRow,
  HmMakaleRow,
} from "@workspace/db";
import { getYektubeDbForRead, newsTable, videoSourcesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { displayNewsTitle } from "./rssTitleRepair.js";
import { sanitizeDisplayText } from "./sanitizeDisplayText.js";
import { normalizePublicMediaUrl } from "./normalizePublicMediaUrl.js";
import { resolveNewsItemImageUrl } from "./news-display-image.js";
import { stripHaberlerShareAndChrome } from "./haberlerArticleHtmlCleanup.js";
import { parseSeoVerificationJson } from "./seo-verification.js";
import { resolveVideoCoverUrl, isUsableYoutubeCover, normalizeYoutubeCoverUrl } from "./youtubeCoverImages.js";
import { publicUploadPath } from "./mediaUploadService.js";
import { parseHmSyncSourceKind } from "./hm-sync-source.js";
import {
  KOSE_ARTICLE_CATEGORY_NAME,
  KOSE_ARTICLE_CATEGORY_SLUG,
} from "./kose-article.js";
import { parseNavMenuItems, serializeNavMenuItems } from "@workspace/site-nav";

export type NewsContext = {
  categories: Map<number, Category>;
  authors: Map<number, { id: number; name: string }>;
};

/** List endpoints — omit heavy `content` column at DB and JSON layers. */
export const newsListSelectFields = {
  id: newsTable.id,
  title: newsTable.title,
  slug: newsTable.slug,
  spot: newsTable.spot,
  imageUrl: newsTable.imageUrl,
  categoryId: newsTable.categoryId,
  authorId: newsTable.authorId,
  senderFullName: newsTable.senderFullName,
  senderEmail: newsTable.senderEmail,
  senderPhone: newsTable.senderPhone,
  status: newsTable.status,
  isFeatured: newsTable.isFeatured,
  isSiteManset: newsTable.isSiteManset,
  isBreaking: newsTable.isBreaking,
  views: newsTable.views,
  tags: newsTable.tags,
  isAiGenerated: newsTable.isAiGenerated,
  siteId: newsTable.siteId,
  rssSourceUrl: newsTable.rssSourceUrl,
  isEditorManual: newsTable.isEditorManual,
  siteOnly: newsTable.siteOnly,
  ownerSiteId: newsTable.ownerSiteId,
  isFoodRecipe: newsTable.isFoodRecipe,
  foodRecipeCategorySlug: newsTable.foodRecipeCategorySlug,
  createdAt: newsTable.createdAt,
  updatedAt: newsTable.updatedAt,
} as const;

function shouldStripHaberlerArticleContent(row: NewsRow): boolean {
  const content = String(row.content ?? "");
  if (!content.trim()) return false;
  const source = String(row.rssSourceUrl ?? "");
  return (
    /haberler\.com/i.test(content) ||
    /haberler\.com/i.test(source) ||
    /new3card-reklam|Yeni Haberler|UYGULAMAMIZI İNDİRİN|new3detail-box-container/i.test(content)
  );
}

function serializeNewsContent(row: NewsRow): string | null {
  const raw = row.content;
  if (raw == null) return null;
  if (!shouldStripHaberlerArticleContent(row)) return raw;
  return stripHaberlerShareAndChrome(String(raw));
}

/** Site-local haberlerde kapak yalnızca DB'deki imageUrl — havuz/RSS zenginleştirmesi yok. */
function serializeNewsCoverImageUrl(row: Pick<NewsRow, "siteId" | "imageUrl">): string | null {
  if (row.siteId != null && row.siteId > 0) {
    const stored = String(row.imageUrl ?? "").trim();
    if (!stored) return null;
    return normalizePublicMediaUrl(stored) ?? stored;
  }
  return (
    normalizePublicMediaUrl(resolveNewsItemImageUrl(row)) ??
    resolveNewsItemImageUrl(row) ??
    row.imageUrl
  );
}

export function serializeNews(row: NewsRow, ctx: NewsContext) {
  const hmSyncKind = parseHmSyncSourceKind(row.rssSourceUrl);
  const isSyncedMakale = hmSyncKind === "makale";
  const cat = row.categoryId ? ctx.categories.get(row.categoryId) : undefined;
  const author = row.authorId ? ctx.authors.get(row.authorId) : undefined;
  const contentKind = isSyncedMakale ? ("makale" as const) : ("news" as const);
  return {
    id: row.id,
    siteId: row.siteId ?? null,
    title: sanitizeDisplayText(
      displayNewsTitle({
      title: row.title,
      slug: row.slug,
      isEditorManual: row.isEditorManual,
    }),
    ),
    slug: row.slug,
    spot: row.spot != null ? sanitizeDisplayText(row.spot) : row.spot,
    content: serializeNewsContent(row),
    imageUrl: serializeNewsCoverImageUrl(row),
    categoryId: row.categoryId,
    categorySlug: isSyncedMakale ? KOSE_ARTICLE_CATEGORY_SLUG : (cat?.slug ?? "genel"),
    categoryName: sanitizeDisplayText(
      isSyncedMakale ? KOSE_ARTICLE_CATEGORY_NAME : (cat?.name ?? "Genel"),
    ),
    categoryColor: isSyncedMakale ? "#0ea5e9" : (cat?.color ?? "#CC0000"),
    authorId: row.authorId,
    authorName: author?.name != null ? sanitizeDisplayText(author.name) : null,
    senderFullName: row.senderFullName ?? null,
    senderEmail: row.senderEmail ?? null,
    senderPhone: row.senderPhone ?? null,
    status: row.status,
    isFeatured: row.isFeatured,
    isSiteManset: row.isSiteManset ?? false,
    isBreaking: row.isBreaking,
    views: row.views,
    tags: row.tags,
    isEditorManual: row.isEditorManual ?? false,
    siteOnly: row.siteOnly ?? false,
    ownerSiteId: row.ownerSiteId ?? null,
    isFoodRecipe: row.isFoodRecipe ?? false,
    foodRecipeCategorySlug: row.foodRecipeCategorySlug ?? null,
    hmSyncKind,
    contentKind,
    rssSourceUrl: row.rssSourceUrl ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type NewsListRow = Omit<NewsRow, "content"> & { content?: string | null };

export function stripSerializedNewsListContent<T extends { content?: unknown }>(item: T): Omit<T, "content"> {
  const { content: _omit, ...rest } = item;
  return rest;
}

export type SerializedNews = ReturnType<typeof serializeNews>;
export type SerializedNewsListItem = Omit<SerializedNews, "content">;

export function serializeNewsListItem(row: NewsListRow, ctx: NewsContext): SerializedNewsListItem {
  return stripSerializedNewsListContent(
    serializeNews({ ...row, content: row.content ?? null } as NewsRow, ctx),
  );
}

/** Köşe yazısı — vitrin / haber detayı API şekline */
export function serializeHmMakaleAsNews(row: HmMakaleRow, ctx: NewsContext) {
  const author = row.authorId ? ctx.authors.get(row.authorId) : undefined;
  return {
    id: row.id,
    siteId: row.siteId,
    title: sanitizeDisplayText(row.title),
    slug: row.slug,
    spot: row.spot != null ? sanitizeDisplayText(row.spot) : row.spot,
    content: row.content,
    imageUrl: serializeNewsCoverImageUrl(row),
    categoryId: null,
    categorySlug: KOSE_ARTICLE_CATEGORY_SLUG,
    categoryName: sanitizeDisplayText(KOSE_ARTICLE_CATEGORY_NAME),
    categoryColor: "#0ea5e9",
    authorId: row.authorId,
    authorName: author?.name != null ? sanitizeDisplayText(author.name) : null,
    status: row.status,
    isFeatured: false,
    isSiteManset: false,
    isBreaking: false,
    views: row.views,
    tags: [] as string[],
    isEditorManual: false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    contentKind: "makale" as const,
  };
}

export function serializeHmMakaleListItem(row: HmMakaleRow, ctx: NewsContext) {
  return stripSerializedNewsListContent(serializeHmMakaleAsNews(row, ctx));
}

export function serializeRssCampaign(row: RssCampaignRow) {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    postType: row.postType,
    categorySlug: row.categorySlug,
    tags: row.tags,
    feeds: row.feeds,
    sourceType: row.sourceType,
    intervalMinutes: row.intervalMinutes,
    daysWindow: row.daysWindow,
    dailyLimit: row.dailyLimit,
    downloadImages: row.downloadImages,
    headline: row.headline,
    breakingKeywords: row.breakingKeywords,
    minWords: row.minWords,
    translateEnabled: row.translateEnabled,
    sourceLang: row.sourceLang,
    targetLang: row.targetLang,
    translateEngine: row.translateEngine,
    addedCount: row.addedCount,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    hmSiteIds: row.hmSiteIds ?? [],
    includeYekpareHaber: row.includeYekpareHaber ?? false,
    haberlerFilterByTags: row.haberlerFilterByTags ?? false,
  };
}

export function serializeRssLog(
  row: RssLogRow,
  campaignName: string,
) {
  return {
    id: row.id,
    campaignId: row.campaignId,
    campaignName,
    level: row.level,
    action: row.action,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeVideoSource(row: VideoSourceRow, logoOverride?: string | null) {
  const stored = normalizeYoutubeCoverUrl(row.logoUrl);
  const logoUrl =
    logoOverride && isUsableYoutubeCover(logoOverride)
      ? normalizeYoutubeCoverUrl(logoOverride)
      : isUsableYoutubeCover(stored)
        ? stored
        : null;
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    sourceType: row.sourceType,
    channelId: row.channelId,
    url: row.url,
    logoUrl,
    categorySlug: row.categorySlug,
    active: row.active,
    isLive: row.isLive,
    videoCount: row.videoCount,
    useYoutubeApi: row.useYoutubeApi,
  };
}

export function serializeModule(row: HomepageModuleRow) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    position: row.position,
    accentColor: row.accentColor,
  };
}

export function serializeAd(row: AdSlotRow) {
  return {
    id: row.id,
    slotKey: row.slotKey,
    name: row.name,
    description: row.description,
    html: row.html,
    enabled: row.enabled,
  };
}

const maskedIfConfigured = (value: string | null | undefined) => (value?.trim() ? "***" : null);

/** Gizli token'ı son 4 hane görünür şekilde maskele (örn. "••••••••ffa2"). */
function maskTokenLast4(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const last4 = v.slice(-4);
  return `${"•".repeat(8)}${last4}`;
}

export function serializeSettings(row: SiteSettingsRow) {
  const extraFooter = row as SiteSettingsRow & { footerInfoLinksJson?: string | null };
  return {
    siteName: row.siteName,
    tagline: row.tagline,
    logoText1: row.logoText1,
    logoText2: row.logoText2,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    navbarBg: row.navbarBg,
    navbarText: row.navbarText,
    breakingBg: row.breakingBg,
    financeBg: row.financeBg,
    footerText: row.footerText,
    copyrightText: row.copyrightText,
    address: row.address,
    phone: row.phone,
    email: row.email,
    whatsapp: row.whatsapp,
    facebook: row.facebook,
    twitter: row.twitter,
    instagram: row.instagram,
    youtube: row.youtube,
    telegram: row.telegram,
    mainNavJson: row.mainNavJson
      ? serializeNavMenuItems(parseNavMenuItems(row.mainNavJson))
      : null,
    logoUrl: row.logoUrl ?? null,
    footerNavJson: row.footerNavJson ?? null,
    footerLegalLinksJson: row.footerLegalLinksJson ?? null,
    footerInfoLinksJson: extraFooter.footerInfoLinksJson ?? null,
    legalPagesJson: row.legalPagesJson ?? null,
    modulesEnabledJson: row.modulesEnabledJson ?? null,
    homeSectionsJson: row.homeSectionsJson ?? null,
    newsLayoutJson: row.newsLayoutJson ?? null,
    homepageDesignJson: row.homepageDesignJson ?? null,
    mapsGoogleBrowserKey: row.mapsGoogleBrowserKey ?? null,
    mapsGoogleEnabled: row.mapsGoogleEnabled === true,
    hasGooglePlacesApiKey: Boolean(row.googlePlacesApiKey?.trim()),
    googlePlacesApiKey: maskedIfConfigured(row.googlePlacesApiKey),
    hasGoogleMapsServerKey: Boolean(row.googleMapsServerKey?.trim()),
    googleMapsServerKey: maskedIfConfigured(row.googleMapsServerKey),
    hasOpenaiApiKey: Boolean(row.openaiApiKey?.trim()),
    openaiApiKey: maskedIfConfigured(row.openaiApiKey),
    openaiModel: row.openaiModel ?? null,
    hasMagnificApiKey: Boolean(row.magnificApiKey?.trim()),
    magnificApiKey: maskedIfConfigured(row.magnificApiKey),
    hasMagnificWebhookSecret: Boolean(row.magnificWebhookSecret?.trim()),
    magnificWebhookSecret: maskedIfConfigured(row.magnificWebhookSecret),
    homeRecentBusinessLimit: row.homeRecentBusinessLimit ?? 10,
    bankAccountHolder: row.bankAccountHolder ?? null,
    bankIban: row.bankIban ?? null,
    bankNameBranch: row.bankNameBranch ?? null,
    bankAccountNumber: row.bankAccountNumber ?? null,
    hasAdminCallmebotKey: Boolean(row.adminCallmebotApiKey?.trim()),
    adminCallmebotApiKey: null,
    smtpHost: row.smtpHost ?? null,
    smtpPort: row.smtpPort ?? null,
    smtpUser: row.smtpUser ?? null,
    hasSmtpPass: Boolean(row.smtpPass?.trim()),
    smtpPass: null,
    smtpFrom: row.smtpFrom ?? null,
    imapHost: row.imapHost ?? null,
    imapPort: row.imapPort ?? null,
    imapUser: row.imapUser ?? null,
    hasImapPass: Boolean(row.imapPass?.trim()),
    imapPass: null,
    imapFolder: row.imapFolder ?? null,
    hasGeminiApiKey: Boolean(row.geminiApiKey?.trim()),
    geminiApiKey: maskedIfConfigured(row.geminiApiKey),
    hasYoutubeApiKey: Boolean(row.youtubeApiKey?.trim()),
    youtubeApiKey: maskedIfConfigured(row.youtubeApiKey),
    hasDeepseekApiKey: Boolean(row.deepseekApiKey?.trim()),
    deepseekApiKey: maskedIfConfigured(row.deepseekApiKey),
    hasTravelpayoutsToken: Boolean(row.travelpayoutsApiToken?.trim()),
    travelpayoutsTokenMasked: maskTokenLast4(row.travelpayoutsApiToken),
    travelpayoutsApiToken: maskedIfConfigured(row.travelpayoutsApiToken),
    travelpayoutsMarker: row.travelpayoutsMarker ?? null,
    providerMembershipStandardUsd: row.providerMembershipStandardUsd != null ? String(row.providerMembershipStandardUsd) : "10.00",
    providerMembershipGoldUsd: row.providerMembershipGoldUsd != null ? String(row.providerMembershipGoldUsd) : "10.00",
    providerMembershipPremiumPerBusinessUsd:
      row.providerMembershipPremiumPerBusinessUsd != null ? String(row.providerMembershipPremiumPerBusinessUsd) : "10.00",
    usdTryRate: row.usdTryRate != null ? String(row.usdTryRate) : null,
    usdTryUpdatedAt: row.usdTryUpdatedAt ? row.usdTryUpdatedAt.toISOString() : null,
    seoVerification: parseSeoVerificationJson(row.verificationJson),
  };
}

export function serializeVideo(row: VideoRow, sourceName?: string | null) {
  const streamUrl =
    row.platform === "yektube"
      ? row.videoId.startsWith("/api/")
        ? row.videoId
        : publicUploadPath(row.videoId.replace(/^\/+/, ""))
      : undefined;
  return {
    id: row.id,
    sourceId: row.sourceId,
    platform: row.platform,
    videoId: row.videoId,
    title: row.title,
    description: row.description,
    thumbnail: resolveVideoCoverUrl(row),
    channelName: row.channelName,
    sourceName: sourceName ?? null,
    channelId: row.channelId,
    publishedAt: row.publishedAt,
    duration: row.duration,
    categorySlug: row.categorySlug,
    isFeatured: row.isFeatured,
    isHeadline: row.isHeadline,
    isStory: row.isStory,
    sortOrder: row.sortOrder,
    active: row.active,
    embedAllowed: row.embedAllowed,
    streamUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Video listelerinde kaynak adını ekler — kanal URL slug tutarlılığı için */
export async function serializeVideosBatch(rows: VideoRow[]) {
  if (rows.length === 0) return [];
  const sourceIds = [
    ...new Set(
      rows
        .map((r) => r.sourceId)
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  ];
  const nameById = new Map<number, string>();
  if (sourceIds.length > 0) {
    const db = getYektubeDbForRead();
    const srcRows = await db
      .select({ id: videoSourcesTable.id, name: videoSourcesTable.name })
      .from(videoSourcesTable)
      .where(inArray(videoSourcesTable.id, sourceIds));
    for (const s of srcRows) nameById.set(s.id, s.name);
  }
  return rows.map((r) => serializeVideo(r, r.sourceId ? (nameById.get(r.sourceId) ?? null) : null));
}
