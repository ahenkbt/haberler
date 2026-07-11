import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/apiBase";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import { TrAddressFields } from "@/components/TrAddressFields";
import { OrderTrackSearch } from "@/components/OrderTrackSearch";
import { PlatformBroadcastStrip } from "@/components/PlatformBroadcastStrip";
import { VendorPostaHub } from "@/pages/public/providerPanels/VendorPostaHub";
import { VendorDuyurularPanel } from "@/pages/public/providerPanels/VendorDuyurularPanel";
import { VendorBlogPanel } from "@/pages/public/providerPanels/VendorBlogPanel";
import { VendorBildirimlerPanel } from "@/pages/public/providerPanels/VendorBildirimlerPanel";
import { VendorPlatformSupportTab } from "@/pages/public/providerPanels/VendorPlatformSupportTab";
import { VendorThemesPanel } from "@/pages/public/providerPanels/VendorThemesPanel";
import { VendorNavMenuPanel } from "@/pages/public/providerPanels/VendorNavMenuPanel";
import { ExternalMenuImportPanel } from "@/components/ExternalMenuImportPanel";
import { EcommerceCategorySelect, type EcommerceCategoryNode } from "@/components/EcommerceCategorySelect";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";
import { providerPanelPath } from "@/lib/providerPanelRoutes";
import { buildVendorTableOrderUrl, qrCodeImageUrl } from "@/lib/vendorQrUrls";

/** Standart üyelikte görünen panel sekmeleri (içerik + vitrin temeli; kalan modüller Gold). */
const PROVIDER_STANDARD_TAB_IDS = new Set([
  "anasayfa",
  "profil",
  "urunler",
  "siparisler",
  "platform-destek",
  "genel-ayarlar",
  "temalar",
  "blog",
  "duyurular",
]);

/** Canlıda VITE_API_BASE_URL ile API kökü; aksi halde aynı origin /api */
function apiJoin(path: string): string {
  const rest = path.replace(/^\/+/, "");
  return apiUrl(`/api/${rest}`);
}

/** Geliver shipment.get yanıtından teklif kartları (app.geliver.io ile aynı veri kaynağı). */
type GeliverOfferRow = { id: string; title: string; subtitle: string; amount: number | null };

function geliverOfferAmountFromRec(rec: Record<string, unknown>): number | null {
  for (const v of [
    rec.totalAmountLocal,
    rec.totalAmount,
    rec.amountLocal,
    rec.amount,
    rec.totalPrice,
    rec.price,
    rec.priceWithTax,
    rec.cost,
  ]) {
    if (v == null) continue;
    const n =
      typeof v === "number"
        ? v
        : Number(String(v).replace(/[^\d,.\-]/g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function collectGeliverOffersFromShipment(shipment: unknown): GeliverOfferRow[] {
  const raw = shipment as Record<string, unknown> | null | undefined;
  if (!raw) return [];
  const s =
    raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw;

  const offersBlock =
    (s.offers && typeof s.offers === "object" && !Array.isArray(s.offers) ? s.offers : null) ||
    (s.Offers && typeof s.Offers === "object" && !Array.isArray(s.Offers) ? s.Offers : null);

  const seen = new Set<string>();
  const rows: GeliverOfferRow[] = [];
  const add = (tag: string, o: unknown) => {
    if (!o || typeof o !== "object") return;
    const rec = o as Record<string, unknown>;
    const id = String(rec.id ?? rec.offerID ?? rec.offerId ?? "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    const code = String(rec.providerServiceCode ?? rec.serviceCode ?? "").trim();
    const prov = String(rec.providerAccountName ?? rec.providerCode ?? rec.name ?? "").trim();
    const amt = String(
      rec.amountLocal ?? rec.amount ?? rec.totalAmountLocal ?? rec.totalAmount ?? "—",
    );
    const eta = String(rec.averageEstimatedTimeHumanReadible ?? "");
    const titleBits = [tag, prov || null, code || null].filter(Boolean) as string[];
    rows.push({
      id,
      title: titleBits.join(" · "),
      subtitle: `${amt}${eta ? ` · ${eta}` : ""}`,
      amount: geliverOfferAmountFromRec(rec),
    });
  };

  if (Array.isArray(s.offers)) {
    for (const o of s.offers) add("Teklif", o);
    return rows;
  }

  if (!offersBlock || typeof offersBlock !== "object") return rows;

  const ov = offersBlock as Record<string, unknown>;
  add("En ucuz", ov.cheapest ?? ov.Cheapest);
  add("En hızlı", ov.fastest ?? ov.Fastest);
  const list = ov.list ?? ov.List;
  if (Array.isArray(list)) {
    for (const o of list) add("Teklif", o);
  }

  const skip = new Set(
    [
      "cheapest",
      "Cheapest",
      "fastest",
      "Fastest",
      "list",
      "List",
      "allowOfferFallback",
      "AllowOfferFallback",
      "createdAt",
      "updatedAt",
      "owner",
      "test",
      "height",
      "length",
      "width",
      "weight",
      "itemIDs",
      "parcelIDs",
      "providerAccountIDs",
      "providerCodes",
      "providerServiceCodes",
      "percentageCompleted",
      "totalOffersCompleted",
      "totalOffersRequested",
    ].map((k) => k.toLowerCase()),
  );
  for (const [k, v] of Object.entries(ov)) {
    if (skip.has(k.toLowerCase())) continue;
    if (v && typeof v === "object" && !Array.isArray(v) && (v as Record<string, unknown>).id != null) {
      add(k, v);
    }
  }

  return rows;
}

/** İşletme başına: Geliver shipmentId → kullanıcının panelde seçeceği offerId (yalnız tarayıcı; Geliver API'si seçimi kaydetmez). */
const GELIVER_PINNED_OFFER_LS_PREFIX = "yekpare_geliver_pinned_offer_v1_";

const GELIVER_SUPPORT_WHATSAPP =
  "https://api.whatsapp.com/send?phone=905056101835&text=Merhaba,%20yard%C4%B1ma%20ihtiyac%C4%B1m%20var";

function readGeliverPinnedOfferMap(vendorId: number): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${GELIVER_PINNED_OFFER_LS_PREFIX}${vendorId}`);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object" || Array.isArray(p)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[String(k).trim()] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function writeGeliverPinnedOfferMap(vendorId: number, map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${GELIVER_PINNED_OFFER_LS_PREFIX}${vendorId}`, JSON.stringify(map));
  } catch {
    /* quota / gizli mod */
  }
}

/** Liste satırından gönderi UUID (zarflı veya düz). */
function geliverListRowId(row: Record<string, unknown>): string {
  const root =
    row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : row;
  return String(root.id ?? root.shipmentID ?? root.shipmentId ?? row.id ?? "").trim();
}

function geliverListRowMainPayload(row: Record<string, unknown>): Record<string, unknown> {
  return row.data && typeof row.data === "object" && !Array.isArray(row.data)
    ? (row.data as Record<string, unknown>)
    : row;
}

/** Liste özetinde alıcı; zarfta veya kökte, Geliver yanıt şekline göre birkaç yol dener. */
function geliverListRowRecipientRoot(row: Record<string, unknown>): Record<string, unknown> {
  const root = geliverListRowMainPayload(row);
  const pick = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  return (
    pick(root.recipientAddress) ??
    pick(row.recipientAddress) ??
    pick(root.recipient) ??
    pick(row.recipient) ??
    pick(root.to) ??
    pick(root.consignee) ??
    {}
  );
}

function geliverListRowDisplayName(row: Record<string, unknown>): string {
  const root = geliverListRowMainPayload(row);
  const rec = geliverListRowRecipientRoot(row);
  const n = String(rec.name ?? rec.fullName ?? rec.contactName ?? root.recipientName ?? row.recipientName ?? "").trim();
  if (n) return n;
  const ord = pickNestedOrder(root) ?? pickNestedOrder(row);
  if (ord) {
    const cn = String(ord.customerName ?? ord.recipientName ?? "").trim();
    if (cn) return cn;
  }
  return "—";
}

function geliverListRowDisplayPhone(row: Record<string, unknown>): string {
  const root = geliverListRowMainPayload(row);
  const rec = geliverListRowRecipientRoot(row);
  const ph = String(rec.phone ?? rec.mobile ?? rec.phoneNumber ?? "").trim();
  if (ph) return ph;
  const ord = pickNestedOrder(root) ?? pickNestedOrder(row);
  if (ord) {
    const p = String(ord.phone ?? ord.customerPhone ?? ord.mobile ?? "").trim();
    if (p) return p;
  }
  return "—";
}

function geliverListRowDisplayLocality(row: Record<string, unknown>): string {
  const rec = geliverListRowRecipientRoot(row);
  const city = String(rec.cityName ?? rec.city ?? "").trim();
  const dist = String(rec.districtName ?? rec.district ?? rec.ilce ?? "").trim();
  let mahalle = String(rec.neighborhood ?? rec.mahalle ?? "").trim();
  if (!mahalle) {
    const a1 = String(rec.address1 ?? "").trim();
    if (a1) mahalle = (a1.split(",")[0]?.trim() || a1).slice(0, 100);
  }
  const parts = [city, dist, mahalle].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

function pickNestedOrder(obj: Record<string, unknown>): Record<string, unknown> | null {
  const o = obj.order;
  if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
  return null;
}

function geliverParseTimeMs(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = v;
    return n > 1e12 ? Math.floor(n) : Math.floor(n * 1000);
  }
  const s = String(v).trim();
  if (!s) return 0;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : 0;
}

/** Tekliflerin hazır olduğu zamana yakın sıralama için zaman damgası (Geliver alan adları değişebilir). */
function geliverShipmentOfferReceivedMs(row: Record<string, unknown>): number {
  const root =
    row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : row;
  for (const k of [
    "offersReceivedAt",
    "offerReceivedAt",
    "offersCompletedAt",
    "lastOfferAt",
    "updatedAt",
    "updated_at",
    "modifiedAt",
    "createdAt",
    "created_at",
  ]) {
    const t = geliverParseTimeMs(root[k]);
    if (t) return t;
  }
  const pct = root.percentageCompleted;
  if (pct && typeof pct === "object" && !Array.isArray(pct)) {
    const p = pct as Record<string, unknown>;
    const t = geliverParseTimeMs(p.completedAt ?? p.updatedAt ?? p.lastUpdated);
    if (t) return t;
  }
  const off = root.offers;
  if (off && typeof off === "object" && !Array.isArray(off)) {
    const ov = off as Record<string, unknown>;
    for (const slot of [ov.cheapest, ov.Cheapest, ov.fastest, ov.Fastest]) {
      if (slot && typeof slot === "object" && !Array.isArray(slot)) {
        const t = geliverParseTimeMs((slot as Record<string, unknown>).updatedAt ?? (slot as Record<string, unknown>).createdAt);
        if (t) return t;
      }
    }
    const list = ov.list ?? ov.List;
    if (Array.isArray(list)) {
      let max = 0;
      for (const item of list) {
        if (item && typeof item === "object") {
          const it = item as Record<string, unknown>;
          max = Math.max(max, geliverParseTimeMs(it.updatedAt ?? it.createdAt));
        }
      }
      if (max) return max;
    }
  }
  return 0;
}

function sortGeliverShipmentListRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return [...rows].sort((a, b) => geliverShipmentOfferReceivedMs(b) - geliverShipmentOfferReceivedMs(a));
}

function formatGeliverTrDateTime(ms: number): string {
  if (!ms) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(ms));
  } catch {
    return "—";
  }
}

/** Geliver organizations.getBalance yanıtı için kısa özet (panelde bakiye satırı). */
function summarizeGeliverBalance(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (typeof raw !== "object") return String(raw);
  const o = raw as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const hit = Object.entries(o).find(([ek]) => ek.toLowerCase() === k.toLowerCase());
      if (hit && hit[1] != null && String(hit[1]).trim() !== "") return String(hit[1]).trim();
    }
    return "";
  };
  const bal = pick("balance", "availableBalance", "amount", "credit", "walletBalance");
  const debt = pick("debt", "totalDebt", "borc", "borç");
  const parts: string[] = [];
  if (bal) parts.push(`Bakiye: ${bal} ₺`);
  if (debt) parts.push(`Borç: ${debt} ₺`);
  return parts.length ? parts.join(" · ") : null;
}

type GeliverPriceRow = {
  key: string;
  provider: string;
  serviceCode: string;
  transport: string;
  amount: string;
  vat: string;
  total: string;
  currency: string;
};

/** Geliver `prices.listPrices` yanıtı — `offers` kökte veya `pricelist.offers` içinde. */
function parseGeliverPriceList(raw: unknown): {
  meta: { desi?: string; ok?: boolean; message?: string };
  rows: GeliverPriceRow[];
} {
  const empty = { meta: {} as { desi?: string; ok?: boolean; message?: string }, rows: [] as GeliverPriceRow[] };
  if (raw == null || typeof raw !== "object") return empty;
  const root = raw as Record<string, unknown>;
  const meta: { desi?: string; ok?: boolean; message?: string } = {};
  if (typeof root.result === "boolean") meta.ok = root.result;
  if (typeof root.additionalMessage === "string") meta.message = root.additionalMessage;

  let offers: unknown[] = [];
  if (Array.isArray(root.offers)) offers = root.offers;
  if (!offers.length && root.data && typeof root.data === "object") {
    const d = root.data as Record<string, unknown>;
    if (Array.isArray(d.offers)) offers = d.offers;
  }
  if (root.pricelist && typeof root.pricelist === "object") {
    const pl = root.pricelist as Record<string, unknown>;
    if (pl.desi != null && pl.desi !== "") meta.desi = String(pl.desi);
    if (!offers.length && Array.isArray(pl.offers)) offers = pl.offers;
  }

  const rows: GeliverPriceRow[] = offers.map((o, i) => {
    const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
    const provider = String(r.provider ?? r.Provider ?? r.providerName ?? r.name ?? "—").trim() || "—";
    const serviceCode = String(
      r.providerServiceCode ?? r.serviceCode ?? r.code ?? r.productCode ?? "",
    ).trim() || "—";
    const transport = String(
      r.transportType ?? r.TransportType ?? r.transport ?? r.scope ?? r.shipmentType ?? "",
    ).trim();
    const amount = String(r.amount ?? r.Amount ?? r.price ?? "—").trim();
    const vat = String(r.amountVat ?? r.vatAmount ?? r.VAT ?? "").trim();
    const total = String(r.totalAmount ?? r.total ?? r.amountWithVat ?? "").trim();
    const currency = String(r.currency ?? r.Currency ?? "₺").trim() || "₺";
    return {
      key: `${i}-${provider}-${serviceCode}`,
      provider,
      serviceCode,
      transport,
      amount,
      vat,
      total,
      currency,
    };
  });
  return { meta, rows };
}

const TYPE_LABELS: Record<string, string> = {
  siparis: "Sipariş İşletmesi", delivery: "Sipariş İşletmesi",
  alisveris: "Alışveriş Mağazası", ecommerce: "Alışveriş Mağazası",
  hizmet: "Hizmet Sağlayıcı",
  turizm: "Turizm İşletmesi",
};
const SUBTYPE_LABELS: Record<string, string> = {
  restoran: "Restoran / Kafe", market: "Market / Bakkal", bitkisel: "Bitkisel Ürünler Mağazası", eczane: "Eczane",
  cicekci: "Çiçekçi", giyim: "Giyim / Tekstil", elektronik: "Elektronik",
  kitap: "Kitap / Kırtasiye", ev: "Ev & Yaşam", spor: "Spor",
  kozmetik: "Kozmetik / Güzellik", cekici: "Çekici / Yol Yardım",
  nakliyeci: "Nakliyeci", oto_galeri: "Oto Galeri",
  kurs: "Kurs / Eğitim", tadilat: "Tadilat / Tamir", temizlik: "Temizlik",
  boya: "Boya / Badana", guzellik: "Güzellik Salonu", saglik: "Sağlık",
  ikinci_el: "2. El Eşya", is_makinesi: "İş Makineleri", telefon: "Telefon / GSM",
  beyaz_esya: "Beyaz Eşya", hayvan: "Hayvanlar / Pet", diger: "Diğer",
  otel: "🏨 Otel", arac: "🚗 Rent a Car", villa: "🏡 Villa & Ev Kiralama",
  tur: "🗺️ Tur Operatörü", yat: "⛵ Yat & Tekne",
};

type GeliverHub =
  | "addresses"
  | "compose"
  | "shipments"
  | "prices"
  | "templates"
  | "accounts"
  | "docs";

/* ─── Interfaces ─────────────────────────────────────────── */
interface Vendor {
  id: number; name: string; slug: string;
  vendor_type: string; provider_type: string; provider_subtype: string;
  application_status: string; rejection_reason: string | null;
  owner_name: string | null; owner_email: string | null;
  phone: string | null; email: string | null;
  address: string | null; city: string | null; district: string | null;
  description: string | null; whatsapp: string | null;
  active: boolean; rating: number; review_count: number;
  order_count: number; product_count: number; pending_orders: number;
  image_url: string | null; cover_url: string | null;
  verified_at: string | null; created_at: string;
  notes?: string | null;
  callmebot_key?: string | null;
  revenue_model?: string | null;
  commission_rate_pct?: string | number | null;
  payout_bank_holder?: string | null;
  payout_bank_iban?: string | null;
  payout_bank_branch?: string | null;
  geliver_api_token_masked?: string | null;
  geliver_sender_zip?: string | null;
  geliver_sender_mahalle?: string | null;
  geliver_sender_address_id?: string | null;
  geliver_organization_id?: string | null;
  geliver_auto_ship_on_order?: boolean | null;
  paytr_merchant_id_masked?: string | null;
  paytr_configured?: boolean;
  iyzico_configured?: boolean;
  preferred_tr_gateway?: string | null;
  paytr_test_mode?: boolean;
  iyzico_sandbox?: boolean;
  /** Harita / Keşfet işletme kaydı (uuid); vitrin Keşfet URL'si için */
  linked_map_business_id?: string | null;
  theme_key?: string | null;
  theme_config?: Record<string, unknown> | null;
  custom_domains?: Array<{ domain?: string | null; status?: string | null; verified_at?: string | null }>;
}
interface MenuCategory { id: number; name: string; position: number; is_custom?: boolean; ecommerce_category_id?: number | null; }
interface MenuItem {
  id: number; name: string; description: string | null;
  price: string | null; sale_price: string | null;
  image_url: string | null; active: boolean;
  is_popular: boolean; is_vegan: boolean; is_spicy: boolean;
  stock: number | null; menu_category_id: number | null; category_name: string | null;
  ecommerce_category_id?: number | null;
}
interface ProductOptionForm {
  id?: number;
  name: string;
  choicesText: string;
  required: boolean;
  multiple: boolean;
}
interface ProductForm {
  name: string; price: string; salePrice: string; description: string; imageUrl: string;
  menuCategoryId: string; ecommerceCategoryId: string; customCategoryName: string; useCustomCategory: boolean;
  isPopular: boolean; isVegan: boolean; isSpicy: boolean; stock: string;
}
const EMPTY_PRODUCT: ProductForm = {
  name: "", price: "", salePrice: "", description: "", imageUrl: "",
  menuCategoryId: "", ecommerceCategoryId: "", customCategoryName: "", useCustomCategory: false,
  isPopular: false, isVegan: false, isSpicy: false, stock: "",
};
interface OrderItem { name: string; qty: number; price: string | number; }
interface Order {
  id: number; order_number: string;
  customer_name: string; customer_phone: string;
  customer_address: string;   customer_city: string | null; customer_district: string | null;
  customer_postal_code?: string | null;
  customer_email?: string | null;
  vendor_note?: string | null;
  subtotal: string; delivery_fee: string; total: string; status: string;
  payment_method: string | null; payment_status: string | null;
  notes: string | null; items: string | null;
  driver_name: string | null; driver_phone: string | null; estimated_time: number | null;
  assigned_usta_id: number | null; usta_name: string | null;
  assigned_servis_id: number | null; servis_name: string | null;
  order_source: string | null; created_by_staff: string | null;
  platform_commission_amount?: string | number | null;
  commission_base_amount?: string | number | null;
  commission_rate_pct_snapshot?: string | number | null;
  revenue_model_snapshot?: string | null;
  geliver_shipment_id?: string | null;
  geliver_tracking_number?: string | null;
  geliver_label_url?: string | null;
  geliver_transaction_id?: string | null;
  geliver_status?: string | null;
  geliver_last_error?: string | null;
  created_at: string; updated_at: string;
}
type EcommerceReadinessItem = {
  label: string;
  done: boolean;
  action: string;
  tab: string;
};

/* ─── POS Module Interfaces ─────────────────────────────── */
interface Expense {
  id: string; type: "income" | "expense";
  category: string; description: string; amount: number; date: string;
}
interface RepairTicket {
  id: string; customerName: string; customerPhone: string;
  deviceType: string; deviceBrand: string; deviceModel: string;
  problem: string; estimatedCost: number; actualCost: number;
  depositPaid: number; status: "received" | "diagnosing" | "repairing" | "waiting_parts" | "ready" | "delivered" | "cancelled";
  notes: string; createdAt: string; deliveryDate: string;
}
interface Employee {
  id: string; name: string; role: string; phone: string;
  salary: number; startDate: string; status: "active" | "inactive";
}
interface Asset {
  id: string; name: string; category: string; serialNo: string;
  purchasePrice: number; purchaseDate: string;
  condition: "yeni" | "iyi" | "orta" | "kötü"; location: string; notes: string;
}
interface Task {
  id: string; title: string; description: string;
  assignee: string; dueDate: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "doing" | "done";
  createdAt: string;
}
interface CrmNote { tag: "vip" | "regular" | "new" | "problematic" | ""; note: string; lastUpdated: string; }

/* ─── localStorage helpers ─────────────────────────────── */
function lsKey(vendorId: number, module: string) { return `gpos_${vendorId}_${module}`; }
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, data: unknown) { try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* noop */ } }

/* ─── Glass UI helpers ──────────────────────────────────── */
function GlassInput({ label, value, onChange, placeholder, type = "text", disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-gray-900 text-xs font-semibold mb-1.5 tracking-wide">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300 transition disabled:opacity-50"
      />
    </div>
  );
}
function GlassTextarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-gray-900 text-xs font-semibold mb-1.5 tracking-wide">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300 transition resize-none"
      />
    </div>
  );
}
function GlassSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-gray-900 text-xs font-semibold mb-1.5 tracking-wide">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300 transition"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function StatusCard({ vendor }: { vendor: Vendor }) {
  const isPending = vendor.application_status === "pending";
  const isApproved = vendor.application_status === "approved";
  const isRejected = vendor.application_status === "rejected";
  return (
    <div className={`rounded-2xl p-5 border ${isApproved ? "bg-emerald-50 border-emerald-200" : isPending ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isApproved ? "bg-emerald-100" : isPending ? "bg-amber-100" : "bg-red-100"}`}>
          {isApproved ? "✅" : isPending ? "⏳" : "❌"}
        </div>
        <div>
          <div className={`font-bold text-base ${isApproved ? "text-emerald-900" : isPending ? "text-amber-900" : "text-red-900"}`}>
            {isApproved ? "Başvurunuz Onaylandı" : isPending ? "İnceleme Bekliyor" : "Başvuru Reddedildi"}
          </div>
          <div className="text-gray-800 text-xs">
            {isApproved ? `Onay tarihi: ${vendor.verified_at ? new Date(vendor.verified_at).toLocaleDateString("tr-TR") : "—"}` : isPending ? "1–2 iş günü içinde incelenecektir" : "Aşağıdaki sebebe göre tekrar başvurabilirsiniz"}
          </div>
        </div>
      </div>
      {isRejected && vendor.rejection_reason && (
        <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-xl text-red-900 text-sm">
          <span className="font-semibold">Red sebebi: </span>{vendor.rejection_reason}
        </div>
      )}
      {isPending && <div className="mt-3 text-gray-800 text-xs">Başvurunuz değerlendirildikten sonra kayıt e-postanıza bilgi gönderilecektir.</div>}
    </div>
  );
}

/* ─── Turizm Vendor Tabs ──────────────────────────────── */
const TOURISM_TYPE_MAP: Record<string,string> = { otel:"hotel", arac:"car", villa:"villa", tur:"tour", yat:"boat" };
const TOURISM_TYPE_LABELS: Record<string,string> = { hotel:"🏨 Otel", car:"🚗 Rent a Car", villa:"🏡 Villa & Ev", tour:"🗺️ Tur", boat:"⛵ Yat & Tekne" };
const TOURISM_SUBTYPE_ICONS: Record<string,string> = { hotel:"🏨", car:"🚗", villa:"🏡", tour:"🗺️", boat:"⛵" };

interface TurizmListing { id:number; type:string; title:string; slug:string; city:string|null; price:string; price_unit:string; status:string; booking_count:number; star_rating:number|null; capacity:number|null; }
interface TurizmRoom { id:number; listing_id:number; name:string; description:string|null; beds:number; adults:number; children:number; size_sqm:number|null; price:number|null; count:number; image_url:string|null; status:string; }
interface TurizmBookingV { id:number; booking_ref:string; listing_title:string; listing_type:string; customer_name:string; customer_phone:string; check_in:string|null; check_out:string|null; guests:number; total_price:string; status:string; created_at:string; }

const EMPTY_LISTING_FORM = { type:"hotel", title:"", description:"", city:"", district:"", mahalle:"", address:"", price:"", salePrice:"", capacity:"", starRating:"", imageUrl:"", features_brand:"", features_fuel:"", features_transmission:"", features_year:"" };
const EMPTY_ROOM_FORM = { name:"", description:"", beds:"1", adults:"2", children:"0", sizeSqm:"", price:"", count:"1", imageUrl:"" };

/* ── Oda Yönetim Paneli (sadece otel ilanları için) ── */
function TurizmOdaPanel({ listing, authHeaders, flash }: { listing:TurizmListing; authHeaders:Record<string,string>; flash:(t:"ok"|"err",m:string)=>void }) {
  const [rooms, setRooms] = useState<TurizmRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomModal, setRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({...EMPTY_ROOM_FORM});
  const [savingRoom, setSavingRoom] = useState(false);

  const loadRooms = async () => {
    setLoadingRooms(true);
    const r = await fetch(`/api/tourism/vendor/listings/${listing.id}/rooms`, { headers: authHeaders }).then(x=>x.json()).catch(()=>[]);
    setRooms(Array.isArray(r) ? r.filter((x:TurizmRoom)=>x.status!=="deleted") : []);
    setLoadingRooms(false);
  };
  useEffect(() => { void loadRooms(); }, [listing.id]);

  const saveRoom = async () => {
    if (!roomForm.name || !roomForm.price) { flash("err","Oda adı ve fiyat zorunlu"); return; }
    setSavingRoom(true);
    const payload = { name:roomForm.name, description:roomForm.description||null, beds:Number(roomForm.beds)||1, adults:Number(roomForm.adults)||2, children:Number(roomForm.children)||0, sizeSqm:roomForm.sizeSqm?Number(roomForm.sizeSqm):null, price:Number(roomForm.price), count:Number(roomForm.count)||1, imageUrl:roomForm.imageUrl||null };
    const r = await fetch(`/api/tourism/vendor/listings/${listing.id}/rooms`, { method:"POST", headers:{...authHeaders,"Content-Type":"application/json"}, body:JSON.stringify(payload) }).then(x=>x.json()).catch(()=>({error:"Hata"}));
    setSavingRoom(false);
    if (r.error) { flash("err",r.error); return; }
    flash("ok","Oda eklendi");
    setRoomModal(false); setRoomForm({...EMPTY_ROOM_FORM});
    void loadRooms();
  };

  const delRoom = async (id:number) => {
    if (!confirm("Bu odayı silmek istiyor musunuz?")) return;
    await fetch(`/api/tourism/vendor/rooms/${id}`, { method:"DELETE", headers:authHeaders });
    flash("ok","Oda silindi"); void loadRooms();
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-xs font-semibold uppercase tracking-wide">🛏 Odalar ({rooms.length})</span>
        <button onClick={()=>{ setRoomForm({...EMPTY_ROOM_FORM}); setRoomModal(true); }}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">+ Oda Ekle</button>
      </div>
      {loadingRooms ? <div className="text-gray-400 text-xs py-2">Yükleniyor...</div> :
        rooms.length === 0 ? (
          <div className="text-gray-400 text-xs py-2 text-center">Henüz oda eklenmemiş</div>
        ) : (
          <div className="space-y-1.5">
            {rooms.map(rm => (
              <div key={rm.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 text-xs font-semibold">{rm.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    🛏 {rm.beds} yatak · 👤 {rm.adults} yetişkin{rm.children>0?` + ${rm.children} çocuk`:""} 
                    {rm.size_sqm ? ` · ${rm.size_sqm}m²` : ""} 
                    {rm.price ? ` · ${Number(rm.price).toLocaleString("tr-TR")}₺/gece` : ""}
                    {rm.count > 1 ? ` · ${rm.count} oda` : ""}
                  </div>
                </div>
                <button onClick={()=>delRoom(rm.id)} className="px-2 py-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-800 text-xs rounded-lg transition flex-shrink-0">Sil</button>
              </div>
            ))}
          </div>
        )
      }

      {roomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-gray-900 font-black mb-4">🛏 Yeni Oda Ekle — {listing.title}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-gray-700 text-xs font-semibold mb-1 block">Oda Adı *</label>
                <input value={roomForm.name} onChange={e=>setRoomForm(f=>({...f,name:e.target.value}))}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder:text-gray-400" placeholder="Örn: Standart Oda, Suit, Deniz Manzaralı..." />
              </div>
              <div>
                <label className="text-gray-700 text-xs font-semibold mb-1 block">Açıklama</label>
                <textarea value={roomForm.description} onChange={e=>setRoomForm(f=>({...f,description:e.target.value}))} rows={2}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none placeholder:text-gray-400" placeholder="Oda hakkında kısa açıklama..." />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">Yatak Sayısı</label>
                  <input type="number" min="1" value={roomForm.beds} onChange={e=>setRoomForm(f=>({...f,beds:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">Yetişkin</label>
                  <input type="number" min="1" value={roomForm.adults} onChange={e=>setRoomForm(f=>({...f,adults:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">Çocuk</label>
                  <input type="number" min="0" value={roomForm.children} onChange={e=>setRoomForm(f=>({...f,children:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">Alan (m²)</label>
                  <input type="number" value={roomForm.sizeSqm} onChange={e=>setRoomForm(f=>({...f,sizeSqm:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder:text-gray-400" placeholder="25" />
                </div>
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">Fiyat (₺/gece) *</label>
                  <input type="number" value={roomForm.price} onChange={e=>setRoomForm(f=>({...f,price:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder:text-gray-400" placeholder="0" />
                </div>
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">Adet</label>
                  <input type="number" min="1" value={roomForm.count} onChange={e=>setRoomForm(f=>({...f,count:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-700 text-xs font-semibold mb-1 block">Görsel URL</label>
                <input value={roomForm.imageUrl} onChange={e=>setRoomForm(f=>({...f,imageUrl:e.target.value}))}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder:text-gray-400" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={()=>setRoomModal(false)} className="flex-1 py-2 border border-gray-300 text-gray-800 rounded-lg text-sm hover:bg-gray-50 transition">İptal</button>
              <button onClick={saveRoom} disabled={savingRoom}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition disabled:opacity-50">
                {savingRoom?"Kaydediliyor...":"Oda Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TurizmIlanlarTab({ vendorId, authHeaders, flash, vendorSubtype }: { vendorId:number; authHeaders:Record<string,string>; flash:(t:"ok"|"err", m:string)=>void; vendorSubtype?:string }) {
  const { data: siteSettings } = useGetSiteSettings();
  const [listings, setListings] = useState<TurizmListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add"|"edit"|null>(null);
  const [form, setForm] = useState({ ...EMPTY_LISTING_FORM });
  const [editId, setEditId] = useState<number|null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number|null>(null);

  const defaultType = vendorSubtype ? (TOURISM_TYPE_MAP[vendorSubtype] || "hotel") : "hotel";

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/tourism/vendor/listings", { headers: authHeaders }).then(x=>x.json()).catch(()=>[]);
    setListings(Array.isArray(r) ? r : []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.title || !form.price) { flash("err","Başlık ve fiyat zorunlu"); return; }
    setSaving(true);
    const features: Record<string,string> = {};
    if (form.type==="car") { if (form.features_brand) features.brand=form.features_brand; if (form.features_fuel) features.fuel=form.features_fuel; if (form.features_transmission) features.transmission=form.features_transmission; if (form.features_year) features.year=form.features_year; }
    const mh = String(form.mahalle || "").trim();
    const addrLine = String(form.address || "").trim();
    const mergedAddr = mh ? (addrLine ? `${mh}, ${addrLine}` : mh) : addrLine || null;
    const payload = {
      type: form.type, title: form.title, description: form.description || null,
      city: form.city || null, district: form.district || null, address: mergedAddr,
      price: Number(form.price), salePrice: form.salePrice ? Number(form.salePrice) : null,
      capacity: form.capacity ? Number(form.capacity) : null, starRating: form.starRating ? Number(form.starRating) : null,
      imageUrl: form.imageUrl || null, features,
    };
    const url = editId ? `/api/tourism/vendor/listings/${editId}` : "/api/tourism/vendor/listings";
    const method = editId ? "PUT" : "POST";
    const r = await fetch(url, { method, headers:{...authHeaders,"Content-Type":"application/json"}, body:JSON.stringify(payload) }).then(x=>x.json()).catch(()=>({error:"Hata"}));
    setSaving(false);
    if (r.error) { flash("err",r.error); return; }
    flash("ok", editId?"İlan güncellendi":"İlan oluşturuldu");
    setModal(null); setForm({...EMPTY_LISTING_FORM, type:defaultType}); setEditId(null);
    void load();
  };

  const del = async (id:number) => {
    if (!confirm("Bu ilanı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/tourism/vendor/listings/${id}`, { method:"DELETE", headers:authHeaders });
    flash("ok","İlan silindi"); void load();
    if (expanded===id) setExpanded(null);
  };

  const openEdit = (l:TurizmListing) => {
    setForm({ type:l.type, title:l.title, description:"", city:l.city||"", district:"", mahalle:"", address:"", price:l.price, salePrice:"", capacity:l.capacity?String(l.capacity):"", starRating:l.star_rating?String(l.star_rating):"", imageUrl:"", features_brand:"", features_fuel:"", features_transmission:"", features_year:"" });
    setEditId(l.id); setModal("edit");
  };

  const toggleExpand = (id:number) => setExpanded(p => p===id ? null : id);

  const typeIcon = (t:string) => TOURISM_SUBTYPE_ICONS[t] || "✈️";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900 font-bold">✈️ Turizm İlanlarım ({listings.length})</h3>
        <button onClick={()=>{ setForm({...EMPTY_LISTING_FORM, type:defaultType}); setEditId(null); setModal("add"); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-300 bg-gradient-to-b from-cyan-50 to-white text-gray-900 shadow-sm ring-2 ring-cyan-500/15 hover:from-cyan-100/80 transition">+ Yeni İlan</button>
      </div>

      {/* Subtype info banner */}
      {vendorSubtype && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-2.5 text-cyan-900 text-xs">
          <span className="font-bold">{TOURISM_SUBTYPE_ICONS[TOURISM_TYPE_MAP[vendorSubtype]||""] || "✈️"} {["otel","Otel","arac","Rent a Car","villa","Villa","tur","Tur","yat","Yat"][["otel","arac","villa","tur","yat"].indexOf(vendorSubtype)*2+1] || vendorSubtype} işletmesi</span> olarak kayıtlısınız.
          {vendorSubtype==="otel" && " Her otele oda tipleri ekleyebilirsiniz."}
          {vendorSubtype==="arac" && " Her araç için ayrı ilan oluşturun."}
          {vendorSubtype==="villa" && " Portföyünüzdeki villa ve evleri ekleyin."}
          {vendorSubtype==="tur" && " Sunduğunuz tur paketlerini ekleyin."}
          {vendorSubtype==="yat" && " Yat ve teknelerinizi ekleyin."}
        </div>
      )}

      {loading ? <div className="text-gray-500 text-center py-8">Yükleniyor...</div> : listings.length===0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">{typeIcon(defaultType)}</div>
          <p className="text-gray-600 text-sm">Henüz ilan eklenmemiş</p>
          <button onClick={()=>{ setForm({...EMPTY_LISTING_FORM,type:defaultType}); setModal("add"); }} className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold border border-cyan-300 bg-gradient-to-b from-cyan-50 to-white text-gray-900 shadow-sm ring-2 ring-cyan-500/15 hover:from-cyan-100/80 transition">İlk İlanı Ekle</button>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map(l => (
            <div key={l.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Listing Row */}
              <div className="p-4 flex items-center gap-3">
                <button type="button" onClick={()=>toggleExpand(l.id)} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 text-lg">
                  {expanded===l.id ? "▼" : "▶"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm truncate">{l.title}</span>
                    <span className="text-gray-500 text-xs">{TOURISM_TYPE_LABELS[l.type]||l.type}</span>
                    {l.star_rating && <span className="text-amber-600 text-xs">{"⭐".repeat(l.star_rating)}</span>}
                  </div>
                  <div className="text-gray-600 text-xs mt-0.5">
                    {l.city && `📍 ${l.city} · `}{parseFloat(l.price).toLocaleString("tr-TR")}₺/{l.price_unit}
                    {l.capacity ? ` · ${l.capacity} kişi` : ""}
                    {" · "}<span className={l.status==="active"?"text-emerald-700 font-medium":"text-red-700 font-medium"}>{l.status==="active"?"Aktif":"Pasif"}</span>
                    {" · "}{l.booking_count} rezervasyon
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a href={`/turizm/${l.type}/${l.slug}`} target="_blank" rel="noopener noreferrer"
                    className="px-2 py-1 border border-gray-200 bg-gray-50 hover:bg-white text-gray-800 text-xs rounded-lg transition">Gör</a>
                  <button type="button" onClick={()=>openEdit(l)} className="px-2 py-1 border border-gray-200 bg-gray-50 hover:bg-white text-gray-800 text-xs rounded-lg transition">Düzenle</button>
                  <button type="button" onClick={()=>del(l.id)} className="px-2 py-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-800 text-xs rounded-lg transition">Sil</button>
                </div>
              </div>

              {/* Expanded: sub-products */}
              {expanded===l.id && (
                <div className="px-4 pb-4">
                  {l.type==="hotel" && (
                    <TurizmOdaPanel listing={l} authHeaders={authHeaders} flash={flash} />
                  )}
                  {l.type==="car" && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600 text-xs">🚗 Bu araç için rezervasyon alınmaktadır. Araç detaylarını düzenlemek için "Düzenle" butonunu kullanın.</p>
                    </div>
                  )}
                  {l.type==="villa" && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600 text-xs">🏡 Bu villa/ev için rezervasyon alınmaktadır. Detayları düzenlemek için "Düzenle" butonunu kullanın.</p>
                    </div>
                  )}
                  {l.type==="tour" && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600 text-xs">🗺️ Bu tur için kişi başı rezervasyon alınmaktadır. Detayları düzenlemek için "Düzenle" butonunu kullanın.</p>
                    </div>
                  )}
                  {l.type==="boat" && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600 text-xs">⛵ Bu yat/tekne için günlük/kişi başı rezervasyon alınmaktadır. Detayları düzenlemek için "Düzenle" butonunu kullanın.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-gray-900 font-black mb-4">{modal==="add"?"Yeni Turizm İlanı":"İlanı Düzenle"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-gray-700 text-xs font-semibold mb-1 block">Tür *</label>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500">
                  {Object.entries(TOURISM_TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-700 text-xs font-semibold mb-1 block">Başlık *</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 placeholder:text-gray-400"
                  placeholder={form.type==="hotel"?"Örn: Grand Hotel İstanbul":form.type==="car"?"Örn: Toyota Corolla 2023":form.type==="villa"?"Örn: Bodrum Sonsuzluk Havuzlu Villa":form.type==="tour"?"Örn: Kapadokya Balon Turu":"Örn: 24m Gulet Mavi Yolculuk"} />
              </div>
              <div>
                <label className="text-gray-700 text-xs font-semibold mb-1 block">Açıklama</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 placeholder:text-gray-400 resize-none" placeholder="İlan açıklaması..." />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <LocationPickerGooglePrimary
                  mapsSettings={siteSettings ?? null}
                  variant="light"
                  compactGoogle
                  googleLabel="1) Konum araması"
                  value={{ city: form.city, district: form.district, mahalle: form.mahalle }}
                  onChange={(v) => setForm((f) => ({ ...f, city: v.city, district: v.district, mahalle: v.mahalle }))}
                  showSokak={false}
                  onGooglePick={(r) =>
                    setForm((f) => ({
                      ...f,
                      address: (f.address || "").trim() ? f.address : r.addressLine,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">
                    {form.type==="hotel"?"Gecelik Fiyat (₺)":form.type==="car"?"Günlük Fiyat (₺)":form.type==="tour"||form.type==="boat"?"Kişi Başı Fiyat (₺)":"Gecelik Fiyat (₺)"} *
                  </label>
                  <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 placeholder:text-gray-400" placeholder="0" />
                </div>
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">İndirimli Fiyat (₺)</label>
                  <input type="number" value={form.salePrice} onChange={e=>setForm(f=>({...f,salePrice:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 placeholder:text-gray-400" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-700 text-xs font-semibold mb-1 block">
                    {form.type==="boat"?"Kapasite (kişi)":form.type==="car"?"Koltuk Sayısı":form.type==="tour"?"Maks. Grup Büyüklüğü":"Kapasite (kişi)"}
                  </label>
                  <input type="number" value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:e.target.value}))}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 placeholder:text-gray-400" placeholder="2" />
                </div>
                {form.type==="hotel" && (
                  <div>
                    <label className="text-gray-700 text-xs font-semibold mb-1 block">Yıldız (1-5)</label>
                    <input type="number" min="1" max="5" value={form.starRating} onChange={e=>setForm(f=>({...f,starRating:e.target.value}))}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 placeholder:text-gray-400" placeholder="4" />
                  </div>
                )}
              </div>

              {/* Araç özellikleri */}
              {form.type==="car" && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="text-gray-800 text-xs font-semibold mb-1">🚗 Araç Özellikleri</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-600 text-xs mb-1 block">Marka / Model</label>
                      <input value={form.features_brand} onChange={e=>setForm(f=>({...f,features_brand:e.target.value}))}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-cyan-500 placeholder:text-gray-400" placeholder="Toyota Corolla" />
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs mb-1 block">Yıl</label>
                      <input value={form.features_year} onChange={e=>setForm(f=>({...f,features_year:e.target.value}))}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-cyan-500 placeholder:text-gray-400" placeholder="2024" />
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs mb-1 block">Yakıt</label>
                      <select value={form.features_fuel} onChange={e=>setForm(f=>({...f,features_fuel:e.target.value}))}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs outline-none">
                        <option value="">Seçin</option>
                        <option value="benzin">Benzin</option>
                        <option value="dizel">Dizel</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="elektrik">Elektrik</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs mb-1 block">Vites</label>
                      <select value={form.features_transmission} onChange={e=>setForm(f=>({...f,features_transmission:e.target.value}))}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs outline-none">
                        <option value="">Seçin</option>
                        <option value="otomatik">Otomatik</option>
                        <option value="manuel">Manuel</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-gray-700 text-xs font-semibold mb-1 block">Kapak Görseli URL</label>
                <input value={form.imageUrl} onChange={e=>setForm(f=>({...f,imageUrl:e.target.value}))}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 placeholder:text-gray-400" placeholder="https://..." />
              </div>

              {modal==="add" && form.type==="hotel" && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-900 text-xs">
                  💡 Otel ilanı oluşturduktan sonra "Odalar" bölümünden oda tiplerini ekleyebilirsiniz.
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={()=>{ setModal(null); setForm({...EMPTY_LISTING_FORM,type:defaultType}); setEditId(null); }}
                className="flex-1 py-2 border border-gray-300 text-gray-800 rounded-lg text-sm hover:bg-gray-50 transition">İptal</button>
              <button type="button" onClick={save} disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-cyan-300 bg-gradient-to-b from-cyan-50 to-white text-gray-900 shadow-sm ring-2 ring-cyan-500/15 hover:from-cyan-100/80 transition disabled:opacity-50">
                {saving?"Kaydediliyor...":modal==="add"?"İlan Oluştur":"Güncelle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TurizmRezervasyonTab({ vendorId, authHeaders, flash }: { vendorId:number; authHeaders:Record<string,string>; flash:(t:"ok"|"err", m:string)=>void }) {
  const [bookings, setBookings] = useState<TurizmBookingV[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/tourism/vendor/bookings", { headers: authHeaders }).then(x=>x.json()).catch(()=>[]);
    setBookings(Array.isArray(r) ? r : []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const updateStatus = async (id:number, status:string) => {
    await fetch(`/api/tourism/vendor/bookings/${id}`, { method:"PATCH", headers:{...authHeaders,"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    flash("ok","Durum güncellendi"); void load();
  };

  const STATUS_LABELS: Record<string,string> = { pending:"⏳ Bekliyor", confirmed:"✅ Onaylandı", cancelled:"❌ İptal", completed:"🏁 Tamamlandı" };
  const STATUS_COLORS: Record<string,string> = { pending:"text-amber-700", confirmed:"text-emerald-700", cancelled:"text-red-700", completed:"text-blue-700" };

  const filtered = statusFilter==="all" ? bookings : bookings.filter(b=>b.status===statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-gray-900 font-bold">📅 Rezervasyonlarım ({bookings.length})</h3>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100/90 border border-gray-200">
          {["all","pending","confirmed","completed","cancelled"].map(s => (
            <button type="button" key={s} onClick={()=>setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-tight border transition shadow-sm ${
                statusFilter===s
                  ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 ring-2 ring-indigo-500/25"
                  : "border-transparent bg-transparent text-gray-700 hover:bg-white/80"
              }`}>
              {s==="all"?"Tümü":STATUS_LABELS[s]?.replace(/^[^ ]+ /,"")||s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="text-gray-500 text-center py-8">Yükleniyor...</div> : filtered.length===0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-gray-600 text-sm">Rezervasyon bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-900 font-semibold text-sm">{b.customer_name}</span>
                    <span className="text-gray-500 font-mono text-xs">{b.booking_ref}</span>
                    <span className={`text-xs font-medium ${STATUS_COLORS[b.status]||"text-gray-600"}`}>{STATUS_LABELS[b.status]||b.status}</span>
                  </div>
                  <div className="text-gray-600 text-xs mt-0.5">{b.listing_title}</div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    📞 {b.customer_phone}
                    {b.check_in && <> · 📅 {b.check_in}{b.check_out?` — ${b.check_out}`:""}</>}
                    · 👥 {b.guests} kişi
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-gray-900 font-black">{parseFloat(b.total_price).toLocaleString("tr-TR")}₺</div>
                  <div className="text-gray-500 text-xs">{new Date(b.created_at).toLocaleDateString("tr-TR")}</div>
                </div>
              </div>
              {b.status==="pending" && (
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={()=>updateStatus(b.id,"confirmed")}
                    className="px-3 py-1 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-medium rounded-lg transition">✅ Onayla</button>
                  <button type="button" onClick={()=>updateStatus(b.id,"cancelled")}
                    className="px-3 py-1 border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-medium rounded-lg transition">❌ İptal Et</button>
                </div>
              )}
              {b.status==="confirmed" && (
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={()=>updateStatus(b.id,"completed")}
                    className="px-3 py-1 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-medium rounded-lg transition">🏁 Tamamlandı</button>
                  <button type="button" onClick={()=>updateStatus(b.id,"cancelled")}
                    className="px-3 py-1 border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-medium rounded-lg transition">❌ İptal Et</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function ServisSaglayiciPaneli() {
  const [, navigate] = useLocation();
  const { data: siteSettings } = useGetSiteSettings();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("anasayfa");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Profil */
  const [profil, setProfil] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    mahalle: "",
    description: "",
    whatsapp: "",
    callmebotKey: "",
    imageUrl: "",
    coverUrl: "",
    contactEmail: "",
    ownerEmail: "",
  });
  const [manualShip, setManualShip] = useState({
    recipientName: "",
    phone: "",
    address1: "",
    city: "",
    district: "",
    mahalle: "",
    zip: "",
    email: "",
    lengthCm: "20",
    widthCm: "15",
    heightCm: "10",
    weightKg: "1",
    reference: "",
  });
  const [manualShipBusy, setManualShipBusy] = useState(false);
  const [manualGeliverError, setManualGeliverError] = useState<string | null>(null);
  const geliverVolumeDesiPreview = useMemo(() => {
    const parseDim = (s: string) => {
      const n = parseFloat(String(s).replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const l = parseDim(manualShip.lengthCm);
    const w = parseDim(manualShip.widthCm);
    const h = parseDim(manualShip.heightCm);
    const kgRaw = parseFloat(String(manualShip.weightKg).replace(",", "."));
    const kg = Number.isFinite(kgRaw) && kgRaw > 0 ? kgRaw : 0;
    if (!l || !w || !h) return null;
    const desi = (l * w * h) / 3000;
    return { desi, kg };
  }, [manualShip.lengthCm, manualShip.widthCm, manualShip.heightCm, manualShip.weightKg]);
  const [geliverDraft, setGeliverDraft] = useState<{ id: string; shipment: Record<string, unknown> } | null>(null);
  /** shipmentId → offerId; Geliver'de «Etiket Al» öncesi hangi teklifle gideceğinizi bu tarayıcıda hatırlatır. */
  const [geliverPinnedOfferMap, setGeliverPinnedOfferMap] = useState<Record<string, string>>({});
  const [geliverOfferBusy, setGeliverOfferBusy] = useState(false);
  const [geliverHub, setGeliverHub] = useState<GeliverHub>("compose");
  const [geliverListRows, setGeliverListRows] = useState<Array<Record<string, unknown>>>([]);
  /** Son yüklenen Kargo teklif kayıtları listesinde gönderi id → 1 tabanlı sıra (sipariş kartı notu için). */
  const [geliverShipmentRowIndex, setGeliverShipmentRowIndex] = useState<Record<string, number>>({});
  const [geliverListLoading, setGeliverListLoading] = useState(false);
  const [manualShipResult, setManualShipResult] = useState<{
    shipmentId: string;
    trackingNumber: string | null;
    labelUrl: string | null;
  } | null>(null);
  const [payoutForm, setPayoutForm] = useState({ holder: "", iban: "", branch: "" });
  const [savingPayout, setSavingPayout] = useState(false);
  const [geliverTokenInput, setGeliverTokenInput] = useState("");
  const [geliverZip, setGeliverZip] = useState("");
  const [geliverSenderMahalle, setGeliverSenderMahalle] = useState("");
  const [savingGeliver, setSavingGeliver] = useState(false);
  const [geliverOrgIdInput, setGeliverOrgIdInput] = useState("");
  const [geliverBalanceRaw, setGeliverBalanceRaw] = useState<unknown>(null);
  const [geliverBalanceLoading, setGeliverBalanceLoading] = useState(false);
  /** Sessiz bakiye ön yüklemesi başarısız olunca üst banner yerine bakiye satırında gösterilir. */
  const [geliverBalancePrefetchError, setGeliverBalancePrefetchError] = useState<string | null>(null);
  /** Aynı işletme + org için «Yeni gönderi» sekmesinde bakiyeyi yalnızca bir kez sessiz ön yükle. */
  const lastGeliverBalancePrefetchRef = useRef<string>("");
  const geliverBalanceSummary = useMemo(() => summarizeGeliverBalance(geliverBalanceRaw), [geliverBalanceRaw]);
  const [geliverSenderList, setGeliverSenderList] = useState<Array<Record<string, unknown>>>([]);
  const [geliverSenderLoading, setGeliverSenderLoading] = useState(false);
  const [geliverAddrSearch, setGeliverAddrSearch] = useState("");
  const [newGeliverSender, setNewGeliverSender] = useState({
    name: "",
    email: "",
    phone: "",
    address1: "",
    zip: "",
    shortName: "",
    cityCode: "",
    cityName: "",
    districtName: "",
    districtId: "",
  });
  const [geliverCitiesOpts, setGeliverCitiesOpts] = useState<Array<{ name: string; code: string }>>([]);
  const [geliverDistrictOpts, setGeliverDistrictOpts] = useState<Array<{ name: string; id: string }>>([]);
  const [creatingGeliverSender, setCreatingGeliverSender] = useState(false);
  const [geliverWebhooks, setGeliverWebhooks] = useState<unknown[]>([]);
  const [geliverWebhooksLoading, setGeliverWebhooksLoading] = useState(false);
  const [whNew, setWhNew] = useState({ url: "", type: "" });
  const [whTest, setWhTest] = useState({ url: "", type: "shipment_status_changed" });
  const [priceListRaw, setPriceListRaw] = useState<unknown>(null);
  const geliverPriceListParsed = useMemo(() => parseGeliverPriceList(priceListRaw), [priceListRaw]);
  const [priceListLoading, setPriceListLoading] = useState(false);
  const [geliverTemplates, setGeliverTemplates] = useState<unknown[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [newTpl, setNewTpl] = useState({ name: "", length: "30", width: "20", height: "15", weight: "1" });
  const [geliverProviderAccounts, setGeliverProviderAccounts] = useState<unknown[]>([]);
  const [provLoading, setProvLoading] = useState(false);
  const [newProv, setNewProv] = useState({
    providerCode: "",
    name: "",
    username: "",
    password: "",
    version: "1",
    isPublic: false,
    sharable: false,
    isDynamicPrice: false,
  });

  const [geliverCreatingOrderId, setGeliverCreatingOrderId] = useState<number | null>(null);

  const [trPaytrId, setTrPaytrId] = useState("");
  const [trPaytrKey, setTrPaytrKey] = useState("");
  const [trPaytrSalt, setTrPaytrSalt] = useState("");
  const [trPaytrTest, setTrPaytrTest] = useState(true);
  const [trIyzicoKey, setTrIyzicoKey] = useState("");
  const [trIyzicoSecret, setTrIyzicoSecret] = useState("");
  const [trIyzicoSandbox, setTrIyzicoSandbox] = useState(true);
  const [trPreferred, setTrPreferred] = useState<"" | "paytr" | "iyzico">("");
  const [savingTrGateway, setSavingTrGateway] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subForm, setSubForm] = useState({
    startDate: "",
    endDate: "",
    paymentMethod: "bank_transfer" as "bank_transfer" | "stripe",
    receiptUrl: "",
  });
  const [subReceiptUploading, setSubReceiptUploading] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);

  /* Ürünler & kategoriler */
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [catFilter, setCatFilter] = useState<number | null>(null);
  const [productModal, setProductModal] = useState<"add" | "edit" | null>(null);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [savingProduct, setSavingProduct] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [ecommerceCategoryTree, setEcommerceCategoryTree] = useState<EcommerceCategoryNode[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOptionForm[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(() => new Set());
  const [bulkDeletingProducts, setBulkDeletingProducts] = useState(false);

  /* Siparişler */
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const lastPendingCount = useRef<number>(-1);
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);

  /* Kuryeler */
  interface Courier { id: number; name: string; phone: string; active: boolean; }
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [newCourier, setNewCourier] = useState({ name: "", phone: "", password: "" });
  const [savingCourier, setSavingCourier] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<Record<number, string>>({});
  const [selectedUsta, setSelectedUsta] = useState<Record<number, string>>({});
  const [selectedServis, setSelectedServis] = useState<Record<number, string>>({});

  /* Ekip (Usta & Servis Elemanı) */
  interface StaffMember { id: number; name: string; phone: string; role: "usta" | "servis" | "kasiyer"; active: boolean; created_at: string; }
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", role: "usta", password: "" });
  const [savingStaff, setSavingStaff] = useState(false);
  const [assigningUstaOrderId, setAssigningUstaOrderId] = useState<number | null>(null);
  const [assigningServisOrderId, setAssigningServisOrderId] = useState<number | null>(null);
  /* Staff Chat */
  const [staffChatChannel, setStaffChatChannel] = useState<"vendor-usta" | "vendor-servis">("vendor-usta");
  interface StaffMsg { id: number; sender_type: string; sender_name: string; message: string; created_at: string; }
  const [staffChatMessages, setStaffChatMessages] = useState<StaffMsg[]>([]);
  const [staffChatInput, setStaffChatInput] = useState("");
  const staffChatBottomRef = useRef<HTMLDivElement>(null);

  /* Onay Modalı */
  const [confirmModal, setConfirmModal] = useState<{ orderId: number; orderNum: string; isEcommerce: boolean } | null>(null);
  const [confirmEt, setConfirmEt] = useState<number | "">(30);
  const [confirmNote, setConfirmNote] = useState("");

  /* Mesajlaşma — yeni chat sistemi */
  const [chatOpeningOrderId, setChatOpeningOrderId] = useState<number | null>(null);

  /* ── POS Module State ── */
  /* Kasa */
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [kasaForm, setKasaForm] = useState({ type: "expense", category: "diger", description: "", amount: "" });
  const [kasaFilter, setKasaFilter] = useState<"all" | "income" | "expense">("all");

  /* CRM */
  const [crmNotes, setCrmNotes] = useState<Record<string, CrmNote>>({});
  const [crmSearch, setCrmSearch] = useState("");
  const [crmEditPhone, setCrmEditPhone] = useState<string | null>(null);
  const [crmEditForm, setCrmEditForm] = useState<CrmNote>({ tag: "", note: "", lastUpdated: "" });

  /* Müşteriler (vendor_customers DB) */
  interface VendorCustomer {
    id: number; vendor_id: number;
    first_name: string; last_name: string;
    company_name: string | null; address: string | null;
    phone: string; email: string | null;
    tax_office: string | null; tax_number: string | null;
    notes: string | null; tag: string | null;
    created_at: string;
  }
  const EMPTY_CUST = { first_name: "", last_name: "", company_name: "", address: "", phone: "", email: "", tax_office: "", tax_number: "", notes: "" };
  const [vendorCustomers, setVendorCustomers] = useState<VendorCustomer[]>([]);
  const [newCustomer, setNewCustomer] = useState(EMPTY_CUST);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<VendorCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  /* Repair */
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [repairModal, setRepairModal] = useState<"add" | "edit" | null>(null);
  const [repairFilter, setRepairFilter] = useState<string>("all");
  const EMPTY_REPAIR: RepairTicket = { id: "", customerName: "", customerPhone: "", deviceType: "", deviceBrand: "", deviceModel: "", problem: "", estimatedCost: 0, actualCost: 0, depositPaid: 0, status: "received", notes: "", createdAt: "", deliveryDate: "" };
  const [repairForm, setRepairForm] = useState<RepairTicket>(EMPTY_REPAIR);

  /* Personel */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empModal, setEmpModal] = useState<"add" | "edit" | null>(null);
  const EMPTY_EMP: Employee = { id: "", name: "", role: "", phone: "", salary: 0, startDate: new Date().toISOString().slice(0, 10), status: "active" };
  const [empForm, setEmpForm] = useState<Employee>(EMPTY_EMP);

  /* Demirbaş */
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetModal, setAssetModal] = useState<"add" | "edit" | null>(null);
  const EMPTY_ASSET: Asset = { id: "", name: "", category: "", serialNo: "", purchasePrice: 0, purchaseDate: new Date().toISOString().slice(0, 10), condition: "iyi", location: "", notes: "" };
  const [assetForm, setAssetForm] = useState<Asset>(EMPTY_ASSET);

  /* İş Takibi */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskModal, setTaskModal] = useState<"add" | "edit" | null>(null);
  const EMPTY_TASK: Task = { id: "", title: "", description: "", assignee: "", dueDate: "", priority: "medium", status: "todo", createdAt: "" };
  const [taskForm, setTaskForm] = useState<Task>(EMPTY_TASK);

  /* Aktarım (Import/Export) */
  interface ImportRow { name: string; price: string; sale_price: string; description: string; category: string; stock: string; is_popular: string; is_vegan: string; is_spicy: string; image_url: string; _status?: "pending" | "ok" | "err"; _msg?: string; }
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [externalImportLoc, setExternalImportLoc] = useState({ city: "", district: "", neighborhood: "" });
  const [externalImportGeo, setExternalImportGeo] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [integrationForm, setIntegrationForm] = useState({
    openaiApiKey: "",
    geminiApiKey: "",
    googleAiApiKey: "",
    deepseekApiKey: "",
    openaiModel: "gpt-4o-mini",
    whatsappEnabled: true,
    whatsappFeatureNewOrder: true,
    whatsappFeatureCustomerContact: false,
    whatsappFeatureOrderStatus: false,
    whatsappFeatureBulkMarketing: false,
  });
  const [integrationMasks, setIntegrationMasks] = useState({
    openaiApiKeyMasked: "",
    geminiApiKeyMasked: "",
    googleAiApiKeyMasked: "",
    deepseekApiKeyMasked: "",
  });
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [whatsappTestLoading, setWhatsappTestLoading] = useState(false);
  const [whatsappTestHint, setWhatsappTestHint] = useState<string | null>(null);
  const [aiGeneratingAbout, setAiGeneratingAbout] = useState(false);
  const [aiGeneratingProduct, setAiGeneratingProduct] = useState(false);

  const siparisWhatsAppAktif =
    integrationForm.whatsappEnabled && integrationForm.whatsappFeatureNewOrder;

  function setSiparisWhatsAppAktif(on: boolean) {
    setIntegrationForm((p) => ({
      ...p,
      whatsappEnabled: on,
      whatsappFeatureNewOrder: on,
    }));
  }

  async function persistWhatsAppSettingsQuiet(): Promise<boolean> {
    try {
      await fetch(apiJoin("providers/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          whatsapp: profil.whatsapp?.trim() || null,
          callmebotKey: profil.callmebotKey?.trim() || null,
        }),
      });
      await fetch(apiJoin("providers/integrations"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          whatsappEnabled: integrationForm.whatsappEnabled,
          whatsappFeatureNewOrder: integrationForm.whatsappFeatureNewOrder,
          whatsappFeatureCustomerContact: integrationForm.whatsappFeatureCustomerContact,
        }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async function testWhatsAppOrderNotify() {
    if (!profil.whatsapp?.trim()) {
      flash("err", "Önce işletme WhatsApp numaranızı girin.");
      return;
    }
    setWhatsappTestLoading(true);
    setWhatsappTestHint(null);
    try {
      await persistWhatsAppSettingsQuiet();
      const r = await fetch(apiJoin("providers/me/whatsapp-order-test"), {
        method: "POST",
        headers: authHeaders(),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.sent) {
        flash("ok", d.message || "Test bildirimi gönderildi.");
        setWhatsappTestHint("Son test: başarılı — WhatsApp kutunuzu kontrol edin.");
        return;
      }
      const err = String(d.error || "Test gönderilemedi.");
      flash("err", err);
      setWhatsappTestHint(err);
    } finally {
      setWhatsappTestLoading(false);
    }
  }

  /* Masa & Rezervasyon Ayarları */
  interface TableSection { id: string; name: string; type: "masa" | "oda" | "lobi" | "diger"; }
  const [svcSettings, setSvcSettings] = useState({
    tableServiceEnabled: false,
    reservationEnabled: false,
    reservationAutoConfirm: false,
    qrMenuPublic: false,
  });
  const [tableSections, setTableSections] = useState<TableSection[]>([]);
  const [savingSvc, setSavingSvc] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", type: "masa" as TableSection["type"] });

  /* Rezervasyonlar */
  interface Reservation { id: number; guest_name: string; guest_phone: string; reservation_date: string; reservation_time: string; party_size: number; section_id: string | null; section_name: string | null; note: string | null; status: string; created_at: string; }
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rezervasyonFilter, setRezervasyonFilter] = useState("all");
  const [updatingReservation, setUpdatingReservation] = useState<number | null>(null);

  /* ── Helpers ── */
  function getSession() { return getProviderSession(); }
  function authHeaders(): Record<string, string> { return providerAuthHeaders(getSession()); }
  function flash(type: "ok" | "err", text: string, durationMs?: number) {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setMsg({ type, text });
    const ms = durationMs ?? (type === "err" ? 45_000 : 6000);
    flashTimerRef.current = setTimeout(() => {
      setMsg(null);
      flashTimerRef.current = null;
    }, ms);
  }

  function dismissFlash() {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setMsg(null);
  }

  function pinGeliverOfferChoice(shipmentId: string, offerId: string) {
    if (!vendor?.id) {
      flash("err", "İşletme bilgisi yüklenemedi; sayfayı yenileyip tekrar deneyin.");
      return;
    }
    const sid = shipmentId.trim();
    const oid = offerId.trim();
    if (!sid || !oid) return;
    setGeliverPinnedOfferMap((prev) => {
      const next = { ...prev, [sid]: oid };
      writeGeliverPinnedOfferMap(vendor.id, next);
      return next;
    });
    flash(
      "ok",
      "Teklif bu gönderi için kaydedildi (bu tarayıcı). app.geliver.io → Gönderiler'de aynı firmayı seçip «Etiket Al» ile tamamlayın.",
    );
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function noteField(notes: string | null | undefined, key: string): string {
    const raw = String(notes || "");
    const m = raw.match(new RegExp(`${key}:([^|\\n]+)`));
    return m?.[1]?.trim() || "";
  }

  /* ── Data load ── */
  const loadVendor = useCallback(async () => {
    const s = getSession();
    if (!s) { navigate("/servis-saglayici-giris"); return; }
    try {
      const res = await fetch(apiJoin("providers/me"), { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) { navigate("/servis-saglayici-giris"); return; }
      const resolvedPanelPath = data.vendor?.panel_route || providerPanelPath(data.vendor);
      if (resolvedPanelPath !== "/servis-saglayici-paneli") {
        navigate(resolvedPanelPath, { replace: true });
        return;
      }
      setVendor(data.vendor);
      setGeliverZip(String(data.vendor.geliver_sender_zip || ""));
      setGeliverSenderMahalle(String(data.vendor.geliver_sender_mahalle || "").trim());
      setGeliverOrgIdInput(String(data.vendor.geliver_organization_id || "").trim());
      setGeliverTokenInput("");
      const pfx = String(data.vendor.preferred_tr_gateway || "").toLowerCase();
      setTrPreferred(pfx === "paytr" || pfx === "iyzico" ? pfx : "");
      setTrPaytrTest(data.vendor.paytr_test_mode !== false);
      setTrIyzicoSandbox(data.vendor.iyzico_sandbox !== false);
      setTrPaytrId("");
      setTrPaytrKey("");
      setTrPaytrSalt("");
      setTrIyzicoKey("");
      setTrIyzicoSecret("");
      setProfil({
        name: data.vendor.name || "",
        phone: data.vendor.phone || "",
        address: data.vendor.address || "",
        city: data.vendor.city || "",
        district: data.vendor.district || "",
        mahalle: "",
        description: data.vendor.description || "",
        whatsapp: data.vendor.whatsapp || "",
        callmebotKey: data.vendor.callmebot_key || data.vendor.callmebotKey || "",
        imageUrl: data.vendor.image_url || "",
        coverUrl: data.vendor.cover_url || "",
        contactEmail: data.vendor.email || "",
        ownerEmail: data.vendor.owner_email || "",
      });
      setPayoutForm({
        holder: data.vendor.payout_bank_holder || "",
        iban: data.vendor.payout_bank_iban || "",
        branch: data.vendor.payout_bank_branch || "",
      });
      const created = String(data.vendor.created_at || "").slice(0, 10);
      const fallbackEnd = data.vendor.created_at ? new Date(new Date(data.vendor.created_at).getTime() + 30 * 86400000).toISOString().slice(0, 10) : "";
      setSubForm((prev) => ({
        ...prev,
        startDate: noteField(data.vendor.notes, "sub_start") || created,
        endDate: noteField(data.vendor.notes, "sub_end") || fallbackEnd,
      }));
      /* Load localStorage POS data */
      const vid = data.vendor.id;
      setExpenses(lsGet(lsKey(vid, "expenses"), []));
      setCrmNotes(lsGet(lsKey(vid, "crm_notes"), {}));
      setRepairs(lsGet(lsKey(vid, "repairs"), []));
      setEmployees(lsGet(lsKey(vid, "employees"), []));
      setAssets(lsGet(lsKey(vid, "assets"), []));
      setTasks(lsGet(lsKey(vid, "tasks"), []));
      setGeliverPinnedOfferMap(readGeliverPinnedOfferMap(vid));
    } catch { navigate("/servis-saglayici-giris"); }
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { loadVendor(); }, [loadVendor]);

  async function loadIntegrations() {
    try {
      const r = await fetch(apiJoin("providers/integrations"), { headers: authHeaders() });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.success) return;
      setIntegrationMasks({
        openaiApiKeyMasked: d.integrations?.openaiApiKeyMasked || "",
        geminiApiKeyMasked: d.integrations?.geminiApiKeyMasked || "",
        googleAiApiKeyMasked: d.integrations?.googleAiApiKeyMasked || "",
        deepseekApiKeyMasked: d.integrations?.deepseekApiKeyMasked || "",
      });
      setIntegrationForm((p) => ({
        ...p,
        openaiModel: d.integrations?.openaiModel || "gpt-4o-mini",
        whatsappEnabled: d.integrations?.whatsappEnabled !== false,
        whatsappFeatureNewOrder: d.integrations?.whatsappFeatureNewOrder !== false,
        whatsappFeatureCustomerContact: d.integrations?.whatsappFeatureCustomerContact === true,
        whatsappFeatureOrderStatus: d.integrations?.whatsappFeatureOrderStatus === true,
        whatsappFeatureBulkMarketing: d.integrations?.whatsappFeatureBulkMarketing === true,
      }));
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    if (!vendor?.id) return;
    void loadIntegrations();
  }, [vendor?.id]);

  async function saveIntegrations() {
    setSavingIntegrations(true);
    try {
      const r = await fetch(apiJoin("providers/integrations"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          openaiApiKey: integrationForm.openaiApiKey || undefined,
          geminiApiKey: integrationForm.geminiApiKey || undefined,
          googleAiApiKey: integrationForm.googleAiApiKey || undefined,
          deepseekApiKey: integrationForm.deepseekApiKey || undefined,
          openaiModel: integrationForm.openaiModel || "gpt-4o-mini",
          whatsappEnabled: integrationForm.whatsappEnabled,
          whatsappFeatureNewOrder: integrationForm.whatsappFeatureNewOrder,
          whatsappFeatureCustomerContact: integrationForm.whatsappFeatureCustomerContact,
          whatsappFeatureOrderStatus: integrationForm.whatsappFeatureOrderStatus,
          whatsappFeatureBulkMarketing: integrationForm.whatsappFeatureBulkMarketing,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.success) { flash("err", d.error || "API ayarları kaydedilemedi."); return; }
      flash("ok", "API ayarları kaydedildi.");
      setIntegrationForm((p) => ({ ...p, openaiApiKey: "", geminiApiKey: "", googleAiApiKey: "", deepseekApiKey: "" }));
      await loadIntegrations();
    } finally {
      setSavingIntegrations(false);
    }
  }

  async function aiGenerateAboutText() {
    if (!vendor?.name) return;
    setAiGeneratingAbout(true);
    try {
      const r = await fetch(apiJoin("providers/ai/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ purpose: "about", title: vendor.name, keywords: `${vendor.provider_subtype || ""}, ${vendor.city || ""}` }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.success || !d?.text) { flash("err", d.error || "AI metin üretilemedi."); return; }
      setProfil((p) => ({ ...p, description: d.text }));
      try {
        await fetch(apiJoin("providers/profile"), {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ description: d.text, aboutHtml: d.text }),
        });
      } catch { /* sessiz */ }
      flash("ok", "Hakkımızda metni AI ile üretildi ve kaydedildi.");
    } finally {
      setAiGeneratingAbout(false);
    }
  }

  async function aiGenerateProductText() {
    if (!productForm.name?.trim()) { flash("err", "Önce ürün adını girin."); return; }
    setAiGeneratingProduct(true);
    try {
      const r = await fetch(apiJoin("providers/ai/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ purpose: "product", title: productForm.name, keywords: productForm.menuCategoryId || "" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.success || !d?.text) { flash("err", d.error || "AI metin üretilemedi."); return; }
      setProductForm((p) => ({ ...p, description: d.text }));
      flash("ok", "Ürün açıklaması AI ile üretildi.");
    } finally {
      setAiGeneratingProduct(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(async () => {
      if (!externalImportLoc.city || !externalImportLoc.district || !externalImportLoc.neighborhood) {
        setExternalImportGeo({ lat: null, lng: null });
        return;
      }
      try {
        const r = await fetch(apiJoin("tr-address/forward-geocode"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: externalImportLoc.city,
            district: externalImportLoc.district,
            mahalle: externalImportLoc.neighborhood,
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d?.success) {
          setExternalImportGeo({ lat: null, lng: null });
          return;
        }
        setExternalImportGeo({ lat: Number(d.lat), lng: Number(d.lng) });
      } catch {
        setExternalImportGeo({ lat: null, lng: null });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [externalImportLoc.city, externalImportLoc.district, externalImportLoc.neighborhood]);

  async function loadProducts() {
    const res = await fetch(apiJoin("providers/products"), { headers: authHeaders() });
    const data = await res.json();
    if (data.success) { setProducts(data.items || []); setCategories(data.categories || []); }
  }

  async function loadOrders(silent = false) {
    try {
      const res = await fetch(apiJoin("providers/orders"), { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const newOrders: Order[] = data.orders || [];
        setOrders(newOrders);
        const pendingCount = newOrders.filter(o => o.status === "pending").length;
        if (!silent && lastPendingCount.current >= 0 && pendingCount > lastPendingCount.current) {
          setNewOrderAlert(true);
          window.dispatchEvent(new CustomEvent("Yekpare:newOrder"));
        }
        if (lastPendingCount.current > 0 && pendingCount === 0) {
          window.dispatchEvent(new CustomEvent("Yekpare:orderClear"));
        }
        lastPendingCount.current = pendingCount;
      }
    } catch { /* noop */ }
  }

  async function loadCouriers() {
    try { const res = await fetch(apiJoin("providers/couriers"), { headers: authHeaders() }); if (res.ok) setCouriers(await res.json()); } catch { /* noop */ }
  }

  async function loadStaff() {
    try { const res = await fetch(apiJoin("providers/staff"), { headers: authHeaders() }); if (res.ok) setStaffList(await res.json()); } catch { /* noop */ }
  }

  async function loadStaffChatMessages(ch: "vendor-usta" | "vendor-servis") {
    if (!vendor) return;
    try {
      const res = await fetch(apiJoin(`staff/messages?vendorId=${vendor.id}&channel=${ch}`));
      if (res.ok) { setStaffChatMessages(await res.json()); setTimeout(() => staffChatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
    } catch { /* noop */ }
  }

  async function loadServiceSettings() {
    try {
      const res = await fetch(apiJoin("providers/service-settings"), { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSvcSettings({
          tableServiceEnabled: Boolean(data.tableServiceEnabled),
          reservationEnabled: Boolean(data.reservationEnabled),
          reservationAutoConfirm: Boolean(data.reservationAutoConfirm),
          qrMenuPublic: Boolean(data.qrMenuPublic),
        });
        setTableSections(data.tableSections ?? []);
      }
    } catch { /* noop */ }
  }

  async function saveServiceSettings() {
    setSavingSvc(true);
    try {
      const canUseTable = canUseTableService;
      const nextSettings = {
        ...svcSettings,
        tableServiceEnabled: canUseTable ? svcSettings.tableServiceEnabled : false,
        qrMenuPublic: canUseTable ? svcSettings.qrMenuPublic : false,
      };
      const res = await fetch(apiJoin("providers/service-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...nextSettings, tableSections: canUseTable ? tableSections : [] }),
      });
      if (res.ok) flash("ok", "Servis ayarları kaydedildi!"); else flash("err", "Kayıt hatası");
    } catch { flash("err", "Kayıt hatası"); }
    setSavingSvc(false);
  }

  async function loadReservations() {
    if (!vendor) return;
    try {
      const q = rezervasyonFilter !== "all" ? `?status=${rezervasyonFilter}` : "";
      const res = await fetch(apiJoin(`delivery/vendors/${vendor.id}/reservations${q}`), { headers: authHeaders() });
      if (res.ok) setReservations(await res.json());
    } catch { /* noop */ }
  }

  async function updateReservationStatus(id: number, status: string) {
    setUpdatingReservation(id);
    await fetch(apiJoin(`delivery/reservations/${id}/status`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setUpdatingReservation(null);
    loadReservations();
  }

  function addSection() {
    if (!newSection.name.trim()) return;
    setTableSections(prev => [...prev, { id: Date.now().toString(36), name: newSection.name.trim(), type: newSection.type }]);
    setNewSection({ name: "", type: "masa" });
  }

  function addSampleTables(count = 5) {
    const start = tableSections.length;
    const next: TableSection[] = [];
    for (let i = 1; i <= count; i += 1) {
      next.push({ id: `masa-${Date.now()}-${i}`, name: String(start + i), type: "masa" });
    }
    setTableSections((prev) => [...prev, ...next]);
    flash("ok", `${count} masa eklendi — Servis ayarlarını kaydedin.`);
  }

  async function enableTableOrderAndQr(goQrTab = true) {
    if (!canUseTableService) {
      flash("err", "Masaya servis sadece restoran/kafe tipi sipariş işletmeleri için kullanılabilir.");
      return;
    }
    const nextSections =
      tableSections.length > 0
        ? tableSections
        : [
            { id: `masa-${Date.now()}-1`, name: "1", type: "masa" as const },
            { id: `masa-${Date.now()}-2`, name: "2", type: "masa" as const },
          ];
    const nextSettings = {
      ...svcSettings,
      tableServiceEnabled: true,
      qrMenuPublic: true,
    };
    setSvcSettings(nextSettings);
    setTableSections(nextSections);
    setSavingSvc(true);
    try {
      const res = await fetch(apiJoin("providers/service-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...nextSettings, tableSections: nextSections }),
      });
      if (res.ok) {
        flash("ok", "Masaya sipariş ve QR menü açıldı.");
        if (goQrTab) setTab("qr-menu");
      } else flash("err", "Kayıt hatası");
    } catch {
      flash("err", "Kayıt hatası");
    } finally {
      setSavingSvc(false);
    }
  }

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const slugForQr = (vendor?.slug || "").trim() || String(vendor?.id ?? "");
  const buildTableOrderLink = useCallback(
    (sectionId?: string) =>
      buildVendorTableOrderUrl({
        origin: siteOrigin,
        slug: slugForQr,
        tableServiceEnabled: svcSettings.tableServiceEnabled,
        qrMenuPublic: svcSettings.qrMenuPublic,
        sectionId,
      }),
    [siteOrigin, slugForQr, svcSettings.tableServiceEnabled, svcSettings.qrMenuPublic],
  );

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  /** Standart üyelikte olmayan sekmeye düşmeyi engelle (URL / state). */
  useEffect(() => {
    if (!vendor) return;
    const mt = String(
      (vendor as { membership_tier?: string; membershipTier?: string }).membership_tier ??
        (vendor as { membershipTier?: string }).membershipTier ??
        "gold",
    ).toLowerCase();
    const allow = (id: string) => mt === "gold" || mt === "premium" || PROVIDER_STANDARD_TAB_IDS.has(id);
    if (!allow(tab)) setTab("anasayfa");
  }, [
    vendor?.id,
    (vendor as { membership_tier?: string } | null)?.membership_tier,
    (vendor as { membershipTier?: string } | null)?.membershipTier,
    tab,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !vendor) return;
    const applyHash = () => {
      const h = window.location.hash.replace(/^#/, "").trim();
      if (!h) return;
      const map: Record<string, string> = {
        "platform-destek": "platform-destek",
        blog: "blog",
        duyurular: "duyurular",
        kargo: "kargo",
        "genel-ayarlar": "genel-ayarlar",
        temalar: "temalar",
        posta: "posta",
        bildirimler: "bildirimler",
        siparisler: "siparisler",
        urunler: "urunler",
      };
      const next = map[h];
      if (!next) return;
      const mt = String(
        (vendor as { membership_tier?: string; membershipTier?: string }).membership_tier ??
          (vendor as { membershipTier?: string }).membershipTier ??
          "gold",
      ).toLowerCase();
      const allowed = mt === "gold" || mt === "premium" || PROVIDER_STANDARD_TAB_IDS.has(next);
      if (allowed) setTab(next);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [vendor]);

  useEffect(() => {
    if (typeof window === "undefined" || !vendor || !tab) return;
    if (tab === "anasayfa") return;
    const next = `#${tab}`;
    if (window.location.hash !== next) window.history.replaceState(null, "", next);
  }, [tab, vendor?.id]);

  useEffect(() => {
    if (!vendor) return;
    const vt = vendor.provider_type || vendor.vendor_type;
    if (tab === "anasayfa" && ["alisveris", "ecommerce"].includes(vt)) {
      loadProducts();
      loadOrders(true);
      void loadEcommerceCategories();
    }
    if (tab === "urunler" && ["siparis", "alisveris", "delivery", "ecommerce"].includes(vt)) {
      loadProducts();
      if (["alisveris", "ecommerce"].includes(vt)) void loadEcommerceCategories();
    }
    if (tab === "siparisler" && ["siparis", "delivery", "alisveris", "ecommerce"].includes(vt)) {
      loadOrders();
      if (["siparis", "delivery"].includes(vt)) { loadCouriers(); loadStaff(); }
    }
    if (tab === "ekibim") { loadStaff(); if (["siparis", "delivery"].includes(vt)) loadCouriers(); loadStaffChatMessages(staffChatChannel); }
    if (tab === "musteriler") { loadOrders(true); loadVendorCustomers(); }
    if (tab === "kasa") loadOrders(true);
    if (tab === "profil") loadServiceSettings();
    if (tab === "rezervasyonlar") loadReservations();
  }, [tab, vendor]);

  useEffect(() => {
    if (!vendor) return;
    const vt = vendor.provider_type || vendor.vendor_type;
    if (!["siparis", "delivery", "alisveris", "ecommerce"].includes(vt)) return;
    lastPendingCount.current = -1;
    const interval = setInterval(() => loadOrders(), 30_000);
    return () => clearInterval(interval);
  }, [vendor]);

  /* ── Profile ── */
  async function savePayoutBank() {
    setSavingPayout(true);
    try {
      const res = await fetch(apiJoin("providers/payout-bank"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          payoutBankHolder: payoutForm.holder.trim(),
          payoutBankIban: payoutForm.iban.trim(),
          payoutBankBranch: payoutForm.branch.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
      flash("ok", "Banka bilgileri kaydedildi.");
      await loadVendor();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setSavingPayout(false);
    }
  }

  async function saveGeliverSettings(opts?: { clearToken?: boolean }) {
    setSavingGeliver(true);
    try {
      const vtSave = vendor?.provider_type || vendor?.vendor_type || "";
      const isEcomVendor = ["alisveris", "ecommerce"].includes(vtSave);
      const body: Record<string, unknown> = {
        geliverSenderZip: geliverZip.replace(/\D/g, "").slice(0, 5) || null,
        geliverSenderMahalle: geliverSenderMahalle.trim() || null,
        geliverOrganizationId: geliverOrgIdInput.trim() || null,
      };
      if (isEcomVendor) body.geliverAutoShipOnOrder = false;
      if (opts?.clearToken) body.geliverApiToken = "";
      else if (geliverTokenInput.trim()) body.geliverApiToken = geliverTokenInput.trim();

      const res = await fetch(apiJoin("providers/geliver-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
      flash("ok", "Geliver ayarları kaydedildi.");
      setGeliverTokenInput("");
      await loadVendor();
      await loadOrders();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setSavingGeliver(false);
    }
  }

  async function saveTrGatewaySettings() {
    if (!vendor || String(vendor.revenue_model || "").toLowerCase() !== "subscription") return;
    setSavingTrGateway(true);
    try {
      const body: Record<string, unknown> = {
        paytrTestMode: trPaytrTest,
        iyzicoSandbox: trIyzicoSandbox,
        preferredTrGateway: trPreferred || null,
      };
      if (trPaytrId.trim()) body.paytrMerchantId = trPaytrId.trim();
      if (trPaytrKey.trim()) body.paytrMerchantKey = trPaytrKey.trim();
      else if (vendor.paytr_configured) body.paytrMerchantKey = "***";
      if (trPaytrSalt.trim()) body.paytrMerchantSalt = trPaytrSalt.trim();
      else if (vendor.paytr_configured) body.paytrMerchantSalt = "***";
      if (trIyzicoKey.trim()) body.iyzicoApiKey = trIyzicoKey.trim();
      else if (vendor.iyzico_configured) body.iyzicoApiKey = "***";
      if (trIyzicoSecret.trim()) body.iyzicoSecretKey = trIyzicoSecret.trim();
      else if (vendor.iyzico_configured) body.iyzicoSecretKey = "***";

      const res = await fetch(apiJoin("providers/tr-gateway-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
      const paytrUrl =
        typeof window !== "undefined" ? `${window.location.origin}/api/delivery/checkout/paytr-callback` : "";
      flash(
        "ok",
        paytrUrl
          ? `Ödeme ayarları kaydedildi. PayTR bildirim URL: ${paytrUrl}`
          : "Ödeme ayarları kaydedildi.",
      );
      setTrPaytrKey("");
      setTrPaytrSalt("");
      setTrIyzicoKey("");
      setTrIyzicoSecret("");
      await loadVendor();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setSavingTrGateway(false);
    }
  }

  async function submitManualGeliverShipment() {
    if (!vendor?.geliver_api_token_masked) {
      flash("err", "Önce Genel Ayarlar'dan Geliver API anahtarı kaydedin.");
      return;
    }
    if (!manualShip.city.trim() || !manualShip.district.trim()) {
      flash("err", "İl ve ilçe seçin.");
      return;
    }
    if (!manualShip.mahalle.trim()) {
      flash("err", "Mahalle seçin: ilçeyi seçtikten sonra listeden mahalle arayın veya seçin.");
      return;
    }
    setManualShipBusy(true);
    setManualShipResult(null);
    setManualGeliverError(null);
    try {
      const res = await fetch(apiJoin("providers/geliver/manual-shipment"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          recipient: {
            name: manualShip.recipientName.trim(),
            phone: manualShip.phone.trim(),
            address1: manualShip.address1.trim(),
            city: manualShip.city.trim(),
            district: manualShip.district.trim(),
            neighborhood: manualShip.mahalle.trim(),
            zip: manualShip.zip.replace(/\D/g, "").slice(0, 5) || undefined,
            email: manualShip.email.trim() || undefined,
          },
          lengthCm: manualShip.lengthCm.trim(),
          widthCm: manualShip.widthCm.trim(),
          heightCm: manualShip.heightCm.trim(),
          weightKg: manualShip.weightKg.trim(),
          reference: manualShip.reference.trim() || undefined,
          senderAddressId: vendor?.geliver_sender_address_id?.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Gönderi oluşturulamadı."));

      const shipmentId = String(data.shipmentId ?? "").trim();
      if (data.purchaseMode === "manual" && shipmentId) {
        let snap: Record<string, unknown> | null = null;
        const bodyShip = data.shipment;
        if (bodyShip && typeof bodyShip === "object" && !Array.isArray(bodyShip)) {
          snap = bodyShip as Record<string, unknown>;
        }
        if (!snap || collectGeliverOffersFromShipment(snap).length === 0) {
          const r2 = await fetch(apiJoin(`providers/geliver/shipment/${encodeURIComponent(shipmentId)}`), {
            headers: authHeaders(),
          });
          const d2 = await r2.json().catch(() => ({}));
          if (r2.ok && d2.shipment && typeof d2.shipment === "object" && !Array.isArray(d2.shipment)) {
            snap = d2.shipment as Record<string, unknown>;
          }
        }
        if (snap) {
          setManualShipResult(null);
          setManualGeliverError(null);
          setGeliverDraft({ id: shipmentId, shipment: snap });
          const offers = collectGeliverOffersFromShipment(snap);
          flash(
            "ok",
            offers.length
              ? "Teklifler Geliver'e kaydedildi. Etiketi https://app.geliver.io adresinde oturum açıp Gönderiler'den «Etiket Al» ile tamamlayın."
              : "Gönderi oluşturuldu. Teklifler Geliver tarafında hazırlanıyorsa «API'den yenile» veya paketi güncelleyin; ardından https://app.geliver.io üzerinden «Etiket Al» kullanın.",
          );
          setGeliverHub("compose");
          void loadGeliverBalance({ quiet: true });
          await loadVendor();
          return;
        }
        setManualGeliverError(
          "Gönderi kimliği alındı ancak teklif detayı yüklenemedi. «Kargo teklif kayıtları» sekmesinden açmayı veya sayfayı yenilemeyi deneyin.",
        );
        flash("err", "Gönderi detayı alınamadı; ağ veya Geliver yanıtı eksik olabilir.");
        setGeliverDraft(null);
        setManualShipResult({
          shipmentId,
          trackingNumber: null,
          labelUrl: null,
        });
        await loadVendor();
        return;
      }

      flash("ok", shipmentId ? `Gönderi: ${shipmentId}` : "İşlem tamamlandı.");
      setManualGeliverError(null);
      setGeliverDraft(null);
      setManualShipResult({
        shipmentId: shipmentId || String(data.shipmentId ?? ""),
        trackingNumber: data.trackingNumber ?? null,
        labelUrl: data.labelUrl ?? null,
      });
      await loadVendor();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Hata";
      setManualGeliverError(text);
      flash("err", text);
    } finally {
      setManualShipBusy(false);
    }
  }

  async function loadGeliverShipmentList(opts?: { silent?: boolean }) {
    if (!opts?.silent) setGeliverListLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/shipments?limit=25&page=1"), { headers: authHeaders() });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(data.error || "Liste alınamadı"));
      let rows = Array.isArray(data.data) ? (data.data as Array<Record<string, unknown>>) : [];
      if (!rows.length && Array.isArray(data.rows)) rows = data.rows as Array<Record<string, unknown>>;
      if (!rows.length && Array.isArray(data.shipments)) rows = data.shipments as Array<Record<string, unknown>>;
      const sorted = sortGeliverShipmentListRows(rows);
      const idx: Record<string, number> = {};
      sorted.forEach((row, i) => {
        const id = geliverListRowId(row);
        if (id) idx[id] = i + 1;
      });
      setGeliverShipmentRowIndex(idx);
      setGeliverListRows(sorted);
    } catch (e) {
      if (opts?.silent) {
        /* Arka planda sıra güncellenemedi; mevcut haritayı koru */
      } else {
        flash("err", e instanceof Error ? e.message : "Hata");
        setGeliverListRows([]);
        setGeliverShipmentRowIndex({});
      }
    } finally {
      if (!opts?.silent) setGeliverListLoading(false);
    }
  }

  async function openGeliverShipmentFromList(id: string) {
    if (!id) return;
    setGeliverOfferBusy(true);
    try {
      const res = await fetch(apiJoin(`providers/geliver/shipment/${encodeURIComponent(id)}`), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gönderi yüklenemedi");
      const ship = data.shipment as Record<string, unknown>;
      setGeliverDraft({ id, shipment: ship });
      setGeliverHub("compose");
      flash("ok", "Gönderi detayı Geliver API'den yüklendi.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverOfferBusy(false);
    }
  }

  async function refreshGeliverDraft(opts?: { quiet?: boolean }): Promise<void> {
    if (!geliverDraft?.id) return;
    setGeliverOfferBusy(true);
    try {
      const res = await fetch(apiJoin(`providers/geliver/shipment/${encodeURIComponent(geliverDraft.id)}`), {
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Yenilenemedi");
      const shipRec = data.shipment as Record<string, unknown>;
      setGeliverDraft({ id: geliverDraft.id, shipment: shipRec });
      if (!opts?.quiet) flash("ok", "Gönderi API'den yenilendi.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverOfferBusy(false);
    }
  }

  async function updateGeliverDraftPackage() {
    if (!geliverDraft?.id) return;
    setGeliverOfferBusy(true);
    try {
      const res = await fetch(apiJoin(`providers/geliver/shipment/${encodeURIComponent(geliverDraft.id)}/package`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          lengthCm: manualShip.lengthCm.trim(),
          widthCm: manualShip.widthCm.trim(),
          heightCm: manualShip.heightCm.trim(),
          weightKg: manualShip.weightKg.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Paket güncellenemedi");
      if (data.shipment) {
        const shipRec = data.shipment as Record<string, unknown>;
        setGeliverDraft({ id: geliverDraft.id, shipment: shipRec });
      }
      flash("ok", "Paket bilgisi Güncellendi; Geliver teklifleri yenilendi.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverOfferBusy(false);
    }
  }

  async function loadGeliverBalance(opts?: { quiet?: boolean }) {
    if (!vendor?.geliver_api_token_masked) return;
    const org = (geliverOrgIdInput.trim() || String(vendor?.geliver_organization_id ?? "").trim());
    const shipmentHint = geliverDraft?.id?.trim();
    setGeliverBalancePrefetchError(null);
    setGeliverBalanceLoading(true);
    try {
      const params = new URLSearchParams();
      if (org) params.set("organizationId", org);
      if (shipmentHint) params.set("shipmentId", shipmentHint);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(apiJoin(`providers/geliver/balance${qs}`), { headers: authHeaders() });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      let data: Record<string, unknown> = {};
      if (ct.includes("application/json")) {
        data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      } else {
        const txt = await res.text().catch(() => "");
        if (!res.ok) {
          // Hosting/proxy katmanından dönen ham "Application failed to respond" / 502 / 504 mesajlarını
          // kullanıcı dostu cümleye çevir.
          const raw = txt.trim().slice(0, 400);
          if (/application failed to respond|gateway time-?out|bad gateway|524|cloudflare/i.test(raw) || res.status === 502 || res.status === 503 || res.status === 504) {
            throw new Error(
              "Bakiye sunucusu zaman aşımına uğradı (Geliver tarafı yavaş yanıt verdi). Birkaç saniye bekleyip «Bakiyeyi yenile» ile tekrar deneyin.",
            );
          }
          throw new Error(raw || `Sunucu hatası (${res.status})`);
        }
      }
      if (!res.ok) {
        throw new Error(String(data.error || data.message || `Sunucu hatası (${res.status})`));
      }
      setGeliverBalanceRaw(data.balance ?? null);
      setGeliverBalancePrefetchError(null);
      const resolvedOrg =
        typeof data.resolvedOrganizationId === "string" ? data.resolvedOrganizationId.trim() : "";
      if (resolvedOrg) {
        setGeliverOrgIdInput(resolvedOrg);
        setVendor((prev) => (prev ? { ...prev, geliver_organization_id: resolvedOrg } : prev));
      }
      if (!opts?.quiet) {
        flash(
          "ok",
          resolvedOrg
            ? "Geliver kuruluş kimliği sunucuda düzeltildi; bakiye güncellendi."
            : "Geliver bakiye güncellendi.",
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hata";
      setGeliverBalanceRaw(null);
      if (opts?.quiet) {
        setGeliverBalancePrefetchError(msg);
      } else {
        flash(
          "err",
          /kuruluş|organization|E1120/i.test(msg)
            ? `${msg} Boş bırakılan kuruluş kimliği sunucuda otomatik bulunabilir; «Bakiyeyi yenile» ile tekrar deneyin veya Geliver Ayarlar → Kuruluş UUID'sini kaydedin.`
            : msg,
        );
      }
    } finally {
      setGeliverBalanceLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "kargo" || geliverHub !== "compose") {
      lastGeliverBalancePrefetchRef.current = "";
      return;
    }
    if (!vendor?.id || !vendor?.geliver_api_token_masked) return;
    const org = String(vendor?.geliver_organization_id ?? "").trim();
    const draftId = geliverDraft?.id?.trim() ?? "";
    const key = `${vendor.id}|org:${org}|draft:${draftId}`;
    if (lastGeliverBalancePrefetchRef.current === key) return;
    lastGeliverBalancePrefetchRef.current = key;
    void loadGeliverBalance({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, geliverHub, vendor?.id, vendor?.geliver_api_token_masked, vendor?.geliver_organization_id, geliverDraft?.id]);

  useEffect(() => {
    if (tab !== "genel-ayarlar" || !vendor?.geliver_api_token_masked) return;
    void loadGeliverWebhooksList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, vendor?.geliver_api_token_masked]);

  async function loadGeliverSenderAddresses() {
    setGeliverSenderLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/addresses?role=sender&limit=50&page=1"), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Adresler yüklenemedi");
      setGeliverSenderList(Array.isArray(data.data) ? (data.data as Array<Record<string, unknown>>) : []);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
      setGeliverSenderList([]);
    } finally {
      setGeliverSenderLoading(false);
    }
  }

  async function loadGeliverCitiesForForm() {
    try {
      const res = await fetch(apiJoin("providers/geliver/cities"), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGeliverCitiesOpts([]);
        flash("err", String(data.error || `Geliver şehir listesi alınamadı (${res.status}).`));
        return;
      }
      const rows = (Array.isArray(data.data) ? data.data : []) as Array<{ name?: string; cityCode?: string; areaCode?: string }>;
      setGeliverCitiesOpts(
        rows
          .map((r) => {
            const name = String(r.name || "").trim();
            const raw = String(r.cityCode ?? r.areaCode ?? "").replace(/\D/g, "");
            const code = raw.length <= 2 ? raw.padStart(2, "0") : raw.slice(-2);
            if (!name || !code) return null;
            return { name, code };
          })
          .filter((x): x is { name: string; code: string } => x != null),
      );
    } catch {
      setGeliverCitiesOpts([]);
    }
  }

  async function loadGeliverDistrictsForNewSender(cityCode: string) {
    const cc = cityCode.trim();
    if (!cc) {
      setGeliverDistrictOpts([]);
      return;
    }
    try {
      const res = await fetch(apiJoin(`providers/geliver/districts?cityCode=${encodeURIComponent(cc)}`), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGeliverDistrictOpts([]);
        flash("err", String(data.error || `İlçe listesi alınamadı (${res.status}).`));
        return;
      }
      const rows = (Array.isArray(data.data) ? data.data : []) as Array<{ name?: string; districtID?: string | number }>;
      setGeliverDistrictOpts(
        rows
          .map((r) => {
            const name = String(r.name || "").trim();
            const id = r.districtID != null ? String(r.districtID) : "";
            if (!name || !id) return null;
            return { name, id };
          })
          .filter((x): x is { name: string; id: string } => x != null),
      );
    } catch {
      setGeliverDistrictOpts([]);
    }
  }

  async function setGeliverDefaultSenderAddress(addressId: string) {
    if (!addressId.trim()) return;
    setSavingGeliver(true);
    try {
      const res = await fetch(apiJoin("providers/geliver-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ geliverSenderAddressId: addressId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
      flash("ok", "Varsayılan gönderici adresi seçildi (sipariş ve manuel gönderide kullanılır).");
      await loadVendor();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setSavingGeliver(false);
    }
  }

  async function createGeliverSenderFromPanel() {
    const dId = parseInt(newGeliverSender.districtId, 10);
    if (!newGeliverSender.name.trim() || !newGeliverSender.email.trim() || !newGeliverSender.phone.trim()) {
      flash("err", "Ad, e-posta ve telefon zorunlu.");
      return;
    }
    if (!newGeliverSender.address1.trim() || !newGeliverSender.cityCode || !newGeliverSender.cityName.trim()) {
      flash("err", "Şehir ve adres satırı zorunlu.");
      return;
    }
    if (!newGeliverSender.districtName.trim() || !Number.isFinite(dId)) {
      flash("err", "İlçe seçin (Geliver district ID).");
      return;
    }
    const z = newGeliverSender.zip.replace(/\D/g, "").slice(0, 5);
    if (!z) {
      flash("err", "Posta kodu zorunlu.");
      return;
    }
    setCreatingGeliverSender(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/sender-address"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: newGeliverSender.name.trim(),
          email: newGeliverSender.email.trim(),
          phone: newGeliverSender.phone.trim(),
          address1: newGeliverSender.address1.trim(),
          zip: z,
          shortName: newGeliverSender.shortName.trim() || undefined,
          cityName: newGeliverSender.cityName.trim(),
          cityCode: newGeliverSender.cityCode,
          districtName: newGeliverSender.districtName.trim(),
          districtID: dId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Adres oluşturulamadı");
      flash("ok", "Geliver gönderici adresi oluşturuldu.");
      setNewGeliverSender((s) => ({
        ...s,
        name: "",
        email: "",
        phone: "",
        address1: "",
        shortName: "",
        districtName: "",
        districtId: "",
      }));
      await loadGeliverSenderAddresses();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setCreatingGeliverSender(false);
    }
  }

  async function deleteGeliverPanelAddress(addressId: string) {
    if (!globalThis.confirm?.("Bu Geliver adresini silmek istediğinize emin misiniz?")) return;
    setGeliverOfferBusy(true);
    try {
      const res = await fetch(apiJoin(`providers/geliver/address/${encodeURIComponent(addressId)}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Silinemedi");
      flash("ok", "Adres silindi.");
      await loadVendor();
      await loadGeliverSenderAddresses();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverOfferBusy(false);
    }
  }

  async function loadGeliverWebhooksList() {
    setGeliverWebhooksLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/webhooks"), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Webhook listesi alınamadı");
      setGeliverWebhooks(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
      setGeliverWebhooks([]);
    } finally {
      setGeliverWebhooksLoading(false);
    }
  }

  async function addGeliverWebhookRow() {
    if (!whNew.url.trim()) {
      flash("err", "URL zorunlu.");
      return;
    }
    setGeliverWebhooksLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/webhooks"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ url: whNew.url.trim(), type: whNew.type.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Eklenemedi");
      flash("ok", "Webhook eklendi.");
      setWhNew({ url: "", type: "" });
      await loadGeliverWebhooksList();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverWebhooksLoading(false);
    }
  }

  async function deleteGeliverWebhookRow(id: string) {
    if (!globalThis.confirm?.("Webhook silinsin mi?")) return;
    setGeliverWebhooksLoading(true);
    try {
      const res = await fetch(apiJoin(`providers/geliver/webhooks/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Silinemedi");
      flash("ok", "Silindi.");
      await loadGeliverWebhooksList();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverWebhooksLoading(false);
    }
  }

  async function runGeliverWebhookTestRow() {
    if (!whTest.url.trim() || !whTest.type.trim()) {
      flash("err", "Test için URL ve type gerekli.");
      return;
    }
    setGeliverWebhooksLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/webhooks/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ url: whTest.url.trim(), type: whTest.type.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Test başarısız");
      flash("ok", "Test isteği gönderildi.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverWebhooksLoading(false);
    }
  }

  async function loadGeliverPriceListFromApi() {
    const { lengthCm, widthCm, heightCm, weightKg } = manualShip;
    if (!lengthCm.trim() || !widthCm.trim() || !heightCm.trim() || !weightKg.trim()) {
      flash("err", "Paket ölçülerini doldurun (aşağıdaki «Yeni gönderi» bölümündeki cm/kg ile aynı).");
      return;
    }
    setPriceListLoading(true);
    try {
      const q = new URLSearchParams({
        length: lengthCm.trim(),
        width: widthCm.trim(),
        height: heightCm.trim(),
        weight: weightKg.trim(),
      });
      const res = await fetch(apiJoin(`providers/geliver/prices?${q}`), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Fiyat listesi alınamadı");
      setPriceListRaw(data.raw ?? data);
      flash("ok", "Geliver fiyat yanıtı alındı.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
      setPriceListRaw(null);
    } finally {
      setPriceListLoading(false);
    }
  }

  async function loadGeliverTemplatesList() {
    setTplLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/parcel-templates"), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Şablonlar yüklenemedi");
      setGeliverTemplates(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
      setGeliverTemplates([]);
    } finally {
      setTplLoading(false);
    }
  }

  async function createGeliverTplRow() {
    if (!newTpl.name.trim()) {
      flash("err", "Şablon adı zorunlu.");
      return;
    }
    setTplLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/parcel-templates"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: newTpl.name.trim(),
          length: newTpl.length.trim(),
          width: newTpl.width.trim(),
          height: newTpl.height.trim(),
          weight: newTpl.weight.trim(),
          distanceUnit: "cm",
          massUnit: "kg",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Oluşturulamadı");
      flash("ok", "Şablon oluşturuldu.");
      await loadGeliverTemplatesList();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setTplLoading(false);
    }
  }

  async function deleteGeliverTplRow(id: string) {
    if (!globalThis.confirm?.("Şablon silinsin mi?")) return;
    setTplLoading(true);
    try {
      const res = await fetch(apiJoin(`providers/geliver/parcel-templates/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Silinemedi");
      flash("ok", "Silindi.");
      await loadGeliverTemplatesList();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setTplLoading(false);
    }
  }

  async function loadGeliverProviderAccountsList() {
    setProvLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/provider-accounts"), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Liste alınamadı");
      setGeliverProviderAccounts(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
      setGeliverProviderAccounts([]);
    } finally {
      setProvLoading(false);
    }
  }

  async function createGeliverProvRow() {
    if (!newProv.providerCode.trim() || !newProv.name.trim() || !newProv.username.trim()) {
      flash("err", "providerCode, name, username zorunlu.");
      return;
    }
    const ver = parseInt(newProv.version, 10) || 1;
    setProvLoading(true);
    try {
      const res = await fetch(apiJoin("providers/geliver/provider-accounts"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          providerCode: newProv.providerCode.trim(),
          name: newProv.name.trim(),
          username: newProv.username.trim(),
          password: newProv.password.trim() || undefined,
          version: ver,
          isActive: true,
          isPublic: newProv.isPublic,
          sharable: newProv.sharable,
          isDynamicPrice: newProv.isDynamicPrice,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Eklenemedi");
      flash("ok", "Taşıyıcı hesabı eklendi.");
      setNewProv((p) => ({ ...p, password: "" }));
      await loadGeliverProviderAccountsList();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setProvLoading(false);
    }
  }

  async function deleteGeliverProvRow(id: string) {
    if (!globalThis.confirm?.("Taşıyıcı bağlantısı silinsin mi?")) return;
    setProvLoading(true);
    try {
      const res = await fetch(apiJoin(`providers/geliver/provider-accounts/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Silinemedi");
      flash("ok", "Silindi.");
      await loadGeliverProviderAccountsList();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setProvLoading(false);
    }
  }

  /** Siparişten Geliver taslak gönderi + teklif ekranı (Kargo Gönder → Yeni gönderi). */
  async function startKargolaFromOrder(o: Order) {
    if (!vendor?.geliver_api_token_masked) {
      flash("err", "Önce Genel Ayarlar'dan Geliver API anahtarı kaydedin.");
      return;
    }
    setGeliverCreatingOrderId(o.id);
    setManualGeliverError(null);
    try {
      const force = Boolean(o.geliver_last_error && !o.geliver_label_url);
      const qs = `?mode=draft${force ? "&force=1" : ""}`;
      const res = await fetch(apiJoin(`providers/orders/${o.id}/geliver-shipment${qs}`), { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kargola başlatılamadı");
      const sid = String(data.shipmentId ?? "").trim();
      const snap = data.shipment as Record<string, unknown> | undefined;
      if (sid && snap) {
        setGeliverDraft({ id: sid, shipment: snap });
      }
      if (sid) {
        setOrders((prev) =>
          prev.map((row) =>
            row.id === o.id
              ? {
                  ...row,
                  geliver_shipment_id: sid,
                  geliver_last_error: null,
                  geliver_status: row.geliver_status ?? "waiting_offers",
                }
              : row,
          ),
        );
      }
      const emailLine = String(o.customer_email ?? "").trim();
      const zipDigits = String(o.customer_postal_code ?? "").replace(/\D/g, "").slice(0, 5);
      const addrLine = String(o.customer_address ?? "").trim();
      const streetPart = addrLine.includes("—") ? addrLine.split("—")[0]?.trim() || addrLine : addrLine;
      setManualShip((s) => ({
        ...s,
        recipientName: (o.customer_name || s.recipientName).trim(),
        phone: (o.customer_phone || s.phone).trim(),
        email: emailLine || s.email,
        address1: streetPart || s.address1,
        city: String(o.customer_city ?? "").trim() || s.city,
        district: String(o.customer_district ?? "").trim() || s.district,
        mahalle: s.mahalle,
        zip: zipDigits || s.zip,
      }));
      setTab("kargo");
      setGeliverHub("compose");
      flash(
        "ok",
        "Kargola: Geliver teklifleri burada listelenir. Etiketi https://app.geliver.io adresinde Gönderiler'den «Etiket Al» ile tamamlayın.",
      );
      void loadGeliverBalance({ quiet: true });
      void loadGeliverShipmentList({ silent: true });
      await loadOrders();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    } finally {
      setGeliverCreatingOrderId(null);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const { mahalle, ...rest } = profil as typeof profil & { mahalle?: string };
      const mh = String(mahalle ?? "").trim();
      const addr = String(rest.address ?? "").trim();
      const mergedAddress = mh ? (addr ? `${mh}, ${addr}` : mh) : addr;
      const { contactEmail, ownerEmail, imageUrl, coverUrl, ...profileRest } = rest;
      const body = {
        ...profileRest,
        address: mergedAddress,
        contactEmail,
        ownerEmail,
        imageUrl,
        coverUrl,
      };
      const res = await fetch(apiJoin("providers/profile"), { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        await fetch(apiJoin("providers/integrations"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            whatsappEnabled: integrationForm.whatsappEnabled,
            whatsappFeatureNewOrder: integrationForm.whatsappFeatureNewOrder,
            whatsappFeatureOrderStatus: integrationForm.whatsappFeatureOrderStatus,
            whatsappFeatureCustomerContact: integrationForm.whatsappFeatureCustomerContact,
            whatsappFeatureBulkMarketing: integrationForm.whatsappFeatureBulkMarketing,
          }),
        }).catch(() => {});
        flash("ok", "Profil ve «Siparişi WhatsApp'tan al» ayarı kaydedildi.");
        loadVendor();
      } else flash("err", data.error || "Hata oluştu");
    } finally { setSaving(false); }
  }

  async function uploadSubscriptionReceipt(file: File | null) {
    if (!file) return;
    const ok = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!ok.includes(file.type)) { flash("err", "Yalnızca JPG, PNG, GIF, WebP veya PDF yükleyin."); return; }
    setSubReceiptUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = () => reject(new Error("Dosya okunamadı"));
        r.readAsDataURL(file);
      });
      const res = await fetch(apiJoin("media/upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ dataUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.url) throw new Error(d?.error || "Yükleme başarısız");
      setSubForm((p) => ({ ...p, receiptUrl: d.url }));
      flash("ok", "Dekont yüklendi");
    } catch (e: any) {
      flash("err", e?.message || "Dekont yüklenemedi");
    } finally {
      setSubReceiptUploading(false);
    }
  }

  async function submitSubscriptionRenewal() {
    if (!subForm.startDate || !subForm.endDate) { flash("err", "Abonelik başlangıç ve bitiş tarihi zorunlu."); return; }
    if (subForm.paymentMethod === "bank_transfer" && !subForm.receiptUrl.trim()) { flash("err", "Havale için dekont yükleyin."); return; }
    setSubmittingSub(true);
    try {
      const res = await fetch(apiJoin("providers/subscription-renewal"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(subForm),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.success) throw new Error(d?.error || "Talep gönderilemedi");
      flash("ok", "Abonelik uzatma talebi gönderildi.");
      await loadVendor();
    } catch (e: any) {
      flash("err", e?.message || "Talep gönderilemedi");
    } finally {
      setSubmittingSub(false);
    }
  }

  /* ── Products ── */
  async function loadEcommerceCategories() {
    try {
      const res = await fetch(apiJoin("providers/ecommerce-categories"), { headers: authHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.tree)) setEcommerceCategoryTree(data.tree);
    } catch { /* ignore */ }
  }

  async function loadProductOptions(itemId: number) {
    try {
      const res = await fetch(apiJoin(`providers/item-options/${itemId}`), { headers: authHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.options)) {
        setProductOptions(
          data.options.map((o: { id: number; name: string; required: boolean; multiple: boolean; choices: Array<{ name: string }> }) => ({
            id: o.id,
            name: o.name,
            choicesText: (o.choices || []).map((c) => c.name).join(", "),
            required: Boolean(o.required),
            multiple: Boolean(o.multiple),
          })),
        );
        return;
      }
    } catch { /* ignore */ }
    setProductOptions([]);
  }

  async function saveProductOptions(itemId: number) {
    for (const opt of productOptions) {
      if (!opt.name.trim() || !opt.choicesText.trim()) continue;
      const choices = opt.choicesText.split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name, price: 0 }));
      const body = { menuItemId: itemId, name: opt.name.trim(), required: opt.required, multiple: opt.multiple, choices };
      if (opt.id) {
        await fetch(apiJoin(`providers/item-options/${opt.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(apiJoin("providers/item-options"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        });
      }
    }
  }

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
    setProductOptions([]);
    if (isShop) void loadEcommerceCategories();
    setProductModal("add");
  }
  function openEditProduct(p: MenuItem) {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      price: p.price ? String(p.price) : "",
      salePrice: p.sale_price ? String(p.sale_price) : "",
      description: p.description || "",
      imageUrl: p.image_url || "",
      menuCategoryId: p.menu_category_id ? String(p.menu_category_id) : "",
      ecommerceCategoryId: p.ecommerce_category_id ? String(p.ecommerce_category_id) : "",
      customCategoryName: "",
      useCustomCategory: false,
      isPopular: p.is_popular,
      isVegan: p.is_vegan,
      isSpicy: p.is_spicy,
      stock: p.stock !== null ? String(p.stock) : "",
    });
    if (isShop) {
      void loadEcommerceCategories();
      void loadProductOptions(p.id);
    } else {
      setProductOptions([]);
    }
    setProductModal("edit");
  }
  async function saveProduct() {
    if (!productForm.name || !productForm.price) { flash("err", "İsim ve fiyat zorunlu"); return; }
    if (isShop && !productForm.useCustomCategory && !productForm.ecommerceCategoryId) {
      flash("err", "Alışveriş kategorisi seçin veya özel kategori girin");
      return;
    }
    setSavingProduct(true);
    try {
      const payload: Record<string, unknown> = {
        name: productForm.name,
        price: Number(productForm.price),
        salePrice: productForm.salePrice ? Number(productForm.salePrice) : null,
        description: productForm.description || null,
        imageUrl: productForm.imageUrl || null,
        isPopular: productForm.isPopular,
        isVegan: productForm.isVegan,
        isSpicy: productForm.isSpicy,
        stock: productForm.stock !== "" ? Number(productForm.stock) : null,
      };
      if (isShop) {
        if (productForm.useCustomCategory) {
          payload.customCategoryName = productForm.customCategoryName.trim();
        } else {
          payload.ecommerceCategoryId = Number(productForm.ecommerceCategoryId);
        }
      } else {
        payload.menuCategoryId = productForm.menuCategoryId ? Number(productForm.menuCategoryId) : null;
      }
      const url = productModal === "edit" && editingProduct ? apiJoin(`providers/products/${editingProduct.id}`) : apiJoin("providers/products");
      const method = productModal === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        const itemId = data.item?.id ?? editingProduct?.id;
        if (isShop && itemId && productOptions.length > 0) await saveProductOptions(Number(itemId));
        flash("ok", productModal === "edit" ? "Ürün güncellendi!" : "Ürün eklendi!");
        setProductModal(null);
        loadProducts();
      } else flash("err", data.error || "Hata oluştu");
    } finally { setSavingProduct(false); }
  }
  async function deleteProduct(id: number) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    const res = await fetch(apiJoin(`providers/products/${id}`), { method: "DELETE", headers: authHeaders() });
    if (res.ok) {
      flash("ok", "Ürün silindi.");
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadProducts();
    } else flash("err", "Silinemedi");
  }

  const visibleProducts = catFilter
    ? products.filter((p) => p.menu_category_id === catFilter)
    : products;

  function toggleProductSelection(id: number) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisibleProducts() {
    const visibleIds = visibleProducts.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedProductIds.has(id));
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  async function bulkDeleteProducts() {
    const ids = [...selectedProductIds].filter((id) => visibleProducts.some((p) => p.id === id));
    if (ids.length === 0) {
      flash("err", "Silmek için en az bir ürün seçin.");
      return;
    }
    if (!confirm(`${ids.length} ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setBulkDeletingProducts(true);
    try {
      const res = await fetch(apiJoin("providers/products/bulk-delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        flash("err", data.error || "Toplu silme başarısız");
        return;
      }
      flash("ok", `${data.deleted ?? ids.length} ürün silindi.`);
      setSelectedProductIds(new Set());
      loadProducts();
    } finally {
      setBulkDeletingProducts(false);
    }
  }
  async function addCategory() {
    if (!newCatName.trim()) return; setAddingCat(true);
    try {
      const res = await fetch(apiJoin("providers/categories"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ name: newCatName.trim() }) });
      const data = await res.json();
      if (data.success) { setNewCatName(""); loadProducts(); } else flash("err", data.error || "Kategori eklenemedi");
    } finally { setAddingCat(false); }
  }
  async function deleteCategory(id: number) {
    if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
    await fetch(apiJoin(`providers/categories/${id}`), { method: "DELETE", headers: authHeaders() });
    loadProducts();
  }

  /* ── Orders ── */
  async function updateOrderStatus(orderId: number, newStatus: string, extra?: { estimatedTime?: number; vendorNote?: string }) {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(apiJoin(`providers/orders/${orderId}/status`), { method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus, ...extra }) });
      const data = await res.json();
      if (data.success) { setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, estimated_time: extra?.estimatedTime ?? o.estimated_time, vendor_note: extra?.vendorNote ?? (o as any).vendor_note } : o)); flash("ok", statusActionLabel(newStatus) + " başarıyla uygulandı."); }
      else flash("err", data.error || "Güncelleme başarısız");
    } catch { flash("err", "Bağlantı hatası"); }
    finally { setUpdatingOrder(null); }
  }
  async function confirmOrderWithDetails() {
    if (!confirmModal) return;
    let et: number;
    if (confirmModal.isEcommerce) {
      et = typeof confirmEt === "number" && confirmEt >= 1440 ? confirmEt : 1440;
    } else {
      et = typeof confirmEt === "number" && confirmEt > 0 ? confirmEt : 30;
    }
    await updateOrderStatus(confirmModal.orderId, "confirmed", { estimatedTime: et, vendorNote: confirmNote || undefined });
    setConfirmModal(null); setConfirmNote(""); setConfirmEt(30);
  }

  function formatEstimatedForOrder(o: Order): string | null {
    const m = o.estimated_time;
    if (m == null || !Number.isFinite(Number(m))) return null;
    const n = Number(m);
    if (n >= 1440) return `Kargoya verilme ~${Math.round(n / 1440)} gün`;
    return `Tahmini ${n} dk`;
  }
  function statusActionLabel(s: string) { const m: Record<string, string> = { confirmed: "Sipariş onaylandı", preparing: "Hazırlanıyor", ready: "Hazır", delivered: "Teslim edildi", cancelled: "İptal edildi" }; return m[s] || s; }
  function nextStatusActions(status: string): Array<{ label: string; value: string; cls: string }> {
    const map: Record<string, Array<{ label: string; value: string; cls: string }>> = {
      pending:   [{ label: "✓ Onayla", value: "confirmed", cls: "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border-emerald-500/30" }, { label: "✗ İptal", value: "cancelled", cls: "bg-red-500/20 text-red-300 hover:bg-red-500/40 border-red-500/30" }],
      confirmed: [{ label: "🍳 Hazırlanıyor", value: "preparing", cls: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 border-blue-500/30" }, { label: "✗ İptal", value: "cancelled", cls: "bg-red-500/20 text-red-300 hover:bg-red-500/40 border-red-500/30" }],
      preparing: [{ label: "✓ Hazır", value: "ready", cls: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border-purple-500/30" }, { label: "✗ İptal", value: "cancelled", cls: "bg-red-500/20 text-red-300 hover:bg-red-500/40 border-red-500/30" }],
      ready:     [{ label: "🚴 Kuryeye Verildi", value: "picked_up", cls: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border-purple-500/30" }, { label: "✓ Teslim Edildi", value: "delivered", cls: "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 border-indigo-500/30" }],
      picked_up: [{ label: "✓ Teslim Edildi", value: "delivered", cls: "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border-emerald-500/30" }],
      delivered: [], cancelled: [],
    };
    return map[status] ?? [];
  }

  /* ── Couriers ── */
  async function addCourier() {
    if (!newCourier.name || !newCourier.phone) return; setSavingCourier(true);
    try {
      const res = await fetch(apiJoin("providers/couriers"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(newCourier) });
      if (res.ok) {
        const c = await res.json();
        setCouriers(prev => [...prev, c]);
        setNewCourier({ name: "", phone: "", password: "" });
        const pw = c._defaultPassword || newCourier.phone;
        flash("ok", `Kurye eklendi — Giriş şifresi: ${pw}`);
      }
      else flash("err", "Kurye eklenemedi");
    } catch { flash("err", "Bağlantı hatası"); } finally { setSavingCourier(false); }
  }
  async function deleteCourier(id: number) {
    await fetch(apiJoin(`providers/couriers/${id}`), { method: "DELETE", headers: authHeaders() });
    setCouriers(prev => prev.filter(c => c.id !== id)); flash("ok", "Kurye silindi");
  }
  async function assignCourier(orderId: number, courierId: number) {
    setAssigningOrderId(orderId);
    try {
      const res = await fetch(apiJoin(`providers/orders/${orderId}/assign-courier`), { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ courierId }) });
      if (res.ok) { flash("ok", "Kurye atandı"); await loadOrders(); } else flash("err", "Kurye atanamadı");
    } catch { flash("err", "Bağlantı hatası"); } finally { setAssigningOrderId(null); }
  }

  async function assignUsta(orderId: number, ustaId: number) {
    setAssigningUstaOrderId(orderId);
    try {
      const res = await fetch(apiJoin(`providers/orders/${orderId}/assign-usta`), { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ ustaId }) });
      const d = await res.json();
      if (res.ok) { flash("ok", `${d.ustaName} ustaya atandı`); await loadOrders(); } else flash("err", d.error || "Usta atanamadı");
    } catch { flash("err", "Bağlantı hatası"); } finally { setAssigningUstaOrderId(null); }
  }

  async function assignServis(orderId: number, servisId: number) {
    setAssigningServisOrderId(orderId);
    try {
      const res = await fetch(apiJoin(`providers/orders/${orderId}/assign-servis`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ servisId }),
      });
      const d = await res.json();
      if (res.ok) { flash("ok", `${d.servisName} servis personeline atandı`); await loadOrders(); }
      else flash("err", d.error || "Servis ataması başarısız");
    } catch { flash("err", "Bağlantı hatası"); } finally { setAssigningServisOrderId(null); }
  }

  async function addStaff() {
    if (!newStaff.name || !newStaff.phone) return;
    setSavingStaff(true);
    try {
      const res = await fetch(apiJoin("providers/staff"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(newStaff) });
      if (res.ok) {
        const s = await res.json();
        setStaffList(prev => [...prev, s]);
        const pw = s._defaultPassword || newStaff.phone;
        setNewStaff({ name: "", phone: "", role: "usta", password: "" });
        flash("ok", `${newStaff.role === "usta" ? "Usta" : "Servis elemanı"} eklendi — Giriş şifresi: ${pw}`);
      } else { const d = await res.json(); flash("err", d.error || "Eklenemedi"); }
    } catch { flash("err", "Bağlantı hatası"); } finally { setSavingStaff(false); }
  }

  async function deleteStaff(id: number) {
    if (!confirm("Bu ekip üyesini silmek istediğinize emin misiniz?")) return;
    await fetch(apiJoin(`providers/staff/${id}`), { method: "DELETE", headers: authHeaders() });
    setStaffList(prev => prev.filter(s => s.id !== id));
    flash("ok", "Ekip üyesi silindi");
  }

  async function sendStaffChatMessage() {
    if (!staffChatInput.trim() || !vendor) return;
    const res = await fetch(apiJoin("providers/staff/messages"), {
      method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ channel: staffChatChannel, senderName: vendor.name || "İşletme", message: staffChatInput.trim() }),
    });
    if (res.ok) {
      const m = await res.json();
      setStaffChatMessages(prev => [...prev, m]);
      setStaffChatInput("");
      setTimeout(() => staffChatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  /* ── Chat — Yeni Sistem ── */
  async function openChat(order: Order) {
    if (!vendor) return;
    setChatOpeningOrderId(order.id);
    try {
      const customerPhone = order.customer_phone || `musteri_${order.id}`;
      const members: Array<{ type: string; id: string; name: string; phone?: string }> = [
        { type: "vendor",   id: String(vendor.id), name: vendor.name },
        { type: "customer", id: customerPhone,     name: order.customer_name || "Müşteri", phone: customerPhone },
      ];
      if (order.assigned_usta_id && order.usta_name) {
        members.push({ type: "usta", id: String(order.assigned_usta_id), name: order.usta_name });
      }
      const res = await fetch(apiJoin("chat/rooms"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_dm",
          orderId: order.id,
          orderNumber: order.order_number,
          name: `#${order.order_number} — ${vendor.name}`,
          vendorId: vendor.id,
          createdByType: "vendor",
          createdById: String(vendor.id),
          members,
        }),
      });
      if (res.ok) {
        const room = await res.json();
        window.dispatchEvent(new CustomEvent("Yekpare:openChatRoom", { detail: { roomId: room.id } }));
      } else {
        flash("err", "Chat odası açılamadı");
      }
    } catch { flash("err", "Bağlantı hatası"); } finally { setChatOpeningOrderId(null); }
  }

  /* ── Kasa (Accounting) ── */
  function saveExpense() {
    if (!kasaForm.description || !kasaForm.amount || !vendor) return;
    const newExpense: Expense = { id: uid(), type: kasaForm.type as "income" | "expense", category: kasaForm.category, description: kasaForm.description, amount: Number(kasaForm.amount), date: new Date().toISOString() };
    const updated = [newExpense, ...expenses];
    setExpenses(updated); lsSet(lsKey(vendor.id, "expenses"), updated);
    setKasaForm({ type: "expense", category: "diger", description: "", amount: "" });
    flash("ok", "Kayıt eklendi");
  }
  function deleteExpense(id: string) {
    if (!vendor) return;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated); lsSet(lsKey(vendor.id, "expenses"), updated);
  }
  const kasaSummary = useMemo(() => {
    const deliveredRevenue = orders.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.subtotal), 0);
    const manualIncome = expenses.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const manualExpense = expenses.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
    const totalRevenue = deliveredRevenue + manualIncome;
    return { deliveredRevenue, manualIncome, manualExpense, totalRevenue, net: totalRevenue - manualExpense };
  }, [orders, expenses]);

  /* ── CRM (Customer Relations) ── */
  const crmCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; orderCount: number; totalSpent: number; lastOrder: string }>();
    orders.forEach(o => {
      if (!o.customer_phone) return;
      const existing = map.get(o.customer_phone);
      if (!existing) {
        map.set(o.customer_phone, { name: o.customer_name || "İsimsiz", phone: o.customer_phone, orderCount: 1, totalSpent: Number(o.total), lastOrder: o.created_at });
      } else {
        existing.orderCount++;
        existing.totalSpent += Number(o.total);
        if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  function saveCrmNote() {
    if (!crmEditPhone || !vendor) return;
    const updated = { ...crmNotes, [crmEditPhone]: { ...crmEditForm, lastUpdated: new Date().toISOString() } };
    setCrmNotes(updated); lsSet(lsKey(vendor.id, "crm_notes"), updated);
    setCrmEditPhone(null); flash("ok", "Müşteri notu kaydedildi");
  }

  /* ── Vendor Customers (DB) ── */
  async function loadVendorCustomers() {
    try {
      const res = await fetch(apiJoin("providers/customers"), { headers: authHeaders() });
      if (res.ok) setVendorCustomers(await res.json());
    } catch { /* noop */ }
  }
  async function addVendorCustomer() {
    if (!newCustomer.first_name.trim() || !newCustomer.phone.trim()) return;
    setSavingCustomer(true);
    try {
      const res = await fetch(apiJoin("providers/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) { await loadVendorCustomers(); setNewCustomer(EMPTY_CUST); setShowAddCustomer(false); flash("ok", "Müşteri eklendi"); }
    } catch { /* noop */ } finally { setSavingCustomer(false); }
  }
  async function deleteVendorCustomer(id: number) {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    await fetch(apiJoin(`providers/customers/${id}`), { method: "DELETE", headers: authHeaders() });
    setVendorCustomers(prev => prev.filter(c => c.id !== id));
    flash("ok", "Müşteri silindi");
  }
  async function saveCustomerEdit() {
    if (!editingCustomer) return;
    const res = await fetch(apiJoin(`providers/customers/${editingCustomer.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(editingCustomer),
    });
    if (res.ok) { await loadVendorCustomers(); setEditingCustomer(null); flash("ok", "Müşteri güncellendi"); }
  }

  /* ── Repair ── */
  function saveRepair() {
    if (!repairForm.customerName || !repairForm.deviceType || !vendor) return;
    const isEdit = repairModal === "edit";
    let updated: RepairTicket[];
    if (isEdit) {
      updated = repairs.map(r => r.id === repairForm.id ? { ...repairForm } : r);
    } else {
      updated = [{ ...repairForm, id: uid(), createdAt: new Date().toISOString() }, ...repairs];
    }
    setRepairs(updated); lsSet(lsKey(vendor.id, "repairs"), updated);
    setRepairModal(null); setRepairForm(EMPTY_REPAIR);
    flash("ok", isEdit ? "Servis güncellendi" : "Servis kaydı oluşturuldu");
  }
  function deleteRepair(id: string) {
    if (!vendor || !confirm("Bu servis kaydını silmek istediğinize emin misiniz?")) return;
    const updated = repairs.filter(r => r.id !== id);
    setRepairs(updated); lsSet(lsKey(vendor.id, "repairs"), updated);
  }
  function updateRepairStatus(id: string, status: RepairTicket["status"]) {
    if (!vendor) return;
    const updated = repairs.map(r => r.id === id ? { ...r, status } : r);
    setRepairs(updated); lsSet(lsKey(vendor.id, "repairs"), updated);
    flash("ok", "Servis durumu güncellendi");
  }

  /* ── Employees ── */
  function saveEmployee() {
    if (!empForm.name || !empForm.role || !vendor) return;
    const isEdit = empModal === "edit";
    let updated: Employee[];
    if (isEdit) { updated = employees.map(e => e.id === empForm.id ? { ...empForm } : e); }
    else { updated = [{ ...empForm, id: uid() }, ...employees]; }
    setEmployees(updated); lsSet(lsKey(vendor.id, "employees"), updated);
    setEmpModal(null); setEmpForm(EMPTY_EMP);
    flash("ok", isEdit ? "Personel güncellendi" : "Personel eklendi");
  }
  function deleteEmployee(id: string) {
    if (!vendor || !confirm("Bu çalışanı silmek istediğinize emin misiniz?")) return;
    const updated = employees.filter(e => e.id !== id);
    setEmployees(updated); lsSet(lsKey(vendor.id, "employees"), updated);
  }

  /* ── Assets ── */
  function saveAsset() {
    if (!assetForm.name || !vendor) return;
    const isEdit = assetModal === "edit";
    let updated: Asset[];
    if (isEdit) { updated = assets.map(a => a.id === assetForm.id ? { ...assetForm } : a); }
    else { updated = [{ ...assetForm, id: uid() }, ...assets]; }
    setAssets(updated); lsSet(lsKey(vendor.id, "assets"), updated);
    setAssetModal(null); setAssetForm(EMPTY_ASSET);
    flash("ok", isEdit ? "Demirbaş güncellendi" : "Demirbaş eklendi");
  }
  function deleteAsset(id: string) {
    if (!vendor || !confirm("Bu demirbaşı silmek istediğinize emin misiniz?")) return;
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated); lsSet(lsKey(vendor.id, "assets"), updated);
  }

  /* ── Tasks ── */
  function saveTask() {
    if (!taskForm.title || !vendor) return;
    const isEdit = taskModal === "edit";
    let updated: Task[];
    if (isEdit) { updated = tasks.map(t => t.id === taskForm.id ? { ...taskForm } : t); }
    else { updated = [{ ...taskForm, id: uid(), createdAt: new Date().toISOString() }, ...tasks]; }
    setTasks(updated); lsSet(lsKey(vendor.id, "tasks"), updated);
    setTaskModal(null); setTaskForm(EMPTY_TASK);
    flash("ok", isEdit ? "Görev güncellendi" : "Görev oluşturuldu");
  }
  function deleteTask(id: string) {
    if (!vendor || !confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated); lsSet(lsKey(vendor.id, "tasks"), updated);
  }
  function moveTask(id: string, status: Task["status"]) {
    if (!vendor) return;
    const updated = tasks.map(t => t.id === id ? { ...t, status } : t);
    setTasks(updated); lsSet(lsKey(vendor.id, "tasks"), updated);
  }

  /* ── Aktarım: Export ── */
  function exportProductsCSV() {
    if (products.length === 0) { flash("err", "Dışa aktarılacak ürün yok."); return; }
    const header = ["name", "price", "sale_price", "description", "category", "stock", "is_popular", "is_vegan", "is_spicy", "image_url"];
    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.menu_category_id)?.name || "";
      return [p.name, p.price || "", p.sale_price || "", p.description || "", cat, p.stock ?? "", p.is_popular ? "evet" : "hayır", p.is_vegan ? "evet" : "hayır", p.is_spicy ? "evet" : "hayır", p.image_url || ""].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${vendor?.slug || "urunler"}_export.csv`; a.click(); URL.revokeObjectURL(url);
    flash("ok", `${products.length} ürün dışa aktarıldı.`);
  }

  function downloadTemplate() {
    const header = ["name", "price", "sale_price", "description", "category", "stock", "is_popular", "is_vegan", "is_spicy", "image_url"];
    const examples = [
      ["Margherita Pizza", "89.90", "", "Domates soslu, mozzarella peynirli klasik pizza", "Pizzalar", "50", "evet", "hayır", "hayır", ""],
      ["Karışık Pizza", "119.90", "99.90", "Salam, mantar, biber, mısır ve mozzarella", "Pizzalar", "30", "evet", "hayır", "hayır", ""],
      ["Ayran", "15.00", "", "Soğuk ayran 400ml", "İçecekler", "", "hayır", "evet", "hayır", ""],
      ["Acı Kanat", "79.90", "", "Baharatlı çıtır tavuk kanadı (8 adet)", "Atıştırmalık", "20", "hayır", "hayır", "evet", "https://ornek.com/gorsel.jpg"],
    ];
    const rows = examples.map(r => r.map(v => `"${v}"`).join(","));
    const csv = [header.join(","), ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "Yekpare_urun_sablonu.csv"; a.click(); URL.revokeObjectURL(url);
  }

  /* ── Aktarım: Parse CSV ── */
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImportDone(false); setImportRows([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string || "").replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { flash("err", "Dosya boş veya geçersiz format."); return; }
      const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const COL: Record<string, number> = {};
      ["name", "price", "sale_price", "description", "category", "stock", "is_popular", "is_vegan", "is_spicy", "image_url"].forEach(col => { const idx = header.indexOf(col); if (idx !== -1) COL[col] = idx; });
      if (COL["name"] === undefined || COL["price"] === undefined) { flash("err", "CSV'de 'name' ve 'price' sütunları zorunlu."); return; }
      const parsed: ImportRow[] = lines.slice(1).map(line => {
        const cols = parseCSVLine(line);
        return { name: cols[COL["name"]] || "", price: cols[COL["price"]] || "", sale_price: cols[COL["sale_price"] ?? -1] || "", description: cols[COL["description"] ?? -1] || "", category: cols[COL["category"] ?? -1] || "", stock: cols[COL["stock"] ?? -1] || "", is_popular: cols[COL["is_popular"] ?? -1] || "hayır", is_vegan: cols[COL["is_vegan"] ?? -1] || "hayır", is_spicy: cols[COL["is_spicy"] ?? -1] || "hayır", image_url: cols[COL["image_url"] ?? -1] || "", _status: "pending" as const };
      }).filter(r => r.name.trim());
      setImportRows(parsed);
      if (parsed.length === 0) flash("err", "İçe aktarılacak geçerli satır bulunamadı.");
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
      else if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    result.push(cur.trim()); return result;
  }

  async function runImport() {
    if (!importRows.length) return;
    setImporting(true);
    const updatedRows = [...importRows];

    // Ensure categories exist first
    const catMap: Record<string, number> = {};
    categories.forEach(c => { catMap[c.name] = c.id; });
    const uniqueCats = [...new Set(importRows.map(r => r.category).filter(Boolean))];
    for (const catName of uniqueCats) {
      if (!catMap[catName]) {
        try {
          const res = await fetch(apiJoin("providers/categories"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ name: catName }) });
          const d = await res.json();
          if (d.success && d.category?.id) catMap[catName] = d.category.id;
        } catch { /* noop */ }
      }
    }

    for (let i = 0; i < updatedRows.length; i++) {
      const r = updatedRows[i];
      if (!r.name || !r.price) { updatedRows[i] = { ...r, _status: "err", _msg: "İsim veya fiyat eksik" }; continue; }
      const price = parseFloat(r.price.replace(",", "."));
      if (isNaN(price) || price <= 0) { updatedRows[i] = { ...r, _status: "err", _msg: "Geçersiz fiyat" }; continue; }
      try {
        const payload = { name: r.name, price, salePrice: r.sale_price ? parseFloat(r.sale_price.replace(",", ".")) || null : null, description: r.description || null, imageUrl: r.image_url || null, menuCategoryId: catMap[r.category] || null, isPopular: ["evet", "yes", "1", "true"].includes((r.is_popular || "").toLowerCase()), isVegan: ["evet", "yes", "1", "true"].includes((r.is_vegan || "").toLowerCase()), isSpicy: ["evet", "yes", "1", "true"].includes((r.is_spicy || "").toLowerCase()), stock: r.stock ? parseInt(r.stock) || null : null };
        const res = await fetch(apiJoin("providers/products"), { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(payload) });
        const d = await res.json();
        updatedRows[i] = { ...r, _status: d.success ? "ok" : "err", _msg: d.success ? "Eklendi ✓" : (d.error || "Hata") };
      } catch { updatedRows[i] = { ...r, _status: "err", _msg: "Bağlantı hatası" }; }
      setImportRows([...updatedRows]);
    }
    setImporting(false); setImportDone(true);
    const ok = updatedRows.filter(r => r._status === "ok").length;
    flash("ok", `İçe aktarım tamamlandı: ${ok}/${updatedRows.length} ürün eklendi.`);
    loadProducts();
  }

  function logout() { localStorage.removeItem("providerSession"); navigate("/servis-saglayici-giris"); }

  /* ── Render Guards ── */
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
    </div>
  );
  if (!vendor) return null;

  const vt = vendor.provider_type || vendor.vendor_type;
  const isDelivery = ["siparis", "delivery"].includes(vt);
  const isShop = ["alisveris", "ecommerce"].includes(vt);
  const isTourism = vt === "turizm";
  const isApproved = vendor.application_status === "approved";
  const providerSubtypeKey = String(vendor.provider_subtype || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, "_");
  const canUseTableService =
    isDelivery &&
    new Set(["", "restoran", "restaurant", "cafe", "kafe", "restoran-kafe", "restoran_cafe"]).has(providerSubtypeKey);

  const membershipTier = String(
    (vendor as { membership_tier?: string; membershipTier?: string }).membership_tier ??
      (vendor as { membershipTier?: string }).membershipTier ??
      "gold",
  ).toLowerCase();
  function tierAllowsTab(tabId: string): boolean {
    if (membershipTier === "gold" || membershipTier === "premium") return true;
    return PROVIDER_STANDARD_TAB_IDS.has(tabId);
  }

  const TABS = [
    { id: "anasayfa",   label: "🏠 Ana Sayfa",    show: true },
    { id: "profil",     label: "👤 Profil",       show: true },
    { id: "platform-destek", label: "🎫 Platform desteği", show: true },
    { id: "genel-ayarlar", label: "⚙️ Genel Ayarlar", show: isApproved },
    { id: "temalar", label: "🎨 Temalar", show: isApproved && (isDelivery || isShop || isTourism) },
    { id: "posta",      label: "📧 Posta & Bildirim", show: isApproved },
    { id: "bildirimler", label: "🔔 Bildirimler",      show: isApproved },
    { id: "duyurular",  label: "📣 Duyurular",       show: isApproved },
    { id: "kargo",      label: "📦 Kargo Gönder", show: isApproved },
    { id: "urunler",    label: isDelivery ? "🍽️ Menü" : "🛍️ Ürünler", show: isDelivery || isShop },
    { id: "siparisler", label: "📦 Siparişler",   show: isDelivery || isShop },
    { id: "turizm-ilanlar",    label: "✈️ İlanlarım",      show: isTourism && isApproved },
    { id: "turizm-rezervasyon", label: "📅 Rezervasyonlar", show: isTourism && isApproved },
    { id: "ekibim",     label: "👥 Ekibim",          show: isApproved },
    { id: "kasiyer-ekrani", label: "🖥️ Kasiyer",    show: isApproved && isDelivery },
    { id: "kasa",       label: "💰 Kasa",         show: isApproved },
    { id: "musteriler", label: "👥 Müşteriler",   show: isApproved },
    { id: "servis",     label: "🔧 Servis",        show: isApproved },
    { id: "personel",   label: "👷 Personel",     show: isApproved },
    { id: "demirbas",   label: "🏢 Demirbaş",     show: isApproved },
    { id: "blog",       label: "📝 Blog",        show: isApproved },
    { id: "is-takibi",  label: "📋 İş Takibi",   show: isApproved },
    { id: "rezervasyonlar", label: "📅 Masa Rezerv.", show: isApproved && isDelivery },
    { id: "qr-menu",    label: "📱 QR Menü",      show: isApproved && isDelivery },
    { id: "aktar",      label: "📤 Aktarım",      show: isApproved && !isTourism },
  ].filter(t => t.show).filter((t) => tierAllowsTab(t.id));
  const TAB_BY_ID = new Map(TABS.map((t) => [t.id, t]));
  const TAB_GROUPS = [
    { title: "GENEL", ids: ["anasayfa", "profil", "platform-destek", "genel-ayarlar", "temalar", "posta", "bildirimler", "kargo"] },
    { title: "İÇERİK YÖNETİMİ", ids: ["blog", "duyurular", "turizm-ilanlar", "turizm-rezervasyon"] },
    { title: "SIPARIS & SATIS", ids: ["siparisler", "urunler", "rezervasyonlar", "qr-menu"] },
    { title: "OPERASYON", ids: ["ekibim", "kasiyer-ekrani", "personel", "musteriler", "kasa", "servis", "demirbas", "is-takibi"] },
    { title: "VERI", ids: ["aktar"] },
  ].map((g) => ({ title: g.title, tabs: g.ids.map((id) => TAB_BY_ID.get(id)).filter(Boolean) as typeof TABS }))
    .filter((g) => g.tabs.length > 0);
  const QUICK_TOP_LINKS = TABS.filter((t) => ["siparisler", "personel", "urunler", "musteriler", "kasa"].includes(t.id));

  /* ── Repair status helpers ── */
  const repairStatusMap: Record<string, { label: string; cls: string }> = {
    received:       { label: "Teslim Alındı",    cls: "bg-blue-50 text-blue-900 border border-blue-200" },
    diagnosing:     { label: "Teşhis Ediliyor",  cls: "bg-amber-50 text-amber-900 border border-amber-200" },
    repairing:      { label: "Tamirde",           cls: "bg-purple-50 text-purple-900 border border-purple-200" },
    waiting_parts:  { label: "Malzeme Bekleniyor", cls: "bg-orange-50 text-orange-900 border border-orange-200" },
    ready:          { label: "Teslime Hazır",     cls: "bg-emerald-50 text-emerald-900 border border-emerald-200" },
    delivered:      { label: "Teslim Edildi",     cls: "bg-slate-100 text-slate-800 border border-slate-200" },
    cancelled:      { label: "İptal",             cls: "bg-red-50 text-red-800 border border-red-200" },
  };

  const conditionMap: Record<string, string> = { yeni: "🟢 Yeni", iyi: "🟡 İyi", orta: "🟠 Orta", kötü: "🔴 Kötü" };
  const priorityMap: Record<string, { label: string; cls: string }> = {
    low:    { label: "Düşük",  cls: "bg-slate-100 text-slate-800 border border-slate-200" },
    medium: { label: "Orta",   cls: "bg-amber-50 text-amber-900 border border-amber-200" },
    high:   { label: "Yüksek", cls: "bg-red-50 text-red-900 border border-red-200" },
  };

  const vitrinPublicPath = (() => {
    const slug = (vendor.slug || "").trim() || String(vendor.id);
    const mapBid = String(vendor.linked_map_business_id ?? "").trim();
    if (isDelivery) return `/siparis/satici/${slug}`;
    if (isShop) return `/alisveris/magaza/${slug}`;
    if (mapBid) return `/kesfet/isletme/${mapBid}`;
    if (slug) return `/kesfet/${slug}`;
    return `/siparis/satici/${slug}`;
  })();
  const vendorPublicUrl = buildTableOrderLink();
  const qrUrl = qrCodeImageUrl(vendorPublicUrl);
  const trMoney = (value: number) =>
    `₺${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value || 0)))}`;
  const stockKnownProducts = products.filter((p) => p.stock !== null);
  const lowStockProducts = stockKnownProducts.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5);
  const outOfStockProducts = stockKnownProducts.filter((p) => Number(p.stock) <= 0);
  const featuredProducts = products.filter((p) => p.is_popular);
  const discountedProducts = products.filter((p) => p.sale_price && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price || 0));
  const productsWithoutImage = products.filter((p) => !String(p.image_url || "").trim());
  const productsWithoutDescription = products.filter((p) => !String(p.description || "").trim());
  const shopOrderStatus = {
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => ["confirmed", "preparing", "ready", "picked_up"].includes(o.status)).length,
    shipped: orders.filter((o) => ["picked_up"].includes(o.status)).length,
    delivered: orders.filter((o) => ["delivered", "completed"].includes(o.status)).length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };
  const shopRevenue = orders
    .filter((o) => !["cancelled"].includes(o.status))
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const recentShopOrders = [...orders]
    .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))
    .slice(0, 4);
  const hasStorefrontTheme = Boolean(String(vendor.theme_key || "").trim());
  const hasPaymentGateway = Boolean(vendor.paytr_configured || vendor.iyzico_configured);
  const hasGeliverSetup = Boolean(
    String(vendor.geliver_api_token_masked || "").trim() &&
      String(vendor.geliver_sender_zip || "").trim() &&
      String(vendor.geliver_sender_mahalle || "").trim(),
  );
  const hasApprovedDomain = (vendor.custom_domains || []).some((d) => d.verified_at || String(d.status || "").toLowerCase() === "approved");
  const ecommerceReadiness: EcommerceReadinessItem[] = [
    { label: "Logo ve kapak görseli", done: Boolean(profil.imageUrl && profil.coverUrl), action: "Profil görsellerini tamamla", tab: "profil" },
    { label: "İletişim ve WhatsApp", done: Boolean(profil.phone && profil.ownerEmail && profil.whatsapp), action: "İletişimi tamamla", tab: "profil" },
    { label: "Katalog kategorileri", done: categories.length > 0, action: "Kategori ekle", tab: "urunler" },
    { label: "Yayındaki ürünler", done: products.length >= 5, action: "Ürün ekle", tab: "urunler" },
    { label: "Öne çıkan ürünler", done: featuredProducts.length > 0, action: "Ürünleri öne çıkar", tab: "urunler" },
    { label: "Kargo altyapısı", done: hasGeliverSetup, action: "Geliver ayarlarına git", tab: "genel-ayarlar" },
    { label: "Online ödeme", done: hasPaymentGateway, action: "PayTR / iyzico kur", tab: "genel-ayarlar" },
    { label: "Vitrin görünümü", done: hasStorefrontTheme, action: "Görünüm seç", tab: "temalar" },
  ];
  const ecommerceReadyCount = ecommerceReadiness.filter((item) => item.done).length;
  const ecommerceReadinessPct = Math.round((ecommerceReadyCount / Math.max(1, ecommerceReadiness.length)) * 100);

  const providerSessionForBroadcast = getSession();

  return (
    <div className="min-h-screen bg-gray-100">
      {providerSessionForBroadcast?.id && providerSessionForBroadcast?.email ? (
        <PlatformBroadcastStrip
          mode="vendor"
          vendorId={Number(providerSessionForBroadcast.id)}
          vendorEmail={String(providerSessionForBroadcast.email)}
        />
      ) : null}
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-10 bg-white">
        <div className="w-full max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 border border-indigo-300 rounded-lg flex items-center justify-center text-indigo-900 font-bold text-sm flex-shrink-0">
              {vendor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-gray-900 font-semibold text-sm leading-tight">{vendor.name}</div>
              <div className="text-gray-500 text-xs">{TYPE_LABELS[vt] || vt}{vendor.provider_subtype ? ` · ${SUBTYPE_LABELS[vendor.provider_subtype] || vendor.provider_subtype}` : ""}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden xl:flex items-center gap-1.5 mr-2">
              {QUICK_TOP_LINKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                    tab === t.id
                      ? "bg-gradient-to-b from-indigo-50 to-white text-gray-900 border-indigo-300 shadow-sm ring-2 ring-indigo-500/30"
                      : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {isApproved && (
              <a href={vitrinPublicPath} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
                Vitrin →
              </a>
            )}
            <button onClick={logout} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition">Çıkış</button>
          </div>
        </div>
      </header>

      {/* Yeni sipariş banner */}
      {newOrderAlert && (
        <div className="sticky top-14 z-20 bg-amber-500 text-gray-900 px-4 py-2.5 flex items-center justify-between shadow-lg border-b border-amber-600/30">
          <div className="flex items-center gap-2 font-semibold text-sm"><span className="animate-bounce">🔔</span><span>Yeni sipariş geldi!</span></div>
          <button onClick={() => { setNewOrderAlert(false); setTab("siparisler"); setOrderStatusFilter("pending"); loadOrders(); }} className="px-3 py-1 bg-white/80 hover:bg-white border border-amber-700/20 rounded-lg text-xs font-bold text-gray-900 transition">Siparişlere Git →</button>
        </div>
      )}

      <div className="w-full max-w-[1700px] mx-auto px-4 py-6">
        {/* Stats */}
        {isApproved && (
          <div
            className={`grid grid-cols-2 gap-3 mb-6 ${membershipTier === "standard" ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}
          >
            <StatCard label="Toplam Sipariş" value={vendor.order_count} icon="📦" onClick={() => setTab("siparisler")} />
            <StatCard label="Bekleyen" value={vendor.pending_orders} icon="⏳" highlight={vendor.pending_orders > 0} onClick={() => { setTab("siparisler"); setOrderStatusFilter("pending"); }} />
            <StatCard label="Ürün / Menü" value={vendor.product_count} icon="🍽️" onClick={() => setTab("urunler")} />
            {membershipTier !== "standard" ? (
              <StatCard label="Personel" value={employees.filter(e => e.status === "active").length} icon="👷" onClick={() => setTab("personel")} />
            ) : null}
          </div>
        )}

        {isApproved && membershipTier === "standard" && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm">
            <p className="font-bold text-amber-900 mb-1">İşletme üyeliği</p>
            <p className="text-xs leading-relaxed mb-2">
              Günde <strong>10 TL</strong>, yıllık <strong>3650 TL</strong> işletme üyeliğiyle web sitesi, profil, menü/ürünler, siparişler,
              rezervasyon, kargo/kurye, servis personeli, QR menü, blog/duyuru, Keşfet görünürlüğü ve domain bağlama
              özellikleri tek panelden yönetilir.
            </p>
            <p className="text-[11px] text-amber-800">
              Özel entegrasyon, kurumsal ihtiyaçlar ve ek geliştirmeler için Yekpare iletişim ekibiyle görüşebilirsiniz.
            </p>
          </div>
        )}

        {isApproved && membershipTier === "gold" && (
          <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 text-xs text-indigo-950">
            <span className="font-bold">İşletme üyeliği:</span> günde 10 TL, yıllık 3650 TL paketle tam panel erişimi, çoklu mağaza/ilan/araç yönetimi,
            sipariş, rezervasyon, kargo/kurye, personel ve domain özellikleri kullanılabilir.
          </div>
        )}

        {isApproved && membershipTier === "premium" && (
          <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/90 p-3 text-xs text-violet-950">
            <span className="font-bold">İşletme üyeliği:</span> tüm modüller + mağaza / ilan / araç ekleme (platform kuralları ve teknik
            limitler dahilinde). Liste fiyatı: <span className="font-mono">10 TL/gün · 3650 TL/yıl</span>.
          </div>
        )}

        {/* Flash — hatalar 45 sn; yapışkan: Kargo/Geliver gibi uzun formlarda üstte kalır */}
        {msg && (
          <div
            className={`sticky top-14 z-30 mb-4 p-3 rounded-xl text-sm font-medium border shadow-md flex items-start gap-3 ${
              msg.type === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <p className="flex-1 min-w-0 whitespace-pre-wrap break-words leading-snug">{msg.text}</p>
            <button
              type="button"
              onClick={dismissFlash}
              className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold border border-current/30 hover:bg-black/5"
            >
              Kapat
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-5 items-start">
          <aside className="bg-white border border-gray-200 rounded-2xl p-3 h-fit lg:sticky lg:top-[84px] shadow-sm">
            <p className="text-gray-900 text-[11px] font-bold tracking-wider px-2 pb-2">SERVİS SAĞLAYICI YÖNETİMİ</p>
            <div className="space-y-3">
              {TAB_GROUPS.map((g) => (
                <div key={g.title}>
                  <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide px-2 mb-1.5">{g.title}</p>
                  <div className="space-y-1">
                    {g.tabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                          tab === t.id
                            ? "bg-gradient-to-b from-indigo-50 to-white text-gray-900 border-indigo-300 shadow-md ring-2 ring-indigo-500/25"
                            : "bg-gray-50 text-gray-800 border-gray-200 hover:bg-white hover:border-gray-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0">

        {/* ─── TAB: ANASAYFA ─── */}
        {tab === "anasayfa" && (
          <div className="space-y-4">
            {isApproved && isDelivery && (!profil.whatsapp?.trim() || !siparisWhatsAppAktif) ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 text-sm text-emerald-950">
                  <strong>Siparişi WhatsApp&apos;tan al</strong> henüz yapılandırılmadı. WhatsApp numaranızı girin ve bildirimi açın; siparişler size mesaj olarak düşsün.
                </div>
                <button
                  type="button"
                  onClick={() => setTab("profil")}
                  className="shrink-0 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition"
                >
                  Profil → WhatsApp ayarı
                </button>
              </div>
            ) : null}
            {isApproved && isShop ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-lg">
                  <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-200">E-ticaret komuta merkezi</p>
                          <h2 className="mt-1 text-2xl font-black leading-tight">Mağazanızın satış, katalog ve vitrin durumu</h2>
                          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-indigo-100/90">
                            Mağaza özeti: sipariş akışı, stok riski, katalog kalitesi ve vitrin hazırlığı tek bakışta.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a href={vitrinPublicPath} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
                            Vitrini aç
                          </a>
                          <button type="button" onClick={() => setTab("temalar")} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
                            Tema düzenle
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <EcommerceMetricCard label="Brüt sipariş" value={orders.length ? trMoney(shopRevenue) : String(vendor.order_count || 0)} hint="İptal dışı sipariş toplamı" tone="indigo" />
                        <EcommerceMetricCard label="Bekleyen sipariş" value={String(shopOrderStatus.pending || vendor.pending_orders || 0)} hint="Onay / hazırlık bekliyor" tone={shopOrderStatus.pending > 0 ? "amber" : "emerald"} />
                        <EcommerceMetricCard label="Ürün yayında" value={String(products.length || vendor.product_count || 0)} hint={`${featuredProducts.length} öne çıkan · ${discountedProducts.length} indirimli`} tone="emerald" />
                        <EcommerceMetricCard label="Stok alarmı" value={String(lowStockProducts.length + outOfStockProducts.length)} hint={`${outOfStockProducts.length} tükenen · ${lowStockProducts.length} düşük`} tone={outOfStockProducts.length ? "rose" : "amber"} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                          { label: "Bekliyor", count: shopOrderStatus.pending, cls: "bg-amber-400/15 text-amber-100 border-amber-300/30" },
                          { label: "İşleniyor", count: shopOrderStatus.processing, cls: "bg-sky-400/15 text-sky-100 border-sky-300/30" },
                          { label: "Kargoda", count: shopOrderStatus.shipped, cls: "bg-violet-400/15 text-violet-100 border-violet-300/30" },
                          { label: "Teslim", count: shopOrderStatus.delivered, cls: "bg-emerald-400/15 text-emerald-100 border-emerald-300/30" },
                          { label: "İptal", count: shopOrderStatus.cancelled, cls: "bg-rose-400/15 text-rose-100 border-rose-300/30" },
                        ].map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => {
                              setTab("siparisler");
                              setOrderStatusFilter(s.label === "İşleniyor" ? "confirmed" : s.label === "Kargoda" ? "picked_up" : s.label === "Teslim" ? "delivered" : s.label === "İptal" ? "cancelled" : "pending");
                            }}
                            className={`rounded-2xl border px-3 py-2 text-left transition hover:bg-white/10 ${s.cls}`}
                          >
                            <div className="text-lg font-black">{s.count}</div>
                            <div className="text-[11px] font-bold">{s.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-indigo-100">Mağaza hazırlığı</p>
                          <p className="text-sm text-indigo-100/80">{ecommerceReadyCount}/{ecommerceReadiness.length} madde tamamlandı</p>
                        </div>
                        <div className="text-3xl font-black">{ecommerceReadinessPct}%</div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${ecommerceReadinessPct}%` }} />
                      </div>
                      <div className="mt-4 space-y-2">
                        {ecommerceReadiness.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setTab(item.tab)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs hover:bg-white/10"
                          >
                            <span className={item.done ? "font-bold text-emerald-100" : "font-bold text-white"}>{item.done ? "✓" : "•"} {item.label}</span>
                            <span className="text-[10px] font-semibold text-indigo-100/80">{item.done ? "Tamam" : item.action}</span>
                          </button>
                        ))}
                      </div>
                      {hasApprovedDomain ? (
                        <p className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100">
                          Özel domain onaylı; vitrin profesyonel yayına hazır.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm xl:col-span-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-gray-950">Katalog sağlığı</h3>
                        <p className="text-xs text-gray-500">Stok, görsel, açıklama ve kampanya sinyalleri.</p>
                      </div>
                      <button type="button" onClick={() => setTab("urunler")} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100">
                        Ürünlere git
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <EcommerceSignalCard title="Kategori" value={String(categories.length)} detail="Alışveriş ağacı + özel" />
                      <EcommerceSignalCard title="Öne çıkan" value={String(featuredProducts.length)} detail="Vitrin rafı için" />
                      <EcommerceSignalCard title="Görselsiz" value={String(productsWithoutImage.length)} detail="Dönüşümü düşürür" warn={productsWithoutImage.length > 0} />
                      <EcommerceSignalCard title="Açıklamasız" value={String(productsWithoutDescription.length)} detail="SEO / güven" warn={productsWithoutDescription.length > 0} />
                    </div>
                    {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) ? (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-black text-amber-950">Stok aksiyonu önerisi</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[...outOfStockProducts, ...lowStockProducts].slice(0, 8).map((p) => (
                            <button key={p.id} type="button" onClick={() => openEditProduct(p)} className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100">
                              {p.stock === 0 ? "Tükendi" : "Düşük"}: {p.name} ({p.stock})
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-gray-950">Son siparişler</h3>
                      <button type="button" onClick={() => setTab("siparisler")} className="text-xs font-bold text-indigo-700 hover:underline">Tümünü gör</button>
                    </div>
                    {recentShopOrders.length === 0 ? (
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">Henüz mağaza siparişi yok.</p>
                    ) : (
                      <div className="space-y-2">
                        {recentShopOrders.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => { setTab("siparisler"); setOrderStatusFilter(o.status || "all"); }}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left hover:bg-white"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-gray-950">#{o.order_number || o.id} · {o.customer_name || "Müşteri"}</p>
                              <p className="text-[10px] text-gray-500">{new Date(o.created_at).toLocaleDateString("tr-TR")}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-black text-gray-950">₺{Number(o.total || 0).toFixed(2)}</p>
                              <StatusPill status={o.status} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <button type="button" onClick={() => setTab("aktar")} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left shadow-sm hover:bg-emerald-100">
                    <p className="text-sm font-black text-emerald-950">Toplu katalog işlemleri</p>
                    <p className="mt-1 text-xs text-emerald-900">CSV dışa aktar / içe aktar ile ürünleri hızlı düzenleyin.</p>
                  </button>
                  <button type="button" onClick={() => setTab("duyurular")} className="rounded-2xl border border-pink-200 bg-pink-50 p-4 text-left shadow-sm hover:bg-pink-100">
                    <p className="text-sm font-black text-pink-950">Kampanya duyurusu</p>
                    <p className="mt-1 text-xs text-pink-900">İndirimli ürünleri blog/duyuru ile vitrine taşıyın.</p>
                  </button>
                  <button type="button" onClick={() => setTab("musteriler")} className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left shadow-sm hover:bg-sky-100">
                    <p className="text-sm font-black text-sky-950">Müşteri hızlı görünümü</p>
                    <p className="mt-1 text-xs text-sky-900">
                      {crmCustomers.length > 0 ? `${crmCustomers.slice(0, 3).map((c) => c.name).join(", ")} öne çıkıyor.` : "Sipariş geldikçe müşteri kartları oluşur."}
                    </p>
                  </button>
                </div>
              </div>
            ) : null}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-4">Hızlı Yönetim</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {TABS.filter((t) => !["anasayfa", "profil"].includes(t.id)).slice(0, 9).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="text-left px-4 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition shadow-sm"
                  >
                    <div className="text-sm font-bold text-gray-900">{t.label}</div>
                    <div className="text-xs text-gray-800 mt-0.5">Bu modüle git</div>
                  </button>
                ))}
              </div>
              <h4 className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-3">İşletme Özeti</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="İşletme Adı" value={vendor.name} />
                <InfoRow label="Servis Türü" value={TYPE_LABELS[vt] || vt} />
                <InfoRow label="Alt Tür" value={SUBTYPE_LABELS[vendor.provider_subtype] || vendor.provider_subtype || "—"} />
                <InfoRow label="Yetkili" value={vendor.owner_name} />
                <InfoRow label="E-Posta" value={vendor.owner_email} />
                <InfoRow label="Telefon" value={vendor.phone} />
                <InfoRow label="Şehir" value={vendor.city} />
                <InfoRow label="Başvuru Tarihi" value={vendor.created_at ? new Date(vendor.created_at).toLocaleDateString("tr-TR") : "—"} />
                <InfoRow
                  label="Gelir modeli"
                  value={
                    vendor.revenue_model === "commission"
                      ? `Komisyon %${vendor.commission_rate_pct ?? "—"}`
                      : "Abonelik"
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PROFİL ─── */}
        {tab === "profil" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">
            <StatusCard vendor={vendor} />
            {!isApproved && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">⚠️ Başvurunuz onaylanmadan profil değişiklikleriniz kaydedilmeyecektir.</div>}
            {vendor?.revenue_model === "commission" && (
              <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-900 text-xs">
                <span className="font-semibold">Komisyon modeli:</span> Siparişlerde platform komisyonu otomatik hesaplanır
                {vendor.commission_rate_pct != null && String(vendor.commission_rate_pct).trim() !== ""
                  ? ` (oran %${vendor.commission_rate_pct}).`
                  : "."}{" "}
                Tahsilat işletmenize doğrudan yapılır; komisyon tutarı hakediş için kayıt altına alınır.
              </div>
            )}
            {vendor?.revenue_model === "commission" && (!String(vendor.payout_bank_iban || "").trim() || !String(vendor.payout_bank_holder || "").trim()) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                Komisyonlu çalışma için lütfen ödeme hesabınızı (IBAN ve hesap sahibi) aşağıdan kaydedin.
              </div>
            )}
            {vendor?.revenue_model === "commission" && (
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <h3 className="text-gray-900 font-semibold text-sm">Ödeme hesabı (hakediş / mahsuplaştırma)</h3>
                <GlassInput label="Hesap sahibi (ünvan)" value={payoutForm.holder} onChange={(v) => setPayoutForm((p) => ({ ...p, holder: v }))} placeholder="Şirket veya ad soyad" />
                <GlassInput label="IBAN" value={payoutForm.iban} onChange={(v) => setPayoutForm((p) => ({ ...p, iban: v }))} placeholder="TR00 …" />
                <GlassInput label="Banka / şube (isteğe bağlı)" value={payoutForm.branch} onChange={(v) => setPayoutForm((p) => ({ ...p, branch: v }))} placeholder="Örn. Ziraat — Kırşehir" />
                <button
                  type="button"
                  onClick={() => void savePayoutBank()}
                  disabled={savingPayout || !isApproved || !payoutForm.holder.trim() || !payoutForm.iban.trim()}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-emerald-500 transition"
                >
                  {savingPayout ? "Kaydediliyor…" : "Banka bilgilerini kaydet"}
                </button>
              </div>
            )}
            <div className="p-3 rounded-xl border border-gray-300 bg-gray-50 text-xs text-gray-900 leading-relaxed">
              <strong>Entegrasyonlar ve görseller:</strong> kargo, yapay zekâ, ödeme, mesajlaşma, logo ve iletişim e-postaları için{" "}
              <button type="button" onClick={() => setTab("genel-ayarlar")} className="font-bold underline text-indigo-700">
                ⚙️ Genel Ayarlar
              </button>
              . <strong>Manuel kargo gönderisi</strong> için{" "}
              <button type="button" onClick={() => setTab("kargo")} className="font-bold underline text-indigo-700">
                📦 Kargo Gönder
              </button>
              ; siparişe bağlı fiş için Siparişler satırındaki <strong>Geliver fişi</strong> düğmesini de kullanabilirsiniz.
            </div>
            {vendor?.revenue_model === "subscription" && (
              <p className="text-gray-900 text-xs">
                Gelir modeliniz: <strong>abonelik</strong>. Ürün/hizmet tahsilatını kendi süreçlerinizle yürütürsünüz; online POS ödemesi için Genel Ayarlar&apos;daki PayTR / iyzico alanlarını kullanın.
              </p>
            )}
            <div className="space-y-4">
              <GlassInput label="İşletme Adı" value={profil.name} onChange={v => setProfil(p => ({ ...p, name: v }))} placeholder="İşletme adınız" />
              <GlassInput label="Telefon" value={profil.phone} onChange={v => setProfil(p => ({ ...p, phone: v }))} placeholder="05XX XXX XX XX" />
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3 shadow-sm">
                <p className="text-base font-black text-emerald-950">📲 Siparişi WhatsApp&apos;tan al</p>
                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  Açıkken yeni siparişler işletme WhatsApp numaranıza bildirilir. Menüde müşterilerin size yazması için aşağıdaki ikinci seçeneği de kullanabilirsiniz.
                </p>
                <GlassInput
                  label="İşletme WhatsApp numarası (ülke kodu ile)"
                  value={profil.whatsapp}
                  onChange={(v) => setProfil((p) => ({ ...p, whatsapp: v }))}
                  placeholder="905XXXXXXXXX"
                />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-5 w-5 mt-0.5 rounded border-emerald-400"
                    checked={siparisWhatsAppAktif}
                    onChange={(e) => setSiparisWhatsAppAktif(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    Siparişi WhatsApp&apos;tan al — yeni sipariş bildirimi açık
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer pl-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-0.5"
                    checked={integrationForm.whatsappFeatureCustomerContact}
                    onChange={(e) =>
                      setIntegrationForm((p) => ({ ...p, whatsappFeatureCustomerContact: e.target.checked }))
                    }
                  />
                  <span className="text-xs font-medium text-gray-800">
                    Menüde «WhatsApp&apos;tan yaz» düğmesi göster (müşteri doğrudan iletişim)
                  </span>
                </label>
                <details className="border border-emerald-200 rounded-lg bg-white/80 p-2 text-xs">
                  <summary className="cursor-pointer font-bold text-gray-800">CallMeBot (otomatik mesaj)</summary>
                  <p className="text-[11px] text-gray-700 mt-2 leading-relaxed">
                    Numaranızdan CallMeBot&apos;a <em>I allow callmebot to send me messages</em> yazın veya kendi API anahtarınızı girin. Platform anahtarı varsa boş bırakabilirsiniz.{" "}
                    <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">
                      Kurulum
                    </a>
                  </p>
                  <div className="mt-2">
                    <GlassInput
                      label="CallMeBot API anahtarı (isteğe bağlı)"
                      value={profil.callmebotKey}
                      onChange={(v) => setProfil((p) => ({ ...p, callmebotKey: v }))}
                      placeholder="…"
                    />
                  </div>
                </details>
                <button
                  type="button"
                  onClick={() => void testWhatsAppOrderNotify()}
                  disabled={whatsappTestLoading || !isApproved || !siparisWhatsAppAktif}
                  className="w-full py-2.5 rounded-xl border border-emerald-600 bg-white text-emerald-900 text-sm font-bold hover:bg-emerald-100 disabled:opacity-40 transition"
                >
                  {whatsappTestLoading ? "Gönderiliyor…" : "WhatsApp bildirimini test et"}
                </button>
                {whatsappTestHint ? (
                  <p className="text-[11px] text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5">{whatsappTestHint}</p>
                ) : null}
                <p className="text-[10px] text-gray-600">Numara ve seçenekler <strong>Profili Kaydet</strong> ile kaydedilir.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <LocationPickerGooglePrimary
                  mapsSettings={siteSettings ?? null}
                  variant="light"
                  compactGoogle
                  value={{ city: profil.city, district: profil.district, mahalle: profil.mahalle || "" }}
                  onChange={(v) => setProfil((p) => ({ ...p, city: v.city, district: v.district, mahalle: v.mahalle }))}
                  showSokak={false}
                  onGooglePick={(r) =>
                    setProfil((p) => ({
                      ...p,
                      address: (p.address || "").trim() ? p.address : r.addressLine,
                    }))
                  }
                />
              </div>
              <GlassInput label="Açık adres (sokak, bina no, daire)" value={profil.address} onChange={v => setProfil(p => ({ ...p, address: v }))} placeholder="Sokak, bina no..." />
              <GlassTextarea label="İşletme Tanıtımı" value={profil.description} onChange={v => setProfil(p => ({ ...p, description: v }))} placeholder="İşletmeniz hakkında kısa bir açıklama..." />
              <button
                type="button"
                onClick={aiGenerateAboutText}
                disabled={aiGeneratingAbout}
                className="w-full py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
              >
                {aiGeneratingAbout ? "AI üretiyor..." : "✨ AI ile Hakkımızda Metni Üret"}
              </button>
            </div>
            <button onClick={saveProfile} disabled={saving || !isApproved} className="mt-5 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 transition">
              {saving ? "Kaydediliyor..." : "Profili Kaydet"}
            </button>

            <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <h3 className="text-gray-700 text-sm font-semibold">Abonelik Yönetimi</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Abonelik başlangıç tarihi</label>
                  <input type="date" value={subForm.startDate} onChange={(e) => setSubForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Abonelik bitiş tarihi</label>
                  <input type="date" value={subForm.endDate} onChange={(e) => setSubForm((p) => ({ ...p, endDate: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Ödeme yöntemi</label>
                  <select value={subForm.paymentMethod} onChange={(e) => setSubForm((p) => ({ ...p, paymentMethod: e.target.value as "bank_transfer" | "stripe" }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="bank_transfer">Havale / EFT</option>
                    <option value="stripe">Stripe Kart Ödemesi</option>
                  </select>
                </div>
                <div className="text-xs text-gray-600 rounded-lg border border-gray-200 bg-white p-3">
                  {subForm.paymentMethod === "stripe" ? "Stripe: Güvenli kart ödeme linki yönetici onayı sonrası paylaşılır." : "Banka: TR00 0000 0000 0000 0000 0000 00 · Alıcı: Yekpare Teknoloji A.Ş."}
                </div>
              </div>
              {subForm.paymentMethod === "bank_transfer" && (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <label className="block text-xs text-gray-600 mb-2">Ödeme dekontu yükle</label>
                  <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" onChange={(e) => uploadSubscriptionReceipt(e.target.files?.[0] || null)} className="text-xs" />
                  {subForm.receiptUrl && <a href={subForm.receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-indigo-600 hover:underline">Yüklenen dekontu aç</a>}
                </div>
              )}
              <button onClick={submitSubscriptionRenewal} disabled={submittingSub || subReceiptUploading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition">
                {submittingSub ? "Gönderiliyor..." : "Abonelik Uzatma Talebi Gönder"}
              </button>
            </div>

            {/* ── Masa & Rezervasyon Ayarları ── */}
            {isApproved && (
              <div className="mt-8 border-t border-gray-200 pt-6 space-y-5">
                <h3 className="text-gray-900 text-xs font-bold uppercase tracking-wider">🍽️ Masa & Rezervasyon Ayarları</h3>

                {/* Masaya Servis */}
                {canUseTableService ? (
                  <div className="flex items-start justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div>
                      <div className="text-gray-900 text-sm font-semibold">Masaya Servis</div>
                      <div className="text-gray-800 text-xs mt-0.5">Müşteriler sipariş verirken &quot;Masaya Servis&quot; seçeneğini görür</div>
                    </div>
                    <button type="button" onClick={() => setSvcSettings(s => ({ ...s, tableServiceEnabled: !s.tableServiceEnabled }))} className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${svcSettings.tableServiceEnabled ? "bg-indigo-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${svcSettings.tableServiceEnabled ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                    Masaya servis sadece restoran/kafe tipi sipariş işletmeleri için açıktır. Diğer servis sağlayıcı ve mağaza türlerinde gösterilmez.
                  </div>
                )}

                {/* Masa Bölümleri */}
                {canUseTableService && svcSettings.tableServiceEnabled && (
                  <div className="flex items-start justify-between gap-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div>
                      <div className="text-gray-900 text-sm font-semibold">QR menü (masadan sipariş)</div>
                      <div className="text-gray-800 text-xs mt-0.5">
                        Açıkken QR ve link işletmeye özel sade menü sayfasına gider (site üst/alt menüsü yok). Kapalıyken QR tam vitrin sayfasına gider.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSvcSettings((s) => ({ ...s, qrMenuPublic: !s.qrMenuPublic }))}
                      className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${svcSettings.qrMenuPublic ? "bg-indigo-600" : "bg-gray-300"}`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${svcSettings.qrMenuPublic ? "left-7" : "left-1"}`}
                      />
                    </button>
                  </div>
                )}

                {canUseTableService && svcSettings.tableServiceEnabled && (
                  <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 space-y-3">
                    <div className="text-gray-900 text-xs font-semibold">Masa / Oda / Lobi Tanımları</div>
                    <div className="space-y-2">
                      {tableSections.map(sec => (
                        <div key={sec.id} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-900 flex-1">{sec.type === "masa" ? "🪑" : sec.type === "oda" ? "🚪" : sec.type === "lobi" ? "🛋️" : "📍"} {sec.name}</span>
                          <span className="text-gray-700 text-xs capitalize">{sec.type}</span>
                          <button type="button" onClick={() => setTableSections(prev => prev.filter(s => s.id !== sec.id))} className="text-red-600 hover:text-red-800 text-xs px-1.5 font-semibold">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select value={newSection.type} onChange={e => setNewSection(s => ({ ...s, type: e.target.value as TableSection["type"] }))} className="bg-white border border-gray-300 text-gray-900 text-xs rounded-lg px-2 py-1.5 outline-none">
                        <option value="masa">🪑 Masa</option>
                        <option value="oda">🚪 Oda</option>
                        <option value="lobi">🛋️ Lobi</option>
                        <option value="diger">📍 Diğer</option>
                      </select>
                      <input value={newSection.name} onChange={e => setNewSection(s => ({ ...s, name: e.target.value }))} onKeyDown={e => e.key === "Enter" && addSection()} placeholder="Adı (ör: 1, A-Salonu...)" className="flex-1 bg-white border border-gray-300 text-gray-900 placeholder-gray-500 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500" />
                      <button type="button" onClick={addSection} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-900 text-xs font-semibold rounded-lg transition">+ Ekle</button>
                    </div>
                  </div>
                )}

                {/* Rezervasyon */}
                <div className="flex items-start justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div>
                    <div className="text-gray-900 text-sm font-semibold">Online Rezervasyon</div>
                    <div className="text-gray-800 text-xs mt-0.5">Müşteriler menü sayfasından rezervasyon talebi gönderebilir</div>
                  </div>
                  <button type="button" onClick={() => setSvcSettings(s => ({ ...s, reservationEnabled: !s.reservationEnabled }))} className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${svcSettings.reservationEnabled ? "bg-teal-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${svcSettings.reservationEnabled ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                {svcSettings.reservationEnabled && (
                  <div className="flex items-start justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div>
                      <div className="text-gray-900 text-sm font-semibold">Otomatik Onay</div>
                      <div className="text-gray-800 text-xs mt-0.5">Kapalıysa rezervasyonlar &quot;beklemede&quot; olur, siz onaylarsınız</div>
                    </div>
                    <button type="button" onClick={() => setSvcSettings(s => ({ ...s, reservationAutoConfirm: !s.reservationAutoConfirm }))} className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${svcSettings.reservationAutoConfirm ? "bg-teal-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${svcSettings.reservationAutoConfirm ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void enableTableOrderAndQr(true)}
                    disabled={savingSvc || !canUseTableService}
                    className="flex-1 min-w-[10rem] py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition"
                  >
                    Masaya sipariş + QR menüyü aç
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("qr-menu")}
                    className="px-4 py-2.5 border border-indigo-300 bg-white text-indigo-800 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition"
                  >
                    QR kodları →
                  </button>
                </div>

                <button type="button" onClick={saveServiceSettings} disabled={savingSvc} className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition">
                  {savingSvc ? "Kaydediliyor..." : "Servis Ayarlarını Kaydet"}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "temalar" && (
          <VendorThemesPanel authHeaders={authHeaders} flash={(text, ok = true) => flash(ok ? "ok" : "err", text)} isApproved={isApproved} />
        )}

        {/* ─── TAB: GENEL AYARLAR ─── */}
        {tab === "genel-ayarlar" && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-gray-900 font-bold text-lg border-b border-gray-200 pb-2">⚙️ Genel Ayarlar</h2>
              {!isApproved ? (
                <p className="text-amber-800 text-sm">Başvurunuz onaylandıktan sonra ayarları kaydedebilirsiniz.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-900 leading-relaxed border border-gray-200 rounded-xl px-3 py-2 bg-gray-50">
                    Logo, kapak, e-postalar, ödeme ve API anahtarlarını burada yönetin.{" "}
                    <strong className="text-gray-950">Geliver API anahtarı</strong>, <strong>kuruluş (organization) UUID</strong> ve{" "}
                    <strong>isteğe bağlı webhook</strong> yönetimi <strong className="text-gray-950">aşağıdaki Geliver ayarları</strong> bölümündedir.{" "}
                    <strong className="text-gray-950">Manuel gönderi</strong> ve teklif ekranı için{" "}
                    <button type="button" onClick={() => setTab("kargo")} className="font-bold text-indigo-700 underline">
                      Kargo Gönder
                    </button>{" "}
                    sekmesini kullanın (kuruluş kimliği ve webhook orada yoktur).
                  </p>
                  <VendorNavMenuPanel
                    authHeaders={authHeaders}
                    flash={(text, ok = true) => flash(ok ? "ok" : "err", text)}
                    isApproved={isApproved}
                    storefrontPath={vendor?.slug ? `/siparis/satici/${encodeURIComponent(vendor.slug)}` : null}
                  />
                  <h3 className="text-gray-900 text-sm font-bold">Vitrin ve iletişim</h3>
                  <GlassInput
                    label="Logo görseli (URL)"
                    value={profil.imageUrl}
                    onChange={(v) => setProfil((p) => ({ ...p, imageUrl: v }))}
                    placeholder="https://..."
                  />
                  <GlassInput
                    label="Kapak görseli (URL)"
                    value={profil.coverUrl}
                    onChange={(v) => setProfil((p) => ({ ...p, coverUrl: v }))}
                    placeholder="https://..."
                  />
                  <GlassInput
                    label="İletişim e-postası (müşteriye görünen)"
                    value={profil.contactEmail}
                    onChange={(v) => setProfil((p) => ({ ...p, contactEmail: v }))}
                    placeholder="info@isletme.com"
                    type="email"
                  />
                  <GlassInput
                    label="Hesap / kayıt e-postası"
                    value={profil.ownerEmail}
                    onChange={(v) => setProfil((p) => ({ ...p, ownerEmail: v }))}
                    placeholder="yetkili@…"
                    type="email"
                  />
                  <div className="border-2 border-emerald-300 rounded-xl p-4 bg-emerald-50 space-y-3">
                    <p className="text-sm font-black text-emerald-950">📲 Siparişi WhatsApp&apos;tan al</p>
                    <GlassInput
                      label="İşletme WhatsApp numarası (ülke kodu ile)"
                      value={profil.whatsapp}
                      onChange={(v) => setProfil((p) => ({ ...p, whatsapp: v }))}
                      placeholder="905XXXXXXXXX"
                    />
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-5 w-5 mt-0.5"
                        checked={siparisWhatsAppAktif}
                        onChange={(e) => setSiparisWhatsAppAktif(e.target.checked)}
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        Siparişi WhatsApp&apos;tan al — yeni sipariş bildirimi açık
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5"
                        checked={integrationForm.whatsappFeatureCustomerContact}
                        onChange={(e) =>
                          setIntegrationForm((p) => ({ ...p, whatsappFeatureCustomerContact: e.target.checked }))
                        }
                      />
                      <span className="text-xs font-medium text-gray-800">
                        Menüde «WhatsApp&apos;tan yaz» düğmesi göster
                      </span>
                    </label>
                    <details className="border border-emerald-200 rounded-lg bg-white/80 p-2 text-xs">
                      <summary className="cursor-pointer font-bold text-gray-800">CallMeBot (otomatik mesaj)</summary>
                      <p className="text-[11px] text-gray-700 mt-2 leading-relaxed">
                        CallMeBot&apos;u bu WhatsApp numarasıyla etkinleştirin veya API anahtarı girin.{" "}
                        <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">
                          Kurulum
                        </a>
                      </p>
                      <div className="mt-2">
                        <GlassInput
                          label="CallMeBot API anahtarı (isteğe bağlı)"
                          value={profil.callmebotKey}
                          onChange={(v) => setProfil((p) => ({ ...p, callmebotKey: v }))}
                          placeholder="…"
                        />
                      </div>
                    </details>
                    <button
                      type="button"
                      onClick={() => void testWhatsAppOrderNotify()}
                      disabled={whatsappTestLoading || !siparisWhatsAppAktif}
                      className="w-full py-2.5 rounded-xl border border-emerald-600 bg-white text-emerald-900 text-sm font-bold hover:bg-emerald-100 disabled:opacity-40 transition"
                    >
                      {whatsappTestLoading ? "Gönderiliyor…" : "WhatsApp bildirimini test et"}
                    </button>
                    {whatsappTestHint ? (
                      <p className="text-[11px] text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5">{whatsappTestHint}</p>
                    ) : null}
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      <strong>İletişim ve görselleri kaydet</strong> düğmesi numara, CallMeBot ve bildirim anahtarını birlikte kaydeder.
                    </p>
                  </div>
                  <div className="border border-gray-300 rounded-xl p-3 bg-white space-y-2">
                    <p className="text-xs text-gray-900 font-bold">✉️ SMTP (müşteriye e-posta)</p>
                    <p className="text-[11px] text-gray-800 leading-relaxed">
                      Sipariş onayında müşteri e-postası varsa bildirim <strong>sunucu genelinde</strong> tanımlı SMTP ile gider. Barındırma panelinizde veya <code className="text-[10px] bg-gray-100 px-1 rounded">.env</code> içinde şu değişkenleri ayarlayın:{" "}
                      <code className="text-[10px] bg-gray-100 px-1 rounded break-all">SMTP_HOST</code>,{" "}
                      <code className="text-[10px] bg-gray-100 px-1 rounded">SMTP_PORT</code> (587 veya 465),{" "}
                      <code className="text-[10px] bg-gray-100 px-1 rounded">SMTP_USER</code>,{" "}
                      <code className="text-[10px] bg-gray-100 px-1 rounded">SMTP_PASS</code>,{" "}
                      <code className="text-[10px] bg-gray-100 px-1 rounded break-all">SMTP_FROM</code> (ör. <em>Mağaza &lt;no-reply@alanadiniz.com&gt;</em>). Ayrıntılı özet için{" "}
                      <button type="button" className="text-indigo-700 font-bold underline" onClick={() => setTab("posta")}>
                        Posta &amp; Bildirim
                      </button>{" "}
                      sekmesine bakın.
                    </p>
                  </div>
                  <details className="border border-sky-200 rounded-xl p-3 bg-sky-50/80 text-[11px] text-sky-950 leading-relaxed space-y-2 group">
                    <summary className="cursor-pointer font-bold text-sky-950 list-none flex items-center justify-between gap-2">
                      <span>Özel alan adı (apex / www) — DNS ve kurumsal e-posta (A, CNAME, TXT, MX)</span>
                      <span className="text-[10px] text-sky-700 group-open:hidden">Aç</span>
                      <span className="text-[10px] text-sky-700 hidden group-open:inline">Kapat</span>
                    </summary>
                    <div className="mt-2 space-y-2 pt-2 border-t border-sky-200/80">
                      <p>
                        <strong>Amaç:</strong> Müşterinin <code className="font-mono">isletmeniz.com</code> veya <code className="font-mono">siparis.isletmeniz.com</code> adresinden vitrininize
                        ulaşması. Alan adı, <strong>Yekpare / barındırıcı panelinde</strong> (Railway, Vercel, GitHub Pages) tanımlandıktan sonra <strong>DNS sağlayıcınızda</strong> kayıtlar
                        eklenir; hedef hostname veya IP'yi barındırıcı ekranından kopyalayın.
                      </p>
                      <p>
                        <strong>1) Kök alan (apex):</strong> <code className="font-mono">@</code> için <strong>A</strong> kaydı → barındırıcının verdiği IPv4 (Railway custom domain).{" "}
                        Vercel kök alan için çoğu zaman <strong>ALIAS / ANAME</strong> veya sağlayıcıdaki <strong>CNAME flattening</strong> kullanılır.
                      </p>
                      <p>
                        <strong>2) www:</strong> <code className="font-mono">www</code> → <strong>CNAME</strong> (ör. <code className="font-mono">cname.vercel-dns.net</code> veya Railway uç noktası).
                      </p>
                      <p>
                        <strong>3) GitHub Pages:</strong> Kök için Pages dokümantasyonundaki <strong>A</strong> kayıtları; <code className="font-mono">www</code> için{" "}
                        <code className="font-mono">…github.io</code> CNAME.
                      </p>
                      <p>
                        <strong>4) Kurumsal e-posta (@isletmeniz.com):</strong> Posta sağlayıcınızın (Google Workspace, Microsoft 365, Resend, SendGrid vb.) verdiği{" "}
                        <strong>MX</strong> ve <strong>TXT</strong> (SPF, DKIM, domain doğrulama) kayıtlarını aynı DNS bölgesine ekleyin. SPF örneği (Google):{" "}
                        <code className="font-mono text-[10px] break-all">v=spf1 include:_spf.google.com ~all</code> — sağlayıcıya göre değişir.
                      </p>
                      <p>
                        <strong>5) TLS:</strong> Sertifika barındırıcıda otomatik üretilir; DNS yayılınca (TTL) doğrulanır.
                      </p>
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={() => void saveProfile()}
                    disabled={saving || !isApproved}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-indigo-500 transition"
                  >
                    {saving ? "Kaydediliyor…" : "İletişim ve görselleri kaydet"}
                  </button>

                  <h3 className="text-gray-900 text-sm font-bold pt-2 border-t border-gray-200">Geliver ayarları</h3>
                  <p className="text-xs text-gray-900 leading-relaxed">
                    <strong>API</strong> ve <strong>kuruluş kimliği</strong> Geliver hesabınızla sunucu entegrasyonu içindir. Aşağıdaki{" "}
                    <strong>webhook</strong> bölümü <strong>isteğe bağlıdır</strong> — gönderi oluşturma ve teklif alma için zorunlu değildir; otomatik durum
                    bildirimleri istiyorsanız kullanın.
                  </p>
                  <p className="text-xs text-gray-800 leading-relaxed border border-gray-200 rounded-lg px-2.5 py-2 bg-gray-50">
                    <strong>Kuruluş (organization) UUID nerede?</strong> Geliver web panelinde fatura ve kurum bilgisi tarafında listelenir; çoğu arayüzde{" "}
                    <strong>«Fatura adresini düzenle»</strong> veya benzeri fatura / organizasyon ayarları ekranının hemen üstünde veya yanındaki menüde yer alır.
                    Menü adları Geliver güncellemelerine göre değişebilir; panelde arayın veya{" "}
                    <a href="https://docs.geliver.io/docs/home" target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-semibold underline">
                      Geliver dokümantasyonu
                    </a>
                    {" "}üzerinden doğrulayın.
                  </p>
                  <p className="text-xs text-gray-900 leading-relaxed">
                    API anahtarınızı{" "}
                    <a href="https://app.geliver.io/apitokens" target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-semibold underline">
                      app.geliver.io
                    </a>{" "}
                    üzerinden oluşturun. Gönderi oluştururken ücret Geliver hesabınıza yansır.
                  </p>
                  {vendor?.geliver_api_token_masked ? (
                    <p className="text-[11px] text-gray-900">
                      Kayıtlı anahtar: <span className="font-mono font-semibold">{vendor.geliver_api_token_masked}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">API anahtarı yok — gönderi oluşturulamaz.</p>
                  )}
                  <GlassInput
                    label="Yeni Geliver API anahtarı"
                    value={geliverTokenInput}
                    onChange={(v) => setGeliverTokenInput(v)}
                    placeholder="Yapıştırın (kaydedince güncellenir)"
                  />
                  <GlassInput
                    label="Gönderici posta kodu"
                    value={geliverZip}
                    onChange={(v) => setGeliverZip(v.replace(/\D/g, "").slice(0, 5))}
                    placeholder="Örn. 34000"
                  />
                  <GlassInput
                    label="Geliver kuruluş (organization) UUID — bakiye API"
                    value={geliverOrgIdInput}
                    onChange={(v) => setGeliverOrgIdInput(v)}
                    placeholder="Geliver panelinden kopyalayın"
                  />
                  <p className="text-[11px] text-gray-800 leading-relaxed -mt-1">
                    Resmileştirilmiş bakiye sorgusu için sunucunun kuruluş kimliğine ihtiyacı vardır; yukarıdaki panel konumundan kopyalayıp{" "}
                    <strong>Geliver ayarlarını kaydet</strong> ile saklayın.
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      disabled={geliverBalanceLoading || !vendor?.geliver_api_token_masked}
                      onClick={() => void loadGeliverBalance()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 hover:bg-emerald-500"
                    >
                      {geliverBalanceLoading ? "Sorgulanıyor…" : "Bakiyeyi sorgula"}
                    </button>
                  </div>
                  {geliverBalanceSummary ? (
                    <p className="text-sm font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{geliverBalanceSummary}</p>
                  ) : null}
                  {geliverBalanceRaw != null ? (
                    <details className="text-[11px] text-gray-800 rounded-lg border border-gray-200 bg-white px-2 py-1">
                      <summary className="cursor-pointer font-semibold text-gray-700 py-1">Ham API yanıtı (JSON)</summary>
                      <pre className="mt-2 text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {typeof geliverBalanceRaw === "string" ? geliverBalanceRaw : JSON.stringify(geliverBalanceRaw, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                  <GlassInput
                    label="Gönderici mahalle (Geliver zorunlu — address1 satır başı)"
                    value={geliverSenderMahalle}
                    onChange={(v) => setGeliverSenderMahalle(v)}
                    placeholder="Örn. Caferağa Mah. veya Kadıköy Mahalle"
                  />
                  <p className="text-[11px] text-gray-800 leading-relaxed -mt-1">
                    İl ve ilçe profildeki şehir / ilçe ile uyumlu olmalıdır. Profil adres satırınıza mahalleyi başta yazmadıysanız burayı doldurun; kayıttan sonra gönderici adresi yeniden oluşturulur.
                  </p>
                  {isShop && (
                    <p className="text-[11px] text-indigo-950 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-2 leading-relaxed">
                      <strong>Alışveriş kargosu:</strong> Sipariş oluşunca Geliver'da otomatik fiş <strong>oluşturulmaz</strong>.{" "}
                      <strong>Siparişler</strong> sekmesinde ilgili sipariş için <strong>«Kargola»</strong>ya basın; kargo ekranında teklifler görünür, etiketi{" "}
                      <strong>app.geliver.io</strong> üzerinden «Etiket Al» ile tamamlarsınız. Kayıtlı gönderileri{" "}
                      <strong>Kargo → Kargo teklif kayıtları</strong> listesinde sıra ve tarihle görürsünüz.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingGeliver}
                      onClick={() => void saveGeliverSettings()}
                      className="flex-1 min-w-[140px] py-2.5 bg-sky-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-sky-500 transition"
                    >
                      {savingGeliver ? "Kaydediliyor…" : "Geliver ayarlarını kaydet"}
                    </button>
                    {vendor?.geliver_api_token_masked ? (
                      <button
                        type="button"
                        disabled={savingGeliver}
                        onClick={() => void saveGeliverSettings({ clearToken: true })}
                        className="py-2.5 px-4 border border-red-400 text-red-800 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-40 transition"
                      >
                        Anahtarı kaldır
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900">Geliver webhook (isteğe bağlı)</p>
                      <button
                        type="button"
                        disabled={geliverWebhooksLoading || !vendor?.geliver_api_token_masked}
                        onClick={() => void loadGeliverWebhooksList()}
                        className="text-[11px] font-bold text-indigo-700 underline disabled:opacity-40"
                      >
                        Listeyi yenile
                      </button>
                    </div>
                    {!vendor?.geliver_api_token_masked ? (
                      <p className="text-[11px] text-gray-700">Webhook yönetimi için önce yukarıdan API anahtarı kaydedin.</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-800">
                          Geliver webhook oluşturma / listeleme / silme / test — ayrıntılar için{" "}
                          <a href="https://docs.geliver.io/docs/home" target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-bold underline">
                            dokümantasyon
                          </a>
                          .
                        </p>
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900 space-y-2">
                          <p className="font-bold">Önerilen webhook URL&apos;i:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 break-all rounded bg-white border border-amber-200 px-2 py-1 text-[11px]">
                              {`${typeof window !== "undefined" ? window.location.origin : "https://turknet.app"}/api/providers/geliver/webhook`}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                const u = `${typeof window !== "undefined" ? window.location.origin : "https://turknet.app"}/api/providers/geliver/webhook`;
                                setWhNew((s) => ({ ...s, url: u, type: s.type || "TRACK_UPDATED" }));
                                setWhTest((s) => ({ ...s, url: u, type: s.type || "shipment_status_changed" }));
                              }}
                              className="shrink-0 px-3 py-1 rounded-md bg-amber-600 text-white text-[11px] font-bold"
                            >
                              Doldur
                            </button>
                          </div>
                          <p className="text-[11px]">
                            Önemli: Geliver test isteklerinin <b>200 OK</b> dönmesi için yukarıdaki URL&apos;i kullanın. <b>https://turknet.app/</b> gibi kök
                            URL&apos;lere Geliver POST yapamaz, &quot;Webhook isteği zaman aşımına uğradı&quot; / 5xx hatası alırsınız.
                          </p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <GlassInput label="Webhook URL" value={whNew.url} onChange={(v) => setWhNew((s) => ({ ...s, url: v }))} />
                          <GlassInput label="Tip (opsiyonel, örn. TRACK_UPDATED)" value={whNew.type} onChange={(v) => setWhNew((s) => ({ ...s, type: v }))} />
                        </div>
                        <button
                          type="button"
                          disabled={geliverWebhooksLoading}
                          onClick={() => void addGeliverWebhookRow()}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                        >
                          Webhook ekle
                        </button>
                        <div className="grid sm:grid-cols-2 gap-2 border-t border-gray-300 pt-3">
                          <GlassInput label="Test URL" value={whTest.url} onChange={(v) => setWhTest((s) => ({ ...s, url: v }))} />
                          <GlassInput label="Test type" value={whTest.type} onChange={(v) => setWhTest((s) => ({ ...s, type: v }))} />
                        </div>
                        <button
                          type="button"
                          disabled={geliverWebhooksLoading}
                          onClick={() => void runGeliverWebhookTestRow()}
                          className="px-4 py-2 rounded-xl border-2 border-gray-500 text-gray-900 text-xs font-bold disabled:opacity-50"
                        >
                          Test gönder
                        </button>
                        {geliverWebhooksLoading ? (
                          <p className="text-sm text-gray-600">Yükleniyor…</p>
                        ) : (
                          <ul className="space-y-2 text-[11px]">
                            {geliverWebhooks.map((w, i) => {
                              const o = w as Record<string, unknown>;
                              const wid = String(o.id ?? o.webhookID ?? i);
                              const url = String(o.url ?? o.URL ?? "");
                              const typ = String(o.type ?? o.Type ?? "—");
                              const active = o.isActive === true || o.is_active === true || o.active === true;
                              const hdr = String(o.headerName ?? o.header_name ?? "");
                              return (
                                <li key={wid} className="flex flex-wrap items-start justify-between gap-2 border border-gray-200 rounded-lg p-2 bg-white">
                                  <div className="flex-1 min-w-0 space-y-1 text-[11px] text-gray-800">
                                    <p className="break-all"><span className="font-bold text-gray-500">URL:</span> {url || "—"}</p>
                                    <p><span className="font-bold text-gray-500">Tip:</span> {typ}</p>
                                    <p><span className="font-bold text-gray-500">Durum:</span> {active ? "Aktif" : "Pasif / bilinmiyor"}</p>
                                    {hdr ? (
                                      <p className="break-all"><span className="font-bold text-gray-500">Header:</span> {hdr}</p>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void deleteGeliverWebhookRow(wid)}
                                    className="text-rose-700 font-bold shrink-0 text-xs underline"
                                  >
                                    Sil
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </div>

                  <h3 className="text-gray-900 text-sm font-bold pt-2 border-t border-gray-200">Yapay zekâ anahtarları</h3>
                  <p className="text-xs text-gray-900">
                    İçerik ve asistan anahtarlarını burada saklayın. Harita anahtarları yalnızca yönetici panelinden tanımlanır.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-900 font-semibold mb-1">Ana yapay zekâ anahtarı</label>
                      <input
                        value={integrationForm.openaiApiKey}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, openaiApiKey: e.target.value }))}
                        placeholder={integrationMasks.openaiApiKeyMasked || "sk-…"}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-900 font-semibold mb-1">Yapay zekâ modeli</label>
                      <input
                        value={integrationForm.openaiModel}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, openaiModel: e.target.value }))}
                        placeholder="gpt-4o-mini"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-900 font-semibold mb-1">Alternatif yapay zekâ anahtarı</label>
                      <input
                        value={integrationForm.geminiApiKey}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, geminiApiKey: e.target.value }))}
                        placeholder={integrationMasks.geminiApiKeyMasked || "AIza…"}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-900 font-semibold mb-1">Ek yapay zekâ anahtarı</label>
                      <input
                        value={integrationForm.googleAiApiKey}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, googleAiApiKey: e.target.value }))}
                        placeholder={integrationMasks.googleAiApiKeyMasked || "AIza…"}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-900 font-semibold mb-1">Yedek yapay zekâ anahtarı</label>
                      <input
                        value={integrationForm.deepseekApiKey}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, deepseekApiKey: e.target.value }))}
                        placeholder={integrationMasks.deepseekApiKeyMasked || "sk-…"}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-gray-600 mt-1">deepseek.com üzerinden API anahtarı; metin üretimi için alternatif model.</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                    <p className="text-xs font-bold text-emerald-900">WhatsApp — ek seçenekler</p>
                    <p className="text-[10px] text-emerald-900/80">
                      Ana anahtar: <strong>Profil</strong> veya <strong>Genel Ayarlar</strong> içindeki <strong>Siparişi WhatsApp&apos;tan al</strong> bölümü.
                    </p>
                    <label className="flex items-center gap-2 text-xs text-gray-900">
                      <input
                        type="checkbox"
                        checked={integrationForm.whatsappFeatureOrderStatus}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, whatsappFeatureOrderStatus: e.target.checked, whatsappEnabled: e.target.checked ? true : p.whatsappEnabled }))}
                      />
                      Müşteriye de sipariş durumu WhatsApp mesajı gönder
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-900">
                      <input
                        type="checkbox"
                        checked={integrationForm.whatsappFeatureCustomerContact}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, whatsappFeatureCustomerContact: e.target.checked }))}
                      />
                      Müşteri doğrudan iletişime geçebilsin
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-900">
                      <input
                        type="checkbox"
                        checked={integrationForm.whatsappFeatureBulkMarketing}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, whatsappFeatureBulkMarketing: e.target.checked }))}
                      />
                      Toplu mesaj (Posta merkezi)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveIntegrations()}
                    disabled={savingIntegrations}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition"
                  >
                    {savingIntegrations ? "Kaydediliyor…" : "API anahtarlarını kaydet"}
                  </button>

                  {vendor?.revenue_model === "subscription" && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                      <h3 className="text-sm font-bold text-gray-900">💳 PayTR / iyzico (müşteri online ödemesi)</h3>
                      <p className="text-[11px] text-gray-900 leading-relaxed">
                        Anahtarlar kayıtlıyken siparişlerde online ödeme açılır. <strong>PayTR</strong> için mağaza panelindeki{" "}
                        <em>bildirim URL</em> tam olarak aşağıdaki adres olmalıdır; yanlış veya boşsa ödeme tamamlansa bile sipariş{" "}
                        <code className="bg-white border border-amber-200 px-0.5 rounded">pending</code> kalabilir.
                      </p>
                      <div className="text-[10px] text-gray-800 space-y-1">
                        <p className="font-semibold text-gray-900">PayTR bildirim (callback):</p>
                        <code className="block bg-white border border-amber-200 px-2 py-1.5 rounded break-all">
                          {apiJoin("delivery/checkout/paytr-callback")}
                        </code>
                        <p className="font-semibold text-gray-900 pt-1">iyzico Checkout Form callback (otomatik gönderilir):</p>
                        <code className="block bg-white border border-amber-200 px-2 py-1.5 rounded break-all">
                          {apiJoin("delivery/checkout/iyzico-callback")}
                        </code>
                        <p className="pt-1 text-gray-700">
                          Tüm callback adreslerinin özeti (JSON):{" "}
                          <a className="text-indigo-700 underline break-all" href={apiJoin("public/odeme-callback-rehberi")} target="_blank" rel="noopener noreferrer">
                            {apiJoin("public/odeme-callback-rehberi")}
                          </a>
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-white border border-amber-200 p-2 space-y-1.5">
                          <p className="font-bold text-gray-900">PayTR</p>
                          {vendor.paytr_configured ? (
                            <p className="text-emerald-800 text-[11px] font-medium">Mağaza no: {vendor.paytr_merchant_id_masked || "****"}</p>
                          ) : (
                            <p className="text-gray-800 text-[11px]">Henüz yapılandırılmadı</p>
                          )}
                          <input value={trPaytrId} onChange={(e) => setTrPaytrId(e.target.value)} placeholder="Mağaza numarası" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900" />
                          <input value={trPaytrKey} onChange={(e) => setTrPaytrKey(e.target.value)} placeholder="Mağaza parolası (yeni)" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900" type="password" autoComplete="off" />
                          <input value={trPaytrSalt} onChange={(e) => setTrPaytrSalt(e.target.value)} placeholder="Mağaza gizli anahtarı (yeni)" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900" type="password" autoComplete="off" />
                          <label className="flex items-center gap-2 cursor-pointer text-gray-900">
                            <input type="checkbox" checked={trPaytrTest} onChange={(e) => setTrPaytrTest(e.target.checked)} className="rounded accent-amber-600" />
                            <span>PayTR test modu</span>
                          </label>
                        </div>
                        <div className="rounded-lg bg-white border border-amber-200 p-2 space-y-1.5">
                          <p className="font-bold text-gray-900">iyzico</p>
                          {vendor.iyzico_configured ? (
                            <p className="text-emerald-800 text-[11px] font-medium">API anahtarları kayıtlı</p>
                          ) : (
                            <p className="text-gray-800 text-[11px]">Henüz yapılandırılmadı</p>
                          )}
                          <input value={trIyzicoKey} onChange={(e) => setTrIyzicoKey(e.target.value)} placeholder="API Key (yeni)" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900" autoComplete="off" />
                          <input value={trIyzicoSecret} onChange={(e) => setTrIyzicoSecret(e.target.value)} placeholder="Secret Key (yeni)" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900" type="password" autoComplete="off" />
                          <label className="flex items-center gap-2 cursor-pointer text-gray-900">
                            <input type="checkbox" checked={trIyzicoSandbox} onChange={(e) => setTrIyzicoSandbox(e.target.checked)} className="rounded accent-amber-600" />
                            <span>iyzico sandbox</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-900 font-semibold block mb-1">İkisi de doluysa öncelik</label>
                        <select
                          value={trPreferred}
                          onChange={(e) => setTrPreferred(e.target.value as "" | "paytr" | "iyzico")}
                          className="w-full sm:w-64 border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-900"
                        >
                          <option value="">Otomatik (önce PayTR, yoksa iyzico)</option>
                          <option value="paytr">PayTR önce</option>
                          <option value="iyzico">iyzico önce</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => void saveTrGatewaySettings()}
                        disabled={savingTrGateway}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition"
                      >
                        {savingTrGateway ? "Kaydediliyor…" : "Ödeme ayarlarını kaydet"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: POSTA & BİLDİRİM ─── */}
        {tab === "platform-destek" && <VendorPlatformSupportTab authHeaders={authHeaders} />}
        {tab === "posta" && <VendorPostaHub />}
        {tab === "bildirimler" && providerSessionForBroadcast?.id && providerSessionForBroadcast?.email ? (
          <VendorBildirimlerPanel
            vendorId={Number(providerSessionForBroadcast.id)}
            vendorEmail={String(providerSessionForBroadcast.email)}
          />
        ) : null}
        {tab === "duyurular" && <VendorDuyurularPanel />}
        {tab === "blog" && vendor.slug ? (
          <VendorBlogPanel vendorSlug={vendor.slug} publicBlogPathPrefix={vitrinPublicPath} />
        ) : null}

        {/* ─── TAB: KARGO GÖNDER (Geliver manuel gönderi) ─── */}
        {tab === "kargo" && (
          <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-200 pb-3">
              <div className="space-y-3 min-w-0 flex-1 md:max-w-2xl lg:max-w-3xl">
                <h2 className="text-gray-900 font-bold text-lg">📦 Kargo Gönder (Geliver)</h2>
                <p className="text-sm text-gray-900 leading-snug">
                  <strong>Geliver</strong>, Aras Kargo, hepsiJET, PTT Kargo, Sürat Kargo, Yurtiçi Kargo, Kolay Gelsin ve Paket Taxi gibi{" "}
                  <strong>anlaşmalı taşıyıcılar</strong> üzerinden tek yerden teklif alıp <strong>fiyatları karşılaştırarak</strong> uygun maliyetli gönderi
                  oluşturmanızı sağlayan <strong>akıllı kargo pazaryeri</strong>dir.
                </p>
              </div>
              <details className="w-full md:max-w-sm md:shrink-0 rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden self-stretch md:self-start">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-indigo-950 bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100/80 hover:to-sky-100/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100 [&::-webkit-details-marker]:hidden">
                  <span>Kargo gönderimi hakkında bilgilendirme</span>
                  <span className="text-[11px] font-semibold text-indigo-700 shrink-0">Tıklayın — detaylar açılır</span>
                </summary>
                  <div className="px-3 py-3 space-y-3 text-xs text-gray-900 leading-relaxed bg-sky-50/60 border-t border-indigo-100/80">
                    <p>
                      Bu ekranda alıcı ve paket bilgisi girilir; teklifler Yekpare'de listelenir, etiket{" "}
                      <a href="https://app.geliver.io/shipments" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 underline">
                        Geliver Gönderiler
                      </a>{" "}
                      üzerinden «Etiket Al» ile tamamlanır. <strong>API</strong>, <strong>kuruluş UUID</strong> ve isteğe bağlı <strong>webhook</strong>{" "}
                      <button type="button" className="font-bold text-indigo-800 underline" onClick={() => setTab("genel-ayarlar")}>
                        Genel Ayarlar → Geliver ayarları
                      </button>
                      . Resmi site:{" "}
                      <a href="https://geliver.io" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 underline">
                        geliver.io
                      </a>{" "}
                      —{" "}
                      <a href="https://docs.geliver.io/docs/home" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 underline">
                        API dokümantasyonu
                      </a>
                      .
                    </p>
                    <p>
                      <strong>Geliver kuralı:</strong> Teklif alındıktan sonra yaklaşık <strong>bir hafta</strong> içinde etiket alınıp kargoya verilmezse Geliver
                      gönderiyi / teklifi <strong>iptal edebilir</strong>. Süreleri resmi panel ve sözleşmenizde doğrulayın; gecikmeyi önlemek için zamanında{" "}
                      <a href="https://app.geliver.io/shipments" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 underline">
                        app.geliver.io
                      </a>{" "}
                      üzerinden «Etiket Al» ile tamamlayın.
                    </p>
                    <p>
                      <strong>Geliver ile ilgili destek:</strong> WhatsApp üzerinden{" "}
                      <a href={GELIVER_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 underline">
                        bu bağlantı
                      </a>
                      {" "}
                      ile yazabilir veya Geliver panelinden destek talebi açabilirsiniz:{" "}
                      <a
                        href="https://app.geliver.io/supporttickets/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-indigo-800 underline break-all"
                      >
                        https://app.geliver.io/supporttickets/new
                      </a>
                      .
                    </p>
                    <div className="border-t border-sky-200 pt-2 space-y-2">
                      <p className="font-bold text-gray-950">Yekpare'ye bağlamak için özet adımlar</p>
                      <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                          Henüz hesabınız yoksa Geliver'da kayıt olun:{" "}
                          <a href="https://app.geliver.io/signup" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 underline break-all">
                            https://app.geliver.io/signup
                          </a>
                          .
                        </li>
                        <li>
                          Giriş yaptıktan sonra Geliver'da <strong>API token</strong> oluşturun (ör.{" "}
                          <a href="https://app.geliver.io/apitokens" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 underline">
                            app.geliver.io/apitokens
                          </a>
                          ).
                        </li>
                        <li>
                          Yekpare sağlayıcı panelinde <strong>Genel Ayarlar</strong> sekmesini açın; <strong>Geliver ayarları</strong> bölümünde{" "}
                          <strong>Yeni Geliver API anahtarı</strong> alanına token'ı yapıştırın. Bakiye ve adres kuralları için aynı ekranda{" "}
                          <strong>kuruluş (organization) UUID</strong>, gönderici posta kodu ve mahalle alanlarını doldurun (UUID'yi Geliver panelinde fatura /
                          kurum ayarları tarafında, çoğu arayüzde «Fatura adresini düzenle» yakınında bulabilirsiniz).
                        </li>
                        <li>
                          <strong>Geliver ayarlarını kaydet</strong> düğmesine basın. Kayıt başarılı olduktan sonra bu sayfaya dönüp gönderici adresi ve{" "}
                          <strong>Yeni gönderi</strong> adımlarıyla devam edin.
                        </li>
                      </ol>
                    </div>
                  </div>
                </details>
            </div>
            {!isApproved ? (
              <p className="text-amber-800 text-sm">Başvurunuz onaylandıktan sonra gönderi oluşturabilirsiniz.</p>
            ) : !vendor?.geliver_api_token_masked ? (
              <p className="text-amber-900 text-sm font-medium bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Geliver API anahtarı yok. Lütfen önce{" "}
                <button type="button" className="underline font-bold" onClick={() => setTab("genel-ayarlar")}>
                  Genel Ayarlar → Geliver ayarları
                </button>{" "}
                bölümünden anahtar ekleyin.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3">
                  {(
                    [
                      ["addresses", "Gönderici adresleri"],
                      ["compose", "Yeni gönderi"],
                      ["shipments", "Kargo teklif kayıtları"],
                      ["prices", "Fiyat listesi"],
                      ["templates", "Kargo şablonları"],
                      ["accounts", "Taşıyıcı hesapları"],
                      ["docs", "Dokümantasyon"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setGeliverHub(key);
                        if (key === "shipments") void loadGeliverShipmentList();
                        if (key === "addresses") {
                          void loadGeliverSenderAddresses();
                          void loadGeliverCitiesForForm();
                        }
                        if (key === "templates") void loadGeliverTemplatesList();
                        if (key === "accounts") void loadGeliverProviderAccountsList();
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-tight border transition shadow-sm ${
                        geliverHub === key
                          ? "border-indigo-300 bg-gradient-to-b from-indigo-50 via-white to-white text-gray-900 ring-2 ring-indigo-500/25"
                          : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {geliverHub === "addresses" && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-800">
                      Geliver&apos;daki <strong>gönderici</strong> adresleri. «Varsayılan yap» denilen kayıt sipariş ve manuel gönderide kullanılır;{" "}
                      <strong>address1</strong> satırı mahalle ile başlamalıdır (Geliver TR kuralı).
                    </p>
                    <GlassInput label="Ara (ad / adres satırı)" value={geliverAddrSearch} onChange={(v) => setGeliverAddrSearch(v)} placeholder="Filtre…" />
                    {geliverSenderLoading ? (
                      <p className="text-sm text-gray-600">Yükleniyor…</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {geliverSenderList
                          .filter((row) => {
                            if (!geliverAddrSearch.trim()) return true;
                            const q = geliverAddrSearch.toLocaleLowerCase("tr-TR");
                            const n = String(row.name ?? "").toLocaleLowerCase("tr-TR");
                            const a = String(row.address1 ?? "").toLocaleLowerCase("tr-TR");
                            return n.includes(q) || a.includes(q);
                          })
                          .map((row, i) => {
                            const id = String(row.id ?? "");
                            const sel = vendor?.geliver_sender_address_id === id;
                            return (
                              <div
                                key={id || String(i)}
                                className={`rounded-xl border-2 p-3 space-y-2 ${
                                  sel ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white"
                                }`}
                              >
                                <p className="font-bold text-sm text-gray-900">{String(row.name ?? "—")}</p>
                                <p className="text-xs text-gray-800 leading-snug">{String(row.address1 ?? "")}</p>
                                <p className="text-[10px] font-mono text-gray-600 break-all">{id || "—"}</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={!id || savingGeliver}
                                    onClick={() => void setGeliverDefaultSenderAddress(id)}
                                    className="text-xs font-bold text-indigo-700 underline disabled:opacity-40"
                                  >
                                    Varsayılan yap
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!id || geliverOfferBusy}
                                    onClick={() => void deleteGeliverPanelAddress(id)}
                                    className="text-xs font-bold text-rose-700 underline disabled:opacity-40"
                                  >
                                    Sil
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    <div className="rounded-xl border border-dashed border-gray-400 p-4 space-y-3 bg-white">
                      <p className="text-xs font-bold text-gray-900">Yeni gönderici adresi ekle</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <GlassInput label="Ad" value={newGeliverSender.name} onChange={(v) => setNewGeliverSender((s) => ({ ...s, name: v }))} />
                        <GlassInput label="E-posta" value={newGeliverSender.email} onChange={(v) => setNewGeliverSender((s) => ({ ...s, email: v }))} type="email" />
                        <GlassInput label="Telefon" value={newGeliverSender.phone} onChange={(v) => setNewGeliverSender((s) => ({ ...s, phone: v }))} />
                        <GlassInput
                          label="Posta kodu"
                          value={newGeliverSender.zip}
                          onChange={(v) => setNewGeliverSender((s) => ({ ...s, zip: v.replace(/\D/g, "").slice(0, 5) }))}
                        />
                        <GlassInput
                          label="Kısa ad (isteğe bağlı)"
                          value={newGeliverSender.shortName}
                          onChange={(v) => setNewGeliverSender((s) => ({ ...s, shortName: v }))}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-900 text-xs font-semibold mb-1">Şehir</label>
                          <select
                            value={newGeliverSender.cityCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              const c = geliverCitiesOpts.find((x) => x.code === code);
                              setNewGeliverSender((s) => ({
                                ...s,
                                cityCode: code,
                                cityName: c?.name ?? "",
                                districtName: "",
                                districtId: "",
                              }));
                              void loadGeliverDistrictsForNewSender(code);
                            }}
                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                          >
                            <option value="">Seçin</option>
                            {geliverCitiesOpts.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-900 text-xs font-semibold mb-1">İlçe</label>
                          <select
                            value={newGeliverSender.districtId}
                            onChange={(e) => {
                              const id = e.target.value;
                              const d = geliverDistrictOpts.find((x) => x.id === id);
                              setNewGeliverSender((s) => ({ ...s, districtId: id, districtName: d?.name ?? "" }));
                            }}
                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                          >
                            <option value="">Seçin</option>
                            {geliverDistrictOpts.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <GlassTextarea
                        label="Adres1 (mahalle ile başlayın)"
                        value={newGeliverSender.address1}
                        onChange={(v) => setNewGeliverSender((s) => ({ ...s, address1: v }))}
                        rows={2}
                      />
                      <button
                        type="button"
                        disabled={creatingGeliverSender}
                        onClick={() => void createGeliverSenderFromPanel()}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-indigo-500"
                      >
                        {creatingGeliverSender ? "Oluşturuluyor…" : "Geliver'da gönderici oluştur"}
                      </button>
                    </div>
                  </div>
                )}

                {geliverHub === "shipments" && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-800 leading-relaxed">
                      Son kayıtlar token yetkinizle Geliver'dan çekilir;{" "}
                      <strong>teklif alınma zamanına göre yeniden eskiye</strong> sıralanır. «Aç» ile Yeni gönderi ekranında teklifleri
                      görürsünüz.
                    </p>
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950 leading-snug space-y-1.5">
                      <p>
                        <strong>Geliver kuralı:</strong> Teklif alındıktan sonra yaklaşık <strong>bir hafta</strong> içinde etiket alınıp kargoya verilmezse
                        Geliver gönderiyi / teklifi <strong>iptal edebilir</strong>. Süreleri resmi panel ve sözleşmenizde doğrulayın; gecikmeyi önlemek için
                        zamanında{" "}
                        <a href="https://app.geliver.io/shipments" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                          app.geliver.io
                        </a>{" "}
                        üzerinden «Etiket Al» ile tamamlayın.
                      </p>
                      <p>
                        <strong>Destek:</strong>{" "}
                        <a href={GELIVER_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                          WhatsApp
                        </a>
                        {" · "}
                        <a href="https://app.geliver.io/supporttickets/new" target="_blank" rel="noopener noreferrer" className="font-bold underline break-all">
                          Geliver destek talebi
                        </a>
                        . Kayıt:{" "}
                        <a href="https://app.geliver.io/signup" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                          app.geliver.io/signup
                        </a>
                        . Üst bölümdeki yardım kutusunda Yekpare'ye API kaydı adımları da vardır.
                      </p>
                    </div>
                    {geliverListLoading ? (
                      <p className="text-sm text-gray-600">Yükleniyor…</p>
                    ) : geliverListRows.length === 0 ? (
                      <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Kayıt yok veya liste boş.</p>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="min-w-full text-xs text-left">
                          <thead className="bg-gray-100 text-gray-800 font-bold">
                            <tr>
                              <th className="px-2 py-2 w-10 text-center">#</th>
                              <th className="px-3 py-2 min-w-[120px]">İsim soyisim</th>
                              <th className="px-3 py-2 min-w-[140px]">İl / ilçe / mahalle</th>
                              <th className="px-3 py-2 whitespace-nowrap">Kargo kayıt tarihi</th>
                              <th className="px-3 py-2 whitespace-nowrap">Telefon no</th>
                              <th className="px-3 py-2 w-14" />
                            </tr>
                          </thead>
                          <tbody>
                            {geliverListRows.map((row, i) => {
                              const id = geliverListRowId(row);
                              const displayName = geliverListRowDisplayName(row);
                              const displayLocality = geliverListRowDisplayLocality(row);
                              const displayPhone = geliverListRowDisplayPhone(row);
                              const offerMs = geliverShipmentOfferReceivedMs(row);
                              const rowNum = i + 1;
                              return (
                                <tr key={id || String(i)} className="border-t border-gray-200 hover:bg-gray-50">
                                  <td className="px-2 py-2 text-center font-bold text-gray-700">{rowNum}</td>
                                  <td className="px-3 py-2 text-gray-900 font-medium">{displayName}</td>
                                  <td className="px-3 py-2 text-gray-800 leading-snug">{displayLocality}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-800">{formatGeliverTrDateTime(offerMs)}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">{displayPhone}</td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      disabled={!id || geliverOfferBusy}
                                      onClick={() => void openGeliverShipmentFromList(id)}
                                      className="text-indigo-700 font-bold underline disabled:opacity-40"
                                    >
                                      Aç
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {geliverHub === "prices" && (
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-800">
                      Paket ölçüleri «Yeni gönderi» sekmesindeki cm/kg alanlarıyla aynıdır; önce orayı doldurun veya güncelleyin.
                    </p>
                    <button
                      type="button"
                      disabled={priceListLoading}
                      onClick={() => void loadGeliverPriceListFromApi()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {priceListLoading ? "İstek…" : "Fiyat listesini getir"}
                    </button>
                    {priceListRaw != null ? (
                      <div className="space-y-3">
                        {(geliverPriceListParsed.meta.desi ||
                          geliverPriceListParsed.meta.message != null ||
                          geliverPriceListParsed.meta.ok != null) && (
                          <div className="flex flex-wrap gap-2 text-xs rounded-lg border border-indigo-200 bg-white px-3 py-2 text-gray-900">
                            {geliverPriceListParsed.meta.desi ? (
                              <span>
                                <strong className="text-indigo-900">Hacimsel desi:</strong> {geliverPriceListParsed.meta.desi}
                              </span>
                            ) : null}
                            {geliverPriceListParsed.meta.ok != null ? (
                              <span className={geliverPriceListParsed.meta.ok ? "text-emerald-800" : "text-rose-800"}>
                                <strong>Durum:</strong> {geliverPriceListParsed.meta.ok ? "Başarılı" : "Başarısız"}
                              </span>
                            ) : null}
                            {geliverPriceListParsed.meta.message ? (
                              <span className="text-gray-700">
                                <strong>Mesaj:</strong> {geliverPriceListParsed.meta.message}
                              </span>
                            ) : null}
                          </div>
                        )}
                        {geliverPriceListParsed.rows.length > 0 ? (
                          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-200">
                                  <tr>
                                    <th className="px-3 py-2">Firma / servis</th>
                                    <th className="px-3 py-2">Taşıma</th>
                                    <th className="px-3 py-2 text-right">Tutar</th>
                                    <th className="px-3 py-2 text-right">KDV</th>
                                    <th className="px-3 py-2 text-right">Toplam</th>
                                    <th className="px-3 py-2">Para</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {geliverPriceListParsed.rows.map((row) => (
                                    <tr key={row.key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80">
                                      <td className="px-3 py-2">
                                        <span className="font-bold text-gray-900">{row.provider}</span>
                                        {row.serviceCode !== "—" ? (
                                          <span className="block text-[10px] text-gray-600 font-mono mt-0.5">{row.serviceCode}</span>
                                        ) : null}
                                      </td>
                                      <td className="px-3 py-2 text-gray-700">{row.transport || "—"}</td>
                                      <td className="px-3 py-2 text-right font-mono tabular-nums">{row.amount}</td>
                                      <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-600">{row.vat || "—"}</td>
                                      <td className="px-3 py-2 text-right font-bold font-mono tabular-nums text-indigo-900">
                                        {row.total || row.amount}
                                      </td>
                                      <td className="px-3 py-2 text-gray-600">{row.currency}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <ul className="md:hidden divide-y divide-gray-100">
                              {geliverPriceListParsed.rows.map((row) => (
                                <li key={row.key} className="px-3 py-3 space-y-1">
                                  <p className="font-bold text-gray-900 text-sm">
                                    {row.provider}
                                    {row.serviceCode !== "—" ? (
                                      <span className="block text-[10px] font-mono text-gray-600 font-normal">{row.serviceCode}</span>
                                    ) : null}
                                  </p>
                                  {row.transport ? <p className="text-xs text-gray-600">{row.transport}</p> : null}
                                  <p className="text-sm">
                                    <span className="text-gray-600">Toplam:</span>{" "}
                                    <strong className="text-indigo-900 font-mono">{row.total || row.amount}</strong>{" "}
                                    <span className="text-gray-500">{row.currency}</span>
                                    {row.vat ? (
                                      <span className="block text-[11px] text-gray-500 mt-0.5">
                                        Tutar {row.amount} · KDV {row.vat}
                                      </span>
                                    ) : null}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Tabloya dökülebilir teklif satırı bulunamadı. Aşağıdaki ham yanıtta yapı farklı olabilir.
                          </p>
                        )}
                        <details className="rounded-lg border border-gray-200 bg-white">
                          <summary className="cursor-pointer text-xs font-bold text-gray-700 px-3 py-2 hover:bg-gray-50">
                            Ham JSON (geliştirici)
                          </summary>
                          <pre className="text-[10px] border-t border-gray-100 p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-[280px] overflow-y-auto">
                            {typeof priceListRaw === "string"
                              ? priceListRaw
                              : JSON.stringify(priceListRaw, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : null}
                  </div>
                )}

                {geliverHub === "templates" && (
                  <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <GlassInput label="Şablon adı" value={newTpl.name} onChange={(v) => setNewTpl((s) => ({ ...s, name: v }))} />
                      <GlassInput label="Boy cm" value={newTpl.length} onChange={(v) => setNewTpl((s) => ({ ...s, length: v }))} />
                      <GlassInput label="En cm" value={newTpl.width} onChange={(v) => setNewTpl((s) => ({ ...s, width: v }))} />
                      <GlassInput label="Yükseklik cm" value={newTpl.height} onChange={(v) => setNewTpl((s) => ({ ...s, height: v }))} />
                      <GlassInput label="Ağırlık kg" value={newTpl.weight} onChange={(v) => setNewTpl((s) => ({ ...s, weight: v }))} />
                    </div>
                    <button
                      type="button"
                      disabled={tplLoading}
                      onClick={() => void createGeliverTplRow()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                    >
                      Şablon oluştur
                    </button>
                    {tplLoading ? (
                      <p className="text-sm">…</p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {geliverTemplates.map((t, i) => {
                          const o = t as Record<string, unknown>;
                          const tid = String(o.id ?? i);
                          return (
                            <li key={tid} className="flex flex-wrap justify-between gap-2 border rounded-lg p-2 bg-white">
                              <span className="font-mono break-all">{JSON.stringify(t)}</span>
                              <button
                                type="button"
                                onClick={() => void deleteGeliverTplRow(tid)}
                                className="text-rose-700 font-bold underline shrink-0"
                              >
                                Sil
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {geliverHub === "accounts" && (
                  <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-[11px] text-gray-800">
                      Kendi taşıyıcı anlaşmanızı API ile eklemek için sağlayıcı kodu ve hesap bilgileri gerekir. Yanlış parametreler hesabınızı etkileyebilir.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <GlassInput
                        label="providerCode"
                        value={newProv.providerCode}
                        onChange={(v) => setNewProv((s) => ({ ...s, providerCode: v }))}
                      />
                      <GlassInput label="Görünen ad" value={newProv.name} onChange={(v) => setNewProv((s) => ({ ...s, name: v }))} />
                      <GlassInput label="Kullanıcı adı" value={newProv.username} onChange={(v) => setNewProv((s) => ({ ...s, username: v }))} />
                      <GlassInput label="Şifre" value={newProv.password} onChange={(v) => setNewProv((s) => ({ ...s, password: v }))} type="password" />
                      <GlassInput label="version" value={newProv.version} onChange={(v) => setNewProv((s) => ({ ...s, version: v }))} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-900">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProv.isPublic}
                          onChange={(e) => setNewProv((s) => ({ ...s, isPublic: e.target.checked }))}
                          className="accent-indigo-600"
                        />
                        isPublic
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProv.sharable}
                          onChange={(e) => setNewProv((s) => ({ ...s, sharable: e.target.checked }))}
                          className="accent-indigo-600"
                        />
                        sharable
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProv.isDynamicPrice}
                          onChange={(e) => setNewProv((s) => ({ ...s, isDynamicPrice: e.target.checked }))}
                          className="accent-indigo-600"
                        />
                        isDynamicPrice
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={provLoading}
                      onClick={() => void createGeliverProvRow()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                    >
                      Hesap ekle
                    </button>
                    {provLoading ? (
                      <p className="text-sm">…</p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {geliverProviderAccounts.map((acc, i) => {
                          const o = acc as Record<string, unknown>;
                          const aid = String(o.id ?? i);
                          return (
                            <li key={aid} className="flex flex-wrap justify-between gap-2 border rounded-lg p-2 bg-white">
                              <span className="font-mono break-all">{JSON.stringify(acc)}</span>
                              <button
                                type="button"
                                onClick={() => void deleteGeliverProvRow(aid)}
                                className="text-rose-700 font-bold underline shrink-0"
                              >
                                Sil
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {geliverHub === "docs" && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 space-y-2">
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>
                        <a
                          href="https://docs.geliver.io/docs/home"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-700 font-bold underline"
                        >
                          Geliver API dokümantasyonu
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://github.com/geliverapp/geliver-js"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-700 font-bold underline"
                        >
                          geliver-js (TypeScript SDK)
                        </a>
                      </li>
                      <li>
                        <a href="https://github.com/geliverapp" target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-bold underline">
                          Tüm resmi SDK'lar (Go, PHP, Python…)
                        </a>
                      </li>
                    </ul>
                    <p className="text-xs leading-relaxed">
                      Takip kodları, sağlayıcı servis kodları ve hata kodları için dokümantasyondaki ilgili bölümlere bakın; panel bu uçları backend üzerinden proxy eder.
                    </p>
                  </div>
                )}

                {geliverHub === "compose" && (
                  <>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs text-gray-900 leading-relaxed">
                  <strong>GÖNDERİCİ ADRESİ:</strong>{" "}
                  {vendor?.geliver_sender_address_id ? (
                    <>
                      Seçili Geliver kaydı{" "}
                      <span className="font-mono font-bold">{vendor.geliver_sender_address_id}</span>. Değiştirmek için{" "}
                      <button type="button" className="text-indigo-800 font-bold underline" onClick={() => setGeliverHub("addresses")}>
                        Gönderici adresleri
                      </button>
                      .
                    </>
                  ) : (
                    <>
                      Henüz seçili gönderici yok.{" "}
                      <button type="button" className="text-indigo-800 font-bold underline" onClick={() => setGeliverHub("addresses")}>
                        Gönderici adresi seçin veya yeni ekleyin
                      </button>
                      .
                    </>
                  )}
                </div>
                {manualGeliverError ? (
                  <div
                    role="alert"
                    className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm space-y-2"
                  >
                    <p className="font-bold">Geliver gönderi hatası</p>
                    <p className="whitespace-pre-wrap break-words leading-snug">{manualGeliverError}</p>
                    {(manualGeliverError.includes("E1084") ||
                      manualGeliverError.toLowerCase().includes("record not found")) && (
                      <p className="text-xs text-red-950 pt-1 border-t border-red-200">
                        Bu hata çoğunlukla <strong>silinmiş veya geçersiz gönderici adresi</strong> ya da yanlış{" "}
                        <strong>kuruluş UUID</strong> kaydından kaynaklanır.{" "}
                        <button
                          type="button"
                          className="font-bold underline text-indigo-800"
                          onClick={() => setGeliverHub("addresses")}
                        >
                          Gönderici adresleri
                        </button>{" "}
                        üzerinden varsayılan adresi yenileyin; kuruluş kimliğini Geliver paneliyle eşleştirin.
                      </p>
                    )}
                    {(manualGeliverError.includes("gönderici") || manualGeliverError.toLocaleLowerCase("tr-TR").includes("mahalle")) && (
                      <p className="text-xs text-red-950 pt-1 border-t border-red-200">
                        Gönderici adresi <strong>Kargo → Gönderici adresleri</strong>, <strong>Genel Ayarlar → Geliver</strong> ve işletme <strong>Profil</strong> adresi ile uyumlu olmalıdır.
                        <button
                          type="button"
                          className="ml-2 font-bold underline text-indigo-800"
                          onClick={() => setTab("genel-ayarlar")}
                        >
                          Ayarlara git
                        </button>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setManualGeliverError(null)}
                      className="text-xs font-bold text-red-800 underline"
                    >
                      Bu mesajı kapat
                    </button>
                  </div>
                ) : null}
                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 space-y-3">
                    <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wide">Alıcı adresi</h3>
                    <GlassInput label="Kişi / kurum adı" value={manualShip.recipientName} onChange={(v) => setManualShip((s) => ({ ...s, recipientName: v }))} />
                    <GlassInput label="Telefon" value={manualShip.phone} onChange={(v) => setManualShip((s) => ({ ...s, phone: v }))} placeholder="5xx…" />
                    <GlassTextarea
                      label="Sokak / cadde, bina no, daire (mahalle yukarıdan seçilir)"
                      value={manualShip.address1}
                      onChange={(v) => setManualShip((s) => ({ ...s, address1: v }))}
                      rows={3}
                    />
                    <div className="rounded-xl border border-gray-300 bg-white p-3">
                      <p className="text-xs font-bold text-gray-900 mb-2">İl, ilçe, mahalle (yekpare adres veritabanı)</p>
                      <TrAddressFields
                        variant="light"
                        singleRow
                        showMahalle
                        showSokak={false}
                        value={{ city: manualShip.city, district: manualShip.district, mahalle: manualShip.mahalle }}
                        onChange={(v) =>
                          setManualShip((s) => ({ ...s, city: v.city, district: v.district, mahalle: v.mahalle }))
                        }
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <GlassInput label="Posta kodu (isteğe bağlı)" value={manualShip.zip} onChange={(v) => setManualShip((s) => ({ ...s, zip: v.replace(/\D/g, "").slice(0, 5) }))} />
                      <GlassInput label="E-posta (isteğe bağlı)" value={manualShip.email} onChange={(v) => setManualShip((s) => ({ ...s, email: v }))} type="email" />
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 space-y-3">
                    <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wide">Paket (cm / kg)</h3>
                    <p className="text-xs text-gray-900 leading-relaxed">
                      Ölçüleri Geliver teklifleri için gereklidir.{" "}
                      {geliverVolumeDesiPreview ? (
                        <>
                          Tahmini hacimsel desi (boy×en×yükseklik÷3000):{" "}
                          <strong>{geliverVolumeDesiPreview.desi.toFixed(2)}</strong>
                          {geliverVolumeDesiPreview.kg > 0 ? (
                            <>
                              {" "}
                              — Ağırlık <strong>{geliverVolumeDesiPreview.kg}</strong> kg. Ücretlendirme tipik olarak hacimsel desi ile kg
                              arasındaki <strong>büyük</strong> değere göre yapılır (Geliver paneliyle aynı hacim formülü).
                            </>
                          ) : (
                            <> Taşıyıcılar genelde kg ile hacimsel desinin büyüğünü esas alır.</>
                          )}
                        </>
                      ) : (
                        <>
                          Kabaca hacimsel desi: cm cinsinden boy×en×yükseklik÷3000. 30×20×15 cm örneğinde bu değer 3'tür; küçük kutu
                          için ölçüleri küçültün.
                        </>
                      )}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <GlassInput label="Boy (cm)" value={manualShip.lengthCm} onChange={(v) => setManualShip((s) => ({ ...s, lengthCm: v }))} />
                      <GlassInput label="En (cm)" value={manualShip.widthCm} onChange={(v) => setManualShip((s) => ({ ...s, widthCm: v }))} />
                      <GlassInput label="Yükseklik (cm)" value={manualShip.heightCm} onChange={(v) => setManualShip((s) => ({ ...s, heightCm: v }))} />
                    </div>
                    <GlassInput label="Ağırlık (kg)" value={manualShip.weightKg} onChange={(v) => setManualShip((s) => ({ ...s, weightKg: v }))} />
                    <GlassInput
                      label="Referans / not (isteğe bağlı)"
                      value={manualShip.reference}
                      onChange={(v) => setManualShip((s) => ({ ...s, reference: v }))}
                      placeholder="İç referans"
                    />
                  </div>
                </div>
                {manualShipResult && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 space-y-1">
                    <div>
                      <strong>Gönderi:</strong> {manualShipResult.shipmentId}
                    </div>
                    {manualShipResult.trackingNumber && (
                      <div>
                        <strong>Takip:</strong> <span className="font-mono">{manualShipResult.trackingNumber}</span>
                      </div>
                    )}
                    {manualShipResult.labelUrl && (
                      <a href={manualShipResult.labelUrl} target="_blank" rel="noopener noreferrer" className="inline-block font-bold text-indigo-800 underline">
                        Etiket / PDF aç
                      </a>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setManualShipResult(null);
                      setGeliverDraft(null);
                      setManualShip({
                        recipientName: "",
                        phone: "",
                        address1: "",
                        city: "",
                        district: "",
                        mahalle: "",
                        zip: "",
                        email: "",
                        lengthCm: "20",
                        widthCm: "15",
                        heightCm: "10",
                        weightKg: "1",
                        reference: "",
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-400 text-gray-900 font-semibold text-sm hover:bg-gray-100"
                  >
                    Formu sıfırla
                  </button>
                  <button
                    type="button"
                    disabled={manualShipBusy}
                    onClick={() => void submitManualGeliverShipment()}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 disabled:opacity-50 shadow-md"
                  >
                    {manualShipBusy ? "Gönderi oluşturuluyor (birkaç sn–dk)…" : "Teklifleri getir ve kaydet"}
                  </button>
                </div>
                {geliverDraft ? (
                  <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/80 to-white p-4 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">Gönderi detayı &amp; teklifler</h3>
                      <span className="text-[10px] font-mono text-gray-600 break-all max-w-[220px]">{geliverDraft.id}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-emerald-950 uppercase tracking-wide">Geliver bakiye</p>
                        {geliverBalanceSummary ? (
                          <p className="text-sm font-bold text-emerald-900 truncate">{geliverBalanceSummary}</p>
                        ) : geliverBalanceRaw != null ? (
                          <p className="text-xs text-emerald-900 font-mono break-all">
                            Yanıt alındı; özet üretilemediyse{" "}
                            <button type="button" className="font-bold underline text-emerald-950" onClick={() => setTab("genel-ayarlar")}>
                              Genel Ayarlar → Geliver
                            </button>{" "}
                            altında «Ham API yanıtı» veya burada «Bakiyeyi yenile» ile tekrar deneyin.
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-900">Henüz sorgulanmadı.</p>
                        )}
                        {geliverBalancePrefetchError ? (
                          <p className="text-[11px] text-amber-950 bg-amber-100/90 border border-amber-300 rounded-lg px-2 py-1.5 mt-1 leading-snug">
                            Otomatik bakiye isteği: {geliverBalancePrefetchError}{" "}
                            <button
                              type="button"
                              className="font-bold underline text-amber-950"
                              onClick={() => void loadGeliverBalance()}
                            >
                              Tekrar dene
                            </button>
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={geliverBalanceLoading}
                        onClick={() => void loadGeliverBalance()}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50 hover:bg-emerald-600"
                      >
                        {geliverBalanceLoading ? "…" : "Bakiyeyi yenile"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={geliverOfferBusy}
                        onClick={() => void refreshGeliverDraft()}
                        className="px-3 py-2 rounded-xl bg-white border-2 border-indigo-300 text-indigo-900 text-xs font-bold hover:bg-indigo-50 disabled:opacity-50"
                      >
                        API&apos;den yenile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGeliverDraft(null);
                        }}
                        className="px-3 py-2 rounded-xl border-2 border-gray-300 text-gray-800 text-xs font-semibold hover:bg-gray-50"
                      >
                        Detayı kapat
                      </button>
                    </div>
                    <div className="rounded-xl border border-gray-300 bg-white p-3 space-y-2">
                      <p className="text-xs font-bold text-gray-900">Paket — Güncelle (Geliver gönderi paketini günceller)</p>
                      <p className="text-[11px] text-gray-700">Yukarıdaki boyut/ağırlık alanlarını değiştirip tıklayın; teklifler yeniden hesaplanır.</p>
                      <button
                        type="button"
                        disabled={geliverOfferBusy}
                        onClick={() => void updateGeliverDraftPackage()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Ölçüleri gönder ve teklifleri yenile
                      </button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-900">Kargo teklifleri</p>
                      {collectGeliverOffersFromShipment(geliverDraft.shipment).length === 0 ? (
                        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Henüz teklif yok. «API&apos;den yenile» veya paketi güncelleyin; Geliver arka planda teklif üretir.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                          {collectGeliverOffersFromShipment(geliverDraft.shipment).map((o) => {
                            const pinnedHere = geliverPinnedOfferMap[geliverDraft.id] === o.id;
                            return (
                              <div
                                key={o.id}
                                className={`flex flex-wrap items-stretch justify-between gap-2 p-3 rounded-xl border-2 ${
                                  pinnedHere ? "border-emerald-500 bg-emerald-50/90" : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-gray-900 leading-snug">{o.title}</p>
                                  <p className="text-xs text-gray-700">{o.subtitle}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0 self-center">
                                  {pinnedHere ? (
                                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">
                                      Kayıtlı
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => pinGeliverOfferChoice(geliverDraft.id, o.id)}
                                    className="px-2 py-1.5 rounded-lg bg-indigo-700 text-white text-[9px] font-extrabold leading-tight text-center hover:bg-indigo-600 uppercase tracking-wide max-w-[9.5rem]"
                                  >
                                    TEKLİFİ GELİVERE KAYDET
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {collectGeliverOffersFromShipment(geliverDraft.shipment).length > 0 ? (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-3 space-y-2">
                          <p className="text-xs font-bold text-gray-900">Etiket satın alma</p>
                          <p className="text-xs text-gray-800 leading-relaxed">
                            Yekpare gönderiyi Geliver'e kaydeder ve teklifleri burada gösterir; etiket ücreti ve barkod için{" "}
                            <a
                              href="https://app.geliver.io/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-indigo-800 underline"
                            >
                              https://app.geliver.io/
                            </a>{" "}
                            üzerinde oturum açıp{" "}
                            <a
                              href="https://app.geliver.io/shipments"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-indigo-800 underline"
                            >
                              Gönderiler
                            </a>{" "}
                            listesinde ilgili satırda «Etiket Al» kullanın (API ile satın alma kapatıldı; çoklu gönderi ve 500/502
                            riski azaltıldı).
                          </p>
                        </div>
                      ) : null}
                      {(() => {
                        const offers = collectGeliverOffersFromShipment(geliverDraft.shipment);
                        let minPrice: number | null = null;
                        for (const o of offers) {
                          if (o.amount != null && Number.isFinite(o.amount)) {
                            minPrice = minPrice == null ? o.amount : Math.min(minPrice, o.amount);
                          }
                        }
                        const bal = (() => {
                          const r = geliverBalanceRaw;
                          if (r == null) return null;
                          if (typeof r === "number" && Number.isFinite(r)) return r;
                          if (typeof r === "string") {
                            const n = Number(r.replace(/[^\d,.\-]/g, "").replace(",", "."));
                            return Number.isFinite(n) ? n : null;
                          }
                          if (typeof r === "object") {
                            const ob = r as Record<string, unknown>;
                            for (const v of [ob.balance, ob.amount, ob.availableBalance, ob.totalBalance]) {
                              if (v == null) continue;
                              const n =
                                typeof v === "number"
                                  ? v
                                  : Number(String(v).replace(/[^\d,.\-]/g, "").replace(",", "."));
                              if (Number.isFinite(n)) return n;
                            }
                          }
                          return null;
                        })();
                        const insufficient = minPrice != null && bal != null && bal + 0.01 < minPrice;
                        return (
                          <>
                            {insufficient ? (
                              <div className="text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-300 rounded-lg px-3 py-2">
                                Geliver bakiyesi yetersiz: <b>{bal!.toFixed(2).replace(".", ",")} ₺</b> · listedeki en düşük
                                teklif <b>{minPrice!.toFixed(2).replace(".", ",")} ₺</b>.{" "}
                                <a
                                  href="https://app.geliver.io/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold underline text-rose-950"
                                >
                                  app.geliver.io
                                </a>{" "}
                                üzerinden bakiye yükleyin; etiketi yine panelden «Etiket Al» ile alın.
                              </div>
                            ) : null}
                            <p className="text-[11px] text-gray-700 mt-2 leading-relaxed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              Panelde taşıyıcıyı seçip ödeme yapmak için{" "}
                              <a
                                href="https://app.geliver.io/shipments"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-indigo-800 underline"
                              >
                                https://app.geliver.io/shipments
                              </a>{" "}
                              adresinde bu gönderi kimliğine yakın satırı bulun ve «Etiket Al» düğmesine basın.
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : null}
                {isShop && (
                  <p className="text-xs text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                    Mağaza siparişinde kargo için{" "}
                    <button type="button" className="font-bold text-indigo-700 underline" onClick={() => setTab("siparisler")}>
                      Siparişler
                    </button>{" "}
                    sekmesinde <strong>Kargola</strong> kullanın. Geliver API anahtarı:{" "}
                    <button type="button" className="font-bold text-indigo-700 underline" onClick={() => setTab("genel-ayarlar")}>
                      Genel Ayarlar → Geliver
                    </button>
                    .
                  </p>
                )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: ÜRÜNLER / MENÜ ─── */}
        {tab === "urunler" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            {!isApproved ? (
              <div className="text-center py-12 text-gray-500">Başvurunuz onaylandıktan sonra ürün/menü yönetimi aktif olacaktır.</div>
            ) : (
              <div className="space-y-5">
                {isShop ? (
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-gray-950">Mağaza katalog paneli</h3>
                        <p className="text-xs text-gray-600">
                          Mağaza görünümü: stok, indirim, görsel ve vitrin öne çıkarma durumları tek satırda takip edilir.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setTab("aktar")} className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50">
                          CSV içe/dışa aktar
                        </button>
                        <a href={vitrinPublicPath} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-50">
                          Vitrinde kontrol et
                        </a>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <EcommerceSignalCard title="Yayın" value={String(products.length)} detail="Aktif ürün" />
                      <EcommerceSignalCard title="Öne çıkan" value={String(featuredProducts.length)} detail="Popüler etiketi" />
                      <EcommerceSignalCard title="İndirim" value={String(discountedProducts.length)} detail="Sale price dolu" />
                      <EcommerceSignalCard title="Düşük stok" value={String(lowStockProducts.length)} detail="1-5 adet" warn={lowStockProducts.length > 0} />
                      <EcommerceSignalCard title="Tükenen" value={String(outOfStockProducts.length)} detail="0 adet" warn={outOfStockProducts.length > 0} />
                    </div>
                  </div>
                ) : null}
                {/* Kategori satırı — premium sekmeler */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap p-1 rounded-2xl bg-gray-100/90 border border-gray-200/80">
                    <button
                      onClick={() => setCatFilter(null)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                        catFilter === null
                          ? "bg-gradient-to-b from-indigo-50 to-white text-gray-900 border-indigo-300 shadow-sm ring-2 ring-indigo-500/20"
                          : "bg-transparent text-gray-600 border-transparent hover:bg-white hover:text-gray-900 hover:shadow-sm"
                      }`}
                    >
                      Tümü ({products.length})
                    </button>
                    {categories.map(c => (
                      <div key={c.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setCatFilter(catFilter === c.id ? null : c.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                            catFilter === c.id
                              ? "bg-gradient-to-b from-indigo-50 to-white text-gray-900 border-indigo-300 shadow-sm ring-2 ring-indigo-500/20"
                              : "bg-transparent text-gray-600 border-transparent hover:bg-white hover:text-gray-900 hover:shadow-sm"
                          }`}
                        >
                          {c.name} ({products.filter(p => p.menu_category_id === c.id).length})
                        </button>
                        {(!isShop || c.is_custom) && (
                        <button onClick={() => deleteCategory(c.id)} className="text-gray-400 hover:text-red-600 text-xs transition px-1" title="Kategoriyi sil">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(isDelivery || isShop) && (
                  <div className="flex gap-2">
                    <input
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCategory()}
                      placeholder={isShop ? "Özel kategori (listedeki yoksa)..." : "Yeni kategori adı..."}
                      className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition"
                    />
                    <button
                      onClick={addCategory}
                      disabled={!newCatName.trim() || addingCat}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 text-xs font-semibold rounded-xl transition disabled:opacity-40"
                    >
                      + {isShop ? "Özel Ekle" : "Ekle"}
                    </button>
                  </div>
                  )}
                  {isShop && (
                    <p className="text-[11px] text-gray-500">Ürün eklerken önce <strong>Alışveriş Kategorileri</strong> listesinden seçin; listede yoksa özel kategori açabilirsiniz.</p>
                  )}
                </div>

                {/* Stok uyarısı (Inventory Management) */}
                {products.filter(p => p.stock !== null && p.stock <= 5).length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-amber-900 text-xs font-semibold mb-1.5">⚠️ Düşük Stok Uyarısı</p>
                    <div className="flex flex-wrap gap-2">
                      {products.filter(p => p.stock !== null && p.stock <= 5).map(p => (
                        <span key={p.id} className="text-xs bg-amber-100 text-amber-950 border border-amber-200 px-2 py-1 rounded-lg">{p.name} — {p.stock} adet</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-gray-500 text-xs font-medium">{visibleProducts.length} ürün</p>
                    {visibleProducts.length > 0 ? (
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={visibleProducts.length > 0 && visibleProducts.every((p) => selectedProductIds.has(p.id))}
                          onChange={toggleSelectAllVisibleProducts}
                        />
                        Tümünü seç
                      </label>
                    ) : null}
                    {selectedProductIds.size > 0 ? (
                      <span className="text-xs font-semibold text-indigo-700">{selectedProductIds.size} seçili</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedProductIds.size > 0 ? (
                      <button
                        type="button"
                        onClick={() => void bulkDeleteProducts()}
                        disabled={bulkDeletingProducts}
                        className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-sm font-bold rounded-xl transition disabled:opacity-50"
                      >
                        {bulkDeletingProducts ? "Siliniyor…" : `Seçilenleri sil (${selectedProductIds.size})`}
                      </button>
                    ) : null}
                    <button
                      onClick={openAddProduct}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-50 text-gray-900 border border-indigo-300 text-sm font-bold rounded-xl transition shadow-sm"
                    >
                      <span className="text-lg leading-none text-indigo-700">+</span>
                      {isDelivery ? "Menüye Ekle" : "Ürün Ekle"}
                    </button>
                  </div>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">{isDelivery ? "🍽️" : "🛍️"}</div>
                    <div className="text-gray-500 text-sm">Henüz {isDelivery ? "menü kalemi" : "ürün"} yok.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleProducts.map(p => (
                      <div key={p.id} className={`bg-white border rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:shadow transition ${selectedProductIds.has(p.id) ? "border-indigo-400 ring-1 ring-indigo-200" : "border-gray-200 hover:border-gray-300"}`}>
                        <label className="flex items-center shrink-0 cursor-pointer" title="Seç">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            checked={selectedProductIds.has(p.id)}
                            onChange={() => toggleProductSelection(p.id)}
                          />
                        </label>
                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                          {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">{isDelivery ? "🍽️" : "🛍️"}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                            {isShop && <span className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-full">Yayında</span>}
                            {p.is_popular && <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full">⭐ Popüler</span>}
                            {isShop && p.sale_price && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price || 0) && (
                              <span className="text-xs bg-pink-50 text-pink-900 border border-pink-200 px-1.5 py-0.5 rounded-full">İndirim</span>
                            )}
                            {isShop && !p.image_url && <span className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded-full">Görsel yok</span>}
                            {p.is_vegan && <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded-full">🌿 Vegan</span>}
                            {p.is_spicy && <span className="text-xs bg-red-100 text-red-900 border border-red-300 px-1.5 py-0.5 rounded-full">🌶️</span>}
                          </div>
                          {p.category_name && <div className="text-gray-500 text-xs mt-0.5">{p.category_name}</div>}
                          {p.description && <div className="text-gray-600 text-xs truncate">{p.description}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <div className="text-right">
                            {p.sale_price ? (<div><span className="font-bold text-emerald-700 text-sm">₺{Number(p.sale_price).toFixed(2)}</span><span className="line-through text-gray-400 text-xs ml-1">₺{Number(p.price).toFixed(2)}</span></div>) : (<span className="font-bold text-gray-900 text-sm">₺{Number(p.price || 0).toFixed(2)}</span>)}
                            {p.stock !== null ? (
                              <div className={`text-xs ${p.stock <= 0 ? "text-red-700 font-bold" : p.stock <= 5 ? "text-amber-700 font-semibold" : "text-gray-500"}`}>
                                Stok: {p.stock}{p.stock <= 0 ? " · tükendi" : p.stock <= 5 ? " · düşük" : ""}
                              </div>
                            ) : isShop ? (
                              <div className="text-xs text-gray-500">Stok: sınırsız</div>
                            ) : null}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEditProduct(p)} className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 text-xs font-semibold rounded-lg transition">Düzenle</button>
                            <button onClick={() => deleteProduct(p.id)} className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-semibold rounded-lg transition">Sil</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ÜRÜN MODAL ── */}
        {productModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setProductModal(null)}>
            <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900 font-bold text-lg">{productModal === "edit" ? "Ürünü Düzenle" : isDelivery ? "Menüye Ekle" : "Yeni Ürün"}</h3>
                <button onClick={() => setProductModal(null)} className="text-gray-400 hover:text-gray-700 transition text-xl leading-none">✕</button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-gray-600 text-xs font-medium mb-1.5">İsim *</label><input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Ürün / yemek adı" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-gray-600 text-xs font-medium mb-1.5">Fiyat (₺) *</label><input type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition" /></div>
                  <div><label className="block text-gray-600 text-xs font-medium mb-1.5">İndirimli Fiyat (₺)</label><input type="number" min="0" step="0.01" value={productForm.salePrice} onChange={e => setProductForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="Opsiyonel" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition" /></div>
                </div>
                <div><label className="block text-gray-600 text-xs font-medium mb-1.5">Kategori</label>
                  {isShop ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold text-indigo-800 mb-1.5">Alışveriş Kategorileri</p>
                        <EcommerceCategorySelect
                          tree={ecommerceCategoryTree}
                          value={productForm.useCustomCategory ? "" : productForm.ecommerceCategoryId}
                          onChange={(v) => setProductForm((f) => ({ ...f, ecommerceCategoryId: v, useCustomCategory: false, customCategoryName: "" }))}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.useCustomCategory}
                          onChange={(e) => setProductForm((f) => ({ ...f, useCustomCategory: e.target.checked, ecommerceCategoryId: e.target.checked ? "" : f.ecommerceCategoryId }))}
                          className="rounded accent-indigo-600"
                        />
                        Listede yok — özel kategori aç
                      </label>
                      {productForm.useCustomCategory && (
                        <input
                          value={productForm.customCategoryName}
                          onChange={(e) => setProductForm((f) => ({ ...f, customCategoryName: e.target.value }))}
                          placeholder="Özel kategori adı"
                          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-indigo-500"
                        />
                      )}
                    </div>
                  ) : (
                    <select value={productForm.menuCategoryId} onChange={e => setProductForm(f => ({ ...f, menuCategoryId: e.target.value }))} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-indigo-500"><option value="">— Kategori seçin —</option>{categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>
                  )}
                </div>
                {isShop && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-800">Varyasyonlar (beden, renk vb.)</p>
                      <button
                        type="button"
                        onClick={() => setProductOptions((opts) => [...opts, { name: "", choicesText: "", required: false, multiple: false }])}
                        className="text-[11px] font-semibold text-indigo-700 hover:underline"
                      >
                        + Varyasyon ekle
                      </button>
                    </div>
                    {productOptions.length === 0 ? (
                      <p className="text-[11px] text-gray-500">Renk, beden gibi seçenekler ekleyebilirsiniz.</p>
                    ) : productOptions.map((opt, idx) => (
                      <div key={idx} className="grid gap-2 sm:grid-cols-2 border border-gray-200 rounded-lg p-2 bg-white">
                        <input
                          value={opt.name}
                          onChange={(e) => setProductOptions((opts) => opts.map((o, i) => i === idx ? { ...o, name: e.target.value } : o))}
                          placeholder="Varyasyon adı (Renk)"
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                        />
                        <input
                          value={opt.choicesText}
                          onChange={(e) => setProductOptions((opts) => opts.map((o, i) => i === idx ? { ...o, choicesText: e.target.value } : o))}
                          placeholder="Seçenekler (Kırmızı, Mavi)"
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs sm:col-span-2"
                        />
                        <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={opt.required} onChange={(e) => setProductOptions((opts) => opts.map((o, i) => i === idx ? { ...o, required: e.target.checked } : o))} /> Zorunlu</label>
                        <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={opt.multiple} onChange={(e) => setProductOptions((opts) => opts.map((o, i) => i === idx ? { ...o, multiple: e.target.checked } : o))} /> Çoklu seçim</label>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Açıklama</label>
                  <textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} placeholder="Ürün / yemek hakkında kısa açıklama..." rows={2} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition resize-none" />
                  <button type="button" onClick={aiGenerateProductText} disabled={aiGeneratingProduct} className="mt-2 px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-900 text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-50">
                    {aiGeneratingProduct ? "AI üretiyor..." : "✨ AI ile ürün açıklaması üret"}
                  </button>
                </div>
                <div><label className="block text-gray-600 text-xs font-medium mb-1.5">Görsel URL</label><input value={productForm.imageUrl} onChange={e => setProductForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition" />{productForm.imageUrl && <img src={productForm.imageUrl} alt="önizleme" className="mt-2 w-20 h-20 rounded-xl object-cover border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}</div>
                <div><label className="block text-gray-600 text-xs font-medium mb-1.5">Stok Adedi (boş = sınırsız)</label><input type="number" min="0" value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: e.target.value }))} placeholder="Sınırsız" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition" /></div>
                <div className="flex gap-4">
                  {[{ key: "isPopular" as const, label: "⭐ Popüler" }, { key: "isVegan" as const, label: "🌿 Vegan" }, { key: "isSpicy" as const, label: "🌶️ Acılı" }].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={productForm[key]} onChange={e => setProductForm(f => ({ ...f, [key]: e.target.checked }))} className="w-4 h-4 rounded accent-indigo-600" /><span className="text-gray-700 text-xs">{label}</span></label>
                  ))}
                </div>
                <button onClick={saveProduct} disabled={!productForm.name || !productForm.price || savingProduct} className="w-full py-3.5 bg-gradient-to-b from-indigo-100 to-indigo-50 hover:from-indigo-200 hover:to-indigo-100 text-gray-900 border border-indigo-400 font-bold rounded-2xl transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm">
                  {savingProduct ? <><span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin" /> Kaydediliyor...</> : productModal === "edit" ? "💾 Güncelle" : "➕ Ekle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SİPARİŞLER ─── */}
        {tab === "siparisler" && (
          <div>
            {!isApproved ? (
              <div className="text-center py-12 text-gray-500">Başvurunuz onaylandıktan sonra siparişler burada görünecektir.</div>
            ) : (
              <>
                {vendor?.geliver_api_token_masked && (isDelivery || isShop) && (
                  <div className="mb-3 text-xs text-gray-900 bg-sky-100 border-2 border-sky-300 rounded-xl px-3 py-2">
                    <strong>Geliver:</strong> Sipariş satırından <strong>Kargola</strong> ile teklifleri Yekpare'de açın; etiket{" "}
                    <a href="https://app.geliver.io/shipments" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-800">
                      Geliver Gönderiler
                    </a>{" "}
                    üzerinden alınır. Bağımsız gönderi için{" "}
                    <button type="button" className="underline font-bold text-indigo-800" onClick={() => setTab("kargo")}>
                      Kargo Gönder
                    </button>{" "}
                    · <strong>Kargo teklif kayıtları</strong> listesi (Kargo sekmesi) sıra ve kayıt tarihi gösterir. API anahtarı:{" "}
                    <button type="button" className="underline font-bold text-indigo-800" onClick={() => setTab("genel-ayarlar")}>
                      Genel Ayarlar
                    </button>
                    .
                  </div>
                )}
                <div className="mb-4">
                  <OrderTrackSearch compact />
                </div>
                <div className="flex gap-2 flex-wrap mb-4">
                  {[{ key: "all", label: "Tümü" }, { key: "pending", label: "⏳ Bekliyor" }, { key: "confirmed", label: "✓ Onaylandı" }, { key: "preparing", label: "🍳 Hazırlanıyor" }, { key: "ready", label: "✓ Hazır" }, { key: "delivered", label: "🚴 Teslim" }, { key: "cancelled", label: "✗ İptal" }].map(f => {
                    const cnt = f.key === "all" ? orders.length : orders.filter(o => o.status === f.key).length;
                    return (
                      <button key={f.key} onClick={() => setOrderStatusFilter(f.key)} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1 ${orderStatusFilter === f.key ? "bg-gradient-to-b from-indigo-50 to-white text-gray-900 border-indigo-300 shadow-sm ring-2 ring-indigo-500/25" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"}`}>
                        {f.label}{cnt > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${f.key === "pending" && cnt > 0 ? "bg-amber-500 text-gray-900" : "bg-gray-200 text-gray-800"}`}>{cnt}</span>}
                      </button>
                    );
                  })}
                  <button onClick={() => loadOrders()} className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold border-2 border-gray-400 bg-white text-gray-900 hover:bg-gray-100 transition">↻ Yenile</button>
                  <a href="/kasiyer" target="_blank" className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 border-indigo-600 bg-indigo-100 text-indigo-950 hover:bg-indigo-200 transition">🖥️ Kasiyer Ekranını Aç</a>
                </div>
                {orders.filter(o => orderStatusFilter === "all" || o.status === orderStatusFilter).length === 0 ? (
                  <div className="text-center py-12"><div className="text-4xl mb-3">📦</div><div className="text-gray-500 text-sm">{orders.length === 0 ? "Henüz sipariş bulunmuyor." : "Bu filtreye uygun sipariş yok."}</div></div>
                ) : (
                  <div className="space-y-3">
                    {orders.filter(o => orderStatusFilter === "all" || o.status === orderStatusFilter).map(o => {
                      const actions = nextStatusActions(o.status);
                      const isUpdating = updatingOrder === o.id;
                      const estLabel = formatEstimatedForOrder(o);
                      return (
                        <div key={o.id} className={`border rounded-2xl p-4 transition ${o.status === "pending" ? "bg-amber-50 border-amber-200" : o.status === "cancelled" ? "bg-red-50 border-red-200" : o.status === "delivered" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="space-y-1 min-w-0">
                              {o.order_number ? (
                                <div>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Sipariş kodu (müşteriye)</span>
                                  <p className="font-mono text-sm font-black text-indigo-900 tracking-tight break-all">{o.order_number}</p>
                                </div>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600">
                                <span className="font-medium text-gray-800">Kayıt #{o.id}</span>
                                <span className="text-gray-500">{o.customer_name || "İsimsiz"}</span>
                              </div>
                              {o.status === "pending" && <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full animate-pulse">YENİ</span>}
                            </div>
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              <span className="font-bold text-gray-900 text-sm">₺{Number(o.total).toFixed(2)}</span>
                              {Number(o.platform_commission_amount) > 0 && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                  Komisyon ₺{Number(o.platform_commission_amount).toFixed(2)}
                                  {o.commission_rate_pct_snapshot != null ? ` (${String(o.commission_rate_pct_snapshot)}%)` : ""}
                                </span>
                              )}
                              {(vendor?.geliver_api_token_masked || o.geliver_shipment_id || o.geliver_last_error || o.geliver_label_url) && (
                                <div className="flex flex-col items-end gap-1 text-[10px] text-gray-600 max-w-[14rem] text-right">
                                  {o.geliver_tracking_number && (
                                    <span className="font-mono bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md">
                                      📦 {o.geliver_tracking_number}
                                    </span>
                                  )}
                                  {o.geliver_label_url && (
                                    <a
                                      href={o.geliver_label_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sky-700 underline font-medium"
                                    >
                                      Etiket / PDF
                                    </a>
                                  )}
                                  {o.geliver_last_error && (
                                    <span className="text-rose-700 leading-snug">{String(o.geliver_last_error).slice(0, 140)}</span>
                                  )}
                                  {vendor?.geliver_api_token_masked &&
                                    (isDelivery || isShop) &&
                                    !o.geliver_label_url &&
                                    !["cancelled"].includes(o.status) && (
                                      <div className="mt-0.5 flex flex-col items-end gap-0.5 max-w-[12.5rem]">
                                        <button
                                          type="button"
                                          disabled={geliverCreatingOrderId === o.id}
                                          onClick={() => void startKargolaFromOrder(o)}
                                          className={`px-2 py-1.5 rounded-lg text-white font-bold disabled:opacity-50 w-full max-w-[10.5rem] ${
                                            String(o.geliver_shipment_id ?? "").trim()
                                              ? "bg-emerald-600 hover:bg-emerald-500 text-[9px] leading-tight uppercase tracking-wide"
                                              : "bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
                                          }`}
                                        >
                                          {geliverCreatingOrderId === o.id ? (
                                            "…"
                                          ) : String(o.geliver_shipment_id ?? "").trim() ? (
                                            <span className="block text-center whitespace-normal">
                                              KARGO KAYDI
                                              <br />
                                              YAPILDI
                                            </span>
                                          ) : o.geliver_last_error ? (
                                            "Tekrar dene"
                                          ) : (
                                            "Kargola"
                                          )}
                                        </button>
                                        {String(o.geliver_shipment_id ?? "").trim() ? (
                                          <p className="text-[9px] text-gray-600 leading-tight text-right">
                                            {(() => {
                                              const sid = String(o.geliver_shipment_id).trim();
                                              const n = geliverShipmentRowIndex[sid];
                                              return n
                                                ? `Kargo teklif kayıtları: sıra ${n} (Kargo sekmesi).`
                                                : "Liste sırası: Kargo → Kargo teklif kayıtları (otomatik güncellenir).";
                                            })()}
                                          </p>
                                        ) : null}
                                      </div>
                                    )}
                                </div>
                              )}
                              <StatusPill status={o.status} />
                            </div>
                          </div>
                          <div className="space-y-0.5 mb-2">
                            {o.customer_phone && <div className="text-gray-600 text-xs flex items-center gap-1.5"><span>📞</span><a href={`tel:${o.customer_phone}`} className="hover:text-gray-900 transition">{o.customer_phone}</a></div>}
                            {o.customer_email && <div className="text-gray-600 text-xs flex items-center gap-1.5"><span>✉️</span><span>{o.customer_email}</span></div>}
                            {o.customer_address && <div className="text-gray-600 text-xs flex items-center gap-1.5"><span>📍</span><span>{o.customer_address}</span></div>}
                            {o.notes && <div className="text-amber-900 text-xs font-medium flex items-center gap-1.5"><span>📝</span><span>{o.notes}</span></div>}
                            {o.order_source && (
                              <div className="text-gray-500 text-xs flex items-center gap-1.5">
                                <span>🧾</span>
                                <span>
                                  Kaynak:{" "}
                                  {o.order_source === "cashier"
                                    ? "Kasiyer"
                                    : o.order_source === "staff"
                                      ? "Servis Personeli"
                                      : o.order_source === "ecommerce"
                                        ? "Mağaza (kargo)"
                                        : o.order_source === "pickup"
                                          ? "Gel al (müşteri)"
                                          : o.order_source === "table"
                                            ? "Masa (müşteri)"
                                            : "Müşteri"}
                                </span>
                              </div>
                            )}
                            {o.servis_name && <div className="text-cyan-900 text-xs flex items-center gap-1.5 font-medium"><span>👨‍💼</span><span>Servis: {o.servis_name}</span></div>}
                            {o.usta_name && <div className="text-orange-900 text-xs flex items-center gap-1.5 font-medium"><span>🔨</span><span>Usta: {o.usta_name}</span></div>}
                            {o.driver_name && <div className="text-indigo-900 text-xs flex items-center gap-1.5 font-medium"><span>🚴</span><span>{o.driver_name} — {o.driver_phone}</span></div>}
                          </div>
                          {(o.servis_name || o.usta_name || o.driver_name) && (
                            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="text-gray-900 font-semibold">Görev Akışı:</span>
                              {o.servis_name && <span className="px-2 py-0.5 rounded-full bg-cyan-100 border border-cyan-400 text-cyan-950">👨‍💼 {o.servis_name}</span>}
                              {o.usta_name && <span className="px-2 py-0.5 rounded-full bg-orange-100 border border-orange-400 text-orange-950">🔨 {o.usta_name}</span>}
                              {o.driver_name && <span className="px-2 py-0.5 rounded-full bg-indigo-100 border border-indigo-400 text-indigo-950">🚴 {o.driver_name}</span>}
                            </div>
                          )}
                          {(couriers.length > 0 || staffList.filter(s => s.role === "usta").length > 0 || staffList.filter(s => s.role === "servis").length > 0) && !["delivered", "cancelled"].includes(o.status) && (
                            <div className="flex flex-col gap-2 mb-2">
                              {couriers.length > 0 && (
                                <div className="flex gap-1.5">
                                  <select
                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700 text-xs"
                                    value={selectedCourier[o.id] ?? ""}
                                    onChange={e => setSelectedCourier(p => ({ ...p, [o.id]: e.target.value }))}
                                    disabled={assigningOrderId === o.id}
                                  >
                                    <option value="">🚴 Kurye Seç…</option>
                                    {couriers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                                  </select>
                                  <button
                                    onClick={() => { if (selectedCourier[o.id]) { assignCourier(o.id, Number(selectedCourier[o.id])); setSelectedCourier(p => ({ ...p, [o.id]: "" })); } }}
                                    disabled={!selectedCourier[o.id] || assigningOrderId === o.id}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[11px] font-semibold rounded-lg transition whitespace-nowrap"
                                  >Kaydet</button>
                                </div>
                              )}
                              {staffList.filter(s => s.role === "usta").length > 0 && (
                                <div className="flex gap-1.5">
                                  <select
                                    className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1 text-orange-300/70 text-xs"
                                    value={selectedUsta[o.id] ?? ""}
                                    onChange={e => setSelectedUsta(p => ({ ...p, [o.id]: e.target.value }))}
                                    disabled={assigningUstaOrderId === o.id}
                                  >
                                    <option value="">🔨 Usta Seç…{o.usta_name ? ` (mevcut: ${o.usta_name})` : ""}</option>
                                    {staffList.filter(s => s.role === "usta").map(u => <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>)}
                                  </select>
                                  <button
                                    onClick={() => { if (selectedUsta[o.id]) { assignUsta(o.id, Number(selectedUsta[o.id])); setSelectedUsta(p => ({ ...p, [o.id]: "" })); } }}
                                    disabled={!selectedUsta[o.id] || assigningUstaOrderId === o.id}
                                    className="px-2 py-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-[11px] font-semibold rounded-lg transition whitespace-nowrap"
                                  >Kaydet</button>
                                </div>
                              )}
                              {staffList.filter(s => s.role === "servis").length > 0 && (
                                <div className="flex gap-1.5">
                                  <select
                                    className="flex-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2 py-1 text-cyan-200 text-xs"
                                    value={selectedServis[o.id] ?? ""}
                                    onChange={e => setSelectedServis(p => ({ ...p, [o.id]: e.target.value }))}
                                    disabled={assigningServisOrderId === o.id}
                                  >
                                    <option value="">👨‍💼 Servis Seç…{o.servis_name ? ` (mevcut: ${o.servis_name})` : ""}</option>
                                    {staffList.filter(s => s.role === "servis").map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                                  </select>
                                  <button
                                    onClick={() => { if (selectedServis[o.id]) { assignServis(o.id, Number(selectedServis[o.id])); setSelectedServis(p => ({ ...p, [o.id]: "" })); } }}
                                    disabled={!selectedServis[o.id] || assigningServisOrderId === o.id}
                                    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[11px] font-semibold rounded-lg transition whitespace-nowrap"
                                  >Kaydet</button>
                                </div>
                              )}
                            </div>
                          )}
                          {(() => { let parsed: OrderItem[] = []; try { parsed = o.items ? JSON.parse(o.items) : []; } catch { parsed = []; } return parsed.length > 0 ? (<div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5 mb-3">{parsed.map((item, i) => <div key={i} className="text-xs text-gray-600 flex justify-between"><span>{item.qty}x {item.name}</span><span>₺{Number(item.price).toFixed(2)}</span></div>)}</div>) : null; })()}
                          {(estLabel || o.vendor_note) && (
                            <div className="mt-2 mb-2 flex flex-wrap gap-2 text-xs">
                              {estLabel && (
                                <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-1 rounded-lg">⏱ {estLabel}</span>
                              )}
                              {o.vendor_note && <span className="bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-lg max-w-full truncate">📝 {o.vendor_note}</span>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                            <span className="text-gray-500 text-xs">{new Date(o.created_at).toLocaleString("tr-TR")}</span>
                            <div className="flex gap-2 flex-wrap items-center">
                              <button onClick={() => openChat(o)} disabled={chatOpeningOrderId === o.id} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-sky-500/30 bg-sky-500/15 text-sky-300 hover:bg-sky-500/30 transition disabled:opacity-50">{chatOpeningOrderId === o.id ? "⏳" : "💬 Chat"}</button>
                              {actions.map(act => (
                                <button key={act.value} onClick={() => { if (act.value === "confirmed") { const ecommerceOrder = String(o.order_source || "").toLowerCase() === "ecommerce"; setConfirmModal({ orderId: o.id, orderNum: o.order_number, isEcommerce: ecommerceOrder }); setConfirmEt(ecommerceOrder ? 1440 : 30); setConfirmNote(""); } else updateOrderStatus(o.id, act.value); }} disabled={isUpdating} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${act.cls} ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}>
                                  {isUpdating ? "…" : act.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "kasiyer-ekrani" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-gray-900 text-sm font-semibold mb-2">Kasiyer (POS) Ekranı</h3>
            <p className="text-gray-600 text-sm mb-4">
              Kasiyer artık servis sağlayıcı paneline gömülü çalışır. Siparişler doğrudan Siparişler sekmesine düşer.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <a href="/kasiyer" target="_blank" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition">
                🖥️ Yeni Sekmede Aç
              </a>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <iframe title="Kasiyer POS" src="/kasiyer" className="w-full h-[calc(100vh-280px)] min-h-[640px]" />
            </div>
          </div>
        )}

        {/* ─── TAB: TURİZM İLANLARIM ─── */}
        {tab === "turizm-ilanlar" && <TurizmIlanlarTab vendorId={vendor.id} authHeaders={authHeaders()} flash={flash} vendorSubtype={vendor.provider_subtype} />}

        {/* ─── TAB: TURİZM REZERVASYONLARI ─── */}
        {tab === "turizm-rezervasyon" && <TurizmRezervasyonTab vendorId={vendor.id} authHeaders={authHeaders()} flash={flash} />}

        {/* ─── TAB: EKİBİM ─── */}
        {tab === "ekibim" && (
          <div className="space-y-8">

            {/* ── Kuryeler (sadece delivery işletmeler için) ── */}
            {isDelivery && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wide">🚴 Kuryeler</h3>
                  <button onClick={loadCouriers} className="text-xs text-gray-500 hover:text-gray-800">↻ Yenile</button>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
                  <h4 className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-3">Yeni Kurye Ekle</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div><label className="block text-gray-500 text-xs mb-1">Ad Soyad</label><input value={newCourier.name} onChange={e => setNewCourier(p => ({ ...p, name: e.target.value }))} placeholder="Ahmet Yılmaz" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-indigo-400/70 placeholder-gray-400" /></div>
                    <div><label className="block text-gray-500 text-xs mb-1">Telefon</label><input value={newCourier.phone} onChange={e => setNewCourier(p => ({ ...p, phone: e.target.value }))} placeholder="05xx xxx xx xx" type="tel" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-indigo-400/70 placeholder-gray-400" /></div>
                    <div className="sm:col-span-2"><label className="block text-gray-500 text-xs mb-1">Şifre <span className="text-gray-400 font-normal">(boş bırakılırsa telefon numarası)</span></label><input type="password" value={newCourier.password} onChange={e => setNewCourier(p => ({ ...p, password: e.target.value }))} placeholder="Şifre belirleyin" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-indigo-400/70 placeholder-gray-400" /></div>
                  </div>
                  <button onClick={addCourier} disabled={savingCourier || !newCourier.name || !newCourier.phone} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition">{savingCourier ? "Kaydediliyor…" : "+ Kurye Ekle"}</button>
                </div>
                {couriers.length === 0 ? (
                  <div className="text-center py-8"><div className="text-3xl mb-2">🚴</div><div className="text-gray-500 text-sm">Henüz kurye eklenmemiş.</div><p className="text-gray-500 text-xs mt-1">Kuryeler <strong className="text-indigo-500">/kurye-paneli</strong> adresinden giriş yapabilir.</p></div>
                ) : (
                  <div className="space-y-2">
                    {couriers.map(c => (
                      <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div><div className="text-gray-900 text-sm font-semibold">{c.name}</div><div className="text-gray-500 text-xs">{c.phone}</div></div>
                        <div className="flex items-center gap-3">
                          <a href="/kurye-paneli" target="_blank" className="text-xs text-indigo-400 hover:text-indigo-300">Kurye Paneli →</a>
                          <button onClick={() => deleteCourier(c.id)} className="text-xs text-red-400 hover:text-red-300 transition">Sil</button>
                        </div>
                      </div>
                    ))}
                    <p className="text-gray-500 text-xs mt-2 text-center">Kuryeler <strong className="text-indigo-500">/kurye-paneli</strong> adresine giderek giriş yapabilir.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Ekip Üyeleri (Usta / Servis / Kasiyer) ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wide">👷 Ekip Üyeleri</h3>
                <button onClick={loadStaff} className="text-xs text-gray-500 hover:text-gray-800">↻ Yenile</button>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
                <h4 className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-3">Yeni Ekip Üyesi Ekle</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">Ad Soyad</label>
                    <input value={newStaff.name} onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))} placeholder="Ahmet Yılmaz" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-indigo-400/70 placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">Telefon</label>
                    <input type="tel" value={newStaff.phone} onChange={e => setNewStaff(p => ({ ...p, phone: e.target.value }))} placeholder="05xx xxx xx xx" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-indigo-400/70 placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">Rol</label>
                    <select value={newStaff.role} onChange={e => setNewStaff(p => ({ ...p, role: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-indigo-400/70">
                      <option value="usta">🔨 Usta</option>
                      <option value="servis">👨‍💼 Servis Elemanı</option>
                      <option value="kasiyer">🖥️ Kasiyer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">Şifre (boş = telefon numarası)</label>
                    <input type="password" value={newStaff.password} onChange={e => setNewStaff(p => ({ ...p, password: e.target.value }))} placeholder="Boş bırakılırsa telefon no" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm outline-none focus:border-indigo-400/70 placeholder-gray-400" />
                  </div>
                </div>
                <button onClick={addStaff} disabled={savingStaff || !newStaff.name || !newStaff.phone} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition">{savingStaff ? "Kaydediliyor…" : "+ Ekip Üyesi Ekle"}</button>
              </div>
              {staffList.length === 0 ? (
                <div className="text-center py-10"><div className="text-3xl mb-2">👷</div><div className="text-gray-500 text-sm">Henüz ekip üyesi eklenmemiş.</div></div>
              ) : (
                <div className="space-y-2">
                  {(["usta", "servis", "kasiyer"] as const).map(role => {
                    const members = staffList.filter(s => s.role === role);
                    if (!members.length) return null;
                    const roleLabel = role === "usta" ? "🔨 Ustalar" : role === "servis" ? "👨‍💼 Servis Elemanları" : "🖥️ Kasiyerler";
                    const roleHref = role === "usta" ? "/usta-paneli" : role === "servis" ? "/servis-paneli" : "/kasiyer";
                    const roleLinkTxt = role === "usta" ? "Usta Paneli →" : role === "servis" ? "Servis Paneli →" : "Kasiyer →";
                    const roleCls = role === "usta" ? "text-orange-400" : role === "servis" ? "text-teal-400" : "text-indigo-400";
                    return (
                      <div key={role}>
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 mt-4">{roleLabel}</div>
                        <div className="space-y-2">
                          {members.map(s => (
                            <div key={s.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                              <div><div className="text-gray-900 text-sm font-semibold">{s.name}</div><div className="text-gray-500 text-xs">{s.phone}</div></div>
                              <div className="flex items-center gap-3">
                                <a href={roleHref} target="_blank" className={`text-xs hover:opacity-80 ${roleCls}`}>{roleLinkTxt}</a>
                                <button onClick={() => deleteStaff(s.id)} className="text-xs text-red-400 hover:text-red-300 transition">Sil</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-gray-500 text-xs mt-3 text-center">
                    Ustalar <strong className="text-orange-400">/usta-paneli</strong> · Servis <strong className="text-teal-400">/servis-paneli</strong> · Kasiyerler <strong className="text-indigo-400">/kasiyer</strong>
                  </p>
                </div>
              )}
            </div>

            {/* ── Ekip Sohbeti ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-3">Ekip Sohbeti</h3>
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => { setStaffChatChannel("vendor-usta"); loadStaffChatMessages("vendor-usta"); }} className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition ${staffChatChannel === "vendor-usta" ? "border-orange-300 bg-gradient-to-b from-orange-50 to-white text-gray-900 ring-2 ring-orange-400/25 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>🔨 Ustalar</button>
                <button type="button" onClick={() => { setStaffChatChannel("vendor-servis"); loadStaffChatMessages("vendor-servis"); }} className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition ${staffChatChannel === "vendor-servis" ? "border-teal-300 bg-gradient-to-b from-teal-50 to-white text-gray-900 ring-2 ring-teal-400/25 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>👨‍💼 Servis</button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 mb-3 overflow-y-auto" style={{ maxHeight: 300 }}>
                {staffChatMessages.length === 0 ? <div className="text-center text-gray-400 text-xs py-6">Henüz mesaj yok.</div>
                  : staffChatMessages.map(m => {
                    const isVendor = m.sender_type === "vendor";
                    return (
                      <div key={m.id} className={`flex ${isVendor ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isVendor ? "bg-indigo-500/30 text-indigo-100" : staffChatChannel === "vendor-usta" ? "bg-orange-500/20 text-orange-100" : "bg-teal-500/20 text-teal-100"}`}>
                          <div className="text-[10px] opacity-60 mb-0.5 font-semibold">{isVendor ? "Siz (İşletme)" : m.sender_name}</div>
                          {m.message}
                          <div className="text-[10px] opacity-40 mt-0.5 text-right">{new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    );
                  })}
                <div ref={staffChatBottomRef} />
              </div>
              <div className="flex gap-2">
                <input value={staffChatInput} onChange={e => setStaffChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendStaffChatMessage()} placeholder="Mesajınızı yazın…" className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400/60 placeholder-gray-400" />
                <button type="button" onClick={sendStaffChatMessage} className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">Gönder</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: KASA (Accounting Module) ─── */}
        {tab === "kasa" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <div className="text-emerald-800 text-xs font-semibold mb-1">Teslim Edilen Ciro</div>
                <div className="text-emerald-900 text-xl font-bold">₺{kasaSummary.deliveredRevenue.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                <div className="text-blue-800 text-xs font-semibold mb-1">Manuel Gelir</div>
                <div className="text-blue-900 text-xl font-bold">₺{kasaSummary.manualIncome.toFixed(2)}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <div className="text-red-800 text-xs font-semibold mb-1">Giderler</div>
                <div className="text-red-900 text-xl font-bold">₺{kasaSummary.manualExpense.toFixed(2)}</div>
              </div>
              <div className={`border rounded-2xl p-4 text-center ${kasaSummary.net >= 0 ? "bg-indigo-50 border-indigo-200" : "bg-orange-50 border-orange-200"}`}>
                <div className={`text-xs font-semibold mb-1 ${kasaSummary.net >= 0 ? "text-indigo-800" : "text-orange-800"}`}>Net Kâr</div>
                <div className={`text-xl font-bold ${kasaSummary.net >= 0 ? "text-indigo-900" : "text-orange-900"}`}>₺{kasaSummary.net.toFixed(2)}</div>
              </div>
            </div>

            {/* Gelir/Gider Ekleme Formu */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider mb-4">Yeni Kayıt Ekle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <GlassSelect label="Tür" value={kasaForm.type} onChange={v => setKasaForm(f => ({ ...f, type: v }))} options={[{ value: "income", label: "💚 Gelir" }, { value: "expense", label: "🔴 Gider" }]} />
                <GlassSelect label="Kategori" value={kasaForm.category} onChange={v => setKasaForm(f => ({ ...f, category: v }))} options={[
                  { value: "satis", label: "Satış" }, { value: "kira", label: "Kira" }, { value: "maas", label: "Maaş" },
                  { value: "malzeme", label: "Malzeme/Ham madde" }, { value: "fatura", label: "Fatura (elektrik/su/internet)" },
                  { value: "vergi", label: "Vergi/Resmi ücret" }, { value: "tamir", label: "Tamir/Bakım" }, { value: "diger", label: "Diğer" },
                ]} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <GlassInput label="Açıklama" value={kasaForm.description} onChange={v => setKasaForm(f => ({ ...f, description: v }))} placeholder="Ödeme açıklaması..." />
                <GlassInput label="Tutar (₺)" value={kasaForm.amount} onChange={v => setKasaForm(f => ({ ...f, amount: v }))} placeholder="0.00" type="number" />
              </div>
              <button type="button" onClick={saveExpense} disabled={!kasaForm.description || !kasaForm.amount} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition disabled:opacity-40">+ Kaydet</button>
            </div>

            {/* Kayıt listesi */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider">Kayıtlar</h3>
                <div className="flex gap-1 p-1 rounded-xl bg-gray-100/90 border border-gray-200">
                  {[{ k: "all", l: "Tümü" }, { k: "income", l: "Gelir" }, { k: "expense", l: "Gider" }].map(({ k, l }) => (
                    <button type="button" key={k} onClick={() => setKasaFilter(k as typeof kasaFilter)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition border shadow-sm ${kasaFilter === k ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 ring-2 ring-indigo-500/25" : "border-transparent text-gray-700 hover:bg-white/90"}`}>{l}</button>
                  ))}
                </div>
              </div>
              {/* Sipariş gelirleri */}
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {orders.filter(o => o.status === "delivered" && (kasaFilter === "all" || kasaFilter === "income")).slice(0, 10).map(o => (
                  <div key={`ord-${o.id}`} className="px-4 py-3 flex items-center justify-between">
                    <div><div className="text-gray-900 text-sm">Sipariş #{o.id} — {o.customer_name}</div><div className="text-gray-500 text-xs">{new Date(o.created_at).toLocaleDateString("tr-TR")} · Sipariş geliri</div></div>
                    <span className="text-emerald-700 font-semibold text-sm">+₺{Number(o.subtotal).toFixed(2)}</span>
                  </div>
                ))}
                {expenses.filter(e => kasaFilter === "all" || e.type === kasaFilter).map(e => (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                    <div><div className="text-gray-900 text-sm">{e.description}</div><div className="text-gray-500 text-xs">{new Date(e.date).toLocaleDateString("tr-TR")} · {e.category}</div></div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold text-sm ${e.type === "income" ? "text-emerald-700" : "text-red-700"}`}>{e.type === "income" ? "+" : "-"}₺{e.amount.toFixed(2)}</span>
                      <button type="button" onClick={() => deleteExpense(e.id)} className="text-gray-400 hover:text-red-600 text-xs transition">✕</button>
                    </div>
                  </div>
                ))}
                {expenses.filter(e => kasaFilter === "all" || e.type === kasaFilter).length === 0 && orders.filter(o => o.status === "delivered").length === 0 && (
                  <div className="px-4 py-10 text-center text-gray-500 text-sm">Henüz kayıt yok.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: MÜŞTERİLER ─── */}
        {tab === "musteriler" && (
          <div className="space-y-5">

            {/* ── Yeni Müşteri Ekle ── */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setShowAddCustomer(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <span className="text-gray-900 font-semibold text-sm">+ Yeni Müşteri Ekle</span>
                <span className="text-gray-500 text-lg">{showAddCustomer ? "−" : "+"}</span>
              </button>
              {showAddCustomer && (
                <div className="px-5 pb-5 border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">Ad <span className="text-red-500">*</span></label>
                      <input value={newCustomer.first_name} onChange={e => setNewCustomer(p => ({ ...p, first_name: e.target.value }))} placeholder="Ahmet" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">Soyad</label>
                      <input value={newCustomer.last_name} onChange={e => setNewCustomer(p => ({ ...p, last_name: e.target.value }))} placeholder="Yılmaz" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">Telefon <span className="text-red-500">*</span></label>
                      <input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="05xx xxx xx xx" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">E-posta <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                      <input type="email" value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} placeholder="ornek@mail.com" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">İşletme Adı <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                      <input value={newCustomer.company_name} onChange={e => setNewCustomer(p => ({ ...p, company_name: e.target.value }))} placeholder="Yılmaz Ticaret Ltd." className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">Adres <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                      <input value={newCustomer.address} onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))} placeholder="Mahalle, sokak…" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">Vergi Dairesi <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                      <input value={newCustomer.tax_office} onChange={e => setNewCustomer(p => ({ ...p, tax_office: e.target.value }))} placeholder="Beşiktaş VD" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">Vergi No <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                      <input value={newCustomer.tax_number} onChange={e => setNewCustomer(p => ({ ...p, tax_number: e.target.value }))} placeholder="1234567890" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-gray-600 text-xs mb-1">Notlar <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                      <input value={newCustomer.notes} onChange={e => setNewCustomer(p => ({ ...p, notes: e.target.value }))} placeholder="Müşteri hakkında notlar…" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400" />
                    </div>
                  </div>
                  <button type="button" onClick={addVendorCustomer} disabled={savingCustomer || !newCustomer.first_name.trim() || !newCustomer.phone.trim()} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 disabled:opacity-50 transition">
                    {savingCustomer ? "Kaydediliyor…" : "💾 Müşteri Ekle"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Arama + Sayaç ── */}
            <div className="flex items-center gap-3">
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Müşteri ara (ad, telefon, işletme)…"
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-indigo-400 transition"
              />
              <button onClick={loadVendorCustomers} className="text-xs text-gray-500 hover:text-gray-700 shrink-0">↻</button>
              <span className="text-gray-500 text-xs shrink-0">{vendorCustomers.length} kayıt</span>
            </div>

            {/* ── Kayıtlı Müşteriler (vendor_customers DB) ── */}
            {vendorCustomers.length === 0 && !customerSearch && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">👤</div>
                <div className="text-gray-600 text-sm">Henüz müşteri eklenmemiş.</div>
                <p className="text-gray-500 text-xs mt-1">Yukarıdaki formu kullanarak müşteri ekleyebilirsiniz.</p>
              </div>
            )}

            <div className="space-y-3">
              {vendorCustomers
                .filter(c => {
                  if (!customerSearch.trim()) return true;
                  const q = customerSearch.toLowerCase();
                  return (
                    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
                    c.phone.includes(q) ||
                    (c.company_name || "").toLowerCase().includes(q) ||
                    (c.email || "").toLowerCase().includes(q)
                  );
                })
                .map(c => {
                  const crmData = crmCustomers.find(x => x.phone === c.phone);
                  const isEditing = editingCustomer?.id === c.id;
                  const ec = editingCustomer;
                  return (
                    <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                      {isEditing && ec ? (
                        /* ── Düzenleme Formu ── */
                        <div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div><label className="block text-gray-600 text-xs mb-1">Ad</label><input value={ec.first_name} onChange={e => setEditingCustomer({ ...ec, first_name: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-gray-600 text-xs mb-1">Soyad</label><input value={ec.last_name} onChange={e => setEditingCustomer({ ...ec, last_name: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-gray-600 text-xs mb-1">Telefon</label><input value={ec.phone} onChange={e => setEditingCustomer({ ...ec, phone: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-gray-600 text-xs mb-1">E-posta</label><input value={ec.email || ""} onChange={e => setEditingCustomer({ ...ec, email: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-gray-600 text-xs mb-1">İşletme Adı</label><input value={ec.company_name || ""} onChange={e => setEditingCustomer({ ...ec, company_name: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-gray-600 text-xs mb-1">Adres</label><input value={ec.address || ""} onChange={e => setEditingCustomer({ ...ec, address: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-gray-600 text-xs mb-1">Vergi Dairesi</label><input value={ec.tax_office || ""} onChange={e => setEditingCustomer({ ...ec, tax_office: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-gray-600 text-xs mb-1">Vergi No</label><input value={ec.tax_number || ""} onChange={e => setEditingCustomer({ ...ec, tax_number: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                            <div className="sm:col-span-2"><label className="block text-gray-600 text-xs mb-1">Notlar</label><input value={ec.notes || ""} onChange={e => setEditingCustomer({ ...ec, notes: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400" /></div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingCustomer(null)} className="px-4 py-2 border border-gray-300 text-gray-800 text-xs rounded-xl hover:bg-gray-50 transition">Vazgeç</button>
                            <button type="button" onClick={saveCustomerEdit} className="px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">💾 Kaydet</button>
                          </div>
                        </div>
                      ) : (
                        /* ── Müşteri Kartı ── */
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">{c.first_name} {c.last_name}</span>
                                {c.company_name && <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">🏢 {c.company_name}</span>}
                              </div>
                              {crmData && (
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-emerald-700 text-xs">📦 {crmData.orderCount} sipariş</span>
                                  <span className="text-emerald-700 text-xs">₺{crmData.totalSpent.toFixed(0)} toplam</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => setEditingCustomer(c)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition">Düzenle</button>
                              <button onClick={() => deleteVendorCustomer(c.id)} className="text-xs text-red-400 hover:text-red-300 transition">Sil</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600">
                            <div className="flex items-center gap-2"><span>📞</span><a href={`tel:${c.phone}`} className="hover:text-gray-900">{c.phone}</a></div>
                            {c.email && <div className="flex items-center gap-2"><span>📧</span><span>{c.email}</span></div>}
                            {c.address && <div className="flex items-center gap-2 sm:col-span-2"><span>📍</span><span>{c.address}</span></div>}
                            {(c.tax_office || c.tax_number) && (
                              <div className="flex items-center gap-2 sm:col-span-2">
                                <span>🧾</span>
                                <span>{[c.tax_office, c.tax_number].filter(Boolean).join(" — ")}</span>
                              </div>
                            )}
                            {c.notes && <div className="flex items-start gap-2 sm:col-span-2"><span>📝</span><span className="italic">{c.notes}</span></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* ── Siparişten Gelen Müşteriler (CRM) ── */}
            {crmCustomers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">📦 Siparişlerden Gelen Müşteriler</h3>
                <div className="flex items-center gap-3 mb-3">
                  <input value={crmSearch} onChange={e => setCrmSearch(e.target.value)} placeholder="Ara (isim veya telefon)…" className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-xs outline-none focus:border-indigo-400 transition" />
                  <span className="text-gray-500 text-xs shrink-0">{crmCustomers.length} müşteri</span>
                </div>
                <div className="space-y-2">
                  {crmCustomers.filter(c => !crmSearch || c.name.toLowerCase().includes(crmSearch.toLowerCase()) || c.phone.includes(crmSearch)).map(c => {
                    const note = crmNotes[c.phone];
                    return (
                      <div key={c.phone} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                              {note?.tag && <span className={`text-xs px-2 py-0.5 rounded-full border ${note.tag === "vip" ? "bg-amber-50 text-amber-900 border-amber-200" : note.tag === "regular" ? "bg-blue-50 text-blue-900 border-blue-200" : note.tag === "new" ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>{note.tag === "vip" ? "⭐ VIP" : note.tag === "regular" ? "🔄 Düzenli" : note.tag === "new" ? "🆕 Yeni" : "⚠️ Dikkat"}</span>}
                            </div>
                            <div className="text-gray-600 text-xs mt-1 flex flex-wrap gap-3">
                              <span>📞 {c.phone}</span>
                              <span>📦 {c.orderCount} sipariş</span>
                              <span>₺{c.totalSpent.toFixed(0)}</span>
                              <span>{new Date(c.lastOrder).toLocaleDateString("tr-TR")}</span>
                            </div>
                            {note?.note && <p className="text-gray-600 text-xs mt-1 italic">"{note.note}"</p>}
                          </div>
                          <button type="button" onClick={() => { setCrmEditPhone(c.phone); setCrmEditForm(note || { tag: "", note: "", lastUpdated: "" }); }} className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-medium rounded-lg transition flex-shrink-0">Not</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CRM Not Modalı */}
        {crmEditPhone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-gray-900 font-bold text-base mb-4">👥 Müşteri Notu</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-2">Etiket</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: "", l: "— Etiketsiz" }, { v: "vip", l: "⭐ VIP" }, { v: "regular", l: "🔄 Düzenli" }, { v: "new", l: "🆕 Yeni" }, { v: "problematic", l: "⚠️ Dikkat" }].map(t => (
                      <button type="button" key={t.v} onClick={() => setCrmEditForm(f => ({ ...f, tag: t.v as CrmNote["tag"] }))} className={`py-2 rounded-xl text-xs border transition font-medium ${crmEditForm.tag === t.v ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 ring-2 ring-indigo-500/25 shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>{t.l}</button>
                    ))}
                  </div>
                </div>
                <GlassTextarea label="Not" value={crmEditForm.note} onChange={v => setCrmEditForm(f => ({ ...f, note: v }))} placeholder="Bu müşteri hakkında notunuz..." rows={3} />
              </div>
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => setCrmEditPhone(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm hover:bg-gray-50 transition">Vazgeç</button>
                <button type="button" onClick={saveCrmNote} className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">💾 Kaydet</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SERVİS / TAMİR (Repair Module) ─── */}
        {tab === "servis" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100/90 border border-gray-200">
                {["all", "received", "repairing", "ready", "delivered"].map(s => (
                  <button type="button" key={s} onClick={() => setRepairFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${repairFilter === s ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 ring-2 ring-indigo-500/25" : "border-transparent text-gray-700 hover:bg-white/90"}`}>
                    {s === "all" ? `Tümü (${repairs.length})` : repairStatusMap[s]?.label || s}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setRepairForm({ ...EMPTY_REPAIR }); setRepairModal("add"); }} className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">+ Yeni Servis</button>
            </div>

            {repairs.filter(r => repairFilter === "all" || r.status === repairFilter).length === 0 ? (
              <div className="text-center py-12"><div className="text-4xl mb-3">🔧</div><div className="text-gray-600 text-sm">Servis kaydı bulunamadı.</div><p className="text-gray-500 text-xs mt-1">Tamir veya servis işi oluşturmak için "+ Yeni Servis" butonuna tıklayın.</p></div>
            ) : (
              <div className="space-y-3">
                {repairs.filter(r => repairFilter === "all" || r.status === repairFilter).map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{r.deviceBrand} {r.deviceModel} <span className="text-gray-500">({r.deviceType})</span></div>
                        <div className="text-gray-600 text-xs mt-0.5">{r.customerName} · 📞 {r.customerPhone}</div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${repairStatusMap[r.status]?.cls || "bg-slate-100 text-slate-800 border border-slate-200"}`}>{repairStatusMap[r.status]?.label || r.status}</span>
                    </div>
                    <p className="text-gray-700 text-xs mb-3">{r.problem}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
                      <span>💰 Tahmini: ₺{r.estimatedCost}</span>
                      {r.actualCost > 0 && <span>✅ Gerçek: ₺{r.actualCost}</span>}
                      {r.depositPaid > 0 && <span>🏦 Depozit: ₺{r.depositPaid}</span>}
                      {r.deliveryDate && <span>📅 Teslim: {r.deliveryDate}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={r.status} onChange={e => updateRepairStatus(r.id, e.target.value as RepairTicket["status"])} className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-xs">
                        {Object.entries(repairStatusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button type="button" onClick={() => { setRepairForm({ ...r }); setRepairModal("edit"); }} className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-medium rounded-lg transition">Düzenle</button>
                      <button type="button" onClick={() => deleteRepair(r.id)} className="px-3 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-medium rounded-lg transition">Sil</button>
                      {r.customerPhone && <a href={`tel:${r.customerPhone}`} className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-medium rounded-lg transition">📞 Ara</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Servis/Tamir Modalı */}
        {repairModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900 font-bold text-lg">🔧 {repairModal === "edit" ? "Servis Düzenle" : "Yeni Servis Kaydı"}</h3>
                <button type="button" onClick={() => setRepairModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput label="Müşteri Adı *" value={repairForm.customerName} onChange={v => setRepairForm(f => ({ ...f, customerName: v }))} placeholder="Ad Soyad" />
                  <GlassInput label="Müşteri Telefonu" value={repairForm.customerPhone} onChange={v => setRepairForm(f => ({ ...f, customerPhone: v }))} placeholder="05xx..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <GlassInput label="Cihaz Türü *" value={repairForm.deviceType} onChange={v => setRepairForm(f => ({ ...f, deviceType: v }))} placeholder="Telefon, Laptop..." />
                  <GlassInput label="Marka" value={repairForm.deviceBrand} onChange={v => setRepairForm(f => ({ ...f, deviceBrand: v }))} placeholder="Apple, Samsung..." />
                  <GlassInput label="Model" value={repairForm.deviceModel} onChange={v => setRepairForm(f => ({ ...f, deviceModel: v }))} placeholder="iPhone 14..." />
                </div>
                <GlassTextarea label="Arıza / Problem *" value={repairForm.problem} onChange={v => setRepairForm(f => ({ ...f, problem: v }))} placeholder="Cihazın sorunu nedir?" rows={2} />
                <div className="grid grid-cols-3 gap-3">
                  <GlassInput label="Tahmini Ücret (₺)" value={String(repairForm.estimatedCost || "")} onChange={v => setRepairForm(f => ({ ...f, estimatedCost: Number(v) || 0 }))} placeholder="0" type="number" />
                  <GlassInput label="Gerçek Ücret (₺)" value={String(repairForm.actualCost || "")} onChange={v => setRepairForm(f => ({ ...f, actualCost: Number(v) || 0 }))} placeholder="0" type="number" />
                  <GlassInput label="Depozit (₺)" value={String(repairForm.depositPaid || "")} onChange={v => setRepairForm(f => ({ ...f, depositPaid: Number(v) || 0 }))} placeholder="0" type="number" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassSelect label="Durum" value={repairForm.status} onChange={v => setRepairForm(f => ({ ...f, status: v as RepairTicket["status"] }))} options={Object.entries(repairStatusMap).map(([k, v]) => ({ value: k, label: v.label }))} />
                  <GlassInput label="Teslim Tarihi" value={repairForm.deliveryDate} onChange={v => setRepairForm(f => ({ ...f, deliveryDate: v }))} placeholder="" type="date" />
                </div>
                <GlassTextarea label="Notlar" value={repairForm.notes} onChange={v => setRepairForm(f => ({ ...f, notes: v }))} placeholder="Ek notlar..." rows={2} />
                <button type="button" onClick={saveRepair} disabled={!repairForm.customerName || !repairForm.deviceType} className="w-full py-3 rounded-2xl font-bold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition disabled:opacity-40">
                  {repairModal === "edit" ? "💾 Güncelle" : "✅ Servis Kaydı Oluştur"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PERSONEL (Essentials Module) ─── */}
        {tab === "personel" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-gray-600 text-sm">{employees.filter(e => e.status === "active").length} aktif · {employees.filter(e => e.status === "inactive").length} pasif çalışan</div>
              <button type="button" onClick={() => { setEmpForm({ ...EMPTY_EMP }); setEmpModal("add"); }} className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">+ Personel Ekle</button>
            </div>

            {/* Aylık maaş özeti */}
            {employees.filter(e => e.status === "active").length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Aylık Maaş Yükü</div>
                <div className="text-gray-900 text-2xl font-bold">₺{employees.filter(e => e.status === "active").reduce((s, e) => s + e.salary, 0).toLocaleString("tr-TR")}</div>
              </div>
            )}

            {employees.length === 0 ? (
              <div className="text-center py-12"><div className="text-4xl mb-3">👷</div><div className="text-gray-500 text-sm">Henüz çalışan eklenmemiş.</div></div>
            ) : (
              <div className="space-y-2">
                {employees.map(e => (
                  <div key={e.id} className={`border rounded-2xl p-4 flex items-center justify-between gap-3 ${e.status === "active" ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-70"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center text-indigo-900 font-bold text-sm flex-shrink-0">{e.name.charAt(0)}</div>
                      <div>
                        <div className="text-gray-900 font-semibold text-sm">{e.name}</div>
                        <div className="text-gray-500 text-xs">{e.role} · {e.phone}</div>
                        <div className="text-gray-500 text-xs">İşe başlama: {e.startDate ? new Date(e.startDate).toLocaleDateString("tr-TR") : "—"}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-gray-900 font-semibold text-sm">₺{e.salary.toLocaleString("tr-TR")}<span className="text-gray-500 text-xs">/ay</span></span>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => { setEmpForm({ ...e }); setEmpModal("edit"); }} className="px-2.5 py-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-medium rounded-lg transition">Düzenle</button>
                        <button type="button" onClick={() => deleteEmployee(e.id)} className="px-2.5 py-1 border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-medium rounded-lg transition">Sil</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Personel Modalı */}
        {empModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900 font-bold">👷 {empModal === "edit" ? "Personeli Düzenle" : "Yeni Personel"}</h3>
                <button type="button" onClick={() => setEmpModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                <GlassInput label="Ad Soyad *" value={empForm.name} onChange={v => setEmpForm(f => ({ ...f, name: v }))} placeholder="Ahmet Yılmaz" />
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput label="Görev / Pozisyon *" value={empForm.role} onChange={v => setEmpForm(f => ({ ...f, role: v }))} placeholder="Garson, Kasiyer..." />
                  <GlassInput label="Telefon" value={empForm.phone} onChange={v => setEmpForm(f => ({ ...f, phone: v }))} placeholder="05xx..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput label="Maaş (₺/ay)" value={String(empForm.salary || "")} onChange={v => setEmpForm(f => ({ ...f, salary: Number(v) || 0 }))} placeholder="0" type="number" />
                  <GlassInput label="İşe Başlama" value={empForm.startDate} onChange={v => setEmpForm(f => ({ ...f, startDate: v }))} type="date" />
                </div>
                <GlassSelect label="Durum" value={empForm.status} onChange={v => setEmpForm(f => ({ ...f, status: v as "active" | "inactive" }))} options={[{ value: "active", label: "✅ Aktif" }, { value: "inactive", label: "⛔ Pasif" }]} />
                <button type="button" onClick={saveEmployee} disabled={!empForm.name || !empForm.role} className="w-full py-3 rounded-2xl font-bold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition disabled:opacity-40">
                  {empModal === "edit" ? "💾 Güncelle" : "✅ Personel Ekle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: DEMİRBAŞ (Asset Management Module) ─── */}
        {tab === "demirbas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-gray-600 text-sm">{assets.length} demirbaş · Toplam: ₺{assets.reduce((s, a) => s + a.purchasePrice, 0).toLocaleString("tr-TR")}</div>
              <button type="button" onClick={() => { setAssetForm({ ...EMPTY_ASSET }); setAssetModal("add"); }} className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">+ Demirbaş Ekle</button>
            </div>

            {assets.length === 0 ? (
              <div className="text-center py-12"><div className="text-4xl mb-3">🏢</div><div className="text-gray-600 text-sm">Henüz demirbaş eklenmemiş.</div><p className="text-gray-500 text-xs mt-1">Ekipman, mobilya, araç gibi işletme varlıklarınızı kaydedin.</p></div>
            ) : (
              <div className="space-y-2">
                {assets.map(a => (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-900 font-semibold text-sm">{a.name}</span>
                        <span className="text-xs text-gray-700">{conditionMap[a.condition] || a.condition}</span>
                        {a.category && <span className="text-xs bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-full">{a.category}</span>}
                      </div>
                      <div className="text-gray-500 text-xs mt-1 flex flex-wrap gap-3">
                        {a.serialNo && <span>SN: {a.serialNo}</span>}
                        {a.location && <span>📍 {a.location}</span>}
                        {a.purchaseDate && <span>📅 {new Date(a.purchaseDate).toLocaleDateString("tr-TR")}</span>}
                      </div>
                      {a.notes && <p className="text-gray-600 text-xs mt-1 italic">{a.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-gray-900 font-semibold text-sm">₺{a.purchasePrice.toLocaleString("tr-TR")}</span>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => { setAssetForm({ ...a }); setAssetModal("edit"); }} className="px-2.5 py-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-medium rounded-lg transition">Düzenle</button>
                        <button type="button" onClick={() => deleteAsset(a.id)} className="px-2.5 py-1 border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-medium rounded-lg transition">Sil</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Demirbaş Modalı */}
        {assetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900 font-bold">🏢 {assetModal === "edit" ? "Demirbaş Düzenle" : "Yeni Demirbaş"}</h3>
                <button type="button" onClick={() => setAssetModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                <GlassInput label="Demirbaş Adı *" value={assetForm.name} onChange={v => setAssetForm(f => ({ ...f, name: v }))} placeholder="Ör: Derin Dondurucu, Yazarkasa..." />
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput label="Kategori" value={assetForm.category} onChange={v => setAssetForm(f => ({ ...f, category: v }))} placeholder="Mutfak, Elektronik..." />
                  <GlassInput label="Seri No" value={assetForm.serialNo} onChange={v => setAssetForm(f => ({ ...f, serialNo: v }))} placeholder="SN12345..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput label="Alış Fiyatı (₺)" value={String(assetForm.purchasePrice || "")} onChange={v => setAssetForm(f => ({ ...f, purchasePrice: Number(v) || 0 }))} placeholder="0" type="number" />
                  <GlassInput label="Alış Tarihi" value={assetForm.purchaseDate} onChange={v => setAssetForm(f => ({ ...f, purchaseDate: v }))} type="date" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassSelect label="Durum" value={assetForm.condition} onChange={v => setAssetForm(f => ({ ...f, condition: v as Asset["condition"] }))} options={[{ value: "yeni", label: "🟢 Yeni" }, { value: "iyi", label: "🟡 İyi" }, { value: "orta", label: "🟠 Orta" }, { value: "kötü", label: "🔴 Kötü" }]} />
                  <GlassInput label="Konum" value={assetForm.location} onChange={v => setAssetForm(f => ({ ...f, location: v }))} placeholder="Depo, Mutfak..." />
                </div>
                <GlassTextarea label="Notlar" value={assetForm.notes} onChange={v => setAssetForm(f => ({ ...f, notes: v }))} placeholder="Bakım tarihi, garanti bilgisi..." rows={2} />
                <button type="button" onClick={saveAsset} disabled={!assetForm.name} className="w-full py-3 rounded-2xl font-bold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition disabled:opacity-40">
                  {assetModal === "edit" ? "💾 Güncelle" : "✅ Demirbaş Ekle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: İŞ TAKİBİ (Project Management Module) ─── */}
        {tab === "is-takibi" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-3 text-xs text-gray-600">
                <span>📋 {tasks.filter(t => t.status === "todo").length} yapılacak</span>
                <span>⚙️ {tasks.filter(t => t.status === "doing").length} yapılıyor</span>
                <span>✅ {tasks.filter(t => t.status === "done").length} tamamlandı</span>
              </div>
              <button type="button" onClick={() => { setTaskForm({ ...EMPTY_TASK }); setTaskModal("add"); }} className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">+ Görev Ekle</button>
            </div>

            {/* Kanban görünüm */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([["todo", "📋 Yapılacak"], ["doing", "⚙️ Yapılıyor"], ["done", "✅ Tamamlandı"]] as [Task["status"], string][]).map(([status, label]) => (
                <div key={status} className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                  <div className="text-gray-700 text-xs font-bold uppercase tracking-wide mb-3">{label} ({tasks.filter(t => t.status === status).length})</div>
                  <div className="space-y-2">
                    {tasks.filter(t => t.status === status).map(t => (
                      <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-gray-900 text-sm font-medium leading-tight">{t.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${priorityMap[t.priority]?.cls}`}>{priorityMap[t.priority]?.label}</span>
                        </div>
                        {t.description && <p className="text-gray-600 text-xs mb-2">{t.description}</p>}
                        <div className="text-gray-500 text-xs flex flex-wrap gap-2">
                          {t.assignee && <span>👤 {t.assignee}</span>}
                          {t.dueDate && <span>📅 {new Date(t.dueDate).toLocaleDateString("tr-TR")}</span>}
                        </div>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {status !== "todo" && <button type="button" onClick={() => moveTask(t.id, "todo")} className="px-2 py-0.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-[10px] rounded-lg transition">← Geri</button>}
                          {status !== "doing" && <button type="button" onClick={() => moveTask(t.id, "doing")} className="px-2 py-0.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[10px] rounded-lg transition">⚙️</button>}
                          {status !== "done" && <button type="button" onClick={() => moveTask(t.id, "done")} className="px-2 py-0.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[10px] rounded-lg transition">✅</button>}
                          <button type="button" onClick={() => { setTaskForm({ ...t }); setTaskModal("edit"); }} className="px-2 py-0.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] rounded-lg transition">✏️</button>
                          <button type="button" onClick={() => deleteTask(t.id)} className="px-2 py-0.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[10px] rounded-lg transition">🗑️</button>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => t.status === status).length === 0 && (
                      <div className="text-center py-4 text-gray-400 text-xs">Boş</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Görev Modalı */}
        {taskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900 font-bold">📋 {taskModal === "edit" ? "Görevi Düzenle" : "Yeni Görev"}</h3>
                <button type="button" onClick={() => setTaskModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                <GlassInput label="Görev Başlığı *" value={taskForm.title} onChange={v => setTaskForm(f => ({ ...f, title: v }))} placeholder="Yapılacak iş..." />
                <GlassTextarea label="Açıklama" value={taskForm.description} onChange={v => setTaskForm(f => ({ ...f, description: v }))} placeholder="Detay..." rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput label="Sorumlu Kişi" value={taskForm.assignee} onChange={v => setTaskForm(f => ({ ...f, assignee: v }))} placeholder="Ad Soyad" />
                  <GlassInput label="Son Tarih" value={taskForm.dueDate} onChange={v => setTaskForm(f => ({ ...f, dueDate: v }))} type="date" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassSelect label="Öncelik" value={taskForm.priority} onChange={v => setTaskForm(f => ({ ...f, priority: v as Task["priority"] }))} options={[{ value: "low", label: "🟢 Düşük" }, { value: "medium", label: "🟡 Orta" }, { value: "high", label: "🔴 Yüksek" }]} />
                  <GlassSelect label="Durum" value={taskForm.status} onChange={v => setTaskForm(f => ({ ...f, status: v as Task["status"] }))} options={[{ value: "todo", label: "📋 Yapılacak" }, { value: "doing", label: "⚙️ Yapılıyor" }, { value: "done", label: "✅ Tamamlandı" }]} />
                </div>
                <button type="button" onClick={saveTask} disabled={!taskForm.title} className="w-full py-3 rounded-2xl font-bold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition disabled:opacity-40">
                  {taskModal === "edit" ? "💾 Güncelle" : "✅ Görev Oluştur"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: REZERVASYONLAR ─── */}
        {tab === "rezervasyonlar" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-gray-900 font-bold text-base flex-1">📅 Rezervasyonlar</h2>
              <div className="flex gap-1 flex-wrap p-1 rounded-xl bg-gray-100/90 border border-gray-200">
                {[{ v: "all", l: "Tümü" }, { v: "pending", l: "Bekleyenler" }, { v: "confirmed", l: "Onaylananlar" }, { v: "cancelled", l: "İptal" }, { v: "completed", l: "Tamamlananlar" }].map(f => (
                  <button type="button" key={f.v} onClick={() => { setRezervasyonFilter(f.v); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border shadow-sm ${rezervasyonFilter === f.v ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 ring-2 ring-indigo-500/25" : "border-transparent text-gray-700 hover:bg-white/90"}`}>{f.l}</button>
                ))}
                <button type="button" onClick={loadReservations} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 transition">↻ Yenile</button>
              </div>
            </div>
            {reservations.length === 0 ? (
              <div className="text-center py-12 text-gray-500"><div className="text-4xl mb-3">📅</div><p className="text-sm">Henüz rezervasyon yok.</p></div>
            ) : (
              <div className="space-y-3">
                {reservations.filter(r => rezervasyonFilter === "all" || r.status === rezervasyonFilter).map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{r.guest_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${r.status === "confirmed" ? "bg-emerald-50 text-emerald-900 border-emerald-200" : r.status === "pending" ? "bg-amber-50 text-amber-900 border-amber-200" : r.status === "cancelled" ? "bg-red-50 text-red-800 border-red-200" : "bg-blue-50 text-blue-900 border-blue-200"}`}>
                            {r.status === "confirmed" ? "✓ Onaylı" : r.status === "pending" ? "⏳ Beklemede" : r.status === "cancelled" ? "✕ İptal" : "✓ Tamamlandı"}
                          </span>
                        </div>
                        <div className="text-gray-600 text-xs flex flex-wrap gap-3">
                          <span>📞 {r.guest_phone}</span>
                          <span>📅 {r.reservation_date} {r.reservation_time}</span>
                          <span>👥 {r.party_size} kişi</span>
                          {r.section_name && <span>📍 {r.section_name}</span>}
                        </div>
                        {r.note && <div className="text-gray-600 text-xs italic">"{r.note}"</div>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {r.status === "pending" && (
                          <>
                            <button type="button" onClick={() => updateReservationStatus(r.id, "confirmed")} disabled={updatingReservation === r.id} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition disabled:opacity-40">✓ Onayla</button>
                            <button type="button" onClick={() => updateReservationStatus(r.id, "cancelled")} disabled={updatingReservation === r.id} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 transition disabled:opacity-40">✕ Reddet</button>
                          </>
                        )}
                        {r.status === "confirmed" && (
                          <>
                            <button type="button" onClick={() => updateReservationStatus(r.id, "completed")} disabled={updatingReservation === r.id} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 transition disabled:opacity-40">Tamamlandı</button>
                            <button type="button" onClick={() => updateReservationStatus(r.id, "cancelled")} disabled={updatingReservation === r.id} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 transition disabled:opacity-40">✕ İptal</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: QR MENÜ (Digital Product Catalogue Module) ─── */}
        {tab === "qr-menu" && (
          <div className="space-y-5">
            {!canUseTableService || !svcSettings.tableServiceEnabled || !svcSettings.qrMenuPublic ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                <p className="text-sm font-bold text-amber-950">Masadan sipariş için kurulum</p>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Tek tıkla <strong>masaya sipariş</strong>, <strong>QR menü</strong> ve örnek masalar açılır. Bu özellik sadece restoran/kafe tipi sipariş işletmelerinde açılır.
                </p>
                <button
                  type="button"
                  onClick={() => void enableTableOrderAndQr(false)}
                  disabled={savingSvc || !canUseTableService}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm disabled:opacity-40"
                >
                  {savingSvc ? "Açılıyor…" : "Masaya sipariş + QR menüyü etkinleştir"}
                </button>
              </div>
            ) : null}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="text-gray-900 font-bold text-base mb-1">📱 İşletme QR — genel menü</div>
              <p className="text-gray-600 text-sm mb-6">
                Müşteri QR okutunca menü açılır; <strong>Masada</strong> seçeneğiyle sipariş verir. Masa QR&apos;larında masa otomatik seçilir.
              </p>
              <div className="inline-block p-3 bg-white rounded-2xl mb-4 border border-gray-200">
                <img src={qrUrl} alt="QR Kod" className="w-48 h-48" onError={e => { (e.target as HTMLImageElement).src = ""; }} />
              </div>
              <div className="text-gray-500 text-xs break-all mb-4">{vendorPublicUrl}</div>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href={vendorPublicUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">🔗 Sayfayı Aç</a>
                <button type="button" onClick={() => { navigator.clipboard.writeText(vendorPublicUrl); flash("ok", "Link kopyalandı!"); }} className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-sm font-semibold rounded-xl transition">📋 Linki Kopyala</button>
                <a href={qrUrl} download={`${vendor.slug}-qr-genel.png`} className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-sm font-semibold rounded-xl transition">⬇️ QR İndir</a>
              </div>
            </div>

            {canUseTableService && svcSettings.tableServiceEnabled && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-gray-900 font-bold text-sm">🪑 Masa / bölüm QR kodları</h3>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => addSampleTables(5)} className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg hover:bg-gray-50">
                      + 5 masa ekle
                    </button>
                    <button type="button" onClick={saveServiceSettings} disabled={savingSvc} className="px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg disabled:opacity-40">
                      Masaları kaydet
                    </button>
                  </div>
                </div>
                {tableSections.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Henüz masa tanımı yok. Profil → Masa ayarlarından ekleyin veya &quot;5 masa ekle&quot; kullanın.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tableSections.map((sec) => {
                      const link = buildTableOrderLink(sec.id);
                      const img = qrCodeImageUrl(link, 200);
                      const label = `${sec.type === "masa" ? "Masa" : sec.type === "oda" ? "Oda" : sec.type === "lobi" ? "Lobi" : "Bölüm"} ${sec.name}`;
                      return (
                        <div key={sec.id} className="border border-gray-200 rounded-xl p-4 text-center bg-gray-50">
                          <p className="text-sm font-bold text-gray-900 mb-2">{label}</p>
                          <img src={img} alt="" className="w-40 h-40 mx-auto bg-white rounded-lg border border-gray-200" />
                          <p className="text-[10px] text-gray-500 break-all mt-2 line-clamp-2">{link}</p>
                          <div className="flex flex-wrap gap-2 justify-center mt-3">
                            <button type="button" onClick={() => { navigator.clipboard.writeText(link); flash("ok", `${label} linki kopyalandı`); }} className="px-2 py-1 text-[11px] font-bold border border-gray-300 rounded-lg bg-white">Kopyala</button>
                            <a href={img} download={`${vendor.slug}-qr-${sec.name}.png`} className="px-2 py-1 text-[11px] font-bold border border-gray-300 rounded-lg bg-white">QR indir</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Menü özeti */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider mb-4">Menü Özeti</h3>
              {products.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">Henüz menü kalemi eklenmemiş. Ürünler sekmesinden ekleyebilirsiniz.</div>
              ) : (
                <div className="space-y-2">
                  {categories.length > 0 ? categories.map(cat => {
                    const catProducts = products.filter(p => p.menu_category_id === cat.id && p.active);
                    if (catProducts.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">{cat.name}</div>
                        {catProducts.map(p => (
                          <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                            <span className="text-gray-800 text-sm">{p.name}</span>
                            <span className="text-gray-900 text-sm font-semibold">₺{Number(p.price || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }) : products.filter(p => p.active).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-800 text-sm">{p.name}</span>
                      <span className="text-gray-900 text-sm font-semibold">₺{Number(p.price || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paylaşım önerileri */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider mb-3">Nasıl Paylaşılır?</h3>
              <div className="space-y-2 text-gray-600 text-sm">
                <div className="flex items-start gap-2"><span>🖨️</span><span>QR kodu indirip masalara, menü kapakları veya vitrine yapıştırın.</span></div>
                <div className="flex items-start gap-2"><span>📱</span><span>WhatsApp, Instagram hikayenize veya linkinize ekleyin.</span></div>
                <div className="flex items-start gap-2"><span>🔗</span><span>Linki kopyalayıp Google İşletme Profilinize ekleyin.</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: AKTARIM — İçe / Dışa Aktar ─── */}
        {tab === "aktar" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <p className="font-semibold text-sky-900 mb-1">Ürün ve menü toplu yükleme burada</p>
              <p className="text-sky-900/90 text-xs leading-relaxed">
                {isDelivery
                  ? "Menünüzü CSV ile içe aktarın veya Yemeksepeti / Getir işletme linkinden menü çekin."
                  : "Mağaza ürünlerinizi CSV ile toplu içe aktarın. Yemeksepeti / Getir menü aktarımı yalnızca sipariş işletmeleri panelinde kullanılabilir."}{" "}
                Site yöneticisi panelindeki &quot;JSON ile teslimat işletmesi&quot; kutusu{" "}
                <strong>işletme kaydı</strong> içindir; ürün aktarımı değildir.
              </p>
            </div>

            {isDelivery && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-gray-900 font-bold text-sm mb-3">🌐 Dış Platform Linkinden Menü Çek</h3>
                <p className="text-gray-600 text-xs mb-3">
                  Yemeksepeti restoran/mağaza, Getir Yemek veya Getir Çarşı işletme linkini yapıştırın. Önce önizleyin;
                  kategorileri seçerek içe aktarın. Otomatik çekme 405 verirse alttaki mor kutuya sayfa kaynağını (Ctrl+U) yapıştırın.
                </p>
                <ExternalMenuImportPanel
                  previewUrl={apiJoin("providers/import/external-menu/preview")}
                  importUrl={apiJoin("providers/import/external-menu")}
                  buildHeaders={authHeaders}
                  exampleUrls={[
                    "https://www.yemeksepeti.com/restaurant/cauu/merve-pide-1992",
                    "https://getir.com/yemek/restoran/merve-pide-1992-fevzi-cakmak-mah-torbali-izmir/",
                    "https://www.yemeksepeti.com/shop/stxe/guzelevler-market",
                  ]}
                  extraImportBody={{
                    city: externalImportLoc.city || undefined,
                    district: externalImportLoc.district || undefined,
                    neighborhood: externalImportLoc.neighborhood || undefined,
                    lat: externalImportGeo.lat,
                    lng: externalImportGeo.lng,
                  }}
                  onImported={(stats) => {
                    flash(
                      "ok",
                      `Menü içe aktarıldı: ${stats.items ?? 0} ürün, ${stats.categories ?? 0} kategori`,
                    );
                    loadProducts();
                  }}
                />
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 mt-4">
                  <p className="text-[11px] font-semibold text-gray-600 mb-2">Konum (isteğe bağlı — içe aktarımda işletme kaydına yazılır)</p>
                  <LocationPickerGooglePrimary
                    mapsSettings={siteSettings ?? null}
                    compactGoogle
                    value={{ city: externalImportLoc.city, district: externalImportLoc.district, mahalle: externalImportLoc.neighborhood }}
                    onChange={(v) => setExternalImportLoc({ city: v.city, district: v.district, neighborhood: v.mahalle })}
                    showSokak={false}
                    onGooglePick={(r) => setExternalImportGeo({ lat: r.lat, lng: r.lng })}
                  />
                  <div className="text-[11px] text-gray-500 mt-2">
                    Mahalle koordinatı: {externalImportGeo.lat != null ? `${externalImportGeo.lat.toFixed(6)}, ${externalImportGeo.lng?.toFixed(6)}` : "hesaplanıyor / bulunamadı"}
                  </div>
                </div>
              </div>
            )}

            {/* ── Nasıl Yapılır? ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-gray-900 font-bold text-sm mb-4">📖 Nasıl Çalışır?</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center text-indigo-900 text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <div className="text-gray-900 text-sm font-semibold">Şablonu İndir (Excel/CSV)</div>
                    <div className="text-gray-600 text-xs mt-0.5">Aşağıdaki "Şablon İndir" butonuna tıklayın. <strong className="text-gray-800">Yekpare_urun_sablonu.csv</strong> adında bir dosya inecektir. Bu dosyayı Excel, Google Sheets veya LibreOffice Calc ile açabilirsiniz.</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center text-indigo-900 text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <div className="text-gray-900 text-sm font-semibold">Sütunları Doldurun</div>
                    <div className="text-gray-600 text-xs mt-1 space-y-1">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <span><code className="text-indigo-700 font-mono">name</code> — Ürün adı <span className="text-red-600">*zorunlu</span></span>
                        <span><code className="text-indigo-700 font-mono">price</code> — Fiyat (₺) <span className="text-red-600">*zorunlu</span></span>
                        <span><code className="text-indigo-700 font-mono">sale_price</code> — İndirimli fiyat</span>
                        <span><code className="text-indigo-700 font-mono">description</code> — Açıklama</span>
                        <span><code className="text-indigo-700 font-mono">category</code> — Kategori adı</span>
                        <span><code className="text-indigo-700 font-mono">stock</code> — Stok adedi</span>
                        <span><code className="text-indigo-700 font-mono">is_popular</code> — evet / hayır</span>
                        <span><code className="text-indigo-700 font-mono">is_vegan</code> — evet / hayır</span>
                        <span><code className="text-indigo-700 font-mono">is_spicy</code> — evet / hayır</span>
                        <span><code className="text-indigo-700 font-mono">image_url</code> — Görsel linki</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center text-indigo-900 text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <div className="text-gray-900 text-sm font-semibold">CSV Olarak Kaydedin</div>
                    <div className="text-gray-600 text-xs mt-0.5">Excel'de: <strong className="text-gray-800">Farklı Kaydet → CSV (UTF-8)</strong> seçin. Google Sheets'te: <strong className="text-gray-800">Dosya → İndir → CSV (.csv)</strong> seçin.</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center text-indigo-900 text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                  <div>
                    <div className="text-gray-900 text-sm font-semibold">Dosyayı Yükleyin ve İçe Aktarın</div>
                    <div className="text-gray-600 text-xs mt-0.5">Aşağıdaki "Dosya Seç" butonuyla CSV dosyanızı seçin. Önizlemede satırları kontrol edin, ardından "İçe Aktar" butonuna basın. Kategoriler otomatik oluşturulur.</div>
                  </div>
                </div>
              </div>

              {/* Uyarılar */}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <p className="text-amber-900 text-xs font-semibold">⚠️ Dikkat Edilecekler</p>
                <p className="text-amber-800/90 text-xs">• Ürün isimleri benzersiz olmak zorunda değil — aynı adda birden fazla ürün eklenebilir.</p>
                <p className="text-amber-800/90 text-xs">• Fiyat alanında nokta (<strong>89.90</strong>) veya virgül (<strong>89,90</strong>) kullanabilirsiniz.</p>
                <p className="text-amber-800/90 text-xs">• Başka sitelerden ürün listesinizi kopyalayıp tabloya yapıştırabilirsiniz; görsel URL'leri doğrudan kullanılır.</p>
                <p className="text-amber-800/90 text-xs">• <code className="text-amber-900 font-mono">stock</code> sütununu boş bırakırsanız stok sınırsız kabul edilir.</p>
              </div>
            </div>

            {/* ── Şablon + Dışa Aktar ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-gray-900 font-semibold text-sm mb-1">Örnek Şablon İndir</div>
                <div className="text-gray-600 text-xs mb-4">4 örnek satır içeren hazır CSV dosyası. Excel veya Google Sheets ile açın, kendi ürünlerinizi doldurun.</div>
                <button type="button" onClick={downloadTemplate} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">⬇️ Yekpare_urun_sablonu.csv</button>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="text-2xl mb-2">📤</div>
                <div className="text-gray-900 font-semibold text-sm mb-1">Mevcut Ürünleri Dışa Aktar</div>
                <div className="text-gray-600 text-xs mb-4">{products.length} ürününüz CSV formatında dışa aktarılır. Yedek almak veya başka sisteme geçirmek için kullanın.</div>
                <button type="button" onClick={exportProductsCSV} disabled={products.length === 0} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition disabled:opacity-40">
                  {products.length === 0 ? "Dışa aktarılacak ürün yok" : `⬇️ ${products.length} Ürünü Dışa Aktar`}
                </button>
              </div>
            </div>

            {/* ── İçe Aktarım ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider mb-4">📥 CSV / Excel Dosyasından İçe Aktar</h3>

              {!importRows.length ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📂</div>
                  <p className="text-gray-600 text-sm mb-4">CSV dosyanızı seçin. Yüklenmeden önce önizleyebilirsiniz.</p>
                  <button type="button" onClick={() => importFileRef.current?.click()} className="px-6 py-3 rounded-xl text-sm font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/20 hover:from-indigo-100/90 transition">📂 Dosya Seç (CSV)</button>
                  <input ref={importFileRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
                  <p className="text-gray-500 text-xs mt-3">Kabul edilen format: .csv — UTF-8 veya UTF-8 BOM</p>
                </div>
              ) : (
                <div>
                  {/* Özet */}
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div className="flex gap-3 text-xs">
                      <span className="text-gray-700">{importRows.length} satır okundu</span>
                      {importDone && <>
                        <span className="text-emerald-700 font-medium">✓ {importRows.filter(r => r._status === "ok").length} eklendi</span>
                        {importRows.filter(r => r._status === "err").length > 0 && <span className="text-red-700 font-medium">✗ {importRows.filter(r => r._status === "err").length} hata</span>}
                      </>}
                    </div>
                    <div className="flex gap-2">
                      {!importDone && !importing && (
                        <button type="button" onClick={() => { setImportRows([]); setImportDone(false); }} className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs rounded-lg transition">✕ İptal</button>
                      )}
                      {!importDone ? (
                        <button type="button" onClick={runImport} disabled={importing} className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 shadow-sm ring-2 ring-indigo-500/25 hover:from-indigo-100/90 transition disabled:opacity-50 flex items-center gap-2">
                          {importing ? <><span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-700 rounded-full animate-spin" />İçe Aktarılıyor…</> : `✅ ${importRows.length} Ürünü İçe Aktar`}
                        </button>
                      ) : (
                        <button type="button" onClick={() => { setImportRows([]); setImportDone(false); }} className="px-4 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs rounded-lg transition">🔄 Yeni Dosya Yükle</button>
                      )}
                    </div>
                  </div>

                  {/* Önizleme tablosu */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          {["#", "Ürün Adı", "Fiyat", "İndirimli", "Kategori", "Stok", "Durum"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-gray-600 font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((r, i) => (
                          <tr key={i} className={`border-b border-gray-100 ${r._status === "ok" ? "bg-emerald-50/50" : r._status === "err" ? "bg-red-50/50" : ""}`}>
                            <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                            <td className="px-3 py-2 text-gray-900 font-medium max-w-[160px] truncate">{r.name || <span className="text-red-600">—</span>}</td>
                            <td className="px-3 py-2 text-gray-800">{r.price ? `₺${r.price}` : <span className="text-red-600">—</span>}</td>
                            <td className="px-3 py-2 text-gray-600">{r.sale_price ? `₺${r.sale_price}` : "—"}</td>
                            <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{r.category || "—"}</td>
                            <td className="px-3 py-2 text-gray-600">{r.stock || "∞"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {r._status === "ok" && <span className="text-emerald-700 font-semibold">✓ Eklendi</span>}
                              {r._status === "err" && <span className="text-red-700">{r._msg || "Hata"}</span>}
                              {r._status === "pending" && (importing ? <span className="text-gray-400 animate-pulse">...</span> : <span className="text-gray-500">Bekliyor</span>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── Başka siteden nasıl kopyalanır ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-gray-800 text-xs font-bold uppercase tracking-wider mb-3">💡 Başka Siteden Ürün Listenizi Nasıl Alırsınız?</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Yemeksepeti / Getir / Trendyol'dan</div>
                  <div className="text-gray-600 text-xs space-y-1">
                    <p>1. Kendi işletme sayfanızı açın → ürün listesini seçin (Ctrl+A)</p>
                    <p>2. Excel açın → yapıştırın (Ctrl+V)</p>
                    <p>3. A sütununa ürün adı, B sütununa fiyat yerleştirin</p>
                    <p>4. Başlık satırını <code className="text-indigo-700 font-mono">name,price</code> olarak düzenleyin → CSV kaydedin</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Excel / Google Sheets'ten</div>
                  <div className="text-gray-600 text-xs space-y-1">
                    <p>1. Mevcut ürün tablonuzu açın</p>
                    <p>2. İlk satıra şu başlıkları ekleyin: <code className="text-indigo-700 font-mono">name, price, category, stock</code></p>
                    <p>3. <strong className="text-gray-800">Farklı Kaydet → CSV UTF-8</strong> (Excel) veya <strong className="text-gray-800">Dosya → İndir → CSV</strong> (Sheets)</p>
                    <p>4. İndirilen .csv dosyasını buraya yükleyin</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="text-gray-900 text-sm font-semibold mb-1">WooCommerce / Shopify / Pazarama'dan</div>
                  <div className="text-gray-600 text-xs space-y-1">
                    <p>1. Yönetim panelinizde <strong className="text-gray-800">Ürünler → Dışa Aktar → CSV</strong> seçeneğini kullanın</p>
                    <p>2. İndirilen CSV'yi Excel'de açın</p>
                    <p>3. Gereksiz sütunları silin; <code className="text-indigo-700 font-mono">name</code> ve <code className="text-indigo-700 font-mono">price</code> sütunlarının başlığını bizim formatımıza uydurun</p>
                    <p>4. Tekrar CSV olarak kaydedin ve buraya yükleyin</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
          </div>
        </div>
      </div>

      {/* ── Onay Modalı ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-gray-900 font-bold text-base mb-1">Siparişi Onayla</h3>
            <p className="text-gray-500 text-xs mb-4">#{confirmModal.orderNum}</p>
            {confirmModal.isEcommerce ? (
              <div className="mb-4">
                <label className="text-gray-700 text-xs font-medium block mb-2">Kargoya verilme süresi (varsayılan 1 gün)</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {([1, 2, 3] as const).map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setConfirmEt(d * 1440)}
                      className={`py-2 rounded-xl text-xs font-bold border transition shadow-sm ${confirmEt === d * 1440 ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 ring-2 ring-indigo-500/25" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}
                    >
                      {d} gün
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={typeof confirmEt === "number" && confirmEt >= 1440 ? Math.round(confirmEt / 1440) : 1}
                    onChange={(e) => {
                      const d = Math.min(14, Math.max(1, Number(e.target.value) || 1));
                      setConfirmEt(d * 1440);
                    }}
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400"
                  />
                  <span className="text-gray-500 text-xs whitespace-nowrap">gün (manuel)</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                  Bu süre müşteriye "kargoya verilme" olarak bildirilir. Farklı bir durum varsa aşağıdaki notu doldurun; not WhatsApp ile müşteriye iletilir (CallMeBot yapılandırılmışsa).
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-gray-700 text-xs font-medium block mb-2">Tahmini Teslimat Süresi</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[30, 60, 90, 120].map((min) => (
                    <button
                      type="button"
                      key={min}
                      onClick={() => setConfirmEt(min)}
                      className={`py-2 rounded-xl text-xs font-bold border transition shadow-sm ${confirmEt === min ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-gray-900 ring-2 ring-indigo-500/25" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}
                    >
                      {min} dk
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={confirmEt === "" ? "" : confirmEt}
                    onChange={(e) => setConfirmEt(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Manuel gir (dk)"
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder:text-gray-400"
                  />
                  <span className="text-gray-500 text-xs">dk</span>
                </div>
              </div>
            )}
            <div className="mb-5">
              <label className="text-gray-700 text-xs font-medium block mb-2">Müşteriye Not (isteğe bağlı)</label>
              <textarea
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder={
                  confirmModal.isEcommerce
                    ? "Örn: Yoğun sezon nedeniyle kargoya 2 gün içinde verilecektir."
                    : "Örn: Şu an yoğunuz, ~90 dk içinde teslimat yapılacaktır."
                }
                rows={3}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder:text-gray-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm hover:bg-gray-50 transition">Vazgeç</button>
              <button type="button" onClick={confirmOrderWithDetails} disabled={updatingOrder === confirmModal.orderId} className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition disabled:opacity-50">
                {updatingOrder === confirmModal.orderId ? "…" : "✓ Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ─── Yardımcı Bileşenler ─────────────────────────────── */
function StatCard({ label, value, icon, highlight = false, onClick }: { label: string; value: number; icon: string; highlight?: boolean; onClick?: () => void; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full bg-white border rounded-2xl p-4 text-center transition hover:shadow-sm ${highlight && value > 0 ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xl font-bold ${highlight && value > 0 ? "text-amber-800" : "text-gray-950"}`}>{value}</div>
      <div className="text-gray-900 text-xs font-semibold mt-0.5">{label}</div>
    </button>
  );
}
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div><div className="text-gray-800 text-xs font-semibold mb-0.5">{label}</div><div className="text-gray-950 text-sm font-medium">{value || "—"}</div></div>
  );
}
function EcommerceMetricCard({
  label,
  value,
  hint,
  tone = "indigo",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "indigo" | "emerald" | "amber" | "rose";
}) {
  const toneCls: Record<"indigo" | "emerald" | "amber" | "rose", string> = {
    indigo: "border-indigo-300/25 bg-indigo-300/10 text-indigo-50",
    emerald: "border-emerald-300/25 bg-emerald-300/10 text-emerald-50",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-50",
    rose: "border-rose-300/25 bg-rose-300/10 text-rose-50",
  };
  return (
    <div className={`rounded-2xl border p-4 ${toneCls[tone]}`}>
      <div className="text-[11px] font-black uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-black leading-none">{value}</div>
      <div className="mt-2 text-[11px] font-medium opacity-75">{hint}</div>
    </div>
  );
}
function EcommerceSignalCard({ title, value, detail, warn = false }: { title: string; value: string; detail: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${warn ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
      <div className={`text-xl font-black ${warn ? "text-amber-950" : "text-gray-950"}`}>{value}</div>
      <div className="text-xs font-black text-gray-900">{title}</div>
      <div className="mt-0.5 text-[11px] text-gray-500">{detail}</div>
    </div>
  );
}
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Bekliyor",      cls: "bg-amber-200 text-amber-950 border border-amber-400" },
    confirmed: { label: "Onaylandı",     cls: "bg-blue-200 text-blue-950 border border-blue-400" },
    preparing: { label: "Hazırlanıyor",  cls: "bg-indigo-200 text-indigo-950 border border-indigo-400" },
    ready:     { label: "Hazır",         cls: "bg-purple-200 text-purple-950 border border-purple-400" },
    picked_up: { label: "Yolda",         cls: "bg-violet-200 text-violet-950 border border-violet-400" },
    delivered: { label: "Teslim Edildi", cls: "bg-emerald-200 text-emerald-950 border border-emerald-400" },
    cancelled: { label: "İptal",         cls: "bg-red-200 text-red-950 border border-red-400" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-200 text-slate-950 border border-slate-400" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.cls}`}>{s.label}</span>;
}
