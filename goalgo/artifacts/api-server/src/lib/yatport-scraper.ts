/**
 * yatport.com scraper — resmi web API (api.yatport.com/web) üzerinden tekne/yat kiralama verisi.
 * Liste: tasitlar/tasitListesiSlug · Detay: tasitlar/tasitListesiDetay
 */

const BASE_URL = "https://yatport.com";
const API_BASE = "https://api.yatport.com/web/";
const CDN_BASE = "https://cdn.yatport.com";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
export const YATPORT_FETCH_TIMEOUT_MS = Math.max(
  8_000,
  Number(process.env.YATPORT_FETCH_TIMEOUT_MS) || 22_000,
);
const DEFAULT_DELAY_MS = 1200;
const LIST_PAGE_SIZE = 20;
const YATPORT_FETCH_RETRIES = 2;

export const YATPORT_RENTAL_TYPES = [
  { slug: "saatlik", label: "Saatlik" },
  { slug: "gunluk", label: "Günlük" },
  { slug: "haftalik", label: "Haftalık" },
  { slug: "aylik", label: "Aylık" },
  { slug: "gunubirlik", label: "Günübirlik" },
] as const;

export const YATPORT_BOAT_TYPES = [
  { slug: "tekne-kiralama", label: "Tekne Kiralama", listPrefix: "tekne-kiralama" },
  { slug: "motoryat-kiralama", label: "Motoryat", listPrefix: "motoryat-kiralama" },
  { slug: "gulet-kiralama", label: "Gulet", listPrefix: "gulet-kiralama" },
  { slug: "yelkenli-kiralama", label: "Yelkenli", listPrefix: "yelkenli-kiralama" },
  { slug: "catamaran-kiralama", label: "Catamaran", listPrefix: "catamaran-kiralama" },
  { slug: "davet-teknesi-kiralama", label: "Davet Teknesi", listPrefix: "davet-teknesi-kiralama" },
  { slug: "surat-teknesi-kiralama", label: "Sürat Teknesi", listPrefix: "surat-teknesi-kiralama" },
  { slug: "yat-kiralama", label: "Yat Kiralama", listPrefix: "yat-kiralama" },
] as const;

/** İstanbul kıyı ilçeleri — yatport sidebar filtreleri */
export const YATPORT_ISTANBUL_DISTRICTS = [
  { slug: "bebek", label: "Bebek", listSlug: "bebek" },
  { slug: "kandilli", label: "Kandilli", listSlug: "kandilli" },
  { slug: "kuleli", label: "Kuleli", listSlug: "kuleli" },
  { slug: "arnavutkoy", label: "Arnavutköy", listSlug: "arnavutkoy" },
  { slug: "karakoy", label: "Karaköy", listSlug: "karakoy" },
  { slug: "unkapani", label: "Unkapanı", listSlug: "unkapani" },
  { slug: "eminonu", label: "Eminönü", listSlug: "eminonu" },
  { slug: "anadolu-hisari", label: "Anadolu Hisarı", listSlug: "anadolu-hisari" },
  { slug: "kurucesme", label: "Kuruçeşme", listSlug: "kurucesme" },
  { slug: "ortakoy", label: "Ortaköy", listSlug: "ortakoy" },
] as const;

export type YatportScrapeMode = "listing" | "district" | "boatType";

export type YatportListingCard = {
  id: number;
  sourceId: string;
  sourceUrl: string;
  name: string;
  location: string;
  city: string | null;
  district: string | null;
  capacity: number | null;
  cabinCount: number | null;
  toiletCount: number | null;
  lengthM: number | null;
  boatType: string | null;
  boatTypeSlug: string | null;
  categoryLabel: string | null;
  priceDisplay: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  rentalTypePreferred: string | null;
  availabilityCalendar: boolean;
  thumbnailUrl: string | null;
  thumbnailUrls: string[];
  detailSlug: string | null;
  listSlug: string | null;
};

export type YatportScrapedBoat = {
  sourceId: string;
  sourceUrl: string;
  eskiId: number;
  name: string;
  ilanNo: string | null;
  description: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  ownerName: string | null;
  ownerCompany: string | null;
  ownerMemberYears: number | null;
  marka: string | null;
  model: string | null;
  yapimYili: number | null;
  sonBakimYili: number | null;
  kapasite: number | null;
  yemekliKapasite: number | null;
  konaklamaliKapasite: number | null;
  kabinSayisi: number | null;
  tuvaletSayisi: number | null;
  uzunluk: number | null;
  bayrak: string | null;
  motorGucu: string | null;
  murettebat: string | null;
  tekneTipi: string | null;
  tekneTipiBaslik: string | null;
  rotalar: string | null;
  dortMevsimUygun: boolean;
  fiyatlar: Record<string, string | null>;
  fiyatBilgileri: Array<{ label: string; value: string }>;
  imkanlar: string[];
  kullanimSartlari: string[];
  guvenlikEkipmanlari: string[];
  limanlar: Array<{ ilce: string; id: number }>;
  rezervasyon: {
    rentalTypes: string[];
    minHours: number | null;
    maxGuests: number | null;
    kaporaOrani: number | null;
    iptalSuresi: string | null;
    odemeYontemleri: string[];
    departurePoints: string[];
  };
  listingCard: YatportListingCard | null;
  photoUrls: string[];
  photoSources: Array<{ id: string; ext: string; url: string }>;
  seoDescription: string;
  storeType: string;
  homepageSuperCategory: string;
  tags: string[];
  raw: Record<string, unknown>;
};

export type YatportScrapeOptions = {
  mode?: YatportScrapeMode;
  listSlug?: string;
  districtSlug?: string;
  boatTypeSlug?: string;
  maxBoats?: number;
  maxListPages?: number;
  delayMs?: number;
  downloadImages?: boolean;
  onProgress?: (msg: string) => void;
  onBoatScraped?: (boat: YatportScrapedBoat) => void | Promise<void>;
};

type ApiEnvelope<T = unknown> = { S?: string; DATA?: T; HATA_ACIKLAMASI?: string };

let lastFetchAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimit(delayMs: number): Promise<void> {
  const wait = Math.max(0, lastFetchAt + delayMs - Date.now());
  if (wait > 0) await sleep(wait);
  lastFetchAt = Date.now();
}

async function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} (${Math.round(ms / 1000)} sn)`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildYatportApiHeaders(): Record<string, string> {
  return {
    "User-Agent": BROWSER_UA,
    cihaz_tipi: BROWSER_UA,
    utoken: "",
    cihaz_token: "",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: `${BASE_URL}/`,
    Origin: BASE_URL,
    "Content-Type": "text/plain",
  };
}

function encodeYatportQuery(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => {
      let encoded = encodeURIComponent(String(v));
      encoded = encoded
        .replace(/%C3%A7/gi, "ç")
        .replace(/%C3%87/gi, "Ç")
        .replace(/%C4%9F/gi, "ğ")
        .replace(/%C4%9E/gi, "Ğ")
        .replace(/%C4%B1/gi, "ı")
        .replace(/%C4%B0/gi, "İ")
        .replace(/%C3%B6/gi, "ö")
        .replace(/%C3%96/gi, "Ö")
        .replace(/%C5%9F/gi, "ş")
        .replace(/%C5%9E/gi, "Ş")
        .replace(/%C3%BC/gi, "ü")
        .replace(/%C3%9C/gi, "Ü");
      return `${k}=${encoded}`;
    })
    .join("&");
}

function parseYatportApiJson<T>(raw: unknown, path: string): ApiEnvelope<T> {
  const json = raw as ApiEnvelope<T> | ApiEnvelope<T>[];
  if (Array.isArray(json)) {
    const first = json[0] as ApiEnvelope<T> | undefined;
    if (first?.S === "H") throw new Error(first.HATA_ACIKLAMASI || "Yatport API hatası");
    return first ?? { S: "H", HATA_ACIKLAMASI: "Boş yanıt" };
  }
  if (json.S === "H") throw new Error(json.HATA_ACIKLAMASI || "Yatport API hatası");
  if (json.S !== "T" && json.S != null) {
    throw new Error(`Yatport API beklenmeyen yanıt (${path}): S=${String(json.S)}`);
  }
  return json;
}

function trSlug(text: string): string {
  const tr: Record<string, string> = {
    ğ: "g", Ğ: "G", ü: "u", Ü: "U", ş: "s", Ş: "S", ı: "i", İ: "I", ö: "o", Ö: "O", ç: "c", Ç: "C",
  };
  return String(text ?? "")
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (m) => tr[m] || m)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMoney(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number(String(raw).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseIntSafe(raw: unknown): number | null {
  const n = parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function stripHtml(html: unknown): string {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhotoExt(raw: unknown): string {
  const ext = String(raw ?? "jpg").trim().toLowerCase().replace(/^\./, "");
  if (!ext) return "jpg";
  return ext === "jpeg" ? "jpg" : ext;
}

export function buildYatportPhotoUrl(fotograf: string, ext?: string): string {
  const id = String(fotograf ?? "").trim();
  if (!id) return "";
  const normalizedExt = normalizePhotoExt(ext);
  return `${CDN_BASE}/img/${id}.${normalizedExt}`;
}

export function buildYatportPhotoCandidates(fotograf: string, ext?: string): string[] {
  const base = buildYatportPhotoUrl(fotograf, ext);
  if (!base) return [];
  const extNorm = normalizePhotoExt(ext);
  const out = new Set<string>([
    base,
    `${CDN_BASE}/img/${fotograf}.${extNorm}?w=1200&q=85&fmt=webp`,
    `${CDN_BASE}/img/${fotograf}.${extNorm}?w=800&q=85&fmt=jpeg`,
  ]);
  if (extNorm !== "jpg") out.add(`${CDN_BASE}/img/${fotograf}.jpg`);
  return [...out];
}

export function buildYatportSourceId(eskiId: number | string): string {
  return `yatport:${eskiId}`;
}

export function buildYatportDetailUrl(detailSlug: string | null | undefined, eskiId: number): string {
  if (detailSlug?.trim()) return `${BASE_URL}/${detailSlug.replace(/^\/+/, "")}`;
  return `${BASE_URL}/tekne-kiralama/${eskiId}`;
}

export function buildYatportDedupeKey(boat: Pick<YatportScrapedBoat, "sourceId" | "name" | "phone" | "ilanNo">): string {
  return [boat.sourceId, trSlug(boat.name), String(boat.phone ?? "").replace(/\D/g, ""), boat.ilanNo ?? ""]
    .filter(Boolean)
    .join("|");
}

async function yatportApiGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  delayMs = DEFAULT_DELAY_MS,
): Promise<ApiEnvelope<T>> {
  await rateLimit(delayMs);
  const qs = encodeYatportQuery(params);
  const url = `${API_BASE}${path.replace(/^\/+/, "")}${qs ? `?${qs}&d=${Math.random()}` : `?d=${Math.random()}`}`;
  const headers = buildYatportApiHeaders();
  let lastErr: unknown;

  for (let attempt = 1; attempt <= YATPORT_FETCH_RETRIES; attempt++) {
    try {
      const envelope = await withDeadline(
        (async () => {
          const controller = new AbortController();
          const abortTimer = setTimeout(() => controller.abort(), YATPORT_FETCH_TIMEOUT_MS);
          try {
            const res = await fetch(url, {
              headers,
              redirect: "follow",
              signal: controller.signal,
            });
            const bodyText = await res.text();
            if (!res.ok) {
              throw new Error(
                `Yatport HTTP ${res.status} (${path}): ${bodyText.replace(/\s+/g, " ").slice(0, 160)}`,
              );
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(bodyText);
            } catch {
              throw new Error(
                `Yatport JSON parse hatası (${path}): ${bodyText.replace(/\s+/g, " ").slice(0, 160)}`,
              );
            }
            return parseYatportApiJson<T>(parsed, path);
          } finally {
            clearTimeout(abortTimer);
          }
        })(),
        YATPORT_FETCH_TIMEOUT_MS + 2_000,
        `Yatport API ${path} zaman aşımı`,
      );
      return envelope;
    } catch (err) {
      lastErr = err;
      if (attempt < YATPORT_FETCH_RETRIES) await sleep(900);
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`${msg} — ${url.slice(0, 120)}`);
}

function mapListingCard(row: Record<string, unknown>): YatportListingCard {
  const id = parseIntSafe(row.id) ?? 0;
  const photos = Array.isArray(row.YAT_FOTOGRAFLAR) ? row.YAT_FOTOGRAFLAR : [];
  const thumbSources = photos
    .map((p) => {
      const rec = p as Record<string, unknown>;
      const fotograf = String(rec.fotograf ?? "");
      const ext = normalizePhotoExt(rec.fotograf_uzanti);
      return fotograf ? buildYatportPhotoUrl(fotograf, ext) : "";
    })
    .filter(Boolean);
  const detailSlug = String(row.detail_slug ?? "").trim() || null;
  const city = String(row.il ?? "").trim() || null;
  const district = String(row.ilce ?? "").trim() || null;
  return {
    id,
    sourceId: buildYatportSourceId(id),
    sourceUrl: buildYatportDetailUrl(detailSlug, id),
    name: String(row.tasit_adi ?? "").trim(),
    location: [district, city].filter(Boolean).join(" "),
    city,
    district,
    capacity: parseIntSafe(row.tam_kapasite),
    cabinCount: parseIntSafe(row.kabin_sayisi),
    toiletCount: parseIntSafe(row.tuvalet_sayisi),
    lengthM: parseIntSafe(row.tasit_uzunlugu),
    boatType: String(row.kategori_adi ?? row.tasit_tipi_slug ?? "").trim() || null,
    boatTypeSlug: String(row.tasit_tipi_slug ?? row.kategori_slug ?? "").trim() || null,
    categoryLabel: String(row.kategori_adi ?? "").trim() || null,
    priceDisplay: String(row.FIYAT ?? "").trim() || null,
    priceAmount: parseMoney(row.FIYATWHERE ?? row.FIYAT),
    priceUnit: String(row.kiralama_tipi ?? "").trim() || null,
    rentalTypePreferred: String(row.tercih_edilen_kiralama_sekli ?? "").trim() || null,
    availabilityCalendar: String(row.takvim_sorgula ?? "") === "1",
    thumbnailUrl: thumbSources[0] ?? null,
    thumbnailUrls: thumbSources,
    detailSlug,
    listSlug: String(row.list_slug ?? "").trim() || null,
  };
}

function mapDetailRow(row: Record<string, unknown>, listingCard?: YatportListingCard | null): YatportScrapedBoat {
  const eskiId = parseIntSafe(row.id) ?? parseIntSafe(row.tasit_id) ?? 0;
  const detailSlug = String(row.tasit_tipi_url ? `${row.tasit_tipi_url}/${row.il_url}/${eskiId}` : listingCard?.detailSlug ?? "").trim();
  const sourceUrl = buildYatportDetailUrl(
    String(row.detail_slug ?? listingCard?.detailSlug ?? `${row.tasit_tipi_url}/${row.il_url}/${eskiId}`).trim() || null,
    eskiId,
  );
  const imkanlar = (Array.isArray(row.IMKAN_TANIMLARI) ? row.IMKAN_TANIMLARI : [])
    .map((x) => String((x as Record<string, unknown>).imkan_adi ?? "").trim())
    .filter(Boolean);
  const guvenlik = (Array.isArray(row.GUVENLIK_EKIPMANLARI) ? row.GUVENLIK_EKIPMANLARI : [])
    .map((x) => String((x as Record<string, unknown>).ad ?? "").trim())
    .filter(Boolean);
  const sartlar = (Array.isArray(row.KULLANIM_SARTLARI) ? row.KULLANIM_SARTLARI : [])
    .map((x) => String((x as Record<string, unknown>).kullanim_sarti ?? "").trim())
    .filter(Boolean);
  const limanlar = (Array.isArray(row.LIMANLAR) ? row.LIMANLAR : [])
    .map((x) => {
      const rec = x as Record<string, unknown>;
      return { ilce: String(rec.ilce ?? "").trim(), id: parseIntSafe(rec.id) ?? 0 };
    })
    .filter((x) => x.ilce);
  const photoRows = Array.isArray(row.FOTOGRAFLAR) ? row.FOTOGRAFLAR : listingCard?.thumbnailUrls?.length ? [] : [];
  const photoSources = (photoRows.length ? photoRows : []).map((p) => {
    const rec = p as Record<string, unknown>;
    const id = String(rec.fotograf ?? "");
    const ext = normalizePhotoExt(rec.fotograf_uzanti);
    return { id, ext, url: buildYatportPhotoUrl(id, ext) };
  }).filter((p) => p.id);
  if (!photoSources.length && listingCard?.thumbnailUrls?.length) {
    for (const url of listingCard.thumbnailUrls) {
      photoSources.push({ id: url, ext: "jpg", url });
    }
  }
  const fiyatlar: Record<string, string | null> = {
    saatlik: String(row.saatlik_fiyat ?? "").trim() || null,
    gunluk: String(row.gunluk_fiyat ?? "").trim() || null,
    haftalik: String(row.haftalik_fiyat ?? "").trim() || null,
    aylik: String(row.aylik_fiyat ?? "").trim() || null,
    gunubirlik: String(row.hafta_ici_gunluk_gunubirlik ?? row.hata_ici_gunluk_gunubirlik ?? "").trim() || null,
    aksam: String(row.aksam_fiyati ?? "").trim() || null,
  };
  const fiyatBilgileri: Array<{ label: string; value: string }> = [];
  if (fiyatlar.saatlik) fiyatBilgileri.push({ label: "Saatlik", value: fiyatlar.saatlik });
  if (fiyatlar.gunubirlik) fiyatBilgileri.push({ label: "Günübirlik", value: fiyatlar.gunubirlik });
  if (fiyatlar.gunluk) fiyatBilgileri.push({ label: "Günlük", value: fiyatlar.gunluk });
  if (fiyatlar.haftalik) fiyatBilgileri.push({ label: "Haftalık", value: fiyatlar.haftalik });
  if (fiyatlar.aylik) fiyatBilgileri.push({ label: "Aylık", value: fiyatlar.aylik });
  if (fiyatlar.aksam) fiyatBilgileri.push({ label: "Akşam", value: fiyatlar.aksam });
  const rentalTypes: string[] = [];
  if (String(row.hafta_ici_saatlik_var ?? "") === "1") rentalTypes.push("saatlik");
  if (String(row.hata_ici_gunluk_gunubirlik_var ?? "") === "1") rentalTypes.push("gunubirlik");
  if (String(row.hata_ici_gunluk_var ?? "") === "1") rentalTypes.push("gunluk");
  if (String(row.haftalik_var ?? "") === "1") rentalTypes.push("haftalik");
  if (String(row.aylik_var ?? "") === "1") rentalTypes.push("aylik");
  const odeme: string[] = [];
  if (String(row.nakit_odeme ?? "") === "1") odeme.push("Nakit");
  if (String(row.havale_eft ?? "") === "1") odeme.push("Havale/EFT");
  if (String(row.kredi_karti ?? "") === "1") odeme.push("Kredi Kartı");
  if (String(row.online_odeme ?? "") === "1") odeme.push("Online Ödeme");
  if (String(row.cek_senet ?? "") === "1") odeme.push("Çek/Senet");
  const city = String(row.il_adi ?? row.il ?? listingCard?.city ?? "").trim() || null;
  const district = String(row.ilce_adi ?? row.ilce ?? listingCard?.district ?? "").trim() || null;
  const name = String(row.tasit_adi ?? listingCard?.name ?? "").trim();
  const description = stripHtml(row.tasit_hakkinda) || null;
  const seoDescription =
    description?.slice(0, 320) ||
    `${name}${district ? ` — ${district}` : ""}${city ? ` ${city}` : ""} tekne/yat kiralama ilanı.`;
  return {
    sourceId: buildYatportSourceId(eskiId),
    sourceUrl,
    eskiId,
    name,
    ilanNo: String(row.ilan_no ?? "").trim() || null,
    description,
    city,
    district,
    address: [district, city].filter(Boolean).join(", ") || null,
    phone: String(row.e_tel_1 ?? "").trim() || null,
    whatsapp: String(row.e_sms_gsm_no ?? row.e_tel_1 ?? "").trim() || null,
    ownerName: String(row.e_yetkilisi ?? "").trim() || null,
    ownerCompany: String(row.e_isletme_adi ?? "").trim() || null,
    ownerMemberYears: null,
    marka: String(row.marka_adi ?? row.marka ?? "").trim() || null,
    model: String(row.model_adi ?? row.model ?? "").trim() || null,
    yapimYili: parseIntSafe(row.yapim_yili),
    sonBakimYili: parseIntSafe(row.son_bakim_yili),
    kapasite: parseIntSafe(row.tam_kapasite),
    yemekliKapasite: parseIntSafe(row.yemekli_kapasite),
    konaklamaliKapasite: parseIntSafe(row.konaklama_kapasite),
    kabinSayisi: parseIntSafe(row.kabin_sayisi),
    tuvaletSayisi: parseIntSafe(row.tuvalet_sayisi),
    uzunluk: parseIntSafe(row.tasit_uzunlugu),
    bayrak: String(row.ulke_adi ?? row.bayrak ?? "").trim() || null,
    motorGucu: String(row.motor_gucu ?? "").trim() || null,
    murettebat: String(row.malzeme_adi ?? "").trim() || null,
    tekneTipi: String(row.tasit_tipi ?? listingCard?.boatType ?? "").trim() || null,
    tekneTipiBaslik: String(row.tasit_tipi_baslik ?? "").trim() || null,
    rotalar: String(row.rota ?? "").trim() || null,
    dortMevsimUygun: String(row.dort_mevsim_uygun ?? "") === "1",
    fiyatlar,
    fiyatBilgileri,
    imkanlar,
    kullanimSartlari: sartlar,
    guvenlikEkipmanlari: guvenlik,
    limanlar,
    rezervasyon: {
      rentalTypes,
      minHours: parseIntSafe(row.min_kiralama_suresi),
      maxGuests: parseIntSafe(row.tam_kapasite),
      kaporaOrani: parseIntSafe(row.kapora_orani),
      iptalSuresi: String(row.iptal_suresi ?? "").trim() || null,
      odemeYontemleri: odeme,
      departurePoints: limanlar.map((l) => l.ilce),
    },
    listingCard: listingCard ?? null,
    photoUrls: photoSources.map((p) => p.url).filter(Boolean),
    photoSources,
    seoDescription,
    storeType: "turizm_yat",
    homepageSuperCategory: "turizm",
    tags: [
      "yatport",
      "turizm_yat",
      "boat_rental",
      String(row.tasit_tipi_url ?? listingCard?.boatTypeSlug ?? "").trim(),
      city ? trSlug(city) : "",
      district ? trSlug(district) : "",
    ].filter(Boolean),
    raw: row,
  };
}

export function resolveYatportListSlugs(opts: YatportScrapeOptions): string[] {
  const mode = opts.mode ?? "listing";
  if (mode === "listing") {
    return [opts.listSlug?.trim() || "tekne-kiralama"];
  }
  if (mode === "boatType") {
    const slug = opts.boatTypeSlug?.trim() || "motoryat-kiralama";
    return [slug];
  }
  const district = opts.districtSlug?.trim();
  const boatType = opts.boatTypeSlug?.trim() || "tekne-kiralama";
  if (district) {
    const d = YATPORT_ISTANBUL_DISTRICTS.find((x) => x.slug === district || x.listSlug === district);
    const listDistrict = d?.listSlug ?? district;
    return [`${boatType}/${listDistrict}`];
  }
  return YATPORT_ISTANBUL_DISTRICTS.map((d) => `${boatType}/${d.listSlug}`);
}

export async function discoverYatportBoatIds(opts: YatportScrapeOptions = {}): Promise<{
  cards: YatportListingCard[];
  listPages: number;
}> {
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const maxBoats = opts.maxBoats;
  const maxPages = opts.maxListPages ?? 500;
  const slugs = resolveYatportListSlugs(opts);
  const cardsById = new Map<number, YatportListingCard>();
  let listPages = 0;

  for (const fullSlug of slugs) {
    for (let page = 1; page <= maxPages; page++) {
      if (maxBoats != null && maxBoats > 0 && cardsById.size >= maxBoats) break;
      opts.onProgress?.(`Liste ${fullSlug} sayfa ${page} isteniyor…`);
      const res = await yatportApiGet<Record<string, unknown>[]>("tasitlar/tasitListesiSlug", {
        full_slug: fullSlug,
        sayfa: page,
      }, delayMs);
      const rows = Array.isArray(res.DATA) ? res.DATA : [];
      listPages += 1;
      if (!rows.length) {
        if (page === 1 && cardsById.size === 0) {
          throw new Error(`Yatport liste boş (${fullSlug} sayfa 1) — slug veya API erişimi kontrol edin`);
        }
        break;
      }
      const sizeBefore = cardsById.size;
      for (const row of rows) {
        const card = mapListingCard(row);
        if (!card.id) continue;
        cardsById.set(card.id, card);
        if (maxBoats != null && maxBoats > 0 && cardsById.size >= maxBoats) break;
      }
      opts.onProgress?.(`Liste ${fullSlug} sayfa ${page}: ${cardsById.size} tekne`);
      if (cardsById.size === sizeBefore) break;
    }
  }

  const cards = maxBoats != null && maxBoats > 0 ? [...cardsById.values()].slice(0, maxBoats) : [...cardsById.values()];
  return { cards, listPages };
}

export async function scrapeYatportDetail(
  eskiId: number,
  listingCard?: YatportListingCard | null,
  opts: { delayMs?: number } = {},
): Promise<YatportScrapedBoat | null> {
  const res = await yatportApiGet<Record<string, unknown>[]>(
    "tasitlar/tasitListesiDetay",
    { ESKI_ID: eskiId },
    opts.delayMs ?? DEFAULT_DELAY_MS,
  );
  const row = Array.isArray(res.DATA) ? res.DATA[0] : null;
  if (!row || typeof row !== "object") return null;
  return mapDetailRow(row as Record<string, unknown>, listingCard ?? null);
}

export type YatportScrapeResult = {
  boats: YatportScrapedBoat[];
  discovered: number;
  listPages: number;
  errors: string[];
};

export async function scrapeYatportBatch(opts: YatportScrapeOptions = {}): Promise<YatportScrapeResult> {
  const { cards, listPages } = await discoverYatportBoatIds(opts);
  const boats: YatportScrapedBoat[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    if (opts.maxBoats != null && opts.maxBoats > 0 && boats.length >= opts.maxBoats) break;
    try {
      const boat = await scrapeYatportDetail(card.id, card, { delayMs: opts.delayMs });
      if (!boat) continue;
      const dk = buildYatportDedupeKey(boat);
      if (seen.has(dk)) continue;
      seen.add(dk);
      boats.push(boat);
      await opts.onBoatScraped?.(boat);
      opts.onProgress?.(`Detay: ${boat.name} (${card.location || card.city || "?"})`);
    } catch (err) {
      errors.push(`${card.sourceUrl}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 180));
    }
  }

  return { boats, discovered: cards.length, listPages, errors };
}

export function getYatportCatalog() {
  return {
    rentalTypes: YATPORT_RENTAL_TYPES.map((x) => ({ slug: x.slug, label: x.label })),
    boatTypes: YATPORT_BOAT_TYPES.map((x) => ({ slug: x.slug, label: x.label })),
    districts: YATPORT_ISTANBUL_DISTRICTS.map((x) => ({ slug: x.slug, label: x.label, listSlug: x.listSlug })),
    listSlugs: ["tekne-kiralama", ...YATPORT_BOAT_TYPES.map((x) => x.slug)],
  };
}
