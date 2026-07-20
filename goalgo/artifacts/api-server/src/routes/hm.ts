import { Router, type IRouter, type Request, type RequestHandler, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "node:path";
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import {
  db as mainDb,
  categoriesTable,
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  executeNewsDbWrite,
  getNewsDbForRead,
  getNewsDbReadMode,
  hmNewsSitesTable,
  hmSiteEditorsTable,
  hmContentPoolItemsTable,
  hmAiJobsTable,
  hmMakalelerTable,
  newsTable,
  newsSiteOverridesTable,
  authorsTable,
  mapBusinessesTable,
  paymentSettingsTable,
} from "@workspace/db";
import { CreateCategoryBody, CreateNewsBody, UpdateNewsBody } from "@workspace/api-zod";
import { mergeCategories } from "../lib/category-merge";
import { denyUnlessAdminMaintenance, denyUnlessAdminMaintenanceAny } from "../lib/admin-guard";
import { syncVkdPagesFromData, syncVkdMenuPartialFromData, VKD_EDITOR_TOUCHED_KEY, VKD_SITE_SLUG } from "../lib/vkd-page-restore.js";
import { parseHmEditorFromRequest } from "../lib/hmEditorJwt.js";
import { getSessionSecret } from "../lib/secrets";
import { verifyLoginMathCaptcha } from "../lib/loginMathCaptcha.js";
import { loadNewsContext, slugify } from "../lib/news-context";
import { deriveNewsTagsFromContent } from "../lib/newsAutoTags.js";
import { serializeHmMakaleAsNews, serializeNews } from "../lib/serializers";
import { sendEmail } from "../lib/email";
import {
  ensureHmMailboxTables,
  getHmSiteMailboxAdminConfig,
  sendHmSiteMailboxEmail,
  syncHmSiteMailboxFromImap,
  testHmSiteMailboxConnections,
} from "../lib/hmSiteMailbox.js";
import { buildHmAiTxt, buildHmLlmsTxt } from "../lib/hmAiKnowledge.js";
import { sitePublicOrigin } from "../lib/site-public-origin.js";
import { PWA_ICON_PATH, PORTAL_SITE_NAME } from "../lib/portalBrand";
import { expandDomainHostKeys } from "../lib/domainHostAliases.js";
import {
  getHmStaticPageBySlug,
  loadHmStaticPages,
  updateHmStaticPage,
} from "../lib/hmStaticPages.js";
import {
  deleteHmAiJob,
  deleteHmPoolItem,
  getHmPoolAiKeysReady,
  getHmPoolQueueStats,
  listHmAiJobsWithSites,
  processHmAiJobQueue,
  requeueFailedHmAiJobs,
  resetStaleHmAiJobsProcessing,
  resolveActiveHmTargetSiteIds,
} from "../lib/hmPoolAiJobs";
import {
  runHmAhbKoseImport,
  type AhbMakaleExport,
  type AhbYazarExport,
  type HmAhbKoseImportMode,
} from "../lib/hm-ahb-kose-import";
import { syncHmEditorContentToYekpare } from "../lib/hm-yekpare-news-sync";
import {
  mergeAhbHaberExports,
  runHmAhbHaberImport,
  type AhbHaberExport,
} from "../lib/hm-ahb-haber-import";
import { runHmWordPressWxrImport } from "../lib/hm-wp-wxr-import";
import {
  mergeWpTemplatePagesIntoLayout,
  normalizeHmWpTemplatePageForSave,
  parseHmWpTemplatePageSource,
} from "../lib/hm-wp-template-pages";
import { getMediaUploadRoot } from "../lib/mediaUploadRoot";
import { extFromMime, saveMediaBuffer } from "../lib/mediaUploadService";
import { parseHmCategorySortSlugsFromLayoutJson, sortNewsCategoriesForDisplay, normalizeNewsCategorySlug } from "../lib/categorySort";
import {
  categorySlugLooksSitePrefixed,
  deriveCleanCategorySlug,
  hmEditorActivatedGlobalSlugs,
  hmEditorCategoriesWhere,
  hmEditorFormCategoriesWhere,
  isHmCorporateLayout,
  mapHmEditorCategoryRowForSite,
  parseHmActivatedCategorySlugs,
  resolveHmEditorCategoryId,
} from "../lib/hm-editor-categories";
import {
  assertHmLayoutJsonSize,
  hmLayoutTabIconUrl,
  mergeHmLayoutPatch,
  parseHmLayoutRecord,
  stringifyHmLayoutMerged,
} from "../lib/hm-layout-json";
import {
  applyVkdDonationLayoutDefaults,
  normalizeHmPublicDonationLayout,
} from "../lib/hm-public-donation-layout";
import { normalizeHmLayoutMediaUrls } from "../lib/normalizePublicMediaUrl.js";
import {
  getActiveHmNewsSiteByDomainCompat,
  getActiveHmNewsSiteBySlugCompat,
  getHmNewsSiteByIdCompat,
  ensureHmNewsSiteDomain2Column,
  ensureHmNewsSiteDomain3Column,
  ensureHmNewsSiteSeoColumns,
  isMissingHmBaseTableError,
  isMissingHmSeoColumnError,
  listActiveHmNewsSitesByUpdatedCompat,
  listHmNewsSitesCompat,
} from "../lib/hm-site-compat";
import { normalizeSeoVerification } from "../lib/seo-verification.js";
import { buildHmHomeBundle } from "../lib/hm-home-bundle.js";
import { findHmEditorEditableNewsRow, hmEditorSiteNewsWhere } from "../lib/hm-editor-news-access.js";
import { invalidateNewsPageBundleCache } from "../lib/news-page-bundle.js";
import { resolveHmHybridRssAccess } from "../lib/portal-hybrid-config.js";
import {
  isAllowedCorporateCategorySlug,
  repairCorporateSiteLocalNewsCategories,
  filterVkdPublicCategoryRows,
  ensureVkdCorporateSiteCategories,
} from "../lib/hm-corporate-news-policy.js";
import { repairCorporateSiteLocalManualImages } from "../lib/hm-corporate-manual-image-repair.js";
import { recategorizeMisclassifiedSporBatch } from "../lib/recategorizeMisclassifiedSpor.js";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "../lib/hm-global-news-category.js";

const router: IRouter = Router();

function resolveHmEditorNewsTags(
  newsCtx: Awaited<ReturnType<typeof loadNewsContext>>,
  data: {
    title: string;
    spot?: string | null;
    content?: string | null;
    categorySlug?: string | null;
    tags?: string[] | null;
  },
): string[] {
  let categoryName: string | null = null;
  for (const [, cat] of newsCtx.categories) {
    if (cat.slug === data.categorySlug) {
      categoryName = cat.name;
      break;
    }
  }
  return deriveNewsTagsFromContent({
    title: data.title,
    spot: data.spot,
    content: data.content,
    categoryName,
    categorySlug: data.categorySlug ?? null,
    existingTags: data.tags ?? [],
    minTags: 10,
  });
}

const hmAhbHaberImportMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 48 * 1024 * 1024 },
});

const hmAhbKoseImportMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 48 * 1024 * 1024 },
});

const hmWpWxrImportMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 48 * 1024 * 1024 },
});

const hmWpTemplatePageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 25, fieldSize: 5 * 1024 * 1024 },
});

const JWT_TYP = "hm_editor";
const JWT_TYP_AUTHOR = "hm_author";
const newsReadDb = () => getNewsDbForRead();
const db = mainDb;
const PUBLIC_NEWS_SUBMISSION_MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Migrasyon atlanmış eski prod için: köşe yazarı şifre sıfırlama kolonları. */
let authorsPwResetSchemaPromise: Promise<void> | null = null;
function ensureAuthorsPwResetColumns(): Promise<void> {
  if (authorsPwResetSchemaPromise) return authorsPwResetSchemaPromise;
  authorsPwResetSchemaPromise = executeNewsDbWrite(sql`
      ALTER TABLE authors ADD COLUMN IF NOT EXISTS pw_reset_token TEXT;
      ALTER TABLE authors ADD COLUMN IF NOT EXISTS pw_reset_expires_at TIMESTAMP;
    `)
    .then(() => undefined)
    .catch((e) => {
      authorsPwResetSchemaPromise = null;
      throw e;
    });
  return authorsPwResetSchemaPromise;
}

let authorsSortSchemaPromise: Promise<void> | null = null;
function ensureAuthorsSortOrderColumn(): Promise<void> {
  if (authorsSortSchemaPromise) return authorsSortSchemaPromise;
  authorsSortSchemaPromise = executeNewsDbWrite(sql`ALTER TABLE authors ADD COLUMN IF NOT EXISTS hm_sort_order INTEGER`)
    .then(() => undefined)
    .catch((e) => {
      authorsSortSchemaPromise = null;
      throw e;
    });
  return authorsSortSchemaPromise;
}

function hmJwtSecret(): string {
  const s = String(process.env["HM_EDITOR_JWT_SECRET"] ?? "").trim();
  if (s) return s;
  return getSessionSecret();
}

function normalizeSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeDomain(raw: string | undefined | null): string | null {
  let d = String(raw ?? "").trim().toLowerCase().replace(/\\/g, "/");
  if (!d) return null;
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(d)) {
      d = new URL(d).hostname;
    } else {
      d = d.split(/[/?#]/)[0] ?? "";
    }
  } catch {
    d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0] ?? "";
  }
  return d.replace(/:\d+$/, "").replace(/\.$/, "").trim() || null;
}

/** Başka bir HM sitesinin `domain` / `domain2` / `domain3` alanında kullanılıyor mu? */
async function findHmSiteIdClaimingHost(host: string | null, exceptSiteId?: number): Promise<number | null> {
  const n = normalizeDomain(host);
  if (!n) return null;
  await ensureHmNewsSiteDomain2Column().catch(() => undefined);
  await ensureHmNewsSiteDomain3Column().catch(() => undefined);
  await ensureHmNewsSiteDomain3Column().catch(() => undefined);
  const rows = await newsReadDb()
    .select({
      id: hmNewsSitesTable.id,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable);
  for (const row of rows) {
    if (exceptSiteId != null && row.id === exceptSiteId) continue;
    if (
      normalizeDomain(row.domain) === n ||
      normalizeDomain(row.domain2) === n ||
      normalizeDomain(row.domain3) === n
    ) {
      return row.id;
    }
  }
  return null;
}

async function assertHmDomainsAvailable(
  domain: string | null,
  domain2: string | null,
  domain3: string | null,
  exceptSiteId?: number,
): Promise<string | null> {
  const normalized = [domain, domain2, domain3].map((d) => normalizeDomain(d)).filter(Boolean) as string[];
  if (new Set(normalized).size !== normalized.length) {
    return "Alan adları birbirinden farklı olmalı.";
  }
  for (const h of normalized) {
    const taken = await findHmSiteIdClaimingHost(h, exceptSiteId);
    if (taken != null) return `Bu alan adı başka bir siteye kayıtlı: ${h}`;
  }
  return null;
}

function domainLookupCandidates(raw: string | undefined | null): string[] {
  const host = normalizeDomain(raw);
  if (!host) return [];
  const hosts = Array.from(
    new Set(
      expandDomainHostKeys(host).flatMap((h) => {
        const rootHost = h.replace(/^www\./, "");
        return [h, rootHost, `www.${rootHost}`];
      }),
    ),
  );
  const out = new Set<string>();
  for (const h of hosts) {
    out.add(h);
    out.add(`https://${h}`);
    out.add(`https://${h}/`);
    out.add(`http://${h}`);
    out.add(`http://${h}/`);
  }
  return Array.from(out);
}

const HM_DONATION_DEFAULT_AMOUNTS = [500, 1000, 2500];

type HmDonationLayout = {
  enabled: boolean;
  title: string;
  description: string;
  amounts: number[];
};

function parseHmLayoutJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function cleanPublicSubmissionText(raw: unknown, max: number): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanPublicSubmissionHtml(raw: unknown, max: number): string {
  return String(raw ?? "").trim().slice(0, max);
}

function publicSubmissionSlug(title: string): string {
  const base = slugify(title).replace(/^-+|-+$/g, "") || "haber";
  return `${base}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

async function savePublicSubmissionImage(dataUrlRaw: unknown, title: string): Promise<string | null> {
  const dataUrl = String(dataUrlRaw ?? "").trim();
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/i);
  if (!m) throw new Error("Görsel JPG, PNG, GIF veya WebP olmalı.");
  const mime = m[1].toLowerCase();
  const b64 = m[2].replace(/\s/g, "");
  const buf = Buffer.from(b64, "base64");
  if (!buf.length || buf.length > PUBLIC_NEWS_SUBMISSION_MAX_IMAGE_BYTES) {
    throw new Error("Görsel en fazla 6 MB olabilir.");
  }
  const ext = extFromMime(mime);
  if (!ext) throw new Error("Desteklenmeyen görsel türü.");
  const saved = await saveMediaBuffer(buf, {
    ext,
    mime,
    title: String(title ?? "").trim() || "haber-gonder",
    optimizeNewsImage: true,
  });
  return saved.url;
}

const DEFAULT_HM_RSS_ROWS = [
  { id: "turkiye", label: "Türkiye", url: "https://www.ntv.com.tr/turkiye.rss" },
  { id: "dunya", label: "Dünya", url: "https://www.ntv.com.tr/dunya.rss" },
  { id: "ekonomi", label: "Ekonomi", url: "https://www.ntv.com.tr/ekonomi.rss" },
  { id: "teknoloji", label: "Teknoloji", url: "https://www.ntv.com.tr/teknoloji.rss" },
  { id: "saglik", label: "Sağlık", url: "https://www.ntv.com.tr/saglik.rss" },
  { id: "spor", label: "Spor", url: "" },
  { id: "yasam", label: "Yaşam", url: "https://www.ntv.com.tr/yasam.rss" },
  { id: "otomobil", label: "Otomobil", url: "https://www.ntv.com.tr/otomobil.rss" },
  { id: "para", label: "Para", url: "https://www.ntv.com.tr/ntvpara.rss" },
  { id: "egitim", label: "Eğitim", url: "https://www.ntv.com.tr/egitim.rss" },
  { id: "savunmaSanayi", label: "Savunma Sanayi", url: "https://www.dirilispostasi.com/rss/savunma-sanayi" },
];

function defaultHmNewsSiteLayout(incoming: unknown): Record<string, unknown> {
  const inc = incoming && typeof incoming === "object" && !Array.isArray(incoming)
    ? (incoming as Record<string, unknown>)
    : {};
  const theme = String(inc.hmVitrinTheme ?? "").trim().toLowerCase();
  const isCorporate = theme === "corporate" || theme === "kurumsal";
  const boxRows = DEFAULT_HM_RSS_ROWS.map((row) => ({ ...row }));
  const siteRows = DEFAULT_HM_RSS_ROWS.map((row) => ({ ...row }));
  return {
    hmVitrinTheme: isCorporate ? "corporate" : "esen",
    mansetVariant: "center-trio",
    hmChromeColorMode: "light",
    hmNewsHeaderMenuEnabled: true,
    hmNewsStripMenuEnabled: false,
    hmNewsSliderEnabled: true,
    hmNewsRssHeadlineEnabled: false,
    hmNewsBreakingBandEnabled: true,
    hmNewsGoogleNewsBandEnabled: !isCorporate,
    hmNewsBreakingRssArticleLinkEnabled: true,
    hmNewsBreakingRssFeedRows: boxRows,
    hmNewsSiteRssFeedRows: siteRows,
    hybridRssEnabled: !isCorporate,
    hmNewsCategorySectionsEnabled: true,
    hmNewsQuickLinksEnabled: true,
    hmNewsAuthorsEnabled: !isCorporate,
    hmNewsHorizontalAuthorsEnabled: !isCorporate,
    hmNewsSidebarAuthorsEnabled: !isCorporate,
    hmNewsSidebarEnabled: true,
    hmNewsSidebarCategoriesEnabled: true,
    hmNewsFooterEnabled: true,
    hmNewsFooterCategoriesEnabled: true,
    hmNewsRssLinksEnabled: !isCorporate,
    hmNewsVideoTvEnabled: true,
    sadeNewsCitiesBandEnabled: true,
    hmCorporateAtaturkCornerEnabled: true,
    hmCorporateAuthorsEnabled: false,
    hmCorporateGoogleNewsBandEnabled: false,
    hmCorporateRssBandEnabled: false,
    ...inc,
  };
}

function donationText(raw: unknown, fallback: string, max = 240): string {
  const t = String(raw ?? "").trim();
  return (t || fallback).slice(0, max);
}

function donationAmounts(raw: unknown): number[] {
  const source = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[,\n;]/)
      : [];
  const unique = new Set<number>();
  for (const item of source) {
    const n = Math.round(Number(String(item).replace(/[^\d.,]/g, "").replace(",", ".")));
    if (Number.isFinite(n) && n >= 20 && n <= 100_000) unique.add(n);
  }
  const out = Array.from(unique).slice(0, 8);
  return out.length ? out : HM_DONATION_DEFAULT_AMOUNTS;
}

function parseHmDonationLayout(layout: Record<string, unknown>): HmDonationLayout {
  const raw = layout.hmCorporateDonation;
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    enabled: o.enabled === false ? false : true,
    title: donationText(o.title, "Kurumsal yayıncılığa destek olun", 120),
    description: donationText(
      o.description,
      "Bağışınız bağımsız haber üretimi, yerel içerik ve okur odaklı yayınların sürdürülebilirliği için kullanılır.",
      320,
    ),
    amounts: donationAmounts(o.amounts),
  };
}

async function getHmDonationStripe(): Promise<Stripe | null> {
  const envSecret = String(process.env["STRIPE_SECRET_KEY"] ?? "").trim();
  if (envSecret) return new Stripe(envSecret, { apiVersion: "2024-06-20" as never });

  const [settings] = await db.select().from(paymentSettingsTable).limit(1);
  const dbSecret = String(settings?.stripeSecretKey ?? "").trim();
  if (!settings?.stripeEnabled || !dbSecret) return null;
  return new Stripe(dbSecret, { apiVersion: "2024-06-20" as never });
}

function hmDonationPublicUrl(site: { slug: string; domain?: string | null }, suffix: string): string {
  const domain = normalizeDomain(site.domain);
  const origin = domain ? `https://${domain}` : sitePublicOrigin().replace(/\/+$/, "");
  return `${origin}/tr/${encodeURIComponent(site.slug)}${suffix}`;
}

type HmSeoVerification = {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
  customMetaTags?: { name: string; content: string }[];
};

function normalizeHmDescription(raw: unknown): string | null {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, 500) : null;
}

function cleanVerificationContent(raw: unknown, max = 500): string {
  return String(raw ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeHmSeoVerification(raw: unknown): HmSeoVerification | null {
  return normalizeSeoVerification(raw);
}

function parseHmSeoVerification(raw: string | null | undefined): HmSeoVerification | null {
  try {
    return normalizeHmSeoVerification(raw ? JSON.parse(raw) : null);
  } catch {
    return null;
  }
}

function parseHmEditor(req: Request): { editorId: number; siteId: number } | null {
  return parseHmEditorFromRequest(req);
}

function denyUnlessHmEditor(req: Request, res: Response): { editorId: number; siteId: number } | null {
  const x = parseHmEditor(req);
  if (!x) {
    res.status(401).json({ error: "Editör oturumu gerekli (Bearer token)." });
    return null;
  }
  return x;
}

function parseHmAuthor(req: Request): { authorId: number; siteId: number } | null {
  const h = String(req.headers.authorization ?? "").trim();
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  try {
    const p = jwt.verify(token, hmJwtSecret()) as { typ?: string; aid?: number; sid?: number };
    if (p.typ !== JWT_TYP_AUTHOR || typeof p.aid !== "number" || typeof p.sid !== "number") return null;
    return { authorId: p.aid, siteId: p.sid };
  } catch {
    return null;
  }
}

function denyUnlessHmAuthor(req: Request, res: Response): { authorId: number; siteId: number } | null {
  const x = parseHmAuthor(req);
  if (!x) {
    res.status(401).json({ error: "Köşe yazarı oturumu gerekli (Bearer token)." });
    return null;
  }
  return x;
}

async function isHmEditorCategoryId(siteId: number, categoryId: number): Promise<boolean> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) return false;
  const [row] = await newsReadDb()
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.exclusiveSiteId, siteId)));
  return !!row;
}

async function resolveCategoryIdForHmEditor(siteId: number, rawSlug: unknown): Promise<number | null> {
  const hmAccess = await resolveHmHybridRssAccess(siteId);
  return resolveHmEditorCategoryId(siteId, rawSlug, {
    siteExclusiveOnly: hmAccess?.isCorporate === true,
  });
}

async function resolveHmVisibleCategoryId(siteId: number, rawSlug: unknown): Promise<number | null> {
  return resolveHmEditorCategoryId(siteId, rawSlug);
}

async function isHmVisibleCategoryId(siteId: number, categoryId: number): Promise<boolean> {
  return isHmEditorCategoryId(siteId, categoryId);
}

async function cloneCategoryIdForHmTarget(sourceCategoryId: number | null, targetSiteId: number): Promise<number | null> {
  if (sourceCategoryId == null) return null;
  const [sourceCat] = await newsReadDb()
    .select({
      slug: categoriesTable.slug,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, sourceCategoryId));
  if (!sourceCat) return null;
  if (sourceCat.exclusiveSiteId == null || sourceCat.exclusiveSiteId === targetSiteId) return sourceCategoryId;
  return resolveHmVisibleCategoryId(targetSiteId, sourceCat.slug);
}

function makeHmCopySlug(base: string | null | undefined, targetSiteId: number, sourceId: number): string {
  const raw = String(base ?? "haber")
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${raw || "haber"}-hm${targetSiteId}-src${sourceId}`;
}

/* —— Public meta (slug / domain) ————————————————————————————— */

router.get("/hm/meta/slugs", async (req, res): Promise<void> => {
  /** Panel kategori / RSS hedefi: pasif siteler de seçilebilsin (yalnızca aktif olanlar vitrinde görünür). */
  const adminList = String(req.query.admin ?? "").trim() === "1";
  if (adminList) {
    if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
    const rows = await newsReadDb()
      .select({
        id: hmNewsSitesTable.id,
        slug: hmNewsSitesTable.slug,
        displayName: hmNewsSitesTable.displayName,
        active: hmNewsSitesTable.active,
      })
      .from(hmNewsSitesTable)
      .orderBy(hmNewsSitesTable.slug);
    res.json(rows);
    return;
  }
  const rows = await newsReadDb()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      displayName: hmNewsSitesTable.displayName,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true))
    .orderBy(hmNewsSitesTable.slug);
  res.json(rows);
});

/** Tanıtım sayfası: aktif haber merkezi siteleri (logo + alan adı). Yeni site eklendikçe liste güncellenir. */
router.get("/hm/showcase-sites", async (_req, res): Promise<void> => {
  try {
    const rows = await newsReadDb()
      .select({
        slug: hmNewsSitesTable.slug,
        displayName: hmNewsSitesTable.displayName,
        domain: hmNewsSitesTable.domain,
        layoutJson: hmNewsSitesTable.layoutJson,
        createdAt: hmNewsSitesTable.createdAt,
      })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.active, true))
      .orderBy(desc(hmNewsSitesTable.createdAt));

    const out = rows.map((row) => {
      let logoUrl: string | null = null;
      try {
        const raw = row.layoutJson != null ? String(row.layoutJson).trim() : "";
        if (raw) {
          const j = JSON.parse(raw) as { logoUrl?: unknown; logo?: unknown };
          const fromLogoUrl = typeof j.logoUrl === "string" ? j.logoUrl.trim() : "";
          const fromLogo = typeof j.logo === "string" ? j.logo.trim() : "";
          const u = fromLogoUrl || fromLogo;
          logoUrl = u.length > 0 ? u : null;
        }
      } catch {
        logoUrl = null;
      }
      return {
        slug: row.slug,
        displayName: row.displayName,
        domain: row.domain,
        logoUrl,
        createdAt: row.createdAt,
      };
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "showcase" });
  }
});

function stripHmPublicMetaLayoutContent(layout: unknown): unknown {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return layout;
  const out: Record<string, unknown> = { ...(layout as Record<string, unknown>) };
  delete out.hmCorporatePageHtml;
  if (Array.isArray(out.hmExtraPages)) {
    out.hmExtraPages = out.hmExtraPages.map((page) => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return page;
      const { bodyHtml: _bodyHtml, ...rest } = page as Record<string, unknown>;
      return rest;
    });
  }
  return out;
}

function wantsHmMetaPageContent(req: Request): boolean {
  return req.query.includePageContent === "1" || req.query.includePageContent === "true";
}

function serializeHmMetaRow(row: typeof hmNewsSitesTable.$inferSelect, opts?: { includePageContent?: boolean }) {
  let contact: unknown = null;
  let layout: unknown = null;
  try {
    contact = row.contactJson ? JSON.parse(row.contactJson) : null;
  } catch {
    contact = null;
  }
  try {
    const parsed = row.layoutJson ? parseHmLayoutJson(row.layoutJson) : {};
    let normalized = normalizeHmPublicDonationLayout(parsed);
    if (normalizeSlug(row.slug) === "vkd") {
      normalized = applyVkdDonationLayoutDefaults(normalized);
    }
    layout = opts?.includePageContent === true ? normalized : stripHmPublicMetaLayoutContent(normalized);
    layout = normalizeHmLayoutMediaUrls(layout);
  } catch {
    layout = null;
  }
  return {
    id: row.id,
    slug: row.slug,
    domain: row.domain,
    domain2: row.domain2 ?? null,
    domain3: row.domain3 ?? null,
    displayName: row.displayName,
    description: row.description,
    contact,
    layout,
    seoVerification: parseHmSeoVerification(row.verificationJson),
    createdAt: row.createdAt,
    layoutUpdatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt ?? null,
  };
}

router.get("/hm/meta/by-id/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "id gerekli" });
    return;
  }
  const row = await getHmNewsSiteByIdCompat(id);
  if (!row || !row.active) {
    res.status(404).json({ error: "Site bulunamadı" });
    return;
  }
  res.json(serializeHmMetaRow(row, { includePageContent: wantsHmMetaPageContent(req) }));
});

async function getHmSiteMappedToDomain(rawDomain: unknown): Promise<typeof hmNewsSitesTable.$inferSelect | undefined> {
  const host = normalizeDomain(typeof rawDomain === "string" ? rawDomain : "");
  if (!host) return undefined;
  return getActiveHmNewsSiteByDomainCompat(domainLookupCandidates(host));
}

async function getHmSiteMappedToRequestHost(req: Request): Promise<typeof hmNewsSitesTable.$inferSelect | undefined> {
  const forwardedHost = String(req.get("x-forwarded-host") ?? "").split(",")[0]?.trim();
  return getHmSiteMappedToDomain(forwardedHost || req.get("host") || "");
}

router.get("/hm/meta/by-slug/:slug", async (req, res): Promise<void> => {
  const slug = normalizeSlug(String(req.params.slug ?? ""));
  if (!slug) {
    res.status(400).json({ error: "slug gerekli" });
    return;
  }

  const queryDomain = typeof req.query.domain === "string" ? req.query.domain : "";
  if (queryDomain) {
    const domainRow = await getHmSiteMappedToDomain(queryDomain);
    if (!domainRow || normalizeSlug(domainRow.slug) !== slug) {
      res.status(404).json({ error: "Site bu alan adına ait değil" });
      return;
    }
    res.json(serializeHmMetaRow(domainRow, { includePageContent: wantsHmMetaPageContent(req) }));
    return;
  }

  const hostRow = await getHmSiteMappedToRequestHost(req);
  if (hostRow) {
    if (normalizeSlug(hostRow.slug) !== slug) {
      res.status(404).json({ error: "Site bu alan adına ait değil" });
      return;
    }
    res.json(serializeHmMetaRow(hostRow, { includePageContent: wantsHmMetaPageContent(req) }));
    return;
  }

  const row = await getActiveHmNewsSiteBySlugCompat(slug);
  if (!row || !row.active) {
    res.status(404).json({ error: "Site bulunamadı" });
    return;
  }
  res.json(serializeHmMetaRow(row, { includePageContent: wantsHmMetaPageContent(req) }));
});

router.get("/hm/meta/by-domain", async (req, res): Promise<void> => {
  const host = normalizeDomain(typeof req.query.domain === "string" ? req.query.domain : "");
  if (!host) {
    res.status(400).json({ error: "domain query gerekli" });
    return;
  }
  const domainCandidates = domainLookupCandidates(host);
  const row = await getActiveHmNewsSiteByDomainCompat(domainCandidates);
  if (!row) {
    res.status(404).json({ error: "Site bulunamadı" });
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  res.json(serializeHmMetaRow(row, { includePageContent: wantsHmMetaPageContent(req) }));
});

/** P1-1: HM anasayfa — featured + breaking + popular tek round-trip. */
router.get("/hm/home-bundle", async (req, res): Promise<void> => {
  const siteIdRaw = req.query.siteId;
  const siteId = parseInt(String(siteIdRaw ?? ""), 10);
  if (!Number.isFinite(siteId) || siteId <= 0) {
    res.status(400).json({ error: "siteId gerekli" });
    return;
  }
  const sliderLimit = Math.min(Math.max(parseInt(String(req.query.sliderLimit ?? "15"), 10) || 15, 1), 30);
  const categorySlug = String(req.query.mansetCategorySlug ?? req.query.categorySlug ?? "").trim() || null;
  try {
    const bundle = await buildHmHomeBundle(siteId, sliderLimit, categorySlug);
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
    res.json(bundle);
  } catch (err) {
    console.error("[hm/home-bundle]", err);
    res.status(500).json({ error: "Anasayfa paketi yüklenemedi" });
  }
});

/* —— Admin: sites CRUD ——————————————————————————————————————— */

router.get("/hm/sites", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  try {
    await ensureHmNewsSiteDomain2Column().catch(() => undefined);
  await ensureHmNewsSiteDomain3Column().catch(() => undefined);
    const sites = await listHmNewsSitesCompat();
    const editors = await newsReadDb().select().from(hmSiteEditorsTable);
    const bySite = new Map<number, typeof editors>();
    for (const e of editors) {
      const arr = bySite.get(e.siteId) ?? [];
      arr.push(e);
      bySite.set(e.siteId, arr);
    }
    res.json({
      items: sites.map((s) => ({
        ...s,
        editors: (bySite.get(s.id) ?? []).map((e) => ({
          id: e.id,
          email: e.email,
          displayName: e.displayName,
          isActive: e.isActive,
          createdAt: e.createdAt,
        })),
      })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingBaseTables = isMissingHmBaseTableError(e);
    const missingSeoColumns = isMissingHmSeoColumnError(e);
    res.status(missingBaseTables || missingSeoColumns ? 503 : 500).json({
      error: missingBaseTables
        ? "Haber merkezi tabloları yok. Sunucuda PostgreSQL migration 0030_hm_news_sites.sql (ve sonrası) uygulanmalı."
        : missingSeoColumns
          ? "Haber sitesi SEO kolonları yok. Sunucuda PostgreSQL migration 0048_hm_site_seo_verification.sql uygulanmalı."
        : msg.slice(0, 400),
      items: [],
    });
  }
});

router.post("/hm/sites", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const b = req.body as {
    slug?: string;
    domain?: string | null;
    domain2?: string | null;
    domain3?: string | null;
    displayName?: string;
    description?: unknown;
    contact?: { phone?: string; email?: string; address?: string; notes?: string };
    layoutJson?: unknown;
    seoVerification?: unknown;
    editorDisplayName?: string;
    editorEmail?: string;
    editorPassword?: string;
  };
  const slug = normalizeSlug(String(b.slug ?? ""));
  if (!slug || slug.length < 2) {
    res.status(400).json({ error: "Geçerli bir slug girin (en az 2 karakter, küçük harf, tire)." });
    return;
  }
  const displayName = String(b.displayName ?? "").trim();
  if (!displayName) {
    res.status(400).json({ error: "Site görünen adı gerekli" });
    return;
  }
  const editorEmail = String(b.editorEmail ?? "").trim().toLowerCase();
  const editorPassword = String(b.editorPassword ?? "");
  if (!editorEmail || !editorEmail.includes("@")) {
    res.status(400).json({ error: "Editör e-postası gerekli" });
    return;
  }
  if (editorPassword.length < 8) {
    res.status(400).json({ error: "Editör şifresi en az 8 karakter olmalı" });
    return;
  }
  const domain = normalizeDomain(b.domain ?? null);
  const domain2 = normalizeDomain(b.domain2 ?? null);
  const domain3 = normalizeDomain(b.domain3 ?? null);
  const domainErr = await assertHmDomainsAvailable(domain, domain2, domain3);
  if (domainErr) {
    res.status(409).json({ error: domainErr });
    return;
  }
  const description = normalizeHmDescription(b.description);
  const contactJson = JSON.stringify(b.contact ?? {});
  const layoutJson = JSON.stringify(defaultHmNewsSiteLayout(b.layoutJson));
  const seoVerification = normalizeHmSeoVerification(b.seoVerification);

  try {
    await ensureHmNewsSiteSeoColumns();
    await ensureHmNewsSiteDomain2Column();
    await ensureHmNewsSiteDomain3Column();
    await ensureHmNewsSiteDomain3Column();
    const [site] = await dualWriteInsert(hmNewsSitesTable, {
        slug,
        domain,
        domain2,
        domain3,
        displayName,
        description,
        contactJson,
        layoutJson,
        verificationJson: seoVerification ? JSON.stringify(seoVerification) : null,
        active: true,
      });

    if (!site) {
      res.status(500).json({ error: "Site oluşturulamadı" });
      return;
    }

    const hash = await bcrypt.hash(editorPassword, 10);
    const [editor] = await dualWriteInsert(hmSiteEditorsTable, {
        siteId: site.id,
        email: editorEmail,
        passwordHash: hash,
        displayName: String(b.editorDisplayName ?? "").trim() || null,
        isActive: true,
      });

    res.status(201).json({
      site,
      editor: editor
        ? { id: editor.id, email: editor.email, displayName: editor.displayName, createdAt: editor.createdAt }
        : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      res.status(409).json({ error: "Bu slug veya domain zaten kayıtlı." });
      return;
    }
    res.status(500).json({ error: msg.slice(0, 400) });
  }
});

router.patch("/hm/sites/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const b = req.body as Partial<{
    slug: string;
    displayName: string;
    description: unknown;
    domain: string | null;
    domain2: string | null;
    domain3: string | null;
    contact: { phone?: string; email?: string; address?: string; notes?: string };
    layoutJson: unknown;
    seoVerification: unknown;
    active: boolean;
    editorId: number;
    editorDisplayName: string;
    editorEmail: string;
    editorPassword: string;
  }>;
  const patch: Partial<typeof hmNewsSitesTable.$inferInsert> = {};
  if (typeof b.slug === "string") {
    const next = normalizeSlug(b.slug);
    if (!next || next.length < 2) {
      res.status(400).json({ error: "Geçerli bir slug girin (en az 2 karakter, küçük harf, tire)." });
      return;
    }
    patch.slug = next;
  }
  if (typeof b.displayName === "string") patch.displayName = b.displayName.trim();
  if ("description" in b) patch.description = normalizeHmDescription(b.description);
  if ("domain" in b) patch.domain = normalizeDomain(b.domain ?? null);
  if ("domain2" in b) patch.domain2 = normalizeDomain(b.domain2 ?? null);
  if ("domain3" in b) patch.domain3 = normalizeDomain(b.domain3 ?? null);
  if ("domain" in b || "domain2" in b || "domain3" in b) {
    const [cur] = await newsReadDb()
      .select({
        domain: hmNewsSitesTable.domain,
        domain2: hmNewsSitesTable.domain2,
        domain3: hmNewsSitesTable.domain3,
      })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.id, id));
    const nextDomain = "domain" in patch ? patch.domain : normalizeDomain(cur?.domain ?? null);
    const nextDomain2 = "domain2" in patch ? patch.domain2 : normalizeDomain(cur?.domain2 ?? null);
    const nextDomain3 = "domain3" in patch ? patch.domain3 : normalizeDomain(cur?.domain3 ?? null);
    const domainErr = await assertHmDomainsAvailable(
      nextDomain ?? null,
      nextDomain2 ?? null,
      nextDomain3 ?? null,
      id,
    );
    if (domainErr) {
      res.status(409).json({ error: domainErr });
      return;
    }
  }
  if (b.contact !== undefined) patch.contactJson = JSON.stringify(b.contact ?? {});
  if (b.seoVerification !== undefined) {
    const seoVerification = normalizeHmSeoVerification(b.seoVerification);
    patch.verificationJson = seoVerification ? JSON.stringify(seoVerification) : null;
  }
  if (b.layoutJson !== undefined) {
    const [prevRow] = await newsReadDb().select({ layoutJson: hmNewsSitesTable.layoutJson }).from(hmNewsSitesTable).where(eq(hmNewsSitesTable.id, id));
    let prev: Record<string, unknown> = {};
    try {
      const rawPrev = prevRow?.layoutJson;
      if (rawPrev != null && String(rawPrev).trim()) {
        const j = JSON.parse(String(rawPrev)) as unknown;
        if (j && typeof j === "object" && !Array.isArray(j)) prev = j as Record<string, unknown>;
      }
    } catch {
      prev = {};
    }
    const inc =
      b.layoutJson && typeof b.layoutJson === "object" && !Array.isArray(b.layoutJson)
        ? (b.layoutJson as Record<string, unknown>)
        : {};
    const merged: Record<string, unknown> = { ...prev, ...inc };
    if (prev.hmCategoryColors && inc.hmCategoryColors && typeof inc.hmCategoryColors === "object" && !Array.isArray(inc.hmCategoryColors)) {
      merged.hmCategoryColors = {
        ...(prev.hmCategoryColors as Record<string, unknown>),
        ...(inc.hmCategoryColors as Record<string, unknown>),
      };
    }
    patch.layoutJson = JSON.stringify(merged);
  }
  if (typeof b.active === "boolean") patch.active = b.active;

  const editorId = Number(b.editorId);
  const wantsEditor =
    Number.isFinite(editorId) &&
    (typeof b.editorDisplayName === "string" ||
      typeof b.editorEmail === "string" ||
      (typeof b.editorPassword === "string" && b.editorPassword.length > 0));

  if (Object.keys(patch).length === 0 && !wantsEditor) {
    res.status(400).json({ error: "Güncellenecek alan yok" });
    return;
  }

  if (wantsEditor) {
    const pw = typeof b.editorPassword === "string" ? b.editorPassword : "";
    if (pw.length > 0 && pw.length < 8) {
      res.status(400).json({ error: "Editör şifresi en az 8 karakter olmalı" });
      return;
    }
    if (typeof b.editorEmail === "string") {
      const em = b.editorEmail.trim().toLowerCase();
      if (!em.includes("@")) {
        res.status(400).json({ error: "Geçerli editör e-postası gerekli" });
        return;
      }
    }
  }

  patch.updatedAt = new Date();
  const wantsSeoColumnPatch =
    Object.prototype.hasOwnProperty.call(patch, "description") ||
    Object.prototype.hasOwnProperty.call(patch, "verificationJson");
  try {
    if (wantsSeoColumnPatch) {
      await ensureHmNewsSiteSeoColumns();
    }
    if ("domain" in patch || "domain2" in patch) {
      await ensureHmNewsSiteDomain2Column();
    await ensureHmNewsSiteDomain3Column();
    }
    let row: typeof hmNewsSitesTable.$inferSelect | undefined;
    if (Object.keys(patch).length > 0) {
      const [updated] = await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, id));
      if (!updated) {
        res.status(404).json({ error: "Bulunamadı" });
        return;
      }
      row = await getHmNewsSiteByIdCompat(id);
    } else {
      const existing = await getHmNewsSiteByIdCompat(id);
      row = existing;
      if (!row) {
        res.status(404).json({ error: "Bulunamadı" });
        return;
      }
    }

    if (wantsEditor) {
      const [ed] = await newsReadDb()
        .select()
        .from(hmSiteEditorsTable)
        .where(and(eq(hmSiteEditorsTable.id, editorId), eq(hmSiteEditorsTable.siteId, id)));
      if (!ed) {
        res.status(400).json({ error: "Editör bu siteye ait değil veya bulunamadı" });
        return;
      }
      const ePatch: Partial<typeof hmSiteEditorsTable.$inferInsert> = {};
      if (typeof b.editorDisplayName === "string") ePatch.displayName = b.editorDisplayName.trim() || null;
      if (typeof b.editorEmail === "string") ePatch.email = b.editorEmail.trim().toLowerCase();
      if (typeof b.editorPassword === "string" && b.editorPassword.length >= 8) {
        ePatch.passwordHash = await bcrypt.hash(b.editorPassword, 10);
      }
      if (Object.keys(ePatch).length > 0) {
        ePatch.updatedAt = new Date();
        await dualWriteUpdate(hmSiteEditorsTable, ePatch, eq(hmSiteEditorsTable.id, editorId));
      }
    }

    const finalRow = await getHmNewsSiteByIdCompat(id);
    res.json(finalRow ?? row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      res.status(409).json({ error: "Bu slug veya domain zaten kayıtlı." });
      return;
    }
    res.status(500).json({ error: msg.slice(0, 400) });
  }
});

router.delete("/hm/sites/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  try {
    const [row] = await newsReadDb()
      .select({ id: hmNewsSitesTable.id })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Bulunamadı" });
      return;
    }
    await dualWriteDelete(hmNewsSitesTable, eq(hmNewsSitesTable.id, id));
    res.status(204).end();
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

const hmAhbKoseImportGate: RequestHandler = (req, res, next) => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  next();
};

const hmAhbKoseImportUpload = hmAhbKoseImportMulter.fields([
  { name: "authors", maxCount: 1 },
  { name: "posts", maxCount: 1 },
]);

async function hmAhbKoseImportFinish(req: Request, res: Response, siteId: number): Promise<void> {
  if (!Number.isFinite(siteId) || siteId <= 0) {
    res.status(400).json({ error: "Geçersiz haber sitesi kimliği" });
    return;
  }
  const site = await getHmNewsSiteByIdCompat(siteId);
  if (!site) {
    res.status(404).json({ error: "Haber sitesi bulunamadı" });
    return;
  }
  const bag = req.files as { authors?: Express.Multer.File[]; posts?: Express.Multer.File[] } | undefined;
  const a = bag?.authors?.[0];
  const p = bag?.posts?.[0];
  const modeRaw = String((req.body as { mode?: unknown }).mode ?? "full")
    .trim()
    .toLowerCase();
  const sourceBaseUrl = String((req.body as { sourceBaseUrl?: unknown }).sourceBaseUrl ?? "").trim();
  const mode: HmAhbKoseImportMode =
    modeRaw === "authors" ? "authors" : modeRaw === "posts" ? "posts" : "full";

  if (mode === "full" && (!a?.buffer?.length || !p?.buffer?.length)) {
    res.status(400).json({
      error:
        "Tam içe aktarım: authors + posts JSON gerekli. Yalnızca yazar veya yalnızca makale için formdan mod seçin.",
    });
    return;
  }
  if (mode === "authors" && !a?.buffer?.length) {
    res.status(400).json({ error: "Yazarlar modu: __tbl_ky_yazarlar__ JSON (authors) gerekli." });
    return;
  }
  if (mode === "posts" && !p?.buffer?.length) {
    res.status(400).json({ error: "Makaleler modu: __ky_makaleler__ JSON (posts) gerekli." });
    return;
  }

  let authorsExport: AhbYazarExport = { items: [] };
  let postsExport: AhbMakaleExport = { items: [] };
  try {
    if (a?.buffer?.length) authorsExport = JSON.parse(a.buffer.toString("utf8")) as AhbYazarExport;
    if (p?.buffer?.length) postsExport = JSON.parse(p.buffer.toString("utf8")) as AhbMakaleExport;
    if (/^https?:\/\//i.test(sourceBaseUrl)) {
      authorsExport.source_url = sourceBaseUrl;
      (postsExport as AhbMakaleExport & { source_url?: string }).source_url = sourceBaseUrl;
    }
  } catch {
    res.status(400).json({ error: "JSON ayrıştırılamadı (UTF-8 geçerli dosya yükleyin)." });
    return;
  }
  const lines: string[] = [];
  try {
    const result = await runHmAhbKoseImport({
      siteId,
      authorsExport,
      postsExport,
      mode,
      mediaUploadDir: getMediaUploadRoot(),
      log: (line) => lines.push(line),
    });
    if (mode === "full" || mode === "posts") {
      triggerHmYekpareSyncForSite(siteId);
    }
    res.json({
      ok: true,
      siteId,
      siteSlug: site.slug,
      ...result,
      log: lines,
    });
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
      log: lines,
    });
  }
}

/** AHB köşe içe aktarma — kısa yol (önerilen): multipart + `siteId` alanı. */
router.post("/hm/import-ahb-kose", hmAhbKoseImportGate, hmAhbKoseImportUpload, async (req, res): Promise<void> => {
  const id = parseInt(String((req.body as { siteId?: unknown }).siteId ?? "").trim(), 10);
  await hmAhbKoseImportFinish(req, res, id);
});

/** Aynı işlem; site kimliği URL'de (eski istemciler). */
router.post(
  "/hm/sites/:id/import-ahb-kose",
  hmAhbKoseImportGate,
  hmAhbKoseImportUpload,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    await hmAhbKoseImportFinish(req, res, id);
  },
);

const hmAhbHaberImportGate: RequestHandler = (req, res, next) => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  next();
};

const hmAhbHaberImportUpload = hmAhbHaberImportMulter.array("news", 12);

async function hmAhbHaberImportFinish(req: Request, res: Response, siteId: number): Promise<void> {
  if (!Number.isFinite(siteId) || siteId <= 0) {
    res.status(400).json({ error: "Geçersiz haber sitesi kimliği" });
    return;
  }
  const site = await getHmNewsSiteByIdCompat(siteId);
  if (!site) {
    res.status(404).json({ error: "Haber sitesi bulunamadı" });
    return;
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) {
    res.status(400).json({ error: "En az bir AHB haber JSON dosyası (news) gerekli." });
    return;
  }

  const body = req.body as {
    dryRun?: unknown;
    offset?: unknown;
    limit?: unknown;
    skipImages?: unknown;
    allowDuplicateTitles?: unknown;
    categoryId?: unknown;
    categorySlug?: unknown;
    categoryOverride?: unknown;
  };
  const dryRun =
    String(body.dryRun ?? "").toLowerCase() === "1" ||
    String(body.dryRun ?? "").toLowerCase() === "true";
  const skipImages =
    String(body.skipImages ?? "").toLowerCase() === "1" ||
    String(body.skipImages ?? "").toLowerCase() === "true";
  const allowDuplicateTitles =
    String(body.allowDuplicateTitles ?? "").toLowerCase() === "1" ||
    String(body.allowDuplicateTitles ?? "").toLowerCase() === "true";
  const offset = Math.max(0, parseInt(String(body.offset ?? "0"), 10) || 0);
  const limitRaw = parseInt(String(body.limit ?? (dryRun ? "250" : "4")), 10) || (dryRun ? 250 : 4);
  const limit = dryRun ? Math.min(500, Math.max(1, limitRaw)) : Math.min(8, Math.max(1, limitRaw));

  const categoryIdRaw = String(body.categoryId ?? "").trim();
  const categorySlugRaw = String(body.categorySlug ?? "").trim();
  const categoryOverrideRaw = String(body.categoryOverride ?? "").trim().toLowerCase();
  let categoryOverrideId: number | null = null;
  let categoryOverrideSlug: string | null = null;
  let categoryOverrideMode: "auto" | "all" | "fallback" = "auto";
  if (categoryIdRaw) {
    const cid = parseInt(categoryIdRaw, 10);
    if (Number.isFinite(cid) && cid > 0) categoryOverrideId = cid;
  }
  if (categorySlugRaw) categoryOverrideSlug = categorySlugRaw.toLowerCase();
  if (categoryOverrideRaw === "all" || categoryOverrideRaw === "fallback") {
    categoryOverrideMode = categoryOverrideRaw;
  } else if (categoryOverrideId != null || categoryOverrideSlug) {
    categoryOverrideMode = "all";
  }

  const parsedExports: Array<{ export: AhbHaberExport; filename?: string }> = [];
  try {
    for (const f of files) {
      if (!f.buffer?.length) continue;
      parsedExports.push({
        export: JSON.parse(f.buffer.toString("utf8")) as AhbHaberExport,
        filename: f.originalname,
      });
    }
  } catch {
    res.status(400).json({ error: "JSON ayrıştırılamadı (UTF-8 geçerli dosya yükleyin)." });
    return;
  }

  if (parsedExports.length === 0) {
    res.status(400).json({ error: "Geçerli JSON dosyası yok." });
    return;
  }

  const batch = mergeAhbHaberExports(parsedExports);
  if (batch.items.length === 0) {
    res.status(400).json({ error: "JSON içinde items dizisi boş." });
    return;
  }

  const lines: string[] = [];
  try {
    const result = await runHmAhbHaberImport({
      siteId,
      batch,
      dryRun,
      offset,
      limit,
      skipImages,
      allowDuplicateTitles,
      categoryOverrideId,
      categoryOverrideSlug,
      categoryOverrideMode,
      log: (line) => lines.push(line),
    });
    res.json({
      ok: true,
      siteId,
      siteSlug: site.slug,
      dryRun,
      offset,
      limit,
      ...result,
      log: lines,
    });
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
      log: lines,
    });
  }
}

/** AHB haber JSON içe aktarma → `news` (HM site). */
router.post("/hm/import-ahb-haber", hmAhbHaberImportGate, hmAhbHaberImportUpload, async (req, res): Promise<void> => {
  const id = parseInt(String((req.body as { siteId?: unknown }).siteId ?? "").trim(), 10);
  await hmAhbHaberImportFinish(req, res, id);
});

router.post(
  "/hm/sites/:id/import-ahb-haber",
  hmAhbHaberImportGate,
  hmAhbHaberImportUpload,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    await hmAhbHaberImportFinish(req, res, id);
  },
);

/* —— Havuz + AI kuyruk (admin) ——————————————————————————————— */

router.get("/hm/pool/items", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const rows = await newsReadDb()
    .select()
    .from(hmContentPoolItemsTable)
    .orderBy(desc(hmContentPoolItemsTable.createdAt))
    .limit(200);
  res.json({ items: rows });
});

/** HM köşe yazıları (yayımlanmış liste; vitrin yazar sayfası). */
router.get("/hm/makale", async (req, res): Promise<void> => {
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const authorIdRaw = req.query.authorId;
  const authorId =
    authorIdRaw !== undefined && authorIdRaw !== null && String(authorIdRaw).trim() !== ""
      ? parseInt(String(authorIdRaw), 10)
      : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) {
    res.status(400).json({ error: "siteId gerekli" });
    return;
  }
  const status = typeof req.query.status === "string" ? req.query.status : "published";
  const lim = Math.min(Number(req.query.limit ?? 100) || 100, 200);
  const conds = [eq(hmMakalelerTable.siteId, siteId)];
  if (status && status !== "all") conds.push(eq(hmMakalelerTable.status, status));
  if (Number.isFinite(authorId) && authorId > 0) conds.push(eq(hmMakalelerTable.authorId, authorId));
  let rows = await newsReadDb()
    .select()
    .from(hmMakalelerTable)
    .where(and(...conds))
    .orderBy(desc(hmMakalelerTable.createdAt))
    .limit(lim);
  if (rows.length === 0) {
    rows = await mainDb
      .select()
      .from(hmMakalelerTable)
      .where(and(...conds))
      .orderBy(desc(hmMakalelerTable.createdAt))
      .limit(lim);
  }
  // Site dışı eş yazar (peer) makale sızıntısı / otomatik dağıtım yok —
  // yalnızca bu siteye ait makaleler listelenir.
  const ctx = await loadNewsContext();
  const fromHm = rows.map((m) => serializeHmMakaleAsNews(m, ctx));

  /** Panelden eklenen blog haberleri (`news`) köşe yazarına bağlıdır; AHB `hm_makaleler` ile aynı vitrinde gösterilir. */
  if (Number.isFinite(authorId) && authorId > 0 && status !== "all") {
    const blogCatIds: number[] = [];
    for (const [cid, cat] of ctx.categories) {
      if (String(cat.slug ?? "")
        .trim()
        .toLowerCase() === "blog") {
        blogCatIds.push(cid);
      }
    }
    if (blogCatIds.length > 0) {
      const newsConds = [
        eq(newsTable.siteId, siteId),
        eq(newsTable.authorId, authorId),
        eq(newsTable.status, status),
        inArray(newsTable.categoryId, blogCatIds),
      ];
      const newsRows = await newsReadDb()
        .select()
        .from(newsTable)
        .where(and(...newsConds))
        .orderBy(desc(newsTable.createdAt))
        .limit(lim);
      const fromNews = newsRows.map((r) => serializeNews(r, ctx));
      const merged = [...fromHm, ...fromNews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const sliced = merged.slice(0, lim);
      res.json({ items: sliced, total: sliced.length });
      return;
    }
  }

  res.json({
    items: fromHm,
    total: fromHm.length,
  });
});

/** Yönetim paneli: bir HM sitesindeki tüm köşe makaleleri (taslak + yayımlı). */
router.get("/hm/admin/makaleler", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const siteId = parseInt(String(req.query.siteId ?? ""), 10);
  if (!Number.isFinite(siteId) || siteId <= 0) {
    res.status(400).json({ error: "siteId gerekli" });
    return;
  }
  const [site] = await newsReadDb()
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  if (!site) {
    res.status(404).json({ error: "Haber sitesi bulunamadı" });
    return;
  }
  const lim = Math.min(Number(req.query.limit ?? 500) || 500, 800);
  const rows = await newsReadDb()
    .select()
    .from(hmMakalelerTable)
    .where(eq(hmMakalelerTable.siteId, siteId))
    .orderBy(desc(hmMakalelerTable.createdAt))
    .limit(lim);
  const ctx = await loadNewsContext();
  res.json({
    items: rows.map((m) => serializeHmMakaleAsNews(m, ctx)),
    total: rows.length,
  });
});

/** Yönetim paneli: tek köşe makalesi sil (`hm_makaleler`). `siteId` doğrulaması zorunlu. */
router.delete("/hm/admin/makaleler/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const id = parseInt(String(req.params.id ?? ""), 10);
  const siteId = parseInt(String(req.query.siteId ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(siteId) || siteId <= 0) {
    res.status(400).json({ error: "Geçerli id ve siteId sorgu parametresi gerekli" });
    return;
  }
  const [existing] = await newsReadDb().select().from(hmMakalelerTable).where(eq(hmMakalelerTable.id, id));
  if (!existing || existing.siteId !== siteId) {
    res.status(404).json({ error: "Makale bulunamadı veya site eşleşmiyor" });
    return;
  }
  await dualWriteDelete(hmMakalelerTable, eq(hmMakalelerTable.id, id));
  res.sendStatus(204);
});

/** Yönetim: HM editör sitelerinden Yekpare merkez haber akışına toplu senkron / backfill. */
router.post("/hm/admin/sync-yekpare", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const b = req.body as { siteIds?: unknown; dryRun?: unknown };
  const siteIds = Array.isArray(b.siteIds)
    ? b.siteIds.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0)
    : undefined;
  const dryRun = b.dryRun === true;
  try {
    const result = await syncHmEditorContentToYekpare({
      siteIds: siteIds?.length ? siteIds : undefined,
      dryRun,
    });
    res.json({ ok: true, dryRun, ...result });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

/** Yönetim: VKD kurumsal menü + özel sayfaları repo data/vkd paketlerinden DB'ye geri yükler. */
router.post("/hm/admin/vkd-restore-pages", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  try {
    const forceFull = (req.body as { forceFull?: boolean } | undefined)?.forceFull === true;
    await syncVkdPagesFromData({ forceFull });
    res.json({ ok: true, message: "VKD sayfa geri yükleme tamamlandı" });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

/** Yönetim: VKD üst menüsüne yalnızca eksik maddeleri ekler (editör ayarlarını silmez). */
router.post("/hm/admin/vkd-restore-menu", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  try {
    const result = await syncVkdMenuPartialFromData();
    res.json({
      ok: true,
      message: result.added > 0 ? `Menüye ${result.added} madde eklendi` : "Menü güncel — eksik madde yok",
      ...result,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

function triggerHmYekpareSyncForSite(siteId: number): void {
  void (async () => {
    const access = await resolveHmHybridRssAccess(siteId);
    if (access?.isCorporate) return;
    await syncHmEditorContentToYekpare({ siteIds: [siteId] });
  })().catch((err) => {
    console.warn("[hm-yekpare-sync] site", siteId, err instanceof Error ? err.message : err);
  });
}

async function denyHmEditorYekparePoolIfCorporate(
  siteId: number,
  res: import("express").Response,
): Promise<boolean> {
  const access = await resolveHmHybridRssAccess(siteId);
  if (access?.isCorporate) {
    res.status(403).json({ error: "Kurumsal sitelerde Yekpare havuzu kapalıdır." });
    return true;
  }
  return false;
}

router.post("/hm/pool/from-news", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const b = req.body as { sourceNewsId?: number; sourceSiteId?: number | null; payload?: unknown };
  const nid = Number(b.sourceNewsId);
  if (!Number.isFinite(nid)) {
    res.status(400).json({ error: "sourceNewsId gerekli" });
    return;
  }
  const [news] = await newsReadDb().select().from(newsTable).where(eq(newsTable.id, nid));
  if (!news) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  const payload =
    b.payload ??
    ({
      title: news.title,
      slug: news.slug,
      spot: news.spot,
      status: news.status,
    } as const);
  const [item] = await dualWriteInsert(hmContentPoolItemsTable, {
      sourceSiteId: b.sourceSiteId ?? null,
      sourceNewsId: nid,
      kind: "news",
      status: "pending",
      payloadJson: JSON.stringify(payload),
    });
  res.status(201).json(item);
});

router.post("/hm/pool/jobs", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const b = req.body as {
    poolItemId?: number;
    targetSiteIds?: number[];
    mode?: string;
    postStatus?: string;
  };
  const pid = Number(b.poolItemId);
  const rawIds = Array.isArray(b.targetSiteIds)
    ? b.targetSiteIds.map((n) => Number(n)).filter((x) => Number.isFinite(x) && x > 0)
    : [];
  const ids = await resolveActiveHmTargetSiteIds(rawIds);
  if (!Number.isFinite(pid) || ids.length === 0) {
    res.status(400).json({
      error:
        rawIds.length === 0
          ? "poolItemId ve en az bir geçerli targetSiteIds gerekli"
          : "Geçerli aktif hedef site bulunamadı (Haber siteleri HM listesini kontrol edin)",
    });
    return;
  }
  const mode = String(b.mode ?? "full_ai") === "same" ? "same" : "full_ai";
  const postStatus = b.postStatus === "draft" ? "draft" : "published";
  const jobs: (typeof hmAiJobsTable.$inferSelect)[] = [];
  for (const sid of ids) {
    const [j] = await dualWriteInsert(hmAiJobsTable, {
      poolItemId: pid,
      targetSiteId: sid,
      mode,
      postStatus,
      status: "queued",
    });
    if (j) jobs.push(j);
  }
  await dualWriteUpdate(hmContentPoolItemsTable, { status: "queued" }, eq(hmContentPoolItemsTable.id, pid));
  res.status(201).json({ jobs });
});

router.get("/hm/pool/jobs", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const lim = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "80"), 10) || 80));
  const jobs = await listHmAiJobsWithSites(lim);
  res.json({ jobs });
});

/** Havuz AI kuyruğunu işler: `same` kopya, `full_ai` OpenAI/Gemini ile özgünleştirme. */
router.post("/hm/pool/process", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const body = (req.body ?? {}) as { limit?: unknown; requeueFailed?: unknown };
  const lim = Math.min(50, Math.max(1, parseInt(String(body.limit ?? 10), 10) || 10));
  const requeueFailed = body.requeueFailed === true || body.requeueFailed === "true";
  await resetStaleHmAiJobsProcessing();
  let requeued = 0;
  if (requeueFailed) {
    requeued = await requeueFailedHmAiJobs(lim);
  }
  const queueBefore = await getHmPoolQueueStats();
  const aiKeysReady = await getHmPoolAiKeysReady();
  const out = await processHmAiJobQueue(lim);
  const queueAfter = await getHmPoolQueueStats();
  let hint: string | undefined;
  if (out.attempted === 0) {
    if (queueAfter.queued === 0 && queueAfter.failed > 0) {
      hint =
        "Sırada bekleyen iş yok; başarısız kayıtlar var. «Başarısızları yeniden dene» ile veya haberi tekrar kuyruğa alın.";
    } else if (queueAfter.queued === 0 && queueAfter.processing > 0) {
      hint = "İşler şu an işleniyor olabilir; birkaç dakika sonra tekrar deneyin.";
    } else if (queueAfter.queued === 0) {
      hint = "ûnce haber seçip hedef site işaretleyerek «Gönder» ile kuyruk oluşturun.";
    } else if (!aiKeysReady) {
      hint =
        "AI anahtarı eksik: AI İçerik Robotu → OpenAI veya Genel Ayarlar → Entegrasyonlar → Gemini.";
    }
  }
  res.json({
    ok: true,
    ...out,
    requeued,
    queue: queueAfter,
    aiKeysReady,
    hint,
    queueBefore,
  });
});

/** Başarısız havuz işlerini yeniden kuyruğa alır. */
router.post("/hm/pool/jobs/requeue-failed", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const lim = Math.min(
    200,
    Math.max(1, parseInt(String((req.body as { limit?: unknown })?.limit ?? 50), 10) || 50),
  );
  const requeued = await requeueFailedHmAiJobs(lim);
  const queue = await getHmPoolQueueStats();
  res.json({ ok: true, requeued, queue });
});

router.delete("/hm/pool/jobs/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const id = parseInt(String(req.params.id ?? ""), 10);
  const out = await deleteHmAiJob(id);
  if (!out.ok) {
    res.status(out.error?.includes("bulunamadı") ? 404 : 409).json({ error: out.error });
    return;
  }
  res.sendStatus(204);
});

router.delete("/hm/pool/items/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const id = parseInt(String(req.params.id ?? ""), 10);
  const out = await deleteHmPoolItem(id);
  if (!out.ok) {
    res.status(out.error?.includes("bulunamadı") ? 404 : 409).json({ error: out.error });
    return;
  }
  res.sendStatus(204);
});

/* —— Public: HM kurumsal bağış Stripe Checkout ————————————————————— */

router.post("/hm/donations/checkout", async (req, res): Promise<void> => {
  const body = req.body as { siteSlug?: unknown; amount?: unknown };
  const siteSlug = normalizeSlug(String(body.siteSlug ?? ""));
  const amountRaw = Number(String(body.amount ?? "").replace(",", "."));
  const amount = Math.round(amountRaw);
  if (!siteSlug || !Number.isFinite(amountRaw) || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "Geçerli siteSlug ve tutar gerekli." });
    return;
  }

  const site = await getActiveHmNewsSiteBySlugCompat(siteSlug);
  if (!site) {
    res.status(404).json({ error: "Haber sitesi bulunamadı." });
    return;
  }

  const layout = parseHmLayoutJson(site.layoutJson);
  const theme = String(layout.hmVitrinTheme ?? "").trim().toLowerCase();
  if (theme !== "corporate" && theme !== "kurumsal") {
    res.status(403).json({ error: "Bağış yalnızca kurumsal tema için açık." });
    return;
  }

  const donation = parseHmDonationLayout(layout);
  if (!donation.enabled) {
    res.status(403).json({ error: "Bağış kutusu pasif." });
    return;
  }
  if (!donation.amounts.includes(amount)) {
    res.status(400).json({ error: "Seçilen bağış tutarı izinli değil." });
    return;
  }

  const stripe = await getHmDonationStripe();
  if (!stripe) {
    res.status(503).json({ error: "Stripe yapılandırılmamış." });
    return;
  }

  const successUrl = hmDonationPublicUrl(site, "/?donation=success&session_id={CHECKOUT_SESSION_ID}");
  const cancelUrl = hmDonationPublicUrl(site, "/?donation=cancelled");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "try",
          unit_amount: amount * 100,
          product_data: {
            name: donation.title,
            description: donation.description,
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      checkout_source: "hm_donation",
      hm_site_id: String(site.id),
      hm_site_slug: site.slug,
      amount_try: String(amount),
    },
  });

  res.json({ id: session.id, url: session.url });
});

/* — Editör JWT — */

function saveHmEditorPanelSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function yektubeStudioPanelPayload() {
  return {
    panelBootstrap: true as const,
    panelFullAdmin: false as const,
    permissions: ["haberler"] as string[],
  };
}

async function applyYektubeStudioPanelSession(req: Request): Promise<void> {
  req.session.panelBootstrap = true;
  req.session.panelPermissions = ["haberler"];
  await saveHmEditorPanelSession(req);
}

type HmSiteEditorRow = typeof hmSiteEditorsTable.$inferSelect;

/** News DB'de eksik veya güncel olmayan editör kaydını ana DB'den doğrulayıp aynalar. */
async function mirrorHmEditorFromMainDb(
  slug: string,
  email: string,
  password: string,
  newsSiteId: number,
): Promise<HmSiteEditorRow | null> {
  const [mainSite] = await mainDb
    .select()
    .from(hmNewsSitesTable)
    .where(and(eq(hmNewsSitesTable.slug, slug), eq(hmNewsSitesTable.active, true)))
    .limit(1);
  if (!mainSite) return null;
  const [mainEditor] = await mainDb
    .select()
    .from(hmSiteEditorsTable)
    .where(
      and(
        eq(hmSiteEditorsTable.siteId, mainSite.id),
        eq(hmSiteEditorsTable.isActive, true),
        eq(hmSiteEditorsTable.email, email),
      ),
    )
    .limit(1);
  if (!mainEditor) return null;
  const ok = await bcrypt.compare(password, mainEditor.passwordHash);
  if (!ok) return null;
  const [editor] = await newsReadDb()
    .insert(hmSiteEditorsTable)
    .values({
      siteId: newsSiteId,
      email: mainEditor.email,
      passwordHash: mainEditor.passwordHash,
      displayName: mainEditor.displayName,
      isActive: mainEditor.isActive,
    })
    .onConflictDoUpdate({
      target: [hmSiteEditorsTable.siteId, hmSiteEditorsTable.email],
      set: {
        passwordHash: mainEditor.passwordHash,
        displayName: mainEditor.displayName,
        isActive: mainEditor.isActive,
        updatedAt: new Date(),
      },
    })
    .returning();
  return editor ?? null;
}

router.post("/hm/editor/login", async (req, res): Promise<void> => {
  const b = req.body as {
    slug?: string;
    email?: string;
    password?: string;
    domain?: string;
    yektubeStudio?: boolean;
    captchaToken?: string;
    captchaAnswer?: string;
  };
  if (!verifyLoginMathCaptcha(String(b.captchaToken ?? ""), String(b.captchaAnswer ?? ""))) {
    res.status(400).json({ error: "Güvenlik doğrulaması hatalı veya süresi doldu." });
    return;
  }
  let slug = normalizeSlug(String(b.slug ?? ""));
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const domainHost = normalizeDomain(
    String(b.domain ?? req.headers["x-forwarded-host"] ?? req.headers.host ?? ""),
  );
  if (domainHost) {
    const domainSite = await getActiveHmNewsSiteByDomainCompat(domainLookupCandidates(domainHost));
    if (domainSite) slug = domainSite.slug;
  }
  if (!slug || !email || !password) {
    res.status(400).json({ error: "slug, email ve şifre gerekli" });
    return;
  }
  const site = await getActiveHmNewsSiteBySlugCompat(slug);
  if (!site) {
    res.status(401).json({ error: "Site veya hesap bulunamadı" });
    return;
  }
  let editor: HmSiteEditorRow | undefined;
  [editor] = await newsReadDb()
    .select()
    .from(hmSiteEditorsTable)
    .where(
      and(
        eq(hmSiteEditorsTable.siteId, site.id),
        eq(hmSiteEditorsTable.isActive, true),
        eq(hmSiteEditorsTable.email, email),
      ),
    );
  if (!editor && getNewsDbReadMode() === "news") {
    editor = (await mirrorHmEditorFromMainDb(slug, email, password, site.id)) ?? undefined;
  }
  if (!editor) {
    res.status(401).json({ error: "E-posta veya şifre hatalı" });
    return;
  }
  let ok = await bcrypt.compare(password, editor.passwordHash);
  if (!ok && getNewsDbReadMode() === "news") {
    const synced = await mirrorHmEditorFromMainDb(slug, email, password, site.id);
    if (synced) {
      editor = synced;
      ok = true;
    }
  }
  if (!ok) {
    res.status(401).json({ error: "E-posta veya şifre hatalı" });
    return;
  }
  const token = jwt.sign(
    { typ: JWT_TYP, eid: editor.id, sid: site.id, v: 1 },
    hmJwtSecret(),
    { expiresIn: "7d" },
  );
  const yektubeStudio =
    b.yektubeStudio === true || String(b.yektubeStudio ?? "").toLowerCase() === "true";
  if (yektubeStudio) {
    try {
      await applyYektubeStudioPanelSession(req);
    } catch (err) {
      res.status(500).json({
        error: "Oturum kaydedilemedi.",
        ...(process.env.NODE_ENV === "production" ? {} : { detail: String(err) }),
      });
      return;
    }
  }
  res.json({
    token,
    site: {
      id: site.id,
      slug: site.slug,
      domain: site.domain,
      domain2: site.domain2 ?? null,
      displayName: site.displayName,
    },
    editor: {
      id: editor.id,
      email: editor.email,
      displayName: editor.displayName,
    },
    ...(yektubeStudio ? yektubeStudioPanelPayload() : {}),
  });
});

/** HM editör JWT → Yektube Studio panel oturumu (Video TV yönetimi iframe). */
router.post("/hm/editor/yektube-admin-session", async (req, res): Promise<void> => {
  const ctx = parseHmEditor(req);
  if (!ctx) {
    res.status(401).json({ success: false, error: "Editör oturumu gerekli." });
    return;
  }
  const [editor] = await newsReadDb()
    .select()
    .from(hmSiteEditorsTable)
    .where(
      and(
        eq(hmSiteEditorsTable.id, ctx.editorId),
        eq(hmSiteEditorsTable.siteId, ctx.siteId),
        eq(hmSiteEditorsTable.isActive, true),
      ),
    );
  if (!editor) {
    res.status(401).json({ success: false, error: "Geçersiz editör oturumu." });
    return;
  }
  try {
    await applyYektubeStudioPanelSession(req);
    res.json({ success: true, ...yektubeStudioPanelPayload() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Oturum kaydedilemedi.",
      ...(process.env.NODE_ENV === "production" ? {} : { detail: String(err) }),
    });
  }
});

router.get("/hm/editor/me", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const yektubeStudio =
    req.query.yektubeStudio === "1" || String(req.query.yektubeStudio ?? "").toLowerCase() === "true";
  const [editor] = await newsReadDb().select().from(hmSiteEditorsTable).where(eq(hmSiteEditorsTable.id, ctx.editorId));
  const site = await getHmNewsSiteByIdCompat(ctx.siteId);
  if (!editor || !site || editor.siteId !== site.id) {
    res.status(401).json({ error: "Geçersiz oturum" });
    return;
  }
  if (yektubeStudio) {
    try {
      await applyYektubeStudioPanelSession(req);
    } catch (err) {
      res.status(500).json({
        error: "Oturum kaydedilemedi.",
        ...(process.env.NODE_ENV === "production" ? {} : { detail: String(err) }),
      });
      return;
    }
  }
  res.json({
    editor: {
      id: editor.id,
      email: editor.email,
      displayName: editor.displayName,
      createdAt: editor.createdAt,
    },
    site: {
      id: site.id,
      slug: site.slug,
      domain: site.domain,
      domain2: site.domain2 ?? null,
      displayName: site.displayName,
      contactJson: site.contactJson,
      layoutJson: site.layoutJson,
      seoVerification: parseHmSeoVerification(site.verificationJson),
      createdAt: site.createdAt,
    },
    ...(yektubeStudio ? yektubeStudioPanelPayload() : {}),
  });
});

/** HM site editörleri — Video TV embed yönetimi */
router.get("/hm/editor/site-editors", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const items = await newsReadDb()
    .select({
      id: hmSiteEditorsTable.id,
      email: hmSiteEditorsTable.email,
      displayName: hmSiteEditorsTable.displayName,
      isActive: hmSiteEditorsTable.isActive,
      createdAt: hmSiteEditorsTable.createdAt,
    })
    .from(hmSiteEditorsTable)
    .where(eq(hmSiteEditorsTable.siteId, ctx.siteId))
    .orderBy(asc(hmSiteEditorsTable.email));
  res.json({ items });
});

router.patch("/hm/editor/site-seo-verification", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const b = req.body as { seoVerification?: unknown };
  const seoVerification = normalizeHmSeoVerification(b.seoVerification);
  try {
    await ensureHmNewsSiteSeoColumns();
    await dualWriteUpdate(
      hmNewsSitesTable,
      {
        verificationJson: seoVerification ? JSON.stringify(seoVerification) : null,
        updatedAt: new Date(),
      },
      eq(hmNewsSitesTable.id, ctx.siteId),
    );
    res.json({ ok: true, seoVerification });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg.slice(0, 400) });
  }
});

router.patch("/hm/editor/site-layout", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const b = req.body as { layout?: unknown; vitrinOnly?: boolean; allowClearExtraPages?: boolean; allowClearCorporatePageHtml?: boolean };
  const [row] = await newsReadDb()
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, ctx.siteId));
  const prev = parseHmLayoutRecord(row?.layoutJson != null ? String(row.layoutJson) : null);
  const incoming = b.layout;
  let inc =
    incoming && typeof incoming === "object" && !Array.isArray(incoming)
      ? (incoming as Record<string, unknown>)
      : {};
  if (b.vitrinOnly !== true) {
    if (
      prev.hmExtraPages &&
      Array.isArray(inc.hmExtraPages) &&
      (inc.hmExtraPages as unknown[]).length === 0 &&
      b.allowClearExtraPages !== true
    ) {
      delete inc.hmExtraPages;
    }
    if (inc.hmCorporatePageHtml === null && prev.hmCorporatePageHtml && b.allowClearCorporatePageHtml !== true) {
      delete inc.hmCorporatePageHtml;
    }
  }
  const merged = mergeHmLayoutPatch(prev, inc, { vitrinOnly: b.vitrinOnly === true });
  const [siteMeta] = await newsReadDb()
    .select({ slug: hmNewsSitesTable.slug })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, ctx.siteId));
  const siteSlug = String(siteMeta?.slug ?? "").trim().toLowerCase();
  const touchesVkdEditorContent =
    siteSlug === VKD_SITE_SLUG &&
    b.vitrinOnly !== true &&
    (inc.hmExtraPages !== undefined ||
      inc.hmCorporateMenuItems !== undefined ||
      inc.hmNewsFooterMenuItems !== undefined ||
      inc.hmNewsSidebarMenuItems !== undefined ||
      inc.hmNewsStripMenuItems !== undefined ||
      inc.hmCorporateMenuPrimaryOnly !== undefined);
  if (touchesVkdEditorContent) {
    merged[VKD_EDITOR_TOUCHED_KEY] = new Date().toISOString();
  }
  let raw: string;
  try {
    raw = stringifyHmLayoutMerged(merged);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: "layout JSON'a çevrilemedi", detail: msg.slice(0, 200) });
    return;
  }
  if (!assertHmLayoutJsonSize(raw, res)) return;
  await dualWriteUpdate(hmNewsSitesTable, { layoutJson: raw, updatedAt: new Date() }, eq(hmNewsSitesTable.id, ctx.siteId));
  res.json({ ok: true, layoutJson: raw });
});

/** Yalnızca anasayfa modül sırası — tam layout gövdesi gönderilmez. */
router.patch("/hm/editor/site-home-module-order", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const b = req.body as { hmNewsHomeModuleOrder?: unknown; hmCorporateHomeModuleOrder?: unknown };
  const patch: Record<string, unknown> = {};
  if (Array.isArray(b.hmNewsHomeModuleOrder)) {
    patch.hmNewsHomeModuleOrder = b.hmNewsHomeModuleOrder.map((x) => String(x).trim()).filter(Boolean);
  }
  if (Array.isArray(b.hmCorporateHomeModuleOrder)) {
    patch.hmCorporateHomeModuleOrder = b.hmCorporateHomeModuleOrder.map((x) => String(x).trim()).filter(Boolean);
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "hmNewsHomeModuleOrder veya hmCorporateHomeModuleOrder gerekli" });
    return;
  }
  const [row] = await newsReadDb()
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, ctx.siteId));
  const prev = parseHmLayoutRecord(row?.layoutJson != null ? String(row.layoutJson) : null);
  const merged = mergeHmLayoutPatch(prev, patch, { vitrinOnly: true });
  let raw: string;
  try {
    raw = stringifyHmLayoutMerged(merged);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: "layout JSON'a çevrilemedi", detail: msg.slice(0, 200) });
    return;
  }
  if (!assertHmLayoutJsonSize(raw, res)) return;
  await dualWriteUpdate(hmNewsSitesTable, { layoutJson: raw, updatedAt: new Date() }, eq(hmNewsSitesTable.id, ctx.siteId));
  res.json({ ok: true, layoutJson: raw });
});

/** Editör haber formu: aktif Yekpare kategorileri + siteye özel kategoriler. */
const handleHmEditorCategoriesList: RequestHandler = async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const siteId = ctx.siteId;
  const [siteRow] = await newsReadDb()
    .select({
      layoutJson: hmNewsSitesTable.layoutJson,
      slug: hmNewsSitesTable.slug,
      displayName: hmNewsSitesTable.displayName,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId));
  const sortSlugsRaw = parseHmCategorySortSlugsFromLayoutJson(
    siteRow?.layoutJson != null ? String(siteRow.layoutJson) : null,
  );
  const layout = parseHmLayoutJson(siteRow?.layoutJson != null ? String(siteRow.layoutJson) : null);
  const isCorporate = isHmCorporateLayout(layout);
  const siteSlug = String(siteRow?.slug ?? "").trim().toLowerCase();
  if (isCorporate) {
    await ensureVkdCorporateSiteCategories(siteId, siteSlug);
  }
  const formWhere = isCorporate
    ? hmEditorCategoriesWhere(siteId, layout)
    : hmEditorFormCategoriesWhere(siteId, layout);
  let categories = await newsReadDb()
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      color: categoriesTable.color,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
      sortOrder: categoriesTable.sortOrder,
    })
    .from(categoriesTable)
    .where(formWhere)
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));

  const siteDisplayName = String(siteRow?.displayName ?? "").trim();
  const globalSlugs = categories
    .filter((c) => c.exclusiveSiteId == null)
    .map((c) => normalizeNewsCategorySlug(c.slug))
    .filter(Boolean);
  const activeGlobal = hmEditorActivatedGlobalSlugs(layout, globalSlugs);
  if (!isCorporate) {
    categories = categories.filter((c) => {
      if (c.exclusiveSiteId === siteId) return true;
      if (c.exclusiveSiteId == null) return activeGlobal.has(normalizeNewsCategorySlug(c.slug));
      return false;
    });
  }
  categories = filterVkdPublicCategoryRows(categories, siteSlug);

  const sortSlugs = sortSlugsRaw?.map((s) => deriveCleanCategorySlug(s, siteSlug)).filter(Boolean) ?? null;

  if (sortSlugs) {
    categories = sortNewsCategoriesForDisplay(categories, sortSlugs);
  }

  categories = categories.map((c) =>
    c.exclusiveSiteId === siteId
      ? mapHmEditorCategoryRowForSite(c, siteSlug, siteDisplayName)
      : { ...c, slug: deriveCleanCategorySlug(c.slug, siteSlug) || c.slug },
  );

  const countRows = await newsReadDb()
    .select({
      categoryId: newsTable.categoryId,
      cnt: sql<number>`count(*)::int`,
    })
    .from(newsTable)
    .where(isNotNull(newsTable.categoryId))
    .groupBy(newsTable.categoryId);

  const newsCountByCategoryId = new Map<number, number>();
  for (const r of countRows) {
    if (r.categoryId != null) newsCountByCategoryId.set(r.categoryId, r.cnt);
  }

  const rows = categories.map((c) => ({
    ...c,
    newsCount: newsCountByCategoryId.get(c.id) ?? 0,
  }));
  res.json(rows);
};

router.get("/hm/editor/categories", handleHmEditorCategoriesList);
/** Eski istemci / yanlış vekil yolu: `GET /api/v1/editor/categories` */
router.get("/v1/editor/categories", handleHmEditorCategoriesList);

const hmWpWxrImportGate: RequestHandler = (req, res, next) => {
  if (!denyUnlessHmEditor(req, res)) return;
  next();
};

const hmWpWxrImportUpload = hmWpWxrImportMulter.single("xml");

router.post(
  "/hm/editor/import-wordpress",
  hmWpWxrImportGate,
  hmWpWxrImportUpload,
  async (req, res): Promise<void> => {
    const ctx = denyUnlessHmEditor(req, res);
    if (!ctx) return;

    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer?.length) {
      res.status(400).json({ error: "WordPress XML dosyası gerekli (form alanı: xml)." });
      return;
    }

    const filename = String(file.originalname ?? "").toLowerCase();
    const mime = String(file.mimetype ?? "").toLowerCase();
    const isXml = filename.endsWith(".xml") || filename.endsWith(".wxr") || mime.includes("xml");
    if (!isXml) {
      res.status(400).json({ error: "Sadece XML/WXR dosyası yükleyin." });
      return;
    }

    const body = req.body as {
      categoryId?: unknown;
      dryRun?: unknown;
      offset?: unknown;
      limit?: unknown;
      skipImages?: unknown;
    };
    const categoryId = parseInt(String(body.categoryId ?? "").trim(), 10);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      res.status(400).json({ error: "Hedef kategori seçin." });
      return;
    }

    const dryRun =
      String(body.dryRun ?? "").toLowerCase() === "1" ||
      String(body.dryRun ?? "").toLowerCase() === "true";
    const skipImages =
      String(body.skipImages ?? "").toLowerCase() === "1" ||
      String(body.skipImages ?? "").toLowerCase() === "true";
    const offset = Math.max(0, parseInt(String(body.offset ?? "0"), 10) || 0);
    const limitRaw = parseInt(String(body.limit ?? (dryRun ? "500" : "3")), 10) || (dryRun ? 500 : 3);
    const limit = dryRun ? Math.min(800, Math.max(1, limitRaw)) : Math.min(6, Math.max(1, limitRaw));
    const xml = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    if (!/<rss\b/i.test(xml) || !/<wp:wxr_version\b/i.test(xml)) {
      res.status(400).json({ error: "Bu dosya WordPress WXR XML formatında görünmüyor." });
      return;
    }

    const lines: string[] = [];
    try {
      const result = await runHmWordPressWxrImport({
        siteId: ctx.siteId,
        xml,
        categoryId,
        dryRun,
        offset,
        limit,
        skipImages,
        log: (line) => lines.push(line),
      });
      res.json({
        ok: true,
        siteId: ctx.siteId,
        dryRun,
        offset,
        limit,
        ...result,
        log: lines,
      });
    } catch (e: unknown) {
      res.status(500).json({
        error: e instanceof Error ? e.message : String(e),
        log: lines,
      });
    }
  },
);

const hmWpTemplatePageUpload = hmWpTemplatePageMulter.array("files", 25);

function isAllowedWpTemplatePageUpload(file: Express.Multer.File): boolean {
  const name = String(file.originalname ?? "").toLowerCase();
  const mime = String(file.mimetype ?? "").toLowerCase();
  return (
    name.endsWith(".php") ||
    name.endsWith(".blade.php") ||
    name.endsWith(".html") ||
    name.endsWith(".htm") ||
    name.endsWith(".txt") ||
    mime.includes("html") ||
    mime.includes("text") ||
    mime.includes("php")
  );
}

router.post(
  "/hm/editor/wordpress-template-pages/preview",
  hmWpWxrImportGate,
  hmWpTemplatePageUpload,
  async (req, res): Promise<void> => {
    const ctx = denyUnlessHmEditor(req, res);
    if (!ctx) return;

    const files = ((req.files as Express.Multer.File[] | undefined) ?? []).filter((file) => file?.buffer?.length);
    const body = req.body as Record<string, unknown>;
    const sourceText = String(body.sourceText ?? body.pasteHtml ?? "").trim();
    const sourceName = String(body.sourceName ?? "").trim() || "yapistirilan-template.html";

    const sources: { sourceName: string; buffer: Buffer }[] = [];
    for (const file of files) {
      if (!isAllowedWpTemplatePageUpload(file)) {
        res.status(400).json({ error: `Desteklenmeyen dosya: ${file.originalname}` });
        return;
      }
      sources.push({ sourceName: file.originalname || "template.php", buffer: file.buffer });
    }
    if (sourceText) {
      sources.push({ sourceName, buffer: Buffer.from(sourceText, "utf8") });
    }
    if (sources.length === 0) {
      res.status(400).json({ error: "En az bir PHP/HTML template dosyası seçin veya içerik yapıştırın." });
      return;
    }

    const items = sources.map((source) => parseHmWpTemplatePageSource(source.sourceName, source.buffer));
    res.json({ ok: true, siteId: ctx.siteId, items });
  },
);

router.post("/hm/editor/wordpress-template-pages/save", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;

  const body = req.body as { pages?: unknown; overwrite?: unknown; addToCorporateMenu?: unknown };
  if (!Array.isArray(body.pages)) {
    res.status(400).json({ error: "Kaydedilecek sayfa listesi gerekli." });
    return;
  }
  const pages = body.pages
    .map((page, index) => normalizeHmWpTemplatePageForSave(page as Record<string, unknown>, index))
    .filter((page): page is NonNullable<typeof page> => page != null)
    .slice(0, 25);
  if (pages.length === 0) {
    res.status(400).json({ error: "Geçerli başlık, slug ve HTML içeren sayfa bulunamadı." });
    return;
  }

  const [row] = await newsReadDb()
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, ctx.siteId));
  const prevLayout = parseHmLayoutJson(row?.layoutJson);
  const merged = mergeWpTemplatePagesIntoLayout(prevLayout, pages, {
    overwrite: body.overwrite === false ? false : true,
    addToCorporateMenu: body.addToCorporateMenu === true,
  });

  let raw: string;
  try {
    raw = JSON.stringify(merged.layout);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: "layout JSON'a çevrilemedi", detail: msg.slice(0, 200) });
    return;
  }
  if (!assertHmLayoutJsonSize(raw, res)) return;

  await dualWriteUpdate(hmNewsSitesTable, { layoutJson: raw, updatedAt: new Date() }, eq(hmNewsSitesTable.id, ctx.siteId));

  res.json({
    ok: true,
    siteId: ctx.siteId,
    imported: merged.imported,
    createdCount: merged.createdCount,
    updatedCount: merged.updatedCount,
    menuAdded: merged.menuAdded,
    layoutJson: raw,
  });
});

router.patch("/hm/editor/categories/order", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const rawSlugs = (req.body as { slugs?: unknown })?.slugs;
  if (!Array.isArray(rawSlugs)) {
    res.status(400).json({ error: "slugs dizisi gerekli" });
    return;
  }
  const slugs = rawSlugs.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  const [siteRowForOrder] = await newsReadDb()
    .select({ layoutJson: hmNewsSitesTable.layoutJson, slug: hmNewsSitesTable.slug })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, ctx.siteId));
  const orderLayout = parseHmLayoutJson(siteRowForOrder?.layoutJson != null ? String(siteRowForOrder.layoutJson) : null);
  const siteSlug = String(siteRowForOrder?.slug ?? "").trim().toLowerCase();
  const exclusiveWhere = hmEditorCategoriesWhere(ctx.siteId, orderLayout);
  const visible = await newsReadDb()
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(exclusiveWhere);
  const allowedClean = new Set(
    visible
      .map((c) => deriveCleanCategorySlug(String(c.slug ?? ""), siteSlug))
      .filter(Boolean),
  );
  const ordered = slugs.filter((s) => allowedClean.has(s));
  for (const s of allowedClean) {
    if (!ordered.includes(s)) ordered.push(s);
  }
  const [row] = await newsReadDb()
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, ctx.siteId));
  let prev: Record<string, unknown> = {};
  try {
    const rawPrev = row?.layoutJson;
    if (rawPrev != null && String(rawPrev).trim()) {
      const j = JSON.parse(String(rawPrev)) as unknown;
      if (j && typeof j === "object" && !Array.isArray(j)) prev = j as Record<string, unknown>;
    }
  } catch {
    prev = {};
  }
  const merged: Record<string, unknown> = { ...prev, hmCategorySortSlugs: ordered };
  let raw: string;
  try {
    raw = JSON.stringify(merged);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: "layout JSON'a çevrilemedi", detail: msg.slice(0, 200) });
    return;
  }
  if (!assertHmLayoutJsonSize(raw, res)) return;
  await dualWriteUpdate(hmNewsSitesTable, { layoutJson: raw, updatedAt: new Date() }, eq(hmNewsSitesTable.id, ctx.siteId));
  res.json({ ok: true, slugs: ordered, layoutJson: raw });
});

const HmEditorCategoryBody = CreateCategoryBody.pick({ name: true, slug: true, color: true });

router.post("/hm/editor/categories", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const parsed = HmEditorCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slug = normalizeSlug(parsed.data.slug);
  const name = String(parsed.data.name ?? "").trim();
  const color = String(parsed.data.color ?? "").trim() || "#CC0000";
  if (!name || !slug) {
    res.status(400).json({ error: "Ad ve slug gerekli" });
    return;
  }
  const [siteMeta] = await newsReadDb()
    .select({ slug: hmNewsSitesTable.slug, displayName: hmNewsSitesTable.displayName })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, ctx.siteId));
  const siteSlug = String(siteMeta?.slug ?? "").trim().toLowerCase();
  const siteName = String(siteMeta?.displayName ?? "").trim();
  if (siteSlug && slug.startsWith(`${siteSlug}-`)) {
    res.status(400).json({ error: "Kategori slug'ında site kodu kullanmayın; yalnızca kategori adını yazın." });
    return;
  }
  const allSites = await newsReadDb()
    .select({ slug: hmNewsSitesTable.slug })
    .from(hmNewsSitesTable);
  const otherSlugs = allSites.map((s) => String(s.slug ?? "").trim().toLowerCase()).filter(Boolean);
  if (categorySlugLooksSitePrefixed(slug, otherSlugs)) {
    res.status(400).json({ error: "Başka bir siteye ait slug öneki kullanılamaz." });
    return;
  }
  if (siteName && (name.startsWith(`${siteName} ·`) || name.toLowerCase().startsWith(siteName.toLowerCase()))) {
    res.status(400).json({ error: "Kategori adında site adı kullanmayın." });
    return;
  }
  try {
    const [maxRow] = await newsReadDb()
      .select({ m: sql<number>`coalesce(max(${categoriesTable.sortOrder}), 0)::int` })
      .from(categoriesTable)
      .where(eq(categoriesTable.exclusiveSiteId, ctx.siteId));
    const nextSort = (maxRow?.m ?? 0) + 1;
    const [row] = await dualWriteInsert(categoriesTable, {
        name,
        slug,
        color,
        exclusiveSiteId: ctx.siteId,
        sortOrder: nextSort,
      });
    if (!row) {
      res.status(500).json({ error: "Kayıt oluşturulamadı" });
      return;
    }
    res.status(201).json({ ...row, newsCount: 0 });
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ error: "Bu slug bu haber sitesinde zaten kullanılıyor." });
      return;
    }
    res.status(500).json({ error: "Kategori eklenemedi" });
  }
});

router.put("/hm/editor/categories/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz kategori id" });
    return;
  }
  const parsed = HmEditorCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slug = normalizeSlug(parsed.data.slug);
  const name = String(parsed.data.name ?? "").trim();
  const color = String(parsed.data.color ?? "").trim() || "#CC0000";
  if (!name || !slug) {
    res.status(400).json({ error: "Ad ve slug gerekli" });
    return;
  }
  const [existing] = await newsReadDb()
    .select({
      id: categoriesTable.id,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Kategori bulunamadı" });
    return;
  }
  if (existing.exclusiveSiteId !== ctx.siteId) {
    res.status(403).json({ error: "Yalnızca bu haber sitesine özel açtığınız kategorileri düzenleyebilirsiniz." });
    return;
  }
  try {
    const [row] = await dualWriteUpdate(
      categoriesTable,
      {
        name,
        slug,
        color,
        exclusiveSiteId: ctx.siteId,
      },
      eq(categoriesTable.id, id),
    );
    if (!row) {
      res.status(500).json({ error: "Güncellenemedi" });
      return;
    }
    const [cntRow] = await newsReadDb()
      .select({ cnt: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(eq(newsTable.categoryId, id));
    const newsCount = cntRow?.cnt ?? 0;
    res.json({ ...row, newsCount });
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "23505") {
      res.status(409).json({ error: "Bu slug bu haber sitesinde zaten kullanılıyor." });
      return;
    }
    res.status(500).json({ error: "Kategori güncellenemedi" });
  }
});

router.delete("/hm/editor/categories/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }
  const [existing] = await newsReadDb()
    .select({ id: categoriesTable.id, exclusiveSiteId: categoriesTable.exclusiveSiteId })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Kategori bulunamadı" });
    return;
  }
  if (existing.exclusiveSiteId !== ctx.siteId) {
    res.status(403).json({ error: "Yalnızca bu siteye özel kategorileri silebilirsiniz." });
    return;
  }
  try {
    await dualWriteDelete(categoriesTable, eq(categoriesTable.id, id));
    res.sendStatus(204);
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "23503") {
      res.status(409).json({ error: "Bu kategoriye bağlı haberler var; önce haberleri taşıyın veya silin." });
      return;
    }
    res.status(500).json({ error: "Silinemedi" });
  }
});

/**
 * Editör kendi siteye özel kategorilerini birleştirir (merge).
 * body: { sourceIds: number[], targetId?: number, targetName?: string, targetSlug?: string }
 * `restrictSiteId` = ctx.siteId; sadece bu siteye özel kategoriler birleştirilebilir, GENEL yapılamaz.
 */
router.post("/hm/editor/categories/merge", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const body = (req.body ?? {}) as {
    sourceIds?: unknown;
    targetId?: unknown;
    targetName?: unknown;
    targetSlug?: unknown;
  };
  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.map((v) => parseInt(String(v), 10)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (sourceIds.length === 0) {
    res.status(400).json({ error: "En az bir kaynak kategori gerekli" });
    return;
  }
  try {
    const result = await mergeCategories({
      sourceIds,
      targetId: Number.isFinite(parseInt(String(body.targetId), 10)) ? parseInt(String(body.targetId), 10) : null,
      targetName: typeof body.targetName === "string" ? body.targetName : null,
      targetSlug: typeof body.targetSlug === "string" ? body.targetSlug : null,
      makeGeneral: false,
      restrictSiteId: ctx.siteId,
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: "Kategoriler birleştirilemedi" });
  }
});

/** Bu siteye özel haber override'ı (Yekpare havuzu haberini yerel düzenleme). */
router.get("/hm/editor/news-overrides/:articleId", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const articleId = parseInt(String(req.params.articleId), 10);
  if (!Number.isFinite(articleId) || articleId <= 0) {
    res.status(400).json({ error: "Geçersiz haber id" });
    return;
  }
  try {
    const [row] = await mainDb
      .select()
      .from(newsSiteOverridesTable)
      .where(and(eq(newsSiteOverridesTable.siteId, ctx.siteId), eq(newsSiteOverridesTable.articleId, articleId)));
    res.json(row ?? null);
  } catch {
    res.json(null);
  }
});

/**
 * Bu siteye özel haber override'ını kaydeder (upsert). Sadece bu sitede görünür;
 * Yekpare'deki orijinal haber ve diğer siteler değişmez.
 * body: { title?, spot?, content?, imageUrl? } — boş/null gönderilen alan override edilmez.
 */
router.put("/hm/editor/news-overrides/:articleId", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const articleId = parseInt(String(req.params.articleId), 10);
  if (!Number.isFinite(articleId) || articleId <= 0) {
    res.status(400).json({ error: "Geçersiz haber id" });
    return;
  }
  const b = (req.body ?? {}) as { title?: unknown; spot?: unknown; content?: unknown; imageUrl?: unknown };
  const norm = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : null;
  };
  const title = norm(b.title);
  const spot = norm(b.spot);
  const content = norm(b.content);
  const imageUrl = norm(b.imageUrl);
  // Paylaşılan (Yekpare havuzu) haber mi? Editörün kendi manuel haberini override etmesine gerek yok.
  const [article] = await getNewsDbForRead()
    .select({ id: newsTable.id, siteId: newsTable.siteId })
    .from(newsTable)
    .where(eq(newsTable.id, articleId));
  if (!article) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  if (article.siteId === ctx.siteId) {
    res.status(400).json({ error: "Kendi haberinizi doğrudan düzenleyin; override sadece paylaşılan haberler içindir." });
    return;
  }
  try {
    const [existing] = await mainDb
      .select({ id: newsSiteOverridesTable.id })
      .from(newsSiteOverridesTable)
      .where(and(eq(newsSiteOverridesTable.siteId, ctx.siteId), eq(newsSiteOverridesTable.articleId, articleId)));
    if (existing) {
      const [row] = await mainDb
        .update(newsSiteOverridesTable)
        .set({ title, spot, content, imageUrl, updatedAt: new Date() })
        .where(eq(newsSiteOverridesTable.id, existing.id))
        .returning();
      res.json(row ?? null);
      return;
    }
    const [row] = await mainDb
      .insert(newsSiteOverridesTable)
      .values({
        articleId,
        siteId: ctx.siteId,
        title,
        spot,
        content,
        imageUrl,
      })
      .returning();
    res.status(201).json(row ?? null);
  } catch {
    res.status(500).json({ error: "Override kaydedilemedi" });
  }
});

/** Bu siteye özel haber override'ını kaldırır (orijinale döner). */
router.delete("/hm/editor/news-overrides/:articleId", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const articleId = parseInt(String(req.params.articleId), 10);
  if (!Number.isFinite(articleId) || articleId <= 0) {
    res.status(400).json({ error: "Geçersiz haber id" });
    return;
  }
  try {
    await mainDb
      .delete(newsSiteOverridesTable)
      .where(and(eq(newsSiteOverridesTable.siteId, ctx.siteId), eq(newsSiteOverridesTable.articleId, articleId)));
    res.sendStatus(204);
  } catch {
    res.status(500).json({ error: "Override silinemedi" });
  }
});

router.post("/hm/editor/authors", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureAuthorsSortOrderColumn();
  const b = req.body as {
    name?: unknown;
    title?: unknown;
    avatarUrl?: unknown;
    bio?: unknown;
    email?: unknown;
    password?: unknown;
  };
  const name = String(b.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "Yazar adı gerekli" });
    return;
  }
  const emailRaw = String(b.email ?? "").trim().toLowerCase();
  const passwordRaw = String(b.password ?? "");
  if ((emailRaw && !passwordRaw) || (!emailRaw && passwordRaw)) {
    res.status(400).json({ error: "E-posta ve şifre birlikte girilmeli (veya ikisi de boş)." });
    return;
  }
  if (emailRaw && passwordRaw.length < 8) {
    res.status(400).json({ error: "Şifre en az 8 karakter olmalı." });
    return;
  }
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    res.status(400).json({ error: "Geçerli e-posta girin." });
    return;
  }
  const title = String(b.title ?? "").trim() || null;
  const avatarUrl = String(b.avatarUrl ?? "").trim() || null;
  const bio = String(b.bio ?? "").trim() || null;
  const passwordHash = emailRaw ? await bcrypt.hash(passwordRaw, 10) : null;
  const normalizedName = name.replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
  const [existingName] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(and(eq(authorsTable.hmSiteId, ctx.siteId), sql`lower(regexp_replace(btrim(${authorsTable.name}), '\s+', ' ', 'g')) = ${normalizedName}`))
    .limit(1);
  if (existingName) {
    const { passwordHash: _ph, ...safe } = existingName;
    res.status(200).json(safe);
    return;
  }
  try {
    const [maxRow] = await newsReadDb()
      .select({ m: sql<number>`coalesce(max(${authorsTable.hmSortOrder}), 0)::int` })
      .from(authorsTable)
      .where(eq(authorsTable.hmSiteId, ctx.siteId));
    const [row] = await dualWriteInsert(authorsTable, {
        name,
        title,
        avatarUrl,
        bio,
        hmSiteId: ctx.siteId,
        hmSortOrder: (maxRow?.m ?? 0) + 1,
        email: emailRaw || null,
        passwordHash,
      });
    if (!row) {
      res.status(500).json({ error: "Yazar oluşturulamadı" });
      return;
    }
    const { passwordHash: _ph, ...safe } = row;
    triggerHmYekpareSyncForSite(ctx.siteId);
    res.status(201).json(safe);
  } catch (e: unknown) {
    const uniqueViolation =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505";
    if (uniqueViolation) {
      res.status(409).json({ error: "Bu e-posta bu haber sitesinde zaten kayıtlı." });
      return;
    }
    throw e;
  }
});

router.put("/hm/editor/authors/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }
  const [existing] = await newsReadDb().select().from(authorsTable).where(eq(authorsTable.id, id));
  if (!existing || existing.hmSiteId !== ctx.siteId) {
    res.status(404).json({ error: "Yazar bulunamadı" });
    return;
  }
  const b = req.body as {
    name?: unknown;
    title?: unknown;
    avatarUrl?: unknown;
    bio?: unknown;
    email?: unknown;
    password?: unknown;
  };
  const name = String(b.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "Yazar adı gerekli" });
    return;
  }
  const title = String(b.title ?? "").trim() || null;
  const avatarUrl = String(b.avatarUrl ?? "").trim() || null;
  const bio = String(b.bio ?? "").trim() || null;
  const emailRaw = String(b.email ?? "").trim().toLowerCase();
  const passwordRaw = String(b.password ?? "");
  const prevEmail = (existing.email ?? "").trim().toLowerCase();

  let nextEmail = existing.email;
  let nextHash = existing.passwordHash;

  /** Şifre doluysa e-posta + yeni şifre ile giriş bilgisini güncelle / ekle. Boş şifre → mevcut e-posta/şifre korunur. */
  if (passwordRaw.length > 0) {
    if (passwordRaw.length < 8) {
      res.status(400).json({ error: "Şifre en az 8 karakter olmalı." });
      return;
    }
    const mailToUse = emailRaw || prevEmail;
    if (!mailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailToUse)) {
      res.status(400).json({ error: "Geçerli e-posta girin (şifre değişimi için)." });
      return;
    }
    const [dup] = await newsReadDb()
      .select({ id: authorsTable.id })
      .from(authorsTable)
      .where(
        and(eq(authorsTable.hmSiteId, ctx.siteId), eq(authorsTable.email, mailToUse), ne(authorsTable.id, id)),
      )
      .limit(1);
    if (dup) {
      res.status(409).json({ error: "Bu e-posta bu haber sitesinde başka bir yazara ait." });
      return;
    }
    nextEmail = mailToUse;
    nextHash = await bcrypt.hash(passwordRaw, 10);
  } else if (emailRaw && emailRaw !== prevEmail) {
    res.status(400).json({
      error: "E-posta değiştirmek için yeni şifre girin (veya şifreyi boş bırakıp e-postayı olduğu gibi bırakın).",
    });
    return;
  }

  try {
    const [row] = await dualWriteUpdate(
      authorsTable,
      {
        name,
        title,
        avatarUrl,
        bio,
        email: nextEmail,
        passwordHash: nextHash,
      },
      eq(authorsTable.id, id),
    );
    if (!row) {
      res.status(404).json({ error: "Yazar bulunamadı" });
      return;
    }
    const { passwordHash: _ph, ...safe } = row;
    res.json(safe);
  } catch (e: unknown) {
    const uniqueViolation =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505";
    if (uniqueViolation) {
      res.status(409).json({ error: "Bu e-posta bu haber sitesinde zaten kayıtlı." });
      return;
    }
    throw e;
  }
});

router.post("/hm/editor/authors/bulk-delete", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const idsRaw = (req.body as { ids?: unknown }).ids;
  const ids = Array.isArray(idsRaw)
    ? Array.from(
        new Set(
          idsRaw
            .map((x) => parseInt(String(x), 10))
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      )
    : [];
  if (ids.length === 0) {
    res.status(400).json({ error: "Silinecek yazar seçilmedi." });
    return;
  }

  const ownedRows = await newsReadDb()
    .select({ id: authorsTable.id })
    .from(authorsTable)
    .where(and(eq(authorsTable.hmSiteId, ctx.siteId), inArray(authorsTable.id, ids)));
  const ownedIds = ownedRows.map((row) => row.id);
  const foreignIds = ids.filter((id) => !ownedIds.includes(id));

  // Bu siteye ait olmayan (sızıntı) yazarlar: yalnızca bu sitedeki içerik bağlarını kopar.
  if (foreignIds.length > 0) {
    await dualWriteDelete(
      hmMakalelerTable,
      and(eq(hmMakalelerTable.siteId, ctx.siteId), inArray(hmMakalelerTable.authorId, foreignIds)),
    );
    await dualWriteUpdate(
      newsTable,
      { authorId: null },
      and(eq(newsTable.siteId, ctx.siteId), inArray(newsTable.authorId, foreignIds)),
    );
  }

  if (ownedIds.length > 0) {
    await dualWriteUpdate(
      hmMakalelerTable,
      { authorId: null },
      and(eq(hmMakalelerTable.siteId, ctx.siteId), inArray(hmMakalelerTable.authorId, ownedIds)),
    );
    await dualWriteUpdate(
      newsTable,
      { authorId: null },
      and(eq(newsTable.siteId, ctx.siteId), inArray(newsTable.authorId, ownedIds)),
    );
    await dualWriteDelete(authorsTable, and(eq(authorsTable.hmSiteId, ctx.siteId), inArray(authorsTable.id, ownedIds)));
  }

  if (ownedIds.length === 0 && foreignIds.length === 0) {
    res.status(404).json({ error: "Bu siteye ait seçili yazar bulunamadı." });
    return;
  }

  triggerHmYekpareSyncForSite(ctx.siteId);
  res.json({
    ok: true,
    deleted: ownedIds.length,
    detached: foreignIds.length,
  });
});

router.patch("/hm/editor/authors/order", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureAuthorsSortOrderColumn();
  const idsRaw = (req.body as { ids?: unknown }).ids;
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (ids.length === 0) {
    res.status(400).json({ error: "Yazar sırası için ids gerekli." });
    return;
  }
  const owned = await newsReadDb()
    .select({ id: authorsTable.id })
    .from(authorsTable)
    .where(and(eq(authorsTable.hmSiteId, ctx.siteId), inArray(authorsTable.id, ids)));
  const ownedIds = new Set(owned.map((row) => row.id));
  if (ownedIds.size !== ids.length) {
    res.status(403).json({ error: "Sadece bu siteye ait yazarlar sıralanabilir." });
    return;
  }
  for (const [index, id] of ids.entries()) {
    await dualWriteUpdate(
      authorsTable,
      { hmSortOrder: index + 1 },
      and(eq(authorsTable.hmSiteId, ctx.siteId), eq(authorsTable.id, id)),
    );
  }
  res.json({ ok: true, ids });
});

router.get("/hm/editor/pool/authors", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  if (await denyHmEditorYekparePoolIfCorporate(ctx.siteId, res)) return;
  await ensureAuthorsSortOrderColumn();
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 200);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const conds = [
    isNotNull(authorsTable.hmSiteId),
    ne(authorsTable.hmSiteId, ctx.siteId),
  ];
  if (q) conds.push(sql`${authorsTable.name} ILIKE ${`%${q}%`}`);
  const authors = await newsReadDb()
    .select({
      id: authorsTable.id,
      name: authorsTable.name,
      title: authorsTable.title,
      avatarUrl: authorsTable.avatarUrl,
      bio: authorsTable.bio,
      hmSiteId: authorsTable.hmSiteId,
      siteName: hmNewsSitesTable.displayName,
      siteSlug: hmNewsSitesTable.slug,
    })
    .from(authorsTable)
    .leftJoin(hmNewsSitesTable, eq(authorsTable.hmSiteId, hmNewsSitesTable.id))
    .where(and(...conds))
    .orderBy(desc(authorsTable.id))
    .limit(limit);
  const ids = authors.map((a) => a.id);
  const countRows = ids.length
    ? await newsReadDb()
        .select({
          authorId: hmMakalelerTable.authorId,
          count: sql<number>`count(*)::int`,
        })
        .from(hmMakalelerTable)
        .where(and(eq(hmMakalelerTable.status, "published"), inArray(hmMakalelerTable.authorId, ids)))
        .groupBy(hmMakalelerTable.authorId)
    : [];
  const countMap = new Map<number, number>();
  for (const row of countRows) {
    if (row.authorId != null) countMap.set(row.authorId, row.count);
  }
  res.json({
    items: authors.map((a) => ({
      ...a,
      articleCount: countMap.get(a.id) ?? 0,
    })),
  });
});

router.post("/hm/editor/pool/authors/:id/publish", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  if (await denyHmEditorYekparePoolIfCorporate(ctx.siteId, res)) return;
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz yazar id" });
    return;
  }
  const [source] = await newsReadDb().select().from(authorsTable).where(eq(authorsTable.id, id));
  if (!source || source.hmSiteId == null || source.hmSiteId === ctx.siteId) {
    res.status(404).json({ error: "Havuz yazarı bulunamadı" });
    return;
  }
  const normalizedName = String(source.name ?? "").replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
  let [targetAuthor] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(and(eq(authorsTable.hmSiteId, ctx.siteId), sql`lower(regexp_replace(btrim(${authorsTable.name}), '\s+', ' ', 'g')) = ${normalizedName}`))
    .limit(1);
  if (!targetAuthor) {
    const [maxRow] = await newsReadDb()
      .select({ m: sql<number>`coalesce(max(${authorsTable.hmSortOrder}), 0)::int` })
      .from(authorsTable)
      .where(eq(authorsTable.hmSiteId, ctx.siteId));
    [targetAuthor] = await dualWriteInsert(authorsTable, {
        name: source.name,
        title: source.title ?? null,
        avatarUrl: source.avatarUrl ?? null,
        bio: source.bio ?? null,
        hmSiteId: ctx.siteId,
        hmSortOrder: (maxRow?.m ?? 0) + 1,
        email: null,
        passwordHash: null,
      });
  }
  if (!targetAuthor) {
    res.status(500).json({ error: "Yazar kopyalanamadı" });
    return;
  }
  const sourcePosts = await newsReadDb()
    .select()
    .from(hmMakalelerTable)
    .where(and(eq(hmMakalelerTable.siteId, source.hmSiteId), eq(hmMakalelerTable.authorId, source.id), eq(hmMakalelerTable.status, "published")))
    .orderBy(asc(hmMakalelerTable.createdAt))
    .limit(500);
  let copied = 0;
  for (const post of sourcePosts) {
    const slug = makeHmCopySlug(post.slug || post.title, ctx.siteId, post.id);
    const [exists] = await newsReadDb()
      .select({ id: hmMakalelerTable.id })
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.siteId, ctx.siteId), eq(hmMakalelerTable.slug, slug)))
      .limit(1);
    if (exists) continue;
    await dualWriteInsert(hmMakalelerTable, {
      siteId: ctx.siteId,
      authorId: targetAuthor.id,
      title: post.title,
      slug,
      spot: post.spot,
      content: post.content,
      imageUrl: post.imageUrl,
      status: "published",
    });
    copied += 1;
  }
  triggerHmYekpareSyncForSite(ctx.siteId);
  const { passwordHash: _ph, ...safe } = targetAuthor;
  res.status(201).json({ author: safe, copied });
});

/* —— Köşe yazarı (JWT typ: hm_author) ————————————————————————— */

router.post("/hm/author/login", async (req, res): Promise<void> => {
  const b = req.body as { email?: unknown; password?: unknown; siteSlug?: unknown };
  const siteSlug = normalizeSlug(String(b.siteSlug ?? ""));
  const emailRaw = String(b.email ?? "").trim().toLowerCase();
  const passwordRaw = String(b.password ?? "");
  if (!siteSlug || !emailRaw || !passwordRaw) {
    res.status(400).json({ error: "siteSlug, e-posta ve şifre gerekli." });
    return;
  }
  const site = await getActiveHmNewsSiteBySlugCompat(siteSlug);
  if (!site) {
    res.status(404).json({ error: "Haber sitesi bulunamadı." });
    return;
  }
  const [author] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(
      and(eq(authorsTable.hmSiteId, site.id), eq(authorsTable.email, emailRaw), isNotNull(authorsTable.passwordHash)),
    );
  if (!author?.passwordHash) {
    res.status(401).json({ error: "E-posta veya şifre hatalı." });
    return;
  }
  const ok = await bcrypt.compare(passwordRaw, author.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "E-posta veya şifre hatalı." });
    return;
  }
  const token = jwt.sign({ typ: JWT_TYP_AUTHOR, aid: author.id, sid: site.id }, hmJwtSecret(), {
    expiresIn: "60d",
  });
  const { passwordHash: _ph, ...safeAuthor } = author;
  res.json({
    token,
    site: {
      id: site.id,
      slug: site.slug,
      domain: site.domain,
      domain2: site.domain2 ?? null,
      displayName: site.displayName,
    },
    author: { id: safeAuthor.id, name: safeAuthor.name, email: safeAuthor.email ?? emailRaw },
  });
});

/** Şifre sıfırlama talebi (e-posta). Hesap yoksa da aynı genel yanıt. */
router.post("/hm/author/password-reset-request", async (req, res): Promise<void> => {
  try {
    await ensureAuthorsPwResetColumns();
  } catch {
    res.status(503).json({ error: "Veritabanı şeması güncellenemedi; yöneticiye başvurun." });
    return;
  }
  const b = req.body as { email?: unknown; siteSlug?: unknown };
  const siteSlug = normalizeSlug(String(b.siteSlug ?? ""));
  const emailRaw = String(b.email ?? "").trim().toLowerCase();
  const generic = {
    ok: true as const,
    message: "E-posta adresiniz kayıtlıysa kısa süre içinde sıfırlama bağlantısı gönderilir.",
  };
  if (!siteSlug || !emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    res.status(400).json({ error: "Geçerli site ve e-posta gerekli." });
    return;
  }
  const site = await getActiveHmNewsSiteBySlugCompat(siteSlug);
  if (!site) {
    res.json(generic);
    return;
  }
  const [author] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(
      and(eq(authorsTable.hmSiteId, site.id), eq(authorsTable.email, emailRaw), isNotNull(authorsTable.passwordHash)),
    );
  if (!author) {
    res.json(generic);
    return;
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await dualWriteUpdate(authorsTable, { pwResetToken: token, pwResetExpiresAt: expiresAt }, eq(authorsTable.id, author.id));
  const base = sitePublicOrigin().replace(/\/+$/, "");
  const resetUrl = `${base}/tr/${encodeURIComponent(siteSlug)}/yazar/sifre-yenile?token=${encodeURIComponent(token)}`;
  const siteName = String(site.displayName ?? site.slug ?? "Haber sitesi");
  const html = `<p>Merhaba ${escapeHtml(author.name)},</p>
<p><strong>${escapeHtml(siteName)}</strong> köşe yazarı hesabınız için şifre sıfırlama talebi alındı.</p>
<p><a href="${resetUrl}" style="color:#e61e25;text-decoration:underline;">Şifreyi sıfırla</a></p>
<p>Bu bağlantı bir saat geçerlidir. Talebi siz oluşturmadıysanız bu e-postayı yok sayın.</p>`;
  const text = `${siteName} — Şifre sıfırlama\n\n${resetUrl}\n\nBağlantı bir saat geçerlidir.`;
  const toAddr = String(author.email ?? emailRaw).trim();
  const mailResult = await sendEmail({
    to: toAddr,
    subject: `${siteName} — Şifre sıfırlama`,
    html,
    text,
  });
  res.json({
    ...generic,
    emailSent: mailResult.sent,
    ...(process.env["NODE_ENV"] !== "production" ? { _devResetUrl: resetUrl } : {}),
  });
});

/** Şifre sıfırlama token ile yeni şifre. */
router.post("/hm/author/password-reset", async (req, res): Promise<void> => {
  try {
    await ensureAuthorsPwResetColumns();
  } catch {
    res.status(503).json({ error: "Veritabanı şeması güncellenemedi; yöneticiye başvurun." });
    return;
  }
  const b = req.body as { token?: unknown; newPassword?: unknown };
  const token = String(b.token ?? "").trim();
  const newPassword = String(b.newPassword ?? "");
  if (!token || newPassword.length < 8) {
    res.status(400).json({ error: "Geçersiz istek veya şifre en az 8 karakter olmalı." });
    return;
  }
  const [author] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(
      and(
        eq(authorsTable.pwResetToken, token),
        isNotNull(authorsTable.pwResetExpiresAt),
        gt(authorsTable.pwResetExpiresAt, new Date()),
      ),
    );
  if (!author) {
    res.status(400).json({ error: "Bağlantı geçersiz veya süresi dolmuş." });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await dualWriteUpdate(
    authorsTable,
    { passwordHash, pwResetToken: null, pwResetExpiresAt: null },
    eq(authorsTable.id, author.id),
  );
  res.json({ ok: true });
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

router.get("/hm/author/me", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmAuthor(req, res);
  if (!ctx) return;
  const [author] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(and(eq(authorsTable.id, ctx.authorId), eq(authorsTable.hmSiteId, ctx.siteId)));
  if (!author) {
    res.status(404).json({ error: "Yazar bulunamadı." });
    return;
  }
  const { passwordHash: _p, ...safe } = author;
  res.json(safe);
});

router.patch("/hm/author/me/password", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmAuthor(req, res);
  if (!ctx) return;
  const b = req.body as { currentPassword?: unknown; newPassword?: unknown };
  const current = String(b.currentPassword ?? "");
  const nextPw = String(b.newPassword ?? "");
  if (nextPw.length < 8) {
    res.status(400).json({ error: "Yeni şifre en az 8 karakter olmalı." });
    return;
  }
  const [author] = await newsReadDb()
    .select()
    .from(authorsTable)
    .where(and(eq(authorsTable.id, ctx.authorId), eq(authorsTable.hmSiteId, ctx.siteId)));
  if (!author?.passwordHash) {
    res.status(400).json({ error: "Şifre bu hesap için tanımlı değil." });
    return;
  }
  if (!current || !(await bcrypt.compare(current, author.passwordHash))) {
    res.status(401).json({ error: "Mevcut şifre yanlış." });
    return;
  }
  const passwordHash = await bcrypt.hash(nextPw, 10);
  await dualWriteUpdate(authorsTable, { passwordHash }, eq(authorsTable.id, author.id));
  res.json({ ok: true });
});

router.get("/hm/author/news", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmAuthor(req, res);
  if (!ctx) return;
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  const offset = Number(req.query.offset ?? 0) || 0;
  const newsCtx = await loadNewsContext();
  const where = and(eq(newsTable.siteId, ctx.siteId), eq(newsTable.authorId, ctx.authorId));
  const [rows, totalRows] = await Promise.all([
    newsReadDb()
      .select()
      .from(newsTable)
      .where(where)
      .orderBy(desc(newsTable.createdAt))
      .limit(limit)
      .offset(offset),
    newsReadDb().select({ count: sql<number>`count(*)::int` }).from(newsTable).where(where),
  ]);
  res.json({
    items: rows.map((r) => serializeNews(r, newsCtx)),
    total: totalRows[0]?.count ?? 0,
  });
});

router.get("/hm/author/news/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmAuthor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const [row] = await newsReadDb()
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.id, id), eq(newsTable.siteId, ctx.siteId), eq(newsTable.authorId, ctx.authorId)));
  if (!row) {
    res.status(404).json({ error: "Haber bulunamadı." });
    return;
  }
  const newsCtx = await loadNewsContext();
  res.json(serializeNews(row, newsCtx));
});

router.post("/hm/author/news", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmAuthor(req, res);
  if (!ctx) return;
  const parsed = CreateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const newsCtx = await loadNewsContext();
  let categoryId: number | null = null;
  for (const [cid, cat] of newsCtx.categories) {
    if (cat.slug === data.categorySlug) {
      categoryId = cid;
      break;
    }
  }
  const slug = data.slug ?? slugify(data.title);
  const tags = resolveHmEditorNewsTags(newsCtx, data);
  const [row] = await dualWriteInsert(newsTable, {
      title: data.title,
      slug,
      spot: data.spot ?? null,
      content: data.content ?? null,
      imageUrl: data.imageUrl ?? null,
      categoryId,
      authorId: ctx.authorId,
      status: data.status,
      isFeatured: false,
      isSiteManset: false,
      isBreaking: false,
      tags,
      siteId: ctx.siteId,
      isEditorManual: true,
    });
  if (!row) {
    res.status(500).json({ error: "Kayıt oluşturulamadı" });
    return;
  }
  triggerHmYekpareSyncForSite(ctx.siteId);
  res.status(201).json(serializeNews(row, newsCtx));
});

router.put("/hm/author/news/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmAuthor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const [existing] = await newsReadDb()
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.id, id), eq(newsTable.siteId, ctx.siteId), eq(newsTable.authorId, ctx.authorId)));
  if (!existing) {
    res.status(404).json({ error: "Haber bulunamadı." });
    return;
  }
  const parsed = UpdateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const newsCtx = await loadNewsContext();
  let categoryId: number | null = null;
  for (const [cid, cat] of newsCtx.categories) {
    if (cat.slug === data.categorySlug) {
      categoryId = cid;
      break;
    }
  }
  const tags = resolveHmEditorNewsTags(newsCtx, data);
  const [row] = await dualWriteUpdate(
    newsTable,
    {
      title: data.title,
      slug: data.slug ?? slugify(data.title),
      spot: data.spot ?? null,
      content: data.content ?? null,
      imageUrl: data.imageUrl ?? null,
      categoryId,
      authorId: ctx.authorId,
      status: data.status,
      isFeatured: existing.isFeatured,
      isSiteManset: existing.isSiteManset,
      isBreaking: existing.isBreaking,
      tags,
      siteId: ctx.siteId,
      isEditorManual: true,
    },
    eq(newsTable.id, id),
  );
  if (!row) {
    res.status(404).json({ error: "Haber bulunamadı." });
    return;
  }
  triggerHmYekpareSyncForSite(ctx.siteId);
  res.json(serializeNews(row, newsCtx));
});

router.delete("/hm/author/news/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmAuthor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const [existing] = await newsReadDb()
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.id, id), eq(newsTable.siteId, ctx.siteId), eq(newsTable.authorId, ctx.authorId)));
  if (!existing) {
    res.status(404).json({ error: "Haber bulunamadı." });
    return;
  }
  await dualWriteDelete(newsTable, eq(newsTable.id, id));
  res.sendStatus(204);
});

async function defaultPublicSubmissionCategoryId(siteId: number, preferredSlug: unknown): Promise<number | null> {
  const requested = await resolveCategoryIdForHmEditor(siteId, preferredSlug);
  if (requested) return requested;
  const fallback = await resolveCategoryIdForHmEditor(siteId, "genel");
  if (fallback) return fallback;
  const [row] = await newsReadDb()
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId))
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id))
    .limit(1);
  return row?.id ?? null;
}

router.post("/hm/public/sites/:slug/news-submissions", async (req, res): Promise<void> => {
  const siteSlug = normalizeSlug(String(req.params.slug ?? ""));
  if (!siteSlug) {
    res.status(400).json({ error: "Site slug gerekli." });
    return;
  }
  const site = await getActiveHmNewsSiteBySlugCompat(siteSlug);
  if (!site) {
    res.status(404).json({ error: "Haber sitesi bulunamadı." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const title = cleanPublicSubmissionText(body.title, 180);
  const spot = cleanPublicSubmissionText(body.spot, 500);
  const content = cleanPublicSubmissionHtml(body.content, 24_000);
  const senderFullName = cleanPublicSubmissionText(body.senderFullName, 160);
  const senderEmail = cleanPublicSubmissionText(body.senderEmail, 180).toLowerCase();
  const senderPhone = cleanPublicSubmissionText(body.senderPhone, 80);

  if (title.length < 5) {
    res.status(400).json({ error: "Başlık en az 5 karakter olmalı." });
    return;
  }
  if (content.length < 30) {
    res.status(400).json({ error: "Haber metni en az 30 karakter olmalı." });
    return;
  }
  if (senderFullName.length < 3) {
    res.status(400).json({ error: "Ad soyad gerekli." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    res.status(400).json({ error: "Geçerli e-posta gerekli." });
    return;
  }
  if (senderPhone && !/^[+()\d\s.-]{7,30}$/.test(senderPhone)) {
    res.status(400).json({ error: "Telefon formatı geçerli değil." });
    return;
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await savePublicSubmissionImage(body.imageDataUrl, title);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    return;
  }

  const categoryId = await defaultPublicSubmissionCategoryId(site.id, body.categorySlug);
  const [row] = await dualWriteInsert(newsTable, {
    title,
    slug: publicSubmissionSlug(title),
    spot: spot || null,
    content,
    imageUrl,
    categoryId,
    authorId: null,
    status: "draft",
    isFeatured: false,
    isSiteManset: false,
    isBreaking: false,
    tags: ["haber-gonder"],
    siteId: site.id,
    isEditorManual: true,
    senderFullName,
    senderEmail,
    senderPhone: senderPhone || null,
  });
  if (!row) {
    res.status(500).json({ error: "Haber gönderimi kaydedilemedi." });
    return;
  }
  res.status(201).json({ ok: true, id: row.id });
});

/* —— Editör: yalnızca kendi site_id haberleri ————————————————— */

router.get("/hm/editor/news", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const limit = Math.min(Number(req.query.limit ?? 200) || 200, 500);
  const offset = Number(req.query.offset ?? 0) || 0;
  const categorySlug =
    typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim() : "";
  const categoryIdRaw = req.query.categoryId;
  const categoryId =
    categoryIdRaw !== undefined && categoryIdRaw !== null && String(categoryIdRaw).trim() !== ""
      ? parseInt(String(categoryIdRaw), 10)
      : NaN;
  const submittedOnly =
    req.query.submitted === "1" ||
    req.query.submitted === "true";
  const newsCtx = await loadNewsContext();
  const conds: SQL[] = [];
  if (submittedOnly) {
    conds.push(sql`(${newsTable.senderFullName} IS NOT NULL OR ${newsTable.senderEmail} IS NOT NULL OR ${newsTable.senderPhone} IS NOT NULL)`);
  }
  if (categorySlug) {
    const categoryIdForSite = await resolveCategoryIdForHmEditor(ctx.siteId, categorySlug);
    if (!categoryIdForSite) {
      res.json({ items: [], total: 0 });
      return;
    }
    conds.push(eq(newsTable.categoryId, categoryIdForSite));
  } else if (Number.isFinite(categoryId)) {
    if (!(await isHmEditorCategoryId(ctx.siteId, categoryId))) {
      res.json({ items: [], total: 0 });
      return;
    }
    conds.push(eq(newsTable.categoryId, categoryId));
  }
  const where = hmEditorSiteNewsWhere(ctx.siteId, conds.length ? and(...conds) : undefined);
  const [rows, totalRows] = await Promise.all([
    newsReadDb()
      .select()
      .from(newsTable)
      .where(where)
      .orderBy(desc(newsTable.createdAt))
      .limit(limit)
      .offset(offset),
    newsReadDb().select({ count: sql<number>`count(*)::int` }).from(newsTable).where(where),
  ]);
  res.json({
    items: rows.map((r) => serializeNews(r, newsCtx)),
    total: totalRows[0]?.count ?? 0,
  });
});

router.post("/hm/editor/news/repair-categories", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const hmAccess = await resolveHmHybridRssAccess(ctx.siteId);
  if (!hmAccess?.isCorporate) {
    res.status(400).json({ error: "Kategori onarımı yalnızca kurumsal siteler için kullanılabilir." });
    return;
  }
  const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
  const result = await repairCorporateSiteLocalNewsCategories({
    siteId: ctx.siteId,
    siteSlug: hmAccess.slug,
    dryRun,
  });
  res.json({ ok: true, dryRun, ...result });
});

/** Spor kategorisinde yanlış etiketlenmiş (spor sinyali olmayan) haberleri gündem'e taşır — HM editör. */
router.post("/hm/editor/news/reclassify-spor-misfits", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const body = (req.body ?? {}) as { limit?: number; dryRun?: boolean };
  const dryRun = body.dryRun === true;
  const limit = Math.min(10_000, Math.max(1, Number(body.limit) || 2000));
  try {
    const result = await recategorizeMisclassifiedSporBatch({ limit, dryRun });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Spor→gündem düzeltmesi başarısız",
    });
  }
});

router.post("/hm/editor/news/repair-images", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const hmAccess = await resolveHmHybridRssAccess(ctx.siteId);
  if (!hmAccess?.isCorporate) {
    res.status(400).json({ error: "Görsel onarımı yalnızca kurumsal siteler için kullanılabilir." });
    return;
  }
  const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
  const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
  const result = await repairCorporateSiteLocalManualImages({
    siteId: ctx.siteId,
    dryRun,
    limit,
  });
  invalidateNewsPageBundleCache();
  res.json({ ok: true, dryRun, ...result });
});

router.get("/hm/editor/news/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const row = await findHmEditorEditableNewsRow(ctx.siteId, id);
  if (!row) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  const newsCtx = await loadNewsContext();
  res.json(serializeNews(row, newsCtx));
});

router.get("/hm/editor/pool/news", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  if (await denyHmEditorYekparePoolIfCorporate(ctx.siteId, res)) return;
  const limit = Math.min(Number(req.query.limit ?? 80) || 80, 200);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const conds = [
    eq(newsTable.status, "published"),
    isNotNull(newsTable.siteId),
    ne(newsTable.siteId, ctx.siteId),
  ];
  if (q) conds.push(sql`${newsTable.title} ILIKE ${`%${q}%`}`);
  const newsCtx = await loadNewsContext();
  const rows = await newsReadDb()
    .select({
      news: newsTable,
      siteName: hmNewsSitesTable.displayName,
      siteSlug: hmNewsSitesTable.slug,
    })
    .from(newsTable)
    .leftJoin(hmNewsSitesTable, eq(newsTable.siteId, hmNewsSitesTable.id))
    .where(and(...conds))
    .orderBy(desc(newsTable.createdAt))
    .limit(limit);
  res.json({
    items: rows.map((row) => ({
      ...serializeNews(row.news, newsCtx),
      sourceSiteName: row.siteName,
      sourceSiteSlug: row.siteSlug,
    })),
  });
});

router.post("/hm/editor/pool/news/bulk-publish", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  if (await denyHmEditorYekparePoolIfCorporate(ctx.siteId, res)) return;
  const hmAccess = await resolveHmHybridRssAccess(ctx.siteId);
  if (!hmAccess || hmAccess.yekparePoolReceiveEnabled === false) {
    res.status(403).json({ error: "Yekpare havuz alımı bu sitede kapalı" });
    return;
  }
  const idsRaw = (req.body as { ids?: unknown })?.ids;
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (!ids.length) {
    res.status(400).json({ error: "ids gerekli" });
    return;
  }
  const wantStatus =
    String((req.body as { status?: string })?.status ?? "draft").trim().toLowerCase() === "published"
      ? "published"
      : "draft";
  const newsCtx = await loadNewsContext();
  const items: unknown[] = [];
  for (const id of ids.slice(0, 50)) {
    const [src] = await newsReadDb().select().from(newsTable).where(eq(newsTable.id, id));
    if (!src || src.status !== "published") continue;
    if (src.siteId != null && src.siteId === ctx.siteId) continue;
    const poolRef =
      src.siteId != null ? `yekpare-hm-pool:${src.siteId}:${src.id}` : `yekpare-hm-pool:0:${src.id}`;
    const [existing] = await newsReadDb()
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.siteId, ctx.siteId), eq(newsTable.rssSourceUrl, poolRef)))
      .limit(1);
    if (existing) {
      if (wantStatus === "published" && existing.status !== "published") {
        const [updated] = await dualWriteUpdate(
          newsTable,
          { status: "published" },
          eq(newsTable.id, existing.id),
        );
        items.push(serializeNews(updated ?? existing, newsCtx));
      } else {
        items.push(serializeNews(existing, newsCtx));
      }
      continue;
    }
    const categoryId = await cloneCategoryIdForHmTarget(src.categoryId, ctx.siteId);
    const slug = makeHmCopySlug(src.slug || src.title, ctx.siteId, src.id);
    const [created] = await dualWriteInsert(newsTable, {
      title: src.title,
      slug,
      spot: src.spot,
      content: src.content,
      imageUrl: src.imageUrl,
      categoryId,
      authorId: null,
      status: wantStatus,
      isFeatured: false,
      isBreaking: false,
      tags: src.tags ?? [],
      views: 0,
      isAiGenerated: false,
      siteId: ctx.siteId,
      isEditorManual: false,
      rssSourceUrl: poolRef,
    });
    if (created) items.push(serializeNews(created, newsCtx));
  }
  if (wantStatus === "published" && items.length) {
    triggerHmYekpareSyncForSite(ctx.siteId);
  }
  res.json({ items, count: items.length, status: wantStatus });
});

router.post("/hm/editor/pool/news/:id/publish", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  if (await denyHmEditorYekparePoolIfCorporate(ctx.siteId, res)) return;
  const hmAccess = await resolveHmHybridRssAccess(ctx.siteId);
  if (!hmAccess || hmAccess.yekparePoolReceiveEnabled === false) {
    res.status(403).json({ error: "Yekpare havuz alımı bu sitede kapalı" });
    return;
  }
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz haber id" });
    return;
  }
  const wantStatus =
    String((req.body as { status?: string })?.status ?? "draft").trim().toLowerCase() === "published"
      ? "published"
      : "draft";
  const [src] = await newsReadDb().select().from(newsTable).where(eq(newsTable.id, id));
  if (!src || src.status !== "published") {
    res.status(404).json({ error: "Havuz haberi bulunamadı" });
    return;
  }
  if (src.siteId != null && src.siteId === ctx.siteId) {
    res.status(400).json({ error: "Bu haber zaten kendi sitenizde" });
    return;
  }
  const poolRef =
    src.siteId != null
      ? `yekpare-hm-pool:${src.siteId}:${src.id}`
      : `yekpare-hm-pool:0:${src.id}`;
  const [existing] = await newsReadDb()
    .select()
    .from(newsTable)
    .where(and(eq(newsTable.siteId, ctx.siteId), eq(newsTable.rssSourceUrl, poolRef)))
    .limit(1);
  if (existing) {
    if (wantStatus === "published" && existing.status !== "published") {
      const [updated] = await dualWriteUpdate(
        newsTable,
        { status: "published" },
        eq(newsTable.id, existing.id),
      );
      const newsCtx = await loadNewsContext();
      res.json(serializeNews(updated ?? existing, newsCtx));
      return;
    }
    const newsCtx = await loadNewsContext();
    res.json(serializeNews(existing, newsCtx));
    return;
  }
  const categoryId = await cloneCategoryIdForHmTarget(src.categoryId, ctx.siteId);
  const slug = makeHmCopySlug(src.slug || src.title, ctx.siteId, src.id);
  const [created] = await dualWriteInsert(newsTable, {
      title: src.title,
      slug,
      spot: src.spot,
      content: src.content,
      imageUrl: src.imageUrl,
      categoryId,
      authorId: null,
      status: wantStatus,
      isFeatured: false,
      isSiteManset: false,
      isBreaking: false,
      tags: src.tags ?? [],
      views: 0,
      isAiGenerated: false,
      siteId: ctx.siteId,
      isEditorManual: false,
      rssSourceUrl: poolRef,
    });
  if (!created) {
    res.status(500).json({ error: "Haber kopyalanamadı" });
    return;
  }
  if (wantStatus === "published") {
    triggerHmYekpareSyncForSite(ctx.siteId);
  }
  const newsCtx = await loadNewsContext();
  res.status(201).json(serializeNews(created, newsCtx));
});

router.post("/hm/editor/news", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const parsed = CreateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const hmAccess = await resolveHmHybridRssAccess(ctx.siteId);
  const isCorporateEditor = hmAccess?.isCorporate === true;
  const siteOnly = isCorporateEditor
    ? true
    : (req.body as { siteOnly?: unknown })?.siteOnly === true;
  const newsCtx = await loadNewsContext();
  const categoryId = await resolveCategoryIdForHmEditor(ctx.siteId, data.categorySlug);
  if (isCorporateEditor) {
    const slugNorm = normalizeNewsCategorySlug(data.categorySlug);
    if (
      !categoryId ||
      slugNorm === HM_GLOBAL_NEWS_CATEGORY_SLUG ||
      !isAllowedCorporateCategorySlug(slugNorm, hmAccess.slug)
    ) {
      res.status(400).json({ error: "Kurumsal sitelerde yalnızca site kategorileri kullanılabilir." });
      return;
    }
  }
  const slug = data.slug ?? slugify(data.title);
  const tags = resolveHmEditorNewsTags(newsCtx, data);
  const [row] = await dualWriteInsert(newsTable, {
      title: data.title,
      slug,
      spot: data.spot ?? null,
      content: data.content ?? null,
      imageUrl: data.imageUrl ?? null,
      categoryId,
      authorId: data.authorId ?? null,
      senderFullName: data.senderFullName ?? null,
      senderEmail: data.senderEmail ?? null,
      senderPhone: data.senderPhone ?? null,
      status: data.status,
      isFeatured: data.isFeatured ?? false,
      isSiteManset: data.isSiteManset ?? false,
      isBreaking: data.isBreaking ?? false,
      tags,
      siteId: ctx.siteId,
      isEditorManual: true,
      siteOnly,
      ownerSiteId: siteOnly ? ctx.siteId : null,
      isFoodRecipe: data.isFoodRecipe ?? false,
      foodRecipeCategorySlug: data.isFoodRecipe ? (data.foodRecipeCategorySlug?.trim().toLowerCase() || null) : null,
    });
  if (!row) {
    res.status(500).json({ error: "Kayıt oluşturulamadı" });
    return;
  }
  if (!isCorporateEditor) {
    triggerHmYekpareSyncForSite(ctx.siteId);
  }
  res.status(201).json(serializeNews(row, newsCtx));
});

router.patch("/hm/editor/news/:id/flags", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const existing = await findHmEditorEditableNewsRow(ctx.siteId, id);
  if (!existing) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  const body = req.body as { isFeatured?: unknown; isSiteManset?: unknown; isBreaking?: unknown };
  const patch: Partial<typeof newsTable.$inferInsert> = {};
  if (typeof body.isFeatured === "boolean") {
    patch.isFeatured = body.isFeatured;
    if (body.isFeatured) patch.isEditorManual = true;
  }
  if (typeof body.isSiteManset === "boolean") {
    patch.isSiteManset = body.isSiteManset;
    if (body.isSiteManset) patch.isEditorManual = true;
  }
  if (typeof body.isBreaking === "boolean") patch.isBreaking = body.isBreaking;
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "isFeatured, isSiteManset veya isBreaking gerekli" });
    return;
  }
  const newsCtx = await loadNewsContext();
  const [row] = await dualWriteUpdate(newsTable, patch, eq(newsTable.id, existing.id));
  if (!row) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  res.json(serializeNews(row, newsCtx));
});

router.post("/hm/editor/news/bulk-flags", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const body = req.body as { ids?: unknown; isFeatured?: unknown; isSiteManset?: unknown; isBreaking?: unknown };
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids dizisi gerekli" });
    return;
  }
  const numIds = ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (numIds.length === 0) {
    res.status(400).json({ error: "Geçerli id yok" });
    return;
  }
  const patch: Partial<typeof newsTable.$inferInsert> = {};
  if (typeof body.isFeatured === "boolean") {
    patch.isFeatured = body.isFeatured;
    if (body.isFeatured) patch.isEditorManual = true;
  }
  if (typeof body.isSiteManset === "boolean") {
    patch.isSiteManset = body.isSiteManset;
    if (body.isSiteManset) patch.isEditorManual = true;
  }
  if (typeof body.isBreaking === "boolean") patch.isBreaking = body.isBreaking;
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "isFeatured, isSiteManset veya isBreaking gerekli" });
    return;
  }
  const updated = await dualWriteUpdate(newsTable, patch, and(eq(newsTable.siteId, ctx.siteId), inArray(newsTable.id, numIds)));
  res.json({ updated: updated.length });
});

router.post("/hm/editor/news/bulk-category", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const body = req.body as { ids?: unknown; categorySlug?: unknown };
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids dizisi gerekli" });
    return;
  }
  const categorySlug = typeof body.categorySlug === "string" ? body.categorySlug.trim() : "";
  if (!categorySlug) {
    res.status(400).json({ error: "categorySlug gerekli" });
    return;
  }
  const numIds = ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (numIds.length === 0) {
    res.status(400).json({ error: "Geçerli id yok" });
    return;
  }
  const categoryId = await resolveCategoryIdForHmEditor(ctx.siteId, categorySlug);
  if (!categoryId) {
    res.status(400).json({ error: "Geçerli kategori bulunamadı" });
    return;
  }
  const updated = await dualWriteUpdate(
    newsTable,
    { categoryId },
    and(eq(newsTable.siteId, ctx.siteId), inArray(newsTable.id, numIds)),
  );
  triggerHmYekpareSyncForSite(ctx.siteId);
  res.json({ updated: updated.length });
});

router.put("/hm/editor/news/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const existing = await findHmEditorEditableNewsRow(ctx.siteId, id);
  if (!existing) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  const parsed = UpdateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const hasSiteOnly = Object.prototype.hasOwnProperty.call(req.body ?? {}, "siteOnly");
  const hmAccess = await resolveHmHybridRssAccess(ctx.siteId);
  const isCorporateEditor = hmAccess?.isCorporate === true;
  const siteOnly = isCorporateEditor
    ? true
    : hasSiteOnly
      ? (req.body as { siteOnly?: unknown }).siteOnly === true
      : existing.siteOnly === true;
  const newsCtx = await loadNewsContext();
  const categoryId = await resolveCategoryIdForHmEditor(ctx.siteId, data.categorySlug);
  if (isCorporateEditor) {
    const slugNorm = normalizeNewsCategorySlug(data.categorySlug);
    if (
      !categoryId ||
      slugNorm === HM_GLOBAL_NEWS_CATEGORY_SLUG ||
      !isAllowedCorporateCategorySlug(slugNorm, hmAccess.slug)
    ) {
      res.status(400).json({ error: "Kurumsal sitelerde yalnızca site kategorileri kullanılabilir." });
      return;
    }
  }
  const tags = resolveHmEditorNewsTags(newsCtx, data);
  const [row] = await dualWriteUpdate(
    newsTable,
    {
      title: data.title,
      slug: data.slug ?? slugify(data.title),
      spot: data.spot ?? null,
      content: data.content ?? null,
      imageUrl: data.imageUrl ?? null,
      categoryId,
      authorId: data.authorId ?? null,
      senderFullName: data.senderFullName ?? null,
      senderEmail: data.senderEmail ?? null,
      senderPhone: data.senderPhone ?? null,
      status: data.status,
      isFeatured: data.isFeatured ?? false,
      isSiteManset: data.isSiteManset ?? false,
      isBreaking: data.isBreaking ?? false,
      tags,
      siteId: ctx.siteId,
      siteOnly,
      ownerSiteId: siteOnly ? ctx.siteId : null,
      isFoodRecipe: data.isFoodRecipe ?? false,
      foodRecipeCategorySlug: data.isFoodRecipe ? (data.foodRecipeCategorySlug?.trim().toLowerCase() || null) : null,
      isEditorManual: true,
    },
    eq(newsTable.id, existing.id),
  );
  if (!row) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  invalidateNewsPageBundleCache({ slug: row.slug, siteId: ctx.siteId });
  /* Düzenleme merkez havuza yansımaz — paylaşılan haberler diğer sitelerde eski sürümle kalır. */
  res.json(serializeNews(row, newsCtx));
});

router.delete("/hm/editor/news/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const existing = await findHmEditorEditableNewsRow(ctx.siteId, id);
  if (!existing) {
    res.status(404).json({ error: "Haber bulunamadı" });
    return;
  }
  await dualWriteDelete(newsTable, eq(newsTable.id, existing.id));
  res.sendStatus(204);
});

/** HM editör: `hm_makaleler` + aynı sitedeki blog kategorili `news` (panel köşe yazıları). */
router.get("/hm/editor/makale", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const limit = Math.min(Number(req.query.limit ?? 200) || 200, 500);
  const newsCtx = await loadNewsContext();
  const makRows = await newsReadDb()
    .select()
    .from(hmMakalelerTable)
    .where(eq(hmMakalelerTable.siteId, ctx.siteId))
    .orderBy(desc(hmMakalelerTable.createdAt))
    .limit(limit);

  const blogCatIds: number[] = [];
  for (const [cid, cat] of newsCtx.categories) {
    if (String(cat.slug ?? "")
      .trim()
      .toLowerCase() === "blog") {
      blogCatIds.push(cid);
    }
  }
  let newsBlogRows: (typeof newsTable.$inferSelect)[] = [];
  if (blogCatIds.length > 0) {
    newsBlogRows = await newsReadDb()
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.siteId, ctx.siteId), inArray(newsTable.categoryId, blogCatIds)))
      .orderBy(desc(newsTable.createdAt))
      .limit(limit);
  }

  const makSer = makRows.map((r) => serializeHmMakaleAsNews(r, newsCtx));
  const newsSer = newsBlogRows.map((r) => serializeNews(r, newsCtx));
  const merged = [...makSer, ...newsSer].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const items = merged.slice(0, limit);
  res.json({
    items,
    total: items.length,
  });
});

router.get("/hm/editor/makale/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const [row] = await newsReadDb().select().from(hmMakalelerTable).where(eq(hmMakalelerTable.id, id));
  if (!row || row.siteId !== ctx.siteId) {
    res.status(404).json({ error: "Makale bulunamadı" });
    return;
  }
  const newsCtx = await loadNewsContext();
  res.json(serializeHmMakaleAsNews(row, newsCtx));
});

router.post("/hm/editor/makale", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const b = req.body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) {
    res.status(400).json({ error: "title gerekli" });
    return;
  }
  const slugRaw = typeof b.slug === "string" ? b.slug.trim() : "";
  const slug = slugRaw || slugify(title);
  const spot = typeof b.spot === "string" ? b.spot : null;
  const content = typeof b.content === "string" ? b.content : null;
  const imageUrl = typeof b.imageUrl === "string" ? b.imageUrl.trim() : null;
  let authorId: number | null = null;
  if (b.authorId === null) authorId = null;
  else if (typeof b.authorId === "number" && Number.isFinite(b.authorId)) authorId = b.authorId;
  else if (typeof b.authorId === "string" && /^\d+$/.test(b.authorId)) authorId = parseInt(b.authorId, 10);
  const status = b.status === "published" || b.status === "draft" ? b.status : "draft";

  const newsCtx = await loadNewsContext();
  try {
    const [inserted] = await dualWriteInsert(hmMakalelerTable, {
        siteId: ctx.siteId,
        authorId,
        title,
        slug,
        spot,
        content,
        imageUrl,
        status,
      });
    if (!inserted) {
      res.status(500).json({ error: "Kayıt oluşturulamadı" });
      return;
    }
    triggerHmYekpareSyncForSite(ctx.siteId);
    res.status(201).json(serializeHmMakaleAsNews(inserted, newsCtx));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "Bu slug bu sitede zaten kullanılıyor" });
      return;
    }
    throw e;
  }
});

router.put("/hm/editor/makale/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const [existing] = await newsReadDb().select().from(hmMakalelerTable).where(eq(hmMakalelerTable.id, id));
  if (!existing || existing.siteId !== ctx.siteId) {
    res.status(404).json({ error: "Makale bulunamadı" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const patch: Partial<typeof hmMakalelerTable.$inferInsert> = {};
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.slug === "string") patch.slug = b.slug.trim();
  if ("spot" in b) patch.spot = typeof b.spot === "string" ? b.spot : null;
  if ("content" in b) patch.content = typeof b.content === "string" ? b.content : null;
  if ("imageUrl" in b) patch.imageUrl = typeof b.imageUrl === "string" ? b.imageUrl.trim() : null;
  if (b.authorId === null) patch.authorId = null;
  else if (typeof b.authorId === "number" && Number.isFinite(b.authorId)) patch.authorId = b.authorId;
  else if (typeof b.authorId === "string" && /^\d+$/.test(b.authorId)) patch.authorId = parseInt(b.authorId, 10);
  if (b.status === "published" || b.status === "draft") patch.status = b.status;

  const newsCtx = await loadNewsContext();
  try {
    const [row] = await dualWriteUpdate(hmMakalelerTable, patch, eq(hmMakalelerTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Makale bulunamadı" });
      return;
    }
    triggerHmYekpareSyncForSite(ctx.siteId);
    res.json(serializeHmMakaleAsNews(row, newsCtx));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "Bu slug bu sitede zaten kullanılıyor" });
      return;
    }
    throw e;
  }
});

router.delete("/hm/editor/makale/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "id" });
    return;
  }
  const [existing] = await newsReadDb().select().from(hmMakalelerTable).where(eq(hmMakalelerTable.id, id));
  if (!existing || existing.siteId !== ctx.siteId) {
    res.status(404).json({ error: "Makale bulunamadı" });
    return;
  }
  await dualWriteDelete(hmMakalelerTable, eq(hmMakalelerTable.id, id));
  res.sendStatus(204);
});

router.post("/hm/editor/makale/bulk-delete", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const ids = (req.body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids dizisi gerekli" });
    return;
  }
  const numIds = ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (numIds.length === 0) {
    res.status(400).json({ error: "Geçerli id yok" });
    return;
  }
  await dualWriteDelete(hmMakalelerTable, and(eq(hmMakalelerTable.siteId, ctx.siteId), inArray(hmMakalelerTable.id, numIds)));
  res.json({ deleted: numIds.length });
});

/**
 * PWA manifest ikonları tarayıcıda `siteOrigin` üzerinden çözülür; `/api/media/...` ise
 * özel alanda bu yol yoktur — medya her zaman portal (SITE_PUBLIC_ORIGIN) API kökündedir.
 */
function absolutizePwaIcon(siteOrigin: string, iconUrl: string | null | undefined): string | null {
  const t = (iconUrl ?? "").trim();
  if (!t) return null;
  const portal = sitePublicOrigin().replace(/\/+$/, "");

  const mediaPathFrom = (abs: string): string | null => {
    try {
      const u = new URL(abs);
      return u.pathname.startsWith("/api/media/") ? `${u.pathname}${u.search}${u.hash}` : null;
    } catch {
      return null;
    }
  };

  if (t.startsWith("/api/media/")) return `${portal}${t}`;
  if (t.startsWith("//")) {
    const abs = `https:${t}`;
    const p = mediaPathFrom(abs);
    if (p) return `${portal}${p}`;
    return abs;
  }
  if (/^https?:\/\//i.test(t)) {
    const p = mediaPathFrom(t);
    if (p) return `${portal}${p}`;
    return t;
  }

  const base = siteOrigin.replace(/\/+$/, "");
  if (t.startsWith("/")) return `${base}${t}`;
  return `${base}/${t}`;
}

/** HM PWA manifest: özel alan `?domain=`, Edge `x-forwarded-host` veya doğrudan Host. */
function resolveHmPwaManifestHost(req: {
  get(name: string): string | undefined;
  query: Record<string, unknown>;
  secure?: boolean;
}): { host: string; rawHost: string; proto: string } | null {
  const queryDomain = normalizeDomain(typeof req.query.domain === "string" ? req.query.domain : "");
  const xfHostRaw =
    String(req.get("x-forwarded-host") ?? "")
      .split(",")[0]
      ?.trim()
      .split(":")[0]
      ?.toLowerCase() ?? "";
  const forwardedHost = normalizeDomain(xfHostRaw);
  const rawHostHeader =
    String(req.get("host") ?? "")
      .split(":")[0]
      ?.toLowerCase() ?? "";
  const headerHost = normalizeDomain(rawHostHeader);
  const host = queryDomain || forwardedHost || headerHost;
  if (!host) return null;
  const rawHost = queryDomain || xfHostRaw || rawHostHeader || host;
  const xfProto = String(req.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    ?.trim();
  const proto = xfProto === "https" || req.secure ? "https" : "http";
  return { host, rawHost, proto };
}

/** ûzel alan adına göre Web App Manifest (tarayıcı `Host` / vekil başlığı / `?domain=` ile). */
router.get("/hm/pwa-manifest.json", async (req, res): Promise<void> => {
  try {
    const resolved = resolveHmPwaManifestHost(req);
    if (!resolved) {
      res.status(400).send("host");
      return;
    }
    const { host, rawHost, proto } = resolved;
    const domainCandidates = domainLookupCandidates(host);
    const row = await getActiveHmNewsSiteByDomainCompat(domainCandidates);
    const siteOrigin = `${proto}://${rawHost}`;

    if (!row) {
      res.status(404).send("site");
      return;
    }

    let tabIconUrl: string | null = null;
    try {
      const layout = row.layoutJson ? JSON.parse(row.layoutJson) : null;
      tabIconUrl = hmLayoutTabIconUrl(layout && typeof layout === "object" ? layout : null);
    } catch {
      tabIconUrl = null;
    }

    const icon192 = absolutizePwaIcon(siteOrigin, tabIconUrl) ?? `${siteOrigin}/icon-192.png`;
    const icon512 = absolutizePwaIcon(siteOrigin, tabIconUrl) ?? `${siteOrigin}/icon-512.png`;
    const shortName =
      row.displayName.length > 16 ? `${row.displayName.slice(0, 15)}…` : row.displayName;

    const manifest = {
      name: row.displayName,
      short_name: shortName,
      description: row.description?.trim() || `${row.displayName} haber uygulaması`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#e61e25",
      orientation: "any",
      icons: [
        { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
      categories: ["news"],
      lang: "tr",
    };
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(manifest);
  } catch {
    res.status(500).send("manifest");
  }
});

router.get("/hm/llms.txt", async (req, res): Promise<void> => {
  try {
    const resolved = resolveHmPwaManifestHost(req);
    if (!resolved) {
      res.status(400).type("text/plain").send("host");
      return;
    }
    const { host, rawHost, proto } = resolved;
    const row = await getActiveHmNewsSiteByDomainCompat(domainLookupCandidates(host));
    if (!row) {
      res.status(404).type("text/plain").send("site");
      return;
    }
    const origin = `${proto}://${rawHost}`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(
      buildHmLlmsTxt(
        {
          slug: row.slug,
          displayName: row.displayName,
          description: row.description,
          domain: row.domain,
        },
        origin,
      ),
    );
  } catch {
    res.status(500).type("text/plain").send("error");
  }
});

router.get("/hm/ai.txt", async (req, res): Promise<void> => {
  try {
    const resolved = resolveHmPwaManifestHost(req);
    if (!resolved) {
      res.status(400).type("text/plain").send("host");
      return;
    }
    const { host, rawHost, proto } = resolved;
    const row = await getActiveHmNewsSiteByDomainCompat(domainLookupCandidates(host));
    if (!row) {
      res.status(404).type("text/plain").send("site");
      return;
    }
    const origin = `${proto}://${rawHost}`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(
      buildHmAiTxt(
        {
          slug: row.slug,
          displayName: row.displayName,
          description: row.description,
          domain: row.domain,
        },
        origin,
      ),
    );
  } catch {
    res.status(500).type("text/plain").send("error");
  }
});

/** Yekpare PWA Store vitrin verisi (haber siteleri + keşfet işletmeleri). */
router.get("/hm/pwa-store", async (_req, res): Promise<void> => {
  try {
    const portal = sitePublicOrigin().replace(/\/+$/, "");
    const portalIcon = `${portal}${PWA_ICON_PATH}`;
    const hmRows = await listActiveHmNewsSitesByUpdatedCompat();

    const bizRows = await db
      .select({
        slug: mapBusinessesTable.slug,
        name: mapBusinessesTable.name,
        photoUrl: mapBusinessesTable.photoUrl,
        coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
      })
      .from(mapBusinessesTable)
      .where(and(eq(mapBusinessesTable.isActive, true), isNotNull(mapBusinessesTable.slug)))
      .orderBy(desc(mapBusinessesTable.updatedAt))
      .limit(150);

    const hmSites = hmRows.map((r) => {
      let tabIconUrl: string | null = null;
      try {
        const layout = r.layoutJson ? JSON.parse(r.layoutJson) : null;
        tabIconUrl = hmLayoutTabIconUrl(layout && typeof layout === "object" ? layout : null);
      } catch {
        /* ignore */
      }
      let icon = portalIcon;
      if (tabIconUrl) {
        if (/^https?:\/\//i.test(tabIconUrl) || tabIconUrl.startsWith("//")) {
          icon = tabIconUrl.startsWith("//") ? `https:${tabIconUrl}` : tabIconUrl;
        } else {
          const p = tabIconUrl.startsWith("/") ? tabIconUrl : `/${tabIconUrl}`;
          icon = `${portal}${p}`;
        }
      }
      return {
        id: r.id,
        slug: r.slug,
        displayName: r.displayName,
        domain: r.domain,
        icon,
        installQuery: `hm=${encodeURIComponent(r.slug)}`,
      };
    });

    const businesses = bizRows
      .filter((b) => String(b.slug ?? "").trim().length > 0)
      .map((b) => ({
        slug: String(b.slug),
        name: b.name,
        icon:
          (b.photoUrl && String(b.photoUrl).trim()) ||
          (b.coverPhotoUrl && String(b.coverPhotoUrl).trim()) ||
          `${portalIcon}`,
        installQuery: `kesfet=${encodeURIComponent(String(b.slug))}`,
      }));

    res.json({
      portalOrigin: portal,
      yekpare: {
        displayName: PORTAL_SITE_NAME,
        tagline: "Haber, video, harita, sipariş ve keşfet tek uygulamada",
        icon: portalIcon,
        installQuery: "yekpare=1",
      },
      hmSites,
      businesses,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg.slice(0, 400) });
  }
});

router.get("/hm/editor/contact-messages", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = 30;
  const offset = (page - 1) * limit;
  try {
    const rows = await mainDb.execute(sql`
      SELECT id, name, email, phone, subject, message, is_read, created_at,
             COALESCE(page_source, 'iletisim') AS page_source
      FROM site_contact_messages
      WHERE hm_site_id = ${ctx.siteId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const totalRow = await mainDb.execute(sql`
      SELECT COUNT(*)::int AS c FROM site_contact_messages WHERE hm_site_id = ${ctx.siteId}
    `);
    const total = Number((totalRow.rows[0] as { c: number }).c);
    res.json({ messages: rows.rows, total, page, limit });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/hm/editor/contact-messages/:id/read", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz kayıt." });
    return;
  }
  try {
    await mainDb.execute(sql`
      UPDATE site_contact_messages SET is_read = true
      WHERE id = ${id} AND hm_site_id = ${ctx.siteId}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Güncellenemedi." });
  }
});

/* — HM editör posta kutusu (site başına SMTP/IMAP) — */

router.get("/hm/editor/mail-settings", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureHmMailboxTables();
  const rows = (
    await mainDb.execute(sql`
      SELECT smtp_host, smtp_port, smtp_user, smtp_from, imap_host, imap_port, imap_user, imap_folder,
        (smtp_pass IS NOT NULL AND smtp_pass <> '') AS has_smtp_pass,
        (imap_pass IS NOT NULL AND imap_pass <> '') AS has_imap_pass
      FROM hm_site_mail_settings WHERE site_id = ${ctx.siteId} LIMIT 1
    `)
  ).rows as Record<string, unknown>[];
  const config = await getHmSiteMailboxAdminConfig(ctx.siteId);
  res.json({ settings: rows[0] ?? null, config });
});

router.put("/hm/editor/mail-settings", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureHmMailboxTables();
  const b = req.body as Record<string, unknown>;
  const smtpHost = b.smtpHost != null ? String(b.smtpHost).trim().slice(0, 256) : null;
  const smtpPort = b.smtpPort != null ? String(b.smtpPort).trim().slice(0, 8) : "587";
  const smtpUser = b.smtpUser != null ? String(b.smtpUser).trim().slice(0, 256) : null;
  const smtpPassRaw = b.smtpPass != null ? String(b.smtpPass) : null;
  const smtpFrom = b.smtpFrom != null ? String(b.smtpFrom).trim().slice(0, 512) : null;
  const imapHost = b.imapHost != null ? String(b.imapHost).trim().slice(0, 256) : null;
  const imapPort = b.imapPort != null ? String(b.imapPort).trim().slice(0, 8) : "993";
  const imapUser = b.imapUser != null ? String(b.imapUser).trim().slice(0, 256) : null;
  const imapPassRaw = b.imapPass != null ? String(b.imapPass) : null;
  const imapFolder = b.imapFolder != null ? String(b.imapFolder).trim().slice(0, 120) : "INBOX";

  const prev = (
    await mainDb.execute(sql`SELECT smtp_pass, imap_pass FROM hm_site_mail_settings WHERE site_id = ${ctx.siteId} LIMIT 1`)
  ).rows[0] as { smtp_pass?: string; imap_pass?: string } | undefined;

  const smtpPassFinal =
    smtpPassRaw === undefined || smtpPassRaw === "***"
      ? String(prev?.smtp_pass ?? "")
      : smtpPassRaw === "" || smtpPassRaw === null
        ? ""
        : String(smtpPassRaw).slice(0, 512);
  const imapPassFinal =
    imapPassRaw === undefined || imapPassRaw === "***"
      ? String(prev?.imap_pass ?? "")
      : imapPassRaw === "" || imapPassRaw === null
        ? ""
        : String(imapPassRaw).slice(0, 512);

  await mainDb.execute(sql`
    INSERT INTO hm_site_mail_settings (
      site_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from,
      imap_host, imap_port, imap_user, imap_pass, imap_folder, updated_at
    ) VALUES (
      ${ctx.siteId}, ${smtpHost}, ${smtpPort}, ${smtpUser}, ${smtpPassFinal}, ${smtpFrom},
      ${imapHost}, ${imapPort}, ${imapUser}, ${imapPassFinal}, ${imapFolder}, NOW()
    )
    ON CONFLICT (site_id) DO UPDATE SET
      smtp_host = EXCLUDED.smtp_host,
      smtp_port = EXCLUDED.smtp_port,
      smtp_user = EXCLUDED.smtp_user,
      smtp_pass = EXCLUDED.smtp_pass,
      smtp_from = EXCLUDED.smtp_from,
      imap_host = EXCLUDED.imap_host,
      imap_port = EXCLUDED.imap_port,
      imap_user = EXCLUDED.imap_user,
      imap_pass = EXCLUDED.imap_pass,
      imap_folder = EXCLUDED.imap_folder,
      updated_at = NOW()
  `);
  res.json({ ok: true });
});

router.get("/hm/editor/mailbox", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureHmMailboxTables();
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "60"), 10) || 60));
  const rows = (
    await mainDb.execute(sql`
      SELECT id, direction, from_addr, to_addr, subject, body_text, is_read, imap_uid, created_at
      FROM mailbox_messages
      WHERE scope = 'hm' AND hm_site_id = ${ctx.siteId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `)
  ).rows;
  const config = await getHmSiteMailboxAdminConfig(ctx.siteId);
  res.json({ messages: rows, config });
});

router.post("/hm/editor/mailbox/test-connection", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureHmMailboxTables();
  const result = await testHmSiteMailboxConnections(ctx.siteId);
  res.json(result);
});

router.patch("/hm/editor/mailbox/:id/read", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureHmMailboxTables();
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }
  await mainDb.execute(sql`
    UPDATE mailbox_messages SET is_read = true
    WHERE id = ${id} AND scope = 'hm' AND hm_site_id = ${ctx.siteId}
  `);
  res.json({ ok: true });
});

router.post("/hm/editor/mailbox/send", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureHmMailboxTables();
  const { to, subject, bodyHtml, bodyText } = req.body as Record<string, unknown>;
  const toAddr = String(to ?? "").trim();
  const subj = String(subject ?? "").trim().slice(0, 500);
  const html = String(bodyHtml ?? "").trim();
  const text = String(bodyText ?? "").trim() || undefined;
  if (!toAddr || !subj || !html) {
    res.status(400).json({ error: "to, subject ve bodyHtml zorunlu" });
    return;
  }
  const sent = await sendHmSiteMailboxEmail(ctx.siteId, { to: toAddr, subject: subj, html, text });
  if (!sent.sent) {
    res.status(502).json({ error: sent.error ?? "Gönderilemedi" });
    return;
  }
  res.json({ ok: true });
});

router.post("/hm/editor/mailbox/sync-imap", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureHmMailboxTables();
  const max = Math.min(50, Math.max(5, parseInt(String((req.body as { max?: unknown })?.max ?? "40"), 10) || 40));
  const result = await syncHmSiteMailboxFromImap(ctx.siteId, max);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ ok: true, fetched: result.fetched, inserted: result.inserted });
});

router.get("/hm/pages/:slug", async (req, res): Promise<void> => {
  const slug = typeof req.params.slug === "string" ? req.params.slug.trim() : "";
  if (!slug) {
    res.status(400).json({ error: "slug gerekli" });
    return;
  }
  try {
    const page = await getHmStaticPageBySlug(slug);
    if (!page) {
      res.status(404).json({ error: "Sayfa bulunamadı" });
      return;
    }
    res.json({ page });
  } catch (err) {
    console.warn("[hm] static page load failed", err);
    res.status(500).json({ error: "Sayfa yüklenemedi" });
  }
});

router.get("/hm/admin/pages", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["hm_sites", "haberler"])) return;
  try {
    const pages = await loadHmStaticPages();
    res.json({ pages });
  } catch (err) {
    console.warn("[hm] admin static pages list failed", err);
    res.status(500).json({ error: "Sayfalar yüklenemedi", pages: [] });
  }
});

router.put("/hm/admin/pages/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["hm_sites", "haberler"])) return;
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    res.status(400).json({ error: "id gerekli" });
    return;
  }
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  try {
    const page = await updateHmStaticPage(id, {
      slug: typeof body.slug === "string" ? body.slug : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      lastUpdated: typeof body.lastUpdated === "string" ? body.lastUpdated : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      menuLabel:
        body.menuLabel === null
          ? null
          : typeof body.menuLabel === "string"
            ? body.menuLabel
            : undefined,
    });
    res.json({ page });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sayfa güncellenemedi";
    res.status(400).json({ error: message });
  }
});

export default router;
