import { db } from "@workspace/db";
import { vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { syncVendorToMapBusiness } from "./vendor-map-sync.js";
import { ensureMapVendorGoogleColumns } from "./map-vendor-google.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueVendorSlug(base: string): Promise<string> {
  let slug = (base || "isletme").slice(0, 80) || "isletme";
  let n = 1;
  while (true) {
    const ex = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.slug, slug)).limit(1);
    if (ex.length === 0) return slug;
    slug = `${base}-${++n}`.slice(0, 90);
    if (n > 500) return `${base}-${Date.now().toString(36)}`.slice(0, 90);
  }
}

export type VendorJsonImportRow = {
  name: string;
  slug?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  googlePlaceId?: string | null;
  /** gmaps_scrape | places_api | manual | osm */
  googleImportKind?: string | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
};

function normImportKind(k: string | null | undefined): "gmaps_scrape" | "places_api" | "manual" | "osm" | null {
  const v = String(k || "").trim().toLowerCase();
  if (v === "gmaps_scrape" || v === "places_api" || v === "manual" || v === "osm") return v;
  return null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Yemeksepeti / Aladdin / dış JSON dışa aktarımlarında sık görülen alan adlarını standart satıra çevirir. */
export function normalizeVendorJsonRow(raw: unknown): VendorJsonImportRow | null {
  if (!raw || typeof raw !== "object") return null;
  let o = raw as Record<string, unknown>;
  if (o.restaurant && typeof o.restaurant === "object") {
    o = { ...o, ...(o.restaurant as Record<string, unknown>) };
  }
  if (o.data && typeof o.data === "object") {
    o = { ...o, ...(o.data as Record<string, unknown>) };
  }
  const name = pickStr(o, [
    "name",
    "restaurantName",
    "restaurant_name",
    "restoranAdi",
    "restoran_adi",
    "businessName",
    "business_name",
    "title",
    "branchName",
    "branch_name",
    "displayName",
    "İşletme Adı",
    "isletme_adi",
  ]);
  if (!name) return null;
  const address = pickStr(o, ["address", "fullAddress", "full_address", "adres", "streetAddress", "street_address"]);
  const city = pickStr(o, ["city", "il", "province", "sehir"]);
  const district = pickStr(o, ["district", "ilce", "ilçe", "ilce", "county", "town"]);
  const mahalle = pickStr(o, ["neighborhood", "mahalle", "quarter", "area"]);
  const mergedAddr = [mahalle, address].filter(Boolean).join(", ").trim() || address || undefined;
  const phone = pickStr(o, ["phone", "telefon", "Telefon", "gsm", "mobile", "contactPhone", "contact_phone"]);
  const email = pickStr(o, ["email", "e_mail", "eposta"]);
  const website = pickStr(o, ["website", "web", "url", "restaurantUrl", "restaurant_url"]);
  let lat = numOrNull(o.lat ?? o.latitude ?? o.enlem);
  let lng = numOrNull(o.lng ?? o.longitude ?? o.boylam);
  const coord = o.coordinates ?? o.location ?? o.geo;
  if ((lat == null || lng == null) && coord && typeof coord === "object") {
    const c = coord as Record<string, unknown>;
    lat = lat ?? numOrNull(c.lat ?? c.latitude);
    lng = lng ?? numOrNull(c.lng ?? c.longitude);
  }
  const googlePlaceId = pickStr(o, ["googlePlaceId", "google_place_id", "placeId", "place_id", "googlePlaceID"]);
  const googleImportKind = pickStr(o, ["googleImportKind", "google_import_kind", "importKind", "source"]) || undefined;
  const imageUrl = pickStr(o, ["imageUrl", "image_url", "logoUrl", "logo_url", "photo", "image"]);
  const coverUrl = pickStr(o, ["coverUrl", "cover_url", "bannerUrl", "banner_url"]);
  const descBase = pickStr(o, ["description", "aciklama", "açıklama", "about"]);
  const minOrder = pickStr(o, ["minOrder", "min_order", "minimumOrder", "min_delivery"]);
  const rating = numOrNull(o.rating ?? o.score);
  const extraBits = [minOrder ? `Min. sipariş: ${minOrder}` : "", rating != null ? `Puan: ${rating}` : ""].filter(Boolean);
  const description = [descBase, ...extraBits].filter(Boolean).join("\n") || undefined;
  return {
    name,
    slug: pickStr(o, ["slug"]) || undefined,
    address: mergedAddr,
    city: city || undefined,
    district: district || undefined,
    phone: phone || undefined,
    email: email || undefined,
    website: website || undefined,
    description,
    lat,
    lng,
    googlePlaceId: googlePlaceId || undefined,
    googleImportKind: googleImportKind || undefined,
    imageUrl: imageUrl || undefined,
    coverUrl: coverUrl || undefined,
  };
}

/**
 * Teslimat vendor listesi için toplu içe aktarma (Excel → JSON çıktısından).
 * Her kayıt sonrası `syncVendorToMapBusiness` ile harita / Keşfet premium kaydı güncellenir.
 */
export async function importDeliveryVendorsFromJson(
  rawItems: unknown[],
  opts?: { syncMap?: boolean },
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  await ensureMapVendorGoogleColumns();
  const syncMap = opts?.syncMap !== false;
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  const items = Array.isArray(rawItems) ? rawItems : [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") {
      skipped++;
      continue;
    }
    const row = normalizeVendorJsonRow(raw) ?? (raw as VendorJsonImportRow);
    const name = String(row.name || "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    try {
      const baseSlug = slugify(String(row.slug || "").trim() || name);
      const slug = await uniqueVendorSlug(baseSlug);

      const lat = row.lat != null && Number.isFinite(Number(row.lat)) ? Number(row.lat) : null;
      const lng = row.lng != null && Number.isFinite(Number(row.lng)) ? Number(row.lng) : null;
      const gid = row.googlePlaceId?.trim() || null;
      const importKind = normImportKind(row.googleImportKind);
      const w = row.website?.trim();

      const descParts = [row.description?.trim()].filter(Boolean) as string[];
      if (w) descParts.push(`Web: ${w}`);
      const description = descParts.length ? descParts.join("\n\n") : undefined;

      const [vRow] = await db
        .insert(vendorsTable)
        .values({
          name,
          slug,
          description,
          phone: row.phone?.trim() || undefined,
          email: row.email?.trim() || undefined,
          address: row.address?.trim() || undefined,
          city: row.city?.trim() || undefined,
          district: row.district?.trim() || undefined,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          imageUrl: row.imageUrl?.trim() || undefined,
          coverUrl: row.coverUrl?.trim() || row.imageUrl?.trim() || undefined,
          vendorType: "delivery",
          rating: 0,
          reviewCount: 0,
          isOpen: true,
          featured: false,
          active: true,
          status: "active",
          googlePlaceId: gid?.startsWith("osm_") ? null : gid || null,
          googleImportKind: importKind,
          catalogMenuGap: true,
          catalogContactGap: !row.phone?.trim() && !row.email?.trim() && !w,
        })
        .returning();

      if (!vRow) {
        skipped++;
        continue;
      }
      if (syncMap) {
        const [full] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vRow.id)).limit(1);
        if (full) await syncVendorToMapBusiness(full);
      }
      inserted++;
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 220));
    }
  }

  return { inserted, skipped, errors };
}
