import { db, mapBusinessesTable, mapBusinessImagesTable, mapCitiesTable, mapDistrictsTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import type { InsaatfirmalarimScrapedFirm } from "./insaatfirmalarim-scraper.js";
import { buildInsaatfirmalarimDedupeKey } from "./insaatfirmalarim-scraper.js";

const IMPORT_SOURCE = "insaatfirmalarim";
const MEDIA_LIMIT = 3;

function toSlug(text: string): string {
  const tr: Record<string, string> = { ğ: "g", Ğ: "G", ü: "u", Ü: "U", ş: "s", Ş: "S", ı: "i", İ: "I", ö: "o", Ö: "O", ç: "c", Ç: "C" };
  return text
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (m) => tr[m] || m)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDedupeText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isBlank(value: unknown): boolean {
  return !String(value ?? "").trim();
}

function isExternalImageReference(value: unknown): value is string {
  const url = String(value ?? "").trim();
  if (!url) return false;
  if (/^(data|blob|file):/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

function readResponsiblePerson(extras: Record<string, unknown> | null | undefined): string | null {
  if (!extras) return null;
  for (const key of ["responsiblePerson", "authorizedPersonName"]) {
    const val = String(extras[key] ?? "").trim();
    if (val) return val;
  }
  return null;
}

function buildYetkiliTag(name: string): string {
  return `yetkili:${toSlug(name).slice(0, 48) || "kisi"}`;
}

function appendResponsibleToDescription(description: string | null, person: string | null): string | null {
  const who = String(person ?? "").trim();
  if (!who) return description;
  const base = String(description ?? "").trim();
  const marker = `Yetkili: ${who}.`;
  if (base.toLocaleLowerCase("tr-TR").includes(`yetkili: ${who.toLocaleLowerCase("tr-TR")}`)) return base || marker;
  if (!base) return marker;
  if (/yetkili\s*:/i.test(base)) return base;
  return `${base} ${marker}`.slice(0, 1200);
}

function mergeTags(existing: string[] | null | undefined, additions: string[]): string[] {
  return Array.from(new Set([...(existing ?? []), ...additions].filter(Boolean)));
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
  const base = toSlug(baseName) || "isletme";
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

async function insertImportImages(businessId: string, photos: string[]): Promise<void> {
  const linked = photos.filter(isExternalImageReference).slice(0, MEDIA_LIMIT);
  for (let i = 0; i < linked.length; i++) {
    const imageUrl = linked[i];
    if (!imageUrl) continue;
    await db
      .insert(mapBusinessImagesTable)
      .values({ businessId, imageUrl, sortOrder: i, isPrimary: i === 0 })
      .onConflictDoNothing()
      .catch(() => {});
  }
}

type ExistingRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  cityId: string | null;
  districtId: string | null;
  tags: string[] | null;
  googlePlacesExtras: Record<string, unknown> | null;
};

async function findExistingFirm(firm: InsaatfirmalarimScrapedFirm): Promise<ExistingRow | null> {
  const byPlace = await db
    .select({
      id: mapBusinessesTable.id,
      name: mapBusinessesTable.name,
      address: mapBusinessesTable.address,
      phone: mapBusinessesTable.phone,
      email: mapBusinessesTable.email,
      website: mapBusinessesTable.website,
      description: mapBusinessesTable.description,
      latitude: mapBusinessesTable.latitude,
      longitude: mapBusinessesTable.longitude,
      photoUrl: mapBusinessesTable.photoUrl,
      coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
      cityId: mapBusinessesTable.cityId,
      districtId: mapBusinessesTable.districtId,
      tags: mapBusinessesTable.tags,
      googlePlacesExtras: mapBusinessesTable.googlePlacesExtras,
    })
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.googlePlaceId, firm.sourceId))
    .limit(1);
  if (byPlace[0]) {
    return {
      ...byPlace[0],
      googlePlacesExtras: (byPlace[0].googlePlacesExtras ?? null) as Record<string, unknown> | null,
    };
  }

  const nameNorm = normalizeDedupeText(firm.name);
  if (!nameNorm) return null;
  const firmKey = buildInsaatfirmalarimDedupeKey(firm);
  const candidates = await db
    .select({
      id: mapBusinessesTable.id,
      name: mapBusinessesTable.name,
      address: mapBusinessesTable.address,
      phone: mapBusinessesTable.phone,
      email: mapBusinessesTable.email,
      website: mapBusinessesTable.website,
      description: mapBusinessesTable.description,
      latitude: mapBusinessesTable.latitude,
      longitude: mapBusinessesTable.longitude,
      photoUrl: mapBusinessesTable.photoUrl,
      coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
      cityId: mapBusinessesTable.cityId,
      districtId: mapBusinessesTable.districtId,
      tags: mapBusinessesTable.tags,
      googlePlacesExtras: mapBusinessesTable.googlePlacesExtras,
    })
    .from(mapBusinessesTable)
    .where(ilike(mapBusinessesTable.name, firm.name.slice(0, 80)))
    .limit(40);

  const hit = candidates.find((row) => {
    const rowKey = [
      normalizeDedupeText(row.name),
      normalizeDedupeText(row.address),
      normalizeDedupeText(row.phone),
    ].join("|");
    return rowKey === firmKey;
  });
  if (!hit) return null;
  return {
    ...hit,
    googlePlacesExtras: (hit.googlePlacesExtras ?? null) as Record<string, unknown> | null,
  };
}

function buildImportExtras(firm: InsaatfirmalarimScrapedFirm): Record<string, unknown> {
  const categorySlug = firm.listCategorySlug ?? null;
  const citySlug = firm.listCitySlug ?? null;
  return {
    importSource: IMPORT_SOURCE,
    sourceUrl: firm.sourceUrl,
    responsiblePerson: firm.responsiblePerson,
    authorizedPersonName: firm.responsiblePerson,
    fax: firm.fax,
    categories: firm.categories,
    originalAbout: firm.aboutText,
    dedupeKey: buildInsaatfirmalarimDedupeKey(firm),
    slug: categorySlug ?? undefined,
    importWorkflow: {
      categorySlug,
      categoryLabel: firm.listCategoryLabel ?? null,
      citySlug,
      cityLabel: firm.listCityLabel ?? null,
    },
  };
}

function buildImportTags(firm: InsaatfirmalarimScrapedFirm): string[] {
  const tags = Array.from(
    new Set([
      "insaatfirmalarim",
      "private_business",
      firm.storeType,
      firm.homepageSuperCategory,
      ...(firm.listCategorySlug ? [firm.listCategorySlug] : []),
      ...(firm.listCitySlug ? [`il:${firm.listCitySlug}`] : []),
      ...firm.categories.slice(0, 5).map((c) => toSlug(c)),
    ].filter(Boolean)),
  );
  if (firm.responsiblePerson) tags.push(buildYetkiliTag(firm.responsiblePerson));
  return tags;
}

async function backfillExistingFirm(existing: ExistingRow, firm: InsaatfirmalarimScrapedFirm): Promise<boolean> {
  const importCity = firm.listCityLabel?.trim() || firm.city?.trim() || null;
  const cityId = importCity ? (existing.cityId ?? (await resolveMapCityId(importCity))) : existing.cityId;
  const districtId = firm.district ? (existing.districtId ?? (await resolveMapDistrictId(firm.district, cityId))) : existing.districtId;
  const prevExtras = existing.googlePlacesExtras ?? {};
  const nextExtras = {
    ...prevExtras,
    ...buildImportExtras(firm),
    responsiblePerson: firm.responsiblePerson ?? readResponsiblePerson(prevExtras),
    authorizedPersonName: firm.responsiblePerson ?? readResponsiblePerson(prevExtras),
  };
  const responsiblePerson = firm.responsiblePerson ?? readResponsiblePerson(prevExtras);
  const needsContactFallback = isBlank(existing.phone) && isBlank(existing.address);
  const patch: Record<string, unknown> = {
    importSource: IMPORT_SOURCE,
    googlePlaceId: firm.sourceId,
    googlePlacesExtras: nextExtras,
    scrapedAt: new Date(),
  };

  if (isBlank(existing.address) && firm.address) patch.address = firm.address;
  if (isBlank(existing.phone) && firm.phone) patch.phone = firm.phone;
  if (isBlank(existing.email) && firm.email) patch.email = firm.email;
  if (isBlank(existing.website) && firm.website) patch.website = firm.website;
  if (existing.latitude == null && firm.latitude != null) patch.latitude = firm.latitude;
  if (existing.longitude == null && firm.longitude != null) patch.longitude = firm.longitude;
  if (cityId && !existing.cityId) patch.cityId = cityId;
  if (districtId && !existing.districtId) patch.districtId = districtId;

  const photos = firm.photoUrl ? [firm.photoUrl] : [];
  if (isBlank(existing.photoUrl) && photos[0]) {
    patch.photoUrl = photos[0];
    patch.coverPhotoUrl = photos[0];
    patch.scrapedPhotos = photos;
  }

  let nextDescription = existing.description;
  if (needsContactFallback && responsiblePerson) {
    nextDescription = appendResponsibleToDescription(existing.description, responsiblePerson);
  } else if (isBlank(existing.description) && firm.seoDescription) {
    nextDescription = firm.seoDescription;
  }
  if (nextDescription !== existing.description) patch.description = nextDescription;

  const nextTags = mergeTags(existing.tags, buildImportTags(firm));
  if (JSON.stringify(nextTags) !== JSON.stringify(existing.tags ?? [])) patch.tags = nextTags;

  const changedKeys = Object.keys(patch).filter((k) => k !== "googlePlacesExtras" && k !== "tags" && k !== "description");
  const extrasChanged = JSON.stringify(nextExtras) !== JSON.stringify(prevExtras);
  const tagsChanged = patch.tags != null;
  const descChanged = patch.description != null;
  if (!changedKeys.length && !extrasChanged && !tagsChanged && !descChanged) return false;

  await db.update(mapBusinessesTable).set(patch).where(eq(mapBusinessesTable.id, existing.id));
  if (photos.length) await insertImportImages(existing.id, photos);
  return true;
}

export type InsaatfirmalarimImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  samples: InsaatfirmalarimScrapedFirm[];
};

export async function importInsaatfirmalarimFirm(
  firm: InsaatfirmalarimScrapedFirm,
  opts: { maxToImport?: number; currentTotal?: number } = {},
): Promise<{ imported: number; updated: number; skipped: number; error?: string }> {
  const cap = opts.maxToImport != null && opts.maxToImport > 0 ? opts.maxToImport : Number.POSITIVE_INFINITY;
  const used = opts.currentTotal ?? 0;
  if (used >= cap) return { imported: 0, updated: 0, skipped: 0 };

  try {
    if (!firm.name?.trim()) return { imported: 0, updated: 0, skipped: 1 };

    const existing = await findExistingFirm(firm);
    if (existing) {
      if (await backfillExistingFirm(existing, firm)) {
        return { imported: 0, updated: 1, skipped: 0 };
      }
      return { imported: 0, updated: 0, skipped: 1 };
    }

    const importCity = firm.listCityLabel?.trim() || firm.city?.trim() || null;
    const cityId = importCity ? await resolveMapCityId(importCity) : null;
    const districtId = firm.district ? await resolveMapDistrictId(firm.district, cityId) : null;
    const slug = await uniqueSlug(firm.name, firm.sourceId);
    const photos = firm.photoUrl ? [firm.photoUrl] : [];
    const tags = buildImportTags(firm);
    const extras = buildImportExtras(firm);
    const description =
      appendResponsibleToDescription(firm.seoDescription || firm.aboutText || null, firm.responsiblePerson) ??
      firm.seoDescription ??
      firm.aboutText ??
      null;

    const inserted = await db
      .insert(mapBusinessesTable)
      .values({
        googlePlaceId: firm.sourceId,
        importSource: IMPORT_SOURCE,
        slug,
        name: firm.name.trim(),
        cityId,
        districtId,
        address: firm.address || null,
        phone: firm.phone || null,
        email: firm.email || null,
        website: firm.website || null,
        description,
        latitude: firm.latitude,
        longitude: firm.longitude,
        photoUrl: photos[0] || null,
        coverPhotoUrl: photos[0] || null,
        scrapedPhotos: photos.length > 0 ? (photos as unknown as Record<string, unknown>) : null,
        googlePlacesExtras: extras as unknown as Record<string, unknown>,
        homepageSuperCategory: firm.homepageSuperCategory,
        storeType: firm.storeType,
        tags,
        isActive: true,
        isPremium: false,
        scrapedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: mapBusinessesTable.id });

    if (inserted.length > 0) {
      await insertImportImages(inserted[0]!.id, photos);
      return { imported: 1, updated: 0, skipped: 0 };
    }
    return { imported: 0, updated: 0, skipped: 1 };
  } catch (err) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      error: `${firm.name}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 220),
    };
  }
}

export async function importInsaatfirmalarimFirms(
  firms: InsaatfirmalarimScrapedFirm[],
  opts: { maxToImport?: number } = {},
): Promise<InsaatfirmalarimImportResult> {
  const maxToImport = opts.maxToImport != null && opts.maxToImport > 0 ? opts.maxToImport : firms.length;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const samples: InsaatfirmalarimScrapedFirm[] = [];

  for (const firm of firms) {
    if (imported + updated >= maxToImport) break;
    const row = await importInsaatfirmalarimFirm(firm, { maxToImport, currentTotal: imported + updated });
    imported += row.imported;
    updated += row.updated;
    skipped += row.skipped;
    if (row.error) errors.push(row.error);
    if ((row.imported || row.updated) && samples.length < 5) samples.push(firm);
  }

  return { imported, updated, skipped, errors, samples };
}
