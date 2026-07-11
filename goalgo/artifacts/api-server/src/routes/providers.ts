import { Router, type NextFunction, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { vendorMenuItemsTable } from "@workspace/db";
import {
  orderMessagesTable,
  deliveryOrdersTable,
  deliveryOrderStatusEventsTable,
  vendorsTable,
  siteSettingsTable,
} from "@workspace/db";
import {
  notifyVendorWhatsApp,
  notifyAdminWhatsApp,
  notifyCustomerOrderWhatsApp,
  trySendSiteOutboundWhatsApp,
  phoneDigitsVariants,
  digitsForWhatsAppLink,
} from "../lib/whatsapp";
import { deliveryStatusTransitionAllowed } from "../lib/delivery-status-transitions";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { verifyLoginMathCaptcha } from "../lib/loginMathCaptcha.js";
import { sendEmail, buildActivationEmail, buildPasswordResetEmail } from "../lib/email";
import {
  importVendorFromExternalUrl,
  buildExternalMenuPreview,
  externalMenuPreviewPayload,
  buildMergedAddress,
  filterMenuSelection,
  type ImportedMenuItem,
  type ImportedVendorData,
  type ExternalPlatform,
} from "../lib/external-delivery-import";
import { normalizeRevenueModel, sanitizeTrIban } from "../lib/vendor-revenue.js";
import { generateTurkishVendorAboutDetailed } from "../lib/vendor-about-ai.js";
import { sitePublicOrigin } from "../lib/site-public-origin.js";
import { getSessionSecret, getGeliverWebhookSecret } from "../lib/secrets.js";
import { vendorApprovalTempPassword } from "../lib/demo-credentials.js";
import {
  createGeliverDraftShipmentForOrder,
  createGeliverShipmentForOrder,
  createGeliverManualShipment,
  ensureGeliverIntegrationColumns,
  geliverJsonSafe,
  geliverApiListCitiesForVendor,
  geliverApiListDistrictsForVendor,
  geliverApiListShipmentsForVendor,
  geliverApiGetShipmentForVendor,
  geliverApiUpdateShipmentPackageForVendor,
  geliverApiAcceptOfferForVendor,
  geliverApiListAddressesForVendor,
  geliverApiGetAddressForVendor,
  geliverApiCreateSenderAddressForVendor,
  geliverApiDeleteAddressForVendor,
  geliverApiGetBalanceForVendor,
  geliverApiListWebhooksForVendor,
  geliverApiCreateWebhookForVendor,
  geliverApiDeleteWebhookForVendor,
  geliverApiTestWebhookForVendor,
  geliverApiListParcelTemplatesForVendor,
  geliverApiCreateParcelTemplateForVendor,
  geliverApiDeleteParcelTemplateForVendor,
  geliverApiListPricesForVendor,
  geliverApiListProviderAccountsForVendor,
  geliverApiCreateProviderAccountForVendor,
  geliverApiDeleteProviderAccountForVendor,
} from "../lib/geliver-shipment.js";
import {
  getEcommerceCategoryTree,
  resolveProductCategoryForVendor,
} from "../lib/ecommerce-product-categories.js";
import { logger } from "../lib/logger.js";
import { denyUnlessAdminMaintenance, denyUnlessAdminMaintenanceAny } from "../lib/admin-guard.js";
import { ensureVendorBlogTables } from "../lib/vendor-blog-db.js";
import {
  VENDOR_THEME_CATALOG,
  ensureVendorCustomDomainsTable,
  ensureVendorThemeColumns,
  listVendorDomains,
  mergeThemeConfig,
  cleanVendorNavMenuItems,
  readVendorNavMenuFromThemeConfig,
  normalizeVendorDomain,
  resolveDefaultThemeKey,
  resolveVendorCustomDomainShortPath,
  resolveVendorStorefrontPath,
  themeDefByKey,
  themesForVendor,
} from "../lib/vendor-storefront.js";

const router = Router();

function escapeHtmlLite(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function normGeliverMahalle(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/* Auto-migrate: şifre sütunları */
(async () => {
  try {
    await db.execute(sql`ALTER TABLE vendor_couriers ADD COLUMN IF NOT EXISTS password_hash text`);
  } catch { /* ignore */ }
  try {
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS password_hash text`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT true`);
  } catch { /* ignore */ }
  try {
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS revenue_model TEXT NOT NULL DEFAULT 'subscription'`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS commission_rate_pct NUMERIC(8,4)`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_bank_holder TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_bank_iban TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_bank_branch TEXT`);
  } catch { /* ignore */ }
  try {
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_api_token TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_address_id TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_zip TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_mahalle TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_auto_ship_on_order BOOLEAN NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_organization_id TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_postal_code TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_shipment_id TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_tracking_number TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_label_url TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_transaction_id TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_status TEXT`);
    await db.execute(sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_last_error TEXT`);
  } catch { /* ignore */ }
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vendor_subscription_requests (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
        receipt_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch { /* ignore */ }
})();

/* Servis tipi → Türkçe etiket */
export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  siparis:  "Sipariş İşletmesi",
  alisveris:"Alışveriş Mağazası",
  hizmet:   "Hizmet Sağlayıcı",
  ilan:     "İlan Odaklı İşletme",
  turizm:   "Turizm & Seyahat",
  ulasim:   "Ulaşım & Bildirim",
  "ulaşım": "Ulaşım & Bildirim",
  transport:"Ulaşım & Bildirim",
  delivery: "Sipariş İşletmesi",
  ecommerce:"Alışveriş Mağazası",
};

export const PROVIDER_SUBTYPE_LABELS: Record<string, string> = {
  otel:"Otel", arac:"Rent a Car", villa:"Villa & Ev Kiralama", tur:"Tur", yat:"Yat & Tekne",
  restoran:"Restoran / Kafe", market:"Market / Bakkal", eczane:"Eczane",
  cicekci:"Çiçekçi", giyim:"Giyim / Tekstil", elektronik:"Elektronik",
  kitap:"Kitap / Kırtasiye", ev:"Ev & Yaşam", spor:"Spor / Outdoor",
  kozmetik:"Kozmetik / Güzellik", cekici:"Çekici / Yol Yardım",
  nakliyeci:"Nakliyeci", oto_galeri:"Oto Galeri",
  kurs:"Kurs / Eğitim", tadilat:"Tadilat / Tamir", temizlik:"Temizlik",
  boya:"Boya / Badana", guzellik:"Güzellik Salonu", saglik:"Sağlık / Klinik",
  ikinci_el:"2. El Eşya", is_makinesi:"İş Makineleri", telefon:"Telefon / GSM",
  beyaz_esya:"Beyaz Eşya", hayvan:"Hayvanlar / Pet", diger:"Diğer",
  taksi:"Şehir İçi Yolcu Taşıma", taxi:"Şehir İçi Yolcu Taşıma",
  kurye:"Kurye", courier:"Kurye", rideshare:"Ortak Yolculuk",
};

type Row = Record<string, unknown>;

function normalizeProviderPanelText(v: unknown): string {
  return String(v ?? "").trim().toLocaleLowerCase("tr-TR");
}

function providerPanelKindForRow(row: Row): "delivery" | "tourism" | "transport" {
  const type = normalizeProviderPanelText(row.provider_type ?? row.vendor_type);
  const subtype = normalizeProviderPanelText(row.provider_subtype);
  if (["turizm", "tourism"].includes(type)) return "tourism";
  if (["ulasim", "ulaşım", "transport"].includes(type)) return "transport";
  if (["otel", "hotel", "arac", "car", "rentacar", "villa", "tur", "tour", "yat", "boat", "tekne"].includes(subtype)) {
    return "tourism";
  }
  if (["taksi", "taxi", "kurye", "courier", "cekici", "tow", "nakliyeci", "moving", "kargo", "cargo", "rideshare"].includes(subtype)) {
    return "transport";
  }
  return "delivery";
}

function attachProviderPanelRoute(row: Row): Row {
  const kind = providerPanelKindForRow(row);
  row.panel_kind = kind;
  row.panel_route = kind === "tourism" ? "/turizm-paneli" : kind === "transport" ? "/ulasim-paneli" : "/servis-saglayici-paneli";
  return row;
}

const TABLE_SERVICE_PROVIDER_SUBTYPES = new Set(["", "restoran", "restaurant", "cafe", "kafe", "restoran-kafe", "restoran_cafe"]);

function canVendorUseTableService(row: { provider_type?: unknown; vendor_type?: unknown; provider_subtype?: unknown }): boolean {
  const type = String(row.provider_type || row.vendor_type || "").toLowerCase();
  const subtype = String(row.provider_subtype || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, "_");
  return ["siparis", "delivery"].includes(type) && TABLE_SERVICE_PROVIDER_SUBTYPES.has(subtype);
}

function membershipPricingFromSiteRow(site: typeof siteSettingsTable.$inferSelect | undefined) {
  const rateRaw = site?.usdTryRate != null ? parseFloat(String(site.usdTryRate)) : NaN;
  const rate = Number.isFinite(rateRaw) && rateRaw > 0 ? rateRaw : null;
  const num = (d: unknown, fallback: number) => {
    if (d == null || d === "") return fallback;
    const n = parseFloat(String(d).replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const std = num(site?.providerMembershipStandardUsd, 10);
  const gold = num(site?.providerMembershipGoldUsd, 10);
  const prem = num(site?.providerMembershipPremiumPerBusinessUsd, 10);
  const tryMul = (usd: number) => (rate != null ? Math.round(usd * rate * 100) / 100 : null);
  return {
    usdTryRate: rate,
    usdTryUpdatedAt: site?.usdTryUpdatedAt ? site.usdTryUpdatedAt.toISOString() : null,
    standardUsdMonthly: std,
    goldUsdMonthly: gold,
    premiumPerBusinessUsdMonthly: prem,
    standardTryMonthly: tryMul(std),
    goldTryMonthly: tryMul(gold),
    premiumPerBusinessTryMonthly: tryMul(prem),
    businessMembershipTryDaily: 10,
    businessMembershipTryAnnual: 3650,
    /** Tek işletme için tahmini Premium aylık (Gold + 1× işletme premium USD), TRY */
    premiumBundleTryMonthlyOneBusiness: rate != null ? Math.round((gold + prem) * rate * 100) / 100 : null,
  };
}

/** Panel oturumu: istemci `x-vendor-email` ile hem yetkili hem işletme e-postası doğrulanır */
function sqlVendorSessionEmailMatches(headerEmail: string) {
  const e = String(headerEmail).trim();
  return sql`(
    LOWER(TRIM(COALESCE(owner_email, ''))) = LOWER(TRIM(${e}))
    OR LOWER(TRIM(COALESCE(email, ''))) = LOWER(TRIM(${e}))
  )`;
}

/** `notes` içinde satır bazlı `anahtar: değer` güncelle (ör. qr_menu_public:1) */
function mergeVendorNoteLine(notes: string | null | undefined, key: string, value: string): string {
  const lines = String(notes ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const prefix = `${key.toLowerCase()}:`;
  const kept = lines.filter((l) => !l.toLowerCase().startsWith(prefix));
  kept.push(`${key}: ${value}`);
  return kept.join("\n");
}

function vendorNoteFlagOn(notes: string | null | undefined, key: string): boolean {
  const raw = String(notes ?? "");
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\n)${esc}\\s*:\\s*(\\S+)`, "i");
  const m = raw.match(re);
  const v = (m?.[1] ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

const r = (res: unknown): Row[] => ((res as { rows?: Row[] }).rows ?? res) as Row[];

type VendorSession = {
  id: number;
  email: string;
};

type VendorJwtPayload = jwt.JwtPayload & {
  typ?: string;
  vendorId?: number;
  email?: string;
};

type CourierSession = {
  id: number;
  phone: string;
};

type CourierJwtPayload = jwt.JwtPayload & {
  typ?: string;
  courierId?: number;
  phone?: string;
};

function signVendorSessionToken(vendorId: number, email: string): string {
  return jwt.sign(
    { typ: "vendor", vendorId, email },
    getSessionSecret(),
    { expiresIn: "30d", audience: "yekpare:vendor", issuer: "yekpare-api", subject: String(vendorId) },
  );
}

function verifyVendorSessionToken(req: Request): VendorSession | null {
  const auth = String(req.headers.authorization ?? "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getSessionSecret(), {
      audience: "yekpare:vendor",
      issuer: "yekpare-api",
    }) as VendorJwtPayload;
    const id = Number(decoded.vendorId ?? decoded.sub);
    const email = String(decoded.email ?? "").trim();
    if (decoded.typ !== "vendor" || !Number.isFinite(id) || id <= 0 || !email) return null;
    return { id, email };
  } catch {
    return null;
  }
}

function requireVendorSession(req: Request, res: Response, next: NextFunction): void {
  const path = (req.path || "").replace(/^\/providers\/?/, "/");
  if (path === "/geliver/webhook") {
    next();
    return;
  }
  const session = verifyVendorSessionToken(req);
  if (!session) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  req.headers["x-vendor-id"] = String(session.id);
  req.headers["x-vendor-email"] = session.email;
  next();
}

function signCourierSessionToken(courierId: number, phone: string): string {
  return jwt.sign(
    { typ: "courier", courierId, phone },
    getSessionSecret(),
    { expiresIn: "30d", audience: "yekpare:courier", issuer: "yekpare-api", subject: String(courierId) },
  );
}

function verifyCourierSessionToken(req: Request): CourierSession | null {
  const auth = String(req.headers.authorization ?? "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getSessionSecret(), {
      audience: "yekpare:courier",
      issuer: "yekpare-api",
    }) as CourierJwtPayload;
    const id = Number(decoded.courierId ?? decoded.sub);
    const phone = String(decoded.phone ?? "").trim();
    if (decoded.typ !== "courier" || !Number.isFinite(id) || id <= 0 || !phone) return null;
    return { id, phone };
  } catch {
    return null;
  }
}

function requireCourierSession(req: Request, res: Response, next: NextFunction): void {
  const session = verifyCourierSessionToken(req);
  if (!session) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  req.headers["x-courier-id"] = String(session.id);
  req.headers["x-courier-phone"] = session.phone;
  next();
}

function courierPhoneFromSession(req: Request): string {
  return String(req.headers["x-courier-phone"] ?? "").trim();
}

async function vendorSessionOwnsRow(vendorId: unknown, vendorEmail: unknown): Promise<boolean> {
  if (!vendorId || !vendorEmail) return false;
  const own = r(
    await db.execute<Row>(sql`
      SELECT id FROM vendors
      WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
      LIMIT 1
    `),
  )[0];
  return Boolean(own);
}

/* — Yardımcı: slug üret — */
function slugify(str: string): string {
  return str.toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function noteField(notes: string | null | undefined, key: string): string {
  const raw = String(notes || "");
  const m = raw.match(new RegExp(`${key}:([^|\\n]+)`));
  return m?.[1]?.trim() || "";
}

function upsertNoteField(notes: string | null | undefined, key: string, value: string | null | undefined): string {
  const raw = String(notes || "");
  const parts = raw.split("|").map((x) => x.trim()).filter(Boolean);
  const filtered = parts.filter((p) => !p.toLowerCase().startsWith(`${key.toLowerCase()}:`));
  const v = String(value || "").trim();
  if (v) filtered.push(`${key}:${v}`);
  return filtered.join(" | ");
}

function maskSecret(v: string): string {
  if (!v) return "";
  if (v.length <= 8) return "****";
  return `${v.slice(0, 4)}...${v.slice(-4)}`;
}

export async function importMenuIntoVendor(vendorId: number, menu: Array<{ name: string; category?: string | null; description?: string | null; price?: number | null; imageUrl?: string | null; options?: Array<{ name: string; required?: boolean; multiple?: boolean; choices: Array<{ name: string; price?: number }> }> }>) {
  const catMap = new Map<string, number>();
  let categories = 0;
  let items = 0;
  let options = 0;
  for (const m of menu) {
    const catName = String(m.category || "Diğer").trim() || "Diğer";
    const catKey = catName.toLowerCase();
    let catId = catMap.get(catKey);
    if (!catId) {
      const q = r(await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active)
        VALUES (${vendorId}, ${catName}, 999, true)
        ON CONFLICT DO NOTHING
        RETURNING id
      `));
      if (q[0]?.id) catId = Number(q[0].id);
      if (!catId) {
        const ex = r(await db.execute(sql`
          SELECT id FROM vendor_menu_categories
          WHERE vendor_id = ${vendorId} AND LOWER(name) = LOWER(${catName})
          LIMIT 1
        `));
        if (ex[0]?.id) catId = Number(ex[0].id);
      }
      if (catId) {
        catMap.set(catKey, catId);
        categories++;
      }
    }
    if (!catId || !m.name) continue;
    const ins = r(await db.execute(sql`
      INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, image_url, active)
      VALUES (${vendorId}, ${catId}, ${m.name}, ${m.description || null}, ${m.price != null ? String(m.price) : "0"}, ${m.imageUrl || null}, true)
      ON CONFLICT DO NOTHING
      RETURNING id
    `));
    let itemId: number | null = ins[0]?.id ? Number(ins[0].id) : null;
    if (!itemId) {
      const ex = r(await db.execute(sql`
        SELECT id, menu_category_id, image_url FROM vendor_menu_items
        WHERE vendor_id = ${vendorId} AND LOWER(name) = LOWER(${m.name})
        LIMIT 1
      `));
      if (ex[0]?.id) {
        itemId = Number(ex[0].id);
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
    if (itemId) items++;
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
        options++;
      }
    }
  }
  return { categories, items, options };
}

type ExternalMenuImportInput = {
  sourceUrl?: string;
  menu?: ImportedMenuItem[];
  selectedCategories?: string[];
  city?: string;
  district?: string;
  neighborhood?: string;
  address?: string;
  phone?: string;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  platform?: ExternalPlatform | string;
  name?: string;
  prefetchedHtml?: string;
  prefetchedMenuJson?: unknown;
};

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

export async function runExternalMenuImportForVendor(vendorId: number, input: ExternalMenuImportInput) {
  let imported: ImportedVendorData;
  const prefetchedHtml = String(input.prefetchedHtml ?? "").trim();
  const hasPrefetchedHtml =
    prefetchedHtml.length > 400 ||
    (prefetchedHtml.startsWith("{") && /menu_categories|productCategories|menuCategories/i.test(prefetchedHtml));

  if (hasPrefetchedHtml) {
    const sourceUrl = String(input.sourceUrl || "").trim();
    if (!sourceUrl) throw new Error("sourceUrl zorunlu");
    imported = await importVendorFromExternalUrl(sourceUrl, {
      prefetchedHtml,
      prefetchedMenuJson: input.prefetchedMenuJson,
    });
  } else if (Array.isArray(input.menu) && input.menu.length > 0) {
    imported = {
      platform: (input.platform as ExternalPlatform) || "unknown",
      sourceUrl: String(input.sourceUrl || "").trim(),
      name: String(input.name || "").trim(),
      description: null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      neighborhood: input.neighborhood ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      rating: input.rating ?? null,
      reviewCount: input.reviewCount ?? null,
      isOpen: true,
      menu: input.menu,
    };
  } else {
    const sourceUrl = String(input.sourceUrl || "").trim();
    if (!sourceUrl) throw new Error("sourceUrl zorunlu");
    imported = await importVendorFromExternalUrl(sourceUrl, {
      prefetchedHtml: input.prefetchedHtml,
      prefetchedMenuJson: input.prefetchedMenuJson,
    });
  }
  const menuToImport = filterMenuSelection(imported.menu, input.selectedCategories);
  const [vendor] = r(await db.execute<Row>(sql`SELECT id, notes FROM vendors WHERE id = ${vendorId} LIMIT 1`));
  if (!vendor) throw new Error("İşletme bulunamadı");
  const neighborhood = input.neighborhood || imported.neighborhood || null;
  const notes = [
    String(vendor.notes ?? ""),
    `source_platform:${imported.platform}`,
    imported.sourceUrl ? `source_url:${imported.sourceUrl}` : "",
    imported.sourceId ? `source_id:${imported.sourceId}` : "",
    neighborhood ? `neighborhood:${neighborhood}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const ratingVal =
    imported.rating != null && imported.rating > 0 && imported.rating <= 5 ? imported.rating : null;
  const reviewCountVal =
    imported.reviewCount != null && imported.reviewCount >= 0 ? Math.round(imported.reviewCount) : null;
  const mergedAddress = buildMergedAddress({
    address: input.address || imported.address,
    neighborhood,
  });
  await db.execute(sql`
    UPDATE vendors SET
      notes = ${notes},
      working_hours = COALESCE(${imported.workingHours || null}, working_hours),
      image_url = COALESCE(${imported.imageUrl || null}, image_url),
      cover_url = COALESCE(${imported.coverUrl || null}, cover_url),
      phone = COALESCE(${input.phone || imported.phone || null}, phone),
      address = COALESCE(${mergedAddress || null}, address),
      city = COALESCE(${input.city || imported.city || null}, city),
      district = COALESCE(${input.district || imported.district || null}, district),
      lat = COALESCE(${Number.isFinite(Number(input.lat)) ? Number(input.lat) : (imported.lat ?? null)}, lat),
      lng = COALESCE(${Number.isFinite(Number(input.lng)) ? Number(input.lng) : (imported.lng ?? null)}, lng),
      rating = COALESCE(${ratingVal}, rating),
      review_count = COALESCE(${reviewCountVal}, review_count),
      updated_at = now()
    WHERE id = ${vendorId}
  `);
  const menuStats = await importMenuIntoVendor(vendorId, menuToImport);
  return { imported, menuStats, menuToImport, preview: buildExternalMenuPreview({ ...imported, menu: menuToImport }) };
}

function sanitizeRegistrationHost(raw: unknown): string | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s || s.length > 200) return null;
  if (!/^[a-z0-9.-]+$/.test(s)) return null;
  return s;
}

/* ────────────────────────────────────────────────────────
   PUBLIC — Başvuru gönder
   POST /api/providers/apply
──────────────────────────────────────────────────────── */
router.post("/providers/apply", async (req, res): Promise<void> => {
  const {
    businessName, providerType, providerSubtype,
    ownerName, ownerEmail, phone, address, city, district,
    lat, lng, description, docKimlik, docVergi, docImza,
    revenueModel: revenueModelRaw, commissionRatePct: commissionRateRaw,
    registrationHost: registrationHostBody,
  } = req.body as Record<string, unknown>;

  const registrationHost =
    sanitizeRegistrationHost(registrationHostBody) ??
    sanitizeRegistrationHost(
      typeof req.headers["x-forwarded-host"] === "string"
        ? req.headers["x-forwarded-host"].split(",")[0]?.trim()
        : undefined,
    ) ??
    sanitizeRegistrationHost(typeof req.headers.host === "string" ? req.headers.host.split(":")[0] : undefined);

  const registrationNote = registrationHost
    ? `Kayıt kaynağı: ${registrationHost} alan adından işletme başvurusu (Yekpare).`
    : null;

  if (!businessName || !providerType || !ownerName || !ownerEmail || !phone) {
    res.status(400).json({ error: "Zorunlu alanlar eksik" });
    return;
  }

  const businessNameStr = String(businessName).trim();
  const providerTypeStr = String(providerType).trim();

  const revenueModel = normalizeRevenueModel(revenueModelRaw ?? "subscription");
  let commissionRatePct: number | null = null;
  if (revenueModel === "commission") {
    const r = parseFloat(String(commissionRateRaw ?? "").replace(",", "."));
    if (!Number.isFinite(r) || r <= 0 || r > 100) {
      res.status(400).json({
        error: "Komisyon modelinde geçerli bir komisyon oranı zorunludur (%1 ile %100 arası)",
      });
      return;
    }
    commissionRatePct = r;
  }

  /* Benzersiz slug oluştur */
  let baseSlug = slugify(businessNameStr);
  if (!baseSlug) baseSlug = "isletme";
  const existing = r(await db.execute<Row>(sql`SELECT slug FROM vendors WHERE slug LIKE ${baseSlug + "%"} ORDER BY slug`));
  const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${existing.length + 1}`;

  /* Vendor tipini belirle */
  const vendorType = providerTypeStr === "siparis" ? "delivery"
    : providerTypeStr === "alisveris" ? "ecommerce"
    : providerTypeStr;

  try {
    const rows = r(await db.execute<Row>(sql`
      INSERT INTO vendors (
        name, slug, description, vendor_type, phone, email, address, city, district,
        lat, lng, owner_name, owner_email, whatsapp,
        provider_type, provider_subtype, application_status,
        doc_kimlik, doc_vergi, doc_imza,
        revenue_model, commission_rate_pct,
        notes,
        active, is_open, featured, rating, review_count
      ) VALUES (
        ${businessNameStr}, ${slug}, ${description || null}, ${vendorType},
        ${phone}, ${ownerEmail}, ${address || null}, ${city || null}, ${district || null},
        ${lat ? Number(lat) : null}, ${lng ? Number(lng) : null},
        ${ownerName}, ${ownerEmail}, ${phone},
        ${providerTypeStr}, ${providerSubtype || null}, 'pending',
        ${docKimlik || null}, ${docVergi || null}, ${docImza || null},
        ${revenueModel}, ${commissionRatePct},
        ${registrationNote},
        false, false, false, 0, 0
      ) RETURNING id, slug, name
    `));

    const newVendor = rows[0];

    /* Admin'e WhatsApp bildirimi — fire and forget */
    notifyAdminWhatsApp({
      eventType: "Yeni Servis Sağlayıcı Başvurusu",
      details: [
        `🏢 ${businessNameStr}`,
        `👤 ${ownerName} (${ownerEmail})`,
        `📞 ${phone}`,
        `📍 ${city || ""} ${district || ""}`.trim(),
        `🏷️ ${PROVIDER_TYPE_LABELS[providerTypeStr] ?? providerTypeStr}`,
        revenueModel === "commission"
          ? `💳 Gelir: Komisyon (%${commissionRatePct})`
          : `💳 Gelir: Abonelik`,
        registrationNote ? `🌐 ${registrationNote}` : "",
      ].filter(Boolean).join("\n"),
      panelUrl: `https://yekpare.net/admin/servis-saglayicilar`,
    }).catch(() => {});

    const welcomeWa = [
      `Yekpare — Merhaba ${ownerName},`,
      ``,
      `${businessName} başvurunuz alındı. Kaydınız başarıyla oluşturulmuştur.`,
      ``,
      `Hesabınızın aktifleşmesi için kimlik, vergi levhası ve imza sirküsü gibi işletme belgelerinizi eksikse tamamlayın; başvuru formunda yüklediyseniz yönetici onayını bekleyin.`,
      ``,
      `Teşekkürler — Yekpare`,
    ].join("\n");
    void trySendSiteOutboundWhatsApp(String(phone), welcomeWa).catch(() => {});

    res.json({ success: true, vendor: newVendor });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Kayıt oluşturulamadı", detail: msg });
  }
});

/* ────────────────────────────────────────────────────────
   ADMIN — Tüm başvuruları listele (durum filtresi ile)
   GET /api/admin/providers?status=pending|approved|rejected&type=...
──────────────────────────────────────────────────────── */
router.get("/admin/providers", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const { status, type, q } = req.query as Record<string, string>;
  const statusFilter = typeof status === "string" && status.trim() ? status.trim() : null;
  const typeFilter = typeof type === "string" && type.trim() ? type.trim() : null;

  const rows = r(await db.execute<Row>(
    sql`
      SELECT
        v.id, v.name, v.slug, v.vendor_type, v.provider_type, v.provider_subtype,
        v.application_status, v.rejection_reason,
        v.owner_name, v.owner_email, v.phone, v.email,
        v.address, v.city, v.district, v.lat, v.lng,
        v.description, v.image_url, v.cover_url,
        v.active, v.is_open, v.featured, v.rating, v.review_count,
        v.doc_kimlik, v.doc_vergi, v.doc_imza, v.verified_at,
        v.notes, v.created_at, v.updated_at,
        v.revenue_model, v.commission_rate_pct,
        v.payout_bank_holder, v.payout_bank_iban, v.payout_bank_branch,
        v.geliver_api_token, v.geliver_sender_zip, v.geliver_sender_mahalle, v.geliver_auto_ship_on_order,
        (SELECT COUNT(*)::int FROM delivery_orders WHERE vendor_id = v.id) as order_count,
        (SELECT COUNT(*)::int FROM vendor_menu_items WHERE vendor_id = v.id) as product_count
      FROM vendors v
      WHERE (${statusFilter} IS NULL OR v.application_status = ${statusFilter})
        AND (${typeFilter} IS NULL OR v.provider_type = ${typeFilter} OR v.vendor_type = ${typeFilter})
      ORDER BY v.created_at DESC
    `
  ));

  const withGeliver = rows.map((raw) => {
    const v = raw as Row;
    const tok = String(v.geliver_api_token ?? "").trim();
    const { geliver_api_token: _t, ...rest } = v;
    return {
      ...rest,
      geliver_api_token_masked: tok ? maskSecret(tok) : "",
      geliver_configured: Boolean(tok),
    } as Row;
  });

  let result = withGeliver;
  if (q) {
    const lq = q.toLowerCase();
    result = withGeliver.filter((v) => {
      const id = Number((v as Row).id);
      return (
        String(v.name || "").toLowerCase().includes(lq) ||
        String(v.slug || "").toLowerCase().includes(lq) ||
        String(v.owner_name || "").toLowerCase().includes(lq) ||
        String(v.owner_email || "").toLowerCase().includes(lq) ||
        String(v.email || "").toLowerCase().includes(lq) ||
        String(v.city || "").toLowerCase().includes(lq) ||
        String(id).includes(lq)
      );
    });
  }

  res.json(result);
});

/* ────────────────────────────────────────────────────────
   ADMIN — Onayla
   PUT /api/admin/providers/:id/approve
──────────────────────────────────────────────────────── */
router.put("/admin/providers/:id/approve", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const tempPassword = vendorApprovalTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const rows = r(await db.execute<Row>(sql`
    UPDATE vendors
    SET application_status = 'approved', active = true, is_open = true,
        verified_at = NOW(), updated_at = NOW(),
        password_hash = ${passwordHash}
    WHERE id = ${id}
    RETURNING id, name, slug, lat, lng, image_url, city, district, address, phone,
              vendor_type, provider_type, provider_subtype, owner_name, owner_email
  `));

  const v = rows[0];
  if (!v) { res.status(404).json({ error: "Bulunamadı" }); return; }

  /* Haritada premium pin olarak ekle / güncelle */
  if (v.lat && v.lng) {
    await db.execute<Row>(sql`
      INSERT INTO map_businesses (
        name, address, city, district, phone, lat, lng,
        is_premium, is_active, vendor_id,
        photo_url, category_id, created_at
      ) VALUES (
        ${v.name}, ${v.address || ""}, ${v.city || "Kırşehir"},
        ${v.district || null}, ${v.phone || null},
        ${v.lat}, ${v.lng},
        true, true, ${id},
        ${v.image_url || null}, 1, NOW()
      )
      ON CONFLICT (vendor_id) DO UPDATE SET
        name = EXCLUDED.name, is_premium = true, is_active = true,
        lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = NOW()
    `).catch(() => {});
  }

  const baseUrl = sitePublicOrigin();

  /* Aktivasyon e-postası gönder */
  let emailSent = false;
  if (v.owner_email) {
    const mail = buildActivationEmail({
      vendorName: v.name as string,
      ownerName: (v.owner_name as string) || "İşletme Sahibi",
      email: v.owner_email as string,
      password: tempPassword,
      loginUrl: `${baseUrl}/servis-saglayici-giris`,
    });
    const result = await sendEmail({ to: v.owner_email as string, subject: mail.subject, html: mail.html, text: mail.text });
    emailSent = result.sent;
  }

  /* Vendor'a WhatsApp onay bildirimi — fire and forget */
  const waResult = await notifyVendorWhatsApp({
    vendorId: id,
    eventType: "new_request",
    details: [
      `🎉 *${v.name}* işletmenizin başvurusu onaylandı!`,
      `📧 Giriş e-postanız: ${v.owner_email || "kayıtlı e-posta"}`,
      `🔑 Varsayılan şifreniz: ${tempPassword}`,
      `⚠️ Güvenliğiniz için şifrenizi değiştirin.`,
    ].join("\n"),
    panelUrl: `${baseUrl}/servis-saglayici-giris`,
  });

  res.json({ success: true, vendor: v, emailSent, whatsapp: waResult });
});

/* ────────────────────────────────────────────────────────
   ADMIN — İşletme şifresini sıfırla
   POST /api/admin/providers/:id/set-password
──────────────────────────────────────────────────────── */
router.post("/admin/providers/:id/set-password", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["servis_saglayicilar", "turizm", "ulasim"])) return;
  const id = Number(req.params.id);
  const { password } = req.body as { password?: string };
  if (!id) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  if (!password || password.length < 4) { res.status(400).json({ error: "Şifre en az 4 karakter olmalı" }); return; }

  try {
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS password_hash text`);
    const hash = await bcrypt.hash(password, 10);
    await db.execute(sql`UPDATE vendors SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${id}`);
    res.json({ success: true });
  } catch (e) {
    console.error("[set-password]", e);
    res.status(500).json({ success: false, error: "Şifre kaydedilemedi", detail: String(e) });
  }
});

router.post("/admin/providers/:id/panel-session", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["servis_saglayicilar", "turizm", "ulasim"])) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, slug, vendor_type, provider_type, provider_subtype, owner_email, email, active, is_open
    FROM vendors
    WHERE id = ${id}
    LIMIT 1
  `));
  const v = rows[0];
  if (!v) { res.status(404).json({ error: "İşletme bulunamadı" }); return; }
  const loginEmail = String(v.owner_email ?? "").trim() || String(v.email ?? "").trim();
  if (!loginEmail) { res.status(400).json({ error: "Bu işletmede giriş e-postası yok" }); return; }
  attachProviderPanelRoute(v);
  const token = signVendorSessionToken(Number(v.id), loginEmail);
  res.json({
    success: true,
    token,
    vendor: {
      ...v,
      login_email: loginEmail,
    },
    session: {
      id: Number(v.id),
      email: loginEmail,
      name: String(v.name ?? ""),
      token,
      panelKind: v.panel_kind,
      panelPath: v.panel_route,
    },
  });
});

/* ────────────────────────────────────────────────────────
   ADMIN — Reddet
   PUT /api/admin/providers/:id/reject
──────────────────────────────────────────────────────── */
router.put("/admin/providers/:id/reject", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  const { reason } = req.body;
  if (!id) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const rows = r(await db.execute<Row>(sql`
    UPDATE vendors
    SET application_status = 'rejected', active = false,
        rejection_reason = ${reason || null}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, name
  `));

  const v = rows[0];

  /* Vendor'a WhatsApp red bildirimi — fire and forget */
  const waResult = await notifyVendorWhatsApp({
    vendorId: id,
    eventType: "new_request",
    details: [
      `❌ *${v?.name ?? "İşletme"}* başvurunuz incelendi.`,
      reason ? `📋 Sebep: ${reason}` : "",
      `Eksiklerinizi tamamlayıp yeniden başvurabilirsiniz.`,
    ].filter(Boolean).join("\n"),
    panelUrl: `https://yekpare.net/isletme-basvuru`,
  });

  res.json({ success: true, vendor: v, whatsapp: waResult });
});

/* ────────────────────────────────────────────────────────
   ADMIN — Notlar güncelle
   PUT /api/admin/providers/:id/notes
──────────────────────────────────────────────────────── */
router.put("/admin/providers/:id/notes", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  const { notes } = req.body;
  await db.execute<Row>(sql`UPDATE vendors SET notes = ${notes || null}, updated_at = NOW() WHERE id = ${id}`);
  res.json({ success: true });
});

router.patch("/admin/providers/:id/geliver-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  await ensureGeliverIntegrationColumns();

  const body = req.body as Record<string, unknown>;
  const geliverApiToken = body["geliverApiToken"];
  const geliverSenderZip = body["geliverSenderZip"];
  const geliverSenderMahalle = body["geliverSenderMahalle"];
  const geliverAutoShipOnOrder = body["geliverAutoShipOnOrder"];

  const curRows = r(await db.execute<Row>(sql`
    SELECT geliver_api_token, geliver_sender_zip, geliver_sender_address_id, geliver_auto_ship_on_order,
           geliver_sender_mahalle
    FROM vendors WHERE id = ${id} LIMIT 1
  `));
  const cur = curRows[0];
  if (!cur) { res.status(404).json({ error: "Bulunamadı" }); return; }

  let nextToken = cur.geliver_api_token != null ? String(cur.geliver_api_token) : null;
  if (geliverApiToken !== undefined) {
    const t = String(geliverApiToken ?? "").trim();
    nextToken = t.length ? t : null;
  }

  const prevZ = cur.geliver_sender_zip != null ? String(cur.geliver_sender_zip) : null;
  let nextZip = prevZ;
  if (geliverSenderZip !== undefined) {
    const z = String(geliverSenderZip ?? "").trim().replace(/\D/g, "").slice(0, 5);
    nextZip = z.length ? z : null;
  }

  const prevM = normGeliverMahalle(cur.geliver_sender_mahalle);
  let nextM = prevM;
  if (geliverSenderMahalle !== undefined) {
    nextM = normGeliverMahalle(geliverSenderMahalle);
  }

  let nextSender = cur.geliver_sender_address_id != null ? String(cur.geliver_sender_address_id) : null;
  if (geliverApiToken !== undefined && !String(geliverApiToken ?? "").trim()) {
    nextSender = null;
  }

  const zipChanged = geliverSenderZip !== undefined && String(nextZip ?? "") !== String(prevZ ?? "");
  const mahalleChanged = geliverSenderMahalle !== undefined && String(nextM ?? "") !== String(prevM ?? "");
  if (zipChanged || mahalleChanged) nextSender = null;

  let nextAuto = Boolean(cur.geliver_auto_ship_on_order);
  if (geliverAutoShipOnOrder !== undefined) nextAuto = Boolean(geliverAutoShipOnOrder);

  await db.execute(sql`
    UPDATE vendors SET
      geliver_api_token = ${nextToken},
      geliver_sender_zip = ${nextZip},
      geliver_sender_address_id = ${nextSender},
      geliver_sender_mahalle = ${nextM},
      geliver_auto_ship_on_order = ${nextAuto},
      updated_at = NOW()
    WHERE id = ${id}
  `);

  res.json({
    success: true,
    geliver_api_token_masked: nextToken ? maskSecret(nextToken) : "",
    geliver_configured: Boolean(nextToken),
    geliver_sender_zip: nextZip,
    geliver_sender_mahalle: nextM,
    geliver_auto_ship_on_order: nextAuto,
  });
});

router.patch("/admin/providers/:id/revenue-model", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  const { revenueModel: rmRaw, commissionRatePct: crRaw } = req.body as Record<string, unknown>;
  const model = normalizeRevenueModel(rmRaw ?? "subscription");
  let rate: string | null = null;
  if (model === "commission") {
    const r = parseFloat(String(crRaw ?? "").replace(",", "."));
    if (!Number.isFinite(r) || r <= 0 || r > 100) {
      res.status(400).json({ error: "Komisyon oranı 1 ile 100 arasında olmalıdır" });
      return;
    }
    rate = String(r);
  }
  await db.execute(sql`
    UPDATE vendors SET
      revenue_model = ${model},
      commission_rate_pct = ${rate},
      updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ success: true });
});

/* ────────────────────────────────────────────────────────
   PROVIDER AUTH — E-posta ile giriş
   POST /api/providers/forgot-password
──────────────────────────────────────────────────────── */
router.post("/providers/forgot-password", async (req, res): Promise<void> => {
  const { email, whatsapp } = req.body as { email?: string; whatsapp?: string };
  const emailTrim = String(email ?? "").trim();
  const waTrim = String(whatsapp ?? "").trim();
  if (!emailTrim && !waTrim) {
    res.status(400).json({ error: "E-posta veya WhatsApp numarası girin." });
    return;
  }

  let v: Row | undefined;
  if (emailTrim) {
    const rows = r(await db.execute<Row>(sql`
      SELECT id, name, owner_name, owner_email, email, whatsapp, phone, callmebot_key FROM vendors
      WHERE ${sqlVendorSessionEmailMatches(emailTrim)} AND application_status = 'approved'
      LIMIT 1
    `));
    v = rows[0];
  } else {
    const variants = phoneDigitsVariants(waTrim);
    if (variants.length === 0) {
      res.status(400).json({ error: "Geçerli bir telefon numarası girin." });
      return;
    }
    const orParts = variants.flatMap((variant) => [
      sql`regexp_replace(COALESCE(v.whatsapp,''), '[^0-9]', '', 'g') = ${variant}`,
      sql`regexp_replace(COALESCE(v.phone,''), '[^0-9]', '', 'g') = ${variant}`,
    ]);
    const orClause = sql.join(orParts, sql` OR `);
    const rows = r(await db.execute<Row>(sql`
      SELECT id, name, owner_name, owner_email, email, whatsapp, phone, callmebot_key FROM vendors v
      WHERE v.application_status = 'approved' AND (${orClause})
      ORDER BY v.id DESC
      LIMIT 1
    `));
    v = rows[0];
  }

  /* Güvenlik: hesap yoksa da success döndür */
  if (!v) {
    res.json({ success: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db.execute(sql`
    UPDATE vendors SET pw_reset_token = ${token}, pw_reset_expires_at = ${expiresAt}
    WHERE id = ${Number(v.id)}
  `);

  const baseUrl = sitePublicOrigin();
  const resetUrl = `${baseUrl}/sifre-yenile?token=${token}`;

  let emailSent = false;
  const mail = buildPasswordResetEmail({
    ownerName: (v.owner_name as string) || "İşletme Sahibi",
    vendorName: v.name as string,
    resetUrl,
  });
  const toAddr = String(v.owner_email || v.email || "").trim();
  if (toAddr) {
    const result = await sendEmail({ to: toAddr, subject: mail.subject, html: mail.html, text: mail.text });
    emailSent = result.sent;
  }

  const waMsg = `Yekpare — Şifre sıfırlama\n\nBağlantıyı açın (yaklaşık 30 dk):\n${resetUrl}\n\nBu isteği siz yapmadıysanız bu mesajı yok sayın.`;
  const waKey = String(v.callmebot_key ?? "").trim();
  const destRaw = String(v.whatsapp ?? v.phone ?? "").trim();
  let whatsappSent = false;
  if (destRaw) {
    if (waKey) {
      const waPhone = digitsForWhatsAppLink(destRaw);
      if (waPhone) {
        const u = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(waPhone)}&text=${encodeURIComponent(waMsg)}&apikey=${encodeURIComponent(waKey)}`;
        try {
          const wr = await fetch(u, { signal: AbortSignal.timeout(8000) });
          whatsappSent = wr.ok;
        } catch {
          whatsappSent = false;
        }
      }
    }
    if (!whatsappSent) {
      const r2 = await trySendSiteOutboundWhatsApp(destRaw, waMsg);
      whatsappSent = r2.sent;
    }
  }

  res.json({
    success: true,
    emailSent,
    whatsappSent,
    ...(process.env["NODE_ENV"] !== "production" ? { _devLink: resetUrl } : {}),
  });
});

/* ────────────────────────────────────────────────────────
   POST /api/providers/reset-password
──────────────────────────────────────────────────────── */
router.post("/providers/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) { res.status(400).json({ error: "Token ve şifre gerekli" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Şifre en az 6 karakter olmalı" }); return; }

  const rows = r(await db.execute<Row>(sql`
    SELECT id, pw_reset_expires_at FROM vendors WHERE pw_reset_token = ${token} LIMIT 1
  `));
  const v = rows[0];
  if (!v) { res.status(400).json({ error: "Geçersiz sıfırlama linki." }); return; }
  if (!v.pw_reset_expires_at || new Date(v.pw_reset_expires_at as string) < new Date()) {
    res.status(400).json({ error: "Sıfırlama linkinin süresi dolmuş. Lütfen tekrar talep edin." }); return;
  }

  const hash = await bcrypt.hash(password, 10);
  await db.execute(sql`
    UPDATE vendors SET password_hash = ${hash}, pw_reset_token = NULL, pw_reset_expires_at = NULL
    WHERE id = ${Number(v.id)}
  `);
  res.json({ success: true });
});

/* ────────────────────────────────────────────────────────
   POST /api/providers/login
   Body: { email, password }
──────────────────────────────────────────────────────── */
router.post("/providers/login", async (req, res): Promise<void> => {
  const { email, password, captchaToken, captchaAnswer } = req.body as {
    email?: string;
    password?: string;
    captchaToken?: string;
    captchaAnswer?: string;
  };
  if (!verifyLoginMathCaptcha(String(captchaToken ?? ""), String(captchaAnswer ?? ""))) {
    res.status(400).json({ error: "Güvenlik doğrulaması hatalı veya süresi doldu." });
    return;
  }
  const emailTrim = String(email ?? "").trim();
  if (!emailTrim) { res.status(400).json({ error: "E-posta gerekli" }); return; }
  if (!password) { res.status(400).json({ error: "Şifre gerekli" }); return; }

  /** Aynı e-postayla birden fazla `vendors` satırı varsa `created_at` yerine `updated_at` ile seç; admin şifre sıfırlaması güncellenen satırda kalır. */
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, slug, vendor_type, provider_type, provider_subtype,
           application_status, rejection_reason, owner_name, owner_email,
           email,
           phone, city, active, image_url, cover_url, verified_at, notes, password_hash,
           linked_map_business_id, membership_tier
    FROM vendors
    WHERE ${sqlVendorSessionEmailMatches(emailTrim)}
    ORDER BY updated_at DESC NULLS LAST, id DESC
    LIMIT 1
  `));

  const v = rows[0];
  if (!v) {
    res.status(404).json({ error: "Bu e-posta ile kayıtlı işletme bulunamadı." });
    return;
  }

  const storedHash = v.password_hash as string | null;
  if (!storedHash) {
    res.status(403).json({ error: "Bu hesap için şifre tanımlanmamış. Lütfen yönetici ile iletişime geçin." });
    return;
  }
  const passwordOk = await bcrypt.compare(String(password), storedHash);
  if (!passwordOk) {
    res.status(401).json({ error: "Şifre hatalı." });
    return;
  }

  const loginEmail =
    String(v.owner_email ?? "").trim() ||
    String(v.email ?? "").trim() ||
    String(email).trim();
  delete v.password_hash;
  (v as Record<string, unknown>).login_email = loginEmail;
  attachProviderPanelRoute(v);

  const token = signVendorSessionToken(Number(v.id), loginEmail);
  res.json({ success: true, token, vendor: v });
});

router.use("/providers", requireVendorSession);

/* ────────────────────────────────────────────────────────
   PROVIDER AUTH — Mevcut oturumu doğrula
   GET /api/providers/me
   Header: Authorization: Bearer <signed vendor token>
──────────────────────────────────────────────────────── */
router.get("/providers/me", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];

  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }

  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, slug, vendor_type, provider_type, provider_subtype,
           application_status, rejection_reason, owner_name, owner_email,
           phone, email, address, city, district, lat, lng, description, about_html,
           image_url, cover_url, whatsapp, working_hours,
           active, is_open, featured, rating, review_count,
           doc_kimlik, doc_vergi, doc_imza, verified_at, notes,
           revenue_model, commission_rate_pct,
           payout_bank_holder, payout_bank_iban, payout_bank_branch,
           geliver_api_token, geliver_sender_address_id, geliver_sender_zip, geliver_sender_mahalle, geliver_auto_ship_on_order,
           geliver_organization_id,
           paytr_merchant_id, paytr_merchant_key, paytr_merchant_salt, paytr_test_mode,
           iyzico_api_key, iyzico_secret_key, iyzico_sandbox, preferred_tr_gateway,
           linked_map_business_id, membership_tier, about_html,
           theme_key, theme_config,
           created_at, updated_at
    FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `));

  const v = rows[0];
  if (!v) { res.status(401).json({ error: "Geçersiz oturum" }); return; }

  const iyzicoConfigured = Boolean(String(v.iyzico_api_key ?? "").trim());
  const paytrMerchantIdRaw = String(v.paytr_merchant_id ?? "").trim();
  const paytrConfigured = Boolean(
    paytrMerchantIdRaw && String(v.paytr_merchant_key ?? "").trim() && String(v.paytr_merchant_salt ?? "").trim(),
  );
  delete v.paytr_merchant_id;
  delete v.paytr_merchant_key;
  delete v.paytr_merchant_salt;
  delete v.iyzico_api_key;
  delete v.iyzico_secret_key;
  (v as Record<string, unknown>).paytr_merchant_id_masked = paytrMerchantIdRaw ? `****${paytrMerchantIdRaw.slice(-4)}` : "";
  (v as Record<string, unknown>).paytr_configured = paytrConfigured;
  (v as Record<string, unknown>).iyzico_configured = iyzicoConfigured;

  const geliverTok = String(v.geliver_api_token ?? "").trim();
  delete v.geliver_api_token;
  (v as Record<string, unknown>).geliver_api_token_masked = geliverTok ? maskSecret(geliverTok) : "";

  await ensureVendorThemeColumns();
  /* Sipariş sayısı ve ürün sayısı */
  const stats = r(await db.execute<Row>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM delivery_orders WHERE vendor_id = ${Number(vendorId)}) as order_count,
      (SELECT COUNT(*)::int FROM vendor_menu_items WHERE vendor_id = ${Number(vendorId)}) as product_count,
      (SELECT COUNT(*)::int FROM delivery_orders WHERE vendor_id = ${Number(vendorId)} AND status = 'pending') as pending_orders
  `));

  const [siteRow] = await db.select().from(siteSettingsTable).limit(1);
  (v as Record<string, unknown>).membership_pricing = membershipPricingFromSiteRow(siteRow);

  await ensureVendorCustomDomainsTable();
  (v as Record<string, unknown>).custom_domains = await listVendorDomains(Number(vendorId));
  attachProviderPanelRoute(v);

  res.json({ success: true, vendor: { ...v, ...(stats[0] || {}) } });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Profil güncelle
   PUT /api/providers/profile
──────────────────────────────────────────────────────── */
router.put("/providers/profile", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Kimlik doğrulama gerekli" }); return; }

  const {
    name,
    phone,
    address,
    city,
    district,
    description,
    aboutHtml,
    whatsapp,
    workingHours,
    callmebotKey,
    imageUrl,
    coverUrl,
    contactEmail,
    ownerEmail,
  } = req.body as Record<string, unknown>;

  const hasImage = Object.prototype.hasOwnProperty.call(req.body, "imageUrl");
  const hasCover = Object.prototype.hasOwnProperty.call(req.body, "coverUrl");
  const hasContact = Object.prototype.hasOwnProperty.call(req.body, "contactEmail");
  const hasOwnerEm = Object.prototype.hasOwnProperty.call(req.body, "ownerEmail");
  const hasAboutHtml = Object.prototype.hasOwnProperty.call(req.body, "aboutHtml");
  const imageVal = hasImage
    ? (imageUrl == null ? null : String(imageUrl).trim() || null)
    : undefined;
  const coverVal = hasCover ? (coverUrl == null ? null : String(coverUrl).trim() || null) : undefined;
  const emailVal = hasContact ? (contactEmail == null ? null : String(contactEmail).trim() || null) : undefined;
  const ownerEmVal = hasOwnerEm ? (ownerEmail == null ? null : String(ownerEmail).trim() || null) : undefined;
  const aboutHtmlVal = hasAboutHtml
    ? aboutHtml == null
      ? null
      : String(aboutHtml).trim().slice(0, 60_000) || null
    : undefined;

  const rows = r(await db.execute<Row>(sql`
    UPDATE vendors
    SET
      name        = COALESCE(${name || null}, name),
      phone       = COALESCE(${phone || null}, phone),
      address     = COALESCE(${address || null}, address),
      city        = COALESCE(${city || null}, city),
      district    = COALESCE(${district || null}, district),
      description = COALESCE(${description || null}, description),
      about_html  = CASE WHEN ${hasAboutHtml}::boolean THEN ${hasAboutHtml ? aboutHtmlVal : null} ELSE about_html END,
      whatsapp    = COALESCE(${whatsapp || null}, whatsapp),
      callmebot_key = COALESCE(${callmebotKey !== undefined ? (callmebotKey || null) : null}, callmebot_key),
      working_hours = COALESCE(${workingHours ? JSON.stringify(workingHours) : null}, working_hours),
      image_url   = CASE WHEN ${hasImage}::boolean THEN ${hasImage ? imageVal : null} ELSE image_url END,
      cover_url   = CASE WHEN ${hasCover}::boolean THEN ${hasCover ? coverVal : null} ELSE cover_url END,
      email       = CASE WHEN ${hasContact}::boolean THEN ${hasContact ? emailVal : null} ELSE email END,
      owner_email = CASE WHEN ${hasOwnerEm}::boolean THEN ${hasOwnerEm ? ownerEmVal : null} ELSE owner_email END,
      updated_at  = NOW()
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    RETURNING id, name, phone, address, city, district, description, about_html, whatsapp, callmebot_key, working_hours,
              image_url, cover_url, email, owner_email
  `));

  if (!rows[0]) { res.status(401).json({ error: "Yetkisiz" }); return; }
  res.json({ success: true, vendor: rows[0] });
});

router.put("/providers/payout-bank", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Kimlik doğrulama gerekli" }); return; }

  const { payoutBankHolder, payoutBankIban, payoutBankBranch } = req.body as Record<string, string | undefined>;
  const holder = String(payoutBankHolder ?? "").trim();
  const ibanRaw = sanitizeTrIban(String(payoutBankIban ?? ""));
  const branch = String(payoutBankBranch ?? "").trim() || null;

  if (!holder || !ibanRaw) {
    res.status(400).json({ error: "Hesap sahibi adı ve IBAN zorunludur" });
    return;
  }

  const check = r(await db.execute<Row>(sql`
    SELECT id, revenue_model FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `))[0];
  if (!check) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  if (String(check.revenue_model ?? "subscription") !== "commission") {
    res.status(400).json({ error: "Banka bilgisi yalnızca komisyon modelindeki işletmeler için kullanılır" });
    return;
  }

  await db.execute(sql`
    UPDATE vendors SET
      payout_bank_holder = ${holder},
      payout_bank_iban = ${ibanRaw},
      payout_bank_branch = ${branch},
      updated_at = NOW()
    WHERE id = ${Number(vendorId)}
  `);

  res.json({ success: true });
});

router.put("/providers/geliver-settings", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Kimlik doğrulama gerekli" }); return; }
  await ensureGeliverIntegrationColumns();

  const body = req.body as Record<string, unknown>;
  const geliverApiToken = body["geliverApiToken"];
  const geliverSenderZip = body["geliverSenderZip"];
  const geliverSenderMahalle = body["geliverSenderMahalle"];
  const geliverSenderAddressId = body["geliverSenderAddressId"];
  const geliverOrganizationId = body["geliverOrganizationId"];
  const geliverAutoShipOnOrder = body["geliverAutoShipOnOrder"];

  const rows = r(await db.execute<Row>(sql`
    SELECT id, geliver_api_token, geliver_sender_zip, geliver_sender_address_id, geliver_auto_ship_on_order,
           geliver_sender_mahalle, geliver_organization_id
    FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `));
  const cur = rows[0];
  if (!cur) { res.status(401).json({ error: "Yetkisiz" }); return; }

  let nextToken = cur.geliver_api_token != null ? String(cur.geliver_api_token) : null;
  if (geliverApiToken !== undefined) {
    const t = String(geliverApiToken ?? "").trim();
    nextToken = t.length ? t : null;
  }

  const prevZ = cur.geliver_sender_zip != null ? String(cur.geliver_sender_zip) : null;
  let nextZip = prevZ;
  if (geliverSenderZip !== undefined) {
    const z = String(geliverSenderZip ?? "").trim().replace(/\D/g, "").slice(0, 5);
    nextZip = z.length ? z : null;
  }

  const prevM = normGeliverMahalle(cur.geliver_sender_mahalle);
  let nextM = prevM;
  if (geliverSenderMahalle !== undefined) {
    nextM = normGeliverMahalle(geliverSenderMahalle);
  }

  let nextSender = cur.geliver_sender_address_id != null ? String(cur.geliver_sender_address_id) : null;
  if (geliverSenderAddressId !== undefined) {
    const s = String(geliverSenderAddressId ?? "").trim();
    nextSender = s.length ? s : null;
  }

  const zipChanged = geliverSenderZip !== undefined && String(nextZip ?? "") !== String(prevZ ?? "");
  const mahalleChanged = geliverSenderMahalle !== undefined && String(nextM ?? "") !== String(prevM ?? "");
  if (zipChanged || mahalleChanged) nextSender = null;

  const prevOrg = cur.geliver_organization_id != null ? String(cur.geliver_organization_id) : null;
  let nextOrg = prevOrg;
  if (geliverOrganizationId !== undefined) {
    const o = String(geliverOrganizationId ?? "").trim();
    nextOrg = o.length ? o : null;
  }

  if (geliverApiToken !== undefined && !String(geliverApiToken ?? "").trim()) {
    nextSender = null;
    nextOrg = null;
  }

  let nextAuto = Boolean(cur.geliver_auto_ship_on_order);
  if (geliverAutoShipOnOrder !== undefined) nextAuto = Boolean(geliverAutoShipOnOrder);

  await db.execute(sql`
    UPDATE vendors SET
      geliver_api_token = ${nextToken},
      geliver_sender_zip = ${nextZip},
      geliver_sender_address_id = ${nextSender},
      geliver_sender_mahalle = ${nextM},
      geliver_organization_id = ${nextOrg},
      geliver_auto_ship_on_order = ${nextAuto},
      updated_at = NOW()
    WHERE id = ${Number(vendorId)}
  `);

  res.json({
    success: true,
    geliverApiTokenMasked: nextToken ? maskSecret(nextToken) : "",
    geliverSenderZip: nextZip,
    geliverSenderMahalle: nextM,
    geliverSenderAddressId: nextSender,
    geliverOrganizationId: nextOrg,
    geliverAutoShipOnOrder: nextAuto,
  });
});

/**
 * POST /api/providers/geliver/manual-shipment
 * Siparişe bağlı olmayan manuel gönderi: yalnızca teklifler (etiket Geliver panelinde).
 */
router.post("/providers/geliver/manual-shipment", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  await ensureGeliverIntegrationColumns();

  const own = r(
    await db.execute<Row>(sql`
    SELECT id FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const rec = body.recipient as Record<string, unknown> | undefined;
  if (!rec || typeof rec !== "object") {
    res.status(400).json({ error: "Alıcı bilgisi (recipient) gerekli." });
    return;
  }
  const name = String(rec.name ?? "").trim();
  const phone = String(rec.phone ?? "").trim();
  const address1 = String(rec.address1 ?? "").trim();
  const city = String(rec.city ?? "").trim();
  const district = String(rec.district ?? "").trim();
  const neighborhood = String(rec.neighborhood ?? rec.mahalle ?? "").trim();
  if (!name || !phone || !address1 || !city) {
    res.status(400).json({ error: "Alıcı: ad, telefon, adres (sokak/satır), şehir zorunlu." });
    return;
  }
  if (!district) {
    res.status(400).json({ error: "İlçe seçilmeli." });
    return;
  }
  if (!neighborhood) {
    res.status(400).json({ error: "Mahalle seçilmeli (il–ilçe–mahalle listesinden)." });
    return;
  }

  const lengthCm = String(body.lengthCm ?? "").trim();
  const widthCm = String(body.widthCm ?? "").trim();
  const heightCm = String(body.heightCm ?? "").trim();
  const weightKg = String(body.weightKg ?? "").trim();
  if (!lengthCm || !widthCm || !heightCm || !weightKg) {
    res.status(400).json({ error: "Paket: boy, en, yükseklik (cm) ve ağırlık (kg) zorunlu." });
    return;
  }

  const zipRaw = rec.zip != null ? String(rec.zip).trim().replace(/\D/g, "").slice(0, 5) : "";
  const emailRaw = rec.email != null ? String(rec.email).trim() : "";
  const reference = body.reference != null ? String(body.reference).trim() : "";
  const senderAddressIdRaw = body.senderAddressId != null ? String(body.senderAddressId).trim() : "";

  const result = await createGeliverManualShipment({
    vendorId: Number(vendorId),
    senderAddressId: senderAddressIdRaw || undefined,
    recipient: {
      name,
      phone,
      address1,
      city,
      district: district || "Merkez",
      neighborhood,
      zip: zipRaw || undefined,
      email: emailRaw || undefined,
    },
    lengthCm,
    widthCm,
    heightCm,
    weightKg,
    reference: reference || undefined,
  });

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    success: true,
    purchaseMode: "manual",
    shipmentId: result.shipmentId,
    shipment: result.shipment ?? null,
  });
});

/** Geliver — şehir listesi (API token ile, bkz. https://docs.geliver.io/docs/home ) */
router.get("/providers/geliver/cities", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(sql`
    SELECT id FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const r0 = await geliverApiListCitiesForVendor(Number(vendorId));
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, data: r0.data });
});

/** Geliver — ilçe listesi */
router.get("/providers/geliver/districts", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const cityCode = typeof req.query.cityCode === "string" ? req.query.cityCode.trim() : "";
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!cityCode) {
    res.status(400).json({ error: "cityCode zorunlu" });
    return;
  }
  const own = r(
    await db.execute<Row>(sql`
    SELECT id FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const r0 = await geliverApiListDistrictsForVendor(Number(vendorId), cityCode);
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, data: r0.data });
});

router.get("/providers/geliver/shipments", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(sql`
    SELECT id FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const r0 = await geliverApiListShipmentsForVendor(Number(vendorId), { page, limit });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, ...((r0.envelope as Record<string, unknown>) ?? {}) });
});

router.get("/providers/geliver/shipment/:shipmentId", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const shipmentId = String(req.params.shipmentId ?? "").trim();
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!shipmentId) {
    res.status(400).json({ error: "shipmentId gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(sql`
    SELECT id FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const r0 = await geliverApiGetShipmentForVendor(Number(vendorId), shipmentId);
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, shipment: r0.shipment });
});

router.patch("/providers/geliver/shipment/:shipmentId/package", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const shipmentId = String(req.params.shipmentId ?? "").trim();
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!shipmentId) {
    res.status(400).json({ error: "shipmentId gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(sql`
    SELECT id FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const lengthCm = String(b.lengthCm ?? "").trim();
  const widthCm = String(b.widthCm ?? "").trim();
  const heightCm = String(b.heightCm ?? "").trim();
  const weightKg = String(b.weightKg ?? "").trim();
  if (!lengthCm || !widthCm || !heightCm || !weightKg) {
    res.status(400).json({ error: "Boy, en, yükseklik (cm) ve ağırlık (kg) zorunlu." });
    return;
  }
  const r0 = await geliverApiUpdateShipmentPackageForVendor(Number(vendorId), shipmentId, {
    lengthCm,
    widthCm,
    heightCm,
    weightKg,
  });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, shipment: r0.shipment });
});

router.post("/providers/geliver/shipment/:shipmentId/accept-offer", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const shipmentId = String(req.params.shipmentId ?? "").trim();
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!shipmentId) {
    res.status(400).json({ error: "shipmentId gerekli" });
    return;
  }
  const own = r(
    await db.execute<Row>(sql`
    SELECT id FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const offerId = String(body.offerId ?? body.offerID ?? body.offer_id ?? "").trim();
  if (!offerId) {
    res.status(400).json({ error: "offerId (teklif kimliği) zorunlu" });
    return;
  }
  try {
    logger.info({ vendorId, shipmentId, offerId }, "[geliver] accept-offer route start");
    // Hosting / proxy 30 sn’de kestiğinde kullanıcı “Application failed to respond” görüyordu;
    // 28 sn’lik kendi bütçemizle açık bir mesaj dönelim.
    const r0 = await Promise.race([
      geliverApiAcceptOfferForVendor(Number(vendorId), offerId, shipmentId),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: false,
              error:
                "Geliver yanıtı zaman aşımına uğradı. Birkaç saniye sonra «API'den yenile» deyip tekrar deneyin; satın alma muhtemelen Geliver tarafında işlendi.",
            }),
          28_000,
        ),
      ),
    ]);
    if (!r0.ok) {
      logger.warn(
        { vendorId, shipmentId, offerId, error: r0.error, debug: "debug" in r0 ? r0.debug : undefined },
        "[geliver] accept-offer failed",
      );
      const manualUrl = "manualPurchaseUrl" in r0 ? r0.manualPurchaseUrl : undefined;
      const manualHint = "manualPurchaseHint" in r0 ? r0.manualPurchaseHint : undefined;
      res.status(400).json({
        error: r0.error,
        debug: "debug" in r0 ? r0.debug : undefined,
        ...(typeof manualUrl === "string" && manualUrl ? { manualPurchaseUrl: manualUrl } : {}),
        ...(typeof manualHint === "string" && manualHint ? { manualPurchaseHint: manualHint } : {}),
      });
      return;
    }
    const isPending = "pending" in r0 && r0.pending === true;
    logger.info(
      {
        vendorId,
        shipmentId,
        offerId,
        transactionId: r0.transactionId,
        hasTracking: Boolean(r0.trackingNumber),
        hasLabel: Boolean(r0.labelUrl),
        pending: isPending,
        statusCode: "statusCode" in r0 ? r0.statusCode ?? null : null,
      },
      "[geliver] accept-offer success",
    );
    // Sipariş satırı bu shipmentId ile bağlıysa Geliver alanlarını anında senkronla.
    // Pending’de label/tracking henüz boş olabilir; status 'offer_accepted' kalır, ileride yenileme/webhook doldurur.
    const tracking = r0.trackingNumber != null ? String(r0.trackingNumber).trim() : "";
    const label = r0.labelUrl != null ? String(r0.labelUrl).trim() : "";
    const txId = r0.transactionId != null ? String(r0.transactionId).trim() : "";
    const nextStatus = tracking || label ? "label_created" : "offer_accepted";
    await db
      .execute(sql`
        UPDATE delivery_orders
        SET geliver_tracking_number = ${tracking || null},
            geliver_label_url = ${label || null},
            geliver_transaction_id = ${txId || null},
            geliver_status = ${nextStatus},
            geliver_last_error = NULL,
            updated_at = NOW()
        WHERE vendor_id = ${Number(vendorId)}
          AND geliver_shipment_id = ${shipmentId}
      `)
      .catch((err) => logger.warn({ err, vendorId, shipmentId }, "[geliver] accept-offer sync delivery_orders failed"));
    res.json(
      geliverJsonSafe({
        success: true,
        pending: isPending,
        message: "message" in r0 ? r0.message ?? null : null,
        statusCode: "statusCode" in r0 ? r0.statusCode ?? null : null,
        transactionId: r0.transactionId,
        trackingNumber: r0.trackingNumber,
        labelUrl: r0.labelUrl,
        debug: "debug" in r0 ? r0.debug ?? null : null,
      }) as Record<string, unknown>,
    );
  } catch (e: unknown) {
    logger.error({ err: e, vendorId, shipmentId }, "[geliver] accept-offer route");
    res.status(500).json({ error: e instanceof Error ? e.message : "Etiket yanıtı işlenemedi" });
  }
});

router.put("/providers/open-status", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Kimlik doğrulama gerekli" }); return; }
  const isOpen = Boolean((req.body as Record<string, unknown>)?.isOpen);
  try {
    await db.execute(sql`
      UPDATE vendors
      SET is_open = ${isOpen}, updated_at = NOW()
      WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    `);
    res.json({ success: true, isOpen });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** Bakiye — [Geliver organizations balance](https://docs.geliver.io/docs/home); organizationId sorguda veya işletme kaydında */
router.get("/providers/geliver/balance", async (req, res): Promise<void> => {
  try {
    const vendorId = req.headers["x-vendor-id"];
    const vendorEmail = req.headers["x-vendor-email"];
    if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
      res.status(401).json({ error: "Kimlik doğrulama gerekli" });
      return;
    }
    const vid = Number(vendorId);
    if (!Number.isFinite(vid) || vid <= 0) {
      res.status(400).json({ error: "Geçersiz işletme oturumu." });
      return;
    }
    const qOrg = typeof req.query.organizationId === "string" ? req.query.organizationId.trim() : "";
    const qShipmentHint =
      typeof req.query.shipmentId === "string" ? req.query.shipmentId.trim() : "";
    const rows = r(
      await db.execute<Row>(sql`
      SELECT geliver_organization_id FROM vendors WHERE id = ${vid} LIMIT 1
    `),
    );
    const orgId = qOrg || String(rows[0]?.geliver_organization_id ?? "").trim();
    // Upstream proxy timeout’una takılmamak için kendi 14 sn’lik bütçemiz: süre dolarsa kullanıcıya açık mesaj.
    const r0 = await Promise.race([
      geliverApiGetBalanceForVendor(vid, orgId, qShipmentHint ? { hintShipmentId: qShipmentHint } : undefined),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: false,
              error:
                "Geliver bakiye sorgusu zaman aşımına uğradı. Geliver tarafı yavaş yanıt verdi; birkaç saniye sonra tekrar deneyin.",
            }),
          14_000,
        ),
      ),
    ]);
    if (!r0.ok) {
      res.status(400).json({ error: r0.error });
      return;
    }
    const balPayload: Record<string, unknown> = { success: true, balance: r0.balance };
    if ("resolvedOrganizationId" in r0 && r0.resolvedOrganizationId) {
      balPayload.resolvedOrganizationId = r0.resolvedOrganizationId;
    }
    res.json(geliverJsonSafe(balPayload) as Record<string, unknown>);
  } catch (e: unknown) {
    logger.error({ err: e }, "[geliver] balance route");
    res.status(500).json({ error: e instanceof Error ? e.message : "Bakiye yanıtı işlenemedi" });
  }
});

router.get("/providers/geliver/addresses", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const role = String(req.query.role ?? "sender").toLowerCase();
  const isRecipient = role === "recipient" || role === "customer" || role === "alıcı";
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "30"), 10) || 30));
  const r0 = await geliverApiListAddressesForVendor(Number(vendorId), {
    isRecipientAddress: isRecipient,
    page,
    limit,
  });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({
    success: true,
    data: r0.data,
    totalRows: r0.totalRows,
    page: r0.page,
    limit: r0.limit,
    totalPages: r0.totalPages,
  });
});

router.get("/providers/geliver/address/:addressId", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const addressId = String(req.params.addressId ?? "").trim();
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!addressId) {
    res.status(400).json({ error: "addressId gerekli" });
    return;
  }
  const r0 = await geliverApiGetAddressForVendor(Number(vendorId), addressId);
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, address: r0.address });
});

router.post("/providers/geliver/sender-address", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  const address1 = String(b.address1 ?? "").trim();
  const cityName = String(b.cityName ?? b.city ?? "").trim();
  const cityCode = String(b.cityCode ?? "").trim();
  const districtName = String(b.districtName ?? b.district ?? "").trim();
  const districtID = Number(b.districtID ?? b.districtId ?? NaN);
  const zip = String(b.zip ?? "").trim().replace(/\D/g, "").slice(0, 5);
  const shortName = b.shortName != null ? String(b.shortName).trim() : "";
  const address2 = b.address2 != null ? String(b.address2).trim() : undefined;
  if (!name || !email || !phone || !address1 || !cityName || !cityCode || !districtName || !Number.isFinite(districtID)) {
    res.status(400).json({ error: "Gönderici: ad, e-posta, telefon, address1, şehir, cityCode, ilçe adı, districtID (Geliver), posta kodu zorunlu." });
    return;
  }
  if (!zip) {
    res.status(400).json({ error: "Posta kodu (zip) zorunludur." });
    return;
  }
  const r0 = await geliverApiCreateSenderAddressForVendor(Number(vendorId), {
    name,
    email,
    phone,
    address1,
    address2,
    countryCode: "TR",
    cityName,
    cityCode,
    districtName,
    districtID,
    zip,
    shortName: shortName || undefined,
  });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, address: r0.address });
});

router.delete("/providers/geliver/address/:addressId", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const addressId = String(req.params.addressId ?? "").trim();
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!addressId) {
    res.status(400).json({ error: "addressId gerekli" });
    return;
  }
  const r0 = await geliverApiDeleteAddressForVendor(Number(vendorId), addressId);
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  await db.execute(sql`
    UPDATE vendors SET
      geliver_sender_address_id = CASE WHEN geliver_sender_address_id = ${addressId} THEN NULL ELSE geliver_sender_address_id END,
      updated_at = NOW()
    WHERE id = ${Number(vendorId)}
  `);
  res.json({ success: true });
});

router.get("/providers/geliver/webhooks", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const r0 = await geliverApiListWebhooksForVendor(Number(vendorId));
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, data: r0.data });
});

router.post("/providers/geliver/webhooks", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const url = String(b.url ?? "").trim();
  const type = b.type != null ? String(b.type).trim() : undefined;
  if (!url) {
    res.status(400).json({ error: "url zorunlu" });
    return;
  }
  const r0 = await geliverApiCreateWebhookForVendor(Number(vendorId), { url, type });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, raw: r0.raw });
});

router.delete("/providers/geliver/webhooks/:webhookId", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const webhookId = String(req.params.webhookId ?? "").trim();
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!webhookId) {
    res.status(400).json({ error: "webhookId gerekli" });
    return;
  }
  const r0 = await geliverApiDeleteWebhookForVendor(Number(vendorId), webhookId);
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true });
});

router.post("/providers/geliver/webhooks/test", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const url = String(b.url ?? "").trim();
  const type = String(b.type ?? "").trim();
  if (!url || !type) {
    res.status(400).json({ error: "url ve type zorunlu" });
    return;
  }
  const r0 = await geliverApiTestWebhookForVendor(Number(vendorId), { url, type });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, raw: r0.raw });
});

/**
 * Geliver webhook alıcı endpoint'i.
 * Geliver burayı `shipment_status_changed`, `TRACK_UPDATED` vb. olaylar için POST'lar.
 * Hangi shipment veya tracking değişti onu bulup `delivery_orders`'i güncelliyoruz.
 *
 * Ham gövde + imza doğrulama; `app.ts` içinde `express.json` öncesinde kayıtlıdır.
 */
function geliverWebhookHeader(headers: Record<string, unknown>, name: string): string {
  const direct = headers[name];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const lower = headers[name.toLowerCase()];
  if (typeof lower === "string" && lower.trim()) return lower.trim();
  return "";
}

function geliverWebhookSecretFromAuth(authHeader: string): string {
  const auth = authHeader.trim();
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return auth;
}

function geliverWebhookNormalizeSignature(sig: string): string {
  const s = sig.trim();
  const m = /^sha256=(.+)$/i.exec(s);
  return (m?.[1] ?? s).trim();
}

function geliverWebhookSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Geliver SDK: HMAC-SHA256(secret, `${timestamp}.${rawBody}`) ↔ X-Signature; yedek: paylaşımlı secret başlığı. */
function verifyGeliverWebhook(req: Request, rawBody: Buffer): boolean {
  const secret = getGeliverWebhookSecret();
  if (!secret) {
    logger.warn("[geliver:webhook] GELIVER_WEBHOOK_SECRET yapılandırılmamış — istek reddedildi");
    return false;
  }

  const headers = req.headers as Record<string, unknown>;
  const signature = geliverWebhookHeader(headers, "x-signature");
  const timestamp = geliverWebhookHeader(headers, "x-timestamp");

  if (signature && timestamp) {
    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum)) return false;
    const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
    if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) return false;

    const payload = `${timestamp}.${rawBody.toString("utf8")}`;
    const expectedHex = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const expectedB64 = crypto.createHmac("sha256", secret).update(payload).digest("base64");
    const normalized = geliverWebhookNormalizeSignature(signature);
    if (geliverWebhookSafeEqual(normalized, expectedHex)) return true;
    if (geliverWebhookSafeEqual(normalized, expectedB64)) return true;
    return false;
  }

  const providedSecret =
    geliverWebhookHeader(headers, "x-geliver-webhook-secret")
    || geliverWebhookHeader(headers, "x-webhook-secret")
    || geliverWebhookSecretFromAuth(geliverWebhookHeader(headers, "authorization"));
  if (providedSecret && geliverWebhookSafeEqual(providedSecret, secret)) return true;

  return false;
}

async function ingestGeliverWebhookEvent(
  body: Record<string, unknown>,
  headers: Record<string, unknown>,
): Promise<void> {
  // Olay tipini ve shipmentId'yi gevşek biçimde topla.
  const flat = (() => {
    try { return JSON.stringify(body).slice(0, 4000); } catch { return ""; }
  })();
  const pickStr = (...vals: unknown[]): string => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  const data = (body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : null);
  const shipmentId = pickStr(
    body.shipmentId, body.shipmentID, body.shipment_id,
    data?.shipmentId, data?.shipmentID, data?.shipment_id,
    (body.shipment as { id?: string } | undefined)?.id,
  );
  const trackingNumber = pickStr(
    body.trackingNumber, body.tracking_number,
    data?.trackingNumber, data?.tracking_number,
  );
  const labelUrl = pickStr(
    body.labelUrl, body.label_url,
    data?.labelUrl, data?.label_url,
  );
  const statusCode = pickStr(
    body.statusCode, body.status,
    data?.statusCode, data?.status,
  );
  const eventType = pickStr(body.type, body.event, body.eventType);
  logger.info(
    {
      eventType,
      shipmentId,
      trackingNumber: trackingNumber ? "[set]" : "",
      labelUrl: labelUrl ? "[set]" : "",
      statusCode,
      contentType: headers["content-type"],
      bodyPreview: flat.slice(0, 500),
    },
    "[geliver:webhook] inbound",
  );
  if (!shipmentId) return;

  try {
    if (trackingNumber || labelUrl) {
      const patch: Partial<typeof deliveryOrdersTable.$inferInsert> = {
        geliverStatus: "purchased",
        updatedAt: new Date(),
      };
      if (trackingNumber) patch.geliverTrackingNumber = trackingNumber;
      if (labelUrl) patch.geliverLabelUrl = labelUrl;
      await db
        .update(deliveryOrdersTable)
        .set(patch)
        .where(eq(deliveryOrdersTable.geliverShipmentId, shipmentId));
      return;
    }

    if (/shipped|TRACK_UPDATED|in[_ ]?transit|delivered/i.test(`${eventType} ${statusCode}`)) {
      await db
        .update(deliveryOrdersTable)
        .set({ geliverStatus: "shipped", updatedAt: new Date() })
        .where(eq(deliveryOrdersTable.geliverShipmentId, shipmentId));
    }
  } catch (err) {
    logger.warn({ err, shipmentId }, "[geliver:webhook] db update failed");
  }
}

export async function handleGeliverWebhook(req: Request, res: Response): Promise<void> {
  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).json({ error: "Raw body gerekli" });
    return;
  }

  if (!verifyGeliverWebhook(req, buf)) {
    logger.warn("[geliver:webhook] imza/secret doğrulanamadı — istek reddedildi");
    res.status(401).json({ error: "Webhook doğrulanamadı" });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Geçersiz JSON" });
    return;
  }

  res.status(200).json({ ok: true });
  try {
    await ingestGeliverWebhookEvent(body, req.headers as Record<string, unknown>);
  } catch (err) {
    logger.warn({ err }, "[geliver:webhook] handler failed");
  }
}

// Geliver bazen test panelinde `GET` ile sağlık kontrolü yapabilir - 200 OK dönelim.
router.get("/providers/geliver/webhook", (_req, res) => {
  res.status(200).json({ ok: true, service: "geliver-webhook", ts: new Date().toISOString() });
});

router.get("/providers/geliver/parcel-templates", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const r0 = await geliverApiListParcelTemplatesForVendor(Number(vendorId));
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, data: r0.data });
});

router.post("/providers/geliver/parcel-templates", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const r0 = await geliverApiCreateParcelTemplateForVendor(Number(vendorId), b);
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, template: r0.template });
});

router.delete("/providers/geliver/parcel-templates/:templateId", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const templateId = String(req.params.templateId ?? "").trim();
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!templateId) {
    res.status(400).json({ error: "templateId gerekli" });
    return;
  }
  const r0 = await geliverApiDeleteParcelTemplateForVendor(Number(vendorId), templateId);
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true });
});

router.get("/providers/geliver/prices", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const length = String(req.query.length ?? "").trim();
  const width = String(req.query.width ?? "").trim();
  const height = String(req.query.height ?? "").trim();
  const weight = String(req.query.weight ?? "").trim();
  if (!length || !width || !height || !weight) {
    res.status(400).json({ error: "length, width, height, weight sorgu parametreleri zorunlu." });
    return;
  }
  const r0 = await geliverApiListPricesForVendor(Number(vendorId), {
    length,
    width,
    height,
    weight,
    distanceUnit: typeof req.query.distanceUnit === "string" ? req.query.distanceUnit : undefined,
    massUnit: typeof req.query.massUnit === "string" ? req.query.massUnit : undefined,
  });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, raw: r0.raw });
});

router.get("/providers/geliver/provider-accounts", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const r0 = await geliverApiListProviderAccountsForVendor(Number(vendorId));
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, data: r0.data, envelope: r0.envelope ?? null });
});

router.post("/providers/geliver/provider-accounts", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const username = String(b.username ?? "").trim();
  const name = String(b.name ?? "").trim();
  const providerCode = String(b.providerCode ?? "").trim();
  const version = parseInt(String(b.version ?? "1"), 10) || 1;
  if (!username || !name || !providerCode) {
    res.status(400).json({ error: "username, name, providerCode zorunlu" });
    return;
  }
  const password = b.password != null ? String(b.password) : undefined;
  const r0 = await geliverApiCreateProviderAccountForVendor(Number(vendorId), {
    username,
    password,
    name,
    providerCode,
    version,
    isActive: b.isActive !== false,
    isPublic: Boolean(b.isPublic),
    sharable: Boolean(b.sharable),
    isDynamicPrice: Boolean(b.isDynamicPrice),
    parameters:
      b.parameters && typeof b.parameters === "object"
        ? (b.parameters as Record<string, unknown>)
        : undefined,
  });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true, account: r0.account });
});

router.delete("/providers/geliver/provider-accounts/:accountId", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  const accountId = String(req.params.accountId ?? "").trim();
  if (!(await vendorSessionOwnsRow(vendorId, vendorEmail))) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  if (!accountId) {
    res.status(400).json({ error: "accountId gerekli" });
    return;
  }
  const isDel =
    req.query.isDeleteAccountConnection === "1" || String(req.query.isDeleteAccountConnection ?? "") === "true";
  const r0 = await geliverApiDeleteProviderAccountForVendor(Number(vendorId), accountId, {
    isDeleteAccountConnection: isDel,
  });
  if (!r0.ok) {
    res.status(400).json({ error: r0.error });
    return;
  }
  res.json({ success: true });
});

router.put("/providers/tr-gateway-settings", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }

  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_key TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_salt TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_test_mode BOOLEAN NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_api_key TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_secret_key TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_sandbox BOOLEAN NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS preferred_tr_gateway TEXT`);

  const check = r(
    await db.execute<Row>(sql`
      SELECT id, revenue_model FROM vendors
      WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
      LIMIT 1
    `),
  )[0];
  if (!check) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  if (normalizeRevenueModel(check.revenue_model) !== "subscription") {
    res.status(400).json({
      error: "Bu bağlantı yalnızca abonelik gelir modelindeki işletmeler içindir.",
    });
    return;
  }

  const body = req.body as Record<string, unknown>;

  const [cur] = r(
    await db.execute<Row>(sql`
      SELECT paytr_merchant_id, paytr_merchant_key, paytr_merchant_salt, paytr_test_mode,
             iyzico_api_key, iyzico_secret_key, iyzico_sandbox, preferred_tr_gateway
      FROM vendors WHERE id = ${Number(vendorId)} LIMIT 1
    `),
  );
  if (!cur) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }

  const pick = (k: string, prev: unknown): unknown =>
    k in body ? (body[k] === null || body[k] === "" ? null : body[k]) : prev;

  const paytrMerchantId = pick("paytrMerchantId", cur.paytr_merchant_id);
  let paytrMerchantKey = pick("paytrMerchantKey", cur.paytr_merchant_key);
  let paytrMerchantSalt = pick("paytrMerchantSalt", cur.paytr_merchant_salt);
  let iyzicoApiKey = pick("iyzicoApiKey", cur.iyzico_api_key);
  let iyzicoSecretKey = pick("iyzicoSecretKey", cur.iyzico_secret_key);
  if (body["paytrMerchantKey"] === "***") paytrMerchantKey = cur.paytr_merchant_key;
  if (body["paytrMerchantSalt"] === "***") paytrMerchantSalt = cur.paytr_merchant_salt;
  if (body["iyzicoApiKey"] === "***") iyzicoApiKey = cur.iyzico_api_key;
  if (body["iyzicoSecretKey"] === "***") iyzicoSecretKey = cur.iyzico_secret_key;

  const paytrTestMode =
    body["paytrTestMode"] !== undefined ? Boolean(body["paytrTestMode"]) : Boolean(cur.paytr_test_mode !== false);
  const iyzicoSandbox =
    body["iyzicoSandbox"] !== undefined ? Boolean(body["iyzicoSandbox"]) : Boolean(cur.iyzico_sandbox !== false);

  let preferred: string | null =
    body["preferredTrGateway"] !== undefined
      ? String(body["preferredTrGateway"] ?? "").trim().toLowerCase() || null
      : (cur.preferred_tr_gateway as string | null);
  if (preferred && preferred !== "paytr" && preferred !== "iyzico") preferred = null;

  await db.execute(sql`
    UPDATE vendors SET
      paytr_merchant_id = ${paytrMerchantId != null ? String(paytrMerchantId).trim() || null : null},
      paytr_merchant_key = ${paytrMerchantKey != null ? String(paytrMerchantKey) : null},
      paytr_merchant_salt = ${paytrMerchantSalt != null ? String(paytrMerchantSalt) : null},
      paytr_test_mode = ${paytrTestMode},
      iyzico_api_key = ${iyzicoApiKey != null ? String(iyzicoApiKey).trim() || null : null},
      iyzico_secret_key = ${iyzicoSecretKey != null ? String(iyzicoSecretKey) : null},
      iyzico_sandbox = ${iyzicoSandbox},
      preferred_tr_gateway = ${preferred},
      updated_at = NOW()
    WHERE id = ${Number(vendorId)}
  `);

  const pid = String(paytrMerchantId ?? "").trim();
  res.json({
    success: true,
    paytrMerchantIdMasked: pid ? `****${pid.slice(-4)}` : "",
    paytrTestMode,
    iyzicoSandbox,
    preferredTrGateway: preferred,
  });
});

router.post("/providers/subscription-renewal", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Kimlik doğrulama gerekli" }); return; }
  const { startDate, endDate, paymentMethod, receiptUrl } = req.body as {
    startDate?: string; endDate?: string; paymentMethod?: "bank_transfer" | "stripe"; receiptUrl?: string;
  };
  if (!startDate || !endDate) { res.status(400).json({ error: "Başlangıç ve bitiş tarihi zorunlu" }); return; }
  if ((paymentMethod || "bank_transfer") === "bank_transfer" && !String(receiptUrl || "").trim()) {
    res.status(400).json({ error: "Havale için dekont zorunlu" }); return;
  }
  const own = r(await db.execute<Row>(sql`
    SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `));
  if (!own[0]) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    INSERT INTO vendor_subscription_requests (
      vendor_id, start_date, end_date, payment_method, receipt_url, status
    ) VALUES (
      ${Number(vendorId)}, ${startDate}, ${endDate}, ${(paymentMethod || "bank_transfer")}, ${String(receiptUrl || "").trim() || null}, 'pending'
    )
    RETURNING id
  `));
  if (!rows[0]) { res.status(401).json({ error: "Yetkisiz" }); return; }
  res.json({ success: true, requestId: rows[0].id });
});

router.get("/providers/integrations", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, notes FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `));
  const row = rows[0];
  if (!row) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const notes = String(row.notes || "");
  const openai = noteField(notes, "openai_api_key");
  const gemini = noteField(notes, "gemini_api_key");
  const googleAi = noteField(notes, "google_ai_api_key");
  const deepseek = noteField(notes, "deepseek_api_key");
  const model = noteField(notes, "openai_model") || "gpt-4o-mini";
  const waEnabled = noteField(notes, "whatsapp_enabled") !== "0";
  const waNewOrder = noteField(notes, "whatsapp_feature_new_order") !== "0";
  const waCustomer = noteField(notes, "whatsapp_feature_customer_contact") !== "0";
  const waStatus = noteField(notes, "whatsapp_feature_order_status") === "1";
  const waBulk = noteField(notes, "whatsapp_feature_bulk_marketing") === "1";
  res.json({
    success: true,
    integrations: {
      openaiApiKeyMasked: openai ? maskSecret(openai) : "",
      geminiApiKeyMasked: gemini ? maskSecret(gemini) : "",
      googleAiApiKeyMasked: googleAi ? maskSecret(googleAi) : "",
      deepseekApiKeyMasked: deepseek ? maskSecret(deepseek) : "",
      openaiModel: model,
      whatsappEnabled: waEnabled,
      whatsappFeatureNewOrder: waNewOrder,
      whatsappFeatureCustomerContact: waCustomer,
      whatsappFeatureOrderStatus: waStatus,
      whatsappFeatureBulkMarketing: waBulk,
    },
  });
});

router.patch("/providers/integrations", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const b = req.body as {
    openaiApiKey?: string;
    openaiModel?: string;
    geminiApiKey?: string;
    googleAiApiKey?: string;
    deepseekApiKey?: string;
    whatsappEnabled?: boolean;
    whatsappFeatureNewOrder?: boolean;
    whatsappFeatureCustomerContact?: boolean;
    whatsappFeatureOrderStatus?: boolean;
    whatsappFeatureBulkMarketing?: boolean;
  };
  const rows = r(await db.execute<Row>(sql`
    SELECT id, notes FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `));
  const row = rows[0];
  if (!row) { res.status(401).json({ error: "Yetkisiz" }); return; }
  let notes = String(row.notes || "");
  if (b.openaiApiKey !== undefined) notes = upsertNoteField(notes, "openai_api_key", b.openaiApiKey);
  if (b.geminiApiKey !== undefined) notes = upsertNoteField(notes, "gemini_api_key", b.geminiApiKey);
  if (b.googleAiApiKey !== undefined) notes = upsertNoteField(notes, "google_ai_api_key", b.googleAiApiKey);
  if (b.deepseekApiKey !== undefined) notes = upsertNoteField(notes, "deepseek_api_key", b.deepseekApiKey);
  if (b.openaiModel !== undefined) notes = upsertNoteField(notes, "openai_model", b.openaiModel);
  if (b.whatsappEnabled !== undefined) notes = upsertNoteField(notes, "whatsapp_enabled", b.whatsappEnabled ? "1" : "0");
  if (b.whatsappFeatureNewOrder !== undefined) notes = upsertNoteField(notes, "whatsapp_feature_new_order", b.whatsappFeatureNewOrder ? "1" : "0");
  if (b.whatsappFeatureCustomerContact !== undefined) notes = upsertNoteField(notes, "whatsapp_feature_customer_contact", b.whatsappFeatureCustomerContact ? "1" : "0");
  if (b.whatsappFeatureOrderStatus !== undefined) notes = upsertNoteField(notes, "whatsapp_feature_order_status", b.whatsappFeatureOrderStatus ? "1" : "0");
  if (b.whatsappFeatureBulkMarketing !== undefined) notes = upsertNoteField(notes, "whatsapp_feature_bulk_marketing", b.whatsappFeatureBulkMarketing ? "1" : "0");
  await db.execute(sql`UPDATE vendors SET notes = ${notes}, updated_at = NOW() WHERE id = ${Number(vendorId)}`);
  res.json({ success: true });
});

/** Panel: sipariş WhatsApp bildirimini dene (CallMeBot + numara kontrolü). */
router.post("/providers/me/whatsapp-order-test", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const own = r(
    await db.execute<Row>(sql`
      SELECT id FROM vendors
      WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
      LIMIT 1
    `),
  )[0];
  if (!own) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }

  const waResult = await notifyVendorWhatsApp({
    vendorId: Number(vendorId),
    eventType: "new_order",
    details: [
      "Bu bir *test bildirimidir*.",
      "Gerçek siparişlerde de aynı kanal kullanılır.",
      `Zaman: ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`,
    ].join("\n"),
  });

  if (waResult.sent) {
    res.json({ success: true, sent: true, message: "Test mesajı WhatsApp numaranıza gönderildi." });
    return;
  }

  res.status(400).json({
    success: false,
    sent: false,
    link: waResult.link ?? null,
    error:
      "Otomatik mesaj gönderilemedi. İşletme WhatsApp numarasını kaydedin, «Siparişi WhatsApp'tan al» seçeneğini açın ve CallMeBot'u bu numarayla etkinleştirin (veya platform CallMeBot anahtarı tanımlı olsun).",
  });
});

/* — Mağaza blogu (panel) — */

router.get("/providers/me/blog-settings", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureVendorBlogTables();
  const own = r(await db.execute<Row>(sql`
    SELECT id, slug, name FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `))[0];
  if (!own) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT enabled FROM vendor_blog_settings WHERE vendor_id = ${Number(vendorId)} LIMIT 1
  `));
  res.json({
    success: true,
    enabled: Boolean(rows[0]?.enabled),
    vendorSlug: String(own.slug || ""),
    vendorName: String(own.name || ""),
  });
});

router.put("/providers/me/blog-settings", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const enabled = Boolean((req.body as { enabled?: boolean })?.enabled);
  await ensureVendorBlogTables();
  const own = r(await db.execute<Row>(sql`
    SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `))[0];
  if (!own) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await db.execute(sql`
    INSERT INTO vendor_blog_settings (vendor_id, enabled, updated_at)
    VALUES (${Number(vendorId)}, ${enabled}, NOW())
    ON CONFLICT (vendor_id) DO UPDATE SET enabled = ${enabled}, updated_at = NOW()
  `);
  res.json({ success: true });
});

router.get("/providers/me/blog-posts", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureVendorBlogTables();
  const own = r(await db.execute<Row>(sql`
    SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `))[0];
  if (!own) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, slug, title, excerpt, cover_image_url, published, published_at, created_at, updated_at
    FROM vendor_blog_posts WHERE vendor_id = ${Number(vendorId)}
    ORDER BY updated_at DESC NULLS LAST, id DESC
    LIMIT 200
  `));
  res.json({ success: true, posts: rows });
});

router.post("/providers/me/blog-posts", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureVendorBlogTables();
  const own = r(await db.execute<Row>(sql`
    SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `))[0];
  if (!own) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const b = req.body as {
    title?: string;
    slug?: string;
    excerpt?: string;
    coverImageUrl?: string;
    contentJson?: unknown;
    published?: boolean;
  };
  const title = String(b.title ?? "").trim().slice(0, 300);
  let slug = String(b.slug ?? "").trim().toLowerCase().slice(0, 120);
  if (!title) { res.status(400).json({ error: "Başlık zorunlu" }); return; }
  if (!slug) slug = slugify(title);
  slug = slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `yazi-${Date.now()}`;
  const excerpt = String(b.excerpt ?? "").trim().slice(0, 2000) || null;
  const cover = String(b.coverImageUrl ?? "").trim().slice(0, 2000) || null;
  const published = b.published === true;
  const contentArr = Array.isArray(b.contentJson) ? b.contentJson : [];
  const contentJson = JSON.stringify(contentArr).slice(0, 500_000);
  const pubAt = published ? new Date().toISOString() : null;
  try {
    const ins = r(await db.execute<Row>(sql`
      INSERT INTO vendor_blog_posts (vendor_id, slug, title, excerpt, cover_image_url, content_json, published, published_at, updated_at)
      VALUES (
        ${Number(vendorId)}, ${slug}, ${title}, ${excerpt}, ${cover},
        ${contentJson}::jsonb, ${published}, ${pubAt}, NOW()
      )
      RETURNING id, slug
    `));
    res.status(201).json({ success: true, id: ins[0]?.id, slug: ins[0]?.slug });
  } catch {
    res.status(400).json({ error: "Slug kullanımda veya kayıt başarısız." });
  }
});

router.patch("/providers/me/blog-posts/:id", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Geçersiz id" }); return; }
  await ensureVendorBlogTables();
  const own = r(await db.execute<Row>(sql`
    SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `))[0];
  if (!own) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const cur = r(await db.execute<Row>(sql`
    SELECT id, slug, published FROM vendor_blog_posts WHERE id = ${id} AND vendor_id = ${Number(vendorId)} LIMIT 1
  `))[0];
  if (!cur) { res.status(404).json({ error: "Yazı yok" }); return; }
  const b = req.body as {
    title?: string;
    slug?: string;
    excerpt?: string;
    coverImageUrl?: string;
    contentJson?: unknown;
    published?: boolean;
  };
  let slug = cur.slug ? String(cur.slug) : "";
  if (b.slug !== undefined) {
    slug = String(b.slug).trim().toLowerCase().slice(0, 120);
    slug = slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  const title = b.title !== undefined ? String(b.title).trim().slice(0, 300) : undefined;
  const excerpt = b.excerpt !== undefined ? (String(b.excerpt).trim().slice(0, 2000) || null) : undefined;
  const cover = b.coverImageUrl !== undefined ? (String(b.coverImageUrl).trim().slice(0, 2000) || null) : undefined;
  const published = typeof b.published === "boolean" ? b.published : undefined;
  let contentSql = sql``;
  if (b.contentJson !== undefined) {
    const contentArr = Array.isArray(b.contentJson) ? b.contentJson : [];
    const contentJson = JSON.stringify(contentArr).slice(0, 500_000);
    contentSql = sql`, content_json = ${contentJson}::jsonb`;
  }
  await db.execute(sql`
    UPDATE vendor_blog_posts SET
      title = COALESCE(${title ?? null}, title),
      slug = COALESCE(${b.slug !== undefined ? slug : null}, slug),
      excerpt = COALESCE(${excerpt !== undefined ? excerpt : null}, excerpt),
      cover_image_url = COALESCE(${cover !== undefined ? cover : null}, cover_image_url),
      updated_at = NOW()
      ${contentSql}
    WHERE id = ${id} AND vendor_id = ${Number(vendorId)}
  `);
  if (published === true) {
    await db.execute(sql`
      UPDATE vendor_blog_posts SET published = true, published_at = COALESCE(published_at, NOW()), updated_at = NOW()
      WHERE id = ${id} AND vendor_id = ${Number(vendorId)}
    `);
  } else if (published === false) {
    await db.execute(sql`
      UPDATE vendor_blog_posts SET published = false, published_at = NULL, updated_at = NOW()
      WHERE id = ${id} AND vendor_id = ${Number(vendorId)}
    `);
  }
  res.json({ success: true });
});

router.delete("/providers/me/blog-posts/:id", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const id = parseInt(req.params.id, 10);
  await ensureVendorBlogTables();
  const own = r(await db.execute<Row>(sql`
    SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `))[0];
  if (!own) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await db.execute(sql`DELETE FROM vendor_blog_posts WHERE id = ${id} AND vendor_id = ${Number(vendorId)}`);
  res.json({ success: true });
});

router.post("/providers/ai/generate", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { purpose = "about", title = "", keywords = "" } = req.body as { purpose?: string; title?: string; keywords?: string };
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, city, district, address, vendor_type, notes
    FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1
  `));
  const row = rows[0];
  if (!row) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const notes = String(row.notes || "");
  let apiKey = noteField(notes, "openai_api_key");
  let geminiKey = noteField(notes, "gemini_api_key");
  let deepseekKey = noteField(notes, "deepseek_api_key");
  const [siteAi] = await db
    .select({
      openaiApiKey: siteSettingsTable.openaiApiKey,
      openaiModel: siteSettingsTable.openaiModel,
      geminiApiKey: siteSettingsTable.geminiApiKey,
      deepseekApiKey: siteSettingsTable.deepseekApiKey,
    })
    .from(siteSettingsTable)
    .limit(1);
  if (!String(apiKey ?? "").trim()) apiKey = String(siteAi?.openaiApiKey ?? "").trim();
  const model =
    (noteField(notes, "openai_model") || String(siteAi?.openaiModel ?? "").trim() || "gpt-4o-mini").trim() || "gpt-4o-mini";
  if (!String(geminiKey ?? "").trim()) geminiKey = String(siteAi?.geminiApiKey ?? "").trim();
  if (!String(geminiKey ?? "").trim()) geminiKey = noteField(notes, "google_ai_api_key");
  if (!String(deepseekKey ?? "").trim()) deepseekKey = String(siteAi?.deepseekApiKey ?? "").trim();

  if (purpose === "about") {
    const gen = await generateTurkishVendorAboutDetailed(
      {
        openaiApiKey: apiKey || null,
        openaiModel: model,
        geminiApiKey: geminiKey || null,
        deepseekApiKey: deepseekKey || null,
      },
      {
        name: String(row.name || title || "İşletme"),
        city: row.city != null ? String(row.city) : null,
        district: row.district != null ? String(row.district) : null,
        address: row.address != null ? String(row.address) : null,
        vendorType: row.vendor_type != null ? String(row.vendor_type) : null,
      },
    );
    if (!gen.text) {
      res.status(400).json({
        error: gen.hasAnyKey
          ? `AI metni üretilemedi: ${gen.errors.join(" | ").slice(0, 450)}`
          : "AI metni üretilemedi: OpenAI, Gemini veya DeepSeek anahtarı tanımlı değil (işletme Entegrasyonlar veya site Genel Ayarlar).",
      });
      return;
    }
    res.json({ success: true, text: gen.text, provider: gen.usedProvider });
    return;
  }

  const prompt = `Türkçe, kısa ve satış odaklı ürün açıklaması yaz. Ürün: ${title}. Anahtar kelimeler: ${keywords || "-"}.`;

  if (String(apiKey ?? "").trim()) {
    try {
      const rr = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Sen Türkçe içerik üreten yardımcı bir asistansın." },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
        }),
      });
      const d = (await rr.json().catch(() => ({}))) as Record<string, unknown>;
      const text = String((d as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content || "").trim();
      if (rr.ok && text) {
        res.json({ success: true, text });
        return;
      }
    } catch {
      /* Gemini’ye düş */
    }
  }

  if (String(geminiKey ?? "").trim()) {
    try {
      const { callGeminiChat } = await import("../lib/aiChatProviders.js");
      const g = await callGeminiChat(
        String(geminiKey),
        "Sen Türkçe içerik üreten yardımcı bir asistansın.",
        prompt,
        0.55,
      );
      if (g.text) {
        res.json({ success: true, text: g.text });
        return;
      }
    } catch {
      /* DeepSeek’e düş */
    }
  }

  if (String(deepseekKey ?? "").trim()) {
    try {
      const rr = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "Sen Türkçe içerik üreten yardımcı bir asistansın." },
            { role: "user", content: prompt },
          ],
          temperature: 0.55,
        }),
      });
      const d = (await rr.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }> };
      const text = String(d?.choices?.[0]?.message?.content || "").trim();
      if (rr.ok && text) {
        res.json({ success: true, text });
        return;
      }
    } catch {
      /* noop */
    }
  }

  res.status(400).json({
    error:
      "OpenAI, Gemini veya DeepSeek API anahtarı yok veya üretim başarısız. Genel Ayarlar → Entegrasyonlar veya işletme paneli API anahtarlarını kontrol edin.",
  });
});

router.get("/admin/providers/subscription-requests", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const status = String(req.query.status || "pending");
  const rows = r(await db.execute<Row>(sql`
    SELECT
      r.id, r.vendor_id, r.start_date, r.end_date, r.payment_method, r.receipt_url,
      r.status, r.admin_note, r.processed_at, r.created_at,
      v.name as vendor_name, v.slug as vendor_slug, v.owner_name, v.owner_email, v.city, v.district
    FROM vendor_subscription_requests r
    JOIN vendors v ON v.id = r.vendor_id
    WHERE ${status === "all" ? sql`1=1` : sql`r.status = ${status}`}
    ORDER BY r.created_at DESC
    LIMIT 300
  `));
  res.json(rows);
});

router.get("/admin/providers/subscription-expiring", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const days = Math.max(1, Math.min(90, Number(req.query.days || 30)));
  const rows = r(await db.execute<Row>(sql`
    SELECT
      v.id as vendor_id,
      v.name as vendor_name,
      v.slug as vendor_slug,
      v.owner_name,
      v.owner_email,
      v.city,
      v.district,
      MAX(r.end_date) as end_date,
      MAX(r.start_date) as start_date
    FROM vendors v
    JOIN vendor_subscription_requests r ON r.vendor_id = v.id AND r.status = 'approved'
    GROUP BY v.id, v.name, v.slug, v.owner_name, v.owner_email, v.city, v.district
    HAVING MAX(r.end_date) >= CURRENT_DATE
       AND MAX(r.end_date) <= (CURRENT_DATE + (${days} * INTERVAL '1 day'))
    ORDER BY MAX(r.end_date) ASC
    LIMIT 300
  `));
  res.json(rows);
});

router.patch("/admin/providers/subscription-requests/:id/approve", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  const adminNote = String((req.body as any)?.adminNote || "").trim() || null;
  const reqRows = r(await db.execute<Row>(sql`
    SELECT id, vendor_id, start_date, end_date, payment_method, receipt_url
    FROM vendor_subscription_requests
    WHERE id = ${id} AND status = 'pending'
    LIMIT 1
  `));
  const row = reqRows[0];
  if (!row) { res.status(404).json({ error: "Talep bulunamadı veya zaten işlenmiş" }); return; }
  await db.execute(sql`
    UPDATE vendor_subscription_requests
    SET status = 'approved', admin_note = ${adminNote}, processed_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `);
  await db.execute(sql`
    UPDATE vendors
    SET status = 'active',
        notes = CONCAT(
          COALESCE(notes, ''),
          CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE ' | ' END,
          'sub_start:', ${String(row.start_date)},
          ' | sub_end:', ${String(row.end_date)},
          ' | sub_payment:', ${String(row.payment_method)},
          ' | sub_receipt:', ${String(row.receipt_url || "-")},
          ' | sub_approved_at:', TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI')
        ),
        updated_at = NOW()
    WHERE id = ${Number(row.vendor_id)}
  `);
  res.json({ success: true });
});

router.patch("/admin/providers/subscription-requests/:id/reject", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  const adminNote = String((req.body as any)?.adminNote || "").trim() || null;
  const row = r(await db.execute<Row>(sql`SELECT id FROM vendor_subscription_requests WHERE id = ${id} AND status = 'pending' LIMIT 1`))[0];
  if (!row) { res.status(404).json({ error: "Talep bulunamadı veya zaten işlenmiş" }); return; }
  await db.execute(sql`
    UPDATE vendor_subscription_requests
    SET status = 'rejected', admin_note = ${adminNote}, processed_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ success: true });
});

router.patch("/admin/providers/subscription-requests/:id/note", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const id = Number(req.params.id);
  const adminNote = String((req.body as any)?.adminNote || "").trim() || null;
  const row = r(await db.execute<Row>(sql`SELECT id FROM vendor_subscription_requests WHERE id = ${id} LIMIT 1`))[0];
  if (!row) { res.status(404).json({ error: "Talep bulunamadı" }); return; }
  await db.execute(sql`
    UPDATE vendor_subscription_requests
    SET admin_note = ${adminNote}, updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ success: true });
});

/** Admin: onaylı abonelik kaydı oluşturur (yıl doldu / manuel uzatma). Bitiş, başlangıç + ay sayısı ile hesaplanır. */
router.post("/admin/providers/:id/subscription-manual-extend", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const vendorId = Number(req.params.id);
  if (!Number.isFinite(vendorId) || vendorId <= 0) {
    res.status(400).json({ error: "Geçersiz işletme id" });
    return;
  }
  const months = Math.max(1, Math.min(60, Math.floor(Number((req.body as { months?: unknown })?.months ?? 12))));
  const adminNote = String((req.body as { adminNote?: unknown })?.adminNote ?? "").trim() || null;

  const exists = r(await db.execute<Row>(sql`SELECT id FROM vendors WHERE id = ${vendorId} LIMIT 1`))[0];
  if (!exists) {
    res.status(404).json({ error: "İşletme bulunamadı" });
    return;
  }

  const maxRow = r(
    await db.execute<Row>(sql`
      SELECT MAX(end_date)::text as max_end
      FROM vendor_subscription_requests
      WHERE vendor_id = ${vendorId} AND status = 'approved'
    `),
  )[0];
  const maxEndStr = maxRow?.max_end != null ? String(maxRow.max_end) : "";

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let start = new Date(today);
  if (maxEndStr) {
    const parts = maxEndStr.split("-").map((x) => parseInt(x, 10));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      const maxEnd = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      if (!Number.isNaN(maxEnd.getTime())) {
        const dayAfter = new Date(maxEnd);
        dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
        if (dayAfter.getTime() > start.getTime()) start = dayAfter;
      }
    }
  }

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  end.setUTCDate(end.getUTCDate() - 1);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const append = ` | admin_extend:${startStr}→${endStr} | at:${new Date().toISOString().slice(0, 16)}`;

  await db.execute(sql`
    INSERT INTO vendor_subscription_requests (
      vendor_id, start_date, end_date, payment_method, receipt_url, status, admin_note, processed_at, updated_at
    ) VALUES (
      ${vendorId},
      ${startStr}::date,
      ${endStr}::date,
      'admin_manual',
      null,
      'approved',
      ${adminNote},
      NOW(),
      NOW()
    )
  `);

  await db.execute(sql`
    UPDATE vendors
    SET notes = CONCAT(COALESCE(notes, ''), ${append}),
        updated_at = NOW()
    WHERE id = ${vendorId}
  `);

  res.json({ success: true, start_date: startStr, end_date: endStr, vendor_id: vendorId, months });
});

/* ────────────────────────────────────────────────────────
   PATCH /api/providers/service-settings  (Masa & Rezervasyon)
──────────────────────────────────────────────────────── */
router.patch("/providers/service-settings", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const body = req.body as Record<string, unknown>;
  const { tableServiceEnabled, reservationEnabled, reservationAutoConfirm, tableSections, qrMenuPublic } = body;
  const vid = Number(vendorId);
  const vendorRows = r(
    await db.execute<Row>(sql`
      SELECT vendor_type, provider_type, provider_subtype, notes
      FROM vendors
      WHERE id = ${vid} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
      LIMIT 1
    `),
  );
  const vendorRow = vendorRows[0];
  if (!vendorRow) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }
  const tableAllowed = canVendorUseTableService(vendorRow);
  const effectiveTableServiceEnabled = tableAllowed && Boolean(tableServiceEnabled);
  const effectiveQrMenuPublic = tableAllowed && Boolean(qrMenuPublic);
  let mergedNotes: string | undefined;
  if (typeof qrMenuPublic === "boolean") {
    const prevNotes = vendorRow.notes != null ? String(vendorRow.notes) : "";
    mergedNotes = mergeVendorNoteLine(prevNotes, "qr_menu_public", effectiveQrMenuPublic ? "1" : "0");
  }
  await db.execute(sql`
    UPDATE vendors SET
      table_service_enabled   = ${effectiveTableServiceEnabled},
      reservation_enabled     = ${Boolean(reservationEnabled)},
      reservation_auto_confirm = ${Boolean(reservationAutoConfirm)},
      table_sections          = ${effectiveTableServiceEnabled && tableSections !== undefined ? (tableSections === null ? null : JSON.stringify(tableSections)) : null},
      updated_at = NOW()
    WHERE id = ${vid} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
  `);
  if (mergedNotes !== undefined) {
    await db.execute(sql`
      UPDATE vendors SET notes = ${mergedNotes}, updated_at = NOW()
      WHERE id = ${vid} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    `);
  }
  res.json({ success: true });
});

/* ────────────────────────────────────────────────────────
   GET /api/providers/service-settings
──────────────────────────────────────────────────────── */
router.get("/providers/service-settings", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  if (!vendorId) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT vendor_type, provider_type, provider_subtype, table_service_enabled, reservation_enabled, reservation_auto_confirm, table_sections, notes
    FROM vendors WHERE id = ${Number(vendorId)} LIMIT 1
  `));
  const row: Row = rows[0] ?? {};
  const tableAllowed = canVendorUseTableService(row);
  res.json({
    tableServiceEnabled: tableAllowed && Boolean(row.table_service_enabled),
    reservationEnabled: Boolean(row.reservation_enabled),
    reservationAutoConfirm: Boolean(row.reservation_auto_confirm),
    tableSections: tableAllowed && row.table_sections ? JSON.parse(String(row.table_sections)) : [],
    qrMenuPublic: tableAllowed && vendorNoteFlagOn(row.notes != null ? String(row.notes) : "", "qr_menu_public"),
  });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Ürün & Kategori yardımcı: vendor sahipliği doğrula
──────────────────────────────────────────────────────── */
async function verifyVendor(vendorId: string | string[] | undefined, vendorEmail: string | string[] | undefined): Promise<number | null> {
  if (!vendorId || !vendorEmail) return null;
  const rows = r(await db.execute<Row>(sql`SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1`));
  return rows[0] ? Number(vendorId) : null;
}

async function getVendorTypeForId(vid: number): Promise<string> {
  const rows = r(
    await db.execute(sql`SELECT provider_type, vendor_type FROM vendors WHERE id = ${vid} LIMIT 1`),
  ) as Array<{ provider_type: string | null; vendor_type: string | null }>;
  const row = rows[0];
  return String(row?.provider_type || row?.vendor_type || "").toLowerCase();
}

async function verifyVendorOwnsMenuItem(vid: number, itemId: number): Promise<boolean> {
  const rows = r(await db.execute<Row>(sql`SELECT id FROM vendor_menu_items WHERE id = ${itemId} AND vendor_id = ${vid} LIMIT 1`));
  return Boolean(rows[0]);
}

/* ────────────────────────────────────────────────────────
   PROVIDER — Ürünleri + kategorileri listele
   GET /api/providers/products
──────────────────────────────────────────────────────── */
router.get("/providers/products", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const [categories, items] = await Promise.all([
    db.execute<Row>(sql`
      SELECT id, name, position FROM vendor_menu_categories
      WHERE vendor_id = ${vid} AND active = true
      ORDER BY position, name
    `),
    db.execute<Row>(sql`
      SELECT mi.id, mi.name, mi.description, mi.price, mi.sale_price,
             mi.image_url, mi.active, mi.is_popular, mi.is_vegan, mi.is_spicy,
             mi.stock, mi.menu_category_id, mi.ecommerce_category_id,
             mc.name as category_name
      FROM vendor_menu_items mi
      LEFT JOIN vendor_menu_categories mc ON mc.id = mi.menu_category_id
      WHERE mi.vendor_id = ${vid} AND mi.active = true
      ORDER BY mc.position NULLS LAST, mi.name
    `),
  ]);

  res.json({ success: true, categories: r(categories), items: r(items) });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Yeni ürün ekle
   POST /api/providers/products
──────────────────────────────────────────────────────── */
router.post("/providers/products", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const {
    name, price, salePrice, description, imageUrl, menuCategoryId, isPopular, isVegan, isSpicy, stock,
    ecommerceCategoryId, customCategoryName,
  } = req.body;
  if (!name || price === undefined) { res.status(400).json({ error: "name ve price zorunlu" }); return; }

  const vendorType = await getVendorTypeForId(vid);
  const resolved = await resolveProductCategoryForVendor({
    vendorId: vid,
    vendorType,
    ecommerceCategoryId: ecommerceCategoryId ? Number(ecommerceCategoryId) : null,
    customCategoryName: customCategoryName ? String(customCategoryName) : null,
    menuCategoryId: menuCategoryId ? Number(menuCategoryId) : null,
  });

  const rows = r(await db.execute<Row>(sql`
    INSERT INTO vendor_menu_items (
      vendor_id, name, price, sale_price, description, image_url,
      menu_category_id, ecommerce_category_id, is_popular, is_vegan, is_spicy, stock, active
    )
    VALUES (
      ${vid}, ${name}, ${Number(price)}, ${salePrice ? Number(salePrice) : null},
      ${description || null}, ${imageUrl || null},
      ${resolved.menuCategoryId},
      ${resolved.ecommerceCategoryId},
      ${!!isPopular}, ${!!isVegan}, ${!!isSpicy},
      ${stock !== undefined ? Number(stock) : null}, true
    )
    RETURNING id, name, price, sale_price, description, image_url, menu_category_id, ecommerce_category_id, is_popular, active
  `));
  res.status(201).json({ success: true, item: rows[0] });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Ürün güncelle
   PUT /api/providers/products/:id
──────────────────────────────────────────────────────── */
router.put("/providers/products/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const itemId = Number(req.params.id);
  /* Ownership check */
  const own = r(await db.execute<Row>(sql`SELECT id FROM vendor_menu_items WHERE id = ${itemId} AND vendor_id = ${vid} LIMIT 1`));
  if (!own[0]) { res.status(403).json({ error: "Bu ürün size ait değil" }); return; }

  const { name, price, salePrice, description, imageUrl, menuCategoryId, isPopular, isVegan, isSpicy, stock, ecommerceCategoryId, customCategoryName } = req.body;

  const vendorType = await getVendorTypeForId(vid);
  let resolvedMenuCatId = menuCategoryId !== undefined ? (menuCategoryId ? Number(menuCategoryId) : null) : undefined;
  let resolvedEcomCatId: number | null | undefined = undefined;
  if (ecommerceCategoryId !== undefined || customCategoryName !== undefined) {
    const resolved = await resolveProductCategoryForVendor({
      vendorId: vid,
      vendorType,
      ecommerceCategoryId: ecommerceCategoryId ? Number(ecommerceCategoryId) : null,
      customCategoryName: customCategoryName ? String(customCategoryName) : null,
      menuCategoryId: menuCategoryId ? Number(menuCategoryId) : null,
    });
    resolvedMenuCatId = resolved.menuCategoryId;
    resolvedEcomCatId = resolved.ecommerceCategoryId;
  }

  const newPrice       = price !== undefined        ? Number(price)            : null;
  const newSalePrice   = salePrice !== undefined    ? (salePrice ? Number(salePrice) : null) : undefined;
  const newDescription = description !== undefined  ? (description || null)    : null;
  const newImageUrl    = imageUrl !== undefined     ? (imageUrl || null)       : null;
  const newCatId       = resolvedMenuCatId !== undefined ? resolvedMenuCatId : (menuCategoryId !== undefined ? (menuCategoryId ? Number(menuCategoryId) : null) : null);
  const newEcomCatId   = resolvedEcomCatId !== undefined ? resolvedEcomCatId : null;
  const newIsPopular   = isPopular !== undefined    ? !!isPopular              : null;
  const newIsVegan     = isVegan !== undefined      ? !!isVegan                : null;
  const newIsSpicy     = isSpicy !== undefined      ? !!isSpicy                : null;
  const newStock       = stock !== undefined        ? Number(stock)            : null;

  const rows = r(await db.execute<Row>(sql`
    UPDATE vendor_menu_items
    SET name             = COALESCE(${name || null}, name),
        price            = COALESCE(${newPrice}, price),
        sale_price       = CASE WHEN ${newSalePrice !== undefined} THEN ${newSalePrice ?? null} ELSE sale_price END,
        description      = COALESCE(${newDescription}, description),
        image_url        = COALESCE(${newImageUrl}, image_url),
        menu_category_id = COALESCE(${newCatId}, menu_category_id),
        ecommerce_category_id = CASE WHEN ${resolvedEcomCatId !== undefined} THEN ${newEcomCatId ?? null} ELSE ecommerce_category_id END,
        is_popular       = COALESCE(${newIsPopular}, is_popular),
        is_vegan         = COALESCE(${newIsVegan}, is_vegan),
        is_spicy         = COALESCE(${newIsSpicy}, is_spicy),
        stock            = COALESCE(${newStock}, stock),
        updated_at       = NOW()
    WHERE id = ${itemId} AND vendor_id = ${vid}
    RETURNING id, name, price, sale_price, description, image_url, menu_category_id, is_popular, active
  `));
  res.json({ success: true, item: rows[0] });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Ürün sil (soft)
   DELETE /api/providers/products/:id
──────────────────────────────────────────────────────── */
router.delete("/providers/products/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const itemId = Number(req.params.id);
  await db.execute<Row>(sql`UPDATE vendor_menu_items SET active = false WHERE id = ${itemId} AND vendor_id = ${vid}`);
  res.json({ success: true });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Toplu ürün sil (soft)
   POST /api/providers/products/bulk-delete  { ids: number[] }
──────────────────────────────────────────────────────── */
router.post("/providers/products/bulk-delete", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const idsRaw = (req.body as { ids?: unknown }).ids;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    res.status(400).json({ success: false, error: "ids dizisi gerekli" });
    return;
  }
  const ids = [...new Set(idsRaw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  if (ids.length === 0) {
    res.status(400).json({ success: false, error: "Geçerli ürün seçilmedi" });
    return;
  }
  if (ids.length > 500) {
    res.status(400).json({ success: false, error: "Tek seferde en fazla 500 ürün silinebilir" });
    return;
  }

  const updated = await db
    .update(vendorMenuItemsTable)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(vendorMenuItemsTable.vendorId, vid), inArray(vendorMenuItemsTable.id, ids)))
    .returning({ id: vendorMenuItemsTable.id });

  res.json({ success: true, deleted: updated.length });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Kategori listele
   GET /api/providers/categories
──────────────────────────────────────────────────────── */
router.get("/providers/categories", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const rows = r(await db.execute<Row>(sql`SELECT id, name, position, is_custom, ecommerce_category_id FROM vendor_menu_categories WHERE vendor_id = ${vid} AND active = true ORDER BY position, name`));
  res.json({ success: true, categories: rows });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Global alışveriş kategori ağacı
   GET /api/providers/ecommerce-categories
──────────────────────────────────────────────────────── */
router.get("/providers/ecommerce-categories", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const tree = await getEcommerceCategoryTree();
  res.json({ success: true, tree });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Ürün varyasyonları
──────────────────────────────────────────────────────── */
router.get("/providers/item-options/:itemId", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const itemId = Number(req.params.itemId);
  if (!await verifyVendorOwnsMenuItem(vid, itemId)) { res.status(403).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`SELECT * FROM vendor_item_options WHERE menu_item_id = ${itemId} ORDER BY id`));
  res.json({ success: true, options: rows });
});

router.post("/providers/item-options", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { menuItemId, name, required, multiple, choices } = req.body ?? {};
  const itemId = Number(menuItemId);
  if (!itemId || !name || !Array.isArray(choices) || !choices.length) {
    res.status(400).json({ error: "menuItemId, name ve choices zorunlu" });
    return;
  }
  if (!await verifyVendorOwnsMenuItem(vid, itemId)) { res.status(403).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    INSERT INTO vendor_item_options (menu_item_id, name, required, multiple, choices)
    VALUES (${itemId}, ${String(name)}, ${Boolean(required)}, ${Boolean(multiple)}, ${JSON.stringify(choices)}::jsonb)
    RETURNING *
  `));
  res.status(201).json({ success: true, option: rows[0] });
});

router.put("/providers/item-options/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const optId = Number(req.params.id);
  const { name, required, multiple, choices } = req.body ?? {};
  const own = r(await db.execute<Row>(sql`
    SELECT o.id FROM vendor_item_options o
    JOIN vendor_menu_items mi ON mi.id = o.menu_item_id
    WHERE o.id = ${optId} AND mi.vendor_id = ${vid}
    LIMIT 1
  `));
  if (!own[0]) { res.status(403).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    UPDATE vendor_item_options SET
      name = COALESCE(${name ?? null}, name),
      required = COALESCE(${required !== undefined ? Boolean(required) : null}, required),
      multiple = COALESCE(${multiple !== undefined ? Boolean(multiple) : null}, multiple),
      choices = COALESCE(${choices ? JSON.stringify(choices) : null}::jsonb, choices)
    WHERE id = ${optId}
    RETURNING *
  `));
  res.json({ success: true, option: rows[0] });
});

router.delete("/providers/item-options/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const optId = Number(req.params.id);
  const own = r(await db.execute<Row>(sql`
    SELECT o.id FROM vendor_item_options o
    JOIN vendor_menu_items mi ON mi.id = o.menu_item_id
    WHERE o.id = ${optId} AND mi.vendor_id = ${vid}
    LIMIT 1
  `));
  if (!own[0]) { res.status(403).json({ error: "Yetkisiz" }); return; }
  await db.execute(sql`DELETE FROM vendor_item_options WHERE id = ${optId}`);
  res.json({ success: true });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Yeni kategori ekle
   POST /api/providers/categories
──────────────────────────────────────────────────────── */
router.post("/providers/categories", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "Kategori adı zorunlu" }); return; }

  const posRes = r(await db.execute<Row>(sql`SELECT COALESCE(MAX(position),0)+1 as pos FROM vendor_menu_categories WHERE vendor_id = ${vid}`));
  const pos = Number((posRes[0] as Row)?.pos ?? 1);
  const vendorType = await getVendorTypeForId(vid);
  const isShop = ["alisveris", "ecommerce"].includes(vendorType);

  const rows = r(await db.execute<Row>(sql`
    INSERT INTO vendor_menu_categories (vendor_id, name, position, is_custom)
    VALUES (${vid}, ${name}, ${pos}, ${isShop})
    RETURNING id, name, position, is_custom, ecommerce_category_id
  `));
  res.status(201).json({ success: true, category: rows[0] });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Kategori sil (soft)
   DELETE /api/providers/categories/:id
──────────────────────────────────────────────────────── */
router.delete("/providers/categories/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const catId = Number(req.params.id);
  await db.execute<Row>(sql`UPDATE vendor_menu_categories SET active = false WHERE id = ${catId} AND vendor_id = ${vid}`);
  res.json({ success: true });
});

/* ────────────────────────────────────────────────────────
   PROVIDER — Siparişleri listele
   GET /api/providers/orders
──────────────────────────────────────────────────────── */
router.get("/providers/orders", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) { res.status(401).json({ error: "Kimlik doğrulama gerekli" }); return; }

  const check = r(await db.execute<Row>(sql`SELECT id FROM vendors WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))} LIMIT 1`));
  if (!check[0]) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const orders = r(await db.execute<Row>(sql`
    SELECT o.id, o.order_number, o.customer_name, o.customer_phone,
           o.customer_address, o.customer_city, o.customer_district,
           o.customer_postal_code, o.customer_email, o.vendor_note,
           o.subtotal, o.delivery_fee, o.total, o.status,
           o.payment_method, o.payment_status, o.notes, o.items,
           o.driver_name, o.driver_phone, o.estimated_time,
           o.assigned_usta_id, o.usta_name,
           o.assigned_servis_id, o.servis_name,
           o.order_source, o.created_by_staff,
           o.platform_commission_amount, o.commission_base_amount,
           o.commission_rate_pct_snapshot, o.revenue_model_snapshot,
           o.geliver_shipment_id, o.geliver_tracking_number, o.geliver_label_url,
           o.geliver_transaction_id, o.geliver_status, o.geliver_last_error,
           o.created_at, o.updated_at
    FROM delivery_orders o
    WHERE o.vendor_id = ${Number(vendorId)}
    ORDER BY o.created_at DESC
    LIMIT 100
  `));

  res.json({ success: true, orders });
});

router.post("/providers/orders/:id/geliver-shipment", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await ensureGeliverIntegrationColumns();

  const orderId = Number(req.params.id);
  if (!Number.isFinite(orderId)) {
    res.status(400).json({ error: "Geçersiz sipariş" });
    return;
  }

  const force = String(req.query.force ?? "") === "1";
  const mode = String(req.query.mode ?? "draft").toLowerCase();

  if (mode === "label") {
    const result = await createGeliverShipmentForOrder({ orderId, vendorId: vid, force });
    if (!result.ok) {
      res.status(400).json({ error: result.error ?? "geliver_failed" });
      return;
    }
    res.json({ success: true });
    return;
  }

  const draft = await createGeliverDraftShipmentForOrder({ orderId, vendorId: vid, force });
  if (!draft.ok) {
    res.status(400).json({ error: draft.error ?? "geliver_failed" });
    return;
  }
  res.json({ success: true, shipmentId: draft.shipmentId, shipment: draft.shipment });
});

/* ────────────────────────────────────────────────────────
   PATCH /api/providers/orders/:id/status
──────────────────────────────────────────────────────── */
router.patch("/providers/orders/:id/status", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }

  const orderId = Number(req.params.id);
  const { status, estimatedTime: estimatedTimeRaw, vendorNote } = req.body as {
    status: string;
    estimatedTime?: number | string;
    vendorNote?: string;
  };

  const curr = r(await db.execute<Row>(sql`
    SELECT status FROM delivery_orders WHERE id = ${orderId} AND vendor_id = ${vid} LIMIT 1
  `));
  if (!curr[0]) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }

  const gate = deliveryStatusTransitionAllowed("vendor", curr[0].status as string, status);
  if (!gate.ok) {
    res.status(400).json({ error: gate.error });
    return;
  }

  const tsField: Record<string, string> = {
    confirmed: "confirmed_at", preparing: "prepared_at",
    picked_up: "picked_up_at", delivered: "delivered_at", cancelled: "cancelled_at",
  };
  const col = tsField[status];

  /* estimatedTime ve vendorNote sadece confirmed adımında yazılır */
  const etSql =
    status === "confirmed" && estimatedTimeRaw != null && estimatedTimeRaw !== "" && Number.isFinite(Number(estimatedTimeRaw))
      ? sql`, estimated_time = ${Number(estimatedTimeRaw)}`
      : sql.raw("");
  const vnSql = (status === "confirmed" && vendorNote !== undefined)
    ? sql`, vendor_note = ${String(vendorNote)}`
    : sql.raw("");

  const updated = r(await db.execute<Row>(sql`
    UPDATE delivery_orders
    SET status = ${status}, updated_at = now()
    ${col ? sql.raw(`, ${col} = now()`) : sql.raw("")}
    ${etSql}
    ${vnSql}
    WHERE id = ${orderId} AND vendor_id = ${vid}
    RETURNING id, status, estimated_time, vendor_note, updated_at
  `));

  const fromStatus = curr[0].status as string;
  const etNum = estimatedTimeRaw != null && estimatedTimeRaw !== "" ? Number(estimatedTimeRaw) : NaN;
  const evNote =
    status === "confirmed" && Number.isFinite(etNum) && etNum > 0
      ? etNum >= 1440
        ? `Kargoya verilme: yaklaşık ${Math.round(etNum / 1440)} gün`
        : `Tahmini teslimat: ${Math.round(etNum)} dk`
      : null;
  await db.insert(deliveryOrderStatusEventsTable).values({
    orderId,
    fromStatus,
    toStatus: status,
    source: "vendor_panel",
    note: evNote,
  }).catch(() => {});

  if (status === "confirmed") {
    const [fullOrder] = await db
      .select()
      .from(deliveryOrdersTable)
      .where(and(eq(deliveryOrdersTable.id, orderId), eq(deliveryOrdersTable.vendorId, vid)))
      .limit(1);
    const [venRow] = await db
      .select({ name: vendorsTable.name, callmebotKey: vendorsTable.callmebotKey })
      .from(vendorsTable)
      .where(eq(vendorsTable.id, vid))
      .limit(1);
    if (fullOrder && venRow) {
      const track = fullOrder.orderNumber;
      const gTrack = fullOrder.geliverTrackingNumber?.trim();
      void notifyCustomerOrderWhatsApp({
        vendorId: vid,
        customerName: fullOrder.customerName,
        customerPhone: fullOrder.customerPhone,
        orderNumber: track,
        event: "confirmed",
        vendorNote: vendorNote != null ? String(vendorNote) : null,
        geliverTracking: gTrack || null,
      }).catch(() => {});
      const em = String((fullOrder as { customerEmail?: string | null }).customerEmail ?? "").trim();
      if (em) {
        const html = `<p>Merhaba ${escapeHtmlLite(fullOrder.customerName)},</p>
<p>Siparişiniz işleme alındı.</p>
<p><strong>Takip numaranız:</strong> ${escapeHtmlLite(track)}</p>
${gTrack ? `<p><strong>Kargo takip:</strong> ${escapeHtmlLite(gTrack)}</p>` : ""}
${vendorNote ? `<p><strong>İşletme notu:</strong> ${escapeHtmlLite(String(vendorNote))}</p>` : ""}
<p>${escapeHtmlLite(venRow.name)}</p>`;
        const textLines = [
          `Merhaba ${fullOrder.customerName},`,
          `Siparişiniz işleme alındı.`,
          `Takip: ${track}`,
          gTrack ? `Kargo: ${gTrack}` : "",
          vendorNote ? `Not: ${String(vendorNote).trim()}` : "",
          venRow.name,
        ].filter(Boolean).join("\n");
        void sendEmail({
          to: em,
          subject: `Siparişiniz alındı — ${venRow.name}`,
          html,
          text: textLines,
        }).catch(() => {});
      }
    }
  }

  res.json({ success: true, order: updated[0] });
});

/* — Kurye Yönetimi (Vendor) ──────────────────────────────────── */

router.get("/providers/couriers", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, phone, active, created_at FROM vendor_couriers
    WHERE vendor_id = ${vid} ORDER BY id ASC
  `));
  res.json(rows);
});

router.post("/providers/couriers", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { name, phone, password } = req.body as { name: string; phone: string; password?: string };
  if (!name || !phone) { res.status(400).json({ error: "Ad ve telefon zorunlu" }); return; }
  const rawPassword = password?.trim() || phone.trim();
  const hash = await bcrypt.hash(rawPassword, 10);
  const rows = r(await db.execute<Row>(sql`
    INSERT INTO vendor_couriers (vendor_id, name, phone, password_hash)
    VALUES (${vid}, ${name}, ${phone}, ${hash})
    RETURNING id, name, phone, active, created_at
  `));
  res.status(201).json({ ...rows[0], _defaultPassword: rawPassword });
});

router.delete("/providers/couriers/:id", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  await db.execute(sql`
    DELETE FROM vendor_couriers WHERE id = ${Number(req.params.id)} AND vendor_id = ${vid}
  `);
  res.json({ success: true });
});

/* Vendor assigns a courier to an order */
router.patch("/providers/orders/:id/assign-courier", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { courierId } = req.body as { courierId: number };
  const [courier] = r(await db.execute<Row>(sql`
    SELECT name, phone FROM vendor_couriers WHERE id = ${Number(courierId)} AND vendor_id = ${vid} LIMIT 1
  `));
  if (!courier) { res.status(404).json({ error: "Kurye bulunamadı" }); return; }
  await db.execute(sql`
    UPDATE delivery_orders SET driver_name = ${courier.name as string}, driver_phone = ${courier.phone as string},
    updated_at = now() WHERE id = ${Number(req.params.id)} AND vendor_id = ${vid}
  `);
  res.json({ success: true, driverName: courier.name, driverPhone: courier.phone });
});

/* — Kurye Paneli (Public) ──────────────────────────────────── */

/* Kurye login — phone + password */
router.post("/courier/login", async (req, res): Promise<void> => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  if (!phone || !password) { res.status(400).json({ error: "Telefon ve şifre zorunlu" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, phone, active, password_hash
    FROM vendor_couriers WHERE phone = ${phone.trim()} LIMIT 1
  `));
  if (!rows[0]) { res.status(401).json({ error: "Telefon numarası kayıtlı değil" }); return; }
  const courier = rows[0];
  if (!courier.active) { res.status(401).json({ error: "Hesabınız aktif değil. İşletme sahibiyle iletişime geçin." }); return; }
  const storedHash = courier.password_hash as string | null;
  if (!storedHash) {
    res.status(403).json({ error: "Bu kurye hesabı için şifre tanımlanmamış. İşletme panelinden şifre atayın." });
    return;
  }
  const ok = await bcrypt.compare(password, storedHash);
  if (!ok) { res.status(401).json({ error: "Şifre yanlış" }); return; }
  const token = signCourierSessionToken(Number(courier.id), String(courier.phone));
  res.json({ id: courier.id, name: courier.name, phone: courier.phone, token });
});

router.use("/courier", requireCourierSession);

/* Kurye şifre değiştirme */
router.patch("/courier/change-password", async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  const phone = courierPhoneFromSession(req);
  if (!phone || !currentPassword || !newPassword) { res.status(400).json({ error: "Eksik bilgi" }); return; }
  if (newPassword.length < 4) { res.status(400).json({ error: "Yeni şifre en az 4 karakter olmalı" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT id, active, password_hash FROM vendor_couriers WHERE phone = ${phone.trim()} LIMIT 1
  `));
  if (!rows[0]) { res.status(404).json({ error: "Kurye bulunamadı" }); return; }
  const courier = rows[0];
  if (!courier.active) { res.status(401).json({ error: "Hesabınız aktif değil" }); return; }
  const storedHash = courier.password_hash as string | null;
  const ok = storedHash ? await bcrypt.compare(currentPassword, storedHash) : false;
  if (!ok) { res.status(401).json({ error: "Mevcut şifre yanlış" }); return; }
  const newHash = await bcrypt.hash(newPassword, 10);
  await db.execute(sql`UPDATE vendor_couriers SET password_hash = ${newHash} WHERE id = ${courier.id as number}`);
  res.json({ success: true });
});

/* Kurye phone ile login → kendine atanmış siparişleri görür */
router.get("/courier/orders", async (req, res): Promise<void> => {
  const phone = courierPhoneFromSession(req);
  if (!phone) { res.status(400).json({ error: "Telefon zorunlu" }); return; }
  const rows = r(await db.execute<Row>(sql`
    SELECT o.*, v.name as vendor_name, v.address as vendor_address, v.phone as vendor_phone
    FROM delivery_orders o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.driver_phone = ${phone}
    AND o.status NOT IN ('cancelled')
    ORDER BY o.created_at DESC LIMIT 50
  `));
  res.json(rows);
});

/* Kurye sipariş durumunu günceller: picked_up → delivered + proof photo */
router.patch("/courier/orders/:id/status", async (req, res): Promise<void> => {
  const { status, proofUrl } = req.body as { status: string; proofUrl?: string };
  const phone = courierPhoneFromSession(req);
  if (!phone || !status) { res.status(400).json({ error: "Eksik alan" }); return; }

  const curr = r(await db.execute<Row>(sql`
    SELECT id, status FROM delivery_orders WHERE id = ${Number(req.params.id)} AND driver_phone = ${phone} LIMIT 1
  `));
  if (!curr[0]) { res.status(404).json({ error: "Sipariş bulunamadı veya bu siparişe atanmış değilsiniz" }); return; }

  const fromCourier = curr[0].status as string;
  const gate = deliveryStatusTransitionAllowed("courier", fromCourier, status);
  if (!gate.ok) {
    res.status(400).json({ error: gate.error });
    return;
  }

  const tsField: Record<string, string> = { picked_up: "picked_up_at", on_the_way: "picked_up_at", delivered: "delivered_at" };
  const col = tsField[status];
  const orderId = Number(req.params.id);

  await db.execute(sql`
    UPDATE delivery_orders
    SET status = ${status}, updated_at = now()
    ${col ? sql.raw(`, ${col} = now()`) : sql.raw("")}
    ${proofUrl && status === "delivered" ? sql`, delivery_proof_url = ${proofUrl}` : sql.raw("")}
    WHERE id = ${orderId} AND driver_phone = ${phone}
  `);

  await db.insert(deliveryOrderStatusEventsTable).values({
    orderId,
    fromStatus: fromCourier,
    toStatus: status,
    source: "courier_panel",
    note: null,
  }).catch(() => {});

  res.json({ success: true, status });
});

/* Kurye canlı konum ping */
router.post("/courier/location", async (req, res): Promise<void> => {
  const { orderId, lat, lng, accuracy, heading, speed } = req.body as {
    phone?: string; orderId?: number; lat?: number; lng?: number; accuracy?: number; heading?: number; speed?: number;
  };
  const courierPhone = courierPhoneFromSession(req);
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!courierPhone || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    res.status(400).json({ error: "phone, lat, lng zorunlu" }); return;
  }

  const rows = r(await db.execute<Row>(sql`
    SELECT id, active FROM vendor_couriers WHERE phone = ${courierPhone} LIMIT 1
  `));
  if (!rows[0]) { res.status(404).json({ error: "Kurye bulunamadı" }); return; }
  if (!rows[0].active) { res.status(401).json({ error: "Kurye pasif" }); return; }
  const courierId = Number(rows[0].id);

  let orderIdNum: number | null = null;
  if (orderId !== undefined && orderId !== null && Number.isFinite(Number(orderId))) {
    const check = r(await db.execute<Row>(sql`
      SELECT id FROM delivery_orders
      WHERE id = ${Number(orderId)} AND driver_phone = ${courierPhone}
      LIMIT 1
    `));
    if (check[0]) orderIdNum = Number(check[0].id);
  }
  if (!orderIdNum) {
    const activeOrder = r(await db.execute<Row>(sql`
      SELECT id FROM delivery_orders
      WHERE driver_phone = ${courierPhone}
        AND status IN ('picked_up', 'on_the_way')
      ORDER BY updated_at DESC
      LIMIT 1
    `));
    if (activeOrder[0]) orderIdNum = Number(activeOrder[0].id);
  }

  const rowsIns = r(await db.execute<Row>(sql`
    INSERT INTO driver_locations (order_id, courier_id, courier_phone, lat, lng, accuracy, heading, speed, source)
    VALUES (
      ${orderIdNum},
      ${courierId},
      ${courierPhone},
      ${latNum},
      ${lngNum},
      ${Number.isFinite(Number(accuracy)) ? Number(accuracy) : null},
      ${Number.isFinite(Number(heading)) ? Number(heading) : null},
      ${Number.isFinite(Number(speed)) ? Number(speed) : null},
      'courier_panel'
    )
    RETURNING id, order_id, lat, lng, created_at
  `));

  res.json({ success: true, location: rowsIns[0] ?? null });
});

/* — Mesajlaşma (Vendor Panel & Kurye Panel) ──────────────────── */

/* Vendor: sipariş mesajlarını listele */
router.get("/providers/orders/:id/messages", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const orderId = Number(req.params.id);
  /* Siparişin bu vendor'a ait olduğunu doğrula */
  const [order] = await db.select({ id: deliveryOrdersTable.id })
    .from(deliveryOrdersTable)
    .where(and(eq(deliveryOrdersTable.id, orderId), eq(deliveryOrdersTable.vendorId, vid)))
    .limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  const msgs = await db.select().from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, orderId))
    .orderBy(orderMessagesTable.createdAt);
  res.json(msgs);
});

/* Vendor: mesaj gönder */
router.post("/providers/orders/:id/messages", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const { senderName, message } = req.body as { senderName: string; message: string };
  if (!message?.trim()) { res.status(400).json({ error: "Mesaj boş olamaz" }); return; }
  const orderId = Number(req.params.id);
  const [order] = await db.select({ id: deliveryOrdersTable.id })
    .from(deliveryOrdersTable)
    .where(and(eq(deliveryOrdersTable.id, orderId), eq(deliveryOrdersTable.vendorId, vid)))
    .limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  const [msg] = await db.insert(orderMessagesTable).values({
    orderId, senderType: "vendor",
    senderName: senderName || "İşletme", message: message.trim(),
  }).returning();
  res.status(201).json(msg);
});

/* Kurye: mesajları listele */
router.get("/courier/orders/:id/messages", async (req, res): Promise<void> => {
  const orderId = Number(req.params.id);
  const phone = courierPhoneFromSession(req);
  const [order] = await db.select({ id: deliveryOrdersTable.id })
    .from(deliveryOrdersTable)
    .where(and(eq(deliveryOrdersTable.id, orderId), eq(deliveryOrdersTable.driverPhone, phone)))
    .limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  const msgs = await db.select().from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, orderId))
    .orderBy(orderMessagesTable.createdAt);
  res.json(msgs);
});

/* Kurye: mesaj gönder */
router.post("/courier/orders/:id/messages", async (req, res): Promise<void> => {
  const { senderName, message } = req.body as { senderName: string; message: string };
  if (!message?.trim()) { res.status(400).json({ error: "Mesaj boş olamaz" }); return; }
  const orderId = Number(req.params.id);
  const phone = courierPhoneFromSession(req);
  const [order] = await db.select({ id: deliveryOrdersTable.id })
    .from(deliveryOrdersTable)
    .where(and(eq(deliveryOrdersTable.id, orderId), eq(deliveryOrdersTable.driverPhone, phone)))
    .limit(1);
  if (!order) { res.status(404).json({ error: "Sipariş bulunamadı" }); return; }
  const [msg] = await db.insert(orderMessagesTable).values({
    orderId, senderType: "courier",
    senderName: senderName || "Kurye", message: message.trim(),
  }).returning();
  res.status(201).json(msg);
});

/* Vendor: dış platform URL'sinden menü önizleme (kaydetmez) */
router.post("/providers/import/external-menu/preview", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const body = req.body as Record<string, unknown>;
  const sourceUrl = String(body.sourceUrl ?? "").trim();
  if (!sourceUrl) { res.status(400).json({ error: "sourceUrl zorunlu" }); return; }
  try {
    const imported = await importVendorFromExternalUrl(sourceUrl, {
      prefetchedHtml: pickPrefetchedHtml(body),
      prefetchedMenuJson: pickPrefetchedMenuJson(body),
    });
    res.json({ success: true, ...externalMenuPreviewPayload(imported) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Menü önizleme başarısız" });
  }
});

/* Vendor: dış platform URL'sinden kendi menüsünü içe aktar */
router.post("/providers/import/external-menu", async (req, res): Promise<void> => {
  const vid = await verifyVendor(req.headers["x-vendor-id"], req.headers["x-vendor-email"]);
  if (!vid) { res.status(401).json({ error: "Yetkisiz" }); return; }
  const body = req.body as Record<string, unknown>;
  const sourceUrl = String(body.sourceUrl ?? "").trim();
  const selectedCategories = Array.isArray(body.selectedCategories)
    ? (body.selectedCategories as unknown[]).map((c) => String(c)).filter(Boolean)
    : undefined;
  const menu = Array.isArray(body.menu) ? (body.menu as ImportedMenuItem[]) : undefined;
  if (!sourceUrl && !(menu && menu.length > 0)) {
    res.status(400).json({ error: "sourceUrl veya menu zorunlu" });
    return;
  }
  try {
    const { imported, menuStats } = await runExternalMenuImportForVendor(vid, {
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
    res.json({
      success: true,
      vendorId: vid,
      importedMeta: {
        platform: imported.platform,
        itemCount: menuStats.items,
        rating: imported.rating ?? null,
        reviewCount: imported.reviewCount ?? null,
      },
      menuStats,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Menü içe aktarma başarısız" });
  }
});

/* — Admin: Vendor Kategori Yönetimi ──────────────────────────── */

router.get("/admin/vendor-categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const rows = r(await db.execute<Row>(sql`
    SELECT id, name, slug, icon, image_url, position, active, super_category, created_at
    FROM vendor_categories ORDER BY position ASC, id ASC
  `));
  res.json(rows);
});

router.post("/admin/vendor-categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const { name, slug, icon, imageUrl, position, superCategory } = req.body as Record<string, string | number>;
  if (!name || !slug) { res.status(400).json({ error: "Ad ve slug zorunlu" }); return; }
  const rows = r(await db.execute<Row>(sql`
    INSERT INTO vendor_categories (name, slug, icon, image_url, position, super_category)
    VALUES (${name as string}, ${slug as string}, ${(icon as string) || null}, ${(imageUrl as string) || null},
            ${Number(position) || 0}, ${(superCategory as string) || "siparis"})
    RETURNING id, name, slug, icon, image_url, position, active, super_category, created_at
  `));
  res.status(201).json(rows[0]);
});

router.put("/admin/vendor-categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  const { name, slug, icon, imageUrl, position, superCategory, active } = req.body as Record<string, string | number | boolean>;
  const parts: string[] = [];
  const vals: (string | number | boolean | null)[] = [];
  if (name !== undefined)          { parts.push(`name = $${parts.length+1}`);           vals.push(name as string); }
  if (slug !== undefined)          { parts.push(`slug = $${parts.length+1}`);           vals.push(slug as string); }
  if (icon !== undefined)          { parts.push(`icon = $${parts.length+1}`);           vals.push((icon as string) || null); }
  if (imageUrl !== undefined)      { parts.push(`image_url = $${parts.length+1}`);      vals.push((imageUrl as string) || null); }
  if (position !== undefined)      { parts.push(`position = $${parts.length+1}`);      vals.push(Number(position) || 0); }
  if (superCategory !== undefined) { parts.push(`super_category = $${parts.length+1}`);vals.push(superCategory as string); }
  if (active !== undefined)        { parts.push(`active = $${parts.length+1}`);         vals.push(Boolean(active)); }
  if (parts.length === 0) { res.status(400).json({ error: "Güncellenecek alan yok" }); return; }
  vals.push(Number(req.params.id));
  const { pool } = await import("@workspace/db");
  const r2 = await pool.query(
    `UPDATE vendor_categories SET ${parts.join(", ")} WHERE id = $${parts.length+1} RETURNING id, name, slug, icon, image_url, position, active, super_category, created_at`,
    vals
  );
  res.json(r2.rows[0] ?? {});
});

router.delete("/admin/vendor-categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  await db.execute(sql`DELETE FROM vendor_categories WHERE id = ${Number(req.params.id)}`);
  res.json({ success: true });
});

/* — Mağaza vitrin teması ve özel alan — */

router.get("/providers/storefront/theme", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  await ensureVendorThemeColumns();

  const rows = r(await db.execute<Row>(sql`
    SELECT id, slug, vendor_type, provider_type, provider_subtype, theme_key, theme_config
    FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `));
  const v = rows[0];
  if (!v) {
    res.status(401).json({ error: "Geçersiz oturum" });
    return;
  }

  const vendorCtx = {
    vendorType: String(v.vendor_type ?? ""),
    providerType: String(v.provider_type ?? ""),
    providerSubtype: String(v.provider_subtype ?? ""),
  };
  const themeKey = String(v.theme_key ?? "").trim() || resolveDefaultThemeKey(vendorCtx);
  const savedRaw = v.theme_config;
  const saved =
    savedRaw && typeof savedRaw === "object" && !Array.isArray(savedRaw)
      ? (savedRaw as Record<string, unknown>)
      : typeof savedRaw === "string"
        ? (() => {
            try {
              return JSON.parse(savedRaw) as Record<string, unknown>;
            } catch {
              return {};
            }
          })()
        : {};

  const domains = await listVendorDomains(Number(vendorId));
  const available = themesForVendor(vendorCtx);
  const internalStorefrontPath = resolveVendorStorefrontPath({ slug: String(v.slug ?? ""), ...vendorCtx });
  const approvedDomain = domains.find((d) => d.status === "approved" || d.verified_at);
  const shortPath = resolveVendorCustomDomainShortPath({
    id: Number(vendorId),
    name: undefined,
    slug: String(v.slug ?? ""),
  });
  const storefrontPath = approvedDomain?.domain
    ? `https://${approvedDomain.domain}${shortPath}`
    : internalStorefrontPath;

  res.json({
    success: true,
    themeKey,
    themeConfig: mergeThemeConfig(themeKey, saved),
    defaultThemeKey: resolveDefaultThemeKey(vendorCtx),
    storefrontPath,
    internalStorefrontPath,
    shortPath,
    availableThemes: available,
    allThemes: VENDOR_THEME_CATALOG,
    domains,
    ...readVendorNavMenuFromThemeConfig(saved),
  });
});

router.put("/providers/storefront/theme", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  await ensureVendorThemeColumns();

  const body = req.body as Record<string, unknown>;
  const hasThemeKey = Object.prototype.hasOwnProperty.call(body, "themeKey");
  const hasThemeConfig = Object.prototype.hasOwnProperty.call(body, "themeConfig");
  const hasNavMenuEnabled = Object.prototype.hasOwnProperty.call(body, "navMenuEnabled");
  const hasNavMenuItems = Object.prototype.hasOwnProperty.call(body, "navMenuItems");
  const hasStripMenuEnabled = Object.prototype.hasOwnProperty.call(body, "stripMenuEnabled");
  const hasStripMenuItems = Object.prototype.hasOwnProperty.call(body, "stripMenuItems");

  const current = r(await db.execute<Row>(sql`
    SELECT id, vendor_type, provider_type, provider_subtype, theme_key, theme_config
    FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `))[0];
  if (!current) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }

  const vendorCtx = {
    vendorType: String(current.vendor_type ?? ""),
    providerType: String(current.provider_type ?? ""),
    providerSubtype: String(current.provider_subtype ?? ""),
  };

  let nextKey = String(current.theme_key ?? "").trim() || resolveDefaultThemeKey(vendorCtx);
  if (hasThemeKey) {
    const raw = String(body.themeKey ?? "").trim().toLowerCase();
    const allowed = themesForVendor(vendorCtx);
    if (!allowed.some((t) => t.key === raw)) {
      res.status(400).json({ error: "Bu mağaza türü için tema seçilemez" });
      return;
    }
    nextKey = raw;
  }

  let nextConfig: Record<string, unknown> = {};
  const prevRaw = current.theme_config;
  if (prevRaw && typeof prevRaw === "object" && !Array.isArray(prevRaw)) {
    nextConfig = { ...(prevRaw as Record<string, unknown>) };
  } else if (typeof prevRaw === "string") {
    try {
      nextConfig = JSON.parse(prevRaw) as Record<string, unknown>;
    } catch {
      nextConfig = {};
    }
  }

  if (hasThemeConfig && body.themeConfig && typeof body.themeConfig === "object") {
    const def = themeDefByKey(nextKey);
    const incoming = body.themeConfig as Record<string, unknown>;
    for (const slot of def?.slots ?? []) {
      if (Object.prototype.hasOwnProperty.call(incoming, slot.key)) {
        const val = incoming[slot.key];
        nextConfig[slot.key] = val == null ? "" : String(val).trim().slice(0, 4000);
      }
    }
  }

  if (hasNavMenuEnabled) {
    nextConfig.navMenuEnabled = body.navMenuEnabled === true;
  }

  if (hasNavMenuItems) {
    const rawItems = Array.isArray(body.navMenuItems) ? body.navMenuItems : [];
    const cleaned = cleanVendorNavMenuItems(
      rawItems.map((item, index) => {
        const o = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          id: String(o.id ?? `vnav-${index + 1}`),
          label: String(o.label ?? ""),
          href: String(o.href ?? "#"),
          enabled: o.enabled === false ? false : true,
        };
      }),
    );
    if (cleaned?.length) nextConfig.navMenuItems = cleaned;
    else delete nextConfig.navMenuItems;
  }

  if (hasStripMenuEnabled) {
    nextConfig.stripMenuEnabled = body.stripMenuEnabled === true;
  }

  if (hasStripMenuItems) {
    const rawItems = Array.isArray(body.stripMenuItems) ? body.stripMenuItems : [];
    const cleaned = cleanVendorNavMenuItems(
      rawItems.map((item, index) => {
        const o = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          id: String(o.id ?? `vstrip-${index + 1}`),
          label: String(o.label ?? ""),
          href: String(o.href ?? "#"),
          enabled: o.enabled === false ? false : true,
        };
      }),
    );
    if (cleaned?.length) nextConfig.stripMenuItems = cleaned;
    else delete nextConfig.stripMenuItems;
  }

  const rows = r(await db.execute<Row>(sql`
    UPDATE vendors
    SET theme_key = ${nextKey},
        theme_config = ${JSON.stringify(nextConfig)}::jsonb,
        updated_at = NOW()
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    RETURNING theme_key, theme_config
  `));

  res.json({
    success: true,
    themeKey: String(rows[0]?.theme_key ?? nextKey),
    themeConfig: mergeThemeConfig(nextKey, nextConfig),
    ...readVendorNavMenuFromThemeConfig(nextConfig),
  });
});

router.put("/providers/storefront/domains", async (req, res): Promise<void> => {
  const vendorId = req.headers["x-vendor-id"];
  const vendorEmail = req.headers["x-vendor-email"];
  if (!vendorId || !vendorEmail) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  await ensureVendorCustomDomainsTable();

  const check = r(await db.execute<Row>(sql`
    SELECT id, name, slug FROM vendors
    WHERE id = ${Number(vendorId)} AND ${sqlVendorSessionEmailMatches(String(vendorEmail))}
    LIMIT 1
  `))[0];
  if (!check) {
    res.status(401).json({ error: "Yetkisiz" });
    return;
  }

  const rawList = (req.body as { domains?: unknown }).domains;
  if (!Array.isArray(rawList)) {
    res.status(400).json({ error: "domains dizisi gerekli" });
    return;
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of rawList.slice(0, 3)) {
    const d = normalizeVendorDomain(String(item ?? ""));
    if (!d || seen.has(d)) continue;
    seen.add(d);
    normalized.push(d);
  }

  for (const d of normalized) {
    const conflict = r(await db.execute<Row>(sql`
      SELECT vendor_id FROM vendor_custom_domains
      WHERE lower(trim(domain)) = ${d} AND vendor_id <> ${Number(vendorId)}
      LIMIT 1
    `))[0];
    if (conflict) {
      res.status(409).json({ error: `${d} başka bir mağazaya bağlı` });
      return;
    }
  }

  await db.execute(sql`DELETE FROM vendor_custom_domains WHERE vendor_id = ${Number(vendorId)}`);

  let pos = 1;
  for (const d of normalized) {
    await db.execute(sql`
      INSERT INTO vendor_custom_domains (vendor_id, domain, position, status, verified_at, requested_at, updated_at)
      VALUES (${Number(vendorId)}, ${d}, ${pos}, 'pending', NULL, NOW(), NOW())
    `);
    pos += 1;
  }

  if (normalized.length > 0) {
    notifyAdminWhatsApp({
      eventType: "Servis Sağlayıcı Domain Talebi",
      details: [
        `🏢 ${String(check.name ?? "Servis sağlayıcı")}`,
        `🆔 Vendor ID: ${Number(vendorId)}`,
        `🔗 ${normalized.join(", ")}`,
        `🌐 DNS: ns1.vercel-dns.com / ns2.vercel-dns.com`,
        `📌 Admin panelden onay bekliyor`,
      ].join("\n"),
    }).catch(() => {});
  }

  const domains = await listVendorDomains(Number(vendorId));
  res.json({ success: true, domains, message: "Domain talebiniz admin onayına gönderildi" });
});

router.get("/admin/vendor-domain-requests", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  await ensureVendorCustomDomainsTable();
  const rows = r(await db.execute<Row>(sql`
    SELECT d.id, d.vendor_id, d.domain, d.position, d.status, d.admin_note, d.verified_at,
           d.requested_at, d.approved_at, d.rejected_at,
           v.name AS vendor_name, v.slug AS vendor_slug, v.vendor_type, v.provider_type, v.provider_subtype
    FROM vendor_custom_domains d
    JOIN vendors v ON v.id = d.vendor_id
    ORDER BY
      CASE WHEN d.status = 'pending' THEN 0 WHEN d.status = 'approved' THEN 1 ELSE 2 END,
      d.requested_at DESC,
      d.id DESC
    LIMIT 200
  `));
  res.json({ success: true, requests: rows });
});

router.put("/admin/vendor-domain-requests/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "servis_saglayicilar")) return;
  await ensureVendorCustomDomainsTable();
  const id = Number(req.params.id);
  const body = req.body as { action?: unknown; adminNote?: unknown };
  const action = String(body.action ?? "").trim().toLowerCase();
  const adminNote = String(body.adminNote ?? "").trim().slice(0, 1000) || null;
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz kayıt" });
    return;
  }
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action approve veya reject olmalı" });
    return;
  }

  const rows = r(await db.execute<Row>(sql`
    UPDATE vendor_custom_domains
    SET status = ${action === "approve" ? "approved" : "rejected"},
        admin_note = ${adminNote},
        verified_at = ${action === "approve" ? sql`NOW()` : sql`NULL`},
        approved_at = ${action === "approve" ? sql`NOW()` : sql`NULL`},
        rejected_at = ${action === "reject" ? sql`NOW()` : sql`NULL`},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, vendor_id, domain, status, verified_at, admin_note, approved_at, rejected_at
  `));
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Talep bulunamadı" });
    return;
  }
  res.json({ success: true, request: row });
});

export default router;
