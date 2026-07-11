/** yacht_listing_extras + yatport import verisi → turizm detay/liste alanları */

import { db, yachtListingExtrasTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export type YachtFeatureCategory = { category: string; items: string[] };
export type YachtExtraService = { name: string; pricePerPerson: number; description?: string };
export type YachtFaqItem = { question: string; answer: string };
export type YachtTeknikDetaylar = {
  marka?: string;
  model?: string;
  yakitDahil?: boolean;
  murettebatSayisi?: number | string;
};

export type YachtListingExtrasPayload = {
  mapBusinessId: string;
  kaptanli?: boolean | null;
  kabinSayisi?: number | null;
  yatakSayisi?: number | null;
  wcSayisi?: number | null;
  uzunlukM?: number | null;
  yapimYili?: number | null;
  ilanNo?: string | null;
  featureCategories: YachtFeatureCategory[];
  sunulanHizmetler: string[];
  ekstraHizmetler: YachtExtraService[];
  teknikDetaylar: YachtTeknikDetaylar;
  limanlar: string[];
  faqItems: YachtFaqItem[];
  saatlikFiyat?: number | null;
  gunlukFiyat?: number | null;
  minSureSaat?: number | null;
  kdvDahil: boolean;
  kaporaOrani?: number | null;
  rentalTypeDefault?: string | null;
  relatedMapBusinessIds: string[];
  cancellationPolicy?: string | null;
};

export type YachtSummary = {
  marka?: string;
  tekneTipi?: string;
  kapasite?: number;
  kabin?: number;
  wc?: number;
  uzunluk?: number;
  yapimYili?: number;
  ilanNo?: string;
  kaptanli?: boolean;
  rentalType?: string;
  kaporaOrani?: number;
  price?: number;
  priceUnit?: string;
  kdvDahil?: boolean;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function categorizeImkanlar(items: string[]): YachtFeatureCategory[] {
  if (!items.length) return [];
  const groups: Record<string, string[]> = {
    "Düzenler & Konfor": [],
    "Güvenlik & Navigasyon": [],
    "Mutfak & İç Mekan": [],
    "Eğlence & Ses": [],
    "Diğer": [],
  };
  for (const item of items) {
    const low = item.toLowerCase();
    if (/bimini|cockpit|masa|sandalye|güneş|brand|ısıt|webasto|fly bridge|tik/i.test(low)) {
      groups["Düzenler & Konfor"].push(item);
    } else if (/can|yangın|güvenlik|tehlike|ilk yardım/i.test(low)) {
      groups["Güvenlik & Navigasyon"].push(item);
    } else if (/mutfak|buz|kahve|bulaşık|servis|yemek/i.test(low)) {
      groups["Mutfak & İç Mekan"].push(item);
    } else if (/ses|bluetooth|usb|aux|müzik/i.test(low)) {
      groups["Eğlence & Ses"].push(item);
    } else {
      groups["Diğer"].push(item);
    }
  }
  return Object.entries(groups)
    .filter(([, arr]) => arr.length > 0)
    .map(([category, arr]) => ({ category, items: arr }));
}

export const DEFAULT_YACHT_FAQ: YachtFaqItem[] = [
  {
    question: "Yekpare satıcı mıdır? Rezervasyon kime yapılır?",
    answer:
      "Yekpare, tekne ilanlarını listelediği firma rehberi ve pazaryeridir; satıcı konumunda değildir. Rezervasyon, ödeme ve sözleşme doğrudan ilanı yayınlayan tekne işletmesiyle yapılır.",
  },
  {
    question: "Tekne hangi limandan kalkış yapıyor?",
    answer:
      "Kalkış noktası ilan detayında belirtilmiştir. Rezervasyon sırasında liman seçimi yapabilirsiniz.",
  },
  {
    question: "Maksimum yolcu sayısı kaç kişidir?",
    answer: "Yolcu kapasitesi ilan başlığı ve teknik detaylar bölümünde gösterilmektedir.",
  },
  {
    question: "Fiyatlara neler dahildir?",
    answer:
      "Saatlik/günlük fiyatlar genellikle yakıt ve mürettebatı kapsar. Menü ve ekstra hizmetler ayrı ücretlendirilir.",
  },
  {
    question: "Hangi marinalardan hizmet veriliyor?",
    answer: "İlan detayında kalkış limanları listelenmiştir. Farklı liman talepleri için iletişime geçin.",
  },
  {
    question: "Minimum kiralama süresi nedir?",
    answer: "Minimum süre ilan detayında belirtilir; çoğu saatlik kiralamada 2–4 saattir.",
  },
  {
    question: "Hangi sezonlarda kiralama yapılabilir?",
    answer: "İstanbul ve Ege kıyılarında Nisan–Ekim arası yoğun sezon geçerlidir; dört mevsim uygun tekneler ayrıca belirtilir.",
  },
];

function rowToPayload(row: typeof yachtListingExtrasTable.$inferSelect): YachtListingExtrasPayload {
  const featureCategories = Array.isArray(row.featureCategories)
    ? (row.featureCategories as YachtFeatureCategory[])
    : [];
  const ekstraHizmetler = Array.isArray(row.ekstraHizmetler)
    ? (row.ekstraHizmetler as YachtExtraService[])
    : [];
  const teknikDetaylar = asRecord(row.teknikDetaylar) as YachtTeknikDetaylar;
  const faqItems = Array.isArray(row.faqItems) ? (row.faqItems as YachtFaqItem[]) : [];
  return {
    mapBusinessId: row.mapBusinessId,
    kaptanli: row.kaptanli,
    kabinSayisi: row.kabinSayisi,
    yatakSayisi: row.yatakSayisi,
    wcSayisi: row.wcSayisi,
    uzunlukM: row.uzunlukM != null ? Number(row.uzunlukM) : null,
    yapimYili: row.yapimYili,
    ilanNo: row.ilanNo,
    featureCategories,
    sunulanHizmetler: asStringArray(row.sunulanHizmetler),
    ekstraHizmetler,
    teknikDetaylar,
    limanlar: asStringArray(row.limanlar),
    faqItems,
    saatlikFiyat: row.saatlikFiyat != null ? Number(row.saatlikFiyat) : null,
    gunlukFiyat: row.gunlukFiyat != null ? Number(row.gunlukFiyat) : null,
    minSureSaat: row.minSureSaat,
    kdvDahil: row.kdvDahil ?? true,
    kaporaOrani: row.kaporaOrani,
    rentalTypeDefault: row.rentalTypeDefault,
    relatedMapBusinessIds: asStringArray(row.relatedMapBusinessIds),
    cancellationPolicy: row.cancellationPolicy,
  };
}

export async function fetchYachtExtras(mapBusinessId: string): Promise<YachtListingExtrasPayload | null> {
  if (!mapBusinessId) return null;
  const rows = await db
    .select()
    .from(yachtListingExtrasTable)
    .where(eq(yachtListingExtrasTable.mapBusinessId, mapBusinessId))
    .limit(1);
  return rows[0] ? rowToPayload(rows[0]) : null;
}

export function buildYachtSummary(
  listing: Record<string, unknown>,
  extras: YachtListingExtrasPayload | null,
): YachtSummary {
  const genel = asRecord(listing.yatport_genel_bilgiler);
  const rez = asRecord(listing.yatport_rezervasyon);
  const rentalTypes = asStringArray(rez.rentalTypes);
  const rentalType =
    extras?.rentalTypeDefault ||
    rentalTypes[0] ||
    String(listing.price_unit ?? "saat").replace("gün", "gunluk").replace("saat", "saatlik");
  const price = parseNum(extras?.saatlikFiyat) ?? parseNum(listing.price) ?? parseNum(listing.sale_price);
  const priceUnit = String(listing.price_unit ?? "saat");
  return {
    marka: String(genel.marka ?? extras?.teknikDetaylar?.marka ?? "").trim() || undefined,
    tekneTipi: String(genel.tekneTipi ?? "").trim() || undefined,
    kapasite: parseNum(genel.kapasite) ?? parseNum(listing.capacity) ?? undefined,
    kabin: extras?.kabinSayisi ?? parseNum(genel.kabinSayisi) ?? undefined,
    wc: extras?.wcSayisi ?? parseNum(genel.wcSayisi) ?? undefined,
    uzunluk: extras?.uzunlukM ?? parseNum(genel.uzunluk) ?? undefined,
    yapimYili: extras?.yapimYili ?? parseNum(genel.yapimYili) ?? undefined,
    ilanNo:
      (extras?.ilanNo ??
        String(genel.ilanNo ?? asRecord(listing.extra_info).yatport_ilan_no ?? "").trim()) ||
      undefined,
    kaptanli: extras?.kaptanli ?? true,
    rentalType,
    kaporaOrani: extras?.kaporaOrani ?? parseNum(rez.kaporaOrani) ?? undefined,
    price: price ?? undefined,
    priceUnit,
    kdvDahil: extras?.kdvDahil ?? true,
  };
}

export function mergeYachtExtrasIntoListing(
  listing: Record<string, unknown>,
  extras: YachtListingExtrasPayload | null,
): Record<string, unknown> {
  if (!extras) {
    const genel = asRecord(listing.yatport_genel_bilgiler);
    const amenities = asStringArray(listing.amenities);
    const featureCategories = categorizeImkanlar(amenities);
    const yachtSummary = buildYachtSummary(listing, null);
    return {
      ...listing,
      yacht_extras: null,
      yacht_summary: yachtSummary,
      yacht_feature_categories: featureCategories,
      yacht_faq: DEFAULT_YACHT_FAQ,
    };
  }

  const genel = { ...asRecord(listing.yatport_genel_bilgiler) };
  if (extras.kabinSayisi != null) genel.kabinSayisi = extras.kabinSayisi;
  if (extras.wcSayisi != null) genel.wcSayisi = extras.wcSayisi;
  if (extras.uzunlukM != null) genel.uzunluk = extras.uzunlukM;
  if (extras.yapimYili != null) genel.yapimYili = extras.yapimYili;
  if (extras.ilanNo) genel.ilanNo = extras.ilanNo;

  const mergedRez = { ...asRecord(listing.yatport_rezervasyon) };
  if (extras.limanlar.length) mergedRez.departurePoints = extras.limanlar;
  if (extras.minSureSaat != null) mergedRez.minHours = extras.minSureSaat;
  if (extras.kaporaOrani != null) mergedRez.kaporaOrani = extras.kaporaOrani;

  let price = listing.price;
  let priceUnit = listing.price_unit;
  if (extras.saatlikFiyat != null && extras.saatlikFiyat > 0) {
    price = String(extras.saatlikFiyat);
    priceUnit = "saat";
  } else if (extras.gunlukFiyat != null && extras.gunlukFiyat > 0) {
    price = String(extras.gunlukFiyat);
    priceUnit = "gün";
  }

  const yachtSummary = buildYachtSummary(
    { ...listing, yatport_genel_bilgiler: genel, price, price_unit: priceUnit },
    extras,
  );

  const featureCategories =
    extras.featureCategories.length > 0
      ? extras.featureCategories
      : categorizeImkanlar(asStringArray(listing.amenities));

  const faqItems = extras.faqItems.length > 0 ? extras.faqItems : DEFAULT_YACHT_FAQ;

  return {
    ...listing,
    price,
    price_unit: priceUnit,
    yatport_genel_bilgiler: genel,
    yatport_rezervasyon: mergedRez,
    yacht_extras: extras,
    yacht_summary: yachtSummary,
    yacht_feature_categories: featureCategories,
    yacht_sunulan_hizmetler: extras.sunulanHizmetler,
    yacht_ekstra_hizmetler: extras.ekstraHizmetler,
    yacht_teknik_detaylar: {
      marka: extras.teknikDetaylar.marka ?? genel.marka,
      model: extras.teknikDetaylar.model ?? genel.model,
      yakitDahil: extras.teknikDetaylar.yakitDahil,
      murettebatSayisi: extras.teknikDetaylar.murettebatSayisi ?? genel.murettebat,
      yapimYili: extras.yapimYili ?? genel.yapimYili,
      uzunluk: extras.uzunlukM ?? genel.uzunluk,
      kabin: extras.kabinSayisi ?? genel.kabinSayisi,
      wc: extras.wcSayisi ?? genel.wcSayisi,
    },
    yacht_faq: faqItems,
    yacht_kdv_dahil: extras.kdvDahil,
    yacht_kapora_orani: extras.kaporaOrani,
    yacht_cancellation_policy: extras.cancellationPolicy,
  };
}

export async function upsertYachtExtrasFromYatport(
  mapBusinessId: string,
  listing: Record<string, unknown>,
): Promise<void> {
  const gpe = asRecord(listing.google_places_extras);
  const genel = asRecord(listing.yatport_genel_bilgiler ?? gpe.genelBilgiler);
  const extrasRaw = gpe;
  const rez = asRecord(listing.yatport_rezervasyon ?? extrasRaw.rezervasyon);
  const amenities = asStringArray(listing.amenities ?? extrasRaw.imkanlar);
  const limanlar = asStringArray(rez.departurePoints);
  const fiyatlar = asRecord(extrasRaw.fiyatlar);
  const saatlik = parseNum(listing.price) ?? parseNum(fiyatlar.saatlik);
  const gunluk = parseNum(fiyatlar.gunluk ?? fiyatlar.gunubirlik);

  const uzunlukVal = parseNum(genel.uzunluk);

  const payload = {
    mapBusinessId,
    kaptanli: true,
    kabinSayisi: parseNum(genel.kabinSayisi),
    yatakSayisi: parseNum(genel.konaklamaliKapasite),
    wcSayisi: parseNum(genel.wcSayisi),
    uzunlukM: uzunlukVal != null ? String(uzunlukVal) : null,
    yapimYili: parseNum(genel.yapimYili),
    ilanNo: String(genel.ilanNo ?? extrasRaw.ilanNo ?? "").trim() || null,
    featureCategories: categorizeImkanlar(amenities),
    sunulanHizmetler: [] as string[],
    ekstraHizmetler: [] as YachtExtraService[],
    teknikDetaylar: {
      marka: String(genel.marka ?? "").trim() || undefined,
      model: String(genel.model ?? "").trim() || undefined,
      yakitDahil: true,
      murettebatSayisi: genel.murettebat,
    },
    limanlar,
    faqItems: [] as YachtFaqItem[],
    saatlikFiyat: saatlik != null ? String(saatlik) : null,
    gunlukFiyat: gunluk != null ? String(gunluk) : null,
    minSureSaat: parseNum(rez.minHours) ?? 2,
    kdvDahil: true,
    kaporaOrani: parseNum(rez.kaporaOrani),
    rentalTypeDefault: asStringArray(rez.rentalTypes)[0] ?? "saatlik",
    relatedMapBusinessIds: [] as string[],
    cancellationPolicy: null as string | null,
    updatedAt: new Date(),
  };

  await db
    .insert(yachtListingExtrasTable)
    .values(payload)
    .onConflictDoUpdate({
      target: yachtListingExtrasTable.mapBusinessId,
      set: {
        kabinSayisi: payload.kabinSayisi,
        yatakSayisi: payload.yatakSayisi,
        wcSayisi: payload.wcSayisi,
        uzunlukM: payload.uzunlukM,
        yapimYili: payload.yapimYili,
        ilanNo: payload.ilanNo,
        featureCategories: payload.featureCategories,
        limanlar: payload.limanlar,
        saatlikFiyat: payload.saatlikFiyat,
        gunlukFiyat: payload.gunlukFiyat,
        minSureSaat: payload.minSureSaat,
        kaporaOrani: payload.kaporaOrani,
        rentalTypeDefault: payload.rentalTypeDefault,
        teknikDetaylar: payload.teknikDetaylar,
        updatedAt: new Date(),
      },
    });
}

export async function saveYachtExtras(
  mapBusinessId: string,
  body: Partial<YachtListingExtrasPayload>,
): Promise<YachtListingExtrasPayload> {
  const existing = await fetchYachtExtras(mapBusinessId);
  const merged: YachtListingExtrasPayload = {
    mapBusinessId,
    kaptanli: body.kaptanli ?? existing?.kaptanli ?? true,
    kabinSayisi: body.kabinSayisi ?? existing?.kabinSayisi ?? null,
    yatakSayisi: body.yatakSayisi ?? existing?.yatakSayisi ?? null,
    wcSayisi: body.wcSayisi ?? existing?.wcSayisi ?? null,
    uzunlukM: body.uzunlukM ?? existing?.uzunlukM ?? null,
    yapimYili: body.yapimYili ?? existing?.yapimYili ?? null,
    ilanNo: body.ilanNo ?? existing?.ilanNo ?? null,
    featureCategories: body.featureCategories ?? existing?.featureCategories ?? [],
    sunulanHizmetler: body.sunulanHizmetler ?? existing?.sunulanHizmetler ?? [],
    ekstraHizmetler: body.ekstraHizmetler ?? existing?.ekstraHizmetler ?? [],
    teknikDetaylar: { ...existing?.teknikDetaylar, ...body.teknikDetaylar },
    limanlar: body.limanlar ?? existing?.limanlar ?? [],
    faqItems: body.faqItems ?? existing?.faqItems ?? [],
    saatlikFiyat: body.saatlikFiyat ?? existing?.saatlikFiyat ?? null,
    gunlukFiyat: body.gunlukFiyat ?? existing?.gunlukFiyat ?? null,
    minSureSaat: body.minSureSaat ?? existing?.minSureSaat ?? 2,
    kdvDahil: body.kdvDahil ?? existing?.kdvDahil ?? true,
    kaporaOrani: body.kaporaOrani ?? existing?.kaporaOrani ?? null,
    rentalTypeDefault: body.rentalTypeDefault ?? existing?.rentalTypeDefault ?? "saatlik",
    relatedMapBusinessIds: body.relatedMapBusinessIds ?? existing?.relatedMapBusinessIds ?? [],
    cancellationPolicy: body.cancellationPolicy ?? existing?.cancellationPolicy ?? null,
  };

  await db
    .insert(yachtListingExtrasTable)
    .values({
      mapBusinessId,
      kaptanli: merged.kaptanli,
      kabinSayisi: merged.kabinSayisi,
      yatakSayisi: merged.yatakSayisi,
      wcSayisi: merged.wcSayisi,
      uzunlukM: merged.uzunlukM != null ? String(merged.uzunlukM) : null,
      yapimYili: merged.yapimYili,
      ilanNo: merged.ilanNo,
      featureCategories: merged.featureCategories,
      sunulanHizmetler: merged.sunulanHizmetler,
      ekstraHizmetler: merged.ekstraHizmetler,
      teknikDetaylar: merged.teknikDetaylar,
      limanlar: merged.limanlar,
      faqItems: merged.faqItems,
      saatlikFiyat: merged.saatlikFiyat != null ? String(merged.saatlikFiyat) : null,
      gunlukFiyat: merged.gunlukFiyat != null ? String(merged.gunlukFiyat) : null,
      minSureSaat: merged.minSureSaat,
      kdvDahil: merged.kdvDahil,
      kaporaOrani: merged.kaporaOrani,
      rentalTypeDefault: merged.rentalTypeDefault,
      relatedMapBusinessIds: merged.relatedMapBusinessIds,
      cancellationPolicy: merged.cancellationPolicy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: yachtListingExtrasTable.mapBusinessId,
      set: {
        kaptanli: merged.kaptanli,
        kabinSayisi: merged.kabinSayisi,
        yatakSayisi: merged.yatakSayisi,
        wcSayisi: merged.wcSayisi,
        uzunlukM: merged.uzunlukM != null ? String(merged.uzunlukM) : null,
        yapimYili: merged.yapimYili,
        ilanNo: merged.ilanNo,
        featureCategories: merged.featureCategories,
        sunulanHizmetler: merged.sunulanHizmetler,
        ekstraHizmetler: merged.ekstraHizmetler,
        teknikDetaylar: merged.teknikDetaylar,
        limanlar: merged.limanlar,
        faqItems: merged.faqItems,
        saatlikFiyat: merged.saatlikFiyat != null ? String(merged.saatlikFiyat) : null,
        gunlukFiyat: merged.gunlukFiyat != null ? String(merged.gunlukFiyat) : null,
        minSureSaat: merged.minSureSaat,
        kdvDahil: merged.kdvDahil,
        kaporaOrani: merged.kaporaOrani,
        rentalTypeDefault: merged.rentalTypeDefault,
        relatedMapBusinessIds: merged.relatedMapBusinessIds,
        cancellationPolicy: merged.cancellationPolicy,
        updatedAt: new Date(),
      },
    });

  return merged;
}

export async function fetchRelatedYachtListings(
  listing: Record<string, unknown>,
  extras: YachtListingExtrasPayload | null,
  limit = 6,
): Promise<Record<string, unknown>[]> {
  const bizId = String(listing.id ?? "");
  const district = String(listing.district ?? "").trim();
  const city = String(listing.city ?? "").trim();
  const manualIds = extras?.relatedMapBusinessIds?.filter((id) => id && id !== bizId) ?? [];

  if (manualIds.length) {
    const idsSql = manualIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    const r = await db.execute(sql.raw(`
      SELECT mb.id, mb.name AS title, mb.slug, mb.description,
             COALESCE(mcity.name, '') AS city,
             COALESCE(mdist.name, '') AS district,
             COALESCE(mb.cover_photo_url, mb.photo_url) AS image_url,
             mb.google_places_extras, mb.import_source, mb.rating, mb.user_ratings_total AS review_count
      FROM map_businesses mb
      LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
      LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
      WHERE mb.is_active = true AND mb.id IN (${idsSql})
      LIMIT ${limit}
    `));
    return r.rows as Record<string, unknown>[];
  }

  const locParts: string[] = [];
  if (district) locParts.push(`LOWER(COALESCE(mdist.name,'')) LIKE LOWER('%${district.replace(/'/g, "''")}%')`);
  if (city) locParts.push(`LOWER(COALESCE(mcity.name,'')) LIKE LOWER('%${city.replace(/'/g, "''")}%')`);
  const locWhere = locParts.length ? `AND (${locParts.join(" OR ")})` : "";

  const r = await db.execute(sql.raw(`
    SELECT mb.id, mb.name AS title, mb.slug, mb.description,
           COALESCE(mcity.name, '') AS city,
           COALESCE(mdist.name, '') AS district,
           COALESCE(mb.cover_photo_url, mb.photo_url) AS image_url,
           mb.google_places_extras, mb.import_source, mb.rating, mb.user_ratings_total AS review_count,
           mb.google_places_extras->'genelBilgiler' AS genel_json
    FROM map_businesses mb
    LEFT JOIN map_cities mcity ON mcity.id = mb.city_id
    LEFT JOIN map_districts mdist ON mdist.id = mb.district_id
    WHERE mb.is_active = true
      AND mb.id <> '${bizId.replace(/'/g, "''")}'
      AND (mb.import_source = 'yatport' OR mb.store_type = 'turizm_yat')
      ${locWhere}
    ORDER BY mb.rating DESC NULLS LAST
    LIMIT ${limit}
  `));
  return r.rows as Record<string, unknown>[];
}

export async function enrichBoatListingRows(
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (!rows.length) return rows;
  const ids = rows.map((r) => String(r.id ?? "")).filter(Boolean);
  if (!ids.length) return rows.map((r) => mergeYachtExtrasIntoListing(r, null));

  const idList = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
  const extrasR = await db.execute(sql.raw(`
    SELECT * FROM yacht_listing_extras WHERE map_business_id IN (${idList})
  `));
  const extrasMap = new Map<string, YachtListingExtrasPayload>();
  for (const row of extrasR.rows as (typeof yachtListingExtrasTable.$inferSelect)[]) {
    extrasMap.set(row.mapBusinessId, rowToPayload(row));
  }
  return rows.map((r) => mergeYachtExtrasIntoListing(r, extrasMap.get(String(r.id ?? "")) ?? null));
}

export function yachtRowMeta(row: Record<string, unknown>): {
  kapasite: number;
  kabin: number;
  wc: number;
  uzunluk: number;
  yapimYili: number;
  kaptanli: boolean;
  rentalType: string;
  kaporaOrani: number;
  price: number;
} {
  const summary = asRecord(row.yacht_summary);
  const genel = asRecord(row.yatport_genel_bilgiler);
  const rez = asRecord(row.yatport_rezervasyon);
  const rentalTypes = asStringArray(rez.rentalTypes);
  return {
    kapasite: parseNum(summary.kapasite) ?? parseNum(genel.kapasite) ?? parseNum(row.capacity) ?? 0,
    kabin: parseNum(summary.kabin) ?? parseNum(genel.kabinSayisi) ?? 0,
    wc: parseNum(summary.wc) ?? parseNum(genel.wcSayisi) ?? 0,
    uzunluk: parseNum(summary.uzunluk) ?? parseNum(genel.uzunluk) ?? 0,
    yapimYili: parseNum(summary.yapimYili) ?? parseNum(genel.yapimYili) ?? 0,
    kaptanli: summary.kaptanli !== false,
    rentalType: String(summary.rentalType ?? rentalTypes[0] ?? "saatlik"),
    kaporaOrani: parseNum(summary.kaporaOrani) ?? parseNum(rez.kaporaOrani) ?? 0,
    price: parseNum(summary.price) ?? parseNum(row.price) ?? 0,
  };
}
