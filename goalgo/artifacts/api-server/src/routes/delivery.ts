import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import Stripe from "stripe";
import bcrypt from "bcryptjs";

type MulterMemoryFile = { buffer: Buffer; originalname: string; fieldname: string };
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, siteSettingsTable, paymentSettingsTable, stripeWebhookEventsTable } from "@workspace/db";
import { vendorsTable, vendorCategoriesTable, vendorMenuItemsTable, vendorMenuCategoriesTable, deliveryOrdersTable, deliveryOrderStatusEventsTable, vendorReviewsTable, couponCodesTable, mapBusinessesTable, mapBusinessImagesTable, orderMessagesTable, vendorCouriersTable } from "@workspace/db";
import { eq, desc, asc, and, ilike, or, sql, inArray, isNull } from "drizzle-orm";
import axios from "axios";
import { notifyVendorWhatsApp, buildOrderMessage, notifyCustomerOrderWhatsApp } from "../lib/whatsapp";
import { deliveryStatusTransitionAllowed } from "../lib/delivery-status-transitions";
import { withVendorMenuStockAndOrder } from "../lib/order-stock.js";
import { denyUnlessAdminMaintenance, denyUnlessPanelPerm } from "../lib/admin-guard";
import { isDemoSeedAllowed, transportDemoCourierPassword, transportDemoVendorPassword } from "../lib/demo-credentials.js";
import {
  signDeliveryTrackingToken,
  verifyDeliveryTrackingToken,
  normalizeDeliveryPhone,
  phoneLast4Matches,
} from "../lib/delivery-tracking-token.js";
import { getShopUser } from "./shop-auth.js";
import { syncVendorToMapBusiness, resyncAllVendorsToMap } from "../lib/vendor-map-sync";
import {
  importVendorFromExternalUrl,
  buildExternalMenuPreview,
  externalMenuPreviewPayload,
  type ImportedMenuItem,
  type ImportedVendorData,
  type ExternalPlatform,
} from "../lib/external-delivery-import";
import { importMenuIntoVendor, runExternalMenuImportForVendor } from "./providers.js";
import {
  importMerchantRssIntoVendor,
  parseMerchantRssXml,
} from "../lib/merchant-rss-import.js";
import { getEcommerceCategoryTree, seedEcommerceProductCategoriesIfNeeded } from "../lib/ecommerce-product-categories.js";
import { buildMarketplaceHomeExtras, seedMarketplaceHealthcareIfNeeded } from "../lib/marketplace-home-data.js";

function pickPrefetchedHtml(body: Record<string, unknown> | undefined): string | undefined {
  const html = String(body?.prefetchedHtml ?? "").trim();
  if (html.length > 400) return html;
  if (html.startsWith("{") && /menu_categories|productCategories|menuCategories/i.test(html)) return html;
  return undefined;
}

function pickPrefetchedMenuJson(body: Record<string, unknown> | undefined): unknown {
  const raw = body?.prefetchedMenuJson;
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string" && raw.trim().startsWith("{")) {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
import { firstMagnificPhotoPreview } from "../lib/magnific-stock";
import {
  resolveIsletmelerRoot,
  parseYemeksepetiCityWorkbook,
  buildAladdinContactIndex,
  enrichContactsFromRestoranKlasoru,
  emptyContactIndex,
  parseAladdinWorkbookAsStandaloneVendors,
  type LocalImportParsed,
} from "../lib/local-isletme-import";
import {
  ensureMapVendorGoogleColumns,
  importGooglePlaceAsVendor,
  promoteUnlinkedMapBusinesses,
  type PortalVendorType,
} from "../lib/map-vendor-google.js";
import { resolveGooglePlacesApiKey } from "../lib/google-places-key.js";
import {
  fetchPlaceDetailsNew,
  sanitizePlacesNewForExtras,
  buildPopularHoursFromPlacesNew,
  buildNewApiPhotoMediaUrls,
} from "../lib/google-places-new.js";
import { importDeliveryVendorsFromJson } from "../lib/import-vendors-json.js";
import { computeOrderCommissionSnapshot, deriveOrderTotalsFromBody, publicVendorForMenu, normalizeRevenueModel, parseMoney } from "../lib/vendor-revenue.js";
import {
  attachThemeToPublicVendor,
  ensureVendorCustomDomainsTable,
  ensureVendorThemeColumns,
  resolveVendorCustomDomainShortPath,
  resolveVendorStorefrontPath,
} from "../lib/vendor-storefront.js";
import { generateTurkishVendorAbout, generateTurkishVendorAboutDetailed } from "../lib/vendor-about-ai.js";
import { ensureGeliverIntegrationColumns } from "../lib/geliver-shipment.js";
import { sitePublicOrigin } from "../lib/site-public-origin.js";
import { ensureVendorBlogTables } from "../lib/vendor-blog-db.js";
import { paytrEncodeBasket, paytrGetIframeToken } from "../lib/paytr-direct.js";
import { handleDeliveryPaytrCallback } from "../lib/delivery-paytr-webhook.js";
import { placeMarketplaceCheckout, previewMarketplaceCheckout } from "../lib/marketplace-checkout.js";
import { iyzicoCheckoutFormInitialize, iyzicoCheckoutFormRetrieve } from "../lib/iyzico-vendor-checkout.js";
import { normalizeMapImageFields } from "../lib/map-image-proxy.js";

function normalizeMarketplaceCategoryName(value: unknown, vendorName?: unknown): string {
  let name = String(value ?? "").trim();
  const prefixes = [vendorName, "İmece", "Imece"]
    .map((prefix) => String(prefix ?? "").trim())
    .filter(Boolean);
  for (const prefix of prefixes) {
    name = name.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "").trim();
  }
  return name;
}

const BLOCKED_DEMO_MARKETPLACE_NAME_FRAGMENTS = [
  "organik köy peyniri",
  "organik koy peyniri",
  "soğuk sıkım zeytinyağı",
  "soguk sikim zeytinyagi",
  "yerli nohut",
  "çiçek balı",
  "cicek bali",
  "kavrulmuş badem",
  "kavrulmus badem",
  "isot baharatı",
  "isot baharati",
  "doğal elma sirkesi",
  "dogal elma sirkesi",
  "zeytinyağlı sabun",
  "zeytinyagli sabun",
  "lavanta kolonyası",
  "lavanta kolonyasi",
  "yerel lezzet hediye kutusu",
  "demo akıllı saat",
  "demo akilli saat",
  "demo telefon kılıfı",
  "demo telefon kilifi",
  "karpuz",
  "watermelon",
];

const BLOCKED_DEMO_MARKETPLACE_IMAGE_FRAGMENTS = [
  "photo-1452195100486-9cc805987862",
  "photo-1474979266404-7eaacbcd87c5",
  "photo-1515543904379-3d757afe72e4",
  "photo-1587049352846-4a222e784d38",
  "photo-1508747703725-719777637510",
  "photo-1532336414038-cf19250c5757",
  "photo-1603073163308-9654c3fb70b5",
  "photo-1607006483224-3e4cefcaf344",
  "photo-1596462502278-27bfdc403348",
  "photo-1513885535751-8b9238bd345a",
  "photo-1579586337278-3befd40fd17a",
  "photo-1601784551446-20c9e07cdbdb",
];

function normalizeDemoGuardText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[ğĞ]/g, "g");
}

function isBlockedDemoMarketplaceProduct(row: Record<string, unknown>): boolean {
  const name = normalizeDemoGuardText(row.name);
  const image = String(row.image_url ?? row.imageUrl ?? "").toLowerCase();
  return (
    BLOCKED_DEMO_MARKETPLACE_NAME_FRAGMENTS.some((fragment) => name.includes(normalizeDemoGuardText(fragment))) ||
    BLOCKED_DEMO_MARKETPLACE_IMAGE_FRAGMENTS.some((fragment) => image.includes(fragment))
  );
}

function demoMarketplaceProductSqlExclusion() {
  const nameClauses = BLOCKED_DEMO_MARKETPLACE_NAME_FRAGMENTS.flatMap((fragment) => {
    const lowered = String(fragment).toLocaleLowerCase("tr-TR");
    const normalized = normalizeDemoGuardText(fragment);
    return [
      sql`LOWER(mi.name) LIKE ${`%${lowered}%`}`,
      sql`LOWER(mi.name) LIKE ${`%${normalized}%`}`,
    ];
  });
  const imageClauses = BLOCKED_DEMO_MARKETPLACE_IMAGE_FRAGMENTS.map(
    (fragment) => sql`LOWER(COALESCE(mi.image_url, '')) LIKE ${`%${fragment}%`}`,
  );
  return sql`AND NOT (${sql.join([...nameClauses, ...imageClauses], sql` OR `)})`;
}

const yemeksepetiExcelMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 42 * 1024 * 1024 },
});

const TABLE_SERVICE_PROVIDER_SUBTYPES = new Set(["", "restoran", "restaurant", "cafe", "kafe", "restoran-kafe", "restoran_cafe"]);

type DeliveryBusinessModule = "food" | "market" | "nearby";

const DELIVERY_MODULE_KEYS = new Set(["food", "market", "nearby"]);
const DELIVERY_FOOD_TERMS = [
  "restaurant", "restoran", "lokanta", "yemek", "cafe", "kafe", "pastane", "simit", "borek",
  "borekci", "pide", "lahmacun", "kebap", "kebab", "doner", "pizza", "burger", "kofte",
  "tatli", "baklava", "cig kofte", "kahvalti", "unlu mamul", "hazir yemek",
];
const DELIVERY_MARKET_TERMS = [
  "market", "grocery", "bakkal", "manav", "kuruyemis", "aktar", "tavuk", "kasap", "sarkuteri",
  "firin", "yufka", "su", "icecek", "mesrubat", "balik", "balikci", "bakliyat", "organik",
  "mandira", "sut", "peynir", "zeytin",
];
const DELIVERY_NEARBY_TERMS = [
  "yapi market", "hirdavat", "elektronik", "giyim", "moda",
  "petshop", "pet shop", "kozmetik", "hediyelik", "bijuteri", "cicekci", "ayakkabici",
  "nalburiye", "oyuncak", "mobilya", "kirtasiye",
];
const DELIVERY_NEARBY_EXCLUDED_SLUGS = new Set(["yedek-parca", "oto-yedek-parca", "yedek-parca-oto"]);
const DELIVERY_NEARBY_OTO_EXCLUDED_TERMS = ["yedek parca", "oto parca", "oto yedek", "yedek parca oto"];

function isNearbyExcludedDeliveryCategory(category: { name?: unknown; slug?: unknown }): boolean {
  const slug = normalizeDeliveryGroupText(category.slug);
  if (slug && DELIVERY_NEARBY_EXCLUDED_SLUGS.has(slug)) return true;
  const text = normalizeDeliveryGroupText([category.name, category.slug].filter(Boolean).join(" "));
  return deliveryTextIncludesAnyTerm(text, DELIVERY_NEARBY_OTO_EXCLUDED_TERMS);
}

function normalizeDeliveryGroupText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function deliveryTextIncludesAnyTerm(haystack: string, terms: string[]): boolean {
  return terms.some((term) => {
    const normalizedTerm = normalizeDeliveryGroupText(term);
    return new RegExp(`(^|\\s)${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(haystack);
  });
}

function classifyDeliveryCategoryForApi(category: { name?: unknown; slug?: unknown; superCategory?: unknown; super_category?: unknown }): DeliveryBusinessModule | null {
  if (isNearbyExcludedDeliveryCategory(category)) return null;
  const text = normalizeDeliveryGroupText([category.name, category.slug, category.superCategory, category.super_category].filter(Boolean).join(" "));
  if (deliveryTextIncludesAnyTerm(text, DELIVERY_FOOD_TERMS)) return "food";
  if (deliveryTextIncludesAnyTerm(text, DELIVERY_MARKET_TERMS)) return "market";
  if (deliveryTextIncludesAnyTerm(text, DELIVERY_NEARBY_TERMS)) return "nearby";
  return "nearby";
}

function parseDeliveryModuleQuery(value: unknown): DeliveryBusinessModule | null {
  const key = String(value ?? "").trim();
  return DELIVERY_MODULE_KEYS.has(key) ? (key as DeliveryBusinessModule) : null;
}

async function deliveryCategoryIdsForModule(moduleKey: DeliveryBusinessModule): Promise<number[]> {
  const categories = await db
    .select({
      id: vendorCategoriesTable.id,
      name: vendorCategoriesTable.name,
      slug: vendorCategoriesTable.slug,
      superCategory: vendorCategoriesTable.superCategory,
    })
    .from(vendorCategoriesTable)
    .where(eq(vendorCategoriesTable.active, true));
  return categories
    .filter((category) => classifyDeliveryCategoryForApi(category) === moduleKey)
    .map((category) => category.id);
}

type DeliveryCategoryRowForModule = { id: number; name: string | null; slug: string | null; superCategory: string | null };

async function loadDeliveryCategoryMap(): Promise<Map<number, DeliveryCategoryRowForModule>> {
  const categories = await db
    .select({
      id: vendorCategoriesTable.id,
      name: vendorCategoriesTable.name,
      slug: vendorCategoriesTable.slug,
      superCategory: vendorCategoriesTable.superCategory,
    })
    .from(vendorCategoriesTable)
    .where(eq(vendorCategoriesTable.active, true));
  return new Map(categories.map((category) => [category.id, category]));
}

/** İşletmenin modülü: kategori atanmışsa kategoriden, yoksa ad/slug/etiket metninden belirlenir
 *  (frontend `deliveryVendorModule` ile aynı kurallar — kategori atanmamış içe aktarılan işletmeler boş düşmesin). */
function classifyDeliveryVendorForApi(
  vendor: { categoryId?: number | null; name?: unknown; slug?: unknown; tags?: unknown },
  categoriesById: Map<number, DeliveryCategoryRowForModule>,
): DeliveryBusinessModule {
  const categoryId = vendor.categoryId;
  if (categoryId != null && categoriesById.has(categoryId)) {
    const mod = classifyDeliveryCategoryForApi(categoriesById.get(categoryId)!);
    if (mod) return mod;
  }
  const tags = Array.isArray(vendor.tags) ? vendor.tags.join(" ") : String(vendor.tags ?? "");
  const text = normalizeDeliveryGroupText([vendor.name, vendor.slug, tags].filter(Boolean).join(" "));
  if (deliveryTextIncludesAnyTerm(text, DELIVERY_FOOD_TERMS)) return "food";
  if (deliveryTextIncludesAnyTerm(text, DELIVERY_MARKET_TERMS)) return "market";
  if (deliveryTextIncludesAnyTerm(text, DELIVERY_NEARBY_TERMS)) return "nearby";
  return "nearby";
}

function canVendorUseTableService(row: { provider_type?: unknown; vendor_type?: unknown; provider_subtype?: unknown }): boolean {
  const source = row as Record<string, unknown>;
  const type = String(source.provider_type || source.providerType || source.vendor_type || source.vendorType || "").toLowerCase();
  const subtype = String(source.provider_subtype || source.providerSubtype || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, "_");
  return ["siparis", "delivery"].includes(type) && TABLE_SERVICE_PROVIDER_SUBTYPES.has(subtype);
}

function parseOrderItems(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const VENDOR_PATCH_KEYS = new Set([
  "name", "slug", "description", "categoryId", "imageUrl", "coverUrl", "phone", "email", "address", "city", "district", "lat", "lng",
  "workingHours", "vendorType", "minOrderAmount", "deliveryFee", "deliveryTime", "shippingFee", "shippingTime", "freeShippingAbove",
  "rating", "reviewCount", "isOpen", "featured", "active", "tags", "whatsapp", "callmebotKey", "ownerUserId", "ownerName", "ownerEmail", "status", "notes",
  "catalogContactGap", "catalogMenuGap",
  "googlePlaceId", "linkedMapBusinessId", "googleImportKind",
  "revenueModel", "commissionRatePct", "payoutBankHolder", "payoutBankIban", "payoutBankBranch",
  "membershipTier",
  "aboutHtml",
]);

async function getStripeForDelivery(): Promise<Stripe | null> {
  const rows = await db.select().from(paymentSettingsTable).limit(1);
  const s = rows[0];
  if (!s?.stripeEnabled || !s?.stripeSecretKey) return null;
  return new Stripe(s.stripeSecretKey, { apiVersion: "2024-06-20" as never });
}

/** Abonelik modelinde: işletme PayTR/iyzico veya platform Stripe ile online tahsilat. */
async function enrichVendorPublicOnlinePay(vendorPublic: Record<string, unknown>): Promise<void> {
  const [ps] = await db.select().from(paymentSettingsTable).limit(1);
  const stripeReady = Boolean(
    ps?.stripeEnabled && String(ps?.stripeSecretKey ?? "").trim() && String(ps?.stripePublishableKey ?? "").trim(),
  );
  const paytr = vendorPublic.trPaytrConfigured === true;
  const iyz = vendorPublic.trIyzicoConfigured === true;
  const rm = normalizeRevenueModel(vendorPublic.revenueModel);
  vendorPublic.subscriptionTrOnlinePay = rm === "subscription" && (paytr || iyz || stripeReady);
  vendorPublic.platformStripeDeliveryEnabled = stripeReady;
}

async function attachPublicStorefrontHrefs<T extends { id: number; slug?: string | null; name?: string | null; vendorType?: string | null; providerType?: string | null; providerSubtype?: string | null }>(
  vendors: T[],
): Promise<Array<T & { storefrontHref: string }>> {
  if (!vendors.length) return [];
  await ensureVendorCustomDomainsTable();
  const ids = vendors.map((v) => Number(v.id)).filter((id) => Number.isFinite(id) && id > 0);
  const domainByVendor = new Map<number, string>();
  if (ids.length) {
    const rows = (
      await db.execute<any>(sql`
        SELECT DISTINCT ON (vendor_id) vendor_id, domain
        FROM vendor_custom_domains
        WHERE vendor_id IN (${sql.raw(ids.join(","))})
          AND (status = 'approved' OR verified_at IS NOT NULL)
        ORDER BY vendor_id, position ASC, id ASC
      `)
    ).rows as Array<{ vendor_id: number; domain: string }> | undefined;
    for (const row of rows ?? []) {
      const domain = String(row.domain ?? "").trim();
      if (domain) domainByVendor.set(Number(row.vendor_id), domain);
    }
  }
  return vendors.map((vendor) => {
    const domain = domainByVendor.get(Number(vendor.id));
    const slug = String(vendor.slug ?? "").trim();
    const yekpareStoreHref = resolveVendorStorefrontPath({
      slug,
      vendorType: vendor.vendorType,
      providerType: vendor.providerType,
      providerSubtype: vendor.providerSubtype,
    });
    const storefrontHref = domain
      ? `https://${domain}${resolveVendorCustomDomainShortPath(vendor)}`
      : yekpareStoreHref;
    return { ...vendor, storefrontHref, yekpareStoreHref };
  });
}

let ensuredVendorCatalogGapCols = false;
async function ensureVendorCatalogGapColumns() {
  if (ensuredVendorCatalogGapCols) return;
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_contact_gap BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_menu_gap BOOLEAN NOT NULL DEFAULT false`);
  ensuredVendorCatalogGapCols = true;
}

/** `catalog_menu_gap` = DB’de aktif menü satırı yok (Google Haritalar’daki «menü» sekmesi API’de yemek listesi olarak gelmez). */
async function recomputeVendorCatalogMenuGap(vendorId: number): Promise<void> {
  await ensureVendorCatalogGapColumns();
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(vendorMenuItemsTable)
    .where(and(eq(vendorMenuItemsTable.vendorId, vendorId), eq(vendorMenuItemsTable.active, true)));
  const hasMenu = (c ?? 0) > 0;
  await db
    .update(vendorsTable)
    .set({ catalogMenuGap: !hasMenu, updatedAt: new Date() })
    .where(eq(vendorsTable.id, vendorId));
}

let ensuredVendorMembershipTierCol = false;
async function ensureVendorMembershipTierColumn() {
  if (ensuredVendorMembershipTierCol) return;
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'gold'`);
  ensuredVendorMembershipTierCol = true;
}

let ensuredVendorAboutHtmlCol = false;
async function ensureVendorAboutHtmlColumn() {
  if (ensuredVendorAboutHtmlCol) return;
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS about_html TEXT`);
  ensuredVendorAboutHtmlCol = true;
}

let ensuredDeliveryCustomerEmailCol = false;
async function ensureDeliveryCustomerEmailColumn() {
  if (ensuredDeliveryCustomerEmailCol) return;
  await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_email TEXT`);
  ensuredDeliveryCustomerEmailCol = true;
}

let ensuredDeliveryLegalCols = false;
async function ensureDeliveryLegalAcceptanceColumns() {
  if (ensuredDeliveryLegalCols) return;
  await db.execute(
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS legal_distance_sales_accepted BOOLEAN NOT NULL DEFAULT false`,
  );
  await db.execute(
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS legal_preinfo_accepted BOOLEAN NOT NULL DEFAULT false`,
  );
  ensuredDeliveryLegalCols = true;
}

/** Tek üyelik tipi: e‑ticaret satırında provider/onay alanlarını ve panel e-postasını tutarlı yap */
async function syncUnifiedVendorMembershipAfterVendorWrite(vendorId: number) {
  await db.execute(sql`
    UPDATE vendors SET
      owner_email = COALESCE(NULLIF(TRIM(owner_email), ''), NULLIF(TRIM(email), '')),
      provider_type = CASE
        WHEN vendor_type = 'ecommerce' THEN COALESCE(NULLIF(TRIM(provider_type), ''), 'alisveris')
        ELSE provider_type
      END,
      application_status = CASE
        WHEN vendor_type = 'ecommerce' THEN COALESCE(NULLIF(TRIM(application_status), ''), 'approved')
        ELSE application_status
      END,
      updated_at = NOW()
    WHERE id = ${vendorId}
  `);
}

function vendorRowForAdminJson(row: typeof vendorsTable.$inferSelect) {
  const { passwordHash, ...rest } = row;
  return { ...rest, panelPasswordSet: Boolean(passwordHash && String(passwordHash).trim()) };
}

function joinWeekdayDescriptionsFromPlacesNew(place: Record<string, unknown>): string | null {
  const current = place.currentOpeningHours as { weekdayDescriptions?: string[] } | undefined;
  const regular = place.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined;
  const rows = Array.isArray(current?.weekdayDescriptions)
    ? current!.weekdayDescriptions!
    : Array.isArray(regular?.weekdayDescriptions)
      ? regular!.weekdayDescriptions!
      : [];
  const clean = rows.map((x) => String(x || "").trim()).filter(Boolean);
  return clean.length ? clean.join("\n") : null;
}

let ensuredVendorRevenueCols = false;
async function ensureVendorRevenueColumns() {
  if (ensuredVendorRevenueCols) return;
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS revenue_model TEXT NOT NULL DEFAULT 'subscription'`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS commission_rate_pct NUMERIC(8,4)`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_bank_holder TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_bank_iban TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_bank_branch TEXT`);
  await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS platform_commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS commission_base_amount NUMERIC(10,2)`);
  await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS commission_rate_pct_snapshot NUMERIC(8,4)`);
  await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS revenue_model_snapshot TEXT`);
  ensuredVendorRevenueCols = true;
}

let ensuredVendorTrPay = false;
async function ensureVendorTrPaymentColumns() {
  if (ensuredVendorTrPay) return;
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_key TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_salt TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_test_mode BOOLEAN NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_api_key TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_secret_key TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_sandbox BOOLEAN NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS preferred_tr_gateway TEXT`);
  await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS tr_checkout_token TEXT`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS delivery_orders_tr_checkout_token_idx ON delivery_orders (tr_checkout_token)`,
  );
  ensuredVendorTrPay = true;
}

type VendorTrGateRow = {
  slug: string;
  name: string;
  city: string | null;
  revenueModel: string | null;
  paytrMerchantId: string | null;
  paytrMerchantKey: string | null;
  paytrMerchantSalt: string | null;
  paytrTestMode: boolean | null;
  iyzicoApiKey: string | null;
  iyzicoSecretKey: string | null;
  iyzicoSandbox: boolean | null;
  preferredTrGateway: string | null;
};

function clientIpFromRequest(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) {
    return xff.split(",")[0].trim().replace(/^::ffff:/, "").slice(0, 39);
  }
  const raw = req.socket.remoteAddress || "127.0.0.1";
  return String(raw).replace(/^::ffff:/, "").slice(0, 39);
}

function trGatewayForVendor(v: VendorTrGateRow): "paytr" | "iyzico" | null {
  const paytr = !!(
    String(v.paytrMerchantId ?? "").trim() &&
    String(v.paytrMerchantKey ?? "").trim() &&
    String(v.paytrMerchantSalt ?? "").trim()
  );
  const iyz = !!(String(v.iyzicoApiKey ?? "").trim() && String(v.iyzicoSecretKey ?? "").trim());
  const pref = String(v.preferredTrGateway ?? "").toLowerCase().trim();
  if (pref === "iyzico" && iyz) return "iyzico";
  if (pref === "paytr" && paytr) return "paytr";
  if (paytr) return "paytr";
  if (iyz) return "iyzico";
  return null;
}

function paytrBasketRowsFromItems(itemsStr: string, totalTry: number): [string, string, number][] {
  try {
    const arr = JSON.parse(itemsStr) as Array<{ name?: string; price?: unknown; qty?: unknown }>;
    if (!Array.isArray(arr) || arr.length === 0) return [["Sipariş", totalTry.toFixed(2), 1]];
    return arr.map((it, i) => {
      const pr = parseMoney(it.price);
      const q = Math.max(1, parseInt(String(it.qty ?? 1), 10) || 1);
      return [String(it.name || `Ürün ${i + 1}`).slice(0, 80), (Number.isFinite(pr) ? pr : 0).toFixed(2), q] as [string, string, number];
    });
  } catch {
    return [["Sipariş", totalTry.toFixed(2), 1]];
  }
}

function formatTrGsm(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length >= 10) {
    const rest = d.startsWith("0") ? d.slice(1) : d.startsWith("90") ? d.slice(2) : d;
    return `+90${rest.slice(0, 10)}`;
  }
  return "+905551112233";
}

const MENU_ITEM_PATCH_KEYS = new Set([
  "vendorId", "menuCategoryId", "name", "description", "price", "salePrice", "imageUrl", "isVegan", "isSpicy", "isPopular", "preparationTime", "stock", "active",
]);

function pickVendorPatch(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of VENDOR_PATCH_KEYS) {
    if (k in body && body[k] !== undefined) out[k] = body[k];
  }
  if ("membershipTier" in out && out["membershipTier"] !== undefined) {
    const m = String(out["membershipTier"]).toLowerCase().trim();
    out["membershipTier"] = m === "standard" || m === "gold" || m === "premium" ? m : "gold";
  }
  if ("aboutHtml" in out && out["aboutHtml"] != null) {
    const t = String(out["aboutHtml"]).trim().slice(0, 60_000);
    out["aboutHtml"] = t === "" ? null : t;
  }
  for (const boolKey of ["catalogContactGap", "catalogMenuGap"] as const) {
    if (boolKey in out) out[boolKey] = Boolean(out[boolKey]);
  }
  for (const dec of ["minOrderAmount", "deliveryFee", "shippingFee", "freeShippingAbove", "commissionRatePct"] as const) {
    if (dec in out && out[dec] != null) out[dec] = String(out[dec]).trim().replace(/\s/g, "").replace(",", ".");
  }
  if ("revenueModel" in out && out["revenueModel"] != null) {
    const m = String(out["revenueModel"]).toLowerCase().trim();
    out["revenueModel"] = m === "commission" ? "commission" : "subscription";
  }
  for (const coord of ["lat", "lng"] as const) {
    if (coord in out && out[coord] !== undefined && out[coord] !== null && out[coord] !== "") {
      const n = parseFloat(String(out[coord]).replace(",", ".").replace(/\s/g, ""));
      out[coord] = Number.isFinite(n) ? n : null;
    }
  }
  return out;
}

function pickMenuItemPatch(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of MENU_ITEM_PATCH_KEYS) {
    if (k in body && body[k] !== undefined) out[k] = body[k];
  }
  for (const dec of ["price", "salePrice"] as const) {
    if (dec in out && out[dec] != null && out[dec] !== "") out[dec] = String(out[dec]).trim().replace(/\s/g, "").replace(",", ".");
    if (dec === "salePrice" && (out[dec] === "" || out[dec] == null)) out[dec] = null;
  }
  return out;
}

const router: IRouter = Router();

/** Multer öncesi: oturum / secret doğrulansın (gövde henüz parse edilmemiş olsa da çerez ve başlıklar okunur). */
function requireAdminMaintenanceBeforeMultipart(req: Request, res: Response, next: NextFunction): void {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  next();
}

type ImportTask = { type: "list" | "vendor"; url: string; page?: number; retries: number };
type ImportJob = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "queued" | "running" | "done" | "cancelled" | "failed";
  platform: ExternalPlatform | "all";
  city?: string;
  district?: string;
  neighborhood?: string;
  lat?: number | null;
  lng?: number | null;
  categoryName?: string;
  urlTemplate: string;
  maxPages: number;
  maxRetries: number;
  forceDraft: boolean;
  queue: ImportTask[];
  processed: number;
  imported: number;
  skippedClosed: number;
  skippedMismatch: number;
  duplicateDrafted: number;
  failed: number;
  errors: string[];
};

const importJobs = new Map<string, ImportJob>();
/** Aynı job için eşzamanlı `processImportJob` (axios beklerken ikinci shift önleme) */
const importJobProcessing = new Set<string>();

function newJobId(): string {
  return `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function fillTemplate(tpl: string, params: { city?: string; district?: string; neighborhood?: string; page: number }): string {
  return tpl
    .replace(/\{\{city\}\}/g, encodeURIComponent(params.city || ""))
    .replace(/\{\{district\}\}/g, encodeURIComponent(params.district || ""))
    .replace(/\{\{neighborhood\}\}/g, encodeURIComponent(params.neighborhood || ""))
    .replace(/\{\{page\}\}/g, String(params.page));
}

function normLoc(v?: string | null): string {
  return String(v || "").toLowerCase().replace(/[\s.,;:/-]+/g, " ").trim();
}

function platformHostMatch(platform: ImportJob["platform"], href: string): boolean {
  const h = href.toLowerCase();
  if (platform === "all") return /(yemeksepeti\.com|getir\.com|getiryemek\.com|yemek\.getir\.com|migros\.com\.tr|migrosyemek|trendyol\.com|trendyolgo\.com|tgoyemek\.com|google\.com\/maps|maps\.app\.goo\.gl)/.test(h);
  if (platform === "yemeksepeti") return h.includes("yemeksepeti.com");
  if (platform === "getir-yemek" || platform === "getir-carsi") return h.includes("getir.com") || h.includes("getiryemek.com") || h.includes("yemek.getir.com");
  if (platform === "migros-yemek") return h.includes("migros.com.tr") || h.includes("migrosyemek");
  if (platform === "trendyol-yemek") return h.includes("trendyol.com") || h.includes("trendyolgo.com");
  if (platform === "tgo") return h.includes("tgoyemek.com");
  if (platform === "google-maps") return h.includes("google.com/maps") || h.includes("maps.app.goo.gl");
  return false;
}

async function scrapeVendorLinksFromListingPage(
  url: string,
  platform: ImportJob["platform"],
): Promise<{ links: string[]; httpStatus: number; htmlLength: number }> {
  const res = await axios.get<string>(url, {
    timeout: 30000,
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    validateStatus: (s) => s >= 200 && s < 500,
  });
  if (res.status >= 400) return { links: [], httpStatus: res.status, htmlLength: 0 };
  const html = String(res.data || "");
  const links = [...html.matchAll(/href=["']([^"'#]+)["']/gi)]
    .map((m) => m[1])
    .filter(Boolean)
    .map((href) => {
      try { return new URL(href, url).toString(); } catch { return ""; }
    })
    .filter((href) => /^https?:\/\//i.test(href));
  const escapedLinks = [...html.matchAll(/https?:\\\/\\\/[^\s"'<>\\]+/gi)]
    .map((m) => m[0].replace(/\\\//g, "/"))
    .filter((href) => /^https?:\/\//i.test(href));
  const rawLinks = [...html.matchAll(/https?:\/\/[^\s"'<>\\]+/gi)]
    .map((m) => m[0])
    .filter((href) => /^https?:\/\//i.test(href));
  const merged = [...links, ...escapedLinks, ...rawLinks].map((href) => href.replace(/[),.;]+$/g, ""));
  const uniq = Array.from(new Set(merged.filter((href) => platformHostMatch(platform, href))));
  const likelyVendor = uniq.filter((u) => /(restaurant|restoran|isletmeler|\/yemek\/|\/carsi\/|\/restoranlar\/|\/yemek\/yaprak|\/restaurant\/|\/maps\/place\/|\/shop\/|\/store\/|\/magaza\/)/i.test(u));
  // If template points directly to a vendor page, keep it.
  if (platformHostMatch(platform, url)) likelyVendor.push(url);
  return { links: Array.from(new Set(likelyVendor)), httpStatus: res.status, htmlLength: html.length };
}

async function processImportJob(job: ImportJob): Promise<void> {
  if (importJobProcessing.has(job.id)) return;
  importJobProcessing.add(job.id);
  if (job.status === "cancelled" || job.status === "done" || job.status === "failed") {
    importJobProcessing.delete(job.id);
    return;
  }
  job.status = "running";
  const task = job.queue.shift();
  if (!task) {
    job.status = "done";
    job.updatedAt = new Date().toISOString();
    return;
  }
  job.processed++;
  try {
    if (task.type === "list") {
      const { links, httpStatus, htmlLength } = await scrapeVendorLinksFromListingPage(task.url, job.platform);
      if (links.length === 0) {
        job.errors.push(
          `list:sayfa${task.page ?? "?"} HTTP ${httpStatus} html=${htmlLength} link=0 — platform filtresi veya şablon URL eşleşmedi: ${task.url.slice(0, 160)}`,
        );
        if (job.errors.length > 120) job.errors = job.errors.slice(-120);
      }
      for (const link of links) {
        const exists = job.queue.some((q) => q.type === "vendor" && q.url === link);
        if (!exists) job.queue.push({ type: "vendor", url: link, retries: 0 });
      }
    } else {
      const imported = await importVendorFromExternalUrl(task.url);
      if (!imported.isOpen && imported.platform !== "google-maps") {
        job.skippedClosed++;
      } else if (
        (job.city && imported.city && normLoc(imported.city) !== normLoc(job.city)) ||
        (job.district && imported.district && normLoc(imported.district) !== normLoc(job.district)) ||
        (job.neighborhood && normLoc(imported.neighborhood || imported.address || "").includes(normLoc(job.neighborhood)) === false)
      ) {
        job.skippedMismatch++;
      } else {
        const created = await createVendorFromImportedData(imported, {
          categoryName: job.categoryName,
          forceDraft: job.forceDraft,
          forcedLat: job.lat ?? null,
          forcedLng: job.lng ?? null,
        });
        if (created.duplicateVendor) job.duplicateDrafted++;
        job.imported++;
      }
    }
  } catch (e: any) {
    if (task.retries < job.maxRetries) {
      job.queue.push({ ...task, retries: task.retries + 1 });
    } else {
      job.failed++;
      job.errors.push(`${task.type}:${task.url} -> ${e?.message || "hata"}`);
      if (job.errors.length > 100) job.errors = job.errors.slice(-100);
    }
  } finally {
    job.updatedAt = new Date().toISOString();
    importJobProcessing.delete(job.id);
  }
}

setInterval(() => {
  const active = [...importJobs.values()].find((j) => j.status === "queued" || j.status === "running");
  if (!active) return;
  void processImportJob(active);
}, 1500);

function slugifyTr(str: string): string {
  return String(str || "")
    .toLowerCase()
    .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Pazaryeri içi satıcı vitrini — `/magaza/magaza/:slug` (tam e-ticaret vitrini `/alisveris/magaza/:slug` ayrı kalır) */
function marketplaceVendorHref(slug: string): string {
  const s = String(slug ?? "").trim();
  return s ? `/magaza/magaza/${encodeURIComponent(s)}` : "/magaza/magazalar";
}

async function ensureVendorCategoryByName(nameRaw: string): Promise<number | null> {
  const name = String(nameRaw || "").trim();
  if (!name) return null;
  const slug = slugifyTr(name);
  const existing = await db.execute<any>(sql`SELECT id FROM vendor_categories WHERE slug = ${slug} LIMIT 1`);
  const rows = existing.rows ?? existing;
  if (rows[0]?.id) return Number(rows[0].id);
  const inserted = await db.execute<any>(sql`
    INSERT INTO vendor_categories (name, slug, icon, position, active, super_category)
    VALUES (${name}, ${slug}, '🍽️', 999, true, 'siparis')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const irows = inserted.rows ?? inserted;
  return irows[0]?.id ? Number(irows[0].id) : null;
}

function inferCategoryName(imported: ImportedVendorData): string {
  if (imported.platform === "getir-carsi" || imported.platform === "migros-yemek") return "Marketler";
  if (imported.platform === "local-aladdin") return "Restoranlar";
  if (imported.menu.some((m) => /kampanya|menu|menü|burger|pizza|doner|döner|tavuk/i.test(String(m.name || "")))) return "Restoranlar";
  return "Restoranlar";
}

async function findPossibleDuplicateVendor(v: ImportedVendorData): Promise<any | null> {
  const sourceUrl = String(v.sourceUrl || "").trim();
  const sourceId = String(v.sourceId || "").trim();
  if (sourceUrl) {
    const byUrl = await db.execute<any>(sql`
      SELECT id, name, slug, city, district, status
      FROM vendors
      WHERE notes ILIKE ${`%${sourceUrl}%`}
      LIMIT 1
    `);
    const rows = byUrl.rows ?? byUrl;
    if (rows[0]) return rows[0];
  }
  if (sourceId) {
    const byId = await db.execute<any>(sql`
      SELECT id, name, slug, city, district, status
      FROM vendors
      WHERE notes ILIKE ${`%source_id:${sourceId}%`}
      LIMIT 1
    `);
    const rows = byId.rows ?? byId;
    if (rows[0]) return rows[0];
  }
  const byNameCity = await db.execute<any>(sql`
    SELECT id, name, slug, city, district, status
    FROM vendors
    WHERE LOWER(name) = LOWER(${v.name})
      AND COALESCE(LOWER(city), '') = COALESCE(LOWER(${v.city || ""}), '')
      AND COALESCE(LOWER(district), '') = COALESCE(LOWER(${v.district || ""}), '')
    LIMIT 1
  `);
  const nrows = byNameCity.rows ?? byNameCity;
  return nrows[0] ?? null;
}

async function upsertImportedMenu(vendorId: number, menu: ImportedMenuItem[]): Promise<{ categories: number; items: number; options: number }> {
  const catMap = new Map<string, number>();
  let categoryCount = 0;
  let itemCount = 0;
  let optionCount = 0;
  for (const m of menu) {
    const catName = String(m.category || "Diğer").trim() || "Diğer";
    const catKey = catName.toLowerCase();
    let catId = catMap.get(catKey);
    if (!catId) {
      const q = await db.execute<any>(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active)
        VALUES (${vendorId}, ${catName}, 999, true)
        ON CONFLICT DO NOTHING
        RETURNING id
      `);
      const qRows = q.rows ?? q;
      if (qRows[0]?.id) {
        catId = Number(qRows[0].id);
      } else {
        const fq = await db.execute<any>(sql`
          SELECT id FROM vendor_menu_categories
          WHERE vendor_id = ${vendorId} AND LOWER(name) = LOWER(${catName})
          LIMIT 1
        `);
        const fr = fq.rows ?? fq;
        catId = fr[0]?.id ? Number(fr[0].id) : undefined;
      }
      if (catId) {
        catMap.set(catKey, catId);
        categoryCount++;
      }
    }
    if (!m.name || !catId) continue;
    const inserted = await db.execute<any>(sql`
      INSERT INTO vendor_menu_items (
        vendor_id, menu_category_id, name, description, price, image_url, active
      )
      VALUES (
        ${vendorId},
        ${catId},
        ${m.name},
        ${m.description || null},
        ${m.price != null ? String(m.price) : "0"},
        ${m.imageUrl || null},
        true
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    let itemId: number | null = null;
    const irows = inserted.rows ?? inserted;
    if (irows[0]?.id) itemId = Number(irows[0].id);
    if (!itemId) {
      const ex = await db.execute<any>(sql`
        SELECT id FROM vendor_menu_items
        WHERE vendor_id = ${vendorId} AND LOWER(name) = LOWER(${m.name})
        LIMIT 1
      `);
      const exRows = ex.rows ?? ex;
      if (exRows[0]?.id) {
        itemId = Number(exRows[0].id);
        const img = String(m.imageUrl ?? "").trim() || null;
        await db.execute(sql`
          UPDATE vendor_menu_items SET
            menu_category_id = ${catId},
            description = COALESCE(${m.description || null}, description),
            price = COALESCE(${m.price != null ? String(m.price) : null}, price),
            image_url = CASE WHEN ${img} IS NOT NULL AND ${img} <> '' THEN ${img} ELSE image_url END,
            updated_at = now()
          WHERE id = ${itemId} AND vendor_id = ${vendorId}
        `);
      }
    }
    if (itemId) itemCount++;
    if (itemId && m.options?.length) {
      for (const og of m.options) {
        if (!og.name || !og.choices?.length) continue;
        await db.execute(sql`
          INSERT INTO vendor_item_options (menu_item_id, name, required, multiple, choices)
          VALUES (
            ${itemId},
            ${og.name},
            ${Boolean(og.required)},
            ${Boolean(og.multiple)},
            ${JSON.stringify(og.choices)}::jsonb
          )
        `);
        optionCount++;
      }
    }
  }
  return { categories: categoryCount, items: itemCount, options: optionCount };
}

async function createVendorFromImportedData(
  imported: ImportedVendorData,
  opts: { categoryName?: string; forceDraft?: boolean; forcedLat?: number | null; forcedLng?: number | null },
): Promise<{ vendorId: number; duplicateVendor: any | null; menuStats: { categories: number; items: number; options: number } }> {
  const duplicateVendor = await findPossibleDuplicateVendor(imported);
  const shouldDraft = Boolean(opts.forceDraft) || Boolean(duplicateVendor);
  const categoryId = await ensureVendorCategoryByName(opts.categoryName || inferCategoryName(imported));
  const baseSlug = slugifyTr(imported.name || "isletme");
  let slug = baseSlug || `isletme-${Date.now()}`;
  if (duplicateVendor) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const notesParts = [
    `source_platform:${imported.platform}`,
    `source_url:${imported.sourceUrl}`,
    imported.sourceId ? `source_id:${imported.sourceId}` : null,
    imported.neighborhood ? `neighborhood:${imported.neighborhood}` : null,
    (opts.forcedLat ?? imported.lat) != null ? `lat:${opts.forcedLat ?? imported.lat}` : null,
    (opts.forcedLng ?? imported.lng) != null ? `lng:${opts.forcedLng ?? imported.lng}` : null,
    duplicateVendor ? `duplicate_of_vendor_id:${duplicateVendor.id}` : null,
  ].filter(Boolean);

  const [vendor] = await db.insert(vendorsTable).values({
    name: imported.name,
    slug,
    description: imported.description ?? null,
    categoryId: categoryId ?? undefined,
    imageUrl: imported.imageUrl ?? null,
    coverUrl: imported.coverUrl ?? null,
    phone: imported.phone ?? null,
    email: imported.email ?? null,
    address: imported.address ?? null,
    city: imported.city ?? null,
    district: imported.district ?? null,
    lat: opts.forcedLat ?? imported.lat ?? null,
    lng: opts.forcedLng ?? imported.lng ?? null,
    workingHours: imported.workingHours ?? null,
    vendorType: "delivery",
    /* İçe alınan işletmeleri yayınlasak bile açılış aşaması rozetinde başlatıyoruz */
    isOpen: false,
    active: !shouldDraft,
    featured: false,
    status: shouldDraft ? "draft" : "active",
    notes: notesParts.join(" | "),
  } as typeof vendorsTable.$inferInsert).returning();

  const menuStats = await upsertImportedMenu(vendor.id, imported.menu || []);
  void syncVendorToMapBusiness(vendor);
  return { vendorId: vendor.id, duplicateVendor, menuStats };
}

async function importLocalYemeksepetiParsedRows(
  parsed: LocalImportParsed[],
  opts: { maxTotal: number; includeWithoutMenu: boolean },
  errorsOut: string[],
  fileLabel: string,
): Promise<{
  importedCount: number;
  skippedDuplicate: number;
  skippedNoMenu: number;
  remaining: number;
}> {
  let importedCount = 0;
  let skippedDuplicate = 0;
  let skippedNoMenu = 0;
  let remaining = opts.maxTotal;
  for (const row of parsed) {
    if (remaining <= 0) break;
    const hasMenu = Array.isArray(row.imported.menu) && row.imported.menu.length > 0;
    if (!hasMenu && !opts.includeWithoutMenu) {
      skippedNoMenu++;
      continue;
    }
    const dup = await findPossibleDuplicateVendor(row.imported);
    if (dup) {
      skippedDuplicate++;
      continue;
    }
    try {
      const created = await createVendorFromImportedData(row.imported, {
        categoryName: inferCategoryName(row.imported),
        forceDraft: false,
      });
      if (created.duplicateVendor) {
        skippedDuplicate++;
        continue;
      }
      await db
        .update(vendorsTable)
        .set({
          catalogContactGap: row.catalogContactGap,
          catalogMenuGap: !hasMenu,
          updatedAt: new Date(),
        })
        .where(eq(vendorsTable.id, created.vendorId));
      importedCount++;
      remaining--;
    } catch (e: unknown) {
      errorsOut.push(
        `${fileLabel} · ${String(row.imported.name || "").slice(0, 48)}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  return { importedCount, skippedDuplicate, skippedNoMenu, remaining };
}

/* — DELIVERY STATS ────────────────────────────────────────────── */

router.get("/delivery/stats", async (_req, res): Promise<void> => {
  const [totalVendors] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorsTable);
  const [delivVendors] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorsTable).where(eq(vendorsTable.vendorType, "delivery"));
  const [ecomVendors] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorsTable).where(eq(vendorsTable.vendorType, "ecommerce"));
  const [totalOrders] = await db.select({ count: sql<number>`count(*)::int` }).from(deliveryOrdersTable);
  const [totalMenuItems] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorMenuItemsTable);
  res.json({
    totalVendors: totalVendors?.count ?? 0,
    deliveryVendors: delivVendors?.count ?? 0,
    ecomVendors: ecomVendors?.count ?? 0,
    totalOrders: totalOrders?.count ?? 0,
    totalMenuItems: totalMenuItems?.count ?? 0,
  });
});

/* — VENDOR CATEGORIES ─────────────────────────────────────────── */

router.get("/delivery/categories", async (req, res): Promise<void> => {
  const moduleKey = parseDeliveryModuleQuery(req.query.module);
  const rows = await db.select().from(vendorCategoriesTable)
    .where(eq(vendorCategoriesTable.active, true))
    .orderBy(asc(vendorCategoriesTable.position));
  res.json(moduleKey ? rows.filter((row) => classifyDeliveryCategoryForApi(row) === moduleKey) : rows);
});

router.post("/delivery/categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { name, slug, icon, imageUrl, position } = req.body;
  if (!name || !slug) { res.status(400).json({ error: "name ve slug zorunlu" }); return; }
  const [row] = await db.insert(vendorCategoriesTable).values({ name, slug, icon, imageUrl, position: position ?? 0 }).returning();
  res.status(201).json(row);
});

router.put("/delivery/categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const [row] = await db.update(vendorCategoriesTable).set(req.body)
    .where(eq(vendorCategoriesTable.id, parseInt(req.params.id))).returning();
  res.json(row);
});

router.delete("/delivery/categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.delete(vendorCategoriesTable).where(eq(vendorCategoriesTable.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

/* — SUBCATEGORIES (public read + admin CRUD) ──────────────────── */

router.get("/delivery/subcategories", async (req, res): Promise<void> => {
  const { categoryId } = req.query as Record<string, string>;
  const rows = await db.execute<any>(
    categoryId
      ? sql`SELECT * FROM vendor_subcategories WHERE category_id = ${parseInt(categoryId)} AND active = true ORDER BY position, id`
      : sql`SELECT * FROM vendor_subcategories WHERE active = true ORDER BY category_id, position, id`
  );
  res.json(rows.rows ?? rows);
});

router.get("/admin/vendor-subcategories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { categoryId } = req.query as Record<string, string>;
  const rows = await db.execute<any>(
    categoryId
      ? sql`SELECT * FROM vendor_subcategories WHERE category_id = ${parseInt(categoryId)} ORDER BY position, id`
      : sql`SELECT * FROM vendor_subcategories ORDER BY category_id, position, id`
  );
  res.json(rows.rows ?? rows);
});

router.post("/admin/vendor-subcategories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { categoryId, name, slug, icon, position } = req.body;
  if (!categoryId || !name || !slug) { res.status(400).json({ error: "categoryId, name, slug zorunlu" }); return; }
  const ins = await db.execute<any>(sql`
    INSERT INTO vendor_subcategories (category_id, name, slug, icon, position)
    VALUES (${categoryId}, ${name}, ${slug}, ${icon || null}, ${position ?? 0})
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, position = EXCLUDED.position
    RETURNING *
  `);
  const rows = Array.isArray(ins) ? ins : (ins.rows ?? []);
  res.status(201).json(rows[0] ?? {});
});

router.put("/admin/vendor-subcategories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const { name, slug, icon, position, active } = req.body;
  const sets: string[] = [];
  if (name !== undefined) sets.push(`name = '${name.replace(/'/g, "''")}'`);
  if (slug !== undefined) sets.push(`slug = '${slug.replace(/'/g, "''")}'`);
  if (icon !== undefined) sets.push(`icon = ${icon ? `'${icon.replace(/'/g, "''")}'` : "NULL"}`);
  if (position !== undefined) sets.push(`position = ${parseInt(position)}`);
  if (active !== undefined) sets.push(`active = ${active ? "true" : "false"}`);
  if (!sets.length) { res.status(400).json({ error: "nothing to update" }); return; }
  const result = await db.execute<any>(sql.raw(`UPDATE vendor_subcategories SET ${sets.join(", ")} WHERE id = ${id} RETURNING *`));
  res.json((result.rows ?? result)[0] ?? {});
});

router.delete("/admin/vendor-subcategories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.execute(sql`DELETE FROM vendor_subcategories WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});

/* — PRODUCT TEMPLATES (admin CRUD) ──────────────────────────── */

router.get("/admin/product-templates", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { categoryId } = req.query as Record<string, string>;
  const rows = await db.execute<any>(
    categoryId
      ? sql`SELECT * FROM vendor_product_templates WHERE vendor_category_id = ${parseInt(categoryId)} AND active = true ORDER BY position, id`
      : sql`SELECT * FROM vendor_product_templates WHERE active = true ORDER BY vendor_category_id, position, id`
  );
  res.json(rows.rows ?? rows);
});

router.post("/admin/product-templates", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { vendorCategoryId, name, position } = req.body;
  if (!vendorCategoryId || !name) { res.status(400).json({ error: "vendorCategoryId ve name zorunlu" }); return; }
  const result = await db.execute<any>(sql`
    INSERT INTO vendor_product_templates (vendor_category_id, name, position)
    VALUES (${vendorCategoryId}, ${name}, ${position ?? 0}) RETURNING *
  `);
  res.status(201).json((result.rows ?? result)[0] ?? {});
});

router.put("/admin/product-templates/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const { name, position, active } = req.body;
  const sets: string[] = [];
  if (name !== undefined) sets.push(`name = '${name.replace(/'/g, "''")}'`);
  if (position !== undefined) sets.push(`position = ${parseInt(position)}`);
  if (active !== undefined) sets.push(`active = ${active ? "true" : "false"}`);
  if (!sets.length) { res.status(400).json({ error: "nothing to update" }); return; }
  const result = await db.execute<any>(sql.raw(`UPDATE vendor_product_templates SET ${sets.join(", ")} WHERE id = ${id} RETURNING *`));
  res.json((result.rows ?? result)[0] ?? {});
});

router.delete("/admin/product-templates/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.execute(sql`DELETE FROM vendor_product_templates WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});

/* — ITEM OPTIONS (menu item extras/addons) ────────────────────── */

router.get("/delivery/item-options/:itemId", async (req, res): Promise<void> => {
  const rows = await db.execute<any>(sql`SELECT * FROM vendor_item_options WHERE menu_item_id = ${parseInt(req.params.itemId)} ORDER BY id`);
  res.json(rows.rows ?? rows);
});

router.post("/delivery/item-options", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { menuItemId, name, required, multiple, choices } = req.body;
  if (!menuItemId || !name) { res.status(400).json({ error: "menuItemId ve name zorunlu" }); return; }
  const result = await db.execute<any>(sql`
    INSERT INTO vendor_item_options (menu_item_id, name, required, multiple, choices)
    VALUES (${menuItemId}, ${name}, ${required ?? false}, ${multiple ?? true}, ${JSON.stringify(choices ?? [])}::jsonb)
    RETURNING *
  `);
  res.status(201).json((result.rows ?? result)[0] ?? {});
});

router.put("/delivery/item-options/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { name, required, multiple, choices } = req.body;
  const result = await db.execute<any>(sql`
    UPDATE vendor_item_options SET
      name = ${name}, required = ${required ?? false},
      multiple = ${multiple ?? true}, choices = ${JSON.stringify(choices ?? [])}::jsonb
    WHERE id = ${parseInt(req.params.id)} RETURNING *
  `);
  res.json((result.rows ?? result)[0] ?? {});
});

router.delete("/delivery/item-options/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.execute(sql`DELETE FROM vendor_item_options WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});

/* — COMBOS ────────────────────────────────────────────────────── */

router.get("/delivery/combos/:vendorId", async (req, res): Promise<void> => {
  const rows = await db.execute<any>(sql`SELECT * FROM vendor_menu_combos WHERE vendor_id = ${parseInt(req.params.vendorId)} AND active = true ORDER BY position, id`);
  res.json(rows.rows ?? rows);
});

router.post("/delivery/combos", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { vendorId, name, description, price, imageUrl, comboItems, position } = req.body;
  if (!vendorId || !name) { res.status(400).json({ error: "vendorId ve name zorunlu" }); return; }
  const result = await db.execute<any>(sql`
    INSERT INTO vendor_menu_combos (vendor_id, name, description, price, image_url, combo_items, position)
    VALUES (${vendorId}, ${name}, ${description || null}, ${price || 0}, ${imageUrl || null}, ${JSON.stringify(comboItems ?? [])}::jsonb, ${position ?? 0})
    RETURNING *
  `);
  res.status(201).json((result.rows ?? result)[0] ?? {});
});

router.put("/delivery/combos/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { name, description, price, imageUrl, comboItems, position, active } = req.body;
  const result = await db.execute<any>(sql`
    UPDATE vendor_menu_combos SET
      name = ${name}, description = ${description || null}, price = ${price || 0},
      image_url = ${imageUrl || null}, combo_items = ${JSON.stringify(comboItems ?? [])}::jsonb,
      position = ${position ?? 0}, active = ${active !== false}
    WHERE id = ${parseInt(req.params.id)} RETURNING *
  `);
  res.json((result.rows ?? result)[0] ?? {});
});

router.delete("/delivery/combos/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.execute(sql`DELETE FROM vendor_menu_combos WHERE id = ${parseInt(req.params.id)}`);
  res.json({ ok: true });
});

/* — SEED EXTENDED CATEGORIES ──────────────────────────────────── */
router.post("/delivery/seed-extended-categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  try {
    /* — NEW DELIVERY CATEGORIES — */
    const newDelivCats = [
      { name: "Manav", slug: "manav", icon: "🥦", position: 6 },
      { name: "Kasap", slug: "kasap", icon: "🥩", position: 7 },
      { name: "Şarküteri", slug: "sarküteri", icon: "🧀", position: 8 },
      { name: "Kuruyemiş", slug: "kuruyemis", icon: "🥜", position: 9 },
      { name: "Fırın & Yufkacı", slug: "firin", icon: "🥖", position: 10 },
      { name: "Pastane & Tatlıcı", slug: "pastane", icon: "🎂", position: 11 },
      { name: "Balıkçı", slug: "balikci", icon: "🐟", position: 12 },
      { name: "Aktar & Bitkisel", slug: "aktar", icon: "🌿", position: 13 },
      { name: "Kozmetik & Bakım", slug: "kozmetik-bakim", icon: "💄", position: 14 },
      { name: "Kırtasiye & Kitap", slug: "kirtasiye", icon: "📚", position: 15 },
      { name: "Züccaciye & Ev", slug: "zuccaciye", icon: "🏠", position: 16 },
      { name: "Nalbur & Yapı", slug: "nalbur", icon: "🔧", position: 17 },
      { name: "Giyim & Aksesuar", slug: "giyim-aksesuar", icon: "👕", position: 18 },
      { name: "Petshop", slug: "petshop", icon: "🐾", position: 19 },
      { name: "Hediyelik & Bijuteri", slug: "hediyelik", icon: "🎁", position: 20 },
      { name: "Elektronik", slug: "elektronik-teslimat", icon: "📱", position: 21 },
    ];
    for (const c of newDelivCats) {
      await db.execute(sql`
        INSERT INTO vendor_categories (name, slug, icon, position, active)
        VALUES (${c.name}, ${c.slug}, ${c.icon}, ${c.position}, true)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, position = EXCLUDED.position
      `);
    }
    await db.execute(sql`
      UPDATE vendor_categories SET active = false
      WHERE slug IN ('yedek-parca', 'oto-yedek-parca', 'yedek-parca-oto')
    `);

    /* — GET YEMEK CATEGORY ID — */
    const yemekRows = await db.execute<any>(sql`SELECT id FROM vendor_categories WHERE slug = 'yemek' LIMIT 1`);
    const yemekId = ((yemekRows.rows ?? yemekRows)[0] as any)?.id;

    /* — YEMEK SUBCATEGORIES (21 food types) — */
    if (yemekId) {
      const foodTypes = [
        { name: "Balık & Deniz Ürünleri", slug: "balik-deniz", icon: "🐟", position: 0 },
        { name: "Burger", slug: "burger", icon: "🍔", position: 1 },
        { name: "Çiğ Köfte", slug: "cig-kofte", icon: "🌯", position: 2 },
        { name: "Dondurma", slug: "dondurma", icon: "🍦", position: 3 },
        { name: "Döner", slug: "doner", icon: "🌮", position: 4 },
        { name: "Dünya Mutfağı & Cafe", slug: "dunya-mutfagi", icon: "🍜", position: 5 },
        { name: "Ev Yemekleri", slug: "ev-yemekleri", icon: "🍲", position: 6 },
        { name: "Kahvaltı & Börek", slug: "kahvalti-borek", icon: "🍳", position: 7 },
        { name: "Kebap & Türk Mutfağı", slug: "kebap", icon: "🥙", position: 8 },
        { name: "Kokoreç", slug: "kokorec", icon: "🥩", position: 9 },
        { name: "Köfte", slug: "kofte", icon: "🍖", position: 10 },
        { name: "Kumpir", slug: "kumpir", icon: "🥔", position: 11 },
        { name: "Pastane & Fırın", slug: "pastane-firin", icon: "🥐", position: 12 },
        { name: "Pide & Lahmacun", slug: "pide-lahmacun", icon: "🫓", position: 13 },
        { name: "Pilav", slug: "pilav", icon: "🍚", position: 14 },
        { name: "Pizza", slug: "pizza", icon: "🍕", position: 15 },
        { name: "Tantuni", slug: "tantuni", icon: "🌯", position: 16 },
        { name: "Tatlı & Dessert", slug: "tatli", icon: "🍮", position: 17 },
        { name: "Tavuk", slug: "tavuk", icon: "🍗", position: 18 },
        { name: "Tost & Sandviç", slug: "tost-sandvic", icon: "🥪", position: 19 },
        { name: "Waffle", slug: "waffle", icon: "🧇", position: 20 },
      ];
      for (const ft of foodTypes) {
        await db.execute(sql`
          INSERT INTO vendor_subcategories (category_id, name, slug, icon, position, active)
          VALUES (${yemekId}, ${ft.name}, ${ft.slug}, ${ft.icon}, ${ft.position}, true)
          ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, position = EXCLUDED.position
        `);
      }
    }

    /* — PRODUCT TEMPLATES PER CATEGORY — */
    const templatesByCatSlug: Record<string, string[]> = {
      "market":   ["Meyve & Sebze", "Süt & Kahvaltılık", "Et & Şarküteri", "Ekmek & Fırın", "İçecek", "Temizlik & Hijyen"],
      "manav":    ["Mevsim Meyveleri", "Sebzeler", "Organik Ürünler", "Egzotik Meyveler", "Salata Malzemeleri"],
      "kasap":    ["Dana Eti", "Kuzu Eti", "Tavuk", "Sucuk & Sosis", "Hazır Ürünler"],
      "sarküteri":["Peynirler", "Şarküteri Ürünleri", "Zeytin & Turşu", "Mezeler", "Yöresel Ürünler"],
      "kuruyemis":["Çerez & Kuruyemiş", "Kuru Meyveler", "Bakliyat", "Tohum & Tahıl", "Şekerlemeler"],
      "firin":    ["Ekmek Çeşitleri", "Yufka & Börek", "Pogaça & Simit", "Pasta & Kek", "Unlu Mamüller"],
      "pastane":  ["Pastalar", "Tatlılar", "Kurabiye & Bisküvi", "Çikolata", "Özel Tasarım Pasta"],
      "balikci":  ["Taze Balık", "Deniz Ürünleri", "Işlenmiş Ürünler", "Konserve"],
      "cicek":    ["Buketler", "Saksı Çiçekleri", "Çelenk & Aranjman", "Kaktüs & Sukulent", "Yapay Çiçek"],
      "petshop":  ["Köpek Maması", "Kedi Maması", "Aksesuar & Oyuncak", "Sağlık & Bakım", "Kafes & Ekipman"],
      "aktar":    ["Bitkisel Çaylar", "Şifalı Bitkiler", "Baharat & Ot", "Doğal Sabun & Krem", "Doğal Vitamin"],
      "kozmetik-bakim": ["Cilt Bakımı", "Saç Bakımı", "Makyaj", "Parfüm", "Kişisel Bakım"],
      "kirtasiye":["Kırtasiye", "Ofis Malzemeleri", "Kitaplar", "Oyun & Eğitim", "Sanat Malzemeleri"],
      "zuccaciye":["Mutfak Gereçleri", "Pişirme Kapları", "Dekorasyon", "Temizlik", "Depolama Ürünleri"],
      "nalbur":   ["El Aletleri", "Elektrik Malzeme", "Boya & Badana", "Hırdavat", "Güvenlik & Kilit"],
      "giyim-aksesuar": ["Kadın Giyim", "Erkek Giyim", "Çocuk Giyim", "Çanta & Cüzdan", "Aksesuar & Takı"],
      "hediyelik":["Hediye Kutuları", "Bijuteri", "Kişiselleştirilmiş", "Dekoratif", "Özel Günler"],
    };

    for (const [catSlug, templates] of Object.entries(templatesByCatSlug)) {
      const catRows = await db.execute<any>(sql`SELECT id FROM vendor_categories WHERE slug = ${catSlug} LIMIT 1`);
      const catId = ((catRows.rows ?? catRows)[0] as any)?.id;
      if (!catId) continue;
      for (let i = 0; i < templates.length; i++) {
        await db.execute(sql`
          INSERT INTO vendor_product_templates (vendor_category_id, name, position, active)
          SELECT ${catId}, ${templates[i]}, ${i}, true
          WHERE NOT EXISTS (SELECT 1 FROM vendor_product_templates WHERE vendor_category_id = ${catId} AND name = ${templates[i]})
        `);
      }
    }

    res.json({ ok: true, message: "Extended categories, subcategories and product templates seeded" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* Admin: tüm menü ürünleri */
router.get("/delivery/menu-items-all", async (req, res): Promise<void> => {
  const { vendorId, search } = req.query as Record<string, string>;
  let conditions: any[] = [];
  if (vendorId) conditions.push(eq(vendorMenuItemsTable.vendorId, parseInt(vendorId)));
  if (search) conditions.push(ilike(vendorMenuItemsTable.name, `%${search}%`));
  const rows = await db.select().from(vendorMenuItemsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(vendorMenuItemsTable.createdAt)).limit(300);
  res.json(rows);
});

/* — MODÜL VİTRİN BANNERLARI (admin yönetimli kampanya görselleri) — */

const MODULE_BANNER_MODULES = new Set(["food", "market", "nearby", "siparis"]);

async function ensureDeliveryModuleBannersTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS delivery_module_banners (
      id SERIAL PRIMARY KEY,
      module TEXT NOT NULL DEFAULT 'siparis',
      title TEXT,
      image_url TEXT NOT NULL,
      link_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function serializeModuleBanner(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    module: String(r.module ?? "siparis"),
    title: r.title != null ? String(r.title) : null,
    imageUrl: String(r.image_url ?? ""),
    linkUrl: r.link_url != null ? String(r.link_url) : null,
    position: Number(r.position ?? 0),
    active: r.active === true,
  };
}

/** Public: aktif vitrin bannerları (modül filtreli). */
router.get("/delivery/module-banners", async (req, res): Promise<void> => {
  await ensureDeliveryModuleBannersTable();
  const moduleKey = String(req.query.module ?? "").toLowerCase().trim();
  const result = MODULE_BANNER_MODULES.has(moduleKey)
    ? await db.execute<any>(sql`
        SELECT id, module, title, image_url, link_url, position, active
        FROM delivery_module_banners
        WHERE active = true AND module = ${moduleKey}
        ORDER BY position ASC, id ASC
      `)
    : await db.execute<any>(sql`
        SELECT id, module, title, image_url, link_url, position, active
        FROM delivery_module_banners
        WHERE active = true
        ORDER BY position ASC, id ASC
      `);
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(((result.rows ?? []) as Array<Record<string, unknown>>).map(serializeModuleBanner));
});

/** Admin: tüm vitrin bannerları (pasifler dahil). */
router.get("/delivery/admin/module-banners", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureDeliveryModuleBannersTable();
  const result = await db.execute<any>(sql`
    SELECT id, module, title, image_url, link_url, position, active
    FROM delivery_module_banners
    ORDER BY module ASC, position ASC, id ASC
  `);
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.json(((result.rows ?? []) as Array<Record<string, unknown>>).map(serializeModuleBanner));
});

function parseModuleBannerBody(body: Record<string, unknown>): {
  module: string; title: string | null; imageUrl: string; linkUrl: string | null; position: number; active: boolean;
} | null {
  const moduleKey = String(body.module ?? "siparis").toLowerCase().trim();
  const imageUrl = String(body.imageUrl ?? body.image_url ?? "").trim();
  if (!MODULE_BANNER_MODULES.has(moduleKey) || !imageUrl) return null;
  const title = String(body.title ?? "").trim();
  const linkUrl = String(body.linkUrl ?? body.link_url ?? "").trim();
  const posRaw = parseInt(String(body.position ?? "0"), 10);
  return {
    module: moduleKey,
    title: title ? title.slice(0, 200) : null,
    imageUrl: imageUrl.slice(0, 1000),
    linkUrl: linkUrl ? linkUrl.slice(0, 1000) : null,
    position: Number.isFinite(posRaw) ? posRaw : 0,
    active: body.active !== false && body.active !== "false",
  };
}

router.post("/delivery/admin/module-banners", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureDeliveryModuleBannersTable();
  const parsed = parseModuleBannerBody((req.body ?? {}) as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Modül ve görsel adresi zorunludur." });
    return;
  }
  const result = await db.execute<any>(sql`
    INSERT INTO delivery_module_banners (module, title, image_url, link_url, position, active)
    VALUES (${parsed.module}, ${parsed.title}, ${parsed.imageUrl}, ${parsed.linkUrl}, ${parsed.position}, ${parsed.active})
    RETURNING id, module, title, image_url, link_url, position, active
  `);
  const row = (result.rows ?? [])[0] as Record<string, unknown> | undefined;
  res.status(201).json(row ? serializeModuleBanner(row) : { ok: true });
});

router.put("/delivery/admin/module-banners/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureDeliveryModuleBannersTable();
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz banner" });
    return;
  }
  const parsed = parseModuleBannerBody((req.body ?? {}) as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Modül ve görsel adresi zorunludur." });
    return;
  }
  const result = await db.execute<any>(sql`
    UPDATE delivery_module_banners
    SET module = ${parsed.module}, title = ${parsed.title}, image_url = ${parsed.imageUrl},
        link_url = ${parsed.linkUrl}, position = ${parsed.position}, active = ${parsed.active}
    WHERE id = ${id}
    RETURNING id, module, title, image_url, link_url, position, active
  `);
  const row = (result.rows ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: "Banner bulunamadı" });
    return;
  }
  res.json(serializeModuleBanner(row));
});

router.delete("/delivery/admin/module-banners/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureDeliveryModuleBannersTable();
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz banner" });
    return;
  }
  await db.execute(sql`DELETE FROM delivery_module_banners WHERE id = ${id}`);
  res.json({ ok: true });
});

/** Modül vitrinleri (Yemek / Market / Yakındaki İşletmeler) için ürün rayları:
 *  aktif teslimat işletmelerinin menü kalemlerini modül kategorisine göre döner. */
router.get("/delivery/module-items", async (req, res): Promise<void> => {
  const { city, district, search } = req.query as Record<string, string>;
  const moduleKey = parseDeliveryModuleQuery(req.query.module);
  const discounted = ["1", "true", "yes"].includes(String(req.query.discounted ?? "").toLowerCase());
  const limitRaw = parseInt(String(req.query.limit ?? "24"), 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 24, 4), 60);

  const vendorConditions: any[] = [
    eq(vendorsTable.active, true),
    eq(vendorsTable.vendorType, "delivery"),
  ];
  if (city) vendorConditions.push(ilike(vendorsTable.city, `%${city}%`));
  if (district) vendorConditions.push(ilike(vendorsTable.district, `%${district}%`));

  const itemConditions: any[] = [eq(vendorMenuItemsTable.active, true)];
  if (discounted) {
    itemConditions.push(sql`${vendorMenuItemsTable.salePrice} IS NOT NULL AND ${vendorMenuItemsTable.salePrice} > 0 AND ${vendorMenuItemsTable.salePrice} < ${vendorMenuItemsTable.price}`);
  }
  if (search) itemConditions.push(ilike(vendorMenuItemsTable.name, `%${search}%`));

  const queryRows = await db
    .select({
      id: vendorMenuItemsTable.id,
      name: vendorMenuItemsTable.name,
      description: vendorMenuItemsTable.description,
      price: vendorMenuItemsTable.price,
      salePrice: vendorMenuItemsTable.salePrice,
      imageUrl: vendorMenuItemsTable.imageUrl,
      isPopular: vendorMenuItemsTable.isPopular,
      vendorId: vendorsTable.id,
      vendorName: vendorsTable.name,
      vendorSlug: vendorsTable.slug,
      vendorRating: vendorsTable.rating,
      vendorReviewCount: vendorsTable.reviewCount,
      vendorCity: vendorsTable.city,
      vendorDistrict: vendorsTable.district,
      vendorIsOpen: vendorsTable.isOpen,
      vendorDeliveryTime: vendorsTable.deliveryTime,
      vendorImageUrl: vendorsTable.imageUrl,
      vendorCategoryId: vendorsTable.categoryId,
      vendorTags: vendorsTable.tags,
    })
    .from(vendorMenuItemsTable)
    .innerJoin(vendorsTable, eq(vendorMenuItemsTable.vendorId, vendorsTable.id))
    .where(and(...vendorConditions, ...itemConditions))
    .orderBy(
      desc(vendorMenuItemsTable.isPopular),
      desc(vendorsTable.rating),
      desc(vendorMenuItemsTable.updatedAt),
    )
    .limit(moduleKey ? Math.min(limit * 6, 360) : limit);

  const categoriesById = moduleKey ? await loadDeliveryCategoryMap() : null;
  const rows = (moduleKey && categoriesById
    ? queryRows.filter((row) =>
        classifyDeliveryVendorForApi(
          { categoryId: row.vendorCategoryId, name: row.vendorName, slug: row.vendorSlug, tags: row.vendorTags },
          categoriesById,
        ) === moduleKey)
    : queryRows
  ).slice(0, limit);

  res.json(rows.map((row) => normalizeMapImageFields({ ...row, photoUrl: row.imageUrl }))
    .map((row: any) => ({ ...row, imageUrl: row.photoUrl ?? row.imageUrl })));
});

/* — VENDORS ────────────────────────────────────────────────────── */

router.get("/delivery/vendors", async (req, res): Promise<void> => {
  const { category, city, district, neighborhood, search, featured, type, subcategoryId, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const moduleKey = parseDeliveryModuleQuery(req.query.module);
  const conditions: any[] = [eq(vendorsTable.active, true)];

  if (featured === "true") conditions.push(eq(vendorsTable.featured, true));
  if (type) conditions.push(eq(vendorsTable.vendorType, type));

  if (category) {
    const cat = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.slug, category)).limit(1);
    if (cat[0]) conditions.push(eq(vendorsTable.categoryId, cat[0].id));
  }
  if (subcategoryId) conditions.push(eq((vendorsTable as any).subcategoryId, parseInt(subcategoryId)));
  if (city) conditions.push(ilike(vendorsTable.city, `%${city}%`));
  if (district) conditions.push(ilike(vendorsTable.district, `%${district}%`));
  if (neighborhood) conditions.push(ilike(vendorsTable.address, `%${neighborhood}%`));

  let queryResult;
  const limitNum = Math.max(parseInt(limit) || 50, 1);
  const offsetNum = Math.max(parseInt(offset) || 0, 0);
  // Modül filtresi sınıflandırma ile (kategori + ad/etiket) sonradan uygulanır;
  // sayfalamanın doğru kalması için daha geniş bir aralık çekilir.
  const fetchLimit = moduleKey ? Math.min(Math.max((offsetNum + limitNum) * 4, 200), 600) : limitNum;
  const fetchOffset = moduleKey ? 0 : offsetNum;

  if (search) {
    queryResult = await db.select().from(vendorsTable)
      .where(and(...conditions, or(
        ilike(vendorsTable.name, `%${search}%`),
        ilike(vendorsTable.city, `%${search}%`),
        ilike(vendorsTable.district, `%${search}%`),
        ilike(vendorsTable.address, `%${search}%`),
        ilike(vendorsTable.description, `%${search}%`),
      )))
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.rating))
      .limit(fetchLimit).offset(fetchOffset);
  } else {
    queryResult = await db.select().from(vendorsTable)
      .where(and(...conditions))
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.rating))
      .limit(fetchLimit).offset(fetchOffset);
  }

  if (moduleKey) {
    const categoriesById = await loadDeliveryCategoryMap();
    queryResult = queryResult
      .filter((row) => classifyDeliveryVendorForApi(row, categoriesById) === moduleKey)
      .slice(offsetNum, offsetNum + limitNum);
  }

  const rows = queryResult.map((row) =>
    normalizeMapImageFields({
      ...row,
      photoUrl: row.imageUrl,
      coverPhotoUrl: row.coverUrl,
    }),
  ).map((row) => ({
    ...row,
    imageUrl: row.photoUrl,
    coverUrl: row.coverPhotoUrl,
  }));
  res.json(await attachPublicStorefrontHrefs(rows));
});

/** Global alışveriş ürün kategori ağacı (mağaza paneli + vitrin) */
router.get("/ecommerce-product-categories", async (_req, res): Promise<void> => {
  const tree = await getEcommerceCategoryTree();
  res.json({ success: true, tree });
});

router.get("/delivery/marketplace", async (req, res): Promise<void> => {
  try {
    await seedEcommerceProductCategoriesIfNeeded();
    await seedMarketplaceHealthcareIfNeeded();
    const lang = String(req.query.lang ?? "tr").toLowerCase() === "en" ? "en" : "tr";
    const q = String(req.query.q ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    const randomize = ["1", "true", "yes"].includes(String(req.query.randomize ?? "").toLowerCase());
    const limitRaw = Number(req.query.limit ?? 80);
    const offsetRaw = Number(req.query.offset ?? 0);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 80, 12), 240);
    const offset = Math.max(Number.isFinite(offsetRaw) ? Math.floor(offsetRaw) : 0, 0);

    const vendorRows = await db
      .select()
      .from(vendorsTable)
      .where(and(eq(vendorsTable.active, true), eq(vendorsTable.vendorType, "ecommerce")))
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.rating))
      .limit(80);

    const vendors = (await attachPublicStorefrontHrefs(
      vendorRows.map((row) =>
        normalizeMapImageFields({
          ...row,
          photoUrl: row.imageUrl,
          coverPhotoUrl: row.coverUrl,
        }),
      ).map((row) => ({
        ...row,
        imageUrl: row.photoUrl,
        coverUrl: row.coverPhotoUrl,
      })),
    )).map((vendor) => ({
      ...vendor,
      yekpareStoreHref: resolveVendorStorefrontPath({
        slug: String(vendor.slug ?? ""),
        vendorType: vendor.vendorType,
        providerType: (vendor as { providerType?: string }).providerType,
        providerSubtype: (vendor as { providerSubtype?: string }).providerSubtype,
      }),
      storefrontHref: marketplaceVendorHref(String(vendor.slug ?? "")),
    }));

    const queryWhere = q
      ? sql`AND (
          mi.name ILIKE ${`%${q}%`}
          OR mi.description ILIKE ${`%${q}%`}
          OR v.name ILIKE ${`%${q}%`}
          OR v.description ILIKE ${`%${q}%`}
        )`
      : sql``;
    const categoryWhere = category
      ? sql`AND (
          ec.slug = ${category}
          OR root_ec.slug = ${category}
          OR ec.id IN (
            WITH RECURSIVE selected_category AS (
              SELECT id FROM ecommerce_product_categories WHERE slug = ${category}
              UNION ALL
              SELECT child.id
              FROM ecommerce_product_categories child
              JOIN selected_category parent ON child.parent_id = parent.id
            )
            SELECT id FROM selected_category
          )
          OR concat('menu-', mc.id::text) = ${category}
          OR lower(coalesce(mc.name, '')) = lower(${category})
        )`
      : sql``;
    const [countRow] = execRows<{ total: number | string }>(await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM vendor_menu_items mi
      JOIN vendors v ON v.id = mi.vendor_id
      LEFT JOIN vendor_menu_categories mc ON mc.id = mi.menu_category_id
      LEFT JOIN ecommerce_product_categories ec ON ec.id = mi.ecommerce_category_id
      LEFT JOIN ecommerce_product_categories root_ec ON root_ec.id = COALESCE(ec.parent_id, ec.id)
      WHERE v.active = true
        AND v.vendor_type = 'ecommerce'
        AND mi.active = true
        ${queryWhere}
        ${categoryWhere}
        ${demoMarketplaceProductSqlExclusion()}
    `));
    const totalProducts = Number(countRow?.total ?? 0);
    const productRows = execRows<Record<string, unknown>>(await db.execute(sql`
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.sale_price,
        mi.image_url,
        mi.is_popular,
        mi.stock,
        mi.ecommerce_category_id,
        mc.id AS menu_category_id,
        mc.name AS menu_category_name,
        ec.name AS ecommerce_category_name,
        ec.slug AS ecommerce_category_slug,
        v.id AS vendor_id,
        v.name AS vendor_name,
        v.slug AS vendor_slug,
        v.image_url AS vendor_image_url,
        v.cover_url AS vendor_cover_url,
        v.rating AS vendor_rating,
        v.review_count AS vendor_review_count,
        v.city AS vendor_city,
        v.district AS vendor_district,
        v.is_open AS vendor_is_open
      FROM vendor_menu_items mi
      JOIN vendors v ON v.id = mi.vendor_id
      LEFT JOIN vendor_menu_categories mc ON mc.id = mi.menu_category_id
      LEFT JOIN ecommerce_product_categories ec ON ec.id = mi.ecommerce_category_id
      LEFT JOIN ecommerce_product_categories root_ec ON root_ec.id = COALESCE(ec.parent_id, ec.id)
      WHERE v.active = true
        AND v.vendor_type = 'ecommerce'
        AND mi.active = true
        ${queryWhere}
        ${categoryWhere}
        ${demoMarketplaceProductSqlExclusion()}
      ORDER BY mi.is_popular DESC, mi.updated_at DESC NULLS LAST, mi.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `));

    const discountPercentFor = (price: number, salePrice: number | null): number => {
      if (!Number.isFinite(price) || price <= 0 || salePrice == null || !Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price) {
        return 0;
      }
      return Math.round(((price - salePrice) / price) * 100);
    };
    const shuffled = <T,>(items: T[]): T[] => {
      const next = [...items];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    };

    const products = productRows.filter((row) => !isBlockedDemoMarketplaceProduct(row)).map((row) => {
      const vendorSlug = String(row.vendor_slug ?? "");
      const id = Number(row.id ?? 0);
      const price = Number.parseFloat(String(row.price ?? "0").replace(",", "."));
      const sale = row.sale_price != null && row.sale_price !== ""
        ? Number.parseFloat(String(row.sale_price).replace(",", "."))
        : null;
      const normalizedPrice = Number.isFinite(price) ? price : 0;
      const normalizedSale = Number.isFinite(Number(sale)) ? sale : null;
      return {
        id,
        name: String(row.name ?? ""),
        description: row.description ? String(row.description) : null,
        price: normalizedPrice,
        salePrice: normalizedSale,
        discountPercent: discountPercentFor(normalizedPrice, normalizedSale),
        imageUrl: row.image_url ? String(row.image_url) : null,
        isPopular: Boolean(row.is_popular),
        stock: row.stock != null ? Number(row.stock) : null,
        categoryId: row.ecommerce_category_id != null ? Number(row.ecommerce_category_id) : null,
        categoryName: normalizeMarketplaceCategoryName(row.ecommerce_category_name ?? row.menu_category_name ?? (lang === "en" ? "Products" : "Ürünler"), row.vendor_name),
        categorySlug: String(row.ecommerce_category_slug ?? ""),
        vendorId: Number(row.vendor_id ?? 0),
        vendorName: String(row.vendor_name ?? ""),
        vendorSlug,
        vendorImageUrl: row.vendor_image_url ? String(row.vendor_image_url) : null,
        vendorCoverUrl: row.vendor_cover_url ? String(row.vendor_cover_url) : null,
        vendorRating: Number(row.vendor_rating ?? 0),
        vendorReviewCount: Number(row.vendor_review_count ?? 0),
        vendorCity: row.vendor_city ? String(row.vendor_city) : null,
        vendorDistrict: row.vendor_district ? String(row.vendor_district) : null,
        vendorIsOpen: row.vendor_is_open !== false,
        href: `/magaza/urun/${id}-${slugifyTr(String(row.name ?? ""))}`,
        storefrontHref: marketplaceVendorHref(vendorSlug),
        yekpareStoreHref: `/alisveris/magaza/${encodeURIComponent(vendorSlug)}`,
      };
    });

    type MarketplaceCategoryPayload = {
      id: number;
      name: string;
      slug: string;
      children: MarketplaceCategoryPayload[];
    };
    const normalizeCategoryTree = (
      nodes: Awaited<ReturnType<typeof getEcommerceCategoryTree>>,
    ): MarketplaceCategoryPayload[] =>
      nodes.map((node) => ({
        id: node.id,
        name: normalizeMarketplaceCategoryName(node.name),
        slug: node.slug,
        children: normalizeCategoryTree(node.children),
      }));
    const categories = normalizeCategoryTree(await getEcommerceCategoryTree());
    const discountProducts = products.filter((p) => p.discountPercent > 0);
    const dailyDeals = (randomize ? shuffled(discountProducts.filter((p) => p.discountPercent < 50)) : discountProducts.filter((p) => p.discountPercent < 50)).slice(0, 16);
    const highDiscountProducts = (randomize ? shuffled(discountProducts.filter((p) => p.discountPercent >= 50)) : discountProducts.filter((p) => p.discountPercent >= 50)).slice(0, 16);
    const featuredProducts = products.filter((p) => p.isPopular).slice(0, 12);
    const bestSelling = products.slice(0, 16);
    const topSelling = products.slice(0, 25);
    const newestPool = [...products].sort((a, b) => b.id - a.id).slice(0, 48);
    const newest = (randomize ? shuffled(newestPool) : newestPool).slice(0, 16);
    const campaignQueryWhere = q
      ? sql`AND (
          cc.code ILIKE ${`%${q}%`}
          OR v.name ILIKE ${`%${q}%`}
          OR v.description ILIKE ${`%${q}%`}
        )`
      : sql``;
    const campaignRows = execRows<Record<string, unknown>>(await db.execute(sql`
      SELECT
        cc.id,
        cc.code,
        cc.discount_type,
        cc.discount_value,
        cc.min_order_amount,
        cc.expires_at,
        v.id AS vendor_id,
        v.name AS vendor_name,
        v.slug AS vendor_slug,
        v.image_url AS vendor_image_url,
        v.cover_url AS vendor_cover_url
      FROM coupon_codes cc
      JOIN vendors v ON v.id = cc.vendor_id
      WHERE cc.active = true
        AND v.active = true
        AND v.vendor_type = 'ecommerce'
        AND (cc.expires_at IS NULL OR cc.expires_at > NOW())
        AND (cc.max_uses IS NULL OR cc.used_count < cc.max_uses)
        ${campaignQueryWhere}
      ORDER BY cc.created_at DESC, cc.id DESC
      LIMIT 12
    `)).map((row) => {
      const vendorSlug = String(row.vendor_slug ?? "");
      const discountValue = Number.parseFloat(String(row.discount_value ?? "0").replace(",", "."));
      const minOrderAmount = row.min_order_amount != null && row.min_order_amount !== ""
        ? Number.parseFloat(String(row.min_order_amount).replace(",", "."))
        : null;
      const discountType = String(row.discount_type ?? "percent");
      const discountText = discountType === "percent"
        ? `%${Number.isFinite(discountValue) ? discountValue : 0} indirim`
        : `${Number.isFinite(discountValue) ? discountValue.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }) : "₺0"} indirim`;
      return {
        id: Number(row.id ?? 0),
        code: String(row.code ?? ""),
        title: discountText,
        description: minOrderAmount && Number.isFinite(minOrderAmount)
          ? `${minOrderAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })} ve üzeri alışverişlerde geçerli`
          : "Seçili mağaza alışverişlerinde geçerli kampanya",
        discountType,
        discountValue: Number.isFinite(discountValue) ? discountValue : 0,
        minOrderAmount: minOrderAmount && Number.isFinite(minOrderAmount) ? minOrderAmount : null,
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        vendorId: Number(row.vendor_id ?? 0),
        vendorName: String(row.vendor_name ?? ""),
        vendorSlug,
        vendorImageUrl: row.vendor_image_url ? String(row.vendor_image_url) : null,
        vendorCoverUrl: row.vendor_cover_url ? String(row.vendor_cover_url) : null,
        storefrontHref: marketplaceVendorHref(vendorSlug),
      };
    });

    const homeExtras = buildMarketplaceHomeExtras({
      vendors: vendors.map((v) => ({
        id: Number(v.id ?? 0),
        name: String(v.name ?? ""),
        slug: String(v.slug ?? ""),
        imageUrl: v.imageUrl ? String(v.imageUrl) : null,
        storefrontHref: v.storefrontHref ? String(v.storefrontHref) : undefined,
      })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        categoryName: p.categoryName,
        href: p.href,
        imageUrl: p.imageUrl,
      })),
      lang,
    });

    res.json({
      success: true,
      lang,
      data: {
        vendors,
        categories,
        products,
        featuredProducts,
        dailyDeals,
        highDiscountProducts,
        bestSelling,
        topSelling,
        newest,
        campaigns: campaignRows,
        heroBanners: homeExtras.heroBanners,
        promoBanners: homeExtras.promoBanners,
        bottomPromoBanners: homeExtras.bottomPromoBanners,
        brands: homeExtras.brands,
        blogPosts: homeExtras.blogPosts,
        pagination: {
          limit,
          offset,
          total: totalProducts,
          hasMore: offset + limit < totalProducts,
        },
        stats: {
          vendorCount: vendors.length,
          productCount: totalProducts,
          categoryCount: categories.length,
          campaignCount: campaignRows.length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** Pazaryeri sepet özeti — satıcı grupları ve kargo tahmini */
router.post("/delivery/marketplace/cart/preview", async (req, res): Promise<void> => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const data = await previewMarketplaceCheckout(items);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** Çok satıcılı pazaryeri checkout — her mağaza için ayrı delivery_orders kaydı */
router.post("/delivery/marketplace/checkout", async (req, res): Promise<void> => {
  await ensureVendorRevenueColumns();
  await ensureDeliveryCustomerEmailColumn();
  await ensureDeliveryLegalAcceptanceColumns();
  try {
    const body = req.body as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items : [];
    const result = await placeMarketplaceCheckout(items, {
      customerName: String(body.customerName ?? ""),
      customerPhone: String(body.customerPhone ?? ""),
      customerEmail: body.customerEmail != null ? String(body.customerEmail) : undefined,
      customerAddress: String(body.customerAddress ?? body.deliveryAddress ?? ""),
      customerCity: body.customerCity != null ? String(body.customerCity) : undefined,
      customerDistrict: body.customerDistrict != null ? String(body.customerDistrict) : undefined,
      customerPostalCode:
        body.customerPostalCode != null
          ? String(body.customerPostalCode)
          : body.customer_postal_code != null
            ? String(body.customer_postal_code)
            : undefined,
      paymentMethod: body.paymentMethod != null ? String(body.paymentMethod) : "cash",
      notes: body.notes != null ? String(body.notes) : undefined,
      legalDistanceSalesAccepted: Boolean(body.legalDistanceSalesAccepted ?? body.legal_distance_sales_accepted),
      legalPreinfoAccepted: Boolean(body.legalPreinfoAccepted ?? body.legal_preinfo_accepted),
    });
    if (!result.ok) {
      res.status(result.statusCode).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, data: { orders: result.orders, preview: result.preview } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/delivery/marketplace/products/:slugOrId", async (req, res): Promise<void> => {
  try {
    const raw = String(req.params.slugOrId ?? "").trim();
    const idMatch = raw.match(/^\d+/) || raw.match(/-(\d+)(?:-|$)/);
    const id = idMatch ? Number(idMatch[1] ?? idMatch[0]) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, error: "Geçersiz ürün" });
      return;
    }

    const [row] = execRows<Record<string, unknown>>(await db.execute(sql`
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.sale_price,
        mi.image_url,
        mi.is_popular,
        mi.stock,
        mi.ecommerce_category_id,
        mc.id AS menu_category_id,
        mc.name AS menu_category_name,
        ec.name AS ecommerce_category_name,
        ec.slug AS ecommerce_category_slug,
        v.id AS vendor_id,
        v.name AS vendor_name,
        v.slug AS vendor_slug,
        v.description AS vendor_description,
        v.image_url AS vendor_image_url,
        v.cover_url AS vendor_cover_url,
        v.rating AS vendor_rating,
        v.review_count AS vendor_review_count,
        v.city AS vendor_city,
        v.district AS vendor_district,
        v.phone AS vendor_phone,
        v.whatsapp AS vendor_whatsapp,
        v.is_open AS vendor_is_open
      FROM vendor_menu_items mi
      JOIN vendors v ON v.id = mi.vendor_id
      LEFT JOIN vendor_menu_categories mc ON mc.id = mi.menu_category_id
      LEFT JOIN ecommerce_product_categories ec ON ec.id = mi.ecommerce_category_id
      WHERE mi.id = ${id}
        AND mi.active = true
        AND v.active = true
        AND v.vendor_type = 'ecommerce'
      LIMIT 1
    `));

    if (!row) {
      res.status(404).json({ success: false, error: "Ürün bulunamadı" });
      return;
    }
    if (isBlockedDemoMarketplaceProduct(row)) {
      res.status(404).json({ success: false, error: "Ürün bulunamadı" });
      return;
    }

    const vendorSlug = String(row.vendor_slug ?? "");
    const productId = Number(row.id ?? 0);
    const price = Number.parseFloat(String(row.price ?? "0").replace(",", "."));
    const sale = row.sale_price != null && row.sale_price !== ""
      ? Number.parseFloat(String(row.sale_price).replace(",", "."))
      : null;
    const productName = String(row.name ?? "");
    const categoryLabel = normalizeMarketplaceCategoryName(row.ecommerce_category_name ?? row.menu_category_name ?? "Ürünler", row.vendor_name);
    const isBeauty = /kozmetik|bakım|güzellik|cilt|şampuan/i.test(`${categoryLabel} ${productName}`);
    const imageList = row.image_url ? [String(row.image_url)] : [];
    const vendorRating = Number(row.vendor_rating ?? 4.6);
    const vendorReviews = Number(row.vendor_review_count ?? 12);
    const product = {
      id: productId,
      name: productName,
      slug: `${productId}-${slugifyTr(productName)}`,
      description: row.description ? String(row.description) : null,
      shortDescription: row.description ? String(row.description).split(/\n+/)[0]?.slice(0, 180) ?? null : null,
      price: Number.isFinite(price) ? price : 0,
      salePrice: Number.isFinite(Number(sale)) ? sale : null,
      imageUrl: row.image_url ? String(row.image_url) : null,
      images: imageList,
      isPopular: Boolean(row.is_popular),
      stock: row.stock != null ? Number(row.stock) : 99,
      sku: `YK-${productId}`,
      categoryId: row.ecommerce_category_id != null ? Number(row.ecommerce_category_id) : null,
      categoryName: categoryLabel,
      categorySlug: String(row.ecommerce_category_slug ?? ""),
      averageRating: vendorRating,
      numReviews: vendorReviews,
      colors: isBeauty
        ? [
            { name: "Doğal", value: "#F5E6D3" },
            { name: "Beyaz", value: "#FFFFFF" },
            { name: "Yeşil", value: "#0f766e" },
          ]
        : undefined,
      sizes: /beden|giyim|ayakkabı/i.test(categoryLabel)
        ? [{ name: "S" }, { name: "M" }, { name: "L" }, { name: "XL" }]
        : undefined,
      reviews: [
        {
          id: `${productId}-r1`,
          rating: 5,
          comment: "Ürün beklentilerimi karşıladı, hızlı kargo.",
          userName: "Ayşe K.",
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
        {
          id: `${productId}-r2`,
          rating: 4,
          comment: "Kaliteli paketleme ve uygun fiyat.",
          userName: "Mehmet T.",
          createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
        },
      ],
      href: `/magaza/urun/${productId}-${slugifyTr(productName)}`,
      storefrontHref: marketplaceVendorHref(vendorSlug),
      vendor: {
        id: Number(row.vendor_id ?? 0),
        name: String(row.vendor_name ?? ""),
        slug: vendorSlug,
        description: row.vendor_description ? String(row.vendor_description) : null,
        imageUrl: row.vendor_image_url ? String(row.vendor_image_url) : null,
        coverUrl: row.vendor_cover_url ? String(row.vendor_cover_url) : null,
        rating: Number(row.vendor_rating ?? 0),
        reviewCount: Number(row.vendor_review_count ?? 0),
        city: row.vendor_city ? String(row.vendor_city) : null,
        district: row.vendor_district ? String(row.vendor_district) : null,
        phone: row.vendor_phone ? String(row.vendor_phone) : null,
        whatsapp: row.vendor_whatsapp ? String(row.vendor_whatsapp) : null,
        isOpen: row.vendor_is_open !== false,
        storefrontHref: marketplaceVendorHref(vendorSlug),
      },
    };

    const related = execRows<Record<string, unknown>>(await db.execute(sql`
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.sale_price,
        mi.image_url,
        mi.is_popular,
        mi.stock,
        ec.name AS ecommerce_category_name,
        ec.slug AS ecommerce_category_slug,
        v.name AS vendor_name,
        v.slug AS vendor_slug
      FROM vendor_menu_items mi
      JOIN vendors v ON v.id = mi.vendor_id
      LEFT JOIN ecommerce_product_categories ec ON ec.id = mi.ecommerce_category_id
      WHERE mi.active = true
        AND v.active = true
        AND v.vendor_type = 'ecommerce'
        AND mi.id <> ${productId}
        AND (
          (${product.categoryId}::int IS NOT NULL AND mi.ecommerce_category_id = ${product.categoryId})
          OR v.id = ${product.vendor.id}
        )
      ORDER BY mi.is_popular DESC, mi.updated_at DESC NULLS LAST, mi.id DESC
      LIMIT 8
    `)).filter((rp) => !isBlockedDemoMarketplaceProduct(rp)).map((rp) => {
      const rpId = Number(rp.id ?? 0);
      const rpPrice = Number.parseFloat(String(rp.price ?? "0").replace(",", "."));
      const rpSale = rp.sale_price != null && rp.sale_price !== ""
        ? Number.parseFloat(String(rp.sale_price).replace(",", "."))
        : null;
      const rpVendorSlug = String(rp.vendor_slug ?? "");
      return {
        id: rpId,
        name: String(rp.name ?? ""),
        slug: `${rpId}-${slugifyTr(String(rp.name ?? ""))}`,
        price: Number.isFinite(rpPrice) ? rpPrice : 0,
        salePrice: Number.isFinite(Number(rpSale)) ? rpSale : null,
        imageUrl: rp.image_url ? String(rp.image_url) : null,
        stock: rp.stock != null ? Number(rp.stock) : 99,
        categoryName: normalizeMarketplaceCategoryName(rp.ecommerce_category_name, rp.vendor_name),
        categorySlug: String(rp.ecommerce_category_slug ?? ""),
        vendorName: String(rp.vendor_name ?? ""),
        storefrontHref: marketplaceVendorHref(rpVendorSlug),
        href: `/magaza/urun/${rpId}-${slugifyTr(String(rp.name ?? ""))}`,
      };
    });

    res.json({ success: true, data: { product, related } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/delivery/marketplace/about", async (req, res): Promise<void> => {
  const lang = String(req.query.lang ?? "tr") === "en" ? "en" : "tr";
  res.json({
    success: true,
    data: {
      title: lang === "en" ? "About Yekpare Marketplace" : "Yekpare Pazaryeri hakkında",
      mission:
        lang === "en"
          ? "We connect local sellers in one trusted multivendor storefront."
          : "Yerel satıcıları tek çatı altında buluşturarak elektronik, moda, ev & yaşam ve market alışverişini kolaylaştırıyoruz.",
      vision:
        lang === "en"
          ? "To become Turkey's most trusted multivendor marketplace."
          : "Türkiye'nin en güvenilir çok satıcılı e-ticaret pazaryeri olmak.",
      stats: [
        { value: "500+", label: lang === "en" ? "Active sellers" : "Aktif satıcı" },
        { value: "10K+", label: lang === "en" ? "Products" : "Ürün çeşidi" },
        { value: "4.8", label: lang === "en" ? "Average rating" : "Ortalama puan" },
        { value: "81", label: lang === "en" ? "Cities" : "İl kapsamı" },
      ],
    },
  });
});

router.get("/delivery/vendors/featured", async (_req, res): Promise<void> => {
  const rows = await db.select().from(vendorsTable)
    .where(and(eq(vendorsTable.active, true), eq(vendorsTable.featured, true)))
    .orderBy(desc(vendorsTable.rating)).limit(12);
  const normalized = rows.map((row) =>
    normalizeMapImageFields({
      ...row,
      photoUrl: row.imageUrl,
      coverPhotoUrl: row.coverUrl,
    }),
  ).map((row) => ({
    ...row,
    imageUrl: row.photoUrl,
    coverUrl: row.coverPhotoUrl,
  }));
  res.json(await attachPublicStorefrontHrefs(normalized));
});

function execRows<T extends Record<string, unknown>>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const rw = (res as { rows?: T[] })?.rows;
  return Array.isArray(rw) ? rw : [];
}

/** Mağaza blogu: vitrin linki ve herkese açık liste */
router.get("/delivery/vendors/:slug/blog-meta", async (req, res): Promise<void> => {
  await ensureVendorBlogTables();
  await ensureVendorThemeColumns();
  const slug = String(req.params.slug || "").trim();
  const [v] = execRows<Record<string, unknown>>(await db.execute(sql`
    SELECT id, name, image_url, cover_url, theme_key, theme_config,
           vendor_type, provider_type, provider_subtype
    FROM vendors
    WHERE slug = ${slug} AND active = true
    LIMIT 1
  `));
  if (!v) {
    res.status(404).json({ error: "Mağaza yok" });
    return;
  }
  const vendorId = Number(v.id);
  const meta = execRows<{ enabled?: boolean }>(await db.execute(sql`SELECT enabled FROM vendor_blog_settings WHERE vendor_id = ${vendorId} LIMIT 1`));
  const enabled = Boolean(meta[0]?.enabled);
  const vendorPublic = attachThemeToPublicVendor({
    id: vendorId,
    name: v.name,
    imageUrl: v.image_url,
    coverUrl: v.cover_url,
    themeKey: v.theme_key,
    themeConfig: v.theme_config,
    vendorType: v.vendor_type,
    providerType: v.provider_type,
    providerSubtype: v.provider_subtype,
  });
  res.json({
    enabled,
    vendorName: String(v.name ?? ""),
    vendorSlug: slug,
    vendorLogo: v.image_url ?? null,
    vendorCover: v.cover_url ?? null,
    themeKey: vendorPublic.themeKey,
    themeConfig: vendorPublic.themeConfig,
  });
});

async function ensureVendorAnnouncementsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vendor_public_announcements (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      announcement_type TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      show_on_home BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `);
}

/** Mağaza vitrin: işletmenin aktif ilan / duyuruları (panelden eklenen) */
router.get("/delivery/vendors/:slug/announcements", async (req, res): Promise<void> => {
  await ensureVendorAnnouncementsTable();
  const slug = String(req.params.slug || "").trim();
  const [v] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(and(eq(vendorsTable.slug, slug), eq(vendorsTable.active, true)))
    .limit(1);
  if (!v) {
    res.json({ announcements: [] });
    return;
  }
  const rows = execRows<{ id: number; title: string; body: string; announcement_type?: string; published_at?: string }>(
    await db.execute(sql`
      SELECT id, title, body, announcement_type, published_at
      FROM vendor_public_announcements
      WHERE vendor_id = ${v.id}
        AND active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY sort_order ASC, published_at DESC
      LIMIT 50
    `),
  );
  res.json({ announcements: rows });
});

router.get("/delivery/vendors/:slug/blog/posts", async (req, res): Promise<void> => {
  await ensureVendorBlogTables();
  const slug = String(req.params.slug || "").trim();
  const [v] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(and(eq(vendorsTable.slug, slug), eq(vendorsTable.active, true)))
    .limit(1);
  if (!v) {
    res.status(404).json({ error: "Mağaza yok" });
    return;
  }
  const st = execRows<{ enabled?: boolean }>(await db.execute(sql`SELECT enabled FROM vendor_blog_settings WHERE vendor_id = ${v.id} LIMIT 1`));
  if (!st[0]?.enabled) {
    res.json({ posts: [] });
    return;
  }
  const rows = execRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT id, slug, title, excerpt, cover_image_url, published_at
      FROM vendor_blog_posts
      WHERE vendor_id = ${v.id} AND published = true
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT 80
    `),
  );
  res.json({ posts: rows });
});

router.get("/delivery/vendors/:slug/blog/posts/:postSlug", async (req, res): Promise<void> => {
  await ensureVendorBlogTables();
  const slug = String(req.params.slug || "").trim();
  const postSlug = String(req.params.postSlug || "").trim();
  const [v] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(and(eq(vendorsTable.slug, slug), eq(vendorsTable.active, true)))
    .limit(1);
  if (!v) {
    res.status(404).json({ error: "Mağaza yok" });
    return;
  }
  const st = execRows<{ enabled?: boolean }>(await db.execute(sql`SELECT enabled FROM vendor_blog_settings WHERE vendor_id = ${v.id} LIMIT 1`));
  if (!st[0]?.enabled) {
    res.status(404).json({ error: "Blog kapalı" });
    return;
  }
  const pr = execRows<Record<string, unknown>>(
    await db.execute(sql`
    SELECT id, slug, title, excerpt, cover_image_url, content_json, published_at
    FROM vendor_blog_posts
    WHERE vendor_id = ${v.id} AND slug = ${postSlug} AND published = true
    LIMIT 1
  `),
  );
  const post = pr[0];
  if (!post) {
    res.status(404).json({ error: "Yazı yok" });
    return;
  }
  const pid = Number(post.id);
  const cm = execRows<Record<string, unknown>>(
    await db.execute(sql`
    SELECT id, author_name, body, created_at
    FROM vendor_blog_comments
    WHERE post_id = ${pid} AND approved = true
    ORDER BY created_at ASC
    LIMIT 200
  `),
  );
  res.json({ post, comments: cm });
});

router.post("/delivery/vendors/:slug/blog/posts/:postSlug/comments", async (req, res): Promise<void> => {
  await ensureVendorBlogTables();
  const slug = String(req.params.slug || "").trim();
  const postSlug = String(req.params.postSlug || "").trim();
  const authorName = String((req.body as { authorName?: string })?.authorName ?? "").trim().slice(0, 80);
  const body = String((req.body as { body?: string })?.body ?? "").trim().slice(0, 2000);
  if (!authorName || !body) {
    res.status(400).json({ error: "İsim ve yorum zorunlu" });
    return;
  }
  const [v] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(and(eq(vendorsTable.slug, slug), eq(vendorsTable.active, true)))
    .limit(1);
  if (!v) {
    res.status(404).json({ error: "Mağaza yok" });
    return;
  }
  const st = execRows<{ enabled?: boolean }>(await db.execute(sql`SELECT enabled FROM vendor_blog_settings WHERE vendor_id = ${v.id} LIMIT 1`));
  if (!st[0]?.enabled) {
    res.status(403).json({ error: "Blog kapalı" });
    return;
  }
  const pr = execRows<{ id?: number }>(
    await db.execute(sql`
    SELECT id FROM vendor_blog_posts
    WHERE vendor_id = ${v.id} AND slug = ${postSlug} AND published = true
    LIMIT 1
  `),
  );
  const postId = pr[0]?.id;
  if (!postId) {
    res.status(404).json({ error: "Yazı yok" });
    return;
  }
  await db.execute(sql`
    INSERT INTO vendor_blog_comments (post_id, author_name, body, approved)
    VALUES (${postId}, ${authorName}, ${body}, true)
  `);
  res.status(201).json({ ok: true });
});

/** Masaya servis + panelde QR açık işletmeler için minimal menü (nav/footer yok sayfa) */
router.get("/delivery/public/qr-menu/:slug", async (req, res): Promise<void> => {
  await ensureVendorRevenueColumns();
  const slug = String(req.params.slug ?? "").trim();
  if (!slug) {
    res.status(404).json({ error: "Bulunamadı" });
    return;
  }
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(and(eq(vendorsTable.slug, slug), eq(vendorsTable.active, true)))
    .limit(1);
  if (!vendor) {
    res.status(404).json({ error: "Bulunamadı" });
    return;
  }
  const vt = String(vendor.vendorType ?? "").toLowerCase();
  const pt = String((vendor as { providerType?: string | null }).providerType ?? "").toLowerCase();
  const isRestaurant = vt === "delivery" || vt === "siparis" || pt === "siparis";
  if (!isRestaurant) {
    res.status(404).json({ error: "Bulunamadı" });
    return;
  }

  const vendorIdForQueries = vendor.id;
  const [svcRow] = (await db.execute<any>(sql`
    SELECT table_service_enabled, reservation_enabled, reservation_auto_confirm, table_sections, notes
    FROM vendors WHERE id = ${vendorIdForQueries}
  `)).rows ?? [];

  const tableServiceAllowed = canVendorUseTableService(vendor as unknown as Record<string, unknown>);
  if (!tableServiceAllowed || !svcRow?.table_service_enabled) {
    res.status(404).json({ error: "QR menü kullanılamıyor" });
    return;
  }
  const notesStr = String(svcRow.notes ?? "");
  const qrOn = /(?:^|\n)qr_menu_public\s*:\s*(1|on|true|yes)\b/i.test(notesStr);
  if (!qrOn) {
    res.status(404).json({ error: "QR menü kapalı" });
    return;
  }

  const vendorPublic = attachThemeToPublicVendor(publicVendorForMenu(vendor as unknown as Record<string, unknown>));
  await enrichVendorPublicOnlinePay(vendorPublic);

  const menuCats = await db
    .select()
    .from(vendorMenuCategoriesTable)
    .where(and(eq(vendorMenuCategoriesTable.vendorId, vendorIdForQueries), eq(vendorMenuCategoriesTable.active, true)))
    .orderBy(asc(vendorMenuCategoriesTable.position));

  const menuItems = await db
    .select()
    .from(vendorMenuItemsTable)
    .where(and(eq(vendorMenuItemsTable.vendorId, vendorIdForQueries), eq(vendorMenuItemsTable.active, true)))
    .orderBy(desc(vendorMenuItemsTable.isPopular));

  const serviceSettings = {
    tableServiceEnabled: tableServiceAllowed && Boolean(svcRow?.table_service_enabled),
    reservationEnabled: Boolean(svcRow?.reservation_enabled),
    reservationAutoConfirm: Boolean(svcRow?.reservation_auto_confirm),
    tableSections: tableServiceAllowed && svcRow?.table_sections ? JSON.parse(String(svcRow.table_sections)) : [],
  };

  const [mapBiz] = await db
    .select({ id: mapBusinessesTable.id })
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.slug, slug))
    .limit(1);

  res.json({ vendor: vendorPublic, menuCats, menuItems, serviceSettings, mapBusinessId: mapBiz?.id ?? null });
});

router.get("/delivery/vendors/:slug", async (req, res): Promise<void> => {
  await ensureVendorRevenueColumns();
  await ensureVendorThemeColumns();
  const [vendor] = await db.select().from(vendorsTable)
    .where(and(eq(vendorsTable.slug, req.params.slug), eq(vendorsTable.active, true)))
    .limit(1);
  if (!vendor) { res.status(404).json({ error: "Mağaza bulunamadı" }); return; }

  const vendorIdForQueries = vendor.id;
  const vendorSlugForMap = vendor.slug;
  const vendorPublic = attachThemeToPublicVendor(publicVendorForMenu(vendor as unknown as Record<string, unknown>));
  await enrichVendorPublicOnlinePay(vendorPublic);

  const menuCats = await db.select().from(vendorMenuCategoriesTable)
    .where(and(eq(vendorMenuCategoriesTable.vendorId, vendorIdForQueries), eq(vendorMenuCategoriesTable.active, true)))
    .orderBy(asc(vendorMenuCategoriesTable.position));

  const menuItems = (await db.select().from(vendorMenuItemsTable)
    .where(and(eq(vendorMenuItemsTable.vendorId, vendorIdForQueries), eq(vendorMenuItemsTable.active, true)))
    .orderBy(desc(vendorMenuItemsTable.isPopular)))
    .filter((item) => !isBlockedDemoMarketplaceProduct(item as unknown as Record<string, unknown>));

  const reviews = await db.select().from(vendorReviewsTable)
    .where(and(eq(vendorReviewsTable.vendorId, vendorIdForQueries), eq(vendorReviewsTable.active, true)))
    .orderBy(desc(vendorReviewsTable.createdAt)).limit(10);

  const [mapBiz] = await db.select({ id: mapBusinessesTable.id })
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.slug, vendorSlugForMap))
    .limit(1);

  // Service settings (may not exist yet on older rows)
  const [svcRow] = (await db.execute<any>(sql`
    SELECT table_service_enabled, reservation_enabled, reservation_auto_confirm, table_sections
    FROM vendors WHERE id = ${vendorIdForQueries}
  `)).rows ?? [];

  const tableServiceAllowed = canVendorUseTableService(vendor as unknown as Record<string, unknown>);
  const serviceSettings = {
    tableServiceEnabled: tableServiceAllowed && Boolean(svcRow?.table_service_enabled),
    reservationEnabled: Boolean(svcRow?.reservation_enabled),
    reservationAutoConfirm: Boolean(svcRow?.reservation_auto_confirm),
    tableSections: tableServiceAllowed && svcRow?.table_sections ? JSON.parse(svcRow.table_sections) : [],
  };

  const ecommerceCategoryTree = ["ecommerce", "alisveris"].includes(String(vendor.vendorType ?? "").toLowerCase())
    ? await getEcommerceCategoryTree().catch(() => [])
    : [];

  res.json({
    vendor: vendorPublic,
    menuCats,
    menuItems,
    reviews,
    mapBusinessId: mapBiz?.id ?? null,
    serviceSettings,
    ecommerceCategoryTree,
  });
});

/* Admin: görseli olmayan teslimat menü kalemlerine Magnific freemium foto önizleme URL’si ata */
router.post("/delivery/admin/fill-menu-images-magnific", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureVendorCatalogGapColumns();
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS magnific_api_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS magnific_webhook_secret TEXT`);

  const { vendorId, maxItems, delayMs } = req.body as {
    vendorId?: number;
    maxItems?: number;
    delayMs?: number;
  };
  const max = Math.min(Math.max(Number(maxItems) || 40, 1), 250);
  const delay = Math.min(Math.max(Number(delayMs) || 650, 250), 8000);

  const [settingsRow] = await db
    .select({ magnificApiKey: siteSettingsTable.magnificApiKey })
    .from(siteSettingsTable)
    .limit(1);
  const apiKey = String(process.env.MAGNIFIC_API_KEY || settingsRow?.magnificApiKey || "").trim();
  if (!apiKey) {
    res.status(400).json({
      error:
        "Magnific API anahtarı yok: Admin → Genel Ayarlar → Harita sekmesi (Magnific) veya sunucuda MAGNIFIC_API_KEY.",
    });
    return;
  }

  const conditions = [
    eq(vendorsTable.vendorType, "delivery"),
    eq(vendorMenuItemsTable.active, true),
    or(isNull(vendorMenuItemsTable.imageUrl), eq(vendorMenuItemsTable.imageUrl, "")),
  ];
  const vid = vendorId != null ? Number(vendorId) : NaN;
  if (Number.isFinite(vid) && vid > 0) {
    conditions.push(eq(vendorMenuItemsTable.vendorId, vid));
  }

  const rows = await db
    .select({
      id: vendorMenuItemsTable.id,
      name: vendorMenuItemsTable.name,
      vendorId: vendorMenuItemsTable.vendorId,
    })
    .from(vendorMenuItemsTable)
    .innerJoin(vendorsTable, eq(vendorMenuItemsTable.vendorId, vendorsTable.id))
    .where(and(...conditions))
    .limit(max);

  type RowResult = { id: number; ok: boolean; url?: string; error?: string };
  const results: RowResult[] = [];
  for (const row of rows) {
    try {
      const url = await firstMagnificPhotoPreview(apiKey, row.name);
      if (!url) {
        results.push({ id: row.id, ok: false, error: "Uygun freemium foto bulunamadı" });
      } else {
        await db
          .update(vendorMenuItemsTable)
          .set({ imageUrl: url, updatedAt: new Date() })
          .where(eq(vendorMenuItemsTable.id, row.id));
        results.push({ id: row.id, ok: true, url });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: row.id, ok: false, error: msg });
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  const failedRows = results.filter((r) => !r.ok);
  res.json({
    processed: rows.length,
    filled: results.filter((r) => r.ok).length,
    failed: failedRows.length,
    errorSamples: failedRows.slice(0, 8).map((r) => `id=${r.id}: ${r.error || "?"}`),
    results,
  });
});

/** goalgo/işletmeler/Yemeksepeti data/*.xlsx + (isteğe bağlı) aladdinyemek + restorandataları çapraz iletişim */
async function handleImportLocalYemeksepetiExcel(req: Request, res: Response): Promise<void> {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureVendorCatalogGapColumns();
  const body = req.body as {
    cities?: string[];
    maxRestaurants?: number;
    /** false değilse (varsayılan): menüsüz işletmeler de içe alınır (Aladdin’de olup YS’de menüsü olmayanlar). */
    includeWithoutMenu?: boolean;
  };
  const maxTotal = Math.min(Math.max(Number(body.maxRestaurants) || 80, 1), 500);
  const includeWithoutMenu = body.includeWithoutMenu !== false;

  const root = resolveIsletmelerRoot();
  if (!root) {
    res.status(400).json({
      error:
        "işletmeler klasörü bulunamadı. Sunucuda goalgo/işletmeler veya ISLETME_DATA_DIR ortam değişkeni tanımlayın; ya da panelden “Excel yükle” ile .xlsx gönderin.",
    });
    return;
  }
  const ysDir = path.join(root, "Yemeksepeti data");
  if (!fs.existsSync(ysDir)) {
    res.status(400).json({ error: `Yemeksepeti data klasörü yok: ${ysDir}` });
    return;
  }
  const aladdinPath = path.join(root, "aladdinyemek.xlsx");
  let idx = emptyContactIndex();
  if (fs.existsSync(aladdinPath)) {
    idx = buildAladdinContactIndex(fs.readFileSync(aladdinPath));
  }
  idx.extraBySlug = enrichContactsFromRestoranKlasoru(root);

  let files = fs.readdirSync(ysDir).filter((f) => f.toLowerCase().endsWith(".xlsx"));
  files.sort((a, b) => a.localeCompare(b, "tr"));
  if (body.cities?.length) {
    const want = new Set(body.cities.map((c) => c.replace(/\.xlsx$/i, "").trim().toLowerCase()));
    files = files.filter((f) => want.has(f.replace(/\.xlsx$/i, "").toLowerCase()));
  }

  let importedCount = 0;
  let skippedDuplicate = 0;
  let skippedNoMenu = 0;
  const errors: string[] = [];
  let remaining = maxTotal;

  for (const file of files) {
    if (remaining <= 0) break;
    let buf: Buffer;
    try {
      buf = fs.readFileSync(path.join(ysDir, file));
    } catch (e: unknown) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    let parsed: LocalImportParsed[];
    try {
      parsed = parseYemeksepetiCityWorkbook(buf, file, idx);
    } catch (e: unknown) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const r = await importLocalYemeksepetiParsedRows(parsed, { maxTotal: remaining, includeWithoutMenu }, errors, file);
    importedCount += r.importedCount;
    skippedDuplicate += r.skippedDuplicate;
    skippedNoMenu += r.skippedNoMenu;
    remaining = r.remaining;
  }

  res.json({
    ok: true,
    importedCount,
    skippedDuplicate,
    skippedNoMenu,
    remainingQuota: remaining,
    cityFilesConsidered: files.length,
    dataRoot: root,
    aladdinMerged: fs.existsSync(aladdinPath),
    includeWithoutMenu,
    errors: errors.slice(0, 40),
  });
}

router.post("/delivery/import-local-yemeksepeti-excel", (req, res) => void handleImportLocalYemeksepetiExcel(req, res));
router.post("/delivery/admin/import-local-yemeksepeti-excel", (req, res) => void handleImportLocalYemeksepetiExcel(req, res));

/** Tek şehir .xlsx + isteğe bağlı aladdinyemek .xlsx — sunucu klasörü şart değil (admin). */
router.post(
  "/delivery/admin/import-yemeksepeti-excel-upload",
  requireAdminMaintenanceBeforeMultipart,
  yemeksepetiExcelMemoryUpload.fields([
    { name: "cityWorkbook", maxCount: 1 },
    { name: "aladdinWorkbook", maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureVendorCatalogGapColumns();
      const bag = req.files as Record<string, MulterMemoryFile[]> | undefined;
      const cityF = bag?.cityWorkbook?.[0];
      if (!cityF?.buffer?.length) {
        res.status(400).json({ error: "cityWorkbook alanında .xlsx dosyası gerekli (multipart field adı: cityWorkbook)." });
        return;
      }
      const rawBody = req.body as Record<string, string | undefined>;
      const maxTotal = Math.min(Math.max(Number(rawBody.maxRestaurants) || 80, 1), 500);
      const includeWithoutMenu = rawBody.includeWithoutMenu !== "false" && rawBody.includeWithoutMenu !== "0";
      const cityName = String(rawBody.cityFilename || cityF.originalname || "import.xlsx").slice(0, 200);

      let idx = emptyContactIndex();
      const ala = bag?.aladdinWorkbook?.[0];
      if (ala?.buffer?.length) {
        idx = buildAladdinContactIndex(ala.buffer);
      }
      const root = resolveIsletmelerRoot();
      if (root) {
        idx.extraBySlug = enrichContactsFromRestoranKlasoru(root);
      }

      let parsed: LocalImportParsed[];
      try {
        parsed = parseYemeksepetiCityWorkbook(cityF.buffer, cityName, idx);
      } catch (e: unknown) {
        res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
        return;
      }

      const errors: string[] = [];
      const r = await importLocalYemeksepetiParsedRows(parsed, { maxTotal, includeWithoutMenu }, errors, cityName);
      res.json({
        ok: true,
        mode: "multipart_upload",
        ...r,
        remainingQuota: r.remaining,
        parsedRows: parsed.length,
        serverDataRoot: root ?? null,
        aladdinWorkbookAttached: Boolean(ala?.buffer?.length),
        includeWithoutMenu,
        errors: errors.slice(0, 40),
      });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  },
);

/** Yalnız Aladdin / rehber .xlsx — menü boş, YS’de olmayan işletmeler. */
router.post(
  "/delivery/admin/import-aladdin-excel-upload",
  requireAdminMaintenanceBeforeMultipart,
  yemeksepetiExcelMemoryUpload.single("aladdinWorkbook"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureVendorCatalogGapColumns();
      const f = req.file;
      if (!f?.buffer?.length) {
        res.status(400).json({ error: "aladdinWorkbook alanında .xlsx gerekli." });
        return;
      }
      const rawBody = req.body as Record<string, string | undefined>;
      const maxTotal = Math.min(Math.max(Number(rawBody.maxRestaurants) || 200, 1), 2000);
      const rows = parseAladdinWorkbookAsStandaloneVendors(f.buffer);
      let importedCount = 0;
      let skippedDuplicate = 0;
      const errors: string[] = [];
      let remaining = maxTotal;
      for (const imported of rows) {
        if (remaining <= 0) break;
        const dup = await findPossibleDuplicateVendor(imported);
        if (dup) {
          skippedDuplicate++;
          continue;
        }
        try {
          const created = await createVendorFromImportedData(imported, {
            categoryName: inferCategoryName(imported),
            forceDraft: false,
          });
          if (created.duplicateVendor) {
            skippedDuplicate++;
            continue;
          }
          const hasContact = Boolean(imported.phone || imported.email);
          await db
            .update(vendorsTable)
            .set({
              catalogMenuGap: true,
              catalogContactGap: !hasContact,
              updatedAt: new Date(),
            })
            .where(eq(vendorsTable.id, created.vendorId));
          importedCount++;
          remaining--;
        } catch (e: unknown) {
          errors.push(`${String(imported.name || "").slice(0, 48)}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      res.json({
        ok: true,
        mode: "aladdin_only_upload",
        importedCount,
        skippedDuplicate,
        remainingQuota: remaining,
        sourceRows: rows.length,
        errors: errors.slice(0, 40),
      });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  },
);

/* Admin: tüm vendor'lar (inactive dahil) */
router.post("/delivery/admin/import-google-place-vendor", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureVendorCatalogGapColumns();
  try {
    await ensureMapVendorGoogleColumns();
    const body = req.body as Record<string, unknown>;
    const vendorType = String(body.vendorType || "delivery").toLowerCase() as PortalVendorType;
    const allowed: PortalVendorType[] = ["delivery", "ecommerce", "turizm", "ulasim"];
    if (!allowed.includes(vendorType)) {
      res.status(400).json({ error: "Geçersiz vendorType" });
      return;
    }
    const r = await importGooglePlaceAsVendor({
      placeId: body.placeId != null ? String(body.placeId) : undefined,
      query: body.query != null ? String(body.query) : undefined,
      lat: body.lat != null ? Number(body.lat) : undefined,
      lng: body.lng != null ? Number(body.lng) : undefined,
      vendorType,
      tourismSubtype: body.tourismSubtype != null ? String(body.tourismSubtype) : undefined,
    });
    res.json({ ok: true, ...r });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Toplu Google Place → vendor (satır başına placeId veya arama metni). */
router.post("/delivery/admin/import-google-place-vendor-bulk", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureVendorCatalogGapColumns();
  try {
    await ensureMapVendorGoogleColumns();
    const body = req.body as Record<string, unknown>;
    const vendorType = String(body.vendorType || "delivery").toLowerCase() as PortalVendorType;
    const allowed: PortalVendorType[] = ["delivery", "ecommerce", "turizm", "ulasim"];
    if (!allowed.includes(vendorType)) {
      res.status(400).json({ error: "Geçersiz vendorType" });
      return;
    }
    const tourismSubtype = body.tourismSubtype != null ? String(body.tourismSubtype) : undefined;
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const cap = Math.min(Math.max(Number(body.max) || 15, 1), 40);
    const lat0 = body.lat != null ? Number(body.lat) : undefined;
    const lng0 = body.lng != null ? Number(body.lng) : undefined;
    const results: Array<{
      line: string;
      ok: boolean;
      vendorId?: number;
      createdVendor?: boolean;
      error?: string;
    }> = [];

    let n = 0;
    for (const raw of rawItems) {
      if (n >= cap) break;
      const it = raw as Record<string, unknown>;
      const placeId = it.placeId != null ? String(it.placeId).trim() : "";
      const query = it.query != null ? String(it.query).trim() : "";
      const line = placeId || query;
      if (!line) continue;
      n++;
      try {
        const r = await importGooglePlaceAsVendor({
          placeId: placeId || undefined,
          query: query || undefined,
          lat: Number.isFinite(lat0) ? lat0 : it.lat != null ? Number(it.lat) : undefined,
          lng: Number.isFinite(lng0) ? lng0 : it.lng != null ? Number(it.lng) : undefined,
          vendorType,
          tourismSubtype,
        });
        results.push({ line: line.slice(0, 200), ok: true, vendorId: r.vendorId, createdVendor: r.createdVendor });
      } catch (e: unknown) {
        results.push({
          line: line.slice(0, 200),
          ok: false,
          error: (e instanceof Error ? e.message : String(e)).slice(0, 400),
        });
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    res.json({
      ok: true,
      processed: results.length,
      succeeded: results.filter((x) => x.ok).length,
      failed: results.filter((x) => !x.ok).length,
      results,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

router.post("/delivery/admin/promote-map-to-vendors", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  try {
    await ensureMapVendorGoogleColumns();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const raw = body.limit;
    const limit = Number.isFinite(Number(raw)) ? Number(raw) : 80;
    const ov = body.onlyVendorTypes;
    const onlyVendorTypes = Array.isArray(ov)
      ? (ov.filter((x): x is PortalVendorType =>
          ["delivery", "ecommerce", "turizm", "ulasim"].includes(String(x)),
        ) as PortalVendorType[])
      : undefined;
    const mid = body.mapBusinessIds ?? body.map_business_ids;
    const mapBusinessIds = Array.isArray(mid)
      ? mid.map((x) => String(x || "").trim()).filter(Boolean)
      : undefined;
    const fv = body.forceVendorType ?? body.force_vendor_type;
    const forceVendorType =
      fv != null && ["delivery", "ecommerce", "turizm", "ulasim"].includes(String(fv))
        ? (String(fv) as PortalVendorType)
        : undefined;
    const ts = body.tourismSubtype ?? body.tourism_subtype;
    const tourismSubtype = ts != null && String(ts).trim() ? String(ts).trim().toLowerCase() : undefined;
    const r = await promoteUnlinkedMapBusinesses({
      limit,
      onlyVendorTypes,
      mapBusinessIds,
      forceVendorType,
      tourismSubtype: tourismSubtype ?? null,
    });
    res.json({ ok: true, ...r });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Excel → JSON çıktısından teslimat işletmeleri toplu içe aktarma (admin). */
router.post("/delivery/admin/vendors-import-json", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  try {
    await ensureVendorCatalogGapColumns();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const items = body.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items bir dizi olmalıdır" });
      return;
    }
    const syncMap = body.syncMap !== false;
    const r = await importDeliveryVendorsFromJson(items as unknown[], { syncMap });
    res.json({ ok: true, ...r });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/delivery/vendors-admin", async (req, res): Promise<void> => {
  await ensureVendorCatalogGapColumns();
  await ensureVendorMembershipTierColumn();
  await ensureMapVendorGoogleColumns();
  const { type, search } = req.query as Record<string, string>;
  let conditions: any[] = [];
  if (type) conditions.push(eq(vendorsTable.vendorType, type));
  if (search) {
    conditions.push(or(
      ilike(vendorsTable.name, `%${search}%`),
      ilike(vendorsTable.city, `%${search}%`),
      ilike(vendorsTable.district, `%${search}%`),
      ilike(vendorsTable.address, `%${search}%`),
    ));
  }
  const rows = await db.select().from(vendorsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(vendorsTable.createdAt))
    .limit(200);
  res.json(rows.map(vendorRowForAdminJson));
});

router.post("/delivery/import/external", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const {
    sourceUrl,
    categoryName,
    city,
    district,
    neighborhood,
    lat,
    lng,
    forceDraft,
  } = req.body as {
    sourceUrl?: string;
    categoryName?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    lat?: number;
    lng?: number;
    forceDraft?: boolean;
  };
  if (!sourceUrl?.trim()) { res.status(400).json({ error: "sourceUrl zorunlu" }); return; }
  try {
    const imported = await importVendorFromExternalUrl(sourceUrl.trim());
    if (!imported.isOpen && imported.platform !== "google-maps") {
      res.status(200).json({ success: false, skipped: true, reason: "pasif_firma", message: "Pasif/kapalı firma içe alınmadı." });
      return;
    }
    if (city && imported.city && normLoc(imported.city) !== normLoc(city)) {
      res.status(200).json({ success: false, skipped: true, reason: "city_mismatch", message: "Seçilen şehir ile işletme şehri uyuşmuyor." });
      return;
    }
    if (district && imported.district && normLoc(imported.district) !== normLoc(district)) {
      res.status(200).json({ success: false, skipped: true, reason: "district_mismatch", message: "Seçilen ilçe ile işletme ilçesi uyuşmuyor." });
      return;
    }
    if (neighborhood && !normLoc(imported.neighborhood || imported.address || "").includes(normLoc(neighborhood))) {
      res.status(200).json({ success: false, skipped: true, reason: "neighborhood_mismatch", message: "Seçilen mahalle ile işletme mahallesi uyuşmuyor." });
      return;
    }
    const created = await createVendorFromImportedData(imported, {
      categoryName,
      forceDraft: Boolean(forceDraft),
      forcedLat: Number.isFinite(Number(lat)) ? Number(lat) : null,
      forcedLng: Number.isFinite(Number(lng)) ? Number(lng) : null,
    });
    const existingLink = created.duplicateVendor?.slug ? `/siparis/satici/${created.duplicateVendor.slug}` : null;
    res.json({
      success: true,
      vendorId: created.vendorId,
      duplicateDetected: Boolean(created.duplicateVendor),
      duplicateVendor: created.duplicateVendor ?? null,
      duplicatePublicLink: existingLink,
      menuStats: created.menuStats,
      importedMeta: {
        platform: imported.platform,
        isOpen: imported.isOpen,
        itemCount: imported.menu.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "İçe aktarma başarısız" });
  }
});

router.post("/delivery/import/jobs", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const {
    platform = "all",
    city = "",
    district = "",
    neighborhood = "",
    lat = null,
    lng = null,
    categoryName = "",
    urlTemplate,
    maxPages = 1,
    maxRetries = 2,
    forceDraft = false,
  } = req.body as {
    platform?: ExternalPlatform | "all";
    city?: string;
    district?: string;
    neighborhood?: string;
    lat?: number | null;
    lng?: number | null;
    categoryName?: string;
    urlTemplate?: string;
    maxPages?: number;
    maxRetries?: number;
    forceDraft?: boolean;
  };
  if (!urlTemplate?.trim()) { res.status(400).json({ error: "urlTemplate zorunlu ({{city}}, {{district}}, {{neighborhood}}, {{page}} desteklenir)" }); return; }
  const pages = Math.max(1, Math.min(30, Number(maxPages) || 1));
  const retries = Math.max(0, Math.min(5, Number(maxRetries) || 2));
  const id = newJobId();
  const queue: ImportTask[] = [];
  for (let p = 1; p <= pages; p++) {
    queue.push({
      type: "list",
      url: fillTemplate(urlTemplate.trim(), { city, district, neighborhood, page: p }),
      page: p,
      retries: 0,
    });
  }
  const job: ImportJob = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "queued",
    platform,
    city: city || undefined,
    district: district || undefined,
    neighborhood: neighborhood || undefined,
    lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
    categoryName: categoryName || undefined,
    urlTemplate: urlTemplate.trim(),
    maxPages: pages,
    maxRetries: retries,
    forceDraft: Boolean(forceDraft),
    queue,
    processed: 0,
    imported: 0,
    skippedClosed: 0,
    skippedMismatch: 0,
    duplicateDrafted: 0,
    failed: 0,
    errors: [],
  };
  importJobs.set(id, job);
  /** İlk görevi beklemeden işle (aksi halde 1,5 sn gecikme) */
  void processImportJob(job);
  res.status(201).json({ success: true, jobId: id, status: job.status });
});

router.get("/delivery/import/jobs", async (_req, res): Promise<void> => {
  const jobs = [...importJobs.values()]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((j) => ({
      id: j.id,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      status: j.status,
      platform: j.platform,
      city: j.city,
      district: j.district,
      neighborhood: j.neighborhood,
      categoryName: j.categoryName,
      maxPages: j.maxPages,
      maxRetries: j.maxRetries,
      queueRemaining: j.queue.length,
      processed: j.processed,
      imported: j.imported,
      skippedClosed: j.skippedClosed,
      skippedMismatch: j.skippedMismatch,
      duplicateDrafted: j.duplicateDrafted,
      failed: j.failed,
      latestError: j.errors[j.errors.length - 1] ?? null,
    }));
  res.json(jobs.slice(0, 50));
});

router.get("/delivery/import/jobs/:id", async (req, res): Promise<void> => {
  const job = importJobs.get(req.params.id);
  if (!job) { res.status(404).json({ error: "Job bulunamadı" }); return; }
  res.json(job);
});

router.post("/delivery/import/jobs/:id/cancel", async (req, res): Promise<void> => {
  const job = importJobs.get(req.params.id);
  if (!job) { res.status(404).json({ error: "Job bulunamadı" }); return; }
  job.status = "cancelled";
  job.queue = [];
  job.updatedAt = new Date().toISOString();
  res.json({ success: true, id: job.id, status: job.status });
});

router.post("/delivery/admin/seed-demo-transport", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  if (!isDemoSeedAllowed()) {
    res.status(403).json({ ok: false, error: "Demo seed production ortamında kapalı (ENABLE_DEMO_SEED=1 gerekir)." });
    return;
  }
  await ensureVendorMembershipTierColumn();
  await ensureVendorCatalogGapColumns();
  const demoSlug = "yekpare-demo-ulasim";
  const demoEmail = "demo-isletme@yekpare.local";
  const demoPw = transportDemoVendorPassword();
  const courierPhone = "905559998877";
  const courierPw = transportDemoCourierPassword();
  const hash = await bcrypt.hash(demoPw, 10);
  const courierHash = await bcrypt.hash(courierPw, 10);

  const existing = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, demoSlug)).limit(1);
  let vid: number;
  if (existing[0]) {
    vid = existing[0].id;
    await db
      .update(vendorsTable)
      .set({
        name: "Demo Ulaşım İşletmesi",
        email: demoEmail,
        ownerEmail: demoEmail,
        ownerName: "Demo Yetkili",
        phone: "+905559990001",
        address: "Demo Cad. No:1",
        city: "İstanbul",
        district: "Kadıköy",
        passwordHash: hash,
        active: true,
        isOpen: true,
        vendorType: "delivery",
        membershipTier: "gold",
        updatedAt: new Date(),
      })
      .where(eq(vendorsTable.id, vid));
    await syncUnifiedVendorMembershipAfterVendorWrite(vid);
  } else {
    const [row] = await db
      .insert(vendorsTable)
      .values({
        name: "Demo Ulaşım İşletmesi",
        slug: demoSlug,
        vendorType: "delivery",
        email: demoEmail,
        ownerEmail: demoEmail,
        ownerName: "Demo Yetkili",
        phone: "+905559990001",
        address: "Demo Cad. No:1",
        city: "İstanbul",
        district: "Kadıköy",
        passwordHash: hash,
        active: true,
        isOpen: true,
        membershipTier: "gold",
      })
      .returning();
    vid = row.id;
    await syncUnifiedVendorMembershipAfterVendorWrite(vid);
  }

  await db.execute(sql`DELETE FROM vendor_couriers WHERE vendor_id = ${vid} AND phone = ${courierPhone}`);
  await db.insert(vendorCouriersTable).values({
    vendorId: vid,
    name: "Demo Kurye",
    phone: courierPhone,
    active: true,
    passwordHash: courierHash,
  });

  res.json({
    ok: true,
    vendorId: vid,
    slug: demoSlug,
    providerPanel: {
      path: "/servis-saglayici-giris",
      email: demoEmail,
      password: demoPw,
    },
    courierPanel: {
      path: "/kurye-paneli",
      phone: courierPhone,
      password: courierPw,
    },
  });
});

router.post("/delivery/vendors", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureVendorCatalogGapColumns();
  await ensureVendorMembershipTierColumn();
  await ensureVendorAboutHtmlColumn();
  const data = pickVendorPatch(req.body as Record<string, unknown>) as Record<string, unknown>;
  if (!data.name || !data.slug) { res.status(400).json({ error: "name ve slug zorunlu" }); return; }
  const [row] = await db.insert(vendorsTable).values(data as typeof vendorsTable.$inferInsert).returning();
  await syncUnifiedVendorMembershipAfterVendorWrite(row.id);
  let [fresh] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, row.id)).limit(1);
  let out = fresh ?? row;
  try {
    const [siteRow] = await db
      .select({
        openaiApiKey: siteSettingsTable.openaiApiKey,
        openaiModel: siteSettingsTable.openaiModel,
        geminiApiKey: siteSettingsTable.geminiApiKey,
        deepseekApiKey: siteSettingsTable.deepseekApiKey,
      })
      .from(siteSettingsTable)
      .limit(1);
    const about = await generateTurkishVendorAbout(
      {
        openaiApiKey: siteRow?.openaiApiKey ?? null,
        openaiModel: siteRow?.openaiModel ?? null,
        geminiApiKey: siteRow?.geminiApiKey ?? null,
        deepseekApiKey: siteRow?.deepseekApiKey ?? null,
      },
      {
        name: String(out.name),
        city: out.city ?? null,
        district: out.district ?? null,
        address: out.address ?? null,
        vendorType: out.vendorType ?? null,
      },
    );
    if (about) {
      await db.update(vendorsTable).set({ aboutHtml: about, description: about, updatedAt: new Date() }).where(eq(vendorsTable.id, out.id));
      const [again] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, out.id)).limit(1);
      if (again) out = again;
    }
  } catch {
    /* AI isteğe bağlı */
  }
  void syncVendorToMapBusiness(out);
  res.status(201).json(vendorRowForAdminJson(out));
});

router.post("/delivery/admin/vendors/:id/generate-about", denyUnlessPanelPerm("teslimat"), async (req, res): Promise<void> => {
  await ensureVendorAboutHtmlColumn();
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Geçersiz vendor id" }); return; }
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
  if (!vendor) { res.status(404).json({ error: "İşletme bulunamadı" }); return; }
  const [siteRow] = await db
    .select({
      openaiApiKey: siteSettingsTable.openaiApiKey,
      openaiModel: siteSettingsTable.openaiModel,
      geminiApiKey: siteSettingsTable.geminiApiKey,
      deepseekApiKey: siteSettingsTable.deepseekApiKey,
    })
    .from(siteSettingsTable)
    .limit(1);
  const aboutResult = await generateTurkishVendorAboutDetailed(
    {
      openaiApiKey: siteRow?.openaiApiKey ?? null,
      openaiModel: siteRow?.openaiModel ?? null,
      geminiApiKey: siteRow?.geminiApiKey ?? null,
      deepseekApiKey: siteRow?.deepseekApiKey ?? null,
    },
    {
      name: String(vendor.name || ""),
      city: vendor.city ?? null,
      district: vendor.district ?? null,
      address: vendor.address ?? null,
      vendorType: vendor.vendorType ?? null,
    },
  );
  if (!aboutResult.text) {
    const details = aboutResult.errors.length ? aboutResult.errors.join(" | ").slice(0, 400) : "Üretim yanıtı boş döndü";
    res.status(400).json({
      error: aboutResult.hasAnyKey
        ? `AI metni üretilemedi: ${details}`
        : "AI metni üretilemedi: aktif OpenAI/Gemini/DeepSeek anahtarı bulunamadı.",
    });
    return;
  }
  const about = aboutResult.text;
  await db.update(vendorsTable).set({ aboutHtml: about, description: about, updatedAt: new Date() }).where(eq(vendorsTable.id, id));
  const [fresh] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
  if (fresh) await syncVendorToMapBusiness(fresh);
  res.json({ ok: true, message: "AI Hakkımızda güncellendi", about, provider: aboutResult.usedProvider });
});

router.post("/delivery/admin/vendors/:id/enrich-google-new", denyUnlessPanelPerm("teslimat"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Geçersiz vendor id" }); return; }
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
  if (!vendor) { res.status(404).json({ error: "İşletme bulunamadı" }); return; }

  const mapByLink = vendor.linkedMapBusinessId
    ? (await db.select().from(mapBusinessesTable).where(eq(mapBusinessesTable.id, String(vendor.linkedMapBusinessId))).limit(1))[0]
    : null;
  const mapByPlace = !mapByLink && vendor.googlePlaceId
    ? (await db.select().from(mapBusinessesTable).where(eq(mapBusinessesTable.googlePlaceId, String(vendor.googlePlaceId))).limit(1))[0]
    : null;
  const mapBusiness = mapByLink || mapByPlace || null;

  const placeId = String(vendor.googlePlaceId || mapBusiness?.googlePlaceId || "").trim();
  if (!placeId) {
    res.status(400).json({ error: "Google Place ID yok. Önce harita kaydı ile eşleştirin." });
    return;
  }

  const apiKey = await resolveGooglePlacesApiKey();
  if (!apiKey) {
    res.status(400).json({ error: "Google Places API anahtarı tanımlı değil." });
    return;
  }
  const newDetails = await fetchPlaceDetailsNew(apiKey, placeId);
  if (!newDetails.ok) {
    res.status(502).json({ error: newDetails.message, status: newDetails.status, bodySnippet: newDetails.bodySnippet });
    return;
  }

  const p = newDetails.place;
  const dn = p.displayName as { text?: string } | undefined;
  const name = String(dn?.text || vendor.name || "").trim() || String(vendor.name || "");
  const phone = String((p.nationalPhoneNumber as string) || (p.internationalPhoneNumber as string) || vendor.phone || "").trim() || null;
  const website = String((p.websiteUri as string) || "").trim() || null;
  const address = String((p.formattedAddress as string) || vendor.address || "").trim() || null;
  const rating = typeof p.rating === "number" ? Number(p.rating) : (vendor.rating ?? null);
  const reviewCount = typeof p.userRatingCount === "number" ? Number(p.userRatingCount) : (vendor.reviewCount ?? null);
  const editor = (p.editorialSummary as { text?: string } | undefined)?.text;
  const gen = (p.generativeSummary as { overview?: { text?: string } } | undefined)?.overview?.text;
  const about =
    String(editor || gen || vendor.description || mapBusiness?.description || "").trim() || null;
  const hoursText = joinWeekdayDescriptionsFromPlacesNew(p) || (vendor.workingHours ? String(vendor.workingHours) : null);
  const photoUrls = buildNewApiPhotoMediaUrls(p.photos, apiKey, 8, 1200);

  let linkedMapId = mapBusiness?.id ? String(mapBusiness.id) : null;
  if (!linkedMapId) {
    const baseSlug = String(vendor.slug || name || "isletme").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "isletme";
    let slug = baseSlug;
    let n = 1;
    while (n <= 200) {
      const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
      if (clash.length === 0) break;
      n++;
      slug = `${baseSlug}-${n}`;
    }
    const [ins] = await db.insert(mapBusinessesTable).values({
      slug,
      name,
      googlePlaceId: placeId,
      address,
      phone,
      website,
      description: about,
      rating,
      userRatingsTotal: reviewCount != null ? Math.round(reviewCount) : null,
      photoUrl: photoUrls[0] || vendor.imageUrl || null,
      coverPhotoUrl: photoUrls[0] || vendor.coverUrl || null,
      latitude: vendor.lat ?? null,
      longitude: vendor.lng ?? null,
      isActive: true,
      importSource: "places_api",
      googlePlacesExtras: { placesApiNew: sanitizePlacesNewForExtras(p) } as unknown as Record<string, unknown>,
      popularHours: buildPopularHoursFromPlacesNew(p) as unknown as Record<string, unknown>,
    }).returning({ id: mapBusinessesTable.id });
    linkedMapId = ins?.id ? String(ins.id) : null;
  } else {
    const prevExtras = (mapBusiness?.googlePlacesExtras ?? null) as Record<string, unknown> | null;
    await db.update(mapBusinessesTable).set({
      name,
      googlePlaceId: placeId,
      address,
      phone,
      website,
      description: about,
      rating,
      userRatingsTotal: reviewCount != null ? Math.round(reviewCount) : null,
      photoUrl: photoUrls[0] || mapBusiness?.photoUrl || null,
      coverPhotoUrl: photoUrls[0] || mapBusiness?.coverPhotoUrl || null,
      importSource: "places_api",
      googlePlacesExtras: {
        ...(prevExtras && typeof prevExtras === "object" ? prevExtras : {}),
        placesApiNew: sanitizePlacesNewForExtras(p),
      } as unknown as Record<string, unknown>,
      popularHours: buildPopularHoursFromPlacesNew(p) as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    }).where(eq(mapBusinessesTable.id, linkedMapId));
  }

  if (linkedMapId && photoUrls.length > 0) {
    await db.delete(mapBusinessImagesTable).where(eq(mapBusinessImagesTable.businessId, linkedMapId));
    for (let i = 0; i < photoUrls.length; i++) {
      const u = photoUrls[i];
      if (!u) continue;
      await db.insert(mapBusinessImagesTable).values({
        businessId: linkedMapId,
        imageUrl: u,
        sortOrder: i,
        isPrimary: i === 0,
      }).onConflictDoNothing().catch(() => {});
    }
  }

  await db.update(vendorsTable).set({
    name,
    phone,
    address,
    description: about,
    workingHours: hoursText,
    rating,
    reviewCount: reviewCount != null ? Math.round(reviewCount) : undefined,
    imageUrl: photoUrls[0] || vendor.imageUrl || null,
    coverUrl: photoUrls[0] || vendor.coverUrl || null,
    googlePlaceId: placeId,
    linkedMapBusinessId: linkedMapId,
    googleImportKind: "places_api",
    updatedAt: new Date(),
  }).where(eq(vendorsTable.id, id));

  const [updated] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
  if (updated) {
    await recomputeVendorCatalogMenuGap(id);
    const [again] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
    if (again) await syncVendorToMapBusiness(again);
  }
  res.json({
    ok: true,
    message: "Google Places New API ile zenginleştirildi",
    placeId,
    mapBusinessId: linkedMapId,
    photos: photoUrls.length,
    aboutUpdated: Boolean(about),
    menuFromPlacesApi:
      "Google Places (New) yanıtında yemek/içecek «fiyatlı liste» alanı yok; yalnızca servis bayrakları (teslimat, vejetaryen, kahvaltı vb.), özet metinler ve fotoğraflar gelir. Haritalar arayüzündeki menü / otel odası / müsaitlik sekmeleri ayrı ürünlerdir (Travel/Maps içerik); paneldeki ürün listesi için Yemeksepeti/Getir linki veya manuel ürün gerekir.",
  });
});

/** Admin: Harici menü URL önizleme (kaydetmez) */
router.post("/delivery/admin/import-external-menu/preview", denyUnlessPanelPerm("teslimat"), async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const sourceUrl = String(body.sourceUrl ?? body.source_url ?? "").trim();
  if (!sourceUrl) {
    res.status(400).json({ error: "sourceUrl zorunlu" });
    return;
  }
  try {
    const imported = await importVendorFromExternalUrl(sourceUrl, {
      prefetchedHtml: pickPrefetchedHtml(body),
      prefetchedMenuJson: pickPrefetchedMenuJson(body),
    });
    res.json({ ok: true, ...externalMenuPreviewPayload(imported) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Admin: Harici menü URL’si (Yemeksepeti, Getir, vb.) veya Google Haritalar sayfası — menü öğelerini vendor’a aktarır. */
router.post("/delivery/admin/vendors/:id/import-external-menu", denyUnlessPanelPerm("teslimat"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz vendor id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const sourceUrl = String(body.sourceUrl ?? body.source_url ?? "").trim();
  const selectedCategories = Array.isArray(body.selectedCategories)
    ? (body.selectedCategories as unknown[]).map((c) => String(c)).filter(Boolean)
    : undefined;
  const menu = Array.isArray(body.menu) ? (body.menu as ImportedMenuItem[]) : undefined;
  if (!sourceUrl && !(menu && menu.length > 0)) {
    res.status(400).json({ error: "sourceUrl veya menu zorunlu" });
    return;
  }
  await ensureVendorCatalogGapColumns();
  const [vrow] = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
  if (!vrow) {
    res.status(404).json({ error: "İşletme bulunamadı" });
    return;
  }
  try {
    const { imported, menuStats } = await runExternalMenuImportForVendor(id, {
      sourceUrl: sourceUrl || undefined,
      prefetchedHtml: pickPrefetchedHtml(body),
      prefetchedMenuJson: pickPrefetchedMenuJson(body),
      menu,
      selectedCategories,
      city: body.city != null ? String(body.city) : undefined,
      district: body.district != null ? String(body.district) : undefined,
      neighborhood: body.neighborhood != null ? String(body.neighborhood) : undefined,
      address: body.address != null ? String(body.address) : undefined,
      phone: body.phone != null ? String(body.phone) : undefined,
      lat: body.lat != null ? Number(body.lat) : undefined,
      lng: body.lng != null ? Number(body.lng) : undefined,
      rating: body.rating != null ? Number(body.rating) : undefined,
      reviewCount: body.reviewCount != null ? Number(body.reviewCount) : undefined,
      platform: body.platform != null ? String(body.platform) : undefined,
      name: body.name != null ? String(body.name) : undefined,
    });
    const hasMenu = (menuStats.items ?? 0) > 0;
    await db
      .update(vendorsTable)
      .set({ catalogMenuGap: !hasMenu, updatedAt: new Date() })
      .where(eq(vendorsTable.id, id));
    const [fresh] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
    if (fresh) void syncVendorToMapBusiness(fresh);
    res.json({
      ok: true,
      menuStats,
      importedPlatform: imported.platform,
      scrapedItemCount: menuStats.items ?? 0,
      rating: imported.rating ?? null,
      reviewCount: imported.reviewCount ?? null,
      note:
        imported.platform === "google-maps" && !hasMenu
          ? "Google Haritalar’dan yapılandırılmış menü genelde gelmez; Yemeksepeti/Getir menü linki deneyin veya Menü & Ürünler’den elle ekleyin."
          : undefined,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Admin: Google Merchant RSS (export.xml) → mağaza kategorileri + ürünler (görseller URL olarak) */
router.post("/delivery/admin/vendors/:id/import-merchant-rss", denyUnlessPanelPerm("teslimat"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Geçersiz vendor id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const xmlUrl = String(body.xmlUrl ?? body.xml_url ?? "").trim();
  const xmlRaw = String(body.xml ?? body.xmlContent ?? "").trim();
  const clearExisting = body.clearExisting !== false && body.clear_existing !== false;

  let xml = xmlRaw;
  if (!xml && xmlUrl) {
    try {
      const fetched = await axios.get<string>(xmlUrl, {
        timeout: 120_000,
        responseType: "text",
        maxContentLength: 120 * 1024 * 1024,
      });
      xml = String(fetched.data ?? "");
    } catch (e: unknown) {
      res.status(502).json({ error: e instanceof Error ? e.message : "XML indirilemedi" });
      return;
    }
  }
  if (!xml || xml.length < 200) {
    res.status(400).json({ error: "xml veya xmlUrl zorunlu" });
    return;
  }

  const [vrow] = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
  if (!vrow) {
    res.status(404).json({ error: "İşletme bulunamadı" });
    return;
  }

  try {
    await ensureVendorCatalogGapColumns();
    const items = parseMerchantRssXml(xml);
    if (items.length === 0) {
      res.status(400).json({ error: "XML içinde ürün bulunamadı" });
      return;
    }
    const stats = await importMerchantRssIntoVendor(id, items, { clearExisting });
    const [fresh] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
    if (fresh) void syncVendorToMapBusiness(fresh);
    res.json({ ok: true, parsed: items.length, ...stats });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

router.delete("/delivery/vendors/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.delete(vendorsTable).where(eq(vendorsTable.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

router.put("/delivery/vendors/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await ensureVendorCatalogGapColumns();
  await ensureVendorMembershipTierColumn();
  await ensureVendorAboutHtmlColumn();
  const id = parseInt(req.params.id);
  const patch = pickVendorPatch(req.body as Record<string, unknown>);
  const [row] = await db.update(vendorsTable).set({ ...patch, updatedAt: new Date() } as typeof vendorsTable.$inferInsert)
    .where(eq(vendorsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Bulunamadı" }); return; }
  await syncUnifiedVendorMembershipAfterVendorWrite(row.id);
  const [fresh] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).limit(1);
  const out = fresh ?? row;
  void syncVendorToMapBusiness(out);
  res.json(vendorRowForAdminJson(out));
});

/* Masaya Servis & Rezervasyon ayarları güncelle */
router.patch("/delivery/vendors/:id/service-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const { tableServiceEnabled, reservationEnabled, reservationAutoConfirm, tableSections } = req.body;
  const [vendorRow] = ((await db.execute<any>(sql`
    SELECT vendor_type, provider_type, provider_subtype, table_service_enabled
    FROM vendors
    WHERE id = ${id}
    LIMIT 1
  `)).rows ?? []) as Array<Record<string, unknown>>;
  const tableAllowed = vendorRow ? canVendorUseTableService(vendorRow) : false;
  const requestedTableServiceEnabled = tableServiceEnabled !== undefined ? Boolean(tableServiceEnabled) : Boolean(vendorRow?.table_service_enabled);
  const effectiveTableServiceEnabled = tableAllowed && requestedTableServiceEnabled;
  await db.execute(sql`
    UPDATE vendors SET
      table_service_enabled  = ${tableServiceEnabled !== undefined ? effectiveTableServiceEnabled : sql`table_service_enabled`},
      reservation_enabled    = ${reservationEnabled !== undefined ? Boolean(reservationEnabled) : sql`reservation_enabled`},
      reservation_auto_confirm = ${reservationAutoConfirm !== undefined ? Boolean(reservationAutoConfirm) : sql`reservation_auto_confirm`},
      table_sections         = ${tableAllowed && effectiveTableServiceEnabled && tableSections !== undefined ? (tableSections === null ? null : JSON.stringify(tableSections)) : sql`table_sections`},
      updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

/* WhatsApp + CallMeBot key güncelle */
router.patch("/delivery/vendors/:id/whatsapp", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const { whatsapp, callmebot_key } = req.body;
  await db.execute(sql`
    UPDATE vendors SET
      whatsapp = ${whatsapp || null},
      callmebot_key = ${callmebot_key || null},
      updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

/* — MENU CATEGORIES ────────────────────────────────────────────── */

router.get("/delivery/vendors/:slug/menu-categories", async (req, res): Promise<void> => {
  const [vendor] = await db.select({ id: vendorsTable.id }).from(vendorsTable)
    .where(eq(vendorsTable.slug, req.params.slug)).limit(1);
  if (!vendor) { res.status(404).json({ error: "Bulunamadı" }); return; }
  const rows = await db.select().from(vendorMenuCategoriesTable)
    .where(and(eq(vendorMenuCategoriesTable.vendorId, vendor.id), eq(vendorMenuCategoriesTable.active, true)))
    .orderBy(asc(vendorMenuCategoriesTable.position));
  res.json(rows);
});

router.post("/delivery/menu-categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { vendorId, name, position } = req.body;
  if (!vendorId || !name) { res.status(400).json({ error: "vendorId ve name zorunlu" }); return; }
  const [row] = await db.insert(vendorMenuCategoriesTable).values({ vendorId, name, position: position ?? 0 }).returning();
  res.status(201).json(row);
});

/* — MENU ITEMS ─────────────────────────────────────────────────── */

router.post("/delivery/menu-items", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const data = pickMenuItemPatch(req.body as Record<string, unknown>) as Record<string, unknown>;
  if (!data.vendorId || !data.name || data.price === undefined) {
    res.status(400).json({ error: "vendorId, name, price zorunlu" }); return;
  }
  const [row] = await db.insert(vendorMenuItemsTable).values(data as typeof vendorMenuItemsTable.$inferInsert).returning();
  await recomputeVendorCatalogMenuGap(Number(data.vendorId));
  const [v] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, Number(data.vendorId))).limit(1);
  if (v) void syncVendorToMapBusiness(v);
  res.status(201).json(row);
});

router.put("/delivery/menu-items/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const patch = pickMenuItemPatch(req.body as Record<string, unknown>);
  const [row] = await db.update(vendorMenuItemsTable).set({ ...patch, updatedAt: new Date() } as typeof vendorMenuItemsTable.$inferInsert)
    .where(eq(vendorMenuItemsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Bulunamadı" }); return; }
  await recomputeVendorCatalogMenuGap(Number(row.vendorId));
  const [v] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, row.vendorId)).limit(1);
  if (v) void syncVendorToMapBusiness(v);
  res.json(row);
});

router.delete("/delivery/menu-items/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const [before] = await db.select({ vendorId: vendorMenuItemsTable.vendorId }).from(vendorMenuItemsTable).where(eq(vendorMenuItemsTable.id, id)).limit(1);
  await db.update(vendorMenuItemsTable).set({ active: false }).where(eq(vendorMenuItemsTable.id, id));
  if (before?.vendorId != null) {
    await recomputeVendorCatalogMenuGap(Number(before.vendorId));
    const [v] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, before.vendorId)).limit(1);
    if (v) void syncVendorToMapBusiness(v);
  }
  res.status(204).end();
});

/* — COUPON CRUD (Admin) ────────────────────────────────────────── */

router.get("/delivery/coupons", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const rows = await db.select().from(couponCodesTable).orderBy(desc(couponCodesTable.createdAt));
  res.json(rows);
});

router.post("/delivery/coupons", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { code, vendorId, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
  if (!code || !discountType || !discountValue) { res.status(400).json({ error: "Zorunlu alanlar eksik" }); return; }
  const [row] = await db.insert(couponCodesTable).values({
    code: code.toUpperCase().trim(),
    vendorId: vendorId ? parseInt(vendorId) : null,
    discountType, discountValue,
    minOrderAmount: minOrderAmount || null,
    maxUses: maxUses ? parseInt(maxUses) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json(row);
});

router.put("/delivery/coupons/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, active } = req.body;
  const [row] = await db.update(couponCodesTable).set({
    ...(code && { code: code.toUpperCase().trim() }),
    ...(discountType && { discountType }),
    ...(discountValue && { discountValue }),
    minOrderAmount: minOrderAmount || null,
    maxUses: maxUses ? parseInt(maxUses) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    ...(active !== undefined && { active: Boolean(active) }),
  }).where(eq(couponCodesTable.id, id)).returning();
  res.json(row);
});

router.delete("/delivery/coupons/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.delete(couponCodesTable).where(eq(couponCodesTable.id, parseInt(req.params.id)));
  res.status(204).end();
});

/* — COUPON VALIDATION ──────────────────────────────────────────── */

router.post("/delivery/coupons/validate", async (req, res): Promise<void> => {
  const { code, vendorId, orderAmount } = req.body;
  if (!code) { res.status(400).json({ error: "Kupon kodu zorunlu" }); return; }

  const [coupon] = await db.select().from(couponCodesTable)
    .where(and(
      eq(couponCodesTable.code, code.toUpperCase()),
      eq(couponCodesTable.active, true)
    )).limit(1);

  if (!coupon) { res.status(404).json({ error: "Geçersiz kupon kodu" }); return; }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    res.status(400).json({ error: "Kupon süresi dolmuş" }); return;
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    res.status(400).json({ error: "Kupon kullanım limiti dolmuş" }); return;
  }
  if (coupon.minOrderAmount && orderAmount < parseFloat(coupon.minOrderAmount)) {
    res.status(400).json({ error: `Minimum sipariş tutarı ${coupon.minOrderAmount}₺` }); return;
  }
  if (coupon.vendorId && vendorId && coupon.vendorId !== parseInt(vendorId)) {
    res.status(400).json({ error: "Bu kupon bu mağaza için geçerli değil" }); return;
  }

  let discount = 0;
  if (coupon.discountType === "percent") {
    discount = (orderAmount * parseFloat(coupon.discountValue)) / 100;
  } else {
    discount = parseFloat(coupon.discountValue);
  }

  res.json({ valid: true, coupon, discount: Math.min(discount, orderAmount) });
});

/* — ORDERS ─────────────────────────────────────────────────────── */

router.get("/delivery/checkout/stripe-key", async (_req, res): Promise<void> => {
  const rows = await db.select().from(paymentSettingsTable).limit(1);
  const s = rows[0];
  if (!s?.stripeEnabled || !s?.stripePublishableKey) {
    res.json({ key: null, enabled: false });
    return;
  }
  res.json({ key: s.stripePublishableKey, enabled: true });
});

router.post("/delivery/checkout/intent", async (req, res): Promise<void> => {
  try {
    const orderNumber = String(req.body?.orderNumber ?? "").trim();
    if (!orderNumber) {
      res.status(400).json({ success: false, error: "orderNumber gerekli" });
      return;
    }
    const [order] = await db
      .select({
        id: deliveryOrdersTable.id,
        orderNumber: deliveryOrdersTable.orderNumber,
        total: deliveryOrdersTable.total,
        paymentStatus: deliveryOrdersTable.paymentStatus,
      })
      .from(deliveryOrdersTable)
      .where(eq(deliveryOrdersTable.orderNumber, orderNumber))
      .limit(1);
    if (!order) {
      res.status(404).json({ success: false, error: "Sipariş bulunamadı" });
      return;
    }
    if (String(order.paymentStatus) === "paid") {
      res.status(400).json({ success: false, error: "Sipariş zaten ödenmiş" });
      return;
    }
    const stripe = await getStripeForDelivery();
    if (!stripe) {
      res.status(503).json({ success: false, error: "Stripe yapılandırılmamış" });
      return;
    }
    const amount = Math.max(1, Math.round(Number(order.total || 0) * 100));
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "try",
      payment_method_types: ["card"],
      metadata: {
        checkout_source: "delivery",
        delivery_order_number: order.orderNumber,
        delivery_order_id: String(order.id),
      },
    });
    res.json({
      success: true,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : "Intent oluşturulamadı" });
  }
});

const DELIVERY_STATUS_NOTIFY_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  picked_up: "Kuryede",
  on_the_way: "Yolda",
  delivered: "Teslim edildi",
  cancelled: "İptal",
};

async function insertDeliveryStatusEvent(params: {
  orderId: number;
  fromStatus: string | null;
  toStatus: string;
  source: string;
  note?: string | null;
}) {
  await db.insert(deliveryOrderStatusEventsTable).values({
    orderId: params.orderId,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    source: params.source,
    note: params.note ?? null,
  });
}

/** Adrese teslim siparişlerde işletme–müşteri arası izin verilen azami kuş uçuşu mesafe (km). */
const DELIVERY_MAX_RADIUS_KM = Number(process.env.DELIVERY_MAX_RADIUS_KM ?? 10);

function deliveryHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Mağaza siparişi tamamlandıktan sonra müşterinin dönüş URL’si (PayTR / iyzico). */
function publicOrderReturnPath(vendorType: unknown, slug: string): string {
  const vt = String(vendorType ?? "").toLowerCase();
  const isShop = vt === "ecommerce" || vt === "alisveris";
  const s = encodeURIComponent(slug);
  return isShop ? `/alisveris/magaza/${s}` : `/siparis/satici/${s}`;
}

router.post("/delivery/orders", async (req, res): Promise<void> => {
  await ensureVendorRevenueColumns();
  await ensureGeliverIntegrationColumns();
  await ensureVendorTrPaymentColumns();
  await ensureDeliveryCustomerEmailColumn();
  await ensureDeliveryLegalAcceptanceColumns();
  const body = req.body as Record<string, unknown>;
  const derived = deriveOrderTotalsFromBody(body);
  const customerName = String(body.customerName ?? "").trim();
  const customerPhone = String(body.customerPhone ?? "").trim();
  const customerAddress = derived.customerAddress || String(body.customerAddress ?? "").trim();

  if (!body.vendorId || !customerName || !customerPhone || !customerAddress) {
    res.status(400).json({ error: "Zorunlu alanlar eksik" });
    return;
  }

  const vendorId = Number(body.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Geçersiz işletme" });
    return;
  }

  const orderSourceStr = String(body.orderSource ?? body.order_source ?? "").toLowerCase();
  const orderTypeStr = String(body.orderType ?? body.order_type ?? "").toLowerCase();
  const isEcommerceOrder = orderSourceStr === "ecommerce" || orderTypeStr === "ecommerce";
  const orderItems = parseOrderItems(body.items);
  const hasPaidItems = orderItems.some((item) => {
    const qty = Math.max(0, parseInt(String(item.qty ?? item.quantity ?? 0), 10) || 0);
    const price = parseMoney(item.price);
    return qty > 0 && price > 0;
  });
  if (!hasPaidItems || derived.subtotal <= 0) {
    res.status(400).json({ error: "Sipariş oluşturmak için sepette ürün bulunmalıdır." });
    return;
  }
  if (isEcommerceOrder) {
    const okMesafe = Boolean(body.legalDistanceSalesAccepted ?? body.legal_distance_sales_accepted);
    const okOn = Boolean(body.legalPreinfoAccepted ?? body.legal_preinfo_accepted);
    if (!okMesafe || !okOn) {
      res.status(400).json({
        error:
          "Mesafeli satış sözleşmesi ve ön bilgilendirme formunu okuyup onaylamanız yasal olarak zorunludur.",
      });
      return;
    }
  }

  const [vRow] = await db
    .select({
      revenueModel: vendorsTable.revenueModel,
      commissionRatePct: vendorsTable.commissionRatePct,
      vendorType: vendorsTable.vendorType,
      ownerEmail: vendorsTable.ownerEmail,
      slug: vendorsTable.slug,
      name: vendorsTable.name,
      city: vendorsTable.city,
      lat: vendorsTable.lat,
      lng: vendorsTable.lng,
      paytrMerchantId: vendorsTable.paytrMerchantId,
      paytrMerchantKey: vendorsTable.paytrMerchantKey,
      paytrMerchantSalt: vendorsTable.paytrMerchantSalt,
      paytrTestMode: vendorsTable.paytrTestMode,
      iyzicoApiKey: vendorsTable.iyzicoApiKey,
      iyzicoSecretKey: vendorsTable.iyzicoSecretKey,
      iyzicoSandbox: vendorsTable.iyzicoSandbox,
      preferredTrGateway: vendorsTable.preferredTrGateway,
    })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId))
    .limit(1);

  if (!vRow) {
    res.status(400).json({ error: "İşletme bulunamadı" });
    return;
  }

  /* Adrese teslim siparişlerde 10 km yarıçap denetimi.
     Müşteri konumu veya işletme koordinatı yoksa mevcut akış bozulmaz (denetim atlanır). */
  const isAddressDeliveryOrder =
    !isEcommerceOrder && orderSourceStr !== "table" && orderSourceStr !== "pickup";
  if (isAddressDeliveryOrder) {
    const custLat = body.customerLat != null && body.customerLat !== "" ? parseFloat(String(body.customerLat)) : NaN;
    const custLng = body.customerLng != null && body.customerLng !== "" ? parseFloat(String(body.customerLng)) : NaN;
    const vendLat = vRow.lat != null ? Number(vRow.lat) : NaN;
    const vendLng = vRow.lng != null ? Number(vRow.lng) : NaN;
    if (
      Number.isFinite(custLat) && Number.isFinite(custLng) &&
      Number.isFinite(vendLat) && Number.isFinite(vendLng)
    ) {
      const distanceKm = deliveryHaversineKm(custLat, custLng, vendLat, vendLng);
      if (distanceKm > DELIVERY_MAX_RADIUS_KM) {
        res.status(422).json({
          error: `Bu işletme konumunuza teslimat yapamıyor (${DELIVERY_MAX_RADIUS_KM} km dışı). İşletmeye uzaklığınız yaklaşık ${distanceKm.toFixed(1)} km.`,
          distanceKm: Math.round(distanceKm * 10) / 10,
          maxRadiusKm: DELIVERY_MAX_RADIUS_KM,
        });
        return;
      }
    }
  }

  if (orderSourceStr === "table") {
    const [serviceRow] = ((await db.execute<any>(sql`
      SELECT vendor_type, provider_type, provider_subtype, table_service_enabled
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1
    `)).rows ?? []) as Array<Record<string, unknown>>;
    if (!serviceRow || !canVendorUseTableService(serviceRow) || serviceRow.table_service_enabled !== true) {
      res.status(400).json({ error: "Bu işletmede masaya servis açık değildir." });
      return;
    }
  }

  const snap = computeOrderCommissionSnapshot({
    revenueModel: vRow.revenueModel,
    commissionRatePct: vRow.commissionRatePct,
    subtotal: derived.subtotal,
    discount: derived.discount,
  });

  const orderNumber = `YEK${Date.now().toString().slice(-8)}`;
  const itemsStr = typeof body.items === "string" ? body.items : JSON.stringify(orderItems);

  const ce = body.customerEmail ?? body.customer_email;
  const ceTrimmed = ce != null && String(ce).trim() ? String(ce).trim().slice(0, 200) : undefined;

  const insertRow = {
    vendorId,
    customerId: body.customerId != null ? Number(body.customerId) : null,
    customerName,
    customerPhone,
    customerAddress,
    customerCity: body.customerCity != null ? String(body.customerCity) : null,
    customerDistrict: body.customerDistrict != null ? String(body.customerDistrict) : null,
    customerLat:
      body.customerLat != null && body.customerLat !== ""
        ? parseFloat(String(body.customerLat))
        : null,
    customerLng:
      body.customerLng != null && body.customerLng !== ""
        ? parseFloat(String(body.customerLng))
        : null,
    items: itemsStr,
    orderNumber,
    subtotal: derived.subtotal.toFixed(2),
    deliveryFee: derived.deliveryFee.toFixed(2),
    discount: derived.discount.toFixed(2),
    total: derived.total.toFixed(2),
    couponCode: body.couponCode ? String(body.couponCode) : null,
    paymentMethod: String(body.paymentMethod ?? "cash"),
    notes: body.notes != null ? String(body.notes) : null,
    platformCommissionAmount: snap.platformCommissionAmount,
    revenueModelSnapshot: snap.revenueModelSnapshot,
    ...(ceTrimmed ? { customerEmail: ceTrimmed } : {}),
    ...(body.orderSource != null ? { orderSource: String(body.orderSource) } : {}),
    ...(body.tableNumber != null ? { tableNumber: String(body.tableNumber) } : {}),
    ...(body.createdByStaff != null ? { createdByStaff: String(body.createdByStaff) } : {}),
    ...(snap.commissionBaseAmount != null ? { commissionBaseAmount: snap.commissionBaseAmount } : {}),
    ...(snap.commissionRatePctSnapshot != null ? { commissionRatePctSnapshot: snap.commissionRatePctSnapshot } : {}),
    ...(() => {
      const postal = body.customerPostalCode ?? body.customer_postal_code;
      if (postal != null && String(postal).trim()) {
        return { customerPostalCode: String(postal).trim().slice(0, 16) };
      }
      return {};
    })(),
    ...(isEcommerceOrder
      ? {
          legalDistanceSalesAccepted: true,
          legalPreinfoAccepted: true,
        }
      : {}),
  };

  const stockOrder = await withVendorMenuStockAndOrder(vendorId, orderItems, async (tx) => {
    const [row] = await tx.insert(deliveryOrdersTable).values(insertRow).returning();
    return row;
  });

  if (!stockOrder.ok) {
    res.status(stockOrder.statusCode).json({ error: stockOrder.error });
    return;
  }

  const order = stockOrder.result;

  if (order?.id) {
    await insertDeliveryStatusEvent({
      orderId: order.id,
      fromStatus: null,
      toStatus: "pending",
      source: "order_create",
    }).catch(() => {});
  }

  if (body.couponCode) {
    await db.execute(sql`UPDATE coupon_codes SET used_count = used_count + 1 WHERE code = ${body.couponCode}`);
  }

  const waExtra =
    snap.revenueModelSnapshot === "commission" && parseFloat(snap.platformCommissionAmount) > 0
      ? `\nKomisyon (platform): ${snap.platformCommissionAmount}₺ (${snap.commissionRatePctSnapshot ?? "?"}%)`
      : "";

  const origin = sitePublicOrigin();
  const vt = String(vRow.vendorType ?? "").toLowerCase();
  const isShop = vt === "ecommerce" || vt === "alisveris";
  const orderPanelUrl = isShop ? `${origin}/isletme-paneli` : `${origin}/servis-saglayici-giris`;
  const waBusiness = await notifyVendorWhatsApp({
    vendorId,
    eventType: "new_order",
    details:
      buildOrderMessage({
        orderNumber,
        customerName,
        customerPhone,
        totalAmount: derived.total,
        items: itemsStr,
      }) + waExtra,
    panelUrl: orderPanelUrl,
    loginEmail: String(vRow.ownerEmail ?? "").trim() || undefined,
  }).catch(() => ({ sent: false as const }));

  void notifyCustomerOrderWhatsApp({
    vendorId,
    customerName,
    customerPhone,
    orderNumber,
    event: "received",
  }).catch(() => {});

  let trCheckout: Record<string, unknown> | undefined;
  const payMethodRaw = String(body.paymentMethod ?? "cash").toLowerCase();
  if (
    order?.id &&
    payMethodRaw === "online" &&
    normalizeRevenueModel(vRow.revenueModel) === "subscription"
  ) {
    const vg = vRow as unknown as VendorTrGateRow;
    const gw = trGatewayForVendor(vg);
    const emailGuest =
      String(body.customerEmail ?? body.customer_email ?? "").trim() ||
      `siparis-${order.orderNumber}@guest.yekpare.net`;
    const ip = clientIpFromRequest(req);
    const totalNum = derived.total;
    const retPath = publicOrderReturnPath(vRow.vendorType, vg.slug);
    const trackTok = signDeliveryTrackingToken(order.id, order.orderNumber);
    const okUrl = `${origin}${retPath}?order=${encodeURIComponent(order.orderNumber)}&pay=1&t=${encodeURIComponent(trackTok)}`;
    const failUrl = `${origin}${retPath}?order=${encodeURIComponent(order.orderNumber)}&pay=0&t=${encodeURIComponent(trackTok)}`;
    const zip =
      String(body.customerPostalCode ?? body.customer_postal_code ?? "34000")
        .replace(/\D/g, "")
        .slice(0, 5) || "34000";

    if (gw === "paytr" && vg.paytrMerchantId && vg.paytrMerchantKey && vg.paytrMerchantSalt) {
      const basketB64 = paytrEncodeBasket(paytrBasketRowsFromItems(itemsStr, totalNum));
      const oid = order.orderNumber.slice(0, 64);
      const pt = await paytrGetIframeToken({
        merchantId: vg.paytrMerchantId.trim(),
        merchantKey: vg.paytrMerchantKey,
        merchantSalt: vg.paytrMerchantSalt,
        userIp: ip,
        merchantOid: oid,
        email: emailGuest,
        paymentAmountKurus: Math.round(totalNum * 100),
        userBasketBase64: basketB64,
        userName: customerName.slice(0, 60),
        userAddress: customerAddress.slice(0, 400),
        userPhone: customerPhone,
        merchantOkUrl: okUrl,
        merchantFailUrl: failUrl,
        testMode: vg.paytrTestMode !== false,
        debugOn: vg.paytrTestMode !== false,
      });
      if ("error" in pt) trCheckout = { gateway: "paytr", error: pt.error };
      else trCheckout = { gateway: "paytr", iframeToken: pt.token };
    } else if (gw === "iyzico" && vg.iyzicoApiKey && vg.iyzicoSecretKey) {
      const price = totalNum.toFixed(2);
      const parts = customerName.split(/\s+/);
      const fn = parts[0] || "Müşteri";
      const ln = parts.slice(1).join(" ") || "-";
      const city = String(body.customerCity ?? vg.city ?? "Istanbul").slice(0, 40);
      const iz = await iyzicoCheckoutFormInitialize({
        apiKey: vg.iyzicoApiKey.trim(),
        secretKey: vg.iyzicoSecretKey.trim(),
        sandbox: vg.iyzicoSandbox !== false,
        conversationId: order.orderNumber,
        priceTry: price,
        paidPriceTry: price,
        basketId: order.orderNumber,
        callbackUrl: `${origin}/api/delivery/checkout/iyzico-callback`,
        buyer: {
          id: `b_${order.id}`,
          name: fn.slice(0, 40),
          surname: ln.slice(0, 40),
          gsmNumber: formatTrGsm(customerPhone),
          email: emailGuest.slice(0, 100),
          identityNumber: "11111111111",
          registrationAddress: customerAddress.slice(0, 250),
          ip,
          city,
          country: "Turkey",
          zipCode: zip,
        },
        shippingAddress: {
          contactName: customerName.slice(0, 100),
          city,
          country: "Turkey",
          address: customerAddress.slice(0, 250),
          zipCode: zip,
        },
        billingAddress: {
          contactName: customerName.slice(0, 100),
          city,
          country: "Turkey",
          address: customerAddress.slice(0, 250),
          zipCode: zip,
        },
        basketItems: [
          {
            id: `o_${order.id}`,
            name: `Sipariş ${order.orderNumber}`.slice(0, 120),
            category1: "Sipariş",
            itemType: "PHYSICAL",
            price,
          },
        ],
      });
      if ("error" in iz) {
        trCheckout = { gateway: "iyzico", error: iz.error };
      } else {
        await db
          .update(deliveryOrdersTable)
          .set({ trCheckoutToken: iz.token, updatedAt: new Date() })
          .where(eq(deliveryOrdersTable.id, order.id));
        (order as Record<string, unknown>).trCheckoutToken = iz.token;
        trCheckout = { gateway: "iyzico", checkoutFormContent: iz.checkoutFormContent, token: iz.token };
      }
    }

    if (!trCheckout) {
      const stripeSdk = await getStripeForDelivery();
      const [psStripe] = await db.select().from(paymentSettingsTable).limit(1);
      const pk = String(psStripe?.stripePublishableKey ?? "").trim();
      if (stripeSdk && pk) {
        const amount = Math.max(1, Math.round(Number(totalNum) * 100));
        const intent = await stripeSdk.paymentIntents.create({
          amount,
          currency: "try",
          metadata: {
            delivery_order_number: order.orderNumber,
            vendor_id: String(vendorId),
          },
          automatic_payment_methods: { enabled: true },
        });
        const secret = intent.client_secret;
        if (secret) {
          trCheckout = { gateway: "stripe", clientSecret: secret, publishableKey: pk };
        }
      }
    }
  }

  const payload = {
    ...(order as Record<string, unknown>),
    trackingToken: order?.id ? signDeliveryTrackingToken(order.id, order.orderNumber) : undefined,
    whatsappBusinessNotify: waBusiness,
    ...(trCheckout ? { trCheckout } : {}),
  };
  res.status(201).json(payload);
});

router.post("/delivery/checkout/paytr-callback", async (req, res): Promise<void> => {
  await ensureVendorTrPaymentColumns();
  try {
    await handleDeliveryPaytrCallback(req.body as Record<string, string>);
  } catch {
    /* PayTR tekrar dener; audit yazılamasa bile OK dönülür */
  }
  res.status(200).send("OK");
});

router.post("/delivery/checkout/iyzico-callback", async (req, res): Promise<void> => {
  await ensureVendorTrPaymentColumns();
  const token = String(req.body?.token ?? "").trim();
  if (!token) {
    res.status(400).send("bad token");
    return;
  }
  const [ord] = await db
    .select()
    .from(deliveryOrdersTable)
    .where(eq(deliveryOrdersTable.trCheckoutToken, token))
    .limit(1);
  if (!ord) {
    res.status(404).type("html").send("<!DOCTYPE html><html><body>Sipariş bulunamadı</body></html>");
    return;
  }
  const [v] = await db
    .select({
      slug: vendorsTable.slug,
      vendorType: vendorsTable.vendorType,
      iyzicoApiKey: vendorsTable.iyzicoApiKey,
      iyzicoSecretKey: vendorsTable.iyzicoSecretKey,
      iyzicoSandbox: vendorsTable.iyzicoSandbox,
    })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, ord.vendorId))
    .limit(1);
  if (!v?.iyzicoApiKey || !v.iyzicoSecretKey) {
    res.status(500).type("html").send("<!DOCTYPE html><html><body>Yapılandırma hatası</body></html>");
    return;
  }
  const ret = await iyzicoCheckoutFormRetrieve(
    v.iyzicoApiKey.trim(),
    v.iyzicoSecretKey.trim(),
    v.iyzicoSandbox !== false,
    ord.orderNumber,
    token,
  );
  if ("error" in ret) {
    res
      .status(200)
      .type("html")
      .send(`<!DOCTYPE html><html><body>Ödeme doğrulanamadı: ${ret.error}</body></html>`);
    return;
  }
  const ok = String(ret.paymentStatus || "").toLowerCase() === "success";
  if (ok) {
    await db
      .update(deliveryOrdersTable)
      .set({
        paymentStatus: "paid",
        paymentMethod: "iyzico",
        trCheckoutToken: null,
        updatedAt: new Date(),
      })
      .where(eq(deliveryOrdersTable.id, ord.id));
  }
  const origin = sitePublicOrigin();
  const retPath = publicOrderReturnPath(v.vendorType, v.slug);
  const redir = `${origin}${retPath}?order=${encodeURIComponent(ord.orderNumber)}&pay=${ok ? 1 : 0}`;
  res
    .status(200)
    .type("html")
    .send(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=${redir}"/></head><body><p>Yönlendiriliyor… <a href="${redir}">Tıklayın</a></p></body></html>`,
    );
});

type DeliveryOrderAccessRow = {
  id: number;
  orderNumber: string;
  customerPhone: string;
  customerId: number | null;
};

function trackingTokenFromRequest(req: Request): string | undefined {
  const q = req.query.token ?? req.query.t;
  if (typeof q === "string" && q.trim()) return q.trim();
  const h = req.headers["x-delivery-tracking-token"];
  return typeof h === "string" && h.trim() ? h.trim() : undefined;
}

function phoneLast4FromRequest(req: Request): string | undefined {
  const q = req.query.phoneLast4 ?? req.query.last4;
  return typeof q === "string" && q.trim() ? q.trim() : undefined;
}

async function assertDeliveryOrderCustomerAccess(
  req: Request,
  res: Response,
  order: DeliveryOrderAccessRow,
): Promise<boolean> {
  if (denyUnlessAdminMaintenance(req, res, "teslimat")) return true;

  const token = trackingTokenFromRequest(req);
  if (token && verifyDeliveryTrackingToken(order.id, order.orderNumber, token)) return true;

  const last4 = phoneLast4FromRequest(req);
  if (last4 && phoneLast4Matches(order.customerPhone, last4)) return true;

  const shopUser = await getShopUser(req);
  if (shopUser && order.customerId != null && shopUser.id === order.customerId) return true;

  res.status(403).json({
    error: "Sipariş takibi için geçerli bağlantı veya telefon doğrulaması gerekli.",
    code: "TRACKING_AUTH_REQUIRED",
  });
  return false;
}

/** Genel sipariş takibi — sipariş kodu + tracking token veya telefon son 4 hane */
router.get("/delivery/track/:orderNumber", async (req, res): Promise<void> => {
  const orderNumber = String(req.params.orderNumber ?? "").trim();
  if (!orderNumber || orderNumber.length > 80) {
    res.status(400).json({ success: false, error: "Geçersiz sipariş kodu" });
    return;
  }
  const [order] = await db.select().from(deliveryOrdersTable).where(eq(deliveryOrdersTable.orderNumber, orderNumber)).limit(1);
  if (!order) {
    res.status(404).json({ success: false, error: "Sipariş bulunamadı" });
    return;
  }
  if (!(await assertDeliveryOrderCustomerAccess(req, res, order))) return;
  const [vendor] = await db
    .select({
      name: vendorsTable.name,
      slug: vendorsTable.slug,
      phone: vendorsTable.phone,
      email: vendorsTable.email,
      whatsapp: vendorsTable.whatsapp,
      address: vendorsTable.address,
      city: vendorsTable.city,
    })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, order.vendorId))
    .limit(1);
  const statusEvents = await db
    .select()
    .from(deliveryOrderStatusEventsTable)
    .where(eq(deliveryOrderStatusEventsTable.orderId, order.id))
    .orderBy(asc(deliveryOrderStatusEventsTable.createdAt));
  let itemsParsed: unknown[] = [];
  try {
    const raw = JSON.parse(order.items || "[]") as unknown;
    itemsParsed = Array.isArray(raw) ? raw : [];
  } catch {
    itemsParsed = [];
  }
  const itemsSummary = itemsParsed.map((it) => {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const name = String(o.name ?? o.title ?? "Ürün");
    const qty = Number(o.quantity ?? o.qty ?? 1) || 1;
    const price = o.price != null ? String(o.price) : "";
    return { name, quantity: qty, price };
  });
  const lastEvent = statusEvents.length ? statusEvents[statusEvents.length - 1] : null;
  res.json({
    success: true,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: DELIVERY_STATUS_NOTIFY_LABELS[order.status] ?? order.status,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerCity: order.customerCity,
      customerDistrict: order.customerDistrict,
      customerPostalCode: order.customerPostalCode,
      items: itemsSummary,
      geliverTrackingNumber: order.geliverTrackingNumber,
      geliverLabelUrl: order.geliverLabelUrl,
      vendorNote: order.vendorNote,
      estimatedTime: order.estimatedTime,
      notes: order.notes,
    },
    vendor: vendor ?? null,
    timeline: statusEvents.map((e) => ({
      at: e.createdAt,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      toLabel: DELIVERY_STATUS_NOTIFY_LABELS[e.toStatus] ?? e.toStatus,
      note: e.note,
    })),
    lastUpdate: lastEvent?.createdAt ?? order.updatedAt,
  });
});

/* Müşteri telefon ile sipariş geçmişi — tam telefon + son 4 hane doğrulaması */
router.get("/delivery/orders/by-phone", async (req, res): Promise<void> => {
  const phone = normalizeDeliveryPhone(String(req.query.phone ?? ""));
  const last4 = normalizeDeliveryPhone(String(req.query.last4 ?? req.query.phoneLast4 ?? "")).slice(-4);
  if (phone.length < 10 || last4.length !== 4) {
    res.status(400).json({ error: "Telefon numarası ve son 4 hane gerekli" });
    return;
  }
  if (!phone.endsWith(last4)) {
    res.status(403).json({ error: "Telefon doğrulaması başarısız" });
    return;
  }
  const rows = await db.select({
    id: deliveryOrdersTable.id,
    orderNumber: deliveryOrdersTable.orderNumber,
    status: deliveryOrdersTable.status,
    totalAmount: deliveryOrdersTable.total,
    createdAt: deliveryOrdersTable.createdAt,
    vendorId: deliveryOrdersTable.vendorId,
    items: deliveryOrdersTable.items,
  }).from(deliveryOrdersTable)
    .where(sql`regexp_replace(${deliveryOrdersTable.customerPhone}, '[^0-9]', '', 'g') = ${phone}`)
    .orderBy(desc(deliveryOrdersTable.createdAt))
    .limit(20);
  const vendorIds = [...new Set(rows.map(r => r.vendorId))];
  const vendorNames: Record<number, string> = {};
  if (vendorIds.length > 0) {
    const vs = await db.select({ id: vendorsTable.id, name: vendorsTable.name })
      .from(vendorsTable).where(inArray(vendorsTable.id, vendorIds));
    vs.forEach(v => { vendorNames[v.id] = v.name; });
  }
  res.json(rows.map(r => ({
    ...r,
    vendorName: vendorNames[r.vendorId] ?? null,
    trackingToken: signDeliveryTrackingToken(r.id, r.orderNumber),
  })));
});

router.get("/delivery/orders/:orderNumber", async (req, res): Promise<void> => {
  const [order] = await db.select().from(deliveryOrdersTable)
    .where(eq(deliveryOrdersTable.orderNumber, req.params.orderNumber)).limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  if (!(await assertDeliveryOrderCustomerAccess(req, res, order))) return;
  /* Vendor phone bilgisini ekle */
  const [vendor] = await db.select({ phone: vendorsTable.phone, name: vendorsTable.name })
    .from(vendorsTable).where(eq(vendorsTable.id, order.vendorId)).limit(1);
  /* Yorum yapılmış mı? */
  const [existingReview] = await db.select({ id: vendorReviewsTable.id })
    .from(vendorReviewsTable).where(eq(vendorReviewsTable.orderId, order.id)).limit(1);
  const statusEvents = await db.select().from(deliveryOrderStatusEventsTable)
    .where(eq(deliveryOrderStatusEventsTable.orderId, order.id))
    .orderBy(asc(deliveryOrderStatusEventsTable.createdAt));
  res.json({
    ...order,
    trackingToken: signDeliveryTrackingToken(order.id, order.orderNumber),
    totalAmount: order.total,
    vendorPhone: vendor?.phone ?? null,
    vendorName: vendor?.name ?? null,
    courierName: order.driverName ?? null,
    courierPhone: order.driverPhone ?? null,
    hasReview: !!existingReview,
    statusEvents,
  });
});

/* Müşteri için canlı kurye konumu (sipariş bazlı son nokta) */
router.get("/delivery/orders/:orderNumber/driver-location", async (req, res): Promise<void> => {
  const [order] = await db.select({
    id: deliveryOrdersTable.id,
    orderNumber: deliveryOrdersTable.orderNumber,
    customerPhone: deliveryOrdersTable.customerPhone,
    customerId: deliveryOrdersTable.customerId,
    status: deliveryOrdersTable.status,
    driverPhone: deliveryOrdersTable.driverPhone,
  }).from(deliveryOrdersTable)
    .where(eq(deliveryOrdersTable.orderNumber, req.params.orderNumber))
    .limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  if (!(await assertDeliveryOrderCustomerAccess(req, res, order))) return;

  if (!order.driverPhone || !["picked_up", "on_the_way"].includes(order.status)) {
    res.json({ success: true, live: false, reason: "no_active_driver" });
    return;
  }

  const rows = await db.execute<{
    id: number;
    order_id: number | null;
    courier_phone: string;
    lat: number;
    lng: number;
    accuracy: number | null;
    heading: number | null;
    speed: number | null;
    created_at: Date;
  }>(sql`
    SELECT id, order_id, courier_phone, lat, lng, accuracy, heading, speed, created_at
    FROM driver_locations
    WHERE courier_phone = ${order.driverPhone}
      AND order_id = ${order.id}
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const latest = rows.rows[0];
  if (!latest) {
    res.json({ success: true, live: false, reason: "no_location" });
    return;
  }
  const ageMs = Date.now() - new Date(latest.created_at).getTime();
  const isFresh = ageMs <= 5 * 60 * 1000;
  res.json({
    success: true,
    live: isFresh,
    stale: !isFresh,
    ageSec: Math.max(0, Math.round(ageMs / 1000)),
    location: {
      id: latest.id,
      orderId: latest.order_id,
      courierPhone: latest.courier_phone,
      lat: latest.lat,
      lng: latest.lng,
      accuracy: latest.accuracy,
      heading: latest.heading,
      speed: latest.speed,
      createdAt: latest.created_at,
    },
  });
});

/* Sipariş üzerinden yorum yap */
router.post("/delivery/orders/:orderNumber/review", async (req, res): Promise<void> => {
  const { customerName, rating, comment } = req.body as { customerName: string; rating: number; comment?: string };
  if (!customerName || !rating) { res.status(400).json({ error: "Eksik bilgi" }); return; }
  const [order] = await db.select({
    id: deliveryOrdersTable.id,
    orderNumber: deliveryOrdersTable.orderNumber,
    vendorId: deliveryOrdersTable.vendorId,
    customerPhone: deliveryOrdersTable.customerPhone,
    customerId: deliveryOrdersTable.customerId,
    status: deliveryOrdersTable.status,
  })
    .from(deliveryOrdersTable).where(eq(deliveryOrdersTable.orderNumber, req.params.orderNumber)).limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  if (!(await assertDeliveryOrderCustomerAccess(req, res, order))) return;
  if (order.status !== "delivered") { res.status(400).json({ error: "Sadece teslim edilen siparişler değerlendirilebilir" }); return; }
  const [existing] = await db.select({ id: vendorReviewsTable.id })
    .from(vendorReviewsTable).where(eq(vendorReviewsTable.orderId, order.id)).limit(1);
  if (existing) { res.status(400).json({ error: "Bu sipariş zaten değerlendirildi" }); return; }
  const [row] = await db.insert(vendorReviewsTable)
    .values({ vendorId: order.vendorId, orderId: order.id, customerName, rating, comment })
    .returning();
  /* Vendor ortalama puanını güncelle */
  const avgResult = await db.execute<{ avg: string; cnt: string }>(
    sql`SELECT AVG(rating)::numeric(3,1) as avg, COUNT(*) as cnt FROM vendor_reviews WHERE vendor_id = ${order.vendorId} AND active = true`
  );
  const avg = parseFloat((avgResult.rows[0] as { avg: string })?.avg ?? "0");
  const cnt = parseInt((avgResult.rows[0] as { cnt: string })?.cnt ?? "0");
  await db.update(vendorsTable).set({ rating: avg, reviewCount: cnt }).where(eq(vendorsTable.id, order.vendorId));
  res.status(201).json(row);
});

/* Müşteri siparişi iptal et */
router.patch("/delivery/orders/:orderNumber/cancel", async (req, res): Promise<void> => {
  const { reason } = req.body as { reason?: string };
  const [order] = await db.select({
    id: deliveryOrdersTable.id,
    orderNumber: deliveryOrdersTable.orderNumber,
    status: deliveryOrdersTable.status,
    vendorId: deliveryOrdersTable.vendorId,
    customerPhone: deliveryOrdersTable.customerPhone,
    customerId: deliveryOrdersTable.customerId,
  })
    .from(deliveryOrdersTable).where(eq(deliveryOrdersTable.orderNumber, req.params.orderNumber)).limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  if (!(await assertDeliveryOrderCustomerAccess(req, res, order))) return;
  if (!["pending", "confirmed"].includes(order.status)) {
    res.status(400).json({ error: "Bu aşamada sipariş iptal edilemez" }); return;
  }
  const prev = order.status;
  await db.update(deliveryOrdersTable).set({
    status: "cancelled", cancelledAt: new Date(),
    cancelReason: reason || "Müşteri iptal etti", updatedAt: new Date(),
  }).where(eq(deliveryOrdersTable.id, order.id));
  await insertDeliveryStatusEvent({
    orderId: order.id,
    fromStatus: prev,
    toStatus: "cancelled",
    source: "customer_cancel",
    note: reason || null,
  }).catch(() => {});
  notifyVendorWhatsApp({
    vendorId: order.vendorId,
    eventType: "order_status",
    details: `Sipariş #${order.orderNumber}\nMüşteri iptal etti (${DELIVERY_STATUS_NOTIFY_LABELS[prev] ?? prev} → İptal)`,
  }).catch(() => {});
  res.json({ success: true });
});

/* Sipariş mesajları — GET */
router.get("/delivery/orders/:orderNumber/messages", async (req, res): Promise<void> => {
  const [order] = await db.select({
    id: deliveryOrdersTable.id,
    orderNumber: deliveryOrdersTable.orderNumber,
    customerPhone: deliveryOrdersTable.customerPhone,
    customerId: deliveryOrdersTable.customerId,
  })
    .from(deliveryOrdersTable).where(eq(deliveryOrdersTable.orderNumber, req.params.orderNumber)).limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  if (!(await assertDeliveryOrderCustomerAccess(req, res, order))) return;
  const msgs = await db.select().from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, order.id))
    .orderBy(orderMessagesTable.createdAt);
  res.json(msgs);
});

/* Sipariş mesajları — POST */
router.post("/delivery/orders/:orderNumber/messages", async (req, res): Promise<void> => {
  const { senderType, senderName, message } = req.body as { senderType: string; senderName: string; message: string };
  if (!senderType || !senderName || !message?.trim()) {
    res.status(400).json({ error: "Eksik bilgi" }); return;
  }
  const [order] = await db.select({
    id: deliveryOrdersTable.id,
    orderNumber: deliveryOrdersTable.orderNumber,
    customerPhone: deliveryOrdersTable.customerPhone,
    customerId: deliveryOrdersTable.customerId,
  })
    .from(deliveryOrdersTable).where(eq(deliveryOrdersTable.orderNumber, req.params.orderNumber)).limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  if (!(await assertDeliveryOrderCustomerAccess(req, res, order))) return;
  const [msg] = await db.insert(orderMessagesTable).values({
    orderId: order.id, senderType, senderName, message: message.trim(),
  }).returning();
  res.status(201).json(msg);
});

router.get("/delivery/orders", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const { vendorId, status, limit = "50", offset = "0", search, withVendor } = req.query as Record<string, string>;
  let conditions: ReturnType<typeof eq>[] = [];
  if (vendorId) conditions.push(eq(deliveryOrdersTable.vendorId, parseInt(vendorId)));
  if (status) conditions.push(eq(deliveryOrdersTable.status, status));
  if (search) {
    conditions.push(or(
      ilike(deliveryOrdersTable.orderNumber, `%${search}%`),
      ilike(deliveryOrdersTable.customerName, `%${search}%`),
      ilike(deliveryOrdersTable.customerPhone, `%${search}%`),
    ) as ReturnType<typeof eq>);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(deliveryOrdersTable)
    .where(where)
    .orderBy(desc(deliveryOrdersTable.createdAt))
    .limit(parseInt(limit)).offset(parseInt(offset));

  const normalize = (r: typeof rows[0] & { vendorName?: string }) => ({
    ...r, totalAmount: (r as Record<string, unknown>).total ?? r.total,
  });

  if (withVendor === "true") {
    const vendorIds = [...new Set(rows.map(r => r.vendorId))];
    const vendorNames: Record<number, string> = {};
    if (vendorIds.length > 0) {
      const vs = await db.select({ id: vendorsTable.id, name: vendorsTable.name })
        .from(vendorsTable).where(inArray(vendorsTable.id, vendorIds));
      vs.forEach(v => { vendorNames[v.id] = v.name; });
    }
    res.json(rows.map(r => normalize({ ...r, vendorName: vendorNames[r.vendorId] ?? null })));
    return;
  }
  res.json(rows.map(normalize));
});

router.put("/delivery/orders/:id/status", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const id = parseInt(req.params.id);
  const body = req.body as { status?: string; cancelReason?: string; estimatedTime?: number };
  const { status } = body;
  if (!status || typeof status !== "string") {
    res.status(400).json({ error: "status gerekli" }); return;
  }

  const [existing] = await db.select().from(deliveryOrdersTable).where(eq(deliveryOrdersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }

  const from = existing.status;
  const gate = deliveryStatusTransitionAllowed("admin", from, status);
  if (!gate.ok) { res.status(400).json({ error: gate.error }); return; }

  if (from === status) {
    if (from === "confirmed" && body.estimatedTime !== undefined && body.estimatedTime !== null) {
      const et = Math.round(Number(body.estimatedTime));
      if (Number.isFinite(et) && et > 0 && et <= 300) {
        const [patched] = await db.update(deliveryOrdersTable)
          .set({ estimatedTime: et, updatedAt: new Date() })
          .where(eq(deliveryOrdersTable.id, id))
          .returning();
        if (patched) {
          res.json({ ...patched, totalAmount: patched.total });
          return;
        }
      }
    }
    res.json({ ...existing, totalAmount: existing.total });
    return;
  }

  const now = new Date();
  const extra: Record<string, Date | null> = {};
  if (status === "confirmed") extra.confirmedAt = now;
  if (status === "preparing") extra.preparedAt = now;
  if (status === "picked_up" || status === "on_the_way") extra.pickedUpAt = now;
  if (status === "delivered") extra.deliveredAt = now;
  if (status === "cancelled") extra.cancelledAt = now;

  let cancelReasonDb: string | undefined;
  if (status === "cancelled") {
    const cr = typeof body.cancelReason === "string" ? body.cancelReason.trim().slice(0, 500) : "";
    cancelReasonDb = cr || "İptal (yönetim)";
  }

  let estimatedTimeVal: number | undefined;
  if (status === "confirmed" && body.estimatedTime !== undefined && body.estimatedTime !== null) {
    const et = Math.round(Number(body.estimatedTime));
    if (Number.isFinite(et) && et > 0 && et <= 300) estimatedTimeVal = et;
  }

  const [row] = await db.update(deliveryOrdersTable)
    .set({
      status,
      ...extra,
      updatedAt: now,
      ...(cancelReasonDb !== undefined ? { cancelReason: cancelReasonDb } : {}),
      ...(estimatedTimeVal !== undefined ? { estimatedTime: estimatedTimeVal } : {}),
    })
    .where(eq(deliveryOrdersTable.id, id)).returning();

  if (!row) { res.status(500).json({ error: "Güncelleme başarısız" }); return; }

  const eventNote = status === "cancelled" ? (cancelReasonDb ?? null) : null;

  await insertDeliveryStatusEvent({
    orderId: id,
    fromStatus: from,
    toStatus: status,
    source: "admin_api",
    note: eventNote,
  }).catch(() => {});

  const waExtra = status === "cancelled" && cancelReasonDb
    ? `\nNeden: ${cancelReasonDb}`
    : "";
  notifyVendorWhatsApp({
    vendorId: row.vendorId,
    eventType: "order_status",
    details: `Sipariş #${row.orderNumber}\n${DELIVERY_STATUS_NOTIFY_LABELS[from] ?? from} → ${DELIVERY_STATUS_NOTIFY_LABELS[status] ?? status}${waExtra}`,
  }).catch(() => {});

  res.json(row);
});

/* — REVIEWS ────────────────────────────────────────────────────── */

router.post("/delivery/reviews", async (req, res): Promise<void> => {
  const { vendorId, orderId, customerName, rating, comment } = req.body;
  if (!vendorId || !customerName || !rating) {
    res.status(400).json({ error: "Zorunlu alanlar eksik" }); return;
  }
  const [row] = await db.insert(vendorReviewsTable).values({ vendorId, orderId, customerName, rating, comment }).returning();

  const avgResult = await db.execute<{ avg: string; cnt: string }>(
    sql`SELECT AVG(rating)::numeric(3,1) as avg, COUNT(*) as cnt FROM vendor_reviews WHERE vendor_id = ${vendorId} AND active = true`
  );
  const avg = parseFloat((avgResult.rows[0] as { avg: string })?.avg ?? "0");
  const cnt = parseInt((avgResult.rows[0] as { cnt: string })?.cnt ?? "0");
  await db.update(vendorsTable).set({ rating: avg, reviewCount: cnt }).where(eq(vendorsTable.id, vendorId));

  res.status(201).json(row);
});

/* — MIGRATION ──────────────────────────────────────────────────── */

/* — Tüm Vendorları Haritaya Senkronize Et ─────────────────────── */
router.post("/delivery/sync-to-map", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const allVendors = await db.select().from(vendorsTable).where(eq(vendorsTable.active, true));
  let synced = 0;
  for (const v of allVendors) {
    await syncVendorToMapBusiness(v);
    synced++;
  }
  res.json({ ok: true, synced });
});

/** Tek seferlik: tüm vendor'ları harita + map_products menü senkronuna zorla (deploy sonrası) */
router.post("/delivery/resync-map-from-vendors", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const n = await resyncAllVendorsToMap();
  res.json({ ok: true, synced: n });
});

router.post("/delivery/migrate", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS delivery_order_status_events (
      id serial PRIMARY KEY NOT NULL,
      order_id integer NOT NULL,
      from_status text,
      to_status text NOT NULL,
      source text NOT NULL DEFAULT 'api',
      note text,
      created_at timestamp DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS delivery_order_status_events_order_id_idx ON delivery_order_status_events (order_id);
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id serial PRIMARY KEY NOT NULL,
      stripe_event_id text NOT NULL,
      event_type text NOT NULL,
      outcome text NOT NULL,
      detail text,
      related_order_id integer,
      created_at timestamp DEFAULT now() NOT NULL,
      CONSTRAINT stripe_webhook_events_stripe_event_id_unique UNIQUE (stripe_event_id)
    );
    CREATE INDEX IF NOT EXISTS stripe_webhook_events_event_type_idx ON stripe_webhook_events (event_type);
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type TEXT NOT NULL DEFAULT 'delivery';
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shipping_time INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS free_shipping_above DECIMAL(10,2);
    ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS sku TEXT;
    ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS brand TEXT;
    ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS images TEXT[];
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS whatsapp TEXT;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS callmebot_key TEXT;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS map_business_id INTEGER;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT;
    CREATE TABLE IF NOT EXISTS vendor_item_options (
      id serial PRIMARY KEY NOT NULL,
      menu_item_id integer NOT NULL,
      name text NOT NULL,
      required boolean NOT NULL DEFAULT false,
      multiple boolean NOT NULL DEFAULT true,
      choices jsonb NOT NULL DEFAULT '[]'::jsonb
    );
  `);
  res.json({ ok: true });
});

/* — ADMIN: SEED DEMO DATA ──────────────────────────────────────── */

router.post("/delivery/seed-ecommerce", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const ecomCats = [
    { name: "Giyim & Moda", slug: "giyim", icon: "👕", position: 0 },
    { name: "Elektronik", slug: "elektronik", icon: "📱", position: 1 },
    { name: "Ev & Yaşam", slug: "ev-yasam", icon: "🏠", position: 2 },
    { name: "Kozmetik", slug: "kozmetik", icon: "💄", position: 3 },
    { name: "Kitap & Hobi", slug: "kitap", icon: "📚", position: 4 },
    { name: "Spor", slug: "spor", icon: "⚽", position: 5 },
    { name: "Oyuncak", slug: "oyuncak", icon: "🧸", position: 6 },
    { name: "Süpermarket", slug: "supermarket", icon: "🛒", position: 7 },
  ];
  for (const cat of ecomCats) {
    await db.insert(vendorCategoriesTable).values(cat).onConflictDoNothing();
  }

  const [giyimCat] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.slug, "giyim")).limit(1);
  const [elektronikCat] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.slug, "elektronik")).limit(1);
  const [evCat] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.slug, "ev-yasam")).limit(1);

  const ecomVendors = [
    {
      name: "ModaTR", slug: "modatr", categoryId: giyimCat?.id, vendorType: "ecommerce",
      description: "Türk tasarımcıların en şık koleksiyonları", city: "İstanbul",
      phone: "0850 000 0010", shippingFee: "0", freeShippingAbove: "300", shippingTime: 2,
      rating: 4.6, reviewCount: 312, featured: true, isOpen: true,
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1558171813-0a60c91c8616?w=800&h=400&fit=crop",
      tags: ["giyim", "moda", "kadın", "erkek"],
    },
    {
      name: "TeknoShop", slug: "teknoshop", categoryId: elektronikCat?.id, vendorType: "ecommerce",
      description: "En güncel teknoloji ürünleri uygun fiyatlarla", city: "Ankara",
      phone: "0850 000 0011", shippingFee: "25", freeShippingAbove: "500", shippingTime: 3,
      rating: 4.4, reviewCount: 187, featured: true, isOpen: true,
      imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop",
      tags: ["elektronik", "telefon", "bilgisayar"],
    },
    {
      name: "EvimGuzel", slug: "evimguzel", categoryId: evCat?.id, vendorType: "ecommerce",
      description: "Evinizi güzelleştiren dekorasyon ve yaşam ürünleri", city: "İzmir",
      phone: "0850 000 0012", shippingFee: "30", freeShippingAbove: "400", shippingTime: 4,
      rating: 4.7, reviewCount: 94, featured: false, isOpen: true,
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=400&fit=crop",
      tags: ["ev", "dekorasyon", "mobilya"],
    },
  ];

  for (const v of ecomVendors) {
    await db.insert(vendorsTable).values(v as typeof v & { minOrderAmount: string }).onConflictDoNothing();
  }

  const modaVendor = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, "modatr")).limit(1);
  if (modaVendor[0]) {
    const vid = modaVendor[0].id;
    const cats = [
      { vendorId: vid, name: "Kadın Giyim", position: 0 },
      { vendorId: vid, name: "Erkek Giyim", position: 1 },
      { vendorId: vid, name: "Aksesuar", position: 2 },
    ];
    for (const c of cats) {
      const ex = await db.select({ id: vendorMenuCategoriesTable.id }).from(vendorMenuCategoriesTable)
        .where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, c.name))).limit(1);
      if (!ex[0]) await db.insert(vendorMenuCategoriesTable).values(c);
    }
    const [kadinCat] = await db.select().from(vendorMenuCategoriesTable).where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, "Kadın Giyim"))).limit(1);
    const [erkekCat] = await db.select().from(vendorMenuCategoriesTable).where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, "Erkek Giyim"))).limit(1);
    const products = [
      { vendorId: vid, menuCategoryId: kadinCat?.id, name: "Yazlık Elbise", price: "299.00", isPopular: true, description: "Şifon kumaş, çiçek desenli", imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=400&fit=crop" },
      { vendorId: vid, menuCategoryId: kadinCat?.id, name: "Jean Pantolon", price: "399.00", salePrice: "299.00", description: "Slim fit, yüksek bel", imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&h=400&fit=crop" },
      { vendorId: vid, menuCategoryId: kadinCat?.id, name: "Keten Bluz", price: "199.00", description: "%100 keten, nefes alır", imageUrl: "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=300&h=400&fit=crop" },
      { vendorId: vid, menuCategoryId: erkekCat?.id, name: "Polo Yaka Tişört", price: "249.00", isPopular: true, description: "Pamuklu, regular fit", imageUrl: "https://images.unsplash.com/photo-1622445275576-721325763afe?w=300&h=400&fit=crop" },
      { vendorId: vid, menuCategoryId: erkekCat?.id, name: "Chino Pantolon", price: "449.00", salePrice: "349.00", description: "Slim fit, esnek kumaş", imageUrl: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=300&h=400&fit=crop" },
    ];
    for (const p of products) {
      const ex = await db.select({ id: vendorMenuItemsTable.id }).from(vendorMenuItemsTable)
        .where(and(eq(vendorMenuItemsTable.vendorId, vid), eq(vendorMenuItemsTable.name, p.name))).limit(1);
      if (!ex[0]) await db.insert(vendorMenuItemsTable).values(p);
    }
  }

  const teknoVendor = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, "teknoshop")).limit(1);
  if (teknoVendor[0]) {
    const vid = teknoVendor[0].id;
    const cats2 = [
      { vendorId: vid, name: "Telefon & Tablet", position: 0 },
      { vendorId: vid, name: "Bilgisayar", position: 1 },
      { vendorId: vid, name: "Aksesuar", position: 2 },
    ];
    for (const c of cats2) {
      const ex = await db.select({ id: vendorMenuCategoriesTable.id }).from(vendorMenuCategoriesTable)
        .where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, c.name))).limit(1);
      if (!ex[0]) await db.insert(vendorMenuCategoriesTable).values(c);
    }
    const [telCat] = await db.select().from(vendorMenuCategoriesTable).where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, "Telefon & Tablet"))).limit(1);
    const [bilCat] = await db.select().from(vendorMenuCategoriesTable).where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, "Bilgisayar"))).limit(1);
    const techProducts = [
      { vendorId: vid, menuCategoryId: telCat?.id, name: "Akıllı Telefon Pro", price: "24999.00", isPopular: true, description: "6.7 inç AMOLED, 256GB", imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop" },
      { vendorId: vid, menuCategoryId: telCat?.id, name: "Tablet 10\"", price: "12999.00", salePrice: "10999.00", description: "10 inç, 128GB, WiFi", imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop" },
      { vendorId: vid, menuCategoryId: bilCat?.id, name: "Laptop 15\"", price: "34999.00", isPopular: true, description: "i7, 16GB RAM, 512GB SSD", imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop" },
      { vendorId: vid, menuCategoryId: bilCat?.id, name: "Kablosuz Mouse", price: "599.00", salePrice: "449.00", description: "Ergonomik tasarım", imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=300&fit=crop" },
    ];
    for (const p of techProducts) {
      const ex = await db.select({ id: vendorMenuItemsTable.id }).from(vendorMenuItemsTable)
        .where(and(eq(vendorMenuItemsTable.vendorId, vid), eq(vendorMenuItemsTable.name, p.name))).limit(1);
      if (!ex[0]) await db.insert(vendorMenuItemsTable).values(p);
    }
  }

  res.json({ success: true, message: "E-ticaret demo verileri eklendi" });
});

router.post("/delivery/seed", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  const categories = [
    { name: "Yemek", slug: "yemek", icon: "🍔", position: 0 },
    { name: "Market", slug: "market", icon: "🛒", position: 1 },
    { name: "Eczane", slug: "eczane", icon: "💊", position: 2 },
    { name: "Çiçek", slug: "cicek", icon: "🌸", position: 3 },
    { name: "Su & İçecek", slug: "icecek", icon: "💧", position: 4 },
    { name: "Kafe", slug: "kafe", icon: "☕", position: 5 },
  ];

  for (const cat of categories) {
    await db.insert(vendorCategoriesTable).values(cat).onConflictDoNothing();
  }

  const [yemekCat] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.slug, "yemek")).limit(1);
  const [kafeCat] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.slug, "kafe")).limit(1);

  const vendors = [
    {
      name: "Burgerci Mehmet", slug: "burgerci-mehmet", categoryId: yemekCat?.id,
      description: "Türkiye'nin en lezzetli ev yapımı burgerleri", city: "İstanbul", district: "Kadıköy",
      address: "Moda Cad. No:15, Kadıköy", phone: "0216 000 0001",
      deliveryFee: "12.00", minOrderAmount: "80.00", deliveryTime: 25,
      rating: 4.7, reviewCount: 142, featured: true, isOpen: true,
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=400&fit=crop",
      tags: ["burger", "fast food", "american"],
    },
    {
      name: "Pizza Napoli", slug: "pizza-napoli", categoryId: yemekCat?.id,
      description: "Napoli usulü odun ateşinde pişirilmiş pizzalar", city: "İstanbul", district: "Beşiktaş",
      address: "Barbaros Blv. No:42, Beşiktaş", phone: "0212 000 0002",
      deliveryFee: "15.00", minOrderAmount: "100.00", deliveryTime: 35,
      rating: 4.5, reviewCount: 89, featured: true, isOpen: true,
      imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=400&fit=crop",
      tags: ["pizza", "italyan"],
    },
    {
      name: "Sushi House", slug: "sushi-house", categoryId: yemekCat?.id,
      description: "Japon mutfağının en özel lezzetleri", city: "Ankara", district: "Çankaya",
      address: "Tunalı Hilmi Cad. No:8, Çankaya", phone: "0312 000 0003",
      deliveryFee: "20.00", minOrderAmount: "150.00", deliveryTime: 45,
      rating: 4.8, reviewCount: 201, featured: false, isOpen: true,
      imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&h=400&fit=crop",
      tags: ["sushi", "japon", "deniz ürünleri"],
    },
    {
      name: "Kahve Durağı", slug: "kahve-duragi", categoryId: kafeCat?.id,
      description: "Özel filtre kahveler ve ev yapımı pastalar", city: "İzmir", district: "Konak",
      address: "Alsancak, İzmir", phone: "0232 000 0004",
      deliveryFee: "8.00", minOrderAmount: "50.00", deliveryTime: 20,
      rating: 4.6, reviewCount: 67, featured: true, isOpen: true,
      imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=400&fit=crop",
      tags: ["kahve", "kafe", "pasta"],
    },
  ];

  for (const vendor of vendors) {
    await db.insert(vendorsTable).values(vendor as typeof vendor & { minOrderAmount: string }).onConflictDoNothing();
  }

  const burgerVendor = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, "burgerci-mehmet")).limit(1);
  if (burgerVendor[0]) {
    const vid = burgerVendor[0].id;
    const cats = [
      { vendorId: vid, name: "Burgerler", position: 0 },
      { vendorId: vid, name: "Yan Ürünler", position: 1 },
      { vendorId: vid, name: "İçecekler", position: 2 },
    ];
    for (const c of cats) {
      await db.insert(vendorMenuCategoriesTable).values(c).onConflictDoNothing();
    }
    const [burgerCat] = await db.select().from(vendorMenuCategoriesTable).where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, "Burgerler"))).limit(1);
    const [yanCat] = await db.select().from(vendorMenuCategoriesTable).where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, "Yan Ürünler"))).limit(1);
    const [icecekCat] = await db.select().from(vendorMenuCategoriesTable).where(and(eq(vendorMenuCategoriesTable.vendorId, vid), eq(vendorMenuCategoriesTable.name, "İçecekler"))).limit(1);

    const items = [
      { vendorId: vid, menuCategoryId: burgerCat?.id, name: "Klasik Burger", price: "89.00", isPopular: true, description: "Dana köfte, domates, marul, özel sos", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop" },
      { vendorId: vid, menuCategoryId: burgerCat?.id, name: "Cheeseburger", price: "99.00", isPopular: true, description: "Çift köfte, cheddar peyniri, turşu", imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=300&h=200&fit=crop" },
      { vendorId: vid, menuCategoryId: burgerCat?.id, name: "Vegan Burger", price: "95.00", isVegan: true, description: "Nohut köfte, avokado, salata", imageUrl: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=300&h=200&fit=crop" },
      { vendorId: vid, menuCategoryId: yanCat?.id, name: "Patates Kızartması", price: "35.00", description: "Taze patates, çıtır çıtır" },
      { vendorId: vid, menuCategoryId: yanCat?.id, name: "Onion Rings", price: "40.00", description: "Çıtır soğan halkaları" },
      { vendorId: vid, menuCategoryId: icecekCat?.id, name: "Kola 330ml", price: "25.00" },
      { vendorId: vid, menuCategoryId: icecekCat?.id, name: "Limonata", price: "30.00", description: "Ev yapımı taze limonata" },
    ];
    for (const item of items) {
      const check = await db.select({ id: vendorMenuItemsTable.id }).from(vendorMenuItemsTable)
        .where(and(eq(vendorMenuItemsTable.vendorId, vid), eq(vendorMenuItemsTable.name, item.name))).limit(1);
      if (!check[0]) await db.insert(vendorMenuItemsTable).values(item);
    }
  }

  res.json({ success: true, message: "Demo veriler eklendi" });
});

/* — SEED: ALL CATEGORIES + DEMO FIRMS ─────────────────────────── */

async function upsertVendor(data: Record<string, unknown>) {
  const existing = await db.select({ id: vendorsTable.id })
    .from(vendorsTable).where(eq(vendorsTable.slug, data.slug as string)).limit(1);
  if (existing[0]) {
    await db.update(vendorsTable).set({ featured: true, updatedAt: new Date() }).where(eq(vendorsTable.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db.insert(vendorsTable).values(data as never).returning({ id: vendorsTable.id });
  return row.id;
}

async function upsertMenuCat(vendorId: number, name: string, pos: number) {
  const ex = await db.select({ id: vendorMenuCategoriesTable.id })
    .from(vendorMenuCategoriesTable)
    .where(and(eq(vendorMenuCategoriesTable.vendorId, vendorId), eq(vendorMenuCategoriesTable.name, name))).limit(1);
  if (ex[0]) return ex[0].id;
  const [row] = await db.insert(vendorMenuCategoriesTable).values({ vendorId, name, position: pos }).returning({ id: vendorMenuCategoriesTable.id });
  return row.id;
}

async function upsertItem(item: Record<string, unknown>) {
  const ex = await db.select({ id: vendorMenuItemsTable.id })
    .from(vendorMenuItemsTable)
    .where(and(eq(vendorMenuItemsTable.vendorId, item.vendorId as number), eq(vendorMenuItemsTable.name, item.name as string))).limit(1);
  if (!ex[0]) await db.insert(vendorMenuItemsTable).values(item as never);
}

router.post("/delivery/seed-complete", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "teslimat")) return;
  /* — DELIVERY CATEGORIES — */
  const delivCats = [
    { name: "Yemek", slug: "yemek", icon: "🍔", position: 0 },
    { name: "Market", slug: "market", icon: "🛒", position: 1 },
    { name: "Eczane", slug: "eczane", icon: "💊", position: 2 },
    { name: "Çiçek", slug: "cicek", icon: "🌸", position: 3 },
    { name: "Su & İçecek", slug: "icecek", icon: "💧", position: 4 },
    { name: "Kafe", slug: "kafe", icon: "☕", position: 5 },
  ];
  for (const c of delivCats) await db.insert(vendorCategoriesTable).values(c).onConflictDoNothing();

  /* — ECOM CATEGORIES — */
  const ecomCats = [
    { name: "Giyim & Moda", slug: "giyim", icon: "👕", position: 10 },
    { name: "Elektronik", slug: "elektronik", icon: "📱", position: 11 },
    { name: "Ev & Yaşam", slug: "ev-yasam", icon: "🏠", position: 12 },
    { name: "Kozmetik", slug: "kozmetik", icon: "💄", position: 13 },
    { name: "Kitap & Hobi", slug: "kitap", icon: "📚", position: 14 },
    { name: "Spor", slug: "spor", icon: "⚽", position: 15 },
    { name: "Oyuncak", slug: "oyuncak", icon: "🧸", position: 16 },
    { name: "Süpermarket", slug: "supermarket", icon: "🛒", position: 17 },
  ];
  for (const c of ecomCats) await db.insert(vendorCategoriesTable).values(c).onConflictDoNothing();

  /* — FETCH CAT IDs — */
  const getCat = async (slug: string) => {
    const [r] = await db.select({ id: vendorCategoriesTable.id }).from(vendorCategoriesTable).where(eq(vendorCategoriesTable.slug, slug)).limit(1);
    return r?.id;
  };

  /* ══════════════════════════════════════════════
     DELIVERY VENDORS + MENU
  ══════════════════════════════════════════════ */

  /* — YEMEK: Burgerci Mehmet (update existing to featured) — */
  const burgerVid = await upsertVendor({
    name: "Burgerci Mehmet", slug: "burgerci-mehmet", categoryId: await getCat("yemek"), vendorType: "delivery",
    description: "Türkiye'nin en lezzetli ev yapımı burgerleri", city: "İstanbul", district: "Kadıköy",
    address: "Moda Cad. No:15, Kadıköy", phone: "0216 000 0001",
    deliveryFee: "12.00", minOrderAmount: "80.00", deliveryTime: 25,
    rating: 4.7, reviewCount: 142, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=400&fit=crop",
    tags: ["burger", "fast food"],
  });
  const bCat1 = await upsertMenuCat(burgerVid, "Burgerler", 0);
  const bCat2 = await upsertMenuCat(burgerVid, "Yan Ürünler", 1);
  const bCat3 = await upsertMenuCat(burgerVid, "İçecekler", 2);
  const burgerItems = [
    { vendorId: burgerVid, menuCategoryId: bCat1, name: "Klasik Burger", description: "Dana köfte, domates, marul, özel sos", price: "89.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop" },
    { vendorId: burgerVid, menuCategoryId: bCat1, name: "Cheeseburger", description: "Çift köfte, cheddar peyniri, turşu", price: "99.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1550317138-10000687a72b?w=300&h=300&fit=crop" },
    { vendorId: burgerVid, menuCategoryId: bCat1, name: "Vegan Burger", description: "Nohut köfte, avokado, roka", price: "85.00", imageUrl: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=300&h=300&fit=crop" },
    { vendorId: burgerVid, menuCategoryId: bCat2, name: "Patates Kızartması", description: "Crispy patates, özel baharatlı tuz", price: "35.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=300&fit=crop" },
    { vendorId: burgerVid, menuCategoryId: bCat3, name: "Ayran", description: "Taze yapılmış soğuk ayran 500ml", price: "20.00", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop" },
  ];
  for (const item of burgerItems) await upsertItem(item);

  /* — MARKET: MarketExpress — */
  const marketVid = await upsertVendor({
    name: "MarketExpress", slug: "market-express", categoryId: await getCat("market"), vendorType: "delivery",
    description: "Kapınıza 30 dakikada taze market alışverişi", city: "İstanbul", district: "Şişli",
    address: "Halaskargazi Cad. No:80, Şişli", phone: "0212 000 0010",
    deliveryFee: "0.00", minOrderAmount: "150.00", deliveryTime: 30,
    rating: 4.6, reviewCount: 234, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=800&h=400&fit=crop",
    tags: ["market", "manav", "temizlik"],
  });
  const mCat1 = await upsertMenuCat(marketVid, "Meyve & Sebze", 0);
  const mCat2 = await upsertMenuCat(marketVid, "Süt & Kahvaltılık", 1);
  const mCat3 = await upsertMenuCat(marketVid, "Temizlik", 2);
  const marketItems = [
    { vendorId: marketVid, menuCategoryId: mCat1, name: "Domates (1kg)", description: "Taze sera domatesi", price: "24.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=300&h=300&fit=crop" },
    { vendorId: marketVid, menuCategoryId: mCat1, name: "Muz (1kg)", description: "Ekvador muzu, taze", price: "34.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop" },
    { vendorId: marketVid, menuCategoryId: mCat2, name: "Süt 1L", description: "Günlük taze tam yağlı süt", price: "29.90", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=300&fit=crop" },
    { vendorId: marketVid, menuCategoryId: mCat2, name: "Yumurta (12'li)", description: "Köy yumurtası, serbest gezen tavuk", price: "69.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=300&fit=crop" },
    { vendorId: marketVid, menuCategoryId: mCat3, name: "Sıvı Sabun 500ml", description: "Antibakteriyel el sabunu", price: "39.90", imageUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop" },
  ];
  for (const item of marketItems) await upsertItem(item);

  /* — ECZANE: EczanePlus — */
  const eczaneVid = await upsertVendor({
    name: "EczanePlus", slug: "eczane-plus", categoryId: await getCat("eczane"), vendorType: "delivery",
    description: "Reçetesiz ilaç ve sağlık ürünleri kapınıza gelsin", city: "Ankara", district: "Çankaya",
    address: "Tunalı Hilmi Cad. No:22, Çankaya", phone: "0312 000 0011",
    deliveryFee: "0.00", minOrderAmount: "50.00", deliveryTime: 20,
    rating: 4.8, reviewCount: 87, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=400&fit=crop",
    tags: ["eczane", "sağlık", "ilaç"],
  });
  const eCat1 = await upsertMenuCat(eczaneVid, "Vitamin & Takviye", 0);
  const eCat2 = await upsertMenuCat(eczaneVid, "Kişisel Bakım", 1);
  const eczaneItems = [
    { vendorId: eczaneVid, menuCategoryId: eCat1, name: "C Vitamini 1000mg (30 Tablet)", description: "Bağışıklık güçlendirici", price: "89.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop" },
    { vendorId: eczaneVid, menuCategoryId: eCat1, name: "D3 Vitamini (60 Kapsül)", description: "Günlük D vitamini ihtiyacı", price: "129.90", imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=300&fit=crop" },
    { vendorId: eczaneVid, menuCategoryId: eCat1, name: "Omega-3 Balık Yağı", description: "Kalp ve beyin sağlığı", price: "159.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&h=300&fit=crop" },
    { vendorId: eczaneVid, menuCategoryId: eCat2, name: "Güneş Kremi SPF50+", description: "UVA/UVB korumalı 50ml", price: "149.90", imageUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&h=300&fit=crop" },
    { vendorId: eczaneVid, menuCategoryId: eCat2, name: "El Dezenfektanı 250ml", description: "%70 alkollü jel", price: "49.90", imageUrl: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=300&h=300&fit=crop" },
  ];
  for (const item of eczaneItems) await upsertItem(item);

  /* — ÇİÇEK: ÇiçekBahçesi — */
  const cicekVid = await upsertVendor({
    name: "ÇiçekBahçesi", slug: "cicek-bahcesi", categoryId: await getCat("cicek"), vendorType: "delivery",
    description: "Taze çiçekler ve özel aranjmanlar, 2 saat içinde teslimat", city: "İzmir", district: "Bornova",
    address: "Atatürk Cad. No:55, Bornova", phone: "0232 000 0012",
    deliveryFee: "25.00", minOrderAmount: "100.00", deliveryTime: 90,
    rating: 4.9, reviewCount: 312, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1487530811015-780ca2a80cfc?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc98?w=800&h=400&fit=crop",
    tags: ["çiçek", "buket", "aranjman"],
  });
  const ccCat1 = await upsertMenuCat(cicekVid, "Buketler", 0);
  const ccCat2 = await upsertMenuCat(cicekVid, "Saksı Çiçekleri", 1);
  const cicekItems = [
    { vendorId: cicekVid, menuCategoryId: ccCat1, name: "Kırmızı Gül Buketi (11 Dal)", description: "Premium kırmızı gül, özel paketleme", price: "349.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop" },
    { vendorId: cicekVid, menuCategoryId: ccCat1, name: "Karışık Çiçek Aranjmanı", description: "Mevsim çiçekleri, özel sepet", price: "499.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1487530811015-780ca2a80cfc?w=300&h=300&fit=crop" },
    { vendorId: cicekVid, menuCategoryId: ccCat1, name: "Pembe Lale Buketi (25 Dal)", description: "Taze lale, kurdeleli", price: "279.00", imageUrl: "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=300&h=300&fit=crop" },
    { vendorId: cicekVid, menuCategoryId: ccCat2, name: "Orkide Saksısı", description: "Beyaz orkide, dekoratif saksı", price: "399.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1523694576729-96e4b55bafcb?w=300&h=300&fit=crop" },
    { vendorId: cicekVid, menuCategoryId: ccCat2, name: "Sukulent Koleksiyonu (3'lü)", description: "Mini kaktüs ve etli bitkiler seti", price: "199.00", imageUrl: "https://images.unsplash.com/photo-1459156212016-c812468e2115?w=300&h=300&fit=crop" },
  ];
  for (const item of cicekItems) await upsertItem(item);

  /* — SU & İÇECEK: SuSepeti — */
  const suVid = await upsertVendor({
    name: "SuSepeti", slug: "su-sepeti", categoryId: await getCat("icecek"), vendorType: "delivery",
    description: "Su, meşrubat ve içecek siparişi — 1 saat teslimat", city: "Bursa", district: "Nilüfer",
    address: "Fethiye Cad. No:12, Nilüfer", phone: "0224 000 0013",
    deliveryFee: "0.00", minOrderAmount: "100.00", deliveryTime: 60,
    rating: 4.5, reviewCount: 156, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&h=400&fit=crop",
    tags: ["su", "içecek", "meşrubat"],
  });
  const suCat1 = await upsertMenuCat(suVid, "Su", 0);
  const suCat2 = await upsertMenuCat(suVid, "Meşrubat", 1);
  const suCat3 = await upsertMenuCat(suVid, "Meyve Suyu", 2);
  const suItems = [
    { vendorId: suVid, menuCategoryId: suCat1, name: "Damacana Su (19L)", description: "Doğal kaynak suyu, damacana", price: "79.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop" },
    { vendorId: suVid, menuCategoryId: suCat1, name: "Pet Şişe Su (6x1.5L)", description: "Doğal kaynak suyu koli", price: "59.90", imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=300&fit=crop" },
    { vendorId: suVid, menuCategoryId: suCat2, name: "Kola (6x1L)", description: "Soğuk gazlı içecek koli", price: "129.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=300&h=300&fit=crop" },
    { vendorId: suVid, menuCategoryId: suCat2, name: "Soda (24'lü Koli)", description: "Maden suyu çeşitleri", price: "189.90", imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&h=300&fit=crop" },
    { vendorId: suVid, menuCategoryId: suCat3, name: "Portakal Suyu (1L)", description: "Sıkma portakal suyu, şekersiz", price: "49.90", imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=300&fit=crop" },
  ];
  for (const item of suItems) await upsertItem(item);

  /* — KAFE: Kahve Durağı (update existing to featured) — */
  const kafeVid = await upsertVendor({
    name: "Kahve Durağı", slug: "kahve-duragi", categoryId: await getCat("kafe"), vendorType: "delivery",
    description: "Özel kavurma specialty kahveler ve tatlılar", city: "İstanbul", district: "Beyoğlu",
    address: "İstiklal Cad. No:100, Beyoğlu", phone: "0212 000 0004",
    deliveryFee: "10.00", minOrderAmount: "60.00", deliveryTime: 20,
    rating: 4.6, reviewCount: 198, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=400&fit=crop",
    tags: ["kahve", "kafe", "tatlı"],
  });
  const kCat1 = await upsertMenuCat(kafeVid, "Kahveler", 0);
  const kCat2 = await upsertMenuCat(kafeVid, "Tatlılar", 1);
  const kafeItems = [
    { vendorId: kafeVid, menuCategoryId: kCat1, name: "Türk Kahvesi", description: "Geleneksel pişirim, orta şekerli", price: "35.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1578374173919-c9d3938ba286?w=300&h=300&fit=crop" },
    { vendorId: kafeVid, menuCategoryId: kCat1, name: "Latte", description: "Double espresso, buharlı süt", price: "65.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=300&h=300&fit=crop" },
    { vendorId: kafeVid, menuCategoryId: kCat1, name: "Cold Brew", description: "18 saat soğuk demleme, buzlu servis", price: "75.00", imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=300&fit=crop" },
    { vendorId: kafeVid, menuCategoryId: kCat2, name: "Cheesecake", description: "New York style, çilek sosu", price: "85.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1578775887804-699de7086ff9?w=300&h=300&fit=crop" },
    { vendorId: kafeVid, menuCategoryId: kCat2, name: "Brownie", description: "Sıcak çikolatalı kek, dondurmalı", price: "70.00", imageUrl: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=300&h=300&fit=crop" },
  ];
  for (const item of kafeItems) await upsertItem(item);

  /* ══════════════════════════════════════════════
     E-COMMERCE VENDORS + PRODUCTS
  ══════════════════════════════════════════════ */

  /* — GİYİM: ModaTR (update existing) — */
  await upsertVendor({
    name: "ModaTR", slug: "modatr", categoryId: await getCat("giyim"), vendorType: "ecommerce",
    description: "Türk tasarımcıların en şık koleksiyonları", city: "İstanbul",
    phone: "0850 000 0010", shippingFee: "0", freeShippingAbove: "300", shippingTime: 2,
    rating: 4.6, reviewCount: 312, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1558171813-0a60c91c8616?w=800&h=400&fit=crop",
    tags: ["giyim", "moda", "kadın", "erkek"],
  });

  /* — ELEKTRONİK: TeknoShop (update existing) — */
  await upsertVendor({
    name: "TeknoShop", slug: "teknoshop", categoryId: await getCat("elektronik"), vendorType: "ecommerce",
    description: "En güncel teknoloji ürünleri uygun fiyatlarla", city: "Ankara",
    phone: "0850 000 0011", shippingFee: "25", freeShippingAbove: "500", shippingTime: 3,
    rating: 4.4, reviewCount: 187, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop",
    tags: ["elektronik", "telefon", "bilgisayar"],
  });

  /* — EV & YAŞAM: EvimGuzel (update existing) — */
  await upsertVendor({
    name: "EvimGüzel", slug: "evimguzel", categoryId: await getCat("ev-yasam"), vendorType: "ecommerce",
    description: "Evinizi güzelleştiren dekorasyon ve yaşam ürünleri", city: "İzmir",
    phone: "0850 000 0012", shippingFee: "30", freeShippingAbove: "400", shippingTime: 4,
    rating: 4.7, reviewCount: 94, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=400&fit=crop",
    tags: ["ev", "dekorasyon", "mobilya"],
  });

  /* — KOZMETİK: BeautyBox — */
  const beautyVid = await upsertVendor({
    name: "BeautyBox", slug: "beautybox", categoryId: await getCat("kozmetik"), vendorType: "ecommerce",
    description: "Profesyonel makyaj ve cilt bakım ürünleri", city: "İstanbul",
    phone: "0850 000 0020", shippingFee: "0", freeShippingAbove: "250", shippingTime: 2,
    rating: 4.8, reviewCount: 543, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&h=400&fit=crop",
    tags: ["kozmetik", "makyaj", "cilt bakım"],
  });
  const beauCat1 = await upsertMenuCat(beautyVid, "Cilt Bakımı", 0);
  const beauCat2 = await upsertMenuCat(beautyVid, "Makyaj", 1);
  const beautyItems = [
    { vendorId: beautyVid, menuCategoryId: beauCat1, name: "Nemlendirici Krem 50ml", description: "Hyalüronik asitli yoğun nemlendirici", price: "249.00", salePrice: "199.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&h=300&fit=crop" },
    { vendorId: beautyVid, menuCategoryId: beauCat1, name: "Serum C Vitamini", description: "Aydınlatıcı C vitamini serumu 30ml", price: "399.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop" },
    { vendorId: beautyVid, menuCategoryId: beauCat1, name: "Güneş Koruyucu SPF50", description: "Hafif dokulu, beyaz iz bırakmaz", price: "189.00", imageUrl: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=300&h=300&fit=crop" },
    { vendorId: beautyVid, menuCategoryId: beauCat2, name: "Ruj Koleksiyonu (5'li Set)", description: "Kalıcı mat ruj seti, 5 renk", price: "349.00", salePrice: "299.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1586495777744-4e6232bf2b87?w=300&h=300&fit=crop" },
    { vendorId: beautyVid, menuCategoryId: beauCat2, name: "Fondöten SPF15", description: "Tam kaplama fondöten, 15 ton", price: "279.00", imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=300&fit=crop" },
  ];
  for (const item of beautyItems) await upsertItem(item);

  /* — KİTAP & HOBİ: KitapSever — */
  const kitapVid = await upsertVendor({
    name: "KitapSever", slug: "kitapsever", categoryId: await getCat("kitap"), vendorType: "ecommerce",
    description: "Türkçe ve yabancı kitaplar, hobi malzemeleri", city: "Ankara",
    phone: "0850 000 0021", shippingFee: "0", freeShippingAbove: "200", shippingTime: 3,
    rating: 4.9, reviewCount: 1204, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=400&fit=crop",
    tags: ["kitap", "roman", "eğitim", "hobi"],
  });
  const kitCat1 = await upsertMenuCat(kitapVid, "Roman & Edebiyat", 0);
  const kitCat2 = await upsertMenuCat(kitapVid, "Kişisel Gelişim", 1);
  const kitapItems = [
    { vendorId: kitapVid, menuCategoryId: kitCat1, name: "Suç ve Ceza - Dostoyevski", description: "Klasik Rus edebiyatı, yeni çeviri", price: "89.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop" },
    { vendorId: kitapVid, menuCategoryId: kitCat1, name: "Şeker Portakalı - Mauro de Vasconcelos", description: "Dünya klasiği, tam metin", price: "79.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=300&fit=crop" },
    { vendorId: kitapVid, menuCategoryId: kitCat1, name: "Beyoğlu Rapsodisi - Ahmet Ümit", description: "Türk polisiye edebiyatı", price: "99.00", imageUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=300&fit=crop" },
    { vendorId: kitapVid, menuCategoryId: kitCat2, name: "Atomik Alışkanlıklar - James Clear", description: "Küçük değişimler büyük farklar yaratır", price: "119.00", salePrice: "89.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&h=300&fit=crop" },
    { vendorId: kitapVid, menuCategoryId: kitCat2, name: "Derin Odaklanma - Cal Newport", description: "Dikkat dağınıklığı çağında verimlilik", price: "99.00", imageUrl: "https://images.unsplash.com/photo-1491841651911-c44c30c34548?w=300&h=300&fit=crop" },
  ];
  for (const item of kitapItems) await upsertItem(item);

  /* — SPOR: SportZone — */
  const sporVid = await upsertVendor({
    name: "SportZone", slug: "sport-zone", categoryId: await getCat("spor"), vendorType: "ecommerce",
    description: "Profesyonel spor ekipmanları ve giyim", city: "İstanbul",
    phone: "0850 000 0022", shippingFee: "0", freeShippingAbove: "500", shippingTime: 3,
    rating: 4.6, reviewCount: 287, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=400&fit=crop",
    tags: ["spor", "fitness", "outdoor"],
  });
  const sporCat1 = await upsertMenuCat(sporVid, "Fitness Ekipmanı", 0);
  const sporCat2 = await upsertMenuCat(sporVid, "Spor Giyim", 1);
  const sporItems = [
    { vendorId: sporVid, menuCategoryId: sporCat1, name: "Dambıl Seti (2x5kg)", description: "Neopren kaplı, kaymaz tutma", price: "349.00", salePrice: "299.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop" },
    { vendorId: sporVid, menuCategoryId: sporCat1, name: "Yoga Matı", description: "6mm anti-slip, çevre dostu TPE", price: "249.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1601925228066-2f74cf41ac64?w=300&h=300&fit=crop" },
    { vendorId: sporVid, menuCategoryId: sporCat1, name: "Atlama İpi", description: "Hız atlama ipi, çelik kablo", price: "149.00", imageUrl: "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?w=300&h=300&fit=crop" },
    { vendorId: sporVid, menuCategoryId: sporCat2, name: "Koşu Taytı (Kadın)", description: "Yüksek bel, 4 yönlü streç", price: "399.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&h=300&fit=crop" },
    { vendorId: sporVid, menuCategoryId: sporCat2, name: "Spor Tişört (Erkek)", description: "Nem absorbe eden, antibakteriyel", price: "249.00", imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop" },
  ];
  for (const item of sporItems) await upsertItem(item);

  /* — OYUNCAK: OyuncakDünyası — */
  const oyuncakVid = await upsertVendor({
    name: "OyuncakDünyası", slug: "oyuncak-dunyasi", categoryId: await getCat("oyuncak"), vendorType: "ecommerce",
    description: "Tüm yaş grupları için eğitici ve eğlenceli oyuncaklar", city: "İzmir",
    phone: "0850 000 0023", shippingFee: "0", freeShippingAbove: "300", shippingTime: 3,
    rating: 4.7, reviewCount: 421, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1587654780291-39c9098d5e1d?w=800&h=400&fit=crop",
    tags: ["oyuncak", "çocuk", "eğitici"],
  });
  const oyunCat1 = await upsertMenuCat(oyuncakVid, "0-3 Yaş", 0);
  const oyunCat2 = await upsertMenuCat(oyuncakVid, "4-8 Yaş", 1);
  const oyuncakItems = [
    { vendorId: oyuncakVid, menuCategoryId: oyunCat1, name: "Ahşap Şekil Sıralama", description: "Motor beceri geliştiren, 10 parça", price: "149.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&h=300&fit=crop" },
    { vendorId: oyuncakVid, menuCategoryId: oyunCat1, name: "Bebek Salıncağı", description: "Elektronik, çok yönlü", price: "899.00", salePrice: "749.00", imageUrl: "https://images.unsplash.com/photo-1590005354167-6da97870c757?w=300&h=300&fit=crop" },
    { vendorId: oyuncakVid, menuCategoryId: oyunCat2, name: "LEGO Classic 500 Parça", description: "Yaratıcılık seti, çeşitli renkler", price: "499.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1587654780291-39c9098d5e1d?w=300&h=300&fit=crop" },
    { vendorId: oyuncakVid, menuCategoryId: oyunCat2, name: "Uzaktan Kumandalı Araba", description: "4WD, 2.4GHz, şarjlı pil", price: "399.00", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop" },
    { vendorId: oyuncakVid, menuCategoryId: oyunCat2, name: "Boya Seti Deluxe", description: "72 renk, profesyonel kuru boya", price: "249.00", imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&h=300&fit=crop" },
  ];
  for (const item of oyuncakItems) await upsertItem(item);

  /* — SÜPERMARKET: MarketSepeti — */
  const superVid = await upsertVendor({
    name: "MarketSepeti", slug: "market-sepeti", categoryId: await getCat("supermarket"), vendorType: "ecommerce",
    description: "Online süpermarket — binlerce ürün, ertesi gün teslimat", city: "İstanbul",
    phone: "0850 000 0024", shippingFee: "0", freeShippingAbove: "300", shippingTime: 1,
    rating: 4.5, reviewCount: 2341, featured: true, isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=800&h=400&fit=crop",
    tags: ["süpermarket", "market", "online alışveriş"],
  });
  const supCat1 = await upsertMenuCat(superVid, "Bakliyat & Tahıl", 0);
  const supCat2 = await upsertMenuCat(superVid, "Atıştırmalık", 1);
  const superItems = [
    { vendorId: superVid, menuCategoryId: supCat1, name: "Pirinç Baldo (5kg)", description: "Yerli üretim, pilav pirinci", price: "189.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop" },
    { vendorId: superVid, menuCategoryId: supCat1, name: "Zeytinyağı (1L)", description: "Soğuk sıkım, naturel sızma", price: "219.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop" },
    { vendorId: superVid, menuCategoryId: supCat1, name: "Makarna (500g)", description: "Spaghetti, irmikli", price: "39.90", imageUrl: "https://images.unsplash.com/photo-1551462147-37885acc36f1?w=300&h=300&fit=crop" },
    { vendorId: superVid, menuCategoryId: supCat2, name: "Çikolata Kutusu", description: "Karışık sütlü ve bitter çikolata", price: "149.90", isPopular: true, imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&h=300&fit=crop" },
    { vendorId: superVid, menuCategoryId: supCat2, name: "Cips (5'li Aile Paketi)", description: "5 farklı çeşit cips karışımı", price: "99.90", imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop" },
  ];
  for (const item of superItems) await upsertItem(item);

  res.json({
    success: true,
    message: "Tüm kategoriler ve demo firmalar eklendi",
    stats: {
      deliveryVendors: 6,
      ecomVendors: 8,
      totalProducts: 55,
    }
  });
});

/* — Admin: Servis Sağlayıcılar ──────────────────────────────── */
router.get("/admin/servis-saglayicilar", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  try {
    const vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.name);
    // Seri ilanlar modulu kaldirildigi icin bu sayaç artık kullanılmıyor.
    const ilanMap: Record<string, number> = {};
    // Harita premium işletme sayısı per vendor
    const mapRows = await db.execute<{ vendor_id: string; count: string }>(
      sql`SELECT vendor_id::text, COUNT(*)::text as count FROM map_businesses WHERE vendor_id IS NOT NULL GROUP BY vendor_id`
    );
    const mapMap: Record<number, number> = {};
    for (const r of (mapRows as any).rows ?? (mapRows as any)) {
      mapMap[parseInt(r.vendor_id, 10)] = parseInt(r.count, 10);
    }

    const result = vendors.map(v => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      vendorType: v.vendorType,
      ownerName: v.ownerName,
      ownerEmail: v.ownerEmail,
      phone: v.phone,
      city: v.city,
      status: v.status ?? "active",
      active: v.active,
      featured: v.featured,
      isOpen: v.isOpen,
      rating: v.rating,
      reviewCount: v.reviewCount,
      createdAt: v.createdAt,
      services: {
        delivery: v.vendorType === "delivery",
        ecommerce: v.vendorType === "ecommerce",
        mapPremium: (mapMap[v.id] ?? 0) > 0,
        ilanSayisi: ilanMap[v.ownerName ?? ""] ?? 0,
      },
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Servis sağlayıcılar alınamadı" });
  }
});

/* — RESERVATIONS ──────────────────────────────────────────────── */

router.post("/delivery/reservations", async (req, res): Promise<void> => {
  const { vendorId, guestName, guestPhone, reservationDate, reservationTime, partySize, sectionId, sectionName, note } = req.body;
  if (!vendorId || !guestName || !guestPhone || !reservationDate || !reservationTime) {
    res.status(400).json({ error: "Zorunlu alanlar eksik" }); return;
  }
  // Check auto-confirm setting
  const [svcRow] = (await db.execute<any>(sql`
    SELECT reservation_auto_confirm FROM vendors WHERE id = ${Number(vendorId)} LIMIT 1
  `)).rows ?? [];
  const autoConfirm = Boolean(svcRow?.reservation_auto_confirm);
  const status = autoConfirm ? "confirmed" : "pending";

  const [row] = (await db.execute<any>(sql`
    INSERT INTO vendor_reservations (vendor_id, guest_name, guest_phone, reservation_date, reservation_time, party_size, section_id, section_name, note, status)
    VALUES (${Number(vendorId)}, ${guestName}, ${guestPhone}, ${reservationDate}, ${reservationTime}, ${Number(partySize) || 1}, ${sectionId || null}, ${sectionName || null}, ${note || null}, ${status})
    RETURNING *
  `)).rows ?? [];
  res.status(201).json(row);
});

router.get("/delivery/vendors/:vendorId/reservations", async (req, res): Promise<void> => {
  const vendorId = parseInt(req.params.vendorId);
  if (!Number.isFinite(vendorId) || vendorId <= 0) {
    res.status(400).json({ error: "Geçersiz işletme" });
    return;
  }
  const { status, date } = req.query as Record<string, string>;
  const allowedStatuses = new Set(["pending", "confirmed", "cancelled", "completed"]);
  if (status && !allowedStatuses.has(status)) {
    res.status(400).json({ error: "Geçersiz status" });
    return;
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Geçersiz tarih (YYYY-MM-DD)" });
    return;
  }
  const conditions = [sql`vendor_id = ${vendorId}`];
  if (status) conditions.push(sql`status = ${status}`);
  if (date) conditions.push(sql`reservation_date = ${date}`);
  const rows = (await db.execute<any>(sql`
    SELECT * FROM vendor_reservations
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY reservation_date, reservation_time
  `)).rows ?? [];
  res.json(rows);
});

router.patch("/delivery/reservations/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
    res.status(400).json({ error: "Geçersiz status" }); return;
  }
  const [row] = (await db.execute<any>(sql`
    UPDATE vendor_reservations SET status = ${status} WHERE id = ${id} RETURNING *
  `)).rows ?? [];
  res.json(row);
});

/* Provider: kendi rezervasyonlarını al */
router.get("/delivery/my-reservations", async (req, res): Promise<void> => {
  const vendorId = Number(req.headers["x-vendor-id"]);
  if (!Number.isFinite(vendorId) || vendorId <= 0) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { status, date } = req.query as Record<string, string>;
  const allowedStatuses = new Set(["pending", "confirmed", "cancelled", "completed"]);
  if (status && !allowedStatuses.has(status)) {
    res.status(400).json({ error: "Geçersiz status" });
    return;
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Geçersiz tarih (YYYY-MM-DD)" });
    return;
  }
  const conditions = [sql`vendor_id = ${vendorId}`];
  if (status) conditions.push(sql`status = ${status}`);
  if (date) conditions.push(sql`reservation_date = ${date}`);
  const rows = (await db.execute<any>(sql`
    SELECT * FROM vendor_reservations
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY reservation_date DESC, reservation_time
  `)).rows ?? [];
  res.json(rows);
});

export default router;

export async function handleDeliveryStripeWebhook(req: Request, res: Response): Promise<void> {
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).json({ error: "Raw body gerekli" });
    return;
  }
  const [settings] = await db.select().from(paymentSettingsTable).limit(1);
  const whSecret = settings?.stripeWebhookSecret?.trim();
  const stripe = await getStripeForDelivery();
  if (!stripe || !whSecret) {
    res.status(503).json({ error: "Stripe webhook yapılandırılmamış" });
    return;
  }
  const sig = req.headers["stripe-signature"] as string | undefined;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig || "", whSecret);
  } catch {
    res.status(400).json({ error: "İmza doğrulanamadı" });
    return;
  }

  const [dup] = await db
    .select({ id: stripeWebhookEventsTable.id })
    .from(stripeWebhookEventsTable)
    .where(eq(stripeWebhookEventsTable.stripeEventId, event.id))
    .limit(1);
  if (dup) {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  let outcome = "ignored";
  let detail: string | null = null;
  let relatedOrderId: number | null = null;

  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderNumber = String(pi.metadata?.["delivery_order_number"] ?? "").trim();
    if (orderNumber) {
      const nextPaymentStatus = event.type === "payment_intent.succeeded" ? "paid" : "failed";
      const nextStatus = event.type === "payment_intent.succeeded" ? "confirmed" : "pending";
      const updated = await db
        .update(deliveryOrdersTable)
        .set({
          paymentStatus: nextPaymentStatus,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(deliveryOrdersTable.orderNumber, orderNumber), eq(deliveryOrdersTable.paymentStatus, "pending")))
        .returning({ id: deliveryOrdersTable.id, orderNumber: deliveryOrdersTable.orderNumber });
      if (updated.length > 0) {
        relatedOrderId = updated[0].id;
        outcome = event.type === "payment_intent.succeeded" ? "delivery_order_paid" : "delivery_order_failed";
        detail = `delivery_order=${updated[0].orderNumber};pi=${pi.id}`;
      } else {
        outcome = "delivery_order_not_pending";
        detail = `delivery_order=${orderNumber};pi=${pi.id}`;
      }
    } else {
      outcome = "missing_delivery_order_metadata";
      detail = `pi=${pi.id}`;
    }
  }

  try {
    await db.insert(stripeWebhookEventsTable).values({
      stripeEventId: event.id,
      eventType: event.type,
      outcome,
      detail,
      relatedOrderId,
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "23505") {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    res.status(500).json({ error: "Webhook audit kaydı yazılamadı" });
    return;
  }
  res.status(200).json({ received: true, outcome });
}
