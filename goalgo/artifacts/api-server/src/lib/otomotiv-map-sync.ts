/** otomotiv_businesses → map_businesses (Sarı Sayfalar + Haritalar) */

import { db } from "@workspace/db";
import { mapBusinessesTable, mapCategoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import { findOtomotivServiceCategoryBySlug } from "../data/otomotiv-service-categories-data.js";

const OTOMOTIV_CATEGORY_SLUG = "otomotiv";

const BUSINESS_TYPE_STORE: Record<string, string> = {
  galeri: "otomotiv_galeri",
  yedek_parca: "otomotiv_yedek_parca",
  cikma: "otomotiv_cikma",
  servis: "otomotiv_servis_ozel",
  yikama: "otomotiv_yikama",
  lastik: "otomotiv_lastik",
  genel: "otomotiv_genel",
};

let cachedOtomotivCategoryId: string | null | undefined;

async function resolveOtomotivCategoryId(): Promise<string | null> {
  if (cachedOtomotivCategoryId !== undefined) return cachedOtomotivCategoryId;
  const rows = await db
    .select({ id: mapCategoriesTable.id })
    .from(mapCategoriesTable)
    .where(eq(mapCategoriesTable.slug, OTOMOTIV_CATEGORY_SLUG))
    .limit(1);
  cachedOtomotivCategoryId = rows[0]?.id ?? null;
  return cachedOtomotivCategoryId;
}

type OtomotivBizRow = {
  id: number;
  map_business_id?: string | null;
  name: string;
  slug: string;
  business_type: string;
  servis_category_slug?: string | null;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  address?: string | null;
  image_url?: string | null;
  description?: string | null;
  google_place_id?: string | null;
  is_featured?: boolean | null;
  status: string;
};

function storeTypeFor(businessType: string, servisCategorySlug?: string | null): string {
  if (businessType === "servis" && servisCategorySlug) {
    const hit = findOtomotivServiceCategoryBySlug(servisCategorySlug);
    if (hit) return hit.category.storeType;
  }
  return BUSINESS_TYPE_STORE[businessType] ?? "otomotiv_genel";
}

export async function syncOtomotivBusinessToMap(biz: OtomotivBizRow): Promise<string | null> {
  if (biz.status !== "active") {
    if (biz.map_business_id) {
      await db
        .update(mapBusinessesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(mapBusinessesTable.id, biz.map_business_id));
    }
    return biz.map_business_id ?? null;
  }

  try {
    const categoryId = await resolveOtomotivCategoryId();
    const storeType = storeTypeFor(biz.business_type, biz.servis_category_slug);
    const importSlug = `otomotiv-${biz.business_type}`;

    const linkId = String(biz.map_business_id ?? "").trim();
    const byLink = linkId
      ? await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.id, linkId)).limit(1)
      : [];
    const bySlug =
      byLink.length > 0
        ? []
        : await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, biz.slug)).limit(1);
    const existing = byLink[0] ?? bySlug[0];

    let mapBusinessId: string;
    const common = {
      name: biz.name,
      description: biz.description ?? undefined,
      address: biz.address ?? ([biz.district, biz.city].filter(Boolean).join(", ") || undefined),
      phone: biz.phone ?? undefined,
      photoUrl: biz.image_url ?? undefined,
      coverPhotoUrl: biz.image_url ?? undefined,
      storeType,
      homepageSuperCategory: "hizmet" as const,
      categoryId: categoryId ?? undefined,
      googlePlaceId: biz.google_place_id ?? undefined,
      isPremium: Boolean(biz.is_featured),
      homepageFeatured: Boolean(biz.is_featured),
      isActive: true,
      importSource: "otomotiv" as const,
      updatedAt: new Date(),
    };

    if (existing) {
      mapBusinessId = existing.id;
      await db.update(mapBusinessesTable).set({
        ...common,
        googlePlacesExtras: {
          otomotivBusinessId: biz.id,
          importWorkflow: { category: { slug: importSlug, label: "Otomotiv" } },
        },
        tags: [OTOMOTIV_CATEGORY_SLUG, importSlug],
      }).where(eq(mapBusinessesTable.id, existing.id));
    } else {
      const [ins] = await db
        .insert(mapBusinessesTable)
        .values({
          slug: biz.slug,
          ...common,
          googlePlacesExtras: {
            otomotivBusinessId: biz.id,
            importWorkflow: { category: { slug: importSlug, label: "Otomotiv" } },
          },
          tags: [OTOMOTIV_CATEGORY_SLUG, importSlug],
        })
        .returning({ id: mapBusinessesTable.id });
      if (!ins?.id) return null;
      mapBusinessId = ins.id;
    }

    const prevLink = String(biz.map_business_id ?? "").trim();
    if (prevLink !== mapBusinessId) {
      await db.execute(sql`
        UPDATE otomotiv_businesses
        SET map_business_id = ${mapBusinessId}, updated_at = NOW()
        WHERE id = ${biz.id}
      `);
    }

    return mapBusinessId;
  } catch {
    return biz.map_business_id ?? null;
  }
}

/** Deploy / restart sonrası tüm aktif otomotiv işletmelerini haritaya hizala */
export async function resyncAllOtomotivToMap(logger?: { info: (o: object, msg?: string) => void }): Promise<number> {
  const r = await db.execute(sql`
    SELECT id, map_business_id, name, slug, business_type, servis_category_slug, city, district, phone, address,
           image_url, description, google_place_id, is_featured, status
    FROM otomotiv_businesses
    WHERE status IN ('active', 'inactive', 'pending')
  `);
  let synced = 0;
  for (const row of r.rows as OtomotivBizRow[]) {
    await syncOtomotivBusinessToMap(row);
    synced += 1;
  }
  logger?.info({ synced }, "otomotiv→map resync (boot)");
  return synced;
}
