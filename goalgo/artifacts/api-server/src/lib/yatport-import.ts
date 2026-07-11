import { db, mapBusinessesTable, mapBusinessImagesTable, mapCitiesTable, mapDistrictsTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import type { YatportScrapedBoat } from "./yatport-scraper.js";
import { buildYatportDedupeKey, buildYatportPhotoCandidates } from "./yatport-scraper.js";
import { downloadExternalImageToMedia } from "./mediaUploadService.js";
import { enrichYatportMapListing } from "./yatport-tourism-enrich.js";
import { upsertYachtExtrasFromYatport } from "./yacht-listing-extras.js";

const IMPORT_SOURCE = "yatport";
const MEDIA_LIMIT = 12;

function toSlug(text: string): string {
  const tr: Record<string, string> = {
    ğ: "g", Ğ: "G", ü: "u", Ü: "U", ş: "s", Ş: "S", ı: "i", İ: "I", ö: "o", Ö: "O", ç: "c", Ç: "C",
  };
  return text
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (m) => tr[m] || m)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isBlank(value: unknown): boolean {
  return !String(value ?? "").trim();
}

async function resolveMapCityId(cityParam: string): Promise<string | null> {
  const raw = cityParam.trim();
  if (!raw) return null;
  const rows = await db
    .select({ id: mapCitiesTable.id })
    .from(mapCitiesTable)
    .where(or(eq(mapCitiesTable.id, raw), ilike(mapCitiesTable.name, raw))!)
    .limit(1);
  if (rows[0]?.id) return rows[0].id;
  if (raw.length >= 2 && raw.length <= 48) {
    const [created] = await db
      .insert(mapCitiesTable)
      .values({ name: raw, sortOrder: 0, isActive: true })
      .returning({ id: mapCitiesTable.id });
    return created?.id ?? null;
  }
  return null;
}

async function resolveMapDistrictId(districtParam: string, cityId?: string | null): Promise<string | null> {
  const raw = districtParam.trim();
  if (!raw) return null;
  const conds = [or(eq(mapDistrictsTable.id, raw), ilike(mapDistrictsTable.name, raw))!];
  if (cityId) conds.push(eq(mapDistrictsTable.cityId, cityId));
  const rows = await db
    .select({ id: mapDistrictsTable.id })
    .from(mapDistrictsTable)
    .where(and(...conds))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function uniqueSlug(baseName: string, fallbackId: string): Promise<string> {
  const base = toSlug(baseName) || "yat";
  let slug = base;
  let attempt = 1;
  while (attempt <= 200) {
    const clash = await db
      .select({ id: mapBusinessesTable.id })
      .from(mapBusinessesTable)
      .where(eq(mapBusinessesTable.slug, slug))
      .limit(1);
    if (clash.length === 0) return slug;
    slug = `${base}-${++attempt}`;
  }
  return `${base}-${fallbackId.slice(-8)}`;
}

async function mirrorPhoto(url: string): Promise<string | null> {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/api/media/")) return trimmed;
  return downloadExternalImageToMedia(trimmed);
}

async function resolveBoatPhotos(boat: YatportScrapedBoat, downloadImages: boolean): Promise<string[]> {
  const out: string[] = [];
  const sources = boat.photoSources.length
    ? boat.photoSources
    : boat.photoUrls.map((url) => ({ id: url, ext: "jpg", url }));
  for (const src of sources.slice(0, MEDIA_LIMIT)) {
    const candidates = src.id.includes("/") ? [src.url] : buildYatportPhotoCandidates(src.id, src.ext);
    let saved: string | null = null;
    if (downloadImages) {
      for (const candidate of candidates) {
        saved = await mirrorPhoto(candidate);
        if (saved) break;
      }
    }
    out.push(saved || src.url || candidates[0] || "");
  }
  return out.filter(Boolean);
}

async function insertImportImages(businessId: string, photos: string[]): Promise<void> {
  for (let i = 0; i < photos.length; i++) {
    const imageUrl = photos[i];
    if (!imageUrl) continue;
    await db
      .insert(mapBusinessImagesTable)
      .values({ businessId, imageUrl, sortOrder: i, isPrimary: i === 0 })
      .onConflictDoNothing()
      .catch(() => {});
  }
}

function buildImportExtras(boat: YatportScrapedBoat): Record<string, unknown> {
  return {
    importSource: IMPORT_SOURCE,
    sourceUrl: boat.sourceUrl,
    yatportId: boat.eskiId,
    ilanNo: boat.ilanNo,
    primaryType: "boat_rental",
    genelBilgiler: {
      ilanNo: boat.ilanNo,
      marka: boat.marka,
      model: boat.model,
      yapimYili: boat.yapimYili,
      tekneAdi: boat.name,
      kapasite: boat.kapasite,
      yemekliKapasite: boat.yemekliKapasite,
      konaklamaliKapasite: boat.konaklamaliKapasite,
      murettebat: boat.murettebat,
      uzunluk: boat.uzunluk,
      bayrak: boat.bayrak,
      motorGucu: boat.motorGucu,
      sonBakimYili: boat.sonBakimYili,
      wcSayisi: boat.tuvaletSayisi,
      kabinSayisi: boat.kabinSayisi,
      dortMevsimUygun: boat.dortMevsimUygun,
      tekneTipi: boat.tekneTipi,
    },
    ownerContact: {
      ownerName: boat.ownerName,
      ownerCompany: boat.ownerCompany,
      phone: boat.phone,
      whatsapp: boat.whatsapp,
      memberYears: boat.ownerMemberYears,
    },
    fiyatBilgileri: boat.fiyatBilgileri,
    fiyatlar: boat.fiyatlar,
    imkanlar: boat.imkanlar,
    kullanimSartlari: boat.kullanimSartlari,
    guvenlikEkipmanlari: boat.guvenlikEkipmanlari,
    rotalar: boat.rotalar,
    limanlar: boat.limanlar,
    rezervasyon: boat.rezervasyon,
    listingCard: boat.listingCard,
    dedupeKey: buildYatportDedupeKey(boat),
    rawYatport: {
      eskiId: boat.eskiId,
      detailSlug: boat.listingCard?.detailSlug ?? null,
    },
  };
}

function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function primaryPrice(boat: YatportScrapedBoat): { amount: number | null; unit: string } {
  const card = boat.listingCard;
  if (card?.priceAmount) {
    return { amount: card.priceAmount, unit: card.priceUnit || "saat" };
  }
  if (boat.fiyatlar.saatlik) return { amount: parseMoney(boat.fiyatlar.saatlik), unit: "saat" };
  if (boat.fiyatlar.gunluk || boat.fiyatlar.gunubirlik) {
    return { amount: parseMoney(boat.fiyatlar.gunluk || boat.fiyatlar.gunubirlik), unit: "gün" };
  }
  return { amount: null, unit: "saat" };
}

type ExistingRow = {
  id: string;
  name: string;
  phone: string | null;
  whatsappNumber: string | null;
  description: string | null;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  cityId: string | null;
  districtId: string | null;
  tags: string[] | null;
  googlePlacesExtras: Record<string, unknown> | null;
};

async function findExistingBoat(boat: YatportScrapedBoat): Promise<ExistingRow | null> {
  const byPlace = await db
    .select({
      id: mapBusinessesTable.id,
      name: mapBusinessesTable.name,
      phone: mapBusinessesTable.phone,
      whatsappNumber: mapBusinessesTable.whatsappNumber,
      description: mapBusinessesTable.description,
      photoUrl: mapBusinessesTable.photoUrl,
      coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
      cityId: mapBusinessesTable.cityId,
      districtId: mapBusinessesTable.districtId,
      tags: mapBusinessesTable.tags,
      googlePlacesExtras: mapBusinessesTable.googlePlacesExtras,
    })
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.googlePlaceId, boat.sourceId))
    .limit(1);
  if (byPlace[0]) {
    return {
      ...byPlace[0],
      googlePlacesExtras: (byPlace[0].googlePlacesExtras ?? null) as Record<string, unknown> | null,
    };
  }
  const candidates = await db
    .select({
      id: mapBusinessesTable.id,
      name: mapBusinessesTable.name,
      phone: mapBusinessesTable.phone,
      whatsappNumber: mapBusinessesTable.whatsappNumber,
      description: mapBusinessesTable.description,
      photoUrl: mapBusinessesTable.photoUrl,
      coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
      cityId: mapBusinessesTable.cityId,
      districtId: mapBusinessesTable.districtId,
      tags: mapBusinessesTable.tags,
      googlePlacesExtras: mapBusinessesTable.googlePlacesExtras,
    })
    .from(mapBusinessesTable)
    .where(and(eq(mapBusinessesTable.importSource, IMPORT_SOURCE), ilike(mapBusinessesTable.name, boat.name.slice(0, 80))))
    .limit(20);
  const hit = candidates.find((row) => {
    const extras = (row.googlePlacesExtras ?? {}) as Record<string, unknown>;
    return String(extras.dedupeKey ?? "") === buildYatportDedupeKey(boat);
  });
  if (!hit) return null;
  return {
    ...hit,
    googlePlacesExtras: (hit.googlePlacesExtras ?? null) as Record<string, unknown> | null,
  };
}

async function backfillExistingBoat(
  existing: ExistingRow,
  boat: YatportScrapedBoat,
  photos: string[],
): Promise<boolean> {
  const cityId = boat.city ? (existing.cityId ?? (await resolveMapCityId(boat.city))) : existing.cityId;
  const districtId = boat.district
    ? (existing.districtId ?? (await resolveMapDistrictId(boat.district, cityId)))
    : existing.districtId;
  const prevExtras = existing.googlePlacesExtras ?? {};
  const nextExtras = { ...prevExtras, ...buildImportExtras(boat) };
  const patch: Record<string, unknown> = {
    importSource: IMPORT_SOURCE,
    googlePlaceId: boat.sourceId,
    googlePlacesExtras: nextExtras,
    scrapedAt: new Date(),
    storeType: boat.storeType,
    homepageSuperCategory: boat.homepageSuperCategory,
  };
  if (isBlank(existing.phone) && boat.phone) patch.phone = boat.phone;
  if (isBlank(existing.whatsappNumber) && boat.whatsapp) patch.whatsappNumber = boat.whatsapp;
  if (isBlank(existing.description) && boat.description) patch.description = boat.description;
  if (cityId && !existing.cityId) patch.cityId = cityId;
  if (districtId && !existing.districtId) patch.districtId = districtId;
  if (isBlank(existing.photoUrl) && photos[0]) {
    patch.photoUrl = photos[0];
    patch.coverPhotoUrl = photos[0];
    patch.scrapedPhotos = photos;
  }
  const nextTags = Array.from(new Set([...(existing.tags ?? []), ...boat.tags]));
  if (JSON.stringify(nextTags) !== JSON.stringify(existing.tags ?? [])) patch.tags = nextTags;
  const changed =
    Object.keys(patch).filter((k) => !["googlePlacesExtras", "tags"].includes(k)).length > 0 ||
    JSON.stringify(nextExtras) !== JSON.stringify(prevExtras) ||
    patch.tags != null;
  if (!changed) return false;
  await db.update(mapBusinessesTable).set(patch).where(eq(mapBusinessesTable.id, existing.id));
  if (photos.length) await insertImportImages(existing.id, photos);
  const enriched = enrichYatportMapListing({
    id: existing.id,
    type: "boat",
    google_places_extras: nextExtras,
    amenities: (nextExtras as Record<string, unknown>).imkanlar,
  });
  await upsertYachtExtrasFromYatport(existing.id, enriched).catch(() => {});
  return true;
}

export async function importYatportBoat(
  boat: YatportScrapedBoat,
  opts: { maxToImport?: number; currentTotal?: number; downloadImages?: boolean } = {},
): Promise<{ imported: number; updated: number; skipped: number; error?: string }> {
  const cap = opts.maxToImport != null && opts.maxToImport > 0 ? opts.maxToImport : Number.POSITIVE_INFINITY;
  const used = opts.currentTotal ?? 0;
  if (used >= cap) return { imported: 0, updated: 0, skipped: 0 };
  try {
    if (!boat.name?.trim()) return { imported: 0, updated: 0, skipped: 1 };
    const photos = await resolveBoatPhotos(boat, opts.downloadImages !== false);
    const existing = await findExistingBoat(boat);
    if (existing) {
      if (await backfillExistingBoat(existing, boat, photos)) {
        return { imported: 0, updated: 1, skipped: 0 };
      }
      return { imported: 0, updated: 0, skipped: 1 };
    }
    const cityId = boat.city ? await resolveMapCityId(boat.city) : null;
    const districtId = boat.district ? await resolveMapDistrictId(boat.district, cityId) : null;
    const slugBase =
      String((boat.raw as Record<string, unknown>)?.tasit_url ?? "").trim() ||
      boat.listingCard?.detailSlug?.split("/").pop() ||
      boat.name;
    const slug = await uniqueSlug(slugBase, boat.sourceId);
    const price = primaryPrice(boat);
    const extras = {
      ...buildImportExtras(boat),
      priceAmount: price.amount,
      priceUnit: price.unit,
    };
    const [inserted] = await db
      .insert(mapBusinessesTable)
      .values({
        googlePlaceId: boat.sourceId,
        slug,
        name: boat.name,
        description: boat.description || boat.seoDescription,
        address: boat.address,
        phone: boat.phone,
        whatsappNumber: boat.whatsapp,
        website: boat.sourceUrl,
        photoUrl: photos[0] ?? null,
        coverPhotoUrl: photos[0] ?? null,
        cityId,
        districtId,
        importSource: IMPORT_SOURCE,
        storeType: boat.storeType,
        homepageSuperCategory: boat.homepageSuperCategory,
        tags: boat.tags,
        googlePlacesExtras: extras,
        scrapedPhotos: photos.length ? (photos as unknown as Record<string, unknown>) : null,
        scrapedAt: new Date(),
        isActive: true,
      })
      .returning({ id: mapBusinessesTable.id });
    if (inserted?.id && photos.length) await insertImportImages(inserted.id, photos);
    if (inserted?.id) {
      const importExtras = buildImportExtras(boat);
      const enriched = enrichYatportMapListing({
        id: inserted.id,
        type: "boat",
        google_places_extras: extras,
        price: price.amount,
        price_unit: price.unit,
        amenities: importExtras.imkanlar,
      });
      await upsertYachtExtrasFromYatport(inserted.id, enriched).catch(() => {});
    }
    return { imported: 1, updated: 0, skipped: 0 };
  } catch (err) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      error: `${boat.name}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 180),
    };
  }
}

export async function importYatportBoats(
  boats: YatportScrapedBoat[],
  opts: { maxToImport?: number; downloadImages?: boolean } = {},
): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const boat of boats) {
    const row = await importYatportBoat(boat, {
      maxToImport: opts.maxToImport,
      currentTotal: imported + updated,
      downloadImages: opts.downloadImages,
    });
    imported += row.imported;
    updated += row.updated;
    skipped += row.skipped;
    if (row.error) errors.push(row.error);
  }
  return { imported, updated, skipped, errors };
}
