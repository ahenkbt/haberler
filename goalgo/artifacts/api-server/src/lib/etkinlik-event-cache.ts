/**
 * Etkinlik.io detay önbelleği — liste/API/scrape birleşimi.
 */
import { db } from "@workspace/db";
import { etkinlikEventCacheTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import type { EtkinlikEventDetail, EtkinlikEventItem } from "./etkinlik-io.js";
import {
  buildEtkinlikPublicUrl,
  scrapeEtkinlikEventPage,
  scrapedDescriptionThin,
  type ScrapedEtkinlikEvent,
} from "./etkinlik-page-scraper.js";
import { resolveEtkinlikVenueMapLinks, type EtkinlikVenueMapLinks } from "./etkinlik-venue-map-sync.js";

const SCRAPE_STALE_MS = 7 * 24 * 60 * 60_000;

export type EtkinlikEventDetailResponse = EtkinlikEventDetail & EtkinlikVenueMapLinks & {
  configured: boolean;
  source: "cache" | "api" | "scrape" | "mixed";
  enriching: boolean;
  configHint: string | null;
};

type CacheRow = typeof etkinlikEventCacheTable.$inferSelect;

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function rowToDetail(row: CacheRow): EtkinlikEventDetail {
  return {
    id: row.etkinlikId,
    name: row.title,
    slug: row.slug,
    url: row.externalUrl,
    description: row.description,
    descriptionHtml: row.descriptionHtml,
    startAt: row.startAt ? row.startAt.toISOString() : null,
    endAt: row.endAt ? row.endAt.toISOString() : null,
    timezone: row.timezone ?? "Europe/Istanbul",
    isFree: row.isFree ?? false,
    posterUrl: row.posterUrl,
    imageUrls: asStringArray(row.imageUrls),
    ticketUrl: row.ticketUrl,
    category: row.categoryJson as EtkinlikEventDetail["category"],
    format: row.formatJson as EtkinlikEventDetail["format"],
    tags: asStringArray(row.tags),
    venueName: row.venueName,
    venueCity: row.venueCity,
    venueAddress: row.venueAddress,
    venueLat: row.venueLat != null ? Number(row.venueLat) : null,
    venueLng: row.venueLng != null ? Number(row.venueLng) : null,
    etkinlikVenueId: null,
    minPrice: row.minPrice != null ? Number(row.minPrice) : null,
    maxPrice: row.maxPrice != null ? Number(row.maxPrice) : null,
    currency: row.currency ?? "TRY",
  };
}

function parseIsoDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function syncVenueForDetail(
  detail: EtkinlikEventDetail,
  mapBusinessId?: string | null,
): Promise<EtkinlikVenueMapLinks> {
  if (!Number.isFinite(detail.id)) {
    return {
      mapBusinessId: mapBusinessId ?? null,
      mapBusinessSlug: null,
      haritalarUrl: null,
      sariSayfalarUrl: null,
    };
  }
  const synced = await resolveEtkinlikVenueMapLinks({
    etkinlikId: detail.id,
    mapBusinessId,
    etkinlikVenueId: detail.etkinlikVenueId,
    venueName: detail.venueName,
    venueCity: detail.venueCity,
    venueAddress: detail.venueAddress,
    venueLat: detail.venueLat,
    venueLng: detail.venueLng,
    posterUrl: detail.posterUrl,
  });
  return synced;
}

function attachMapLinks(
  detail: EtkinlikEventDetail,
  links: EtkinlikVenueMapLinks,
): EtkinlikEventDetail & EtkinlikVenueMapLinks {
  return { ...detail, ...links };
}

export async function getCachedEtkinlikEvent(idOrSlug: string): Promise<CacheRow | null> {
  const q = idOrSlug.trim();
  if (!q) return null;
  const isId = /^\d+$/.test(q);
  const rows = await db
    .select()
    .from(etkinlikEventCacheTable)
    .where(
      isId
        ? eq(etkinlikEventCacheTable.etkinlikId, Number(q))
        : or(eq(etkinlikEventCacheTable.slug, q), eq(etkinlikEventCacheTable.slug, q.toLowerCase())),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertEtkinlikEventFromListItem(event: EtkinlikEventItem): Promise<void> {
  const externalUrl = event.url || buildEtkinlikPublicUrl(event.slug || String(event.id));
  const existing = await getCachedEtkinlikEvent(String(event.id));
  await db
    .insert(etkinlikEventCacheTable)
    .values({
      etkinlikId: event.id,
      slug: event.slug || String(event.id),
      title: event.name,
      posterUrl: event.posterUrl,
      venueName: event.venueName,
      venueCity: event.venueCity,
      startAt: parseIsoDate(event.startAt),
      endAt: parseIsoDate(event.endAt),
      timezone: event.timezone,
      isFree: event.isFree,
      categoryJson: event.category,
      formatJson: event.format,
      ticketUrl: event.ticketUrl,
      externalUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: etkinlikEventCacheTable.etkinlikId,
      set: {
        slug: event.slug || String(event.id),
        title: event.name,
        posterUrl: event.posterUrl,
        venueName: event.venueName,
        venueCity: event.venueCity,
        startAt: parseIsoDate(event.startAt),
        endAt: parseIsoDate(event.endAt),
        timezone: event.timezone,
        isFree: event.isFree,
        categoryJson: event.category,
        formatJson: event.format,
        ticketUrl: event.ticketUrl,
        externalUrl,
        updatedAt: new Date(),
      },
    });

  if (event.venueName) {
    await syncVenueForDetail(
      {
        id: event.id,
        name: event.name,
        slug: event.slug,
        url: externalUrl,
        description: null,
        descriptionHtml: null,
        startAt: event.startAt,
        endAt: event.endAt,
        timezone: event.timezone,
        isFree: event.isFree,
        posterUrl: event.posterUrl,
        imageUrls: event.posterUrl ? [event.posterUrl] : [],
        ticketUrl: event.ticketUrl,
        category: event.category,
        format: event.format,
        tags: [],
        venueName: event.venueName,
        venueCity: event.venueCity,
        venueAddress: null,
        venueLat: null,
        venueLng: null,
        etkinlikVenueId: null,
        minPrice: null,
        maxPrice: null,
        currency: "TRY",
      },
      existing?.mapBusinessId,
    );
  }
}

function mergeDetail(base: EtkinlikEventDetail, patch: Partial<EtkinlikEventDetail>): EtkinlikEventDetail {
  const images = [...new Set([...(base.imageUrls ?? []), ...(patch.imageUrls ?? [])])];
  return {
    ...base,
    ...patch,
    name: patch.name ?? base.name,
    description: patch.description && !scrapedDescriptionThin(patch.description) ? patch.description : base.description ?? patch.description ?? null,
    descriptionHtml: patch.descriptionHtml ?? base.descriptionHtml ?? null,
    imageUrls: images.length ? images : base.imageUrls,
    posterUrl: base.posterUrl ?? patch.posterUrl ?? images[0] ?? null,
    venueName: base.venueName ?? patch.venueName ?? null,
    venueCity: base.venueCity ?? patch.venueCity ?? null,
    venueAddress: base.venueAddress ?? patch.venueAddress ?? null,
    venueLat: base.venueLat ?? patch.venueLat ?? null,
    venueLng: base.venueLng ?? patch.venueLng ?? null,
    etkinlikVenueId: base.etkinlikVenueId ?? patch.etkinlikVenueId ?? null,
    ticketUrl: base.ticketUrl ?? patch.ticketUrl ?? null,
    minPrice: base.minPrice ?? patch.minPrice ?? null,
    maxPrice: base.maxPrice ?? patch.maxPrice ?? null,
  };
}

function scrapedToPartial(scraped: ScrapedEtkinlikEvent): Partial<EtkinlikEventDetail> {
  return {
    id: scraped.etkinlikId ?? undefined,
    name: scraped.title ?? undefined,
    slug: scraped.slug ?? undefined,
    url: scraped.externalUrl,
    description: scraped.description,
    descriptionHtml: scraped.descriptionHtml,
    posterUrl: scraped.posterUrl,
    imageUrls: scraped.imageUrls,
    startAt: scraped.startAt,
    endAt: scraped.endAt,
    isFree: scraped.isFree ?? undefined,
    venueName: scraped.venueName,
    venueCity: scraped.venueCity,
    venueAddress: scraped.venueAddress,
    venueLat: scraped.venueLat,
    venueLng: scraped.venueLng,
    minPrice: scraped.minPrice,
    maxPrice: scraped.maxPrice,
    currency: scraped.currency ?? undefined,
    ticketUrl: scraped.ticketUrl,
  };
}

async function persistDetail(
  detail: EtkinlikEventDetail,
  extras?: { apiPayload?: unknown; scrapedPayload?: unknown; scrapedAt?: Date; apiFetchedAt?: Date },
): Promise<void> {
  const id = detail.id;
  if (!Number.isFinite(id)) return;
  const existing = await getCachedEtkinlikEvent(String(id));
  const values = {
    etkinlikId: id,
    slug: detail.slug || String(id),
    title: detail.name,
    description: detail.description,
    descriptionHtml: detail.descriptionHtml,
    posterUrl: detail.posterUrl,
    imageUrls: detail.imageUrls ?? [],
    venueName: detail.venueName,
    venueCity: detail.venueCity,
    venueAddress: detail.venueAddress,
    venueLat: detail.venueLat != null ? String(detail.venueLat) : null,
    venueLng: detail.venueLng != null ? String(detail.venueLng) : null,
    startAt: parseIsoDate(detail.startAt),
    endAt: parseIsoDate(detail.endAt),
    timezone: detail.timezone,
    isFree: detail.isFree,
    minPrice: detail.minPrice != null ? String(detail.minPrice) : null,
    maxPrice: detail.maxPrice != null ? String(detail.maxPrice) : null,
    currency: detail.currency ?? "TRY",
    categoryJson: detail.category,
    formatJson: detail.format,
    tags: detail.tags ?? [],
    ticketUrl: detail.ticketUrl,
    externalUrl: detail.url,
    apiPayload: extras?.apiPayload ?? existing?.apiPayload ?? null,
    scrapedPayload: extras?.scrapedPayload ?? existing?.scrapedPayload ?? null,
    scrapedAt: extras?.scrapedAt ?? existing?.scrapedAt ?? null,
    apiFetchedAt: extras?.apiFetchedAt ?? existing?.apiFetchedAt ?? null,
    updatedAt: new Date(),
  };
  await db
    .insert(etkinlikEventCacheTable)
    .values(values)
    .onConflictDoUpdate({
      target: etkinlikEventCacheTable.etkinlikId,
      set: values,
    });

  await syncVenueForDetail(detail, existing?.mapBusinessId);
}

function cacheRowNeedsScrape(row: CacheRow | null): boolean {
  if (!row) return true;
  if (scrapedDescriptionThin(row.description)) return true;
  if (!row.scrapedAt) return true;
  return Date.now() - row.scrapedAt.getTime() > SCRAPE_STALE_MS;
}

export async function enrichEtkinlikEventsInBackground(events: EtkinlikEventItem[]): Promise<void> {
  await Promise.allSettled(events.map((e) => upsertEtkinlikEventFromListItem(e)));
}

export async function resolveEtkinlikEventDetail(input: {
  idOrSlug: string;
  fetchApiDetail: (id: number) => Promise<EtkinlikEventDetail | null>;
  configured: boolean;
  configHint: string | null;
  scrape?: boolean;
}): Promise<EtkinlikEventDetailResponse | null> {
  const q = input.idOrSlug.trim();
  if (!q) return null;

  let source: EtkinlikEventDetailResponse["source"] = "cache";
  let cached = await getCachedEtkinlikEvent(q);
  let detail: EtkinlikEventDetail | null = cached ? rowToDetail(cached) : null;

  let eventId: number | null = /^\d+$/.test(q) ? Number(q) : (cached?.etkinlikId ?? null);

  if (input.configured && eventId) {
    const apiDetail = await input.fetchApiDetail(eventId);
    if (apiDetail) {
      detail = detail ? mergeDetail(detail, apiDetail) : apiDetail;
      source = cached ? "mixed" : "api";
      await persistDetail(detail, { apiPayload: apiDetail, apiFetchedAt: new Date() });
      cached = await getCachedEtkinlikEvent(String(eventId));
    }
  }

  if (!detail && !eventId && !/^\d+$/.test(q)) {
    const pageUrl = buildEtkinlikPublicUrl(q);
    const scraped = await scrapeEtkinlikEventPage(pageUrl);
    if (scraped) {
      const partial = scrapedToPartial(scraped);
      eventId = scraped.etkinlikId;
      detail = {
        id: eventId ?? 0,
        name: partial.name ?? q,
        slug: partial.slug ?? q,
        url: partial.url ?? pageUrl,
        description: partial.description ?? null,
        descriptionHtml: partial.descriptionHtml ?? null,
        startAt: partial.startAt ?? null,
        endAt: partial.endAt ?? null,
        timezone: "Europe/Istanbul",
        isFree: partial.isFree ?? false,
        posterUrl: partial.posterUrl ?? null,
        imageUrls: partial.imageUrls ?? [],
        ticketUrl: partial.ticketUrl ?? null,
        category: null,
        format: null,
        tags: [],
        venueName: partial.venueName ?? null,
        venueCity: partial.venueCity ?? null,
        venueAddress: partial.venueAddress ?? null,
        venueLat: partial.venueLat ?? null,
        venueLng: partial.venueLng ?? null,
        etkinlikVenueId: null,
        minPrice: partial.minPrice ?? null,
        maxPrice: partial.maxPrice ?? null,
        currency: partial.currency ?? "TRY",
      };
      source = "scrape";
      if (eventId) await persistDetail(detail, { scrapedPayload: scraped, scrapedAt: new Date() });
    }
  }

  if (!detail) return null;

  const shouldScrape = input.scrape !== false && cacheRowNeedsScrape(cached);
  let enriching = false;

  if (shouldScrape) {
    const pageUrl = detail.url || buildEtkinlikPublicUrl(detail.slug || String(detail.id));
    const scraped = await scrapeEtkinlikEventPage(pageUrl);
    if (scraped) {
      detail = mergeDetail(detail, scrapedToPartial(scraped) as EtkinlikEventDetail);
      if (scraped.etkinlikId && !eventId) {
        detail.id = scraped.etkinlikId;
        eventId = scraped.etkinlikId;
      }
      source = source === "api" || source === "mixed" ? "mixed" : "scrape";
      await persistDetail(detail, { scrapedPayload: scraped, scrapedAt: new Date() });
      cached = await getCachedEtkinlikEvent(String(detail.id));
    } else {
      enriching = scrapedDescriptionThin(detail.description);
    }
  }

  const mapLinks = await syncVenueForDetail(detail, cached?.mapBusinessId);
  const enriched = attachMapLinks(detail, mapLinks);

  return {
    ...enriched,
    configured: input.configured,
    source,
    enriching,
    configHint: input.configHint,
  };
}

export function listItemToDetail(event: EtkinlikEventItem): EtkinlikEventDetail {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    url: event.url,
    description: null,
    descriptionHtml: null,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone,
    isFree: event.isFree,
    posterUrl: event.posterUrl,
    imageUrls: event.posterUrl ? [event.posterUrl] : [],
    ticketUrl: event.ticketUrl,
    category: event.category,
    format: event.format,
    tags: [],
    venueName: event.venueName,
    venueCity: event.venueCity,
    venueAddress: null,
    venueLat: null,
    venueLng: null,
    etkinlikVenueId: null,
    minPrice: null,
    maxPrice: null,
    currency: "TRY",
  };
}
