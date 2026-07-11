import { mirrorMediaUrlToDisk } from "./mediaBulkMigrate.js";
import type { PortalRssItem } from "./portal-rss-fetch.js";
import { logger } from "./logger.js";

export function isPortalRssMirrorImagesEnabled(): boolean {
  return process.env.PORTAL_RSS_MIRROR_IMAGES?.trim() !== "0";
}

export function isLocalMediaUploadUrl(url: string | null | undefined): boolean {
  const v = String(url ?? "").trim();
  return v.startsWith("/api/media/uploads/");
}

export function isExternalRssImageUrl(url: string | null | undefined): boolean {
  return /^https?:\/\//i.test(String(url ?? "").trim());
}

export async function mirrorRssImportImageUrl(
  imageUrl: string | null | undefined,
  title: string,
): Promise<string | null> {
  const raw = String(imageUrl ?? "").trim();
  if (!raw) return null;
  if (!isPortalRssMirrorImagesEnabled()) return raw;
  if (isLocalMediaUploadUrl(raw)) return raw;
  if (!isExternalRssImageUrl(raw)) return raw;
  try {
    const mirrored = await mirrorMediaUrlToDisk(raw, { title, hashSeed: raw });
    return mirrored ?? raw;
  } catch (e) {
    logger.warn({ err: e, imageUrl: raw, title }, "[portal-rss] image mirror failed");
    return raw;
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    for (;;) {
      const idx = next;
      next += 1;
      if (idx >= items.length) return;
      await fn(items[idx]!, idx);
    }
  });
  await Promise.all(workers);
}

export async function mirrorPortalRssItemsImages(
  items: PortalRssItem[],
  opts?: { concurrency?: number },
): Promise<PortalRssItem[]> {
  if (!isPortalRssMirrorImagesEnabled() || items.length === 0) return items;
  const concurrency = Math.min(6, Math.max(1, opts?.concurrency ?? 4));
  const out = items.map((item) => ({ ...item }));
  await mapWithConcurrency(out, concurrency, async (item) => {
    const raw = String(item.imageUrl ?? "").trim();
    if (!raw || isLocalMediaUploadUrl(raw) || !isExternalRssImageUrl(raw)) return;
    const mirrored = await mirrorRssImportImageUrl(raw, item.title);
    if (mirrored) item.imageUrl = mirrored;
  });
  return out;
}
