import { db } from "@workspace/db";
import {
  vendorsTable,
  vendorMenuItemsTable,
  mapBusinessesTable,
  mapProductsTable,
} from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
const VENDOR_MENU_MAP_CATEGORY = "__vendor_menu__";

function storeAndSuperForVendor(vendor: typeof vendorsTable.$inferSelect): { storeType: string; superCat: string } {
  if (vendor.vendorType === "delivery") return { storeType: "siparis", superCat: "siparis" };
  if (vendor.vendorType === "ecommerce") return { storeType: "alisveris", superCat: "alisveris" };
  if (vendor.vendorType === "turizm") return { storeType: "turizm", superCat: "turizm" };
  if (vendor.vendorType === "ulasim") return { storeType: "ulasim", superCat: "ulasim" };
  return { storeType: "alisveris", superCat: "alisveris" };
}

export async function syncVendorToMapBusiness(vendor: typeof vendorsTable.$inferSelect): Promise<void> {
  try {
    const { storeType, superCat } = storeAndSuperForVendor(vendor);

    const linkId = vendor.linkedMapBusinessId?.trim();
    const byLink = linkId
      ? await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.id, linkId)).limit(1)
      : [];
    const bySlug =
      byLink.length > 0
        ? []
        : await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, vendor.slug)).limit(1);
    const existing = byLink[0] ?? bySlug[0];

    let mapBusinessId: string;
    if (existing) {
      mapBusinessId = existing.id;
      await db.update(mapBusinessesTable).set({
        name: vendor.name,
        description: vendor.description ?? undefined,
        address: vendor.address ?? undefined,
        phone: vendor.phone ?? undefined,
        latitude: vendor.lat != null ? Number(vendor.lat) : undefined,
        longitude: vendor.lng != null ? Number(vendor.lng) : undefined,
        photoUrl: vendor.imageUrl ?? undefined,
        coverPhotoUrl: vendor.coverUrl ?? undefined,
        rating: vendor.rating != null ? Number(vendor.rating) : undefined,
        storeType,
        homepageSuperCategory: superCat,
        isPremium: Boolean(vendor.featured),
        homepageFeatured: vendor.featured,
        isActive: vendor.active,
        hasOnlineOrder: vendor.vendorType === "delivery" || vendor.vendorType === "ecommerce",
        hasDelivery: vendor.vendorType === "delivery",
        ...(linkId ? {} : { slug: vendor.slug }),
        updatedAt: new Date(),
      }).where(eq(mapBusinessesTable.id, existing.id));
    } else {
      const [ins] = await db.insert(mapBusinessesTable).values({
        slug: vendor.slug,
        name: vendor.name,
        description: vendor.description ?? undefined,
        address: (vendor.address ?? [vendor.city, vendor.district].filter(Boolean).join(", ")) || undefined,
        phone: vendor.phone ?? undefined,
        latitude: vendor.lat != null ? Number(vendor.lat) : undefined,
        longitude: vendor.lng != null ? Number(vendor.lng) : undefined,
        photoUrl: vendor.imageUrl ?? undefined,
        coverPhotoUrl: vendor.coverUrl ?? undefined,
        rating: vendor.rating != null ? Number(vendor.rating) : undefined,
        storeType,
        homepageSuperCategory: superCat,
        isPremium: Boolean(vendor.featured),
        homepageFeatured: vendor.featured,
        isActive: vendor.active,
        hasOnlineOrder: vendor.vendorType === "delivery" || vendor.vendorType === "ecommerce",
        hasDelivery: vendor.vendorType === "delivery",
      }).returning({ id: mapBusinessesTable.id });
      if (!ins?.id) return;
      mapBusinessId = ins.id;
    }

    const menuRows = await db.select().from(vendorMenuItemsTable)
      .where(eq(vendorMenuItemsTable.vendorId, vendor.id))
      .orderBy(asc(vendorMenuItemsTable.id));
    await db.delete(mapProductsTable).where(and(eq(mapProductsTable.businessId, mapBusinessId), eq(mapProductsTable.category, VENDOR_MENU_MAP_CATEGORY)));
    let sort = 0;
    for (const it of menuRows) {
      if (!it.active) continue;
      const price = it.price != null ? Number.parseFloat(String(it.price).replace(",", ".")) : 0;
      const disc = it.salePrice != null ? Number.parseFloat(String(it.salePrice).replace(",", ".")) : null;
      await db.insert(mapProductsTable).values({
        businessId: mapBusinessId,
        name: it.name,
        description: it.description ?? undefined,
        price: Number.isFinite(price) ? price : 0,
        discountedPrice: disc != null && Number.isFinite(disc) ? disc : undefined,
        imageUrl: it.imageUrl ?? undefined,
        category: VENDOR_MENU_MAP_CATEGORY,
        isAvailable: true,
        isDeliverable: true,
        sortOrder: sort++,
      });
    }

    /** Çift yönlü bağ: Keşfet `map_businesses` kaynağı; vendor tek gerçek kaynak olunca link zorunlu. */
    const prevLink = vendor.linkedMapBusinessId?.trim() ?? "";
    if (prevLink !== mapBusinessId) {
      await db
        .update(vendorsTable)
        .set({ linkedMapBusinessId: mapBusinessId, updatedAt: new Date() })
        .where(eq(vendorsTable.id, vendor.id));
    }
  } catch {
    /* senkron hatası ana akışı bozmasın */
  }
}

/** Deploy / restart sonrası tüm vendor’ları harita + Keşfet ürünleriyle hizala */
export async function resyncAllVendorsToMap(logger?: { info: (o: object, msg?: string) => void }): Promise<number> {
  const rows = await db.select().from(vendorsTable).limit(5000);
  for (const v of rows) {
    await syncVendorToMapBusiness(v);
  }
  logger?.info({ synced: rows.length }, "vendor→map resync (boot)");
  return rows.length;
}
