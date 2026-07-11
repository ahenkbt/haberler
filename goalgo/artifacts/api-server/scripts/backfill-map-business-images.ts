/**
 * Öncelikli kategorilerdeki harita işletmelerinin kapak görsellerini sunucuya indirir.
 *
 * Kullanım:
 *   pnpm --filter @workspace/api-server backfill:map-business-images
 *   pnpm --filter @workspace/api-server backfill:map-business-images -- --limit=200
 *   pnpm --filter @workspace/api-server backfill:map-business-images -- --dry-run
 */
import { db, mapBusinessesTable, mapBusinessImagesTable } from "@workspace/db";
import { and, asc, eq, or, sql } from "drizzle-orm";
import {
  cacheExternalImageToMedia,
  isExternalHotlinkUrl,
  isLocalCachedMediaUrl,
  shouldCacheMapBusinessImage,
} from "../src/lib/map-scraped-image-cache.js";

function argValue(flag: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const PRIORITY_SUPER_SQL = sql`lower(COALESCE(${mapBusinessesTable.homepageSuperCategory}, '')) IN (
  'siparis','yiyecek','market','alisveris','hizmet','servis','turizm','seyahat','rentacar','arac','ulasim'
)`;

async function main(): Promise<void> {
  const limit = Math.min(2000, Math.max(1, Number(argValue("--limit") || "500") || 500));
  const dryRun = hasFlag("--dry-run");
  const onlyFeatured = hasFlag("--featured-only");

  const conditions = [
    eq(mapBusinessesTable.isActive, true),
    or(
      PRIORITY_SUPER_SQL,
      eq(mapBusinessesTable.homepageFeatured, true),
      sql`COALESCE(${mapBusinessesTable.storeType}, '') ILIKE '%restoran%'`,
      sql`COALESCE(${mapBusinessesTable.storeType}, '') ILIKE '%market%'`,
    )!,
    or(
      sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.photoUrl}, '')), '') IS NOT NULL`,
      sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.coverPhotoUrl}, '')), '') IS NOT NULL`,
    )!,
    or(
      sql`COALESCE(${mapBusinessesTable.photoUrl}, '') NOT LIKE '/api/media/%'`,
      sql`COALESCE(${mapBusinessesTable.coverPhotoUrl}, '') NOT LIKE '/api/media/%'`,
    )!,
  ];
  if (onlyFeatured) {
    conditions.push(eq(mapBusinessesTable.homepageFeatured, true));
  }

  const rows = await db
    .select({
      id: mapBusinessesTable.id,
      name: mapBusinessesTable.name,
      photoUrl: mapBusinessesTable.photoUrl,
      coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
      homepageSuperCategory: mapBusinessesTable.homepageSuperCategory,
      storeType: mapBusinessesTable.storeType,
      homepageFeatured: mapBusinessesTable.homepageFeatured,
    })
    .from(mapBusinessesTable)
    .where(and(...conditions))
    .orderBy(descUpdatedFirst())
    .limit(limit);

  let scanned = 0;
  let cached = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    scanned++;
    const meta = {
      homepageSuperCategory: row.homepageSuperCategory,
      storeType: row.storeType,
      homepageFeatured: row.homepageFeatured,
    };
    if (!shouldCacheMapBusinessImage(meta)) {
      skipped++;
      continue;
    }

    const coverCandidate = String(row.coverPhotoUrl ?? row.photoUrl ?? "").trim();
    if (!coverCandidate || isLocalCachedMediaUrl(coverCandidate)) {
      skipped++;
      continue;
    }
    if (!isExternalHotlinkUrl(coverCandidate)) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${row.name} ← ${coverCandidate.slice(0, 96)}`);
      cached++;
      continue;
    }

    const localUrl = await cacheExternalImageToMedia(coverCandidate);
    if (!localUrl) {
      failed++;
      console.warn(`[fail] ${row.name}`);
      continue;
    }

    await db
      .update(mapBusinessesTable)
      .set({
        photoUrl: localUrl,
        coverPhotoUrl: localUrl,
        updatedAt: new Date(),
      })
      .where(eq(mapBusinessesTable.id, row.id));

    const [primaryImage] = await db
      .select({ id: mapBusinessImagesTable.id, imageUrl: mapBusinessImagesTable.imageUrl })
      .from(mapBusinessImagesTable)
      .where(eq(mapBusinessImagesTable.businessId, row.id))
      .orderBy(asc(mapBusinessImagesTable.sortOrder))
      .limit(1);

    if (primaryImage?.id) {
      await db
        .update(mapBusinessImagesTable)
        .set({ imageUrl: localUrl })
        .where(eq(mapBusinessImagesTable.id, primaryImage.id));
    } else {
      await db
        .insert(mapBusinessImagesTable)
        .values({ businessId: row.id, imageUrl: localUrl, sortOrder: 0, isPrimary: true })
        .onConflictDoNothing()
        .catch(() => {});
    }

    cached++;
    console.log(`[ok] ${row.name} → ${localUrl}`);
  }

  console.log(JSON.stringify({ scanned, cached, skipped, failed, dryRun }, null, 2));
}

function descUpdatedFirst() {
  return sql`${mapBusinessesTable.updatedAt} DESC`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
