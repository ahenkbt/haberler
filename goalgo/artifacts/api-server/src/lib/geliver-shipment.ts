import { GeliverClient, type Transaction } from "@geliver/sdk";
import { db } from "@workspace/db";
import { deliveryOrdersTable, vendorsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger.js";
import { trCityNameToPlateCode } from "./tr-city-plate.js";

function normalizeTrPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "+900000000000";
  if (d.startsWith("90") && d.length >= 12) return `+${d.slice(0, 12)}`;
  if (d.length === 10) return `+90${d}`;
  if (d.length === 11 && d.startsWith("0")) return `+90${d.slice(1)}`;
  return raw.startsWith("+") ? raw : `+${d}`;
}

import { PORTAL_ORIGIN } from "./portalBrand.js";

function siteSourceIdentifier(): string {
  const u =
    process.env["PUBLIC_SITE_URL"]?.trim() ||
    process.env["SITE_PUBLIC_URL"]?.trim() ||
    process.env["FRONTEND_URL"]?.trim() ||
    "";
  return u || PORTAL_ORIGIN;
}

// NOT: Geliver `test: true` shipment'larında acceptOffer GERÇEK satın alma yapmaz; sağlayıcıdan
// barkod/label dönmez ve kullanıcı bu shipment'ı iptal etmek zorunda kalır. Eskiden env değişkeniyle
// (GELIVER_TEST_SHIPMENTS=1) bu açılıyordu; canlıda yanlışlıkla set edildiğinde tüm gönderilerin
// "teklif aldı satın almadı" durumuna düşmesine sebep oldu. Bu yüzden artık `test: false` LITERAL
// olarak gönderiliyor; hiçbir env okuması yok. Test gönderisi gerçekten istenirse SDK'nın
// `client.shipments.createTest(...)` fonksiyonu manuel kod yoluyla çağrılmalı.

/** Bir Geliver çağrısını verilen ms üst sınırıyla bekler; timeout’ta promise reddolur. */
async function withGeliverTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[geliver] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Geliver SDK / upstream bazen BigInt, Date veya döngüsel referans döndürür; Express `res.json` patlar (HTTP 500).
 * API proxy yanıtlarında kullanın.
 */
export function geliverJsonSafe(value: unknown): unknown {
  const seen = new WeakSet<object>();
  const walk = (v: unknown, depth: number): unknown => {
    if (depth > 80) return "[max-depth]";
    if (v === null || v === undefined) return v;
    if (typeof v === "bigint") return v.toString();
    if (typeof v === "number" && !Number.isFinite(v)) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    if (typeof v === "function" || typeof v === "symbol") return undefined;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) {
      const out: unknown[] = [];
      for (const item of v) {
        const n = walk(item, depth + 1);
        if (n !== undefined) out.push(n);
      }
      return out;
    }
    if (typeof v === "object") {
      const obj = v as object;
      if (seen.has(obj)) return "[circular]";
      seen.add(obj);
      const o = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(o)) {
        const n = walk(val, depth + 1);
        if (n !== undefined) out[k] = n as unknown;
      }
      return out;
    }
    return String(v);
  };
  return walk(value, 0);
}

/** Geliver SDK `GeliverError` ve diğer hatalardan okunabilir mesaj (HTTP 500 yerine ayrıntı). */
export function geliverExceptionToUserMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const ge = e as {
      name?: string;
      message?: string;
      additionalMessage?: string;
      status?: number;
      code?: string;
      responseBody?: unknown;
    };
    if (ge.name === "GeliverError") {
      let bodyHint = "";
      const rb = ge.responseBody;
      if (rb && typeof rb === "object" && !Array.isArray(rb)) {
        const o = rb as Record<string, unknown>;
        const bits = [o.message, o.additionalMessage, o.error, o.title]
          .map((x) => (x != null && String(x).trim() ? String(x).trim() : ""))
          .filter(Boolean);
        if (bits.length) bodyHint = bits.join(" · ").slice(0, 900);
      }
      const parts = [ge.message, ge.additionalMessage, ge.code ? `Kod: ${ge.code}` : "", bodyHint]
        .map((x) => (x ? String(x).trim() : ""))
        .filter(Boolean);
      const msg = parts.join(" · ").slice(0, 2000);
      const isOfferNotFound =
        /E1177|E1117|offercode details? not found|offer.*not found|teklif.*bulunamad/i.test(msg) &&
        /E1084|record not found|not found/i.test(msg);
      if (isOfferNotFound) {
        return "Seçtiğiniz teklif artık geçerli değil (Geliver’da bulunamadı). «API'den yenile» ile teklifleri güncelleyip tekrar satın alın.";
      }
      if (/E1117|errorcode details? not found/i.test(msg)) {
        return "Seçilen teklif Geliver tarafında artık bulunamadı. «API'den yenile» ile yeni teklifleri çekip tekrar satın alın.";
      }
      // Geliver "insufficient balance / yetersiz bakiye / not enough credit" benzeri mesajlar
      if (/insufficient|not enough|yetersiz bakiye|balance.*insufficient|bakiyen(iz)? yetersiz|kredi yetersiz/i.test(msg)) {
        return (
          "Geliver bakiyeniz yetersiz görünüyor; etiket satın alınamadı. " +
          "app.geliver.io → Bakiye / Cüzdan üzerinden TL yükleyip yeniden deneyin. " +
          "Detay: " +
          msg.slice(0, 240)
        );
      }
      if (ge.status != null && ge.status >= 500) {
        if (/E1120|E1084|hesap bulunamadı|record not found/i.test(msg)) {
          return msg || "Geliver hesap/kayıt hatası";
        }
        return (
          (msg || "Geliver sunucu hatası") +
          " — Geliver tarafı geçici 5xx döndü; bir süre sonra yeniden deneyin veya app.geliver.io üzerinden kontrol edin."
        );
      }
      return msg || "Geliver isteği başarısız";
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  return msg.slice(0, 2000);
}

function normalizeGeliverOrganizationId(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

/**
 * Geliver client bazen JSON gövdesini unwrap edip dizi döndürür (sayfalama yoksa);
 * bazen `{ data: [...] }` kalır. listDistricts / listCities için ortak parser.
 */
function geliverArrayData<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && Array.isArray((res as { data?: unknown }).data)) {
    return (res as { data: T[] }).data;
  }
  return [];
}

function plateNorm2(code: string | null | undefined): string {
  const d = String(code ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.length <= 2 ? d.padStart(2, "0") : d.slice(-2);
}

/** Geliver şehir listesi (TR) — tüm hesaplar için aynı; tek önbellek. */
let geliverCitiesTrMemo: { rows: Array<{ name?: string; cityCode?: string; areaCode?: string }>; at: number } | null =
  null;
const geliverDistrictRowsCache = new Map<string, { rows: Array<{ name?: string; districtID?: string | number }>; at: number }>();
const GELIVER_GEO_CACHE_MS = 3_600_000;

function normDistrictLabel(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+ilçesi$/iu, "")
    .trim();
}

function districtLabelsMatch(geliverName: string, wanted: string): boolean {
  const g = normDistrictLabel(geliverName);
  const w = normDistrictLabel(wanted);
  if (!g || !w) return false;
  if (g === w) return true;
  return g.includes(w) || w.includes(g);
}

/** «Merkez» veya boş ilçe: Geliver listesinde böyle kayıt yok; büyük şehirlerde tipik merkez ilçeleri dene. */
const GELIVER_FALLBACK_DISTRICTS_BY_PLATE: Record<string, string[]> = {
  "34": ["Kadıköy", "Fatih", "Üsküdar", "Beşiktaş", "Şişli", "Bakırköy", "Ataşehir"],
  "06": ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut"],
  "35": ["Konak", "Bornova", "Karşıyaka", "Buca"],
  "16": ["Osmangazi", "Nilüfer", "Yıldırım"],
  "07": ["Muratpaşa", "Kepez", "Konyaaltı", "Alanya"],
  "41": ["İzmit", "Gebze", "Darıca"],
  "42": ["Selçuklu", "Meram", "Karatay"],
};

function isMerkezOrEmptyDistrictLabel(want: string): boolean {
  const n = normDistrictLabel(want);
  return !n || n === "merkez" || n === "merkez ilce" || n === "merkez ilçe" || n === "merkez ilcesi";
}

function normCityLabel(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+ili$/iu, "")
    .trim();
}

async function listGeliverCitiesTrCached(client: GeliverClient) {
  const now = Date.now();
  if (geliverCitiesTrMemo && now - geliverCitiesTrMemo.at < GELIVER_GEO_CACHE_MS) return geliverCitiesTrMemo.rows;

  const res = await client.geo.listCities("TR");
  const rows = geliverArrayData<{ name?: string; cityCode?: string; areaCode?: string }>(res).map((c) => ({
    name: c.name,
    cityCode: c.cityCode != null ? String(c.cityCode) : undefined,
    areaCode: c.areaCode != null ? String(c.areaCode) : undefined,
  }));
  geliverCitiesTrMemo = { rows, at: now };
  return rows;
}

/**
 * Yerel plaka / il adı → Geliver listCities ile uyumlu plaka (İstanbul=34 boş liste hatasını önler).
 */
async function resolveGeliverCityCodeForApi(
  client: GeliverClient,
  cityName: string | null | undefined,
  plateHint: string,
): Promise<string> {
  const plate = plateNorm2(plateHint) || "34";
  const cities = await listGeliverCitiesTrCached(client);
  if (!cities.length) return plate;

  const hint = cityName?.trim();
  if (hint) {
    const n = normCityLabel(hint);
    const exact = cities.find((c) => c.name && normCityLabel(c.name) === n);
    const cc0 = plateNorm2(exact?.cityCode ?? exact?.areaCode);
    if (cc0) return cc0;

    const fuzzy = cities.find((c) => {
      if (!c.name) return false;
      const cn = normCityLabel(c.name);
      return cn.includes(n) || n.includes(cn);
    });
    const cc1 = plateNorm2(fuzzy?.cityCode ?? fuzzy?.areaCode);
    if (cc1) return cc1;
  }

  const byPlate = cities.find((c) => plateNorm2(c.cityCode) === plate || plateNorm2(c.areaCode) === plate);
  const cc2 = plateNorm2(byPlate?.cityCode ?? byPlate?.areaCode);
  return cc2 || plate;
}

async function getGeliverDistrictRows(client: GeliverClient, cityCodeForQuery: string) {
  const cc = plateNorm2(cityCodeForQuery) || "34";
  const now = Date.now();
  const key = cc;
  const hit = geliverDistrictRowsCache.get(key);
  if (hit && now - hit.at < GELIVER_GEO_CACHE_MS && hit.rows.length > 0) return hit.rows;

  const res = await client.geo.listDistricts("TR", cc);
  const rows = geliverArrayData<{ name?: string; districtID?: string | number }>(res).map((d) => ({
    name: d.name,
    districtID: d.districtID,
  }));
  /** Boş yanıtları önbelleğe alma: yanlış plaka / geçici API sonrası tekrar denenebilsin. */
  if (rows.length > 0) {
    geliverDistrictRowsCache.set(key, { rows, at: now });
  }
  return rows;
}

/**
 * İlçe ID — https://docs.geliver.io/docs/addresses/create_sender_address
 */
async function resolveGeliverDistrictId(
  client: GeliverClient,
  cityName: string | null | undefined,
  plateHint: string,
  districtName: string,
): Promise<{ districtId: number; cityCode: string }> {
  const want = districtName.trim();
  if (!want) {
    throw new Error(
      "Geliver için ilçe bilgisi zorunludur. Gönderici veya alıcı tarafında ilçe adını kontrol edin.",
    );
  }

  const cityCode = await resolveGeliverCityCodeForApi(client, cityName, plateHint);
  const rows = await getGeliverDistrictRows(client, cityCode);

  if (!rows.length) {
    throw new Error(
      `Geliver bu şehir için ilçe listesi döndürmedi (Geliver şehir kodu ${cityCode}). Profil şehir/ilçe adını kontrol edin veya Geliver panelindeki il–ilçe adlarıyla aynı yazın.`,
    );
  }

  const exact = rows.find((d) => d.name && normDistrictLabel(d.name) === normDistrictLabel(want));
  if (exact?.districtID != null) return { districtId: Number(exact.districtID), cityCode };

  const fuzzy = rows.find((d) => d.name && districtLabelsMatch(d.name, want));
  if (fuzzy?.districtID != null) return { districtId: Number(fuzzy.districtID), cityCode };

  /* «Merkez» / boş: Geliver’de yok; API’de “Merkez” geçen ilçe veya şehir için tipik ilçe listesi. */
  if (isMerkezOrEmptyDistrictLabel(want)) {
    const merkezRow = rows.find(
      (d) => d.name && /merkez/i.test(String(d.name)) && d.districtID != null,
    );
    if (merkezRow?.districtID != null) return { districtId: Number(merkezRow.districtID), cityCode };

    const hints = GELIVER_FALLBACK_DISTRICTS_BY_PLATE[cityCode] ?? [];
    for (const hint of hints) {
      const h = rows.find((d) => d.name && normDistrictLabel(d.name) === normDistrictLabel(hint));
      if (h?.districtID != null) return { districtId: Number(h.districtID), cityCode };
    }
    const sorted = [...rows]
      .filter((d) => d.name && d.districtID != null)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
    const first = sorted[0];
    if (first?.districtID != null) {
      logger.warn(
        { cityCode, picked: first.name, wanted: want || "(boş)" },
        "geliver_district_merkez_fallback",
      );
      return { districtId: Number(first.districtID), cityCode };
    }
  }

  throw new Error(
    `Geliver ilçe eşlemesi yapılamadı: «${want}» (şehir kodu ${cityCode}). Profil veya siparişteki ilçe adını resmi ilçe adıyla güncelleyin.`,
  );
}

export async function ensureGeliverIntegrationColumns(): Promise<void> {
  for (const q of [
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_api_token TEXT`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_address_id TEXT`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_organization_id TEXT`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_zip TEXT`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_mahalle TEXT`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_auto_ship_on_order BOOLEAN NOT NULL DEFAULT false`,
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_postal_code TEXT`,
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_shipment_id TEXT`,
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_tracking_number TEXT`,
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_label_url TEXT`,
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_transaction_id TEXT`,
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_status TEXT`,
    sql`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_last_error TEXT`,
  ]) {
    await db.execute(q);
  }
}

async function persistSenderId(vendorId: number, senderId: string): Promise<void> {
  await db
    .update(vendorsTable)
    .set({ geliverSenderAddressId: senderId, updatedAt: new Date() })
    .where(eq(vendorsTable.id, vendorId));
}

function address1HasLeadingMahalle(address1: string): boolean {
  const s = address1.trim();
  if (!s) return false;
  const head = (s.split(",")[0] ?? s).trim();
  return (
    /mahallesi\b/i.test(head) ||
    /\bmah\.?\b/i.test(head) ||
    /\bmah\b/i.test(head) ||
    / mah$/i.test(head)
  );
}

/** Geliver TR: gönderici address1 satırının başında mahalle olmalı. */
function senderAddress1ForGeliver(vendor: typeof vendorsTable.$inferSelect): string {
  const mh = vendor.geliverSenderMahalle?.trim() || "";
  const street = vendor.address?.trim() || "";
  const ilce = vendor.district?.trim() || "";
  const city = vendor.city?.trim() || "";

  if (mh) {
    const sLow = street.toLocaleLowerCase("tr-TR");
    const mLow = mh.toLocaleLowerCase("tr-TR");
    if (street && !sLow.startsWith(mLow) && !sLow.includes(mLow)) {
      return `${mh}, ${street}`.trim().slice(0, 200);
    }
    if (street) return street.slice(0, 200);
    return mh.slice(0, 200);
  }

  if (street && address1HasLeadingMahalle(street)) return street.slice(0, 200);

  const fallback = street || [ilce, city].filter(Boolean).join(" ").trim() || "Merkez";
  return fallback.slice(0, 200);
}

async function clearVendorGeliverSenderId(vendorId: number): Promise<void> {
  await db
    .update(vendorsTable)
    .set({ geliverSenderAddressId: null, updatedAt: new Date() })
    .where(eq(vendorsTable.id, vendorId));
}

/**
 * İstemciden gelen gönderici adresi ID’si Geliver’da yoksa (silinmiş / başka hesap) E1084 üretir.
 * Bu durumda DB’deki ID’yi temizleyip ensureSender ile yeniden oluşturur.
 */
async function resolveManualShipmentSenderId(
  client: GeliverClient,
  vendor: typeof vendorsTable.$inferSelect,
  explicitSenderId: string | null | undefined,
): Promise<string> {
  const ex = explicitSenderId?.trim();
  if (ex) {
    try {
      await client.addresses.get(ex);
      return ex;
    } catch (e) {
      logger.warn({ err: e, vendorId: vendor.id, senderId: ex }, "[geliver] explicit sender id invalid; recreating");
      await clearVendorGeliverSenderId(vendor.id);
      const [fresh] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendor.id)).limit(1);
      if (!fresh) throw new Error("vendor_not_found");
      return ensureSender(client, fresh);
    }
  }
  return ensureSender(client, vendor);
}

async function ensureSender(client: GeliverClient, vendor: typeof vendorsTable.$inferSelect): Promise<string> {
  const zip = (vendor.geliverSenderZip?.trim() || "34000").replace(/\D/g, "").slice(0, 5) || "34000";
  let address1 = senderAddress1ForGeliver(vendor);

  if (!address1HasLeadingMahalle(address1)) {
    throw new Error(
      "Geliver gönderici adresinde mahalle satır başında olmalıdır. Genel Ayarlar → Geliver bölümünde «Gönderici mahalle» alanını doldurun (veya profil adresinizin başına mahalle yazın).",
    );
  }

  let existing = vendor.geliverSenderAddressId?.trim() || null;
  let v = vendor;

  if (existing) {
    try {
      const remote = (await client.addresses.get(existing)) as { address1?: string };
      const rAddr = String(remote?.address1 ?? "").trim();
      if (rAddr && address1HasLeadingMahalle(rAddr)) {
        return existing;
      }
      try {
        await client.addresses.delete(existing);
      } catch {
        /* ignore */
      }
      await clearVendorGeliverSenderId(vendor.id);
      existing = null;
      v = { ...vendor, geliverSenderAddressId: null };
    } catch {
      await clearVendorGeliverSenderId(vendor.id);
      existing = null;
      v = { ...vendor, geliverSenderAddressId: null };
    }
  }

  const phone = normalizeTrPhone(v.phone || "");
  const plateHint = trCityNameToPlateCode(v.city || undefined);
  const districtName = (v.district?.trim() || "Merkez").slice(0, 80);
  const { districtId: districtID, cityCode: cityCodeResolved } = await resolveGeliverDistrictId(
    client,
    v.city,
    plateHint,
    districtName,
  );
  const email =
    (v.email?.trim() || v.ownerEmail?.trim() || `magaza-${v.id}@noreply.yekpare.local`) as string;

  address1 = senderAddress1ForGeliver(v);

  const sender = await client.addresses.createSender({
    name: v.name.slice(0, 120),
    email,
    phone,
    address1,
    countryCode: "TR",
    cityName: v.city?.trim() || "İstanbul",
    cityCode: cityCodeResolved,
    districtName,
    districtID,
    zip,
    shortName: `vp-${v.id}`,
  });

  const sid = sender.id;
  if (!sid) throw new Error("geliver_sender_no_id");
  await persistSenderId(v.id, sid);
  return sid;
}

async function writeOrderGeliverFields(
  orderId: number,
  patch: Partial<{
    geliverShipmentId: string | null;
    geliverTrackingNumber: string | null;
    geliverLabelUrl: string | null;
    geliverTransactionId: string | null;
    geliverStatus: string | null;
    geliverLastError: string | null;
  }>,
): Promise<void> {
  await db
    .update(deliveryOrdersTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(deliveryOrdersTable.id, orderId));
}

/**
 * Sipariş satırından Geliver gönderisi: teklifler hazır olana kadar bekler, etiket satın almaz.
 * Mağaza panelinde kargo firması seçimi için kullanılır.
 */
export async function createGeliverDraftShipmentForOrder(opts: {
  orderId: number;
  vendorId: number;
  force?: boolean;
}): Promise<{ ok: true; shipmentId: string; shipment: unknown } | { ok: false; error: string }> {
  await ensureGeliverIntegrationColumns();

  const [order] = await db.select().from(deliveryOrdersTable).where(eq(deliveryOrdersTable.id, opts.orderId)).limit(1);
  if (!order || order.vendorId !== opts.vendorId) return { ok: false, error: "order_not_found" };

  if (!opts.force && order.geliverLabelUrl?.trim()) {
    return { ok: false, error: "already_has_label" };
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, opts.vendorId)).limit(1);
  if (!vendor) return { ok: false, error: "vendor_not_found" };

  const token = vendor.geliverApiToken?.trim();
  if (!token) return { ok: false, error: "geliver_token_missing" };

  const client = new GeliverClient({ token });

  try {
    const existingSid = order.geliverShipmentId?.trim();
    if (!opts.force && existingSid && !order.geliverLabelUrl?.trim()) {
      const latest = await client.shipments.get(existingSid);
      return { ok: true, shipmentId: existingSid, shipment: geliverJsonSafe(latest) };
    }

    await writeOrderGeliverFields(opts.orderId, {
      geliverLastError: null,
      geliverStatus: "creating",
    });

    const senderAddressID = await ensureSender(client, vendor);

    const recipientCity = order.customerCity?.trim() || vendor.city?.trim() || "İstanbul";
    const recipientDistrict = (order.customerDistrict?.trim() || "Merkez").slice(0, 80);
    const recipientPlateHint = trCityNameToPlateCode(recipientCity);
    const { districtId: recipientDistrictId, cityCode: recipientCityCodeResolved } = await resolveGeliverDistrictId(
      client,
      recipientCity,
      recipientPlateHint,
      recipientDistrict,
    );
    const recipientEmail = `siparis-${order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, "")}@customers.local`;
    const recipientZip =
      order.customerPostalCode?.replace(/\D/g, "").slice(0, 5) ||
      vendor.geliverSenderZip?.replace(/\D/g, "").slice(0, 5) ||
      "34000";

    const created = await client.shipments.create({
      senderAddressID,
      recipientAddress: {
        name: order.customerName.slice(0, 120),
        email: recipientEmail,
        phone: normalizeTrPhone(order.customerPhone),
        address1: order.customerAddress.slice(0, 200),
        countryCode: "TR",
        cityName: recipientCity,
        cityCode: recipientCityCodeResolved,
        districtName: recipientDistrict,
        districtID: recipientDistrictId,
        zip: recipientZip,
      },
      length: "30.0",
      width: "20.0",
      height: "15.0",
      distanceUnit: "cm",
      weight: "1.0",
      massUnit: "kg",
      // ASLA test:true GÖNDERME — test shipment'lar acceptOffer'da gerçek satın alma yapmaz,
      // kullanıcı sadece teklif görür ve iptal etmek zorunda kalır.
      test: false,
      order: {
        orderNumber: order.orderNumber,
        sourceCode: "YEKPARE",
        sourceIdentifier: siteSourceIdentifier(),
        totalAmount: order.total,
        totalAmountCurrency: "TRY",
      },
    });

    const shipmentId = created.id;
    if (!shipmentId) throw new Error("geliver_shipment_no_id");
    try {
      const c = created as unknown as Record<string, unknown>;
      logger.info(
        {
          shipmentId,
          test: c.test ?? c.isTest ?? null,
          statusCode: c.statusCode ?? null,
          owner: c.owner ?? null,
          hasOffers: c.offers != null,
        },
        "[geliver] shipment.create response (auto)",
      );
    } catch {
      /* logging best-effort */
    }

    await writeOrderGeliverFields(opts.orderId, {
      geliverShipmentId: shipmentId,
      geliverTransactionId: null,
      geliverTrackingNumber: null,
      geliverLabelUrl: null,
      geliverStatus: "waiting_offers",
    });

    await client.shipments.waitForOffers(shipmentId, { intervalMs: 1500, timeoutMs: 90000 });

    const latest = await client.shipments.get(shipmentId);
    await writeOrderGeliverFields(opts.orderId, {
      geliverLastError: null,
      geliverStatus: "waiting_offers",
    });

    return { ok: true, shipmentId, shipment: geliverJsonSafe(latest) };
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e !== null && "message" in e
        ? String((e as { message?: string }).message)
        : String(e);
    const detail =
      typeof e === "object" && e !== null && "additionalMessage" in e
        ? String((e as { additionalMessage?: string }).additionalMessage ?? "")
        : "";
    const full = [msg, detail].filter(Boolean).join(" — ").slice(0, 2000);

    logger.error({ err: e, orderId: opts.orderId }, "[geliver] draft shipment failed");

    await writeOrderGeliverFields(opts.orderId, {
      geliverLastError: full,
      geliverStatus: "error",
    });

    return { ok: false, error: full };
  }
}

/** Geliver üzerinden gönderi oluştur + en ucuz teklifi kabul et (etiket); mağaza API anahtarı ile (@geliver/sdk). */
export async function createGeliverShipmentForOrder(opts: {
  orderId: number;
  vendorId: number;
  force?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const draft = await createGeliverDraftShipmentForOrder(opts);
  if (!draft.ok) return { ok: false, error: draft.error };

  const [order] = await db.select().from(deliveryOrdersTable).where(eq(deliveryOrdersTable.id, opts.orderId)).limit(1);
  if (!order || order.vendorId !== opts.vendorId) return { ok: false, error: "order_not_found" };

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, opts.vendorId)).limit(1);
  if (!vendor?.geliverApiToken?.trim()) return { ok: false, error: "geliver_token_missing" };

  const client = new GeliverClient({ token: vendor.geliverApiToken.trim() });
  const shipmentId = draft.shipmentId;

  try {
    const latestRaw = draft.shipment as { offers?: { cheapest?: { id?: string } } };
    const cheapest = latestRaw?.offers?.cheapest;
    const offerId = cheapest?.id;
    if (!offerId) throw new Error("geliver_no_cheapest_offer");

    const tx = await postGeliverTransactionAccept(client, offerId, shipmentId);
    const ship = tx.shipment;

    await writeOrderGeliverFields(opts.orderId, {
      geliverTransactionId: tx.id ?? null,
      geliverTrackingNumber: ship?.trackingNumber ?? null,
      geliverLabelUrl: ship?.labelURL ?? null,
      geliverStatus: ship?.trackingNumber ? "label_created" : "offer_accepted",
      geliverLastError: null,
    });

    return { ok: true };
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e !== null && "message" in e
        ? String((e as { message?: string }).message)
        : String(e);
    const detail =
      typeof e === "object" && e !== null && "additionalMessage" in e
        ? String((e as { additionalMessage?: string }).additionalMessage ?? "")
        : "";
    const full = [msg, detail].filter(Boolean).join(" — ").slice(0, 2000);

    logger.error({ err: e, orderId: opts.orderId }, "[geliver] accept offer failed");

    await writeOrderGeliverFields(opts.orderId, {
      geliverLastError: full,
      geliverStatus: "error",
    });

    return { ok: false, error: full };
  }
}

/** Siparişe bağlı olmadan manuel gönderi: yalnızca teklifler (etiket Geliver panelinde). */
export async function createGeliverManualShipment(opts: {
  vendorId: number;
  recipient: {
    name: string;
    email?: string;
    phone: string;
    address1: string;
    city: string;
    /** İlçe (TR adres registry) */
    district: string;
    /** Mahalle — Geliver TR doğrulaması için districtName alanına gider */
    neighborhood?: string;
    zip?: string;
  };
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightKg: string;
  reference?: string;
  /** Varsayılan gönderici yerine tek seferlik Geliver sender address id */
  senderAddressId?: string | null;
}): Promise<
  | { ok: true; shipmentId: string; trackingNumber: string | null; labelUrl: string | null; shipment?: unknown }
  | { ok: false; error: string }
> {
  await ensureGeliverIntegrationColumns();

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, opts.vendorId)).limit(1);
  if (!vendor) return { ok: false, error: "vendor_not_found" };

  const token = vendor.geliverApiToken?.trim();
  if (!token) return { ok: false, error: "geliver_token_missing" };

  const client = new GeliverClient({ token });
  const ref =
    (opts.reference?.trim() || `MAN-${Date.now().toString().slice(-10)}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) ||
    `MAN${Date.now()}`;

  try {
    const senderAddressID = await resolveManualShipmentSenderId(client, vendor, opts.senderAddressId);
    const city = opts.recipient.city.trim() || vendor.city?.trim() || "İstanbul";
    const ilce = (opts.recipient.district?.trim() || "Merkez").slice(0, 80);
    const mahalle = (opts.recipient.neighborhood?.trim() || "").slice(0, 80);
    /**
     * Geliver recipientAddress: districtName = ilçe (API doğrulaması buna göre).
     * Mahalle + sokak satırı address1 içinde olmalı (docs.geliver.io recipientAddress örnekleri).
     */
    const districtName = ilce;

    let address1 = opts.recipient.address1.trim();
    if (mahalle) {
      const mLow = mahalle.toLocaleLowerCase("tr-TR");
      const aLow = address1.toLocaleLowerCase("tr-TR");
      if (aLow && !aLow.includes(mLow)) {
        address1 = `${mahalle}, ${address1}`.trim();
      } else if (!aLow) {
        address1 = mahalle;
      }
    }
    address1 = address1.replace(/^,\s*/u, "").slice(0, 200);

    const plateHint = trCityNameToPlateCode(city);
    const { districtId: recipientDistrictId, cityCode: recipientCityCodeResolved } = await resolveGeliverDistrictId(
      client,
      city,
      plateHint,
      districtName,
    );
    const zip =
      opts.recipient.zip?.replace(/\D/g, "").slice(0, 5) ||
      vendor.geliverSenderZip?.replace(/\D/g, "").slice(0, 5) ||
      "34000";
    const email =
      opts.recipient.email?.trim() ||
      vendor.email?.trim() ||
      vendor.ownerEmail?.trim() ||
      `gonderi-${ref}@manual.yekpare.local`;

    const created = await client.shipments.create({
      senderAddressID,
      recipientAddress: {
        name: opts.recipient.name.slice(0, 120),
        email: email.slice(0, 100),
        phone: normalizeTrPhone(opts.recipient.phone),
        address1,
        countryCode: "TR",
        cityName: city.slice(0, 80),
        cityCode: recipientCityCodeResolved,
        districtName,
        districtID: recipientDistrictId,
        zip,
      },
      length: opts.lengthCm,
      width: opts.widthCm,
      height: opts.heightCm,
      distanceUnit: "cm",
      weight: opts.weightKg,
      massUnit: "kg",
      // ASLA test:true GÖNDERME — yukarıdaki autoflow'la aynı kural.
      test: false,
      order: {
        orderNumber: ref,
        sourceCode: "YEKPARE",
        sourceIdentifier: siteSourceIdentifier(),
        totalAmount: "0.01",
        totalAmountCurrency: "TRY",
      },
    });

    const shipmentId = created.id;
    if (!shipmentId) throw new Error("geliver_shipment_no_id");
    try {
      const c = created as unknown as Record<string, unknown>;
      logger.info(
        {
          shipmentId,
          test: c.test ?? c.isTest ?? null,
          statusCode: c.statusCode ?? null,
          owner: c.owner ?? null,
          hasOffers: c.offers != null,
        },
        "[geliver] shipment.create response (manual)",
      );
    } catch {
      /* logging best-effort */
    }

    await client.shipments.waitForOffers(shipmentId, { intervalMs: 1500, timeoutMs: 120_000 });

    const latest = await client.shipments.get(shipmentId);
    return {
      ok: true,
      shipmentId,
      trackingNumber: null,
      labelUrl: null,
      shipment: geliverJsonSafe(latest),
    };
  } catch (e: unknown) {
    const full = geliverExceptionToUserMessage(e);
    logger.error({ err: e, vendorId: opts.vendorId }, "[geliver] manual shipment failed");
    return { ok: false, error: full };
  }
}

/** Geliver gönderi durumu — sadece “teklif aşaması” değilse satın alınmış sayılır. */
function geliverStatusMeansPostPurchase(statusRaw: unknown): boolean {
  const u = statusRaw != null ? String(statusRaw).trim() : "";
  if (!u) return false;
  if (/^GOT_OFFERS?$/i.test(u)) return false;
  if (/GOT_OFFER|OFFER_RECEIVED|QUOTE|TEKLIF|TEKLİF|WAITING_OFFER|WAITING_FOR_OFFER/i.test(u)) return false;
  return /TRACKING|SHIPPED|YOLDA|DELIVERED|CODE_RECEIVED|LABEL|PACKAGE|TRANSIT|PICKED|SENT|ON_THE_WAY|IN_TRANSIT|KARGO/i.test(u);
}

function geliverCollectStatuses(rec: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    const t = v != null ? String(v).trim() : "";
    if (t) out.push(t);
  };
  push(rec.status);
  push(rec.statusCode);
  push(rec.shipmentStatus);
  push(rec.phase);
  push(rec.state);
  push(rec.packageStatus);
  const ord = rec.order;
  if (ord && typeof ord === "object") {
    const o = ord as Record<string, unknown>;
    push(o.status);
    push(o.shipmentStatus);
    push(o.orderStatus);
  }
  return out;
}

/** SDK Offer.isAccepted — POST /transactions sonrası bazen yalnızca bu gelir. */
function geliverAnyOfferMarkedAccepted(root: Record<string, unknown>): boolean {
  const off = root.offers;
  if (!off || typeof off !== "object" || Array.isArray(off)) return false;
  const ov = off as Record<string, unknown>;
  const peek = (x: unknown): boolean =>
    Boolean(x && typeof x === "object" && (x as Record<string, unknown>).isAccepted === true);
  if (peek(ov.cheapest ?? ov.Cheapest) || peek(ov.fastest ?? ov.Fastest)) return true;
  const list = ov.list ?? ov.List;
  if (Array.isArray(list)) return list.some(peek);
  return false;
}

function geliverMergeExtraParcels(root: Record<string, unknown>): { trackingNumber: string | null; labelUrl: string | null } {
  const parcels = root.extraParcels;
  if (!Array.isArray(parcels)) return { trackingNumber: null, labelUrl: null };
  let trackingNumber: string | null = null;
  let labelUrl: string | null = null;
  for (const p of parcels) {
    if (!p || typeof p !== "object") continue;
    const pr = p as Record<string, unknown>;
    const tn = pr.trackingNumber ?? pr.barcode;
    if (!trackingNumber && tn != null) {
      const t = String(tn).trim();
      if (t.length >= 6 || /^GLV[A-Z0-9]{6,}$/i.test(t)) trackingNumber = t;
    }
    const lab = pr.labelURL ?? pr.labelUrl ?? pr.responsiveLabelURL;
    if (!labelUrl && lab != null) {
      const u = String(lab).trim();
      if (u) labelUrl = u;
    }
  }
  return { trackingNumber, labelUrl };
}

function geliverPickTrackingCandidate(raw: unknown): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (/^GLV[A-Z0-9]{6,}$/i.test(t)) return t;
  if (t.length >= 6) return t;
  return null;
}

function geliverFindGlvTokenDeep(value: unknown, depth = 0, seen = new WeakSet<object>()): string | null {
  if (depth > 14 || value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return /^GLV[A-Z0-9]{6,}$/i.test(t) ? t : null;
  }
  if (typeof value !== "object") return null;
  if (seen.has(value as object)) return null;
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const x of value) {
      const f = geliverFindGlvTokenDeep(x, depth + 1, seen);
      if (f) return f;
    }
    return null;
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    const f = geliverFindGlvTokenDeep(v, depth + 1, seen);
    if (f) return f;
  }
  return null;
}

/** Etiket / takip varsa veya teklif kabul edilmiş sayılıyorsa tekrar POST /transactions yapılmaz (E1145). */
function geliverShipmentPurchaseState(shipment: unknown): {
  purchased: boolean;
  trackingNumber: string | null;
  labelUrl: string | null;
  transactionId: string | null;
} {
  const empty = {
    purchased: false,
    trackingNumber: null,
    labelUrl: null,
    transactionId: null,
  };
  if (!shipment || typeof shipment !== "object") return empty;
  const s = shipment as Record<string, unknown>;
  const root =
    s.data && typeof s.data === "object" && !Array.isArray(s.data) ? (s.data as Record<string, unknown>) : s;

  const pickLabelDeep = (rec: Record<string, unknown>): string | null => {
    const acc = rec.acceptedOffer;
    let fromAcc: unknown;
    if (acc && typeof acc === "object") {
      const a = acc as Record<string, unknown>;
      fromAcc = a.labelURL ?? a.labelUrl ?? a.responsiveLabelURL ?? a.pdfURL ?? a.pdfUrl;
    }
    const direct =
      rec.labelURL ??
      rec.labelUrl ??
      rec.responsiveLabelURL ??
      rec.pdfURL ??
      rec.pdfUrl ??
      rec.labelPdfURL ??
      rec.labelPdfUrl;
    let best = direct ?? fromAcc;
    const tryObj = (o: Record<string, unknown>) => {
      for (const [k, val] of Object.entries(o)) {
        if (typeof val !== "string") continue;
        const t = val.trim();
        if (!t.startsWith("http")) continue;
        if (/label/i.test(k) && /url|pdf/i.test(k)) best = t;
      }
    };
    tryObj(rec);
    for (const nestKey of ["package", "parcel", "label", "shipment", "documents"]) {
      const n = rec[nestKey];
      if (n && typeof n === "object" && !Array.isArray(n)) {
        const nr = n as Record<string, unknown>;
        const nested =
          nr.labelURL ?? nr.labelUrl ?? nr.responsiveLabelURL ?? nr.pdfURL ?? nr.pdfUrl ?? nr.url;
        if (nested != null && String(nested).trim()) best = nested;
        tryObj(nr);
      }
      if (nestKey === "documents" && Array.isArray(n)) {
        for (const doc of n) {
          if (!doc || typeof doc !== "object") continue;
          const d = doc as Record<string, unknown>;
          const u = d.url ?? d.URL ?? d.pdfURL ?? d.pdfUrl;
          if (typeof u === "string" && u.trim().startsWith("http")) {
            best = u.trim();
            break;
          }
        }
      }
    }
    const t = best != null ? String(best).trim() : "";
    return t || null;
  };

  const trackingKeys = [
    "trackingNumber",
    "trackingCode",
    "trackingNo",
    "barcode",
    "barCode",
    "shipmentBarcode",
    "carrierTrackingNumber",
    "organizationShipmentCode",
    "shipmentCode",
    "orderCode",
  ] as const;

  let trackingNumber: string | null = null;
  for (const k of trackingKeys) {
    const cand = geliverPickTrackingCandidate(root[k]);
    if (cand) {
      trackingNumber = cand;
      break;
    }
  }
  const ord0 = root.order;
  if (!trackingNumber && ord0 && typeof ord0 === "object") {
    const o = ord0 as Record<string, unknown>;
    for (const k of trackingKeys) {
      const cand = geliverPickTrackingCandidate(o[k]);
      if (cand) {
        trackingNumber = cand;
        break;
      }
    }
  }

  let labelUrl = pickLabelDeep(root);
  const parcelHints = geliverMergeExtraParcels(root);
  if (!trackingNumber && parcelHints.trackingNumber) trackingNumber = parcelHints.trackingNumber;
  if (!labelUrl && parcelHints.labelUrl) labelUrl = parcelHints.labelUrl;

  if (!trackingNumber) {
    const deepGlv = geliverFindGlvTokenDeep(shipment);
    if (deepGlv) trackingNumber = deepGlv;
  }
  let accIdNested = "";
  const acc0 = root.acceptedOffer;
  if (acc0 && typeof acc0 === "object") {
    const aid = (acc0 as Record<string, unknown>).id;
    if (aid != null) accIdNested = String(aid).trim();
  }
  const accIdRaw = root.acceptedOfferID ?? root.acceptedOfferId ?? accIdNested;
  const accId = accIdRaw != null ? String(accIdRaw).trim() : "";
  const pkgAt = root.packageAcceptedAt;
  const hasPkgAt = pkgAt != null && String(pkgAt).trim() !== "";

  const statuses = geliverCollectStatuses(root);
  const statusPurchased = statuses.some((st) => geliverStatusMeansPostPurchase(st));
  const offerAcceptedFlag = geliverAnyOfferMarkedAccepted(root);

  const purchased = Boolean(
    labelUrl || trackingNumber || accId || hasPkgAt || statusPurchased || offerAcceptedFlag,
  );

  const txRaw =
    root.lastTransactionId ??
    root.transactionId ??
    (root.transaction && typeof root.transaction === "object"
      ? (root.transaction as Record<string, unknown>).id
      : undefined);
  const transactionId = txRaw != null && String(txRaw).trim() ? String(txRaw) : null;
  return { purchased, trackingNumber, labelUrl, transactionId };
}

/**
 * Geliver bazı kargolarda label/tracking'i `acceptOffer` yanıtında değil, dakikalar sonra
 * (sağlayıcı barkod üretince) döner. Bu yüzden "teklif kabul edilmiş ama label yok" durumunu
 * **başarı (pending)** olarak değerlendirip kullanıcıya net mesaj veriyoruz.
 *
 * `purchased=true` ise zaten label hazır (üst seviye akış erkenden döner).
 * Bu fonksiyon: label/tracking olmasa bile bu shipment için kabul edilmiş bir teklif var mı?
 */
function geliverShipmentOfferAccepted(shipment: unknown): { accepted: boolean; statusCode: string | null } {
  if (!shipment || typeof shipment !== "object") return { accepted: false, statusCode: null };
  const s = shipment as Record<string, unknown>;
  const root =
    s.data && typeof s.data === "object" && !Array.isArray(s.data) ? (s.data as Record<string, unknown>) : s;
  const sc = root.statusCode != null ? String(root.statusCode).toUpperCase() : null;
  const st = root.status != null ? String(root.status).toUpperCase() : null;
  const acceptedStatusRe = /OFFER_ACCEPTED|TRACKING_CODE_CREATED|LABEL_PRINTED|SHIPPED|DELIVERED|RETURN/;
  if ((sc && acceptedStatusRe.test(sc)) || (st && acceptedStatusRe.test(st))) {
    return { accepted: true, statusCode: sc ?? st };
  }
  if (root.acceptedOfferID != null && String(root.acceptedOfferID).trim() !== "")
    return { accepted: true, statusCode: sc };
  if (root.acceptedOfferId != null && String(root.acceptedOfferId).trim() !== "")
    return { accepted: true, statusCode: sc };
  if (root.packageAcceptedAt != null && String(root.packageAcceptedAt).trim() !== "")
    return { accepted: true, statusCode: sc };
  const off = root.offers;
  if (off && typeof off === "object" && !Array.isArray(off)) {
    const ov = off as Record<string, unknown>;
    const flagged = (o: unknown): boolean =>
      !!(o && typeof o === "object" && (o as Record<string, unknown>).isAccepted === true);
    if (flagged(ov.cheapest) || flagged(ov.Cheapest) || flagged(ov.fastest) || flagged(ov.Fastest)) {
      return { accepted: true, statusCode: sc };
    }
    const list = ov.list ?? ov.List;
    if (Array.isArray(list) && list.some(flagged)) return { accepted: true, statusCode: sc };
  } else if (Array.isArray(root.offers)) {
    if (root.offers.some((o) => !!(o && typeof o === "object" && (o as Record<string, unknown>).isAccepted === true))) {
      return { accepted: true, statusCode: sc };
    }
  }
  return { accepted: false, statusCode: sc };
}

const GELIVER_MANUAL_PURCHASE_SHIPMENTS_URL = "https://app.geliver.io/shipments";
const GELIVER_APP_HOME_URL = "https://app.geliver.io/";

function geliverManualPurchaseHintTr(): string {
  return `Gönderiler listesinde siparişinizi bulun, satırda «Etiket Al» ile tamamlayın: ${GELIVER_MANUAL_PURCHASE_SHIPMENTS_URL}`;
}

function geliverManualPurchaseOnlyMessage(): string {
  return `Yekpare üzerinden API ile etiket satın alma kapatıldı (Geliver tarafında çoklu gönderi/500–502 sorunları nedeniyle). Teklifler burada; etiketi ${GELIVER_APP_HOME_URL} adresinde oturum açıp Gönderiler’den «Etiket Al» ile tamamlayın.`;
}

/** Gönderi snapshot'ındaki tüm teklif kimlikleri (accept öncesi doğrulama). */
function geliverShipmentOfferIds(shipment: unknown): string[] {
  const seen = new Set<string>();
  const add = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    const rec = o as Record<string, unknown>;
    const id = String(rec.id ?? rec.offerID ?? rec.offerId ?? "").trim();
    if (id) seen.add(id);
  };
  if (!shipment || typeof shipment !== "object") return [];
  const s = shipment as Record<string, unknown>;
  const root =
    s.data && typeof s.data === "object" && !Array.isArray(s.data) ? (s.data as Record<string, unknown>) : s;
  if (Array.isArray(root.offers)) {
    for (const x of root.offers) add(x);
    return [...seen];
  }
  const off =
    (root.offers && typeof root.offers === "object" && !Array.isArray(root.offers) ? root.offers : null) ||
    (root.Offers && typeof root.Offers === "object" && !Array.isArray(root.Offers) ? root.Offers : null);
  if (!off || typeof off !== "object") return [...seen];
  const ov = off as Record<string, unknown>;
  add(ov.cheapest ?? ov.Cheapest);
  add(ov.fastest ?? ov.Fastest);
  const list = ov.list ?? ov.List;
  if (Array.isArray(list)) for (const x of list) add(x);
  return [...seen];
}

/**
 * POST /transactions — teklifi kabul (etiket).
 * Önce `offerID` + `shipmentID` (Geliver bazı sürümlerde zorunlu); hata olursa SDK ile aynı yalnız `offerID` denenir.
 */
/**
 * Geliver SDK ile birebir aynı: POST /transactions { offerID }
 * Ek alanlar (örn. shipmentID) Geliver tarafında "yeni bir teklif kaydı" gibi
 * yorumlanıp etiket satın alma yerine boşa düşmesine yol açabiliyor.
 */
async function postGeliverTransactionAccept(
  client: GeliverClient,
  offerId: string,
  _shipmentId?: string,
): Promise<Transaction> {
  void _shipmentId;
  const oid = offerId.trim();
  const tx = await client.transactions.acceptOffer(oid);
  // DIAGNOSTIC: Geliver acceptOffer yanıtı bazen sahte success oluyor (isPayed:false, label/tracking
  // yok). Üretimde gerçekten ne döndüğünü görmek için PII'siz özet logluyoruz.
  try {
    const t = tx as unknown as Record<string, unknown>;
    const sh = (t?.shipment ?? null) as Record<string, unknown> | null;
    logger.info(
      {
        offerId: oid,
        txId: t?.id ?? null,
        isPayed: t?.isPayed ?? null,
        statusCode: sh?.statusCode ?? null,
        status: sh?.status ?? null,
        hasBarcode: !!(sh && sh.barcode),
        hasLabel: !!(sh && (sh.labelURL ?? sh.labelUrl ?? sh.responsiveLabelURL)),
        hasTracking: !!(sh && (sh.trackingNumber ?? sh.trackingURL ?? sh.trackingUrl)),
        isTestShipment: sh?.test ?? sh?.isTest ?? null,
        amountPaid: t?.totalAmount ?? t?.amount ?? null,
      },
      "[geliver] acceptOffer raw response",
    );
  } catch {
    /* logging best-effort */
  }
  return tx;
}

/** Transaction sonucunun gerçekten satın alındığını doğrula. */
function geliverTransactionPurchased(tx: Transaction | null | undefined): {
  purchased: boolean;
  trackingNumber: string | null;
  labelUrl: string | null;
  transactionId: string | null;
} {
  const result = {
    purchased: false,
    trackingNumber: null as string | null,
    labelUrl: null as string | null,
    transactionId: null as string | null,
  };
  if (!tx) return result;
  result.transactionId = tx.id != null ? String(tx.id as string | number | bigint) : null;
  const ship = tx.shipment as Record<string, unknown> | undefined;
  if (ship) {
    const labelRaw = ship.labelURL ?? ship.labelUrl ?? ship.responsiveLabelURL;
    if (labelRaw != null && String(labelRaw).trim()) result.labelUrl = String(labelRaw).trim();
    const trk = ship.trackingNumber ?? ship.barcode;
    if (trk != null && String(trk).trim()) result.trackingNumber = String(trk).trim();
  }
  const isPayed = (tx as { isPayed?: boolean }).isPayed === true;
  result.purchased = Boolean(result.labelUrl || result.trackingNumber || isPayed);
  return result;
}

async function vendorGeliverClient(
  vendorId: number,
): Promise<{ client: GeliverClient; vendor: typeof vendorsTable.$inferSelect } | null> {
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId)).limit(1);
  if (!vendor) return null;
  const token = vendor.geliverApiToken?.trim();
  if (!token) return null;
  // Express/proxy katmanlarının erken timeout'una takılmamak için Geliver istek süresini sınırla.
  // maxRetries: 0  → 5xx için SDK retry YAPMASIN. Çünkü Geliver acceptOffer'da 500 dönüp internal'de
  // teklifi "lock"layabiliyor; retry'da E1145 "zaten kabul" yanıtı geliyor ama gerçekte hiçbir teklif
  // kabul edilmemiş kalıyor. Tek deneme + bizim deterministik fallback'lerimiz daha güvenli.
  return { client: new GeliverClient({ token, timeoutMs: 18_000, maxRetries: 0 }), vendor };
}

/** Geliver docs: Şehirleri listeleme — panel/tr adres eşlemesi için. */
export async function geliverApiListCitiesForVendor(vendorId: number): Promise<
  | { ok: true; data: Array<{ name?: string; cityCode?: string; areaCode?: string }> }
  | { ok: false; error: string }
> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const data = await listGeliverCitiesTrCached(g.client);
    return { ok: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e, vendorId }, "geliver_list_cities_failed");
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

/** Geliver docs: İlçeleri listeleme */
export async function geliverApiListDistrictsForVendor(
  vendorId: number,
  cityCode: string,
): Promise<
  | { ok: true; data: Array<{ name?: string; districtID?: string | number }> }
  | { ok: false; error: string }
> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const data = await getGeliverDistrictRows(g.client, cityCode);
    return { ok: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ err: e, vendorId, cityCode }, "geliver_list_districts_failed");
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiListShipmentsForVendor(
  vendorId: number,
  query: { page?: number; limit?: number },
): Promise<{ ok: true; envelope: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  const envelope = await g.client.shipments.list({
    page: query.page ?? 1,
    limit: Math.min(50, query.limit ?? 20),
  });
  return { ok: true, envelope: geliverJsonSafe(envelope) };
}

export async function geliverApiGetShipmentForVendor(
  vendorId: number,
  shipmentId: string,
): Promise<{ ok: true; shipment: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  const shipment = await g.client.shipments.get(shipmentId);
  return { ok: true, shipment: geliverJsonSafe(shipment) };
}

export async function geliverApiUpdateShipmentPackageForVendor(
  vendorId: number,
  shipmentId: string,
  body: { lengthCm: string; widthCm: string; heightCm: string; weightKg: string },
): Promise<{ ok: true; shipment: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    await g.client.shipments.updatePackage(shipmentId, {
      length: body.lengthCm,
      width: body.widthCm,
      height: body.heightCm,
      weight: body.weightKg,
      distanceUnit: "cm",
      massUnit: "kg",
    });
    await g.client.shipments.waitForOffers(shipmentId, { intervalMs: 1500, timeoutMs: 120_000 });
    const shipment = await g.client.shipments.get(shipmentId);
    return { ok: true, shipment: geliverJsonSafe(shipment) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

/**
 * PII'siz Geliver yanıt özeti — UI'a `_debug` olarak iletilir, kullanıcı satın alma sorunlarını
 * fly.io / render log'una bakmadan bize iletebilsin.
 */
type GeliverAcceptDebug = {
  shipmentTest?: unknown;
  shipmentStatusCode?: unknown;
  shipmentStatus?: unknown;
  hasOffers?: boolean;
  offerCount?: number;
  acceptedOfferIDInShipment?: unknown;
  errorCode?: string | null;
  errorStatus?: number | null;
  errorMessage?: string | null;
  errorAdditionalMessage?: string | null;
  errorResponseBody?: unknown;
  step?: string;
};

export async function geliverApiAcceptOfferForVendor(
  vendorId: number,
  offerId: string,
  shipmentId?: string,
): Promise<
  | {
      ok: true;
      pending?: boolean; // true: Geliver kabul etti, label/tracking henüz hazır değil
      message?: string;
      statusCode?: string | null;
      transactionId: string | null;
      trackingNumber: string | null;
      labelUrl: string | null;
      debug?: GeliverAcceptDebug;
    }
  | {
      ok: false;
      error: string;
      debug?: GeliverAcceptDebug;
      manualPurchaseUrl?: string;
      manualPurchaseHint?: string;
    }
> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  const oid = offerId.trim();
  if (!oid) return { ok: false, error: "offer_id_empty" };
  const sid = shipmentId?.trim();
  const debug: GeliverAcceptDebug = {};
  try {
    if (sid) {
      try {
        const snap = await g.client.shipments.get(sid);
        const r = snap as Record<string, unknown> | null | undefined;
        const root: Record<string, unknown> | null =
          r && typeof r === "object"
            ? r.data && typeof r.data === "object" && !Array.isArray(r.data)
              ? (r.data as Record<string, unknown>)
              : r
            : null;
        if (root) {
          debug.shipmentTest = root.test ?? root.isTest ?? null;
          debug.shipmentStatusCode = root.statusCode ?? null;
          debug.shipmentStatus = root.status ?? null;
          debug.acceptedOfferIDInShipment = root.acceptedOfferID ?? root.acceptedOfferId ?? null;
          const offers = root.offers;
          debug.hasOffers = offers != null;
          debug.offerCount = Array.isArray(offers)
            ? offers.length
            : offers && typeof offers === "object"
              ? Object.keys(offers).length
              : 0;
        }
        const isTestShipment = root != null && (root.test === true || root.isTest === true);
        if (isTestShipment) {
          logger.warn({ sid, oid }, "[geliver] refusing acceptOffer on TEST shipment");
          debug.step = "test_shipment_refused";
          return {
            ok: false,
            error:
              "Bu gönderi Geliver tarafında TEST modunda oluşturulmuş; gerçek etiket satın alınamaz. Yeni bir gönderi oluşturup tekrar deneyin.",
            debug,
          };
        }
        const pre = geliverShipmentPurchaseState(snap);
        if (pre.purchased) {
          debug.step = "already_purchased_short_circuit";
          return {
            ok: true,
            transactionId: pre.transactionId,
            trackingNumber: pre.trackingNumber,
            labelUrl: pre.labelUrl,
            debug,
          };
        }
        // Geliver kabul etmiş ama label henüz yok? Pending başarı.
        const acc = geliverShipmentOfferAccepted(snap);
        if (acc.accepted) {
          debug.step = "already_accepted_pending";
          return {
            ok: true,
            pending: true,
            statusCode: acc.statusCode,
            message:
              "Bu gönderide teklif zaten kabul edilmiş; etiket/takip Geliver tarafında hazırlanıyor. Birkaç dakika içinde panelinizde label ve tracking görünecek.",
            transactionId: pre.transactionId,
            trackingNumber: null,
            labelUrl: null,
            debug,
          };
        }
        const allowed = geliverShipmentOfferIds(snap);
        if (allowed.length > 0 && !allowed.includes(oid)) {
          debug.step = "offer_not_in_allowed_list";
          return {
            ok: false,
            error:
              "Seçilen teklif bu gönderi için güncel listede yok. «API'den yenile» ile listeyi güncelleyin; etiketi Geliver panelinden tamamlayın.",
            debug,
          };
        }
      } catch (e) {
        logger.warn({ err: e, sid }, "[geliver] accept-offer: shipment verify skipped");
      }
    }

    // API ile acceptOffer kapalı: Geliver tarafında klon / 500–502 ile çoklu gönderi oluşuyordu.
    // Teklifler Yekpare’de; etiket yalnızca Geliver panelinde «Etiket Al» ile alınır.
    debug.step = "api_purchase_disabled";
    return {
      ok: false,
      error: geliverManualPurchaseOnlyMessage(),
      debug,
      manualPurchaseUrl: GELIVER_APP_HOME_URL,
      manualPurchaseHint: geliverManualPurchaseHintTr(),
    };
  } catch (e: unknown) {
    if (e && typeof e === "object") {
      const ge = e as {
        code?: string;
        status?: number;
        message?: string;
        additionalMessage?: string;
        responseBody?: unknown;
      };
      debug.errorCode = ge.code ?? null;
      debug.errorStatus = ge.status ?? null;
      debug.errorMessage = ge.message ?? null;
      debug.errorAdditionalMessage = ge.additionalMessage ?? null;
      const rb = ge.responseBody;
      if (typeof rb === "string") {
        debug.errorResponseBody = rb.slice(0, 1500);
      } else if (rb && typeof rb === "object") {
        try {
          const compact: Record<string, unknown> = {};
          let i = 0;
          for (const [k, v] of Object.entries(rb as Record<string, unknown>)) {
            if (++i > 30) break;
            if (v == null) compact[k] = v;
            else if (typeof v === "string") compact[k] = v.slice(0, 400);
            else if (typeof v === "number" || typeof v === "boolean") compact[k] = v;
            else compact[k] = JSON.stringify(v).slice(0, 400);
          }
          debug.errorResponseBody = compact;
        } catch {
          debug.errorResponseBody = "[unserializable]";
        }
      }
    }
    logger.warn({ err: e, sid, oid }, "[geliver] accept-offer outer catch");
    debug.step = debug.step ?? "accept_offer_outer_error";
    return {
      ok: false,
      error: `${geliverManualPurchaseOnlyMessage()} (${geliverExceptionToUserMessage(e)})`,
      debug,
      manualPurchaseUrl: GELIVER_APP_HOME_URL,
      manualPurchaseHint: geliverManualPurchaseHintTr(),
    };
  }
}

function normalizeAddressListResult(raw: unknown): {
  data: Array<Record<string, unknown>>;
  totalRows?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
} {
  if (Array.isArray(raw)) {
    return { data: raw as Array<Record<string, unknown>> };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) {
      return {
        data: o.data as Array<Record<string, unknown>>,
        totalRows: o.totalRows != null ? Number(o.totalRows) : undefined,
        page: o.page != null ? Number(o.page) : undefined,
        limit: o.limit != null ? Number(o.limit) : undefined,
        totalPages: o.totalPages != null ? Number(o.totalPages) : undefined,
      };
    }
  }
  return { data: [] };
}

export async function geliverApiListAddressesForVendor(
  vendorId: number,
  query: { isRecipientAddress?: boolean; page?: number; limit?: number },
): Promise<
  | {
      ok: true;
      data: Array<Record<string, unknown>>;
      totalRows?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }
  | { ok: false; error: string }
> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const raw = await g.client.addresses.list({
      isRecipientAddress: query.isRecipientAddress,
      page: query.page,
      limit: query.limit ?? 50,
    });
    const n = normalizeAddressListResult(raw);
    const safeData = n.data.map((row) => geliverJsonSafe(row) as Record<string, unknown>);
    return { ok: true, ...n, data: safeData };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiGetAddressForVendor(
  vendorId: number,
  addressId: string,
): Promise<{ ok: true; address: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const address = await g.client.addresses.get(addressId);
    return { ok: true, address: geliverJsonSafe(address) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiCreateSenderAddressForVendor(
  vendorId: number,
  body: {
    name: string;
    email: string;
    phone: string;
    address1: string;
    address2?: string;
    countryCode: string;
    cityName: string;
    cityCode: string;
    districtName: string;
    districtID: number;
    zip: string;
    shortName?: string;
  },
): Promise<{ ok: true; address: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const address = await g.client.addresses.createSender({
      name: body.name.slice(0, 120),
      email: body.email.slice(0, 100),
      phone: normalizeTrPhone(body.phone),
      address1: body.address1.slice(0, 200),
      address2: body.address2?.slice(0, 200),
      countryCode: body.countryCode || "TR",
      cityName: body.cityName.slice(0, 80),
      cityCode: plateNorm2(body.cityCode) || body.cityCode,
      districtName: body.districtName.slice(0, 80),
      districtID: body.districtID,
      zip: body.zip.replace(/\D/g, "").slice(0, 5) || "34000",
      shortName: body.shortName?.slice(0, 80),
    });
    return { ok: true, address: geliverJsonSafe(address) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiDeleteAddressForVendor(
  vendorId: number,
  addressId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    await g.client.addresses.delete(addressId);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

function isGeliverOrganizationNotFoundMessage(msg: string): boolean {
  return /E1120|E1084|record not found|hesap bulunamadı|not found/i.test(msg);
}

function extractOrganizationIdsFromUnknown(raw: unknown): string[] {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const out: string[] = [];
  const pushId = (s: string) => {
    const t = s.trim();
    if (uuidRe.test(t)) out.push(t);
  };
  const walk = (v: unknown): void => {
    if (v == null) return;
    if (typeof v === "string") {
      pushId(v);
      return;
    }
    if (typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    const o = v as Record<string, unknown>;
    if (typeof o.id === "string") pushId(o.id);
    if (typeof o.organizationId === "string") pushId(o.organizationId);
    if (typeof o.organizationID === "string") pushId(o.organizationID);
    for (const k of ["data", "items", "rows", "organizations", "list", "result"]) {
      if (o[k] != null) walk(o[k]);
    }
  };
  walk(raw);
  return [...new Set(out)];
}

const geliverUuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Liste satırında org yoksa tam gönderi cevabından organization UUID dene (getBalance ile doğrula). */
async function geliverOrganizationIdFromShipmentDetail(
  client: GeliverClient,
  shipmentId: string,
): Promise<string | null> {
  const sid = shipmentId.trim();
  if (!sid) return null;
  try {
    const s = await client.shipments.get(sid);
    const rec = s as Record<string, unknown>;
    const root =
      rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)
        ? (rec.data as Record<string, unknown>)
        : rec;
    const cands: string[] = [];
    for (const id of extractOrganizationIdsFromUnknown(s)) cands.push(id);
    const ord = root.order;
    if (ord && typeof ord === "object") {
      const o = ord as Record<string, unknown>;
      for (const k of ["organizationID", "organizationId", "OrganizationID"]) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) cands.push(v.trim());
      }
      for (const id of extractOrganizationIdsFromUnknown(o)) cands.push(id);
    }
    for (const k of ["owner", "tenantId", "organizationID", "organizationId"]) {
      const v = root[k];
      if (typeof v === "string" && v.trim()) cands.push(v.trim());
    }
    for (const cand of [...new Set(cands)]) {
      if (!geliverUuidRe.test(cand)) continue;
      try {
        await client.organizations.getBalance(cand);
        return cand;
      } catch {
        continue;
      }
    }
  } catch (e) {
    logger.warn({ err: e, sid }, "[geliver] org id from shipment.get failed");
  }
  return null;
}

/** Kayıtlı org yanlışsa (E1120): token ile erişilen kuruluşları dene. Toplam ~10sn ile sınırlı. */
async function geliverDiscoverOrganizationIdForToken(
  client: GeliverClient,
  hintShipmentId?: string,
): Promise<string | null> {
  const startedAt = Date.now();
  const overallBudgetMs = 10_000;
  const budgetOver = (): boolean => Date.now() - startedAt > overallBudgetMs;

  const hint = hintShipmentId?.trim();
  if (hint) {
    try {
      const fromHint = await withGeliverTimeout(
        geliverOrganizationIdFromShipmentDetail(client, hint),
        4_000,
        "shipments.get(hint)",
      );
      if (fromHint) return fromHint;
    } catch (e) {
      logger.warn({ err: e, hint }, "[geliver] discovery via shipment hint failed");
    }
  }
  if (budgetOver()) return null;
  // GET /webhook → her webhook nesnesinin `organizationID` alanı var; bu en güvenilir yol.
  try {
    const wraw = await withGeliverTimeout(client.webhooks.list(), 3_000, "webhooks.list");
    for (const id of extractOrganizationIdsFromUnknown(wraw)) {
      if (budgetOver()) break;
      try {
        await withGeliverTimeout(client.organizations.getBalance(id), 2_500, "getBalance(webhook)");
        return id;
      } catch {
        continue;
      }
    }
  } catch (e) {
    logger.warn({ err: e }, "[geliver] discovery via webhooks.list failed");
  }
  if (budgetOver()) return null;
  for (const path of ["/organizations", "/organization"]) {
    if (budgetOver()) break;
    try {
      const raw = await withGeliverTimeout(client.http.request("GET", path), 3_000, `GET ${path}`);
      for (const id of extractOrganizationIdsFromUnknown(raw)) {
        if (budgetOver()) break;
        try {
          await withGeliverTimeout(client.organizations.getBalance(id), 2_500, "getBalance(probe)");
          return id;
        } catch {
          continue;
        }
      }
    } catch {
      /* yok */
    }
  }
  if (budgetOver()) return null;
  try {
    const listRaw = await withGeliverTimeout(
      client.shipments.list({ page: 1, limit: 25 }),
      3_000,
      "shipments.list",
    );
    const rows = Array.isArray((listRaw as { data?: unknown[] }).data)
      ? (listRaw as { data: unknown[] }).data
      : [];
    let detailTries = 0;
    const maxShipmentDetailForOrg = 3;
    for (const s of rows) {
      if (budgetOver()) break;
      if (!s || typeof s !== "object") continue;
      const row = s as Record<string, unknown>;
      const ord = (s as { order?: { organizationID?: string; organizationId?: string } }).order;
      const org = String(ord?.organizationID ?? ord?.organizationId ?? "").trim();
      if (org) {
        try {
          await withGeliverTimeout(client.organizations.getBalance(org), 2_500, "getBalance(row)");
          return org;
        } catch {
          /* devam — liste satırındaki org eski/yanlış olabilir */
        }
      }
      const shipId = String(row.id ?? row.ID ?? "").trim();
      if (shipId && detailTries < maxShipmentDetailForOrg) {
        detailTries += 1;
        try {
          const fromDetail = await withGeliverTimeout(
            geliverOrganizationIdFromShipmentDetail(client, shipId),
            3_000,
            "shipments.get(scan)",
          );
          if (fromDetail) return fromDetail;
        } catch {
          /* devam */
        }
      }
    }
  } catch {
    /* yok */
  }
  return null;
}

export async function geliverApiGetBalanceForVendor(
  vendorId: number,
  organizationId: string,
  opts?: { hintShipmentId?: string },
): Promise<{ ok: true; balance: unknown; resolvedOrganizationId?: string | null } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  const hintSid = opts?.hintShipmentId?.trim();
  let oid = normalizeGeliverOrganizationId(organizationId);
  let resolvedOrganizationId: string | null = null;
  if (!oid) {
    const discovered = await geliverDiscoverOrganizationIdForToken(g.client, hintSid);
    if (!discovered) {
      return {
        ok: false,
        error:
          "Geliver kuruluş kimliği (organization ID) gerekli. Genel Ayarlar → Geliver’da kaydedin veya yöneticinizden isteyin.",
      };
    }
    oid = discovered;
    resolvedOrganizationId = discovered;
    await db
      .execute(
        sql`UPDATE vendors SET geliver_organization_id = ${discovered}, updated_at = NOW() WHERE id = ${vendorId}`,
      )
      .catch((err) => logger.warn({ err, vendorId }, "[geliver] could not persist organization id (empty → discovered)"));
    logger.info({ vendorId, geliverOrganizationId: discovered }, "[geliver] filled organization id from discovery");
  }
  try {
    let balance: unknown;
    try {
      balance = await g.client.organizations.getBalance(oid);
    } catch (e) {
      const msg0 = geliverExceptionToUserMessage(e);
      if (!isGeliverOrganizationNotFoundMessage(msg0)) throw e;
      const found = await geliverDiscoverOrganizationIdForToken(g.client, hintSid);
      if (!found) throw e;
      balance = await g.client.organizations.getBalance(found);
      if (found !== oid) {
        resolvedOrganizationId = found;
        oid = found;
        await db
          .execute(
            sql`UPDATE vendors SET geliver_organization_id = ${found}, updated_at = NOW() WHERE id = ${vendorId}`,
          )
          .catch((err) => logger.warn({ err, vendorId }, "[geliver] could not persist organization id"));
        logger.info({ vendorId, geliverOrganizationId: found }, "[geliver] auto-corrected organization id (balance)");
      }
    }
    return resolvedOrganizationId != null
      ? { ok: true, balance: geliverJsonSafe(balance), resolvedOrganizationId }
      : { ok: true, balance: geliverJsonSafe(balance) };
  } catch (e: unknown) {
    let err = geliverExceptionToUserMessage(e);
    if (/E1084|E1120|record not found|hesap bulunamadı/i.test(err)) {
      err = `${err} — Kuruluş UUID’si Geliver panelindeki hesabınızla aynı mı kontrol edin (Ayarlar / Kuruluş).`;
    }
    return { ok: false, error: err };
  }
}

function normalizeWebhookList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: unknown[] }).data;
  }
  return [];
}

export async function geliverApiListWebhooksForVendor(
  vendorId: number,
): Promise<{ ok: true; data: unknown[] } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const raw = await g.client.webhooks.list();
    return { ok: true, data: geliverJsonSafe(normalizeWebhookList(raw)) as unknown[] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiCreateWebhookForVendor(
  vendorId: number,
  body: { url: string; type?: string },
): Promise<{ ok: true; raw: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const raw = await g.client.webhooks.create({
      url: body.url.trim(),
      type: body.type?.trim(),
    });
    return { ok: true, raw: geliverJsonSafe(raw) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiDeleteWebhookForVendor(
  vendorId: number,
  webhookId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    await g.client.webhooks.delete(webhookId);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiTestWebhookForVendor(
  vendorId: number,
  body: { url: string; type: string },
): Promise<{ ok: true; raw: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const raw = geliverJsonSafe(
      await g.client.webhooks.test({
        url: body.url.trim(),
        type: body.type.trim(),
      }),
    );
    return { ok: true, raw };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

function normalizeParcelTemplateList(raw: unknown): unknown[] {
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: unknown[] }).data;
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

export async function geliverApiListParcelTemplatesForVendor(
  vendorId: number,
): Promise<{ ok: true; data: unknown[] } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const raw = await g.client.parcelTemplates.list();
    return { ok: true, data: normalizeParcelTemplateList(raw) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiCreateParcelTemplateForVendor(
  vendorId: number,
  body: Record<string, unknown>,
): Promise<{ ok: true; template: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const template = await g.client.parcelTemplates.create(body);
    return { ok: true, template };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiDeleteParcelTemplateForVendor(
  vendorId: number,
  templateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    await g.client.parcelTemplates.delete(templateId);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiListPricesForVendor(
  vendorId: number,
  params: {
    length: string;
    width: string;
    height: string;
    weight: string;
    distanceUnit?: string;
    massUnit?: string;
  },
): Promise<{ ok: true; raw: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const raw = await g.client.prices.listPrices({
      paramType: "parcel",
      length: params.length,
      width: params.width,
      height: params.height,
      weight: params.weight,
      distanceUnit: params.distanceUnit ?? "cm",
      massUnit: params.massUnit ?? "kg",
    });
    return { ok: true, raw: geliverJsonSafe(raw) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

function normalizeProviderAccountsEnvelope(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as unknown[];
  }
  return [];
}

export async function geliverApiListProviderAccountsForVendor(
  vendorId: number,
): Promise<{ ok: true; data: unknown[]; envelope: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const env = await g.client.providers.listAccounts();
    const data = normalizeProviderAccountsEnvelope(env);
    return { ok: true, data, envelope: env };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiCreateProviderAccountForVendor(
  vendorId: number,
  body: {
    username: string;
    password?: string;
    name: string;
    providerCode: string;
    version: number;
    isActive: boolean;
    isPublic: boolean;
    sharable: boolean;
    isDynamicPrice: boolean;
    parameters?: Record<string, unknown>;
  },
): Promise<{ ok: true; account: unknown } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    const account = await g.client.providers.createAccount({
      username: body.username,
      password: body.password,
      name: body.name,
      providerCode: body.providerCode,
      version: body.version,
      isActive: body.isActive,
      isPublic: body.isPublic,
      sharable: body.sharable,
      isDynamicPrice: body.isDynamicPrice,
      parameters: body.parameters,
    });
    return { ok: true, account };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export async function geliverApiDeleteProviderAccountForVendor(
  vendorId: number,
  providerAccountId: string,
  opts?: { isDeleteAccountConnection?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await vendorGeliverClient(vendorId);
  if (!g) return { ok: false, error: "geliver_token_missing" };
  try {
    await g.client.providers.deleteAccount(providerAccountId, opts);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 2000) };
  }
}

export function shouldAutoCreateGeliverShipment(params: {
  vendorType: string | null | undefined;
  geliverApiToken: string | null | undefined;
  geliverAutoShipOnOrder: boolean | null | undefined;
  orderType?: string | null | undefined;
}): boolean {
  const token = params.geliverApiToken?.trim();
  if (!token) return false;
  if (params.geliverAutoShipOnOrder !== true) return false;
  const vt = String(params.vendorType || "").toLowerCase();
  const ot = String(params.orderType || "").toLowerCase();
  const ecommerceOrder = vt === "ecommerce" || ot === "ecommerce";
  return ecommerceOrder;
}
