import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import {
  adSlotsTable,
  authorsTable,
  db,
  hmMakalelerTable,
  hmNewsSitesTable,
  newsTable,
  photoGalleryItemsTable,
  photoGalleriesTable,
  portalRssItemsTable,
  resmiIlanlarTable,
  siteSettingsTable,
} from "@workspace/db";
import { getMediaUploadRoot } from "./mediaUploadRoot";
import {
  downloadExternalImageToMedia,
  mediaObjectExists,
  publicUploadPath,
} from "./mediaUploadService";
import { logger } from "./logger";

const UPLOAD_PATH_RE = /\/api\/media\/uploads\/([a-zA-Z0-9._-]+)/g;
const HTTP_IMAGE_RE = /https?:\/\/[^\s"'<>)\]]+/gi;

export type MediaMigrateScope =
  | "news"
  | "authors"
  | "settings"
  | "hm"
  | "ads"
  | "galleries"
  | "rss"
  | "all";

export type MediaMigrateResult = {
  dryRun: boolean;
  importedFiles: number;
  updatedRows: number;
  skipped: number;
  failed: number;
  details: Array<{ table: string; id: number | string; from: string; to?: string; ok: boolean; error?: string }>;
};

/** Eksik dosya için opsiyonel dış origin — Railway varsayılanı yok. */
function legacyMediaOrigin(): string | null {
  const raw = process.env.LEGACY_MEDIA_ORIGIN;
  if (raw == null) return null;
  const t = raw.trim();
  if (!t || t === "0" || t === "false" || t === "off") return null;
  return t.replace(/\/+$/, "");
}

export function parseUploadFname(url: string): string | null {
  const m = String(url ?? "").match(/\/api\/media\/uploads\/([a-zA-Z0-9._-]+)/);
  return m?.[1] ?? null;
}

async function writeExactLocalFile(fname: string, buf: Buffer): Promise<void> {
  const root = getMediaUploadRoot();
  await mkdir(root, { recursive: true });
  await writeFile(join(root, fname), buf);
}

/** Eksik `/api/media/uploads/…` dosyasını legacy Railway veya canlı vekilden diske kopyalar. */
export async function importMissingUploadFile(fname: string): Promise<boolean> {
  if (!fname || fname.includes("..")) return false;
  if (await mediaObjectExists(fname)) return true;

  const legacy = legacyMediaOrigin();
  // Sadece açıkça verilen legacy origin. Railway / yekpare.net adayı yok.
  const candidates = legacy ? [`${legacy}/api/media/uploads/${fname}`] : [];

  if (!candidates.length) {
    logger.info({ fname }, "[media-migrate] no LEGACY_MEDIA_ORIGIN — skip remote import");
    return false;
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(25_000),
        headers: { Accept: "image/*,*/*;q=0.8" },
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) continue;
      await writeExactLocalFile(fname, buf);
      logger.info({ fname, url, bytes: buf.length }, "[media-migrate] legacy import ok");
      return true;
    } catch (e) {
      logger.warn({ err: e, fname, url }, "[media-migrate] legacy import attempt failed");
    }
  }
  return false;
}

/** Tek URL'yi site diskine taşır; zaten yereldeyse aynı yolu döner. */
export async function mirrorMediaUrlToDisk(
  raw: string,
  opts?: { title?: string; hashSeed?: string },
): Promise<string | null> {
  const url = String(raw ?? "").trim();
  if (!url) return null;

  const fname = parseUploadFname(url);
  if (fname) {
    if (await mediaObjectExists(fname)) return publicUploadPath(fname);
    const ok = await importMissingUploadFile(fname);
    return ok ? publicUploadPath(fname) : null;
  }

  if (/^https?:\/\//i.test(url)) {
    return downloadExternalImageToMedia(url, {
      title: opts?.title,
      hashSeed: opts?.hashSeed ?? url,
    });
  }

  return url.startsWith("/api/media/uploads/") ? url : null;
}

type MigrateCounters = Pick<MediaMigrateResult, "importedFiles" | "updatedRows" | "skipped" | "failed">;

async function migrateUrlField(opts: {
  table: string;
  id: number | string;
  from: string;
  dryRun: boolean;
  counters: MigrateCounters;
  details: MediaMigrateResult["details"];
}): Promise<string | null> {
  const from = opts.from.trim();
  if (!from) {
    opts.counters.skipped += 1;
    return null;
  }
  if (opts.dryRun) {
    opts.details.push({ table: opts.table, id: opts.id, from, ok: true });
    return from;
  }
  try {
    const fnameBefore = parseUploadFname(from);
    const existedBefore = fnameBefore ? await mediaObjectExists(fnameBefore) : false;
    const to = await mirrorMediaUrlToDisk(from);
    if (!to) {
      opts.counters.failed += 1;
      opts.details.push({ table: opts.table, id: opts.id, from, ok: false, error: "taşınamadı" });
      return null;
    }
    const fnameAfter = parseUploadFname(to);
    if (fnameAfter && !existedBefore && (await mediaObjectExists(fnameAfter))) {
      opts.counters.importedFiles += 1;
    }
    if (to !== from) {
      opts.counters.updatedRows += 1;
      if (opts.details.length < 200) {
        opts.details.push({ table: opts.table, id: opts.id, from, to, ok: true });
      }
    } else {
      opts.counters.skipped += 1;
    }
    return to;
  } catch (e: unknown) {
    opts.counters.failed += 1;
    if (opts.details.length < 200) {
      opts.details.push({
        table: opts.table,
        id: opts.id,
        from,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return null;
  }
}

async function migrateJsonImageUrls(raw: string, dryRun: boolean, counters: MigrateCounters): Promise<string> {
  let updated = raw;
  const urls = new Set<string>();
  for (const m of raw.matchAll(UPLOAD_PATH_RE)) urls.add(`/api/media/uploads/${m[1]}`);
  for (const m of raw.matchAll(HTTP_IMAGE_RE)) {
    const u = m[0];
    if (/\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(u)) urls.add(u);
  }
  for (const from of urls) {
    if (dryRun) continue;
    const to = await mirrorMediaUrlToDisk(from);
    if (to && to !== from) updated = updated.split(from).join(to);
  }
  if (!dryRun && updated !== raw) counters.updatedRows += 1;
  return updated;
}

export async function migrateMediaToDisk(opts: {
  limit?: number;
  dryRun?: boolean;
  scopes?: MediaMigrateScope[];
  includeExternal?: boolean;
}): Promise<MediaMigrateResult> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const dryRun = opts.dryRun === true;
  const scopes = new Set<MediaMigrateScope>(opts.scopes?.length ? opts.scopes : ["all"]);
  const all = scopes.has("all");
  const includeExternal = opts.includeExternal !== false;

  const result: MediaMigrateResult = {
    dryRun,
    importedFiles: 0,
    updatedRows: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  if (all || scopes.has("news")) {
    const where = includeExternal
      ? or(
          ilike(newsTable.imageUrl, "/api/media/uploads/%"),
          ilike(newsTable.imageUrl, "http://%"),
          ilike(newsTable.imageUrl, "https://%"),
        )
      : ilike(newsTable.imageUrl, "/api/media/uploads/%");

    const rows = await db.select({ id: newsTable.id, url: newsTable.imageUrl }).from(newsTable).where(where).limit(limit);
    for (const row of rows) {
      const to = await migrateUrlField({
        table: "news",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(newsTable).set({ imageUrl: to }).where(eq(newsTable.id, row.id));
      }
    }
  }

  if (all || scopes.has("authors")) {
    const rows = await db
      .select({ id: authorsTable.id, url: authorsTable.avatarUrl })
      .from(authorsTable)
      .where(
        or(
          ilike(authorsTable.avatarUrl, "/api/media/uploads/%"),
          ...(includeExternal
            ? [ilike(authorsTable.avatarUrl, "http://%"), ilike(authorsTable.avatarUrl, "https://%")]
            : []),
        ),
      )
      .limit(limit);

    for (const row of rows) {
      const to = await migrateUrlField({
        table: "authors",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(authorsTable).set({ avatarUrl: to }).where(eq(authorsTable.id, row.id));
      }
    }
  }

  if (all || scopes.has("settings")) {
    const [settings] = await db.select().from(siteSettingsTable).limit(1);
    if (settings) {
      const patches: Record<string, string> = {};
      if (settings.logoUrl?.trim()) {
        const to = await migrateUrlField({
          table: "site_settings.logo_url",
          id: settings.id,
          from: settings.logoUrl,
          dryRun,
          counters: result,
          details: result.details,
        });
        if (to) patches.logoUrl = to;
      }
      for (const key of ["newsLayoutJson", "homepageDesignJson"] as const) {
        const raw = settings[key];
        if (!raw?.trim()) continue;
        const next = await migrateJsonImageUrls(raw, dryRun, result);
        if (next !== raw) patches[key] = next;
      }
      if (!dryRun && Object.keys(patches).length) {
        await db.update(siteSettingsTable).set(patches).where(eq(siteSettingsTable.id, settings.id));
      }
    }
  }

  if (all || scopes.has("hm")) {
    const makaleRows = await db
      .select({ id: hmMakalelerTable.id, url: hmMakalelerTable.imageUrl })
      .from(hmMakalelerTable)
      .where(
        or(
          ilike(hmMakalelerTable.imageUrl, "/api/media/uploads/%"),
          ...(includeExternal
            ? [ilike(hmMakalelerTable.imageUrl, "http://%"), ilike(hmMakalelerTable.imageUrl, "https://%")]
            : []),
        ),
      )
      .limit(limit);

    for (const row of makaleRows) {
      const to = await migrateUrlField({
        table: "hm_makaleler",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(hmMakalelerTable).set({ imageUrl: to }).where(eq(hmMakalelerTable.id, row.id));
      }
    }

    const siteRows = await db
      .select({ id: hmNewsSitesTable.id, layoutJson: hmNewsSitesTable.layoutJson })
      .from(hmNewsSitesTable)
      .where(
        or(
          ilike(hmNewsSitesTable.layoutJson, "%/api/media/uploads/%"),
          ...(includeExternal ? [ilike(hmNewsSitesTable.layoutJson, "%http%")] : []),
        ),
      )
      .limit(50);

    for (const site of siteRows) {
      const raw = String(site.layoutJson ?? "");
      if (!raw) continue;
      const next = await migrateJsonImageUrls(raw, dryRun, result);
      if (!dryRun && next !== raw) {
        await db.update(hmNewsSitesTable).set({ layoutJson: next }).where(eq(hmNewsSitesTable.id, site.id));
      }
    }
  }

  if (all || scopes.has("ads")) {
    const slots = await db
      .select({ id: adSlotsTable.id, html: adSlotsTable.html })
      .from(adSlotsTable)
      .where(
        or(
          ilike(adSlotsTable.html, "%/api/media/uploads/%"),
          ...(includeExternal ? [ilike(adSlotsTable.html, "%http%")] : []),
        ),
      )
      .limit(50);

    for (const slot of slots) {
      const raw = String(slot.html ?? "");
      const next = await migrateJsonImageUrls(raw, dryRun, result);
      if (!dryRun && next !== raw) {
        await db.update(adSlotsTable).set({ html: next }).where(eq(adSlotsTable.id, slot.id));
      }
    }
  }

  if (all || scopes.has("galleries")) {
    const galleryItems = await db
      .select({ id: photoGalleryItemsTable.id, url: photoGalleryItemsTable.imageUrl })
      .from(photoGalleryItemsTable)
      .where(
        or(
          ilike(photoGalleryItemsTable.imageUrl, "/api/media/uploads/%"),
          ...(includeExternal
            ? [ilike(photoGalleryItemsTable.imageUrl, "http://%"), ilike(photoGalleryItemsTable.imageUrl, "https://%")]
            : []),
        ),
      )
      .limit(limit);

    for (const row of galleryItems) {
      const to = await migrateUrlField({
        table: "photo_gallery_items",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(photoGalleryItemsTable).set({ imageUrl: to }).where(eq(photoGalleryItemsTable.id, row.id));
      }
    }

    const galleryCovers = await db
      .select({ id: photoGalleriesTable.id, url: photoGalleriesTable.coverImage })
      .from(photoGalleriesTable)
      .where(
        or(
          ilike(photoGalleriesTable.coverImage, "/api/media/uploads/%"),
          ...(includeExternal
            ? [ilike(photoGalleriesTable.coverImage, "http://%"), ilike(photoGalleriesTable.coverImage, "https://%")]
            : []),
        ),
      )
      .limit(limit);

    for (const row of galleryCovers) {
      const to = await migrateUrlField({
        table: "photo_galleries",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(photoGalleriesTable).set({ coverImage: to }).where(eq(photoGalleriesTable.id, row.id));
      }
    }

    const ilanRows = await db
      .select({ id: resmiIlanlarTable.id, url: resmiIlanlarTable.imageUrl })
      .from(resmiIlanlarTable)
      .where(
        or(
          ilike(resmiIlanlarTable.imageUrl, "/api/media/uploads/%"),
          ...(includeExternal
            ? [ilike(resmiIlanlarTable.imageUrl, "http://%"), ilike(resmiIlanlarTable.imageUrl, "https://%")]
            : []),
        ),
      )
      .limit(limit);

    for (const row of ilanRows) {
      const to = await migrateUrlField({
        table: "resmi_ilanlar",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(resmiIlanlarTable).set({ imageUrl: to }).where(eq(resmiIlanlarTable.id, row.id));
      }
    }
  }

  if ((all || scopes.has("rss")) && includeExternal) {
    const rssRows = await db
      .select({ id: portalRssItemsTable.id, url: portalRssItemsTable.imageUrl })
      .from(portalRssItemsTable)
      .where(or(ilike(portalRssItemsTable.imageUrl, "http://%"), ilike(portalRssItemsTable.imageUrl, "https://%")))
      .limit(limit);

    for (const row of rssRows) {
      const to = await migrateUrlField({
        table: "portal_rss_items",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(portalRssItemsTable).set({ imageUrl: to }).where(eq(portalRssItemsTable.id, row.id));
      }
    }

    const rssNews = await db
      .select({ id: newsTable.id, url: newsTable.imageUrl })
      .from(newsTable)
      .where(
        and(
          sql`${newsTable.tags}::text ILIKE '%rss%'`,
          or(ilike(newsTable.imageUrl, "http://%"), ilike(newsTable.imageUrl, "https://%")),
        ),
      )
      .limit(limit);

    for (const row of rssNews) {
      const to = await migrateUrlField({
        table: "news_rss",
        id: row.id,
        from: String(row.url ?? ""),
        dryRun,
        counters: result,
        details: result.details,
      });
      if (!dryRun && to) {
        await db.update(newsTable).set({ imageUrl: to }).where(eq(newsTable.id, row.id));
      }
    }
  }

  return result;
}
