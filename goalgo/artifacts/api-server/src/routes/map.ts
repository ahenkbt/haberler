import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { scrapeGoogleMaps, verifyChromiumStartup, getChromiumPathForStatus, getLastChromiumProbe, resetSharedBrowser } from "../lib/gmaps-scraper.js";
import {
  enqueueInsaatfirmalarimJob,
  enqueueInsaatfirmalarimJobsFromMode,
  getInsaatfirmalarimJob,
  getInsaatfirmalarimBatchStatus,
  getInsaatfirmalarimCatalog,
  getInsaatfirmalarimQueueStatus,
  isInsaatfirmalarimWorkerActivelyBusy,
  listInsaatfirmalarimJobs,
  runInsaatfirmalarimScrapeNow,
  clearInsaatfirmalarimQueue,
  recoverInsaatfirmalarimWorker,
  resumeInsaatfirmalarimQueue,
} from "../lib/insaatfirmalarim-jobs.js";
import { INSAATFIRMALARIM_CATEGORIES } from "../lib/insaatfirmalarim-scraper.js";
import {
  enqueueYatportJob,
  enqueueYatportJobsFromMode,
  getYatportJob,
  getYatportBatchStatus,
  getYatportCatalog,
  getYatportQueueStatus,
  listYatportJobs,
  runYatportScrapeNow,
  clearYatportQueue,
  recoverYatportWorker,
} from "../lib/yatport-jobs.js";
import { db } from "@workspace/db";
import {
  mapBusinessesTable,
  mapBusinessImagesTable,
  mapCategoriesTable,
  mapCitiesTable,
  mapDistrictsTable,
  mapNeighborhoodsTable,
  mapReviewsTable,
  mapUsersTable,
  mapFavoritesTable,
  mapLayerDefinitionsTable,
  mapOwnershipClaimsTable,
  mapSavedPlacesTable,
  mapShareStatesTable,
  mapSystemSettingsTable,
  mapUserPlaceDraftsTable,
  mapDeviceTokensTable,
  mapBusinessApplicationsTable,
  mapUserReviewsTable,
  mapProductsTable,
  mapCampaignsTable,
  trIlTable,
  trIlceTable,
  mapFeaturePlacementPricingTable,
  mapFeaturePromotionRequestsTable,
  mapContactMessagesTable,
  mapReservationsTable,
  mapOrdersTable,
  mapPremiumPaymentsTable,
  kesfetDiscoverGroupsTable,
  kesfetDiscoverSubcategoriesTable,
  vendorsTable,
  siteSettingsTable,
} from "@workspace/db";
import {
  fetchKesfetDiscoverGroupsPayload,
  seedKesfetDiscoverCategoriesIfNeeded,
} from "../lib/kesfet-discover-seed.js";
import {
  KESFET_KAMU_SUPER,
  KESFET_SCRAPER_BACKFILL_CATEGORIES,
  MAP_CATEGORY_SCRAPER_ALIASES,
  fetchMapScraperCategoryCatalog,
  type KesfetScraperBackfillCategory,
} from "../lib/map-scraper-categories.js";
import {
  buildDynamicKesfetBackfillCity,
  inferKesfetBackfillRegion,
  resolveNewsmapScrapeCategories,
} from "../lib/newsmap-scraper-queue.js";
import { searchYoutubeVideos } from "../lib/youtubeVideoSearch.js";
import { searchYektubeVideos, importYoutubeVideoById, scrapeAndImportLocationYoutubeVideos } from "../lib/yektubeVideoSearch.js";
import bcrypt from "bcryptjs";
import { eq, and, sql, ilike, or, desc, asc, isNull, gt, gte, inArray, type SQL } from "drizzle-orm";
import { verifyFirebaseToken, isFirebaseAdminConfigured } from "../lib/firebase.js";
import jwt from "jsonwebtoken";
import { getSessionSecret } from "../lib/secrets.js";
import { postOverpassInterpreter } from "../lib/overpass.js";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { PG_ADVISORY_LOCKS, withPgAdvisoryLock } from "../lib/pg-advisory-lock.js";
import { wipeAllBusinessData } from "../lib/wipe-all-business-data.js";
import { resolveGooglePlacesApiKey } from "../lib/google-places-key.js";
import { computeGoogleRoute, type GoogleTravelModeApi } from "../lib/google-routes.js";
import {
  buildPhotoUrls,
  collectPlaceIdsFromNearby,
  collectPlaceIdsFromTextQuery,
  fetchPlaceDetails,
  googlePlacesExtras,
  inferServiceFlags,
  openingHoursJson,
  sanitizePlaceReviews,
  tagsForImport,
} from "../lib/google-places-bulk-import.js";
import { resolveGooglePlaceMapLocation } from "../lib/google-places-location.js";
import {
  fetchPlaceDetailsNew,
  buildNewApiPhotoMediaUrls,
  sanitizePlacesNewForExtras,
  buildPopularHoursFromPlacesNew,
} from "../lib/google-places-new.js";
import { TURKEY_CITIES } from "../lib/seed-popular-locations.js";
import { resolveTurkishProvinceWikiTitle } from "../lib/turkishProvinces.js";
import {
  buildAffiliateUrl,
  fetchHotellookPrices,
  getTravelpayoutsConfig,
} from "../lib/travelpayouts.js";
import { fetchDutyPharmacies } from "../lib/collectapi.js";
import { generateTurkishVendorAbout } from "../lib/vendor-about-ai.js";
import {
  deleteFirebaseSavedPlace,
  deleteFirebaseUserPlaceDraft,
  getFirebaseShareState,
  getMapFirebaseStatus,
  listFirebaseSavedPlaces,
  listFirebaseUserPlaceDrafts,
  mirrorFirebaseSavedPlace,
  mirrorFirebaseShareState,
  mirrorFirebaseUserPlaceDraft,
} from "../lib/map-firebase-adapter.js";
import {
  runMapPlacesGoogleScrape,
  MapPlacesScrapeHttpError,
  type MapPlacesGoogleScrapeArgs,
  type MapPlacesScrapeLog,
} from "../lib/map-places-google-scrape.js";
import { normalizeImageUrlValue, normalizeMapImageFields } from "../lib/map-image-proxy.js";
import {
  cacheExternalImageToMedia,
  isLocalCachedMediaUrl,
  resolveCachedCoverPhoto,
} from "../lib/map-scraped-image-cache.js";
import { bulkRefreshStaleLegacyPlacePhotos, refreshStaleLegacyPlacePhotoRef, refreshStalePhotoMediaResource, schedulePersistFetchedPlacePhotoToMedia } from "../lib/place-photo-refresh.js";
import { resolvePlaceIdWithKey } from "../lib/map-vendor-google.js";

const router: IRouter = Router();

type MapPlacesScrapeJobRow = {
  status: "queued" | "running" | "done" | "error";
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
};
const mapPlacesScrapeJobs = new Map<string, MapPlacesScrapeJobRow>();
const MAP_PLACES_SCRAPE_JOB_TTL_MS = 3_600_000;

function pruneMapPlacesScrapeJobs() {
  const now = Date.now();
  for (const [id, j] of mapPlacesScrapeJobs) {
    if (now - new Date(j.createdAt).getTime() > MAP_PLACES_SCRAPE_JOB_TTL_MS) mapPlacesScrapeJobs.delete(id);
  }
}

type MapGmapsScrapeJobRow = {
  status: "queued" | "running" | "done" | "error";
  phase?: string;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
};
const mapGmapsScrapeJobs = new Map<string, MapGmapsScrapeJobRow>();
const MAP_GMAPS_SCRAPE_JOB_TTL_MS = 3_600_000;

function pruneMapGmapsScrapeJobs() {
  const now = Date.now();
  for (const [id, j] of mapGmapsScrapeJobs) {
    if (now - new Date(j.createdAt).getTime() > MAP_GMAPS_SCRAPE_JOB_TTL_MS) mapGmapsScrapeJobs.delete(id);
  }
}

type AdminManualGmapsImportOpts = {
  businesses: Array<Awaited<ReturnType<typeof scrapeGoogleMaps>>["businesses"][number]>;
  latNum?: number;
  lngNum?: number;
  categorySlugVal: string;
  categoryIdVal: string | null;
  storeTypeNorm: string | null;
  homepageSuperNorm: string | null;
};

async function importAdminManualGmapsScrapeBatch(opts: AdminManualGmapsImportOpts): Promise<{
  imported: number;
  skipped: number;
  skippedMissingContact: number;
  errors: string[];
  total: number;
  data: Array<{ name: string; address: string | null; rating: number | null; category: string | null; phone: string | null }>;
}> {
  let imported = 0;
  let skipped = 0;
  let skippedMissingContact = 0;
  const errors: string[] = [];
  const safeNum = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };
  const safeInt = (v: unknown): number | null => {
    const n = Math.round(safeNum(v) ?? NaN);
    return Number.isFinite(n) ? n : null;
  };
  const scrapedBusinesses = [...(opts.businesses ?? [])].sort((a, b) => {
    const aa = googlePlaceImportPopularityScore({ rating: a.rating, userRatingsTotal: a.reviewCount });
    const bb = googlePlaceImportPopularityScore({ rating: b.rating, userRatingsTotal: b.reviewCount });
    return bb.score - aa.score;
  });

  for (const biz of scrapedBusinesses) {
    try {
      if (!biz?.name?.trim()) { skipped++; continue; }
      const privateCheck = googlePlaceCandidateForPrivateImport(biz.name, [biz.category].filter(Boolean));
      if (!privateCheck.allowed) { skipped++; continue; }
      const placeId = resolveImportGooglePlaceId(
        biz.googlePlaceId,
        `${biz.name}|${biz.address || ""}|${safeNum(biz.latitude) ?? ""}|${safeNum(biz.longitude) ?? ""}`,
      );
      const existing = await db.select({ id: mapBusinessesTable.id })
        .from(mapBusinessesTable)
        .where(eq(mapBusinessesTable.googlePlaceId, placeId))
        .limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const base = toSlug(biz.name);
      let slug = base; let attempt = 1;
      while (attempt <= 200) {
        const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
        if (clash.length === 0) break;
        slug = `${base}-${++attempt}`;
      }

      let workingHours: Record<string, { open: string; close: string; closed: boolean }> | null = null;
      if (biz.workingHours && typeof biz.workingHours === "object") {
        workingHours = {};
        for (const [day, hoursStr] of Object.entries(biz.workingHours)) {
          if (typeof hoursStr !== "string") continue;
          const lower = hoursStr.toLowerCase();
          if (lower.includes("kapalı") || lower.includes("closed")) {
            workingHours[day] = { open: "", close: "", closed: true };
          } else {
            const m = hoursStr.match(/(\d{1,2}[:\.]\d{2})\s*[–\-]\s*(\d{1,2}[:\.]\d{2})/);
            workingHours[day] = { open: m ? m[1].replace(".", ":") : "", close: m ? m[2].replace(".", ":") : "", closed: false };
          }
        }
        if (Object.keys(workingHours).length === 0) workingHours = null;
      }

      const centerLat = opts.latNum ?? null;
      const centerLng = opts.lngNum ?? null;
      const bizLat = safeNum(biz.latitude) ?? centerLat;
      const bizLng = safeNum(biz.longitude) ?? centerLng;
      const bizRec = biz as unknown as Record<string, unknown>;
      const scrapedPhotos = Array.isArray(bizRec.photos)
        ? (bizRec.photos as string[]).filter(isExternalImageReference).slice(0, GMAPS_SCRAPER_MEDIA_LIMIT)
        : biz.photoUrl
          ? [biz.photoUrl].filter(isExternalImageReference)
          : [];
      const scrapedReviews = Array.isArray(bizRec.reviews)
        ? (bizRec.reviews as Array<Record<string, unknown>>)
            .map((r) => {
              const rating = safeNum(r.rating);
              const text = String(r.text ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
              if (!rating || !text) return null;
              return {
                authorName: String(r.authorName ?? "Misafir").trim().slice(0, 80) || "Misafir",
                profilePhoto: typeof r.profilePhoto === "string" ? r.profilePhoto : undefined,
                rating,
                relativeTime: String(r.relativeTime ?? "").trim().slice(0, 80),
                text,
                source: "google" as const,
              };
            })
            .filter(Boolean)
            .slice(0, GMAPS_SCRAPER_MEDIA_LIMIT)
        : [];
      if (!googlePlaceMeetsPublicQuality({
        photos: scrapedPhotos,
        rating: biz.rating,
        userRatingsTotal: biz.reviewCount,
        reviews: scrapedReviews,
      })) {
        skipped++;
        continue;
      }

      const bizReviewsRaw = Array.isArray(bizRec.reviews)
        ? (bizRec.reviews as Array<{ text?: string | null }>)
        : [];
      const resolvedContact = resolveGmapsScrapedBusinessContact({
        phone: biz.phone,
        address: biz.address,
        category: biz.category,
        description: typeof bizRec.description === "string" ? bizRec.description : null,
        reviews: bizReviewsRaw,
      });
      if (!hasMapBusinessContact(resolvedContact.phone, resolvedContact.address)) {
        skipped++;
        skippedMissingContact++;
        continue;
      }

      const importPhotos = scrapedPhotos.length > 0
        ? scrapedPhotos
        : biz.photoUrl
          ? [biz.photoUrl].filter(isExternalImageReference)
          : [];
      const resolvedGallery = await resolveImportGalleryPhotos(importPhotos, {
        homepageSuperCategory: opts.homepageSuperNorm,
        storeType: opts.storeTypeNorm,
      });
      const coverPhoto = resolvedGallery.coverUrl;
      const galleryPhotos = resolvedGallery.galleryPhotos;

      const inserted = await db.insert(mapBusinessesTable).values({
        googlePlaceId: placeId,
        importSource: "gmaps_scrape",
        slug,
        name: biz.name.trim(),
        address: resolvedContact.address,
        phone: resolvedContact.phone,
        website: biz.website || null,
        description: null,
        rating: safeNum(biz.rating),
        userRatingsTotal: safeInt(biz.reviewCount),
        latitude: bizLat,
        longitude: bizLng,
        categoryId: opts.categoryIdVal,
        ...(opts.storeTypeNorm ? { storeType: opts.storeTypeNorm } : {}),
        ...(opts.homepageSuperNorm ? { homepageSuperCategory: opts.homepageSuperNorm } : {}),
        photoUrl: coverPhoto,
        coverPhotoUrl: coverPhoto,
        priceLevel: safeInt(biz.priceLevel),
        tags: (() => {
          const baseTags = Array.isArray(biz.tags) ? [...biz.tags] : [];
          if (opts.categorySlugVal && !baseTags.includes(opts.categorySlugVal)) baseTags.push(opts.categorySlugVal);
          if (opts.homepageSuperNorm && !baseTags.includes(opts.homepageSuperNorm)) baseTags.push(opts.homepageSuperNorm);
          if (!baseTags.includes("gmaps_scrape")) baseTags.push("gmaps_scrape");
          return baseTags.length > 0 ? baseTags : null;
        })(),
        workingHours: workingHours as unknown as Record<string, unknown>,
        scrapedPhotos: scrapedPhotos.length > 0 ? scrapedPhotos as unknown as Record<string, unknown> : null,
        scrapedReviews: scrapedReviews.length > 0 ? scrapedReviews as unknown as Record<string, unknown> : null,
        isActive: true,
        isPremium: false,
      }).onConflictDoNothing().returning({ id: mapBusinessesTable.id });

      if (inserted.length > 0 && galleryPhotos.length > 0) {
        await insertMapBusinessImportImages(inserted[0].id, galleryPhotos, GMAPS_SCRAPER_MEDIA_LIMIT);
      }

      imported++;
    } catch (insertErr) {
      errors.push(`${biz?.name ?? "?"}: ${String(insertErr).slice(0, 120)}`);
    }
  }

  return {
    imported,
    skipped,
    skippedMissingContact,
    errors,
    total: opts.businesses.length,
    data: opts.businesses.slice(0, 120).map((biz) => ({
      name: biz.name,
      address: biz.address ?? null,
      rating: biz.rating ?? null,
      category: biz.category ?? null,
      phone: biz.phone ?? null,
    })),
  };
}

async function generateMapBusinessAboutText(input: {
  name: string;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  storeType?: string | null;
}): Promise<string | null> {
  const name = String(input.name || "").trim();
  if (!name) return null;
  try {
    const rows = await db
      .select({
        openaiApiKey: siteSettingsTable.openaiApiKey,
        openaiModel: siteSettingsTable.openaiModel,
        geminiApiKey: siteSettingsTable.geminiApiKey,
        deepseekApiKey: siteSettingsTable.deepseekApiKey,
      })
      .from(siteSettingsTable)
      .limit(1);
    const keys = rows[0];
    if (!keys) return null;
    return await generateTurkishVendorAbout(keys, {
      name,
      city: input.city ?? null,
      district: input.district ?? null,
      address: input.address ?? null,
      providerType: input.storeType ?? "işletme",
      vendorType: "map_business",
    });
  } catch {
    return null;
  }
}

/** Harita işletmesi ve bağlı satırlar (sipariş mağazası değil — yalnızca `map_businesses`). */
async function purgeMapBusinessIds(ids: string[]): Promise<void> {
  const cleanIds = Array.from(new Set(ids.map((x) => String(x || "").trim()).filter(Boolean)));
  if (cleanIds.length === 0) return;
  for (const id of cleanIds) {
    // Sipariş vendor kayıtları map_business id'sini text alanında tutabiliyor; önce bağlantıyı kes.
    await db.update(vendorsTable).set({ linkedMapBusinessId: null }).where(eq(vendorsTable.linkedMapBusinessId, id));
    const deleteSteps: Array<() => Promise<unknown>> = [
      () => db.delete(mapBusinessImagesTable).where(eq(mapBusinessImagesTable.businessId, id)),
      () => db.delete(mapProductsTable).where(eq(mapProductsTable.businessId, id)),
      () => db.delete(mapCampaignsTable).where(eq(mapCampaignsTable.businessId, id)),
      () => db.delete(mapReservationsTable).where(eq(mapReservationsTable.businessId, id)),
      () => db.delete(mapOrdersTable).where(eq(mapOrdersTable.businessId, id)),
      () => db.delete(mapPremiumPaymentsTable).where(eq(mapPremiumPaymentsTable.businessId, id)),
      () => db.delete(mapUserReviewsTable).where(eq(mapUserReviewsTable.businessId, id)),
      () => db.delete(mapFeaturePromotionRequestsTable).where(eq(mapFeaturePromotionRequestsTable.businessId, id)),
      () => db.delete(mapContactMessagesTable).where(eq(mapContactMessagesTable.businessId, id)),
      () => db.delete(mapReviewsTable).where(eq(mapReviewsTable.businessId, id)),
      () => db.delete(mapFavoritesTable).where(eq(mapFavoritesTable.businessId, id)),
      () => db.delete(mapOwnershipClaimsTable).where(eq(mapOwnershipClaimsTable.businessId, id)),
      () => db.delete(mapBusinessApplicationsTable).where(eq(mapBusinessApplicationsTable.businessId, id)),
      () => db.delete(mapBusinessesTable).where(eq(mapBusinessesTable.id, id)),
    ];
    for (const step of deleteSteps) {
      try {
        await step();
      } catch {
        // Eski kurulum / eksik migration: bağlı tablo yok veya satır zaten silinmiş — devam et.
      }
    }
  }
}

function homepageSuperCategoryWhere(superCategory: string | null | undefined) {
  const s = String(superCategory ?? "").trim().toLowerCase();
  if (!s || s === "all") return undefined;
  if (s === "mekan_dukkan" || s === "mekan") {
    return or(
      eq(mapBusinessesTable.homepageSuperCategory, "mekan_dukkan"),
      eq(mapBusinessesTable.homepageSuperCategory, "mekan"),
      eq(mapBusinessesTable.homepageSuperCategory, "yiyecek"),
      eq(mapBusinessesTable.homepageSuperCategory, "hizmet"),
      eq(mapBusinessesTable.homepageSuperCategory, "siparis"),
      isNull(mapBusinessesTable.homepageSuperCategory),
    );
  }
  if (s === "turizm") {
    return or(
      eq(mapBusinessesTable.homepageSuperCategory, "turizm"),
      eq(mapBusinessesTable.homepageSuperCategory, "seyahat"),
      eq(mapBusinessesTable.homepageSuperCategory, "rentacar"),
      eq(mapBusinessesTable.homepageSuperCategory, "arac"),
    );
  }
  if (s === "siparis") {
    return or(
      eq(mapBusinessesTable.homepageSuperCategory, "siparis"),
      eq(mapBusinessesTable.homepageSuperCategory, "yiyecek"),
      sql`COALESCE(${mapBusinessesTable.storeType}, '') ILIKE '%restoran%'`,
    );
  }
  return eq(mapBusinessesTable.homepageSuperCategory, s);
}

async function attachMapBusinessListImages<T extends { id?: string | null; photoUrl?: string | null; coverPhotoUrl?: string | null }>(
  rows: T[],
): Promise<T[]> {
  const ids = rows.map((r) => String(r.id ?? "").trim()).filter(Boolean);
  if (!ids.length) return rows;
  const images = await db
    .select({
      businessId: mapBusinessImagesTable.businessId,
      imageUrl: mapBusinessImagesTable.imageUrl,
    })
    .from(mapBusinessImagesTable)
    .where(inArray(mapBusinessImagesTable.businessId, ids))
    .orderBy(asc(mapBusinessImagesTable.sortOrder));
  const firstImage = new Map<string, string>();
  for (const img of images) {
    const businessId = String(img.businessId ?? "");
    const imageUrl = String(img.imageUrl ?? "").trim();
    if (!businessId || !imageUrl) continue;
    const current = firstImage.get(businessId);
    if (!current || (isLocalCachedMediaUrl(imageUrl) && !isLocalCachedMediaUrl(current))) {
      firstImage.set(businessId, imageUrl);
    }
  }
  return rows.map((row) => {
    const fallback = firstImage.get(String(row.id ?? ""));
    const photoUrl = String(row.photoUrl ?? "").trim() || String(row.coverPhotoUrl ?? "").trim() || fallback || null;
    const coverPhotoUrl = String(row.coverPhotoUrl ?? "").trim() || photoUrl;
    return normalizeMapImageFields({ ...row, photoUrl, coverPhotoUrl });
  });
}

function readMapBusinessResponsiblePerson(row: {
  googlePlacesExtras?: Record<string, unknown> | null;
  description?: string | null;
  tags?: string[] | null;
}): string | null {
  const extras = (row.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  for (const key of ["responsiblePerson", "authorizedPersonName"]) {
    const val = String(extras?.[key] ?? "").trim();
    if (val) return val;
  }
  const desc = String(row.description ?? "");
  const m = desc.match(/Yetkili:\s*([^.\n]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const tag = (row.tags ?? []).find((t) => /^yetkili:/i.test(String(t)));
  if (tag) return String(tag).replace(/^yetkili:/i, "").replace(/-/g, " ").trim() || null;
  return null;
}

function enrichMapBusinessDirectoryFields<T extends Record<string, unknown>>(row: T): T & { responsiblePerson: string | null; authorizedPersonName: string | null } {
  const responsiblePerson = readMapBusinessResponsiblePerson(row);
  return {
    ...row,
    responsiblePerson,
    authorizedPersonName: responsiblePerson,
  };
}

const TR_PHONE_CANDIDATE_RE = /(?:\+90\s?|0\s?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/;

function normalizeTrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+90 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return raw.trim();
}

function extractPhoneFromScraperText(text: string | null | undefined): string | null {
  const raw = String(text ?? "").trim();
  if (!raw || /açılış|acilis|⋅|kapalı|closed|pzt|sal|çar|per|cum|cmt|paz/i.test(raw)) return null;
  const match = raw.match(TR_PHONE_CANDIDATE_RE);
  return match ? normalizeTrPhone(match[0]) : null;
}

function trimMapContactField(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Backfill yalnızca gerçek telefon numarası yazar — kategori metni vb. sayılmaz. */
function persistableMapPhone(v: unknown): string | null {
  const direct = trimMapContactField(v);
  if (!direct) return null;
  return extractPhoneFromScraperText(direct);
}

/** Backfill yalnızca sokak düzeyinde adres yazar — il/ilçe fallback sayılmaz. */
function persistableMapAddress(v: unknown): string | null {
  const s = trimMapContactField(v);
  if (!s || !looksLikeStreetAddress(s)) return null;
  return s;
}

function readMapBusinessStoredContactSources(row: {
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  googlePlacesExtras?: unknown;
}): { phone: string | null; address: string | null } {
  const normalized = {
    ...row,
    googlePlacesExtras: (row.googlePlacesExtras ?? null) as Record<string, unknown> | null,
  };
  return {
    phone: readMapBusinessPhone(normalized),
    address: readMapBusinessAddress({ ...normalized, city: null, district: null }),
  };
}

function backfillCandidateExclusionCondition(): SQL {
  return sql`(
    ${mapBusinessesTable.googlePlacesExtras} IS NULL
    OR COALESCE((${mapBusinessesTable.googlePlacesExtras})::jsonb->>'contactBackfillSkipped', '') <> 'true'
  )`;
}

/** En az telefon veya adres olmalı; ikisi de yoksa Google Maps importu atlanır. */
function hasMapBusinessContact(phone: string | null | undefined, address: string | null | undefined): boolean {
  return Boolean(trimMapContactField(phone) || trimMapContactField(address));
}

function looksLikeStreetAddress(text: string): boolean {
  const t = text.trim();
  if (t.length < 8 || /^https?:\/\//i.test(t)) return false;
  if (/açılış|acilis|kapalı|closed|⋅/i.test(t)) return false;
  if (/\d/.test(t) && /(cad|cadde|sok|sokak|bulvar|blv|mah|mahalle|no[:.\s]|\/)/i.test(t)) return true;
  if (t.includes(",") && t.length > 12) return true;
  return t.length > 18;
}

function resolveGmapsScrapedBusinessContact(biz: {
  phone?: string | null;
  address?: string | null;
  category?: string | null;
  description?: string | null;
  reviews?: Array<{ text?: string | null }> | null;
}): { phone: string | null; address: string | null } {
  const listMeta = String(biz.category ?? "").trim();
  const phoneFromListMeta = !trimMapContactField(biz.phone) ? extractPhoneFromScraperText(listMeta) : null;
  let phone = trimMapContactField(biz.phone) || phoneFromListMeta;
  let address = trimMapContactField(biz.address);

  if (!phone && biz.description) phone = extractPhoneFromScraperText(biz.description);
  if (!phone && Array.isArray(biz.reviews)) {
    for (const rev of biz.reviews) {
      phone = extractPhoneFromScraperText(String(rev?.text ?? ""));
      if (phone) break;
    }
  }
  if (!address && listMeta && !phoneFromListMeta && looksLikeStreetAddress(listMeta)) {
    address = listMeta;
  }
  return { phone, address };
}

function readMapBusinessPhone(row: {
  phone?: string | null;
  whatsappNumber?: string | null;
  description?: string | null;
  googlePlacesExtras?: Record<string, unknown> | null;
}): string | null {
  const direct = String(row.phone ?? row.whatsappNumber ?? "").trim();
  if (direct) return direct;
  const extras = (row.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  if (!extras) {
    return extractPhoneFromScraperText(row.description) ?? null;
  }
  for (const key of ["phone", "telephone", "scraperCategory", "description"]) {
    const parsed = extractPhoneFromScraperText(String(extras[key] ?? ""));
    if (parsed) return parsed;
  }
  const scraperRaw = extras.scraperRaw;
  if (scraperRaw && typeof scraperRaw === "object") {
    const rawObj = scraperRaw as Record<string, unknown>;
    for (const key of ["phone", "telephone", "description"]) {
      const parsed = extractPhoneFromScraperText(String(rawObj[key] ?? ""));
      if (parsed) return parsed;
    }
    const reviews = rawObj.reviews;
    if (Array.isArray(reviews)) {
      for (const rev of reviews) {
        if (!rev || typeof rev !== "object") continue;
        const parsed = extractPhoneFromScraperText(String((rev as Record<string, unknown>).text ?? ""));
        if (parsed) return parsed;
      }
    }
  }
  const placesApi = extras.placesApiNew;
  if (placesApi && typeof placesApi === "object") {
    const p = placesApi as Record<string, unknown>;
    const fromPlaces = trimMapContactField(p.nationalPhoneNumber) || trimMapContactField(p.internationalPhoneNumber);
    if (fromPlaces) return fromPlaces;
  }
  return extractPhoneFromScraperText(row.description) ?? null;
}

function readMapBusinessAddress(row: {
  address?: string | null;
  googlePlacesExtras?: Record<string, unknown> | null;
  city?: { name?: string | null; nameTr?: string | null } | null;
  district?: { name?: string | null } | null;
}): string | null {
  const direct = String(row.address ?? "").trim();
  if (direct) return direct;
  const extras = (row.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  if (extras) {
    for (const key of ["address", "formattedAddress"]) {
      const val = String(extras[key] ?? "").trim();
      if (looksLikeStreetAddress(val)) return val;
    }
    const placesApi = extras.placesApiNew;
    if (placesApi && typeof placesApi === "object") {
      const val = String((placesApi as Record<string, unknown>).formattedAddress ?? "").trim();
      if (looksLikeStreetAddress(val)) return val;
    }
    const scraperRaw = extras.scraperRaw;
    if (scraperRaw && typeof scraperRaw === "object") {
      for (const key of ["address", "formattedAddress", "description"]) {
        const val = String((scraperRaw as Record<string, unknown>)[key] ?? "").trim();
        if (looksLikeStreetAddress(val)) return val;
      }
    }
    const wf = extras.importWorkflow;
    if (wf && typeof wf === "object") {
      const wfObj = wf as Record<string, unknown>;
      const actual = wfObj.actualLocation && typeof wfObj.actualLocation === "object"
        ? wfObj.actualLocation as { province?: string; district?: string }
        : null;
      const cityObj = wfObj.city && typeof wfObj.city === "object" ? wfObj.city as Record<string, unknown> : null;
      const cityLabel = String(cityObj?.label ?? cityObj?.name ?? actual?.province ?? "").trim();
      const districtLabel = String(actual?.district ?? "").trim();
      if (districtLabel && cityLabel) return `${districtLabel}/${cityLabel}`;
      if (cityLabel.length > 2) return cityLabel;
    }
  }
  const city = String(row.city?.nameTr || row.city?.name || "").trim();
  const district = String(row.district?.name || "").trim();
  if (district && city) return `${district}/${city}`;
  return city || null;
}

function readMapBusinessCategoryName(row: {
  category?: { name?: string | null } | null;
  categoryName?: string | null;
  tags?: string[] | null;
  googlePlacesExtras?: Record<string, unknown> | null;
}): string | null {
  const fromJoin = String(row.category?.name || row.categoryName || "").trim();
  if (fromJoin) return fromJoin;
  const extras = (row.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  const wf = extras?.importWorkflow;
  if (wf && typeof wf === "object") {
    const cat = (wf as Record<string, unknown>).category;
    if (cat && typeof cat === "object") {
      const label = String((cat as Record<string, unknown>).label ?? "").trim();
      if (label) return label;
    }
  }
  const scraperCat = String(extras?.scraperCategory ?? "").trim();
  if (scraperCat && !extractPhoneFromScraperText(scraperCat) && !/açılış|acilis|⋅/i.test(scraperCat)) {
    return scraperCat;
  }
  return null;
}

function enrichMapBusinessContactFields<T extends Record<string, unknown>>(row: T): T & {
  phone: string | null;
  address: string | null;
  categoryName: string | null;
} {
  const phone = readMapBusinessPhone(row);
  const address = readMapBusinessAddress(row);
  const categoryName = readMapBusinessCategoryName(row);
  return {
    ...row,
    phone: phone ?? (typeof row.phone === "string" ? row.phone : null),
    address: address ?? (typeof row.address === "string" ? row.address : null),
    categoryName,
  };
}

function vendorStorefrontHref(row: { slug?: string | null; vendorType?: string | null }): string | null {
  const slug = String(row.slug ?? "").trim();
  if (!slug) return null;
  const type = String(row.vendorType ?? "").trim().toLocaleLowerCase("tr-TR");
  const encoded = encodeURIComponent(slug);
  if (["alisveris", "ecommerce", "shop"].includes(type)) return `/alisveris/magaza/${encoded}`;
  if (["siparis", "delivery", "restaurant", "restoran"].includes(type)) return `/siparis/satici/${encoded}`;
  return `/kesfet/${encoded}`;
}

async function attachHomepageStorefrontLinks<T extends { id?: string | null; slug?: string | null }>(
  rows: T[],
): Promise<Array<T & { storefrontHref: string | null; discoverHref: string; hasActiveStorefront: boolean }>> {
  const ids = Array.from(new Set(rows.map((r) => String(r.id ?? "").trim()).filter(Boolean)));
  if (!ids.length) {
    return rows.map((row) => ({
      ...row,
      storefrontHref: null,
      discoverHref: row.slug ? `/kesfet/${encodeURIComponent(String(row.slug))}` : `/kesfet?nav=${encodeURIComponent(String(row.id ?? ""))}`,
      hasActiveStorefront: false,
    }));
  }
  const vendors = await db
    .select({
      linkedMapBusinessId: vendorsTable.linkedMapBusinessId,
      slug: vendorsTable.slug,
      vendorType: vendorsTable.vendorType,
      active: vendorsTable.active,
    })
    .from(vendorsTable)
    .where(and(inArray(vendorsTable.linkedMapBusinessId, ids), eq(vendorsTable.active, true)));
  const byBusiness = new Map<string, (typeof vendors)[number]>();
  for (const v of vendors) {
    const businessId = String(v.linkedMapBusinessId ?? "").trim();
    if (businessId && !byBusiness.has(businessId)) byBusiness.set(businessId, v);
  }
  return rows.map((row) => {
    const vendor = byBusiness.get(String(row.id ?? ""));
    const storefrontHref = vendor ? vendorStorefrontHref(vendor) : null;
    const discoverHref = row.slug ? `/kesfet/${encodeURIComponent(String(row.slug))}` : `/kesfet?nav=${encodeURIComponent(String(row.id ?? ""))}`;
    return {
      ...row,
      storefrontHref,
      discoverHref,
      hasActiveStorefront: Boolean(storefrontHref),
    };
  });
}

const GOOGLE_IMPORT_MEDIA_LIMIT = 1;
const GMAPS_SCRAPER_MEDIA_LIMIT = 50;
/**
 * Kazınmış (Google Maps bot) işletmelerin detay sayfasında gösterilecek
 * fotoğraf/yorum üst sınırı. Bu medya doğrudan kayıtlı googleusercontent
 * URL'leri ve JSON yorumlardır → Places API kotası harcanmaz; bu yüzden
 * `GOOGLE_IMPORT_MEDIA_LIMIT` (Places API foto proxy'si için 1) yerine
 * makul bir galeri sınırı kullanılır.
 */
const SCRAPED_MEDIA_DISPLAY_LIMIT = 30;

/**
 * Kazıyıcı `googlePlaceId` alanı çoğu zaman gerçek place_id yerine Google Maps
 * URL'sinin `data=!4m...!19s<place_id>` bloğudur. Bu blob Places API'ya
 * gönderilince INVALID_REQUEST döner; bu yüzden gerçek place_id'yi (`ChIJ...`)
 * ayıklarız. Ayıklanamayan/sentetik (`gmaps_...`) değerlerde `null` döner ki
 * Places API çağrısı boşuna kota harcamasın.
 */
function isGoogleMapsHexCid(value: string): boolean {
  return /^0x[0-9a-f]+$/i.test(value) || value.includes(":0x");
}

function isLikelyGooglePlaceId(value: string): boolean {
  if (!value || isGoogleMapsHexCid(value)) return false;
  if (/^(ChI|GhI|Ei)[A-Za-z0-9_-]{10,}$/.test(value)) return true;
  return /^[A-Za-z0-9_-]{15,}$/.test(value) && !value.startsWith("gmaps_");
}

function extractCleanGooglePlaceId(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const marker = value.indexOf("!19s");
  if (marker >= 0) {
    const candidate = value.slice(marker + 4).split("!")[0]?.trim() ?? "";
    return isLikelyGooglePlaceId(candidate) ? candidate : null;
  }
  if (value.startsWith("gmaps_")) return null;
  if (value.includes("data=") || value.includes("!") || value.includes("/")) return null;
  return isLikelyGooglePlaceId(value) ? value : null;
}

function resolveImportGooglePlaceId(raw: unknown, fallbackKey: string): string {
  const clean = extractCleanGooglePlaceId(raw);
  if (clean) return clean;
  return `gmaps_${Buffer.from(fallbackKey).toString("base64url").slice(0, 38)}`;
}

const MAP_BUSINESS_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /map/businesses/:id araması — UUID isteklerinde yalnızca `id` sütunu kullanılır.
 * `or(id, googlePlaceId)` + görünürlük AND'i üretimde id filtresini düşürüp her isteğe
 * aynı (ilk eşleşen) kaydı döndürebiliyor; paylaşımlı Maps `data=!…!1s0x…` blob'ları da
 * googlePlaceId eşleşmesini bozar.
 */
function mapBusinessLookupCondition(rawId: string): SQL {
  const id = String(rawId ?? "").trim();
  if (!id) return sql`FALSE`;
  if (MAP_BUSINESS_UUID_RE.test(id)) {
    return eq(mapBusinessesTable.id, id);
  }
  if (/^(ChI|GhI|Ei|gmaps_)/.test(id)) {
    return or(eq(mapBusinessesTable.id, id), eq(mapBusinessesTable.googlePlaceId, id))!;
  }
  return or(
    eq(mapBusinessesTable.id, id),
    eq(mapBusinessesTable.slug, id),
  )!;
}

/** UUID biçimine yakın ama geçersiz (ör. eksik karakter) — slug/id karışıklığında yanlış kayıt dönmesin. */
function looksLikeBrokenMapBusinessUuid(rawId: string): boolean {
  const id = String(rawId ?? "").trim();
  if (!id || MAP_BUSINESS_UUID_RE.test(id)) return false;
  return /^[0-9a-f]{7,9}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Sarı Sayfalar / Keşfet detay — görünürlük AND'i ile birleştirilmeden doğrudan id veya slug ile tek kayıt. */
async function fetchMapBusinessRowByPublicLookup(lookupId: string) {
  const id = String(lookupId ?? "").trim();
  if (!id || looksLikeBrokenMapBusinessUuid(id)) return null;
  const rows = await db.select({
    business: mapBusinessesTable,
    category: mapCategoriesTable,
    city: mapCitiesTable,
    district: mapDistrictsTable,
    hasPublicProfile: MAP_BUSINESS_HAS_PUBLIC_PROFILE,
  }).from(mapBusinessesTable)
    .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
    .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
    .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
    .where(and(
      eq(mapBusinessesTable.isActive, true),
      mapBusinessLookupCondition(id),
    ))
    .limit(2);
  if (rows.length === 0) return null;
  const hit = rows[0];
  const resolvedId = String(hit.business.id ?? "");
  if (MAP_BUSINESS_UUID_RE.test(id) && resolvedId !== id) return null;
  if (!MAP_BUSINESS_UUID_RE.test(id) && !/^(ChI|GhI|Ei|gmaps_)/.test(id)) {
    const slug = String(hit.business.slug ?? "").trim();
    if (slug && slug !== id && resolvedId !== id) return null;
  }
  return hit;
}

const GOOGLE_PLACES_IMPORT_VALID_TARGET = 300;
const GOOGLE_PLACES_IMPORT_CANDIDATE_MULTIPLIER = 3;
const GOOGLE_PLACES_IMPORT_CANDIDATE_LIMIT = 240;
const GOOGLE_PLACES_MIN_IMPORT_RADIUS_METERS = 10_000;

function normalizeGooglePlacesImportRadius(raw: unknown, fallback: number, max = 50_000): number {
  const value = Math.round(Number(raw) || fallback);
  return Math.min(max, Math.max(GOOGLE_PLACES_MIN_IMPORT_RADIUS_METERS, value));
}

type MapAutoImportSettings = {
  photoCount: number;
  reviewCount: number;
  refreshIntervalDays: number;
  scraperBackfillEnabled: boolean;
  scraperBackfillTargetPerCategory: number;
  scraperBackfillRadiusMeters: number;
  fetchAddress: boolean;
  fetchPhone: boolean;
  fetchWebsite: boolean;
  fetchRating: boolean;
  fetchCoordinates: boolean;
  fetchPhoto: boolean;
  fetchReview: boolean;
};

const DEFAULT_MAP_AUTO_IMPORT_SETTINGS: MapAutoImportSettings = {
  photoCount: 1,
  reviewCount: 1,
  refreshIntervalDays: 90,
  scraperBackfillEnabled: false,
  scraperBackfillTargetPerCategory: 1000,
  scraperBackfillRadiusMeters: 20_000,
  fetchAddress: true,
  fetchPhone: true,
  fetchWebsite: true,
  fetchRating: true,
  fetchCoordinates: true,
  fetchPhoto: true,
  fetchReview: true,
};

function normalizeMapAutoImportSettings(raw: unknown): MapAutoImportSettings {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const bool = (key: keyof MapAutoImportSettings) =>
    typeof obj[key] === "boolean" ? Boolean(obj[key]) : DEFAULT_MAP_AUTO_IMPORT_SETTINGS[key] as boolean;
  const count = (key: "photoCount" | "reviewCount") => {
    const value = Number(obj[key]);
    return Math.max(0, Math.min(5, Number.isFinite(value) ? Math.round(value) : DEFAULT_MAP_AUTO_IMPORT_SETTINGS[key]));
  };
  const refreshRaw = Number(obj.refreshIntervalDays);
  const refreshIntervalDays = Math.max(
    1,
    Math.min(365, Number.isFinite(refreshRaw) ? Math.round(refreshRaw) : DEFAULT_MAP_AUTO_IMPORT_SETTINGS.refreshIntervalDays),
  );
  const targetRaw = Number(obj.scraperBackfillTargetPerCategory);
  const scraperBackfillTargetPerCategory = Math.max(
    20,
    Math.min(KESFET_SCRAPER_BACKFILL_TARGET_MAX, Number.isFinite(targetRaw) ? Math.round(targetRaw) : DEFAULT_MAP_AUTO_IMPORT_SETTINGS.scraperBackfillTargetPerCategory),
  );
  const radiusRaw = Number(obj.scraperBackfillRadiusMeters ?? obj.scraperBackfillRadius);
  const scraperBackfillRadiusMeters = Math.max(
    10_000,
    Math.min(50_000, Number.isFinite(radiusRaw) ? Math.round(radiusRaw) : DEFAULT_MAP_AUTO_IMPORT_SETTINGS.scraperBackfillRadiusMeters),
  );
  return {
    photoCount: count("photoCount"),
    reviewCount: count("reviewCount"),
    refreshIntervalDays,
    scraperBackfillEnabled:
      typeof obj.scraperBackfillEnabled === "boolean"
        ? Boolean(obj.scraperBackfillEnabled)
        : DEFAULT_MAP_AUTO_IMPORT_SETTINGS.scraperBackfillEnabled,
    scraperBackfillTargetPerCategory,
    scraperBackfillRadiusMeters,
    fetchAddress: bool("fetchAddress"),
    fetchPhone: bool("fetchPhone"),
    fetchWebsite: bool("fetchWebsite"),
    fetchRating: bool("fetchRating"),
    fetchCoordinates: bool("fetchCoordinates"),
    fetchPhoto: bool("fetchPhoto"),
    fetchReview: bool("fetchReview"),
  };
}

function readMapLayerConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function getMapAutoImportSettings(): Promise<MapAutoImportSettings> {
  const rows = await db
    .select({ mapLayerConfigJson: mapSystemSettingsTable.mapLayerConfigJson })
    .from(mapSystemSettingsTable)
    .where(eq(mapSystemSettingsTable.id, "system"))
    .limit(1)
    .catch(() => []);
  const cfg = readMapLayerConfig(rows[0]?.mapLayerConfigJson);
  return normalizeMapAutoImportSettings(cfg.autoImportSettings);
}

type KesfetScraperBackfillCity = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  region: "turkiye" | "kktc" | "azerbaycan" | "global";
};

type KesfetScraperBackfillJob = {
  id: string;
  key: string;
  city: KesfetScraperBackfillCity;
  category: KesfetScraperBackfillCategory;
  target: number;
  refreshIntervalDays: number;
  radiusMeters: number;
  wave: number;
  status: "queued" | "running" | "done" | "error" | "skipped";
  createdAt: string;
  updatedAt: string;
  foundBefore: number;
  foundAfter?: number;
  imported?: number;
  skipped?: number;
  error?: string;
  reason?: string;
};

// Kazımada sınır yok: hedef/dalga sayıları, Google Maps'in tek sorguda döndürebildiği
// pratik üst sınıra (~120) kadar her kategoriden mümkün olan tüm işletmeleri toplar.
const KESFET_SCRAPER_BACKFILL_TARGET_DEFAULT = 1000;
/** Kategori başına pratik "sınırsız" üst tavan — eski 250 sınırı kaldırıldı (kullanıcı sınırsız istiyor). */
const KESFET_SCRAPER_BACKFILL_TARGET_MAX = 5000;
const KESFET_SCRAPER_BACKFILL_MAX_WAVES = 12;
const KESFET_SCRAPER_BACKFILL_WAVE_MAX_RESULTS = 120;
const KESFET_SCRAPER_BACKFILL_RADIUS_M = 20_000;
const KESFET_SCRAPER_BACKFILL_ENRICH_MAX = 32;
const KESFET_SCRAPER_BACKFILL_JOB_TIMEOUT_MS = 18 * 60_000;
const KESFET_SCRAPER_BACKFILL_WAVE_TIMEOUT_MS = 7 * 60_000;
const kesfetScraperBackfillJobs = new Map<string, KesfetScraperBackfillJob>();
const kesfetScraperBackfillQueue: string[] = [];
let kesfetScraperBackfillWorkerRunning = false;
let kesfetScraperBackfillLastRunAt: string | null = null;
let kesfetScraperBackfillLastError: string | null = null;
let kesfetScraperBackfillLastImported = 0;

const KESFET_EXTRA_BACKFILL_CITIES: KesfetScraperBackfillCity[] = [
  { key: "kktc:lefkosa", label: "Lefkoşa", lat: 35.1856, lng: 33.3823, region: "kktc" },
  { key: "kktc:girne", label: "Girne", lat: 35.3417, lng: 33.3167, region: "kktc" },
  { key: "kktc:gazimagusa", label: "Gazimağusa", lat: 35.125, lng: 33.95, region: "kktc" },
  { key: "kktc:guzelyurt", label: "Güzelyurt", lat: 35.1987, lng: 32.9949, region: "kktc" },
  { key: "kktc:iskele", label: "İskele", lat: 35.2872, lng: 33.8917, region: "kktc" },
  { key: "kktc:lefke", label: "Lefke", lat: 35.1106, lng: 32.8497, region: "kktc" },
  { key: "azerbaycan:baku", label: "Bakü", lat: 40.4093, lng: 49.8671, region: "azerbaycan" },
  { key: "azerbaycan:gence", label: "Gence", lat: 40.6828, lng: 46.3606, region: "azerbaycan" },
  { key: "azerbaycan:sumgayit", label: "Sumgayıt", lat: 40.5855, lng: 49.6317, region: "azerbaycan" },
  { key: "azerbaycan:seki", label: "Şeki", lat: 41.1919, lng: 47.1706, region: "azerbaycan" },
  { key: "azerbaycan:lenkeran", label: "Lenkeran", lat: 38.7543, lng: 48.8506, region: "azerbaycan" },
  { key: "azerbaycan:nahcivan", label: "Nahçıvan", lat: 39.2089, lng: 45.4122, region: "azerbaycan" },
];

const TURKEY_BACKFILL_CITY_SEED = TURKEY_CITIES as unknown as ReadonlyArray<{ name: string; nameTr?: string; lat: number; lng: number }>;
const KESFET_SCRAPER_BACKFILL_CITIES: KesfetScraperBackfillCity[] = [
  ...TURKEY_BACKFILL_CITY_SEED.map((city) => ({
    key: `turkiye:${normalizeImportDedupeText(city.nameTr || city.name).replace(/\s+/g, "-")}`,
    label: city.nameTr || city.name,
    lat: city.lat,
    lng: city.lng,
    region: "turkiye" as const,
  })),
  ...KESFET_EXTRA_BACKFILL_CITIES,
];

function normalizeKesfetBackfillCategory(input: Partial<KesfetScraperBackfillCategory> & { slug?: string | null }): KesfetScraperBackfillCategory {
  const slug = String(input.slug ?? "").trim();
  const existing = slug ? KESFET_SCRAPER_BACKFILL_CATEGORIES.find((cat) => cat.slug === slug) : undefined;
  const keyword = String(input.keyword ?? existing?.keyword ?? input.label ?? "işletmeler").trim();
  const homepageSuperCategory = String(input.homepageSuperCategory ?? existing?.homepageSuperCategory ?? "mekan_dukkan").trim() || "mekan_dukkan";
  return {
    slug: slug || existing?.slug || normalizeImportDedupeText(keyword).replace(/\s+/g, "-") || "isletmeler",
    label: String(input.label ?? existing?.label ?? keyword).trim() || keyword,
    keyword,
    googlePlaceType: String(input.googlePlaceType ?? existing?.googlePlaceType ?? "").trim() || undefined,
    homepageSuperCategory,
    storeType: String(input.storeType ?? existing?.storeType ?? homepageSuperCategory).trim() || homepageSuperCategory,
  };
}

function makeKesfetBackfillJobKey(city: KesfetScraperBackfillCity, category: KesfetScraperBackfillCategory): string {
  return `${city.key}:${category.slug}:${category.homepageSuperCategory}:${normalizeImportDedupeText(category.keyword)}`;
}

function safeImportNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function safeImportInt(v: unknown): number | null {
  const n = Math.round(safeImportNum(v) ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function compactGoogleMapsScrapeReviews(raw: unknown, limit = GOOGLE_IMPORT_MEDIA_LIMIT): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((r) => {
      if (!r || typeof r !== "object") return [];
      const row = r as Record<string, unknown>;
      const rating = safeImportNum(row.rating);
      const text = String(row.text ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
      if (!rating || !text) return [];
      return [{
        authorName: String(row.authorName ?? "Misafir").trim().slice(0, 80) || "Misafir",
        profilePhoto: typeof row.profilePhoto === "string" ? row.profilePhoto : undefined,
        rating,
        relativeTime: String(row.relativeTime ?? "").trim().slice(0, 80),
        text,
        source: "google" as const,
      }];
    })
    .slice(0, Math.max(0, limit));
}

function isExternalImageReference(value: unknown): value is string {
  const url = String(value ?? "").trim();
  if (!url) return false;
  if (/^(data|blob|file):/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

async function importGoogleMapsScrapedBusinesses(input: {
  businesses: Array<Awaited<ReturnType<typeof scrapeGoogleMaps>>["businesses"][number]>;
  city: KesfetScraperBackfillCity;
  category: KesfetScraperBackfillCategory;
  maxToImport: number;
  radiusMeters?: number;
  sourceLabel: "public_kesfet_backfill" | "admin_bulk_backfill" | "manual_gmaps_scrape";
}): Promise<{ imported: number; skipped: number; skippedMissingContact: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  let skippedMissingContact = 0;
  const errors: string[] = [];
  const scrapedBusinesses = [...(input.businesses ?? [])].sort((a, b) => {
    const aa = googlePlaceImportPopularityScore({ rating: a.rating, userRatingsTotal: a.reviewCount });
    const bb = googlePlaceImportPopularityScore({ rating: b.rating, userRatingsTotal: b.reviewCount });
    return bb.score - aa.score;
  });

  const isPublicCategory = input.category.public === true || input.category.homepageSuperCategory === KESFET_KAMU_SUPER;
  for (const biz of scrapedBusinesses) {
    if (imported >= input.maxToImport) break;
    try {
      if (!biz?.name?.trim()) {
        skipped++;
        continue;
      }
      // Kamu/kamusal alan kayıtları (hastane, devlet kurumu, ibadethane, park...) özel işletme
      // denetiminden muaftır; ama özel işletmelerde zincir/kamu reddi korunur.
      if (!isPublicCategory) {
        const privateCheck = googlePlaceCandidateForPrivateImport(biz.name, [biz.category, input.category.googlePlaceType].filter(Boolean));
        if (!privateCheck.allowed) {
          skipped++;
          continue;
        }
      }
      const placeId = resolveImportGooglePlaceId(
        biz.googlePlaceId,
        `${biz.name}|${biz.address || ""}|${safeImportNum(biz.latitude) ?? ""}|${safeImportNum(biz.longitude) ?? ""}`,
      );
      const centerLat = input.city.lat;
      const centerLng = input.city.lng;
      const bizLat = safeImportNum(biz.latitude) ?? centerLat;
      const bizLng = safeImportNum(biz.longitude) ?? centerLng;
      const resolvedLocation = await resolveGooglePlaceMapLocation(
        { formatted_address: biz.address ?? "" },
        [biz.address, input.city.label].filter(Boolean).join(", "),
      );
      const cityId = resolvedLocation.cityId ?? await resolveMapCityId(input.city.label).catch(() => null);
      const scrapedPhotos = Array.isArray((biz as unknown as Record<string, unknown>).photos)
        ? ((biz as unknown as Record<string, unknown>).photos as string[]).filter(isExternalImageReference).slice(0, GMAPS_SCRAPER_MEDIA_LIMIT)
        : biz.photoUrl
          ? [biz.photoUrl].filter(isExternalImageReference)
          : [];
      const scrapedReviews = compactGoogleMapsScrapeReviews((biz as unknown as Record<string, unknown>).reviews, GMAPS_SCRAPER_MEDIA_LIMIT);
      if (!isPublicCategory && !googlePlaceMeetsPublicQuality({
        photos: scrapedPhotos,
        rating: biz.rating,
        userRatingsTotal: biz.reviewCount,
        reviews: scrapedReviews,
      })) {
        skipped++;
        continue;
      }
      const existing = await findExistingMapBusinessForImport({
        googlePlaceId: placeId,
        name: biz.name,
        address: biz.address,
        lat: bizLat,
        lng: bizLng,
      });
      if (existing) {
        skipped++;
        continue;
      }

      const base = toSlug(biz.name) || "isletme";
      let slug = base;
      let attempt = 1;
      while (attempt <= 200) {
        const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
        if (clash.length === 0) break;
        slug = `${base}-${++attempt}`;
      }

      let workingHours: Record<string, { open: string; close: string; closed: boolean }> | null = null;
      if (biz.workingHours && typeof biz.workingHours === "object") {
        workingHours = {};
        for (const [day, hoursStr] of Object.entries(biz.workingHours)) {
          if (typeof hoursStr !== "string") continue;
          const lower = hoursStr.toLocaleLowerCase("tr-TR");
          if (lower.includes("kapalı") || lower.includes("closed")) {
            workingHours[day] = { open: "", close: "", closed: true };
          } else {
            const m = hoursStr.match(/(\d{1,2}[:.]\d{2})\s*[–-]\s*(\d{1,2}[:.]\d{2})/);
            workingHours[day] = { open: m ? m[1].replace(".", ":") : "", close: m ? m[2].replace(".", ":") : "", closed: false };
          }
        }
        if (Object.keys(workingHours).length === 0) workingHours = null;
      }

      const listMeta = String(biz.category ?? "").trim();
      const scrapedReviewsRaw = Array.isArray((biz as unknown as Record<string, unknown>).reviews)
        ? ((biz as unknown as Record<string, unknown>).reviews as Array<{ text?: string | null }>)
        : [];
      const resolvedContact = resolveGmapsScrapedBusinessContact({
        phone: biz.phone,
        address: biz.address,
        category: listMeta || null,
        description: biz.description,
        reviews: scrapedReviewsRaw,
      });
      if (!hasMapBusinessContact(resolvedContact.phone, resolvedContact.address)) {
        skipped++;
        skippedMissingContact++;
        continue;
      }
      const phoneFromListMeta = !String(biz.phone ?? "").trim() ? extractPhoneFromScraperText(listMeta) : null;
      const scraperCategoryLabel = phoneFromListMeta ? null : (listMeta || null);
      const resolvedPhone = resolvedContact.phone;
      const resolvedAddress = resolvedContact.address;

      const extras = {
        privateBusinessImport: true,
        importWorkflow: {
          source: "google_maps_scraper_bot",
          sourceLabel: input.sourceLabel,
          city: input.city,
          category: input.category,
          radius: input.radiusMeters ?? KESFET_SCRAPER_BACKFILL_RADIUS_M,
          importedAt: new Date().toISOString(),
          qualityRules: ["private_or_sme", "linked_images", "review_snippets_when_available", "deny_public_low_value"],
        },
        googleMapsUrl: biz.googleMapsUrl ?? null,
        googlePlaceType: input.category.googlePlaceType ?? null,
        scraperCategory: scraperCategoryLabel,
        scraperRaw: {
          description: biz.description ?? null,
          address: resolvedAddress,
          phone: resolvedPhone,
          openNow: biz.openNow ?? null,
          tags: Array.isArray(biz.tags) ? biz.tags : [],
          photos: scrapedPhotos,
          reviews: scrapedReviews,
        },
      };

      const resolvedGallery = await resolveImportGalleryPhotos(scrapedPhotos, {
        homepageSuperCategory: input.category.homepageSuperCategory,
        storeType: input.category.storeType,
      });
      const coverPhoto = resolvedGallery.coverUrl;
      const galleryPhotos = resolvedGallery.galleryPhotos;

      const inserted = await db.insert(mapBusinessesTable).values({
        googlePlaceId: placeId,
        importSource: "gmaps_scrape",
        slug,
        name: biz.name.trim(),
        cityId,
        districtId: resolvedLocation.districtId,
        address: resolvedAddress,
        phone: resolvedPhone,
        website: biz.website || null,
        description: biz.description || null,
        rating: safeImportNum(biz.rating),
        userRatingsTotal: safeImportInt(biz.reviewCount),
        latitude: bizLat,
        longitude: bizLng,
        photoUrl: coverPhoto,
        coverPhotoUrl: coverPhoto,
        priceLevel: safeImportInt(biz.priceLevel),
        tags: Array.from(new Set(["private_business", "gmaps_scrape", input.category.slug, input.category.homepageSuperCategory])),
        workingHours: workingHours as unknown as Record<string, unknown>,
        scrapedPhotos: scrapedPhotos.length > 0 ? scrapedPhotos as unknown as Record<string, unknown> : null,
        scrapedReviews: scrapedReviews.length > 0 ? scrapedReviews as unknown as Record<string, unknown> : null,
        googlePlacesExtras: extras as unknown as Record<string, unknown>,
        homepageSuperCategory: input.category.homepageSuperCategory,
        storeType: input.category.storeType,
        isActive: true,
        isPremium: false,
      }).onConflictDoNothing().returning({ id: mapBusinessesTable.id });

      if (inserted.length > 0) {
        await insertMapBusinessImportImages(inserted[0].id, galleryPhotos, GMAPS_SCRAPER_MEDIA_LIMIT);
        imported++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push(`${biz?.name ?? "?"}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 220));
    }
  }

  return { imported, skipped, skippedMissingContact, errors };
}

function kesfetBackfillKeywordCondition(category: KesfetScraperBackfillCategory) {
  const tokens = normalizeImportDedupeText(category.keyword).split(" ").filter((token) => token.length >= 4).slice(0, 4);
  const extrasPattern = `%${category.slug}%`;
  return or(
    eq(mapBusinessesTable.storeType, category.storeType),
    sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::text, '')) LIKE ${extrasPattern}`,
    ...tokens.map((token) => ilike(mapBusinessesTable.name, `%${token}%`)),
    ...tokens.map((token) => ilike(mapBusinessesTable.address, `%${token}%`)),
  );
}

async function countKesfetBackfillBusinesses(input: {
  city: KesfetScraperBackfillCity;
  category: KesfetScraperBackfillCategory;
  refreshIntervalDays?: number;
  radiusMeters?: number;
}): Promise<number> {
  const radiusKm = Math.max(1, Math.min(50_000, input.radiusMeters ?? KESFET_SCRAPER_BACKFILL_RADIUS_M)) / 1000;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / Math.max(0.05, Math.abs(Math.cos((input.city.lat * Math.PI) / 180)) * 111);
  const conditions = [
    eq(mapBusinessesTable.isActive, true),
    MAP_BUSINESS_PUBLIC_VISIBLE,
    MAP_BUSINESS_PUBLIC_PRIVATE_CANDIDATE_ALLOWED,
    MAP_BUSINESS_PUBLIC_CONTENT_QUALITY,
    MAP_BUSINESS_PUBLIC_NOT_DEMO,
    eq(mapBusinessesTable.homepageSuperCategory, input.category.homepageSuperCategory),
    sql`${mapBusinessesTable.latitude} BETWEEN ${input.city.lat - latDelta} AND ${input.city.lat + latDelta}`,
    sql`${mapBusinessesTable.longitude} BETWEEN ${input.city.lng - lngDelta} AND ${input.city.lng + lngDelta}`,
    kesfetBackfillKeywordCondition(input.category),
  ];
  if (input.refreshIntervalDays) {
    conditions.push(gt(mapBusinessesTable.updatedAt, new Date(Date.now() - input.refreshIntervalDays * 24 * 60 * 60 * 1000)));
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(...conditions));
  return Number(row?.count ?? 0);
}

function getKesfetBackfillJobStatus(jobId: string | null | undefined): KesfetScraperBackfillJob | null {
  const id = String(jobId ?? "").trim();
  return id ? kesfetScraperBackfillJobs.get(id) ?? null : null;
}

async function enqueueKesfetScraperBackfill(input: {
  city: KesfetScraperBackfillCity;
  category: KesfetScraperBackfillCategory;
  target?: number;
  refreshIntervalDays?: number;
  radiusMeters?: number;
  force?: boolean;
}): Promise<{ queued: boolean; job: KesfetScraperBackfillJob | null; found: number; reason: string }> {
  const target = Math.max(1, Math.min(KESFET_SCRAPER_BACKFILL_TARGET_MAX, Math.round(input.target ?? KESFET_SCRAPER_BACKFILL_TARGET_DEFAULT)));
  const refreshIntervalDays = Math.max(1, Math.min(365, Math.round(input.refreshIntervalDays ?? DEFAULT_MAP_AUTO_IMPORT_SETTINGS.refreshIntervalDays)));
  const found = await countKesfetBackfillBusinesses({
    city: input.city,
    category: input.category,
    refreshIntervalDays: input.force ? undefined : refreshIntervalDays,
    radiusMeters: input.radiusMeters,
  }).catch(() => 0);
  if (!input.force && found >= target) {
    return { queued: false, job: null, found, reason: "fresh_target_met" };
  }

  const key = makeKesfetBackfillJobKey(input.city, input.category);
  const active = Array.from(kesfetScraperBackfillJobs.values()).find((job) =>
    job.key === key && (job.status === "queued" || job.status === "running")
  );
  if (active) return { queued: true, job: active, found, reason: "already_queued" };

  const now = new Date().toISOString();
  const job: KesfetScraperBackfillJob = {
    id: randomUUID(),
    key,
    city: input.city,
    category: input.category,
    target,
    refreshIntervalDays,
    radiusMeters: Math.max(10_000, Math.min(50_000, Math.round(input.radiusMeters ?? KESFET_SCRAPER_BACKFILL_RADIUS_M))),
    wave: 0,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    foundBefore: found,
  };
  kesfetScraperBackfillJobs.set(job.id, job);
  kesfetScraperBackfillQueue.push(job.id);
  runKesfetScraperBackfillWorker();
  return { queued: true, job, found, reason: "queued" };
}

async function withKesfetScrapeTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} zaman aşımı (${Math.round(ms / 1000)}s)`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runKesfetScraperBackfillJob(job: KesfetScraperBackfillJob): Promise<void> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  try {
    for (let wave = 0; wave < KESFET_SCRAPER_BACKFILL_MAX_WAVES; wave++) {
      job.wave = wave + 1;
      job.updatedAt = new Date().toISOString();
      const currentCount = await countKesfetBackfillBusinesses({ city: job.city, category: job.category, radiusMeters: job.radiusMeters });
      if (currentCount >= job.target) {
        job.status = currentCount >= job.foundBefore ? "done" : "skipped";
        job.foundAfter = currentCount;
        job.reason = "target_met";
        return;
      }
      const missing = Math.max(1, job.target - currentCount);
      const waveTerms = [
        `${job.category.keyword} ${job.city.label}`,
        `${job.city.label} ${job.category.keyword} merkez`,
        `${job.category.label} ${job.city.label}`,
        `${job.category.keyword} ${job.city.label} yakınları`,
      ];
      const query = waveTerms[wave % waveTerms.length] ?? waveTerms[0];
      const result = await withKesfetScrapeTimeout(
        scrapeGoogleMaps({
          query,
          lat: job.city.lat,
          lng: job.city.lng,
          radiusMeters: job.radiusMeters,
          maxResults: Math.min(KESFET_SCRAPER_BACKFILL_WAVE_MAX_RESULTS, Math.max(10, missing * 2)),
          enrichAll: true,
          enrichMax: KESFET_SCRAPER_BACKFILL_ENRICH_MAX,
        }),
        KESFET_SCRAPER_BACKFILL_WAVE_TIMEOUT_MS,
        `kazıma ${job.city.label}/${job.category.slug}`,
      );
      if (result.error && result.businesses.length === 0) throw new Error(result.error);
      const out = await importGoogleMapsScrapedBusinesses({
        businesses: result.businesses,
        city: job.city,
        category: job.category,
        maxToImport: missing,
        radiusMeters: job.radiusMeters,
        sourceLabel: "public_kesfet_backfill",
      });
      imported += out.imported;
      skipped += out.skipped;
      errors.push(...out.errors);
      if (out.imported === 0 && result.businesses.length === 0) break;
    }
    const foundAfter = await countKesfetBackfillBusinesses({ city: job.city, category: job.category, radiusMeters: job.radiusMeters }).catch(() => job.foundBefore + imported);
    job.foundAfter = foundAfter;
    job.imported = imported;
    job.skipped = skipped;
    job.status = "done";
    job.reason = foundAfter >= job.target ? "target_met" : "best_effort_exhausted";
    if (errors.length) job.error = errors.slice(0, 5).join(" | ");
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : String(err);
    kesfetScraperBackfillLastError = job.error;
    await resetSharedBrowser().catch(() => {});
  } finally {
    job.updatedAt = new Date().toISOString();
    kesfetScraperBackfillLastRunAt = job.updatedAt;
    if (imported > 0) kesfetScraperBackfillLastImported = imported;
  }
}

function runKesfetScraperBackfillWorker(): void {
  if (kesfetScraperBackfillWorkerRunning) return;
  kesfetScraperBackfillWorkerRunning = true;
  void (async () => {
    try {
      while (kesfetScraperBackfillQueue.length > 0) {
        const jobId = kesfetScraperBackfillQueue.shift();
        const job = getKesfetBackfillJobStatus(jobId);
        if (!job || job.status !== "queued") continue;
        job.status = "running";
        job.updatedAt = new Date().toISOString();
        await withKesfetScrapeTimeout(
          runKesfetScraperBackfillJob(job),
          KESFET_SCRAPER_BACKFILL_JOB_TIMEOUT_MS,
          `backfill işi ${job.city.label}/${job.category.slug}`,
        ).catch(async (err) => {
          if (job.status === "running") {
            job.status = "error";
            job.error = err instanceof Error ? err.message : String(err);
            kesfetScraperBackfillLastError = job.error;
          }
          await resetSharedBrowser().catch(() => {});
        });
      }
    } finally {
      kesfetScraperBackfillWorkerRunning = false;
      if (kesfetScraperBackfillQueue.length > 0) runKesfetScraperBackfillWorker();
    }
  })();
}

/* — GECE OTOMATİK GOOGLE MAPS KAZIMA BOTU ──────────────────────────
 * Gece 00:00–09:00 (Türkiye saati) arasında durmadan çalışır; tüm şehir ×
 * kategori çiftlerini sırayla dolaşıp Google Maps'ten derin kazıma (yorum,
 * fotoğraf, çalışma saati, telefon, web) yaparak ortak harita veritabanına
 * ekler. Kalıcı imleç sayesinde her gece kaldığı yerden devam eder ve
 * `refreshIntervalDays` dolan kayıtları otomatik tazeler. Google Places API
 * KULLANILMAZ — yalnız tarayıcı tabanlı kazıma botu. */

type NightScraperLogger = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

const NIGHT_SCRAPER_START_HOUR = Math.max(0, Math.min(23, Number(process.env["KESFET_NIGHT_SCRAPER_START_HOUR"] ?? 0) || 0));
const NIGHT_SCRAPER_END_HOUR = Math.max(1, Math.min(24, Number(process.env["KESFET_NIGHT_SCRAPER_END_HOUR"] ?? 9) || 9));
/**
 * Sürekli (7/24) mod — varsayılan KAPALI. Gece botu yalnızca 00:00–09:00 (TR) penceresinde
 * çalışır; gündüz çalıştırmak için KESFET_NIGHT_SCRAPER_ALL_DAY=1.
 * Kuyruk/hız sınırlaması (tick başına 2 iş, kuyruk derinliği 2) korunur.
 */
const NIGHT_SCRAPER_ALL_DAY = process.env["KESFET_NIGHT_SCRAPER_ALL_DAY"] === "1";
const NIGHT_SCRAPER_TZ_OFFSET_MIN = 3 * 60;
const NIGHT_SCRAPER_TICK_MS = 45_000;
const NIGHT_SCRAPER_MAX_QUEUE_DEPTH = 2;
const NIGHT_SCRAPER_JOBS_PER_TICK = 2;
const NIGHT_SCRAPER_MAX_SCAN_PER_TICK = 12;

let nightScraperStarted = false;
let nightScraperStopFn: (() => void) | null = null;
let nightScraperLogRef: NightScraperLogger | null = null;
let nightScraperChromiumOk: boolean | null = null;
let nightScraperEnabledOverride: boolean | null = null;
let nightScraperCursor = 0;
let nightScraperCyclesCompleted = 0;
let nightScraperLastTickAt: string | null = null;
let nightScraperLastEnqueuedAt: string | null = null;
let nightScraperLastPair: { city: string; category: string } | null = null;
let nightScraperLastSkipReason: string | null = null;
let nightScraperForceUntil = 0;
let nightScraperForceSource: "admin" | "haritalar" | null = null;
let nightScraperHaritalarWakeAt: string | null = null;
/** Gece botu kategorileri — katalogdan yüklenir; inşaat hariç tüm GMaps kategorileri. */
let nightScraperCategories: KesfetScraperBackfillCategory[] = [...KESFET_SCRAPER_BACKFILL_CATEGORIES];

async function refreshNightScraperCategories(): Promise<void> {
  try {
    const { groups } = await fetchMapScraperCategoryCatalog();
    const bucket = new Map<string, KesfetScraperBackfillCategory>();
    for (const group of groups) {
      if (group.superCategory === "insaat") continue;
      for (const item of group.items) {
        const key = `${item.slug}::${item.homepageSuperCategory}::${item.storeType}`;
        if (bucket.has(key)) continue;
        bucket.set(
          key,
          normalizeKesfetBackfillCategory({
            slug: item.slug,
            label: item.label,
            keyword: item.googleKeyword,
            googlePlaceType: item.googlePlaceType ?? undefined,
            homepageSuperCategory: item.homepageSuperCategory,
            storeType: item.storeType,
          }),
        );
      }
    }
    if (bucket.size > 0) {
      nightScraperCategories = [...bucket.values()];
    }
  } catch {
    /* katalog yüklenemezse backfill listesiyle devam */
  }
}

function getTurkeyHourMinute(now = new Date()): { hour: number; minute: number } {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const trMinutes = (utcMinutes + NIGHT_SCRAPER_TZ_OFFSET_MIN + 1440) % 1440;
  return { hour: Math.floor(trMinutes / 60), minute: trMinutes % 60 };
}

function isWithinNightScraperWindow(now = new Date()): boolean {
  const { hour } = getTurkeyHourMinute(now);
  if (NIGHT_SCRAPER_START_HOUR <= NIGHT_SCRAPER_END_HOUR) {
    return hour >= NIGHT_SCRAPER_START_HOUR && hour < NIGHT_SCRAPER_END_HOUR;
  }
  // Gece yarısını aşan pencere (örn. 22→6)
  return hour >= NIGHT_SCRAPER_START_HOUR || hour < NIGHT_SCRAPER_END_HOUR;
}

/** Sürekli mod açıksa her zaman; değilse yalnız gece penceresinde aktif. */
function isScraperWindowActive(now = new Date()): boolean {
  return NIGHT_SCRAPER_ALL_DAY || isWithinNightScraperWindow(now);
}

function kesfetNightScraperTotalPairs(): number {
  return KESFET_SCRAPER_BACKFILL_CITIES.length * nightScraperCategories.length;
}

function kesfetNightScraperPairAt(index: number): { city: KesfetScraperBackfillCity; category: KesfetScraperBackfillCategory } | null {
  const cities = KESFET_SCRAPER_BACKFILL_CITIES;
  const cats = nightScraperCategories;
  const total = cities.length * cats.length;
  if (total === 0) return null;
  const i = ((index % total) + total) % total;
  const city = cities[Math.floor(i / cats.length)];
  const category = cats[i % cats.length];
  if (!city || !category) return null;
  return { city, category };
}

type NightScraperPersistState = { cursor: number; cyclesCompleted: number };

async function loadNightScraperPersistState(): Promise<NightScraperPersistState> {
  const rows = await db
    .select({ mapLayerConfigJson: mapSystemSettingsTable.mapLayerConfigJson })
    .from(mapSystemSettingsTable)
    .where(eq(mapSystemSettingsTable.id, "system"))
    .limit(1)
    .catch(() => [] as Array<{ mapLayerConfigJson: string | null }>);
  const cfg = readMapLayerConfig(rows[0]?.mapLayerConfigJson);
  const raw = cfg.nightScraperState && typeof cfg.nightScraperState === "object"
    ? cfg.nightScraperState as Record<string, unknown>
    : {};
  const cursor = Number(raw.cursor);
  const cyclesCompleted = Number(raw.cyclesCompleted);
  return {
    cursor: Number.isFinite(cursor) && cursor >= 0 ? Math.floor(cursor) : 0,
    cyclesCompleted: Number.isFinite(cyclesCompleted) && cyclesCompleted >= 0 ? Math.floor(cyclesCompleted) : 0,
  };
}

async function saveNightScraperPersistState(state: NightScraperPersistState): Promise<void> {
  try {
    const rows = await db
      .select({ mapLayerConfigJson: mapSystemSettingsTable.mapLayerConfigJson })
      .from(mapSystemSettingsTable)
      .where(eq(mapSystemSettingsTable.id, "system"))
      .limit(1);
    if (rows.length === 0) {
      const cfg = readMapLayerConfig(null);
      cfg.nightScraperState = state;
      await db.insert(mapSystemSettingsTable).values({
        id: "system",
        mapLayerConfigJson: JSON.stringify(cfg),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      return;
    }
    const cfg = readMapLayerConfig(rows[0].mapLayerConfigJson);
    cfg.nightScraperState = state;
    await db
      .update(mapSystemSettingsTable)
      .set({ mapLayerConfigJson: JSON.stringify(cfg), updatedAt: new Date() })
      .where(eq(mapSystemSettingsTable.id, "system"));
  } catch {
    /* kalıcılık best-effort; bellekteki imleç çalışmayı sürdürür */
  }
}

async function tickKesfetNightScraper(log: NightScraperLogger): Promise<void> {
  nightScraperLastTickAt = new Date().toISOString();

  let settings: MapAutoImportSettings;
  try {
    settings = await getMapAutoImportSettings();
  } catch {
    settings = DEFAULT_MAP_AUTO_IMPORT_SETTINGS;
  }

  const globallyEnabled =
    nightScraperEnabledOverride !== null
      ? nightScraperEnabledOverride
      : settings.scraperBackfillEnabled;
  if (!globallyEnabled) {
    nightScraperLastSkipReason = "disabled";
    return;
  }

  if (isInsaatfirmalarimWorkerActivelyBusy()) {
    nightScraperLastSkipReason = "insaat_queue_busy";
    return;
  }

  const forcing = Date.now() < nightScraperForceUntil;
  if (!forcing && !isScraperWindowActive()) {
    nightScraperLastSkipReason = "outside_window";
    return;
  }

  if (kesfetScraperBackfillQueue.length >= NIGHT_SCRAPER_MAX_QUEUE_DEPTH) {
    nightScraperLastSkipReason = "queue_busy";
    return;
  }

  if (nightScraperChromiumOk === false) {
    nightScraperLastSkipReason = "chromium_unavailable";
    return;
  }

  const total = kesfetNightScraperTotalPairs();
  if (total === 0) {
    nightScraperLastSkipReason = "no_pairs";
    return;
  }

  const target = Math.max(20, Math.min(KESFET_SCRAPER_BACKFILL_TARGET_MAX, settings.scraperBackfillTargetPerCategory));
  const radiusMeters = settings.scraperBackfillRadiusMeters;
  const refreshIntervalDays = settings.refreshIntervalDays;

  let fed = 0;
  let scanned = 0;
  let lastReason: string | null = null;
  while (
    fed < NIGHT_SCRAPER_JOBS_PER_TICK &&
    scanned < Math.min(total, NIGHT_SCRAPER_MAX_SCAN_PER_TICK) &&
    kesfetScraperBackfillQueue.length < NIGHT_SCRAPER_MAX_QUEUE_DEPTH &&
    (forcing || isScraperWindowActive())
  ) {
    const pair = kesfetNightScraperPairAt(nightScraperCursor);
    nightScraperCursor += 1;
    if (nightScraperCursor >= total) {
      nightScraperCursor = 0;
      nightScraperCyclesCompleted += 1;
    }
    scanned += 1;
    if (!pair) continue;
    try {
      const out = await enqueueKesfetScraperBackfill({
        city: pair.city,
        category: pair.category,
        target,
        refreshIntervalDays,
        radiusMeters,
      });
      lastReason = out.reason;
      if (out.queued) {
        fed += 1;
        nightScraperLastEnqueuedAt = new Date().toISOString();
        nightScraperLastPair = { city: pair.city.label, category: pair.category.label };
        nightScraperLastSkipReason = null;
        log.info(
          { city: pair.city.label, category: pair.category.label, found: out.found, target },
          "[kesfet-night-scraper] derin kazıma işi kuyruğa eklendi",
        );
      }
    } catch (err) {
      lastReason = err instanceof Error ? err.message : String(err);
      log.warn({ err, city: pair.city.label, category: pair.category.label }, "[kesfet-night-scraper] iş eklenemedi");
    }
  }

  if (fed === 0) nightScraperLastSkipReason = lastReason ?? "all_fresh";
  void saveNightScraperPersistState({ cursor: nightScraperCursor, cyclesCompleted: nightScraperCyclesCompleted });
}

function getTurkeyMidnightUtc(now = new Date()): Date {
  const trMs = now.getTime() + NIGHT_SCRAPER_TZ_OFFSET_MIN * 60_000;
  const trDayStartMs = Math.floor(trMs / 86_400_000) * 86_400_000 - NIGHT_SCRAPER_TZ_OFFSET_MIN * 60_000;
  return new Date(trDayStartMs);
}

async function getKesfetNightScraperDbStats() {
  const since = getTurkeyMidnightUtc();
  const sinceIso = since.toISOString();
  const [createdRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(eq(mapBusinessesTable.importSource, "gmaps_scrape"), gte(mapBusinessesTable.createdAt, since)))
    .catch(() => [{ count: 0 }]);
  const [scrapedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(eq(mapBusinessesTable.importSource, "gmaps_scrape"), gte(mapBusinessesTable.scrapedAt, since)))
    .catch(() => [{ count: 0 }]);
  const [totalGmapsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(eq(mapBusinessesTable.importSource, "gmaps_scrape"))
    .catch(() => [{ count: 0 }]);
  return {
    sinceMidnightTurkey: sinceIso,
    gmapsScrapeCreatedSinceMidnight: createdRow?.count ?? 0,
    gmapsScrapeScrapedSinceMidnight: scrapedRow?.count ?? 0,
    gmapsScrapeTotal: totalGmapsRow?.count ?? 0,
  };
}

function applyKesfetNightScraperForceUntil(
  untilMs: number,
  source: "admin" | "haritalar",
  log?: NightScraperLogger,
): void {
  nightScraperForceUntil = Math.max(nightScraperForceUntil, untilMs);
  nightScraperForceSource = source;
  if (source === "haritalar") {
    nightScraperHaritalarWakeAt = new Date().toISOString();
  }
  const tickLog = log ?? nightScraperLogRef;
  if (tickLog) {
    void withPgAdvisoryLock(PG_ADVISORY_LOCKS.KESFET_NIGHT_SCRAPER, () => tickKesfetNightScraper(tickLog)).catch(() => {});
  }
}

function wakeKesfetNightScraperFromHaritalar(options: { hours?: number; allDay?: boolean }, log?: NightScraperLogger) {
  if (process.env["KESFET_NIGHT_SCRAPER"] === "0") {
    return { ok: false as const, reason: "disabled" as const, alreadyActive: false };
  }
  const now = Date.now();
  let untilMs: number;
  if (options.allDay) {
    const midnight = getTurkeyMidnightUtc();
    untilMs = midnight.getTime() + 86_400_000;
  } else {
    const hours = Math.max(1, Math.min(12, Number(options.hours ?? 2) || 2));
    untilMs = now + hours * 60_000;
  }
  const alreadyActive = now < nightScraperForceUntil && nightScraperForceSource === "haritalar";
  applyKesfetNightScraperForceUntil(untilMs, "haritalar", log);
  return {
    ok: true as const,
    alreadyActive,
    forcingUntil: new Date(nightScraperForceUntil).toISOString(),
    hours: options.allDay ? null : Math.max(1, Math.min(12, Number(options.hours ?? 2) || 2)),
    allDay: Boolean(options.allDay),
  };
}

function getKesfetNightScraperStatus() {
  const { hour, minute } = getTurkeyHourMinute();
  const total = kesfetNightScraperTotalPairs();
  const chromium = getChromiumPathForStatus();
  const probe = getLastChromiumProbe();
  const forcingActive = nightScraperForceUntil > Date.now();
  return {
    provider: "google_maps_scraper_bot",
    usesPlacesApi: false,
    started: nightScraperStarted,
    env: {
      kesfetNightScraper: process.env["KESFET_NIGHT_SCRAPER"] !== "0",
      allDay: NIGHT_SCRAPER_ALL_DAY,
    },
    chromium: {
      path: chromium.path,
      fromEnv: chromium.fromEnv,
      ok: nightScraperChromiumOk ?? probe?.ok ?? null,
      lastProbeAt: probe?.checkedAt ?? null,
      lastProbeError: probe?.error ?? null,
    },
    enabledOverride: nightScraperEnabledOverride,
    allDay: NIGHT_SCRAPER_ALL_DAY,
    window: {
      startHour: NIGHT_SCRAPER_START_HOUR,
      endHour: NIGHT_SCRAPER_END_HOUR,
      timezone: "Europe/Istanbul (UTC+3)",
      label: NIGHT_SCRAPER_ALL_DAY
        ? "7/24 sürekli"
        : `${String(NIGHT_SCRAPER_START_HOUR).padStart(2, "0")}:00–${String(NIGHT_SCRAPER_END_HOUR).padStart(2, "0")}:00`,
    },
    turkeyTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    withinWindow: isScraperWindowActive(),
    forcingUntil: forcingActive ? new Date(nightScraperForceUntil).toISOString() : null,
    forceSource: forcingActive ? nightScraperForceSource : null,
    haritalarWake: {
      lastAt: nightScraperHaritalarWakeAt,
      active: forcingActive && nightScraperForceSource === "haritalar",
      activeUntil:
        forcingActive && nightScraperForceSource === "haritalar"
          ? new Date(nightScraperForceUntil).toISOString()
          : null,
    },
    running: forcingActive || isScraperWindowActive()
      ? kesfetScraperBackfillWorkerRunning || kesfetScraperBackfillQueue.length > 0
      : false,
    idle: !forcingActive && !isScraperWindowActive() && !kesfetScraperBackfillWorkerRunning,
    cursor: nightScraperCursor,
    totalPairs: total,
    progressPercent: total ? Math.round((nightScraperCursor / total) * 100) : 0,
    cyclesCompleted: nightScraperCyclesCompleted,
    lastTickAt: nightScraperLastTickAt,
    lastEnqueuedAt: nightScraperLastEnqueuedAt,
    lastPair: nightScraperLastPair,
    lastSkipReason: nightScraperLastSkipReason,
    backfillLastRunAt: kesfetScraperBackfillLastRunAt,
    backfillLastError: kesfetScraperBackfillLastError,
    backfillLastImported: kesfetScraperBackfillLastImported,
    queueDepth: kesfetScraperBackfillQueue.length,
    workerRunning: kesfetScraperBackfillWorkerRunning,
    cityCount: KESFET_SCRAPER_BACKFILL_CITIES.length,
    categoryCount: nightScraperCategories.length,
  };
}

/** index.ts startup'tan çağrılır. Gece penceresinde sürekli (durmadan) kazıma yapar. */
export function startKesfetNightScraper(log: NightScraperLogger): () => void {
  if (nightScraperStarted) return () => {};
  nightScraperStarted = true;
  nightScraperLogRef = log;

  void verifyChromiumStartup()
    .then((probe) => {
      nightScraperChromiumOk = probe.ok;
      log.info(
        {
          chromiumPath: probe.path,
          chromiumOk: probe.ok,
          chromiumError: probe.error,
          allDay: NIGHT_SCRAPER_ALL_DAY,
        },
        probe.ok
          ? "[kesfet-night-scraper] Chromium doğrulandı"
          : "[kesfet-night-scraper] Chromium BAŞARISIZ — kazıma işleri çalışmayacak",
      );
    })
    .catch((err) => {
      nightScraperChromiumOk = false;
      log.error({ err }, "[kesfet-night-scraper] Chromium doğrulama hatası");
    });

  const tick = () => {
    void withPgAdvisoryLock(PG_ADVISORY_LOCKS.KESFET_NIGHT_SCRAPER, () => tickKesfetNightScraper(log)).catch((err) =>
      log.error({ err }, "[kesfet-night-scraper] tick hatası"),
    );
  };

  void refreshNightScraperCategories()
    .then(() => loadNightScraperPersistState())
    .then((state) => {
      nightScraperCursor = state.cursor;
      nightScraperCyclesCompleted = state.cyclesCompleted;
      log.info(
        {
          cursor: state.cursor,
          cyclesCompleted: state.cyclesCompleted,
          totalPairs: kesfetNightScraperTotalPairs(),
          allDay: NIGHT_SCRAPER_ALL_DAY,
        },
        "[kesfet-night-scraper] başlatıldı (gece otomatik Google Maps kazıma botu)",
      );
      tick();
    })
    .catch((err) => {
      log.warn({ err }, "[kesfet-night-scraper] kalıcı imleç yüklenemedi; sıfırdan başlanıyor");
      tick();
    });

  const id = setInterval(tick, NIGHT_SCRAPER_TICK_MS);
  (id as unknown as { unref?: () => void }).unref?.();

  return () => {
    clearInterval(id);
    nightScraperStarted = false;
    nightScraperLogRef = null;
    nightScraperStopFn = null;
  };
}

function stopKesfetNightScraperInterval(): void {
  if (nightScraperStopFn) {
    nightScraperStopFn();
    nightScraperStopFn = null;
  }
}

function isKesfetNightScraperEnvDisabled(): boolean {
  return process.env["KESFET_NIGHT_SCRAPER"] === "0";
}

function isKesfetNightScraperEnvForced(): boolean {
  return process.env["KESFET_NIGHT_SCRAPER"] === "1";
}

async function shouldRunKesfetNightScraperScheduler(): Promise<boolean> {
  if (isKesfetNightScraperEnvDisabled()) return false;
  if (isKesfetNightScraperEnvForced()) return true;
  if (nightScraperEnabledOverride !== null) return nightScraperEnabledOverride;
  const settings = await getMapAutoImportSettings().catch(() => DEFAULT_MAP_AUTO_IMPORT_SETTINGS);
  return settings.scraperBackfillEnabled;
}

async function persistScraperBackfillEnabled(enabled: boolean): Promise<void> {
  const rows = await db
    .select({ mapLayerConfigJson: mapSystemSettingsTable.mapLayerConfigJson })
    .from(mapSystemSettingsTable)
    .where(eq(mapSystemSettingsTable.id, "system"))
    .limit(1);
  const cfg = readMapLayerConfig(rows[0]?.mapLayerConfigJson);
  cfg.autoImportSettings = {
    ...normalizeMapAutoImportSettings(cfg.autoImportSettings),
    scraperBackfillEnabled: enabled,
  };
  if (rows.length === 0) {
    await db.insert(mapSystemSettingsTable).values({
      id: "system",
      mapLayerConfigJson: JSON.stringify(cfg),
      updatedAt: new Date(),
    }).onConflictDoNothing();
    return;
  }
  await db
    .update(mapSystemSettingsTable)
    .set({ mapLayerConfigJson: JSON.stringify(cfg), updatedAt: new Date() })
    .where(eq(mapSystemSettingsTable.id, "system"));
}

/** index.ts: DB'deki scraperBackfillEnabled=true ise zamanlayıcıyı başlatır. */
export async function bootstrapKesfetNightScraperFromSettings(log: NightScraperLogger): Promise<(() => void) | null> {
  const shouldRun = await shouldRunKesfetNightScraperScheduler();
  if (!shouldRun) {
    log.info(
      "[kesfet-night-scraper] kapalı — Haritalar yönetimi → otomatik kazıma düğmesi veya KESFET_NIGHT_SCRAPER=1",
    );
    return null;
  }
  if (nightScraperStarted && nightScraperStopFn) return nightScraperStopFn;
  nightScraperStopFn = startKesfetNightScraper(log);
  return nightScraperStopFn;
}

/** Admin ayarı değişince zamanlayıcıyı başlat/durdur. */
export async function syncKesfetNightScraperScheduler(log: NightScraperLogger): Promise<(() => void) | null> {
  const shouldRun = await shouldRunKesfetNightScraperScheduler();
  if (shouldRun) {
    if (!nightScraperStarted) {
      nightScraperStopFn = startKesfetNightScraper(log);
    }
    return nightScraperStopFn;
  }
  stopKesfetNightScraperInterval();
  return null;
}

async function runKesfetScraperBackfillInline(input: {
  city: KesfetScraperBackfillCity;
  category: KesfetScraperBackfillCategory;
  target: number;
  refreshIntervalDays: number;
  radiusMeters?: number;
  maxWaves?: number;
}): Promise<{
  status: "done" | "skipped" | "error";
  foundBefore: number;
  foundAfter: number;
  imported: number;
  skipped: number;
  errors: string[];
  reason: string;
}> {
  const target = Math.max(1, Math.min(KESFET_SCRAPER_BACKFILL_TARGET_MAX, Math.round(input.target || KESFET_SCRAPER_BACKFILL_TARGET_DEFAULT)));
  const maxWaves = Math.max(1, Math.min(KESFET_SCRAPER_BACKFILL_MAX_WAVES, Math.round(input.maxWaves ?? 2)));
  const radiusMeters = Math.max(10_000, Math.min(50_000, Math.round(input.radiusMeters ?? KESFET_SCRAPER_BACKFILL_RADIUS_M)));
  const foundBefore = await countKesfetBackfillBusinesses({
    city: input.city,
    category: input.category,
    refreshIntervalDays: input.refreshIntervalDays,
    radiusMeters,
  }).catch(() => 0);
  if (foundBefore >= target) {
    return {
      status: "skipped",
      foundBefore,
      foundAfter: foundBefore,
      imported: 0,
      skipped: foundBefore,
      errors: [],
      reason: "fresh_target_met",
    };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  let foundAfter = foundBefore;
  try {
    for (let wave = 0; wave < maxWaves; wave++) {
      foundAfter = await countKesfetBackfillBusinesses({ city: input.city, category: input.category, radiusMeters }).catch(() => foundAfter);
      if (foundAfter >= target) break;
      const missing = Math.max(1, target - foundAfter);
      const waveTerms = [
        `${input.category.keyword} ${input.city.label}`,
        `${input.city.label} ${input.category.keyword} merkez`,
        `${input.category.label} ${input.city.label}`,
        `${input.category.keyword} ${input.city.label} yakınları`,
      ];
      const query = waveTerms[wave % waveTerms.length] ?? waveTerms[0];
      const result = await scrapeGoogleMaps({
        query,
        lat: input.city.lat,
        lng: input.city.lng,
        radiusMeters,
        maxResults: Math.min(KESFET_SCRAPER_BACKFILL_WAVE_MAX_RESULTS, Math.max(10, missing * 2)),
        enrichAll: true,
        enrichMax: KESFET_SCRAPER_BACKFILL_ENRICH_MAX,
      });
      if (result.error && result.businesses.length === 0) throw new Error(result.error);
      const out = await importGoogleMapsScrapedBusinesses({
        businesses: result.businesses,
        city: input.city,
        category: input.category,
        maxToImport: missing,
        radiusMeters,
        sourceLabel: "public_kesfet_backfill",
      });
      imported += out.imported;
      skipped += out.skipped;
      errors.push(...out.errors);
      foundAfter = await countKesfetBackfillBusinesses({ city: input.city, category: input.category, radiusMeters }).catch(() => foundAfter + out.imported);
      if (foundAfter >= target) break;
      if (out.imported === 0 && result.businesses.length === 0) break;
    }
    return {
      status: "done",
      foundBefore,
      foundAfter,
      imported,
      skipped,
      errors: errors.slice(0, 5),
      reason: foundAfter >= target ? "target_met" : imported > 0 ? "partial_inline_import" : "best_effort_exhausted",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    kesfetScraperBackfillLastError = message;
    return {
      status: "error",
      foundBefore,
      foundAfter,
      imported,
      skipped,
      errors: [message, ...errors].slice(0, 5),
      reason: "inline_scrape_failed",
    };
  } finally {
    kesfetScraperBackfillLastRunAt = new Date().toISOString();
  }
}

/** Legacy hook kept for admin compatibility; automatic imports no longer run browser scraping. */
async function runHybridScrapeEnrichmentForNewBusinesses(
  rows: Array<{
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  }>,
  log: { warn: (o: unknown, m?: string) => void },
): Promise<void> {
  void rows;
  void log;
  // Automatic imports use official Google payloads only; browser scraping remains manual/admin.
}

async function insertMapBusinessImportImages(
  businessId: string | undefined | null,
  photos: string[],
  limit = GOOGLE_IMPORT_MEDIA_LIMIT,
): Promise<void> {
  if (!businessId) return;
  const linkedPhotos = photos
    .map((photo) => String(photo ?? "").trim())
    .filter((photo) => isExternalImageReference(photo) || isLocalCachedMediaUrl(photo))
    .slice(0, Math.max(0, limit));
  for (let i = 0; i < linkedPhotos.length; i++) {
    const imageUrl = linkedPhotos[i];
    if (!imageUrl) continue;
    await db.insert(mapBusinessImagesTable).values({
      businessId,
      imageUrl,
      sortOrder: i,
      isPrimary: i === 0,
    }).onConflictDoNothing().catch(() => {});
  }
}

async function resolveImportGalleryPhotos(
  photos: string[],
  meta: {
    homepageSuperCategory?: string | null;
    homepageFeatured?: boolean | null;
    storeType?: string | null;
  },
): Promise<{ coverUrl: string | null; galleryPhotos: string[] }> {
  return resolveCachedCoverPhoto(photos, meta);
}

const JWT_SECRET = getSessionSecret();

/* — AUTH HELPERS ───────────────────────────────────────────────── */

interface AuthUser {
  uid?: string;
  userId?: string;
  email?: string;
  name?: string;
}

async function resolveAuthUser(authHeader: string | undefined): Promise<AuthUser | null> {
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  // Harita web / sahip girişi: önce bu sunucunun JWT'si
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string };
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    /* not our JWT */
  }
  // Mobil Firebase Auth: yalnızca yeni proje için ortam değişkenleri tanımlandıysa
  if (isFirebaseAdminConfigured()) {
    try {
      const fbUser = await verifyFirebaseToken(authHeader);
      return { uid: fbUser.uid, email: fbUser.email, name: fbUser.name };
    } catch {
      return null;
    }
  }
  return null;
}

async function getOrCreateMapUser(authUser: AuthUser) {
  if (authUser.uid) {
    const existing = await db.select().from(mapUsersTable).where(eq(mapUsersTable.firebaseUid, authUser.uid)).limit(1);
    if (existing.length > 0) return existing[0];
    // Create new user
    const nameParts = (authUser.name || "").trim().split(/\s+/);
    const [created] = await db.insert(mapUsersTable).values({
      firebaseUid: authUser.uid,
      email: authUser.email ?? null,
      firstName: nameParts[0] ?? null,
      lastName: nameParts.slice(1).join(" ") || null,
      displayName: authUser.name ?? null,
      provider: "google",
    }).returning();
    return created;
  }
  if (authUser.userId) {
    const existing = await db.select().from(mapUsersTable).where(eq(mapUsersTable.id, authUser.userId)).limit(1);
    return existing[0] ?? null;
  }
  return null;
}

function mapAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  resolveAuthUser(req.headers.authorization).then((user) => {
    if (!user) {
      res.status(401).json({ success: false, error: "Kimlik doğrulama gerekli" });
      return;
    }
    (req as Request & { mapUser?: AuthUser }).mapUser = user;
    next();
  }).catch(() => {
    res.status(401).json({ success: false, error: "Geçersiz token" });
  });
}

function optionalMapAuth(req: Request, _res: Response, next: NextFunction): void {
  resolveAuthUser(req.headers.authorization).then((user) => {
    if (user) (req as Request & { mapUser?: AuthUser }).mapUser = user;
    next();
  }).catch(() => next());
}

async function resolveOptionalMapUser(req: Request): Promise<{ userId: string | null; deviceId: string | null }> {
  const authUser = (req as Request & { mapUser?: AuthUser }).mapUser;
  const dbUser = authUser ? await getOrCreateMapUser(authUser).catch(() => null) : null;
  const rawDevice =
    String(req.headers["x-yekpare-map-device"] ?? req.query.deviceId ?? req.body?.deviceId ?? "").trim();
  const deviceId = rawDevice.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 96) || null;
  return { userId: dbUser?.id ?? null, deviceId };
}

function requireMapIdentity(identity: { userId: string | null; deviceId: string | null }, res: Response): boolean {
  if (identity.userId || identity.deviceId) return true;
  res.status(400).json({ success: false, error: "deviceId veya kullanıcı oturumu gerekli" });
  return false;
}

function safeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapDraftCategoryMetadata(body: unknown, base: Record<string, unknown> = {}): Record<string, unknown> {
  const input = safeJsonObject(body);
  const rawLabel = String(input.categoryRawLabel ?? input.category ?? "").trim();
  const categoryId = String(input.categoryId ?? "").trim();
  const categorySlug = String(input.categorySlug ?? "").trim();
  const categoryName = String(input.categoryName ?? "").trim();
  const nextRawLabel = input.categoryRawLabel !== undefined || input.category !== undefined ? rawLabel || null : base.categoryRawLabel || null;
  const nextCategoryId = input.categoryId !== undefined ? categoryId || null : base.categoryId || null;
  const nextCategorySlug = input.categorySlug !== undefined ? categorySlug || null : base.categorySlug || null;
  const nextCategoryName = input.categoryName !== undefined ? categoryName || null : base.categoryName || null;
  return {
    ...base,
    categoryRawLabel: nextRawLabel,
    categoryId: nextCategoryId,
    categorySlug: nextCategorySlug,
    categoryName: nextCategoryName,
    selectedCategory: nextCategoryId || nextCategorySlug || nextCategoryName
      ? {
          id: nextCategoryId,
          slug: nextCategorySlug,
          name: nextCategoryName,
        }
      : null,
  };
}

/* — HEALTH CHECK ───────────────────────────────────────────────── */

router.get("/map/health", (_req, res): void => {
  res.json({ success: true, message: "Map API çalışıyor" });
});

function normalizeVisitorCountryCode(raw: unknown): string | null {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!code || code === "XX" || code === "T1") return null;
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function readVisitorCountryFromRequest(req: { headers: Record<string, unknown> }): { countryCode: string | null; source: string } {
  const headerPairs: Array<[string, string]> = [
    ["cf-ipcountry", "cf_ipcountry"],
    ["x-vercel-ip-country", "vercel_ipcountry"],
    ["cloudfront-viewer-country", "cloudfront_viewer_country"],
    ["x-country-code", "x_country_code"],
    ["x-appengine-country", "appengine_country"],
  ];
  for (const [header, source] of headerPairs) {
    const value = req.headers[header] ?? req.headers[header.toUpperCase()];
    const countryCode = normalizeVisitorCountryCode(Array.isArray(value) ? value[0] : value);
    if (countryCode) return { countryCode, source };
  }
  return { countryCode: null, source: "unknown" };
}

router.get("/map/visitor-country", (req, res): void => {
  const detected = readVisitorCountryFromRequest(req);
  res.json({
    success: true,
    countryCode: detected.countryCode,
    source: detected.source,
  });
});

/** Haber haritası konum videosu — YekTube DB araması (YouTube import kapalı). */
router.get("/map/newsmap/location-yektube", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json({ items: [], total: 0, localCount: 0 });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 32) || 32, 50);
  try {
    const result = await searchYektubeVideos(q, {
      limit,
      excludeStories: false,
      importFromYoutube: false,
    });
    res.json({
      items: result.items.map((v) => ({
        id: v.id,
        sourceId: v.sourceId,
        videoId: v.videoId,
        title: v.title,
        description: v.description ?? null,
        thumbnail: v.thumbnail ?? null,
        publishedAt: v.publishedAt ?? null,
        channelName: v.channelName ?? null,
      })),
      total: result.total,
      localCount: result.localCount,
    });
  } catch {
    res.json({ items: [], total: 0, localCount: 0 });
  }
});

/** Haber haritası konum videosu — önce YekTube; boşsa YouTube kazıması. */
router.get("/map/newsmap/location-youtube", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json({ items: [], total: 0 });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 48) || 48, 100);
  const langRaw = String(req.query.lang ?? "auto").trim().toLowerCase();
  const lang = langRaw === "en" || langRaw === "tr" ? langRaw : "auto";
  const queryModeRaw = String(req.query.queryMode ?? "auto").trim().toLowerCase();
  const queryMode =
    queryModeRaw === "travel" || queryModeRaw === "news" || queryModeRaw === "bare" ? queryModeRaw : "auto";
  const QUALIFIER_RE = /\b(haber|news|video|gezi|tanitim|tanıtım|travel|turizm|tourism|promo|yemek|yasam|yaşam|life|food|gezilecek|tatil)\b/gi;
  const hasQualifier = QUALIFIER_RE.test(q);
  QUALIFIER_RE.lastIndex = 0;
  const bareLocation = q.replace(QUALIFIER_RE, "").replace(/\s+/g, " ").trim() || q;
  let searchQ = q;
  if (queryMode === "bare") {
    searchQ = q;
  } else if (!hasQualifier) {
    if (queryMode === "news") {
      searchQ = lang === "en" ? `${q} news` : `${q} haber`;
    } else {
      searchQ = lang === "en" ? `${q} travel` : `${q} gezi tanıtım yemek yaşam`;
    }
  }

  const BALI_FALSE_POSITIVE_RE = /\b(bal(?!i)|balina|balik|balikesir)\b/i;
  function isVideoFalsePositive(title: string, description: string): boolean {
    const hay = `${title} ${description}`.toLowerCase();
    const cityKey = bareLocation.toLowerCase();
    if (cityKey === "bali") {
      if (/\bbali\b/.test(hay)) return false;
      if (BALI_FALSE_POSITIVE_RE.test(hay)) return true;
    }
    return false;
  }
  const categorySlug =
    bareLocation
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "haberler";
  try {
    let items: Array<{
      id: number;
      sourceId: number;
      videoId: string;
      title: string;
      description: string | null;
      thumbnail: string | null;
      publishedAt: string | null;
      channelName: string | null;
    }> = [];
    const local = await searchYektubeVideos(bareLocation, {
      limit,
      excludeStories: false,
      importFromYoutube: false,
    });
    for (const row of local.items) {
      if (isVideoFalsePositive(row.title, String(row.description ?? ""))) continue;
      items.push({
        id: row.id,
        sourceId: Number(row.sourceId) || 0,
        videoId: row.videoId,
        title: row.title,
        description: row.description ?? null,
        thumbnail: row.thumbnail ?? null,
        publishedAt: row.publishedAt ?? null,
        channelName: row.channelName ?? null,
      });
    }
    if (items.length === 0) {
      /** YekTube boş — YouTube kazı + YekTube'a kaydet. */
      const imported = await scrapeAndImportLocationYoutubeVideos(searchQ, { limit, categorySlug });
      items = imported
        .filter((v) => !isVideoFalsePositive(v.title, String(v.description ?? "")))
        .map((v) => ({
          id: v.id,
          sourceId: Number(v.sourceId) || 0,
          videoId: v.videoId,
          title: v.title,
          description: v.description ?? null,
          thumbnail: v.thumbnail ?? null,
          publishedAt: v.publishedAt ?? null,
          channelName: v.channelName ?? null,
        }));
    }
    res.json({
      items: items.slice(0, limit),
      total: Math.min(items.length, limit),
    });
  } catch {
    try {
      const hits = await searchYoutubeVideos(searchQ, limit);
      const filtered = hits.filter(
        (hit) => !isVideoFalsePositive(hit.title, String(hit.description ?? "")),
      );
      const categorySlug =
        bareLocation
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "haberler";
      const items: Array<{
        id: number;
        sourceId: number;
        videoId: string;
        title: string;
        description: string | null;
        thumbnail: string | null;
        publishedAt: string | null;
        channelName: string | null;
      }> = [];
      for (const hit of filtered.slice(0, limit)) {
        const imported = await importYoutubeVideoById(hit.videoId, { categorySlug }).catch(() => null);
        if (imported) {
          items.push({
            id: imported.id,
            sourceId: Number(imported.sourceId) || 0,
            videoId: imported.videoId,
            title: imported.title,
            description: imported.description ?? null,
            thumbnail: imported.thumbnail ?? null,
            publishedAt: imported.publishedAt ?? null,
            channelName: imported.channelName ?? null,
          });
        } else {
          items.push({
            id: items.length + 1,
            sourceId: 0,
            videoId: hit.videoId,
            title: hit.title,
            description: hit.description ?? null,
            thumbnail: hit.thumbnail ?? null,
            publishedAt: hit.publishedAt ?? null,
            channelName: hit.channelTitle ?? null,
          });
        }
      }
      res.json({ items, total: items.length });
    } catch {
      res.json({ items: [], total: 0 });
    }
  }
});

router.post("/map/newsmap-scraper/queue", async (req, res): Promise<void> => {
  try {
    const body = (req.body ?? {}) as {
      lat?: number;
      lng?: number;
      label?: string;
      radiusMeters?: number;
      targetPerCategory?: number;
      categorySlugs?: string[];
    };
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ success: false, error: "lat/lng required" });
      return;
    }
    const settings = await getMapAutoImportSettings().catch(() => DEFAULT_MAP_AUTO_IMPORT_SETTINGS);
    const city = buildDynamicKesfetBackfillCity(String(body.label || "Map location"), lat, lng);
    const categories = resolveNewsmapScrapeCategories(body.categorySlugs);
    const radiusMeters = Math.max(
      10_000,
      Math.min(50_000, Math.round(Number(body.radiusMeters) || settings.scraperBackfillRadiusMeters)),
    );
    const target = Math.max(
      1,
      Math.min(
        KESFET_SCRAPER_BACKFILL_TARGET_MAX,
        Math.round(Number(body.targetPerCategory) || settings.scraperBackfillTargetPerCategory),
      ),
    );
    const refreshIntervalDays = Math.max(1, Math.min(365, settings.refreshIntervalDays));
    let queued = 0;
    let skippedFresh = 0;
    const jobIds: string[] = [];
    for (const category of categories) {
      const out = await enqueueKesfetScraperBackfill({
        city,
        category,
        target,
        refreshIntervalDays,
        radiusMeters,
      });
      if (out.queued && out.job) {
        queued += 1;
        jobIds.push(out.job.id);
      } else if (out.reason === "fresh_target_met") {
        skippedFresh += 1;
      }
    }
    res.status(202).json({
      success: true,
      provider: "google_maps_scraper_bot",
      usesPlacesApi: false,
      queued,
      skippedFresh,
      jobIds,
      region: city.region,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/firebase/status", (_req, res): void => {
  res.json({
    success: true,
    data: getMapFirebaseStatus(),
  });
});

const YEKPARE_GOOGLE_PLACE_CATEGORY_CATALOG = [
  { key: "restaurants", labelTr: "Restoranlar", icon: "🍽️", googlePlaceType: "restaurant", yekpareCategory: "mekan_restoran", homepageSuperCategory: "siparis" },
  { key: "clothing", labelTr: "Giyim mağazaları", icon: "👕", googlePlaceType: "clothing_store", yekpareCategory: "alisveris_giyim", homepageSuperCategory: "alisveris" },
  { key: "hotels", labelTr: "Oteller", icon: "🏨", googlePlaceType: "lodging", yekpareCategory: "turizm_otel", homepageSuperCategory: "turizm" },
  { key: "shopping", labelTr: "Alışveriş", icon: "🛍️", googlePlaceType: "shopping_mall", yekpareCategory: "alisveris", homepageSuperCategory: "alisveris" },
  { key: "tourism", labelTr: "Turizm & Konaklama", icon: "✈️", googlePlaceType: "travel_agency", yekpareCategory: "turizm", homepageSuperCategory: "turizm" },
  { key: "beauty", labelTr: "Güzellik & Bakım", icon: "✂️", googlePlaceType: "beauty_salon", yekpareCategory: "hizmet_guzellik", homepageSuperCategory: "hizmet" },
  { key: "repair", labelTr: "Tamir & Servis", icon: "🔧", googlePlaceType: "car_repair", yekpareCategory: "hizmet_tamir", homepageSuperCategory: "hizmet" },
  { key: "services", labelTr: "Hizmetler", icon: "🧰", googlePlaceType: "store", yekpareCategory: "mekan_dukkan", homepageSuperCategory: "mekan_dukkan" },
] as const;

router.get("/map/places/categories-catalog", async (_req, res): Promise<void> => {
  const apiKey = await resolveGooglePlacesApiKey().catch(() => undefined);
  res.json({
    success: true,
    provider: "google_places_official",
    configured: Boolean(apiKey),
    note: apiKey
      ? "Google Places API sunucu anahtarı yapılandırılmış; import/search server-side çalışabilir."
      : "Google Places API sunucu anahtarı yok; katalog statik Yekpare eşlemesi olarak sunulur.",
    data: YEKPARE_GOOGLE_PLACE_CATEGORY_CATALOG,
  });
});

router.get("/map/places/autocomplete", async (req, res): Promise<void> => {
  const apiKey = await resolveGooglePlacesApiKey().catch(() => undefined);
  const input = String(req.query["input"] ?? req.query["q"] ?? "").trim();
  if (!apiKey) {
    res.json({ success: true, configured: false, provider: "google_places_official", data: [] });
    return;
  }
  if (input.length < 2) {
    res.json({ success: true, configured: true, provider: "google_places_official", data: [] });
    return;
  }
  try {
    const globalScope = ["1", "true", "yes"].includes(String(req.query["global"] ?? "").toLowerCase());
    const params = new URLSearchParams({
      input,
      key: apiKey,
      language: "tr",
    });
    if (!globalScope) params.set("components", "country:tr");
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
    const g = await fetch(url);
    const payload = await g.json() as {
      status?: string;
      error_message?: string;
      predictions?: Array<{ place_id?: string; description?: string; structured_formatting?: { main_text?: string; secondary_text?: string } }>;
    };
    if (!g.ok || (payload.status && !["OK", "ZERO_RESULTS"].includes(payload.status))) {
      // Anahtar/izin hatası → yapılandırılmamış say; istemci sarı hata bandı göstermesin.
      if (payload.status === "REQUEST_DENIED" || payload.status === "INVALID_REQUEST") {
        res.json({ success: true, configured: false, provider: "google_places_official", data: [] });
        return;
      }
      res.status(g.ok ? 502 : g.status).json({
        success: false,
        configured: true,
        provider: "google_places_official",
        error: payload.error_message || payload.status || `HTTP ${g.status}`,
      });
      return;
    }
    res.json({
      success: true,
      configured: true,
      provider: "google_places_official",
      data: (payload.predictions ?? []).slice(0, 8).map((p) => ({
        placeId: p.place_id,
        label: p.description,
        mainText: p.structured_formatting?.main_text ?? null,
        secondaryText: p.structured_formatting?.secondary_text ?? null,
      })).filter((p) => p.placeId && p.label),
    });
  } catch (err) {
    res.status(502).json({ success: false, configured: true, provider: "google_places_official", error: String(err) });
  }
});

router.get("/map/places/details", async (req, res): Promise<void> => {
  const apiKey = await resolveGooglePlacesApiKey().catch(() => undefined);
  const placeId = String(req.query["placeId"] ?? req.query["place_id"] ?? "").trim();
  if (!apiKey) {
    res.json({ success: true, configured: false, provider: "google_places_official", data: null });
    return;
  }
  if (!placeId) {
    res.status(400).json({ success: false, configured: true, provider: "google_places_official", error: "placeId gerekli." });
    return;
  }
  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "place_id,name,formatted_address,geometry,photos",
      language: "tr",
      key: apiKey,
    });
    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const g = await fetch(url);
    const payload = await g.json() as {
      status?: string;
      error_message?: string;
      result?: {
        place_id?: string;
        name?: string;
        formatted_address?: string;
        geometry?: {
          location?: { lat?: number; lng?: number };
          viewport?: {
            northeast?: { lat?: number; lng?: number };
            southwest?: { lat?: number; lng?: number };
          };
        };
        photos?: Array<{ photo_reference?: string; width?: number; height?: number }>;
      };
    };
    if (!g.ok || payload.status !== "OK" || !payload.result?.geometry?.location) {
      res.status(g.ok ? 502 : g.status).json({
        success: false,
        configured: true,
        provider: "google_places_official",
        error: payload.error_message || payload.status || `HTTP ${g.status}`,
      });
      return;
    }
    const firstPhoto = Array.isArray(payload.result.photos) ? payload.result.photos.find((p) => p.photo_reference) : undefined;
    const photoUrl = firstPhoto?.photo_reference
      ? normalizeImageUrlValue(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=900&photo_reference=${encodeURIComponent(firstPhoto.photo_reference)}&key=${encodeURIComponent(apiKey)}`)
      : null;
    res.json({
      success: true,
      configured: true,
      provider: "google_places_official",
      data: {
        placeId: payload.result.place_id ?? placeId,
        name: payload.result.name ?? "",
        formattedAddress: payload.result.formatted_address ?? "",
        lat: payload.result.geometry.location.lat,
        lng: payload.result.geometry.location.lng,
        bounds: payload.result.geometry.viewport?.southwest && payload.result.geometry.viewport?.northeast
          ? {
              south: payload.result.geometry.viewport.southwest.lat,
              west: payload.result.geometry.viewport.southwest.lng,
              north: payload.result.geometry.viewport.northeast.lat,
              east: payload.result.geometry.viewport.northeast.lng,
            }
          : null,
        photoUrl,
        photoWidth: firstPhoto?.width ?? null,
        photoHeight: firstPhoto?.height ?? null,
      },
    });
  } catch (err) {
    res.status(502).json({ success: false, configured: true, provider: "google_places_official", error: String(err) });
  }
});

function inferGooglePlacesRegionCode(lat: number, lng: number): string | undefined {
  const region = inferKesfetBackfillRegion(lat, lng);
  if (region === "turkiye") return "TR";
  if (region === "azerbaycan") return "AZ";
  if (region === "kktc") return "CY";
  if (lat >= 38.5 && lat <= 41.5 && lng >= 43.5 && lng <= 46.5) return "AM";
  if (lat >= 41.0 && lng >= 41.0 && lng <= 46.5) return "GE";
  return undefined;
}

router.get("/map/places/search", async (req, res): Promise<void> => {
  const apiKey = await resolveGooglePlacesApiKey().catch(() => undefined);
  const textQuery = String(req.query["q"] ?? req.query["textQuery"] ?? "").trim();
  const lat = Number(req.query["lat"]);
  const lng = Number(req.query["lng"]);
  const radiusMeters = normalizeGooglePlacesImportRadius(req.query["radius"] ?? req.query["radiusMeters"], 5000);
  const maxResultCount = Math.min(15, Math.max(1, Math.round(Number(req.query["limit"] ?? req.query["maxResultCount"] ?? 8) || 8)));
  const regionCodeRaw = String(req.query["regionCode"] ?? "").trim().toUpperCase();
  const regionCode = /^[A-Z]{2}$/.test(regionCodeRaw) && regionCodeRaw !== "EU"
    ? regionCodeRaw
    : (Number.isFinite(lat) && Number.isFinite(lng) ? inferGooglePlacesRegionCode(lat, lng) : undefined);
  if (!apiKey) {
    res.json({
      success: true,
      configured: false,
      provider: "google_places_official",
      importMode: "preview_only",
      data: [],
      hint: "Google Places API sunucu anahtarı yapılandırılmamış.",
    });
    return;
  }
  if (textQuery.length < 2) {
    res.json({ success: true, configured: true, provider: "google_places_official", importMode: "preview_only", data: [] });
    return;
  }
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: "tr",
    maxResultCount,
  };
  if (regionCode) body.regionCode = regionCode;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    };
  }
  try {
    const g = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.photos",
      },
      body: JSON.stringify(body),
    });
    const payload = await g.json() as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        primaryType?: string;
        types?: string[];
        rating?: number;
        userRatingCount?: number;
        websiteUri?: string;
        nationalPhoneNumber?: string;
        photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
      }>;
      error?: { message?: string; status?: string };
    };
    if (!g.ok) {
      res.status(g.status).json({
        success: false,
        configured: true,
        provider: "google_places_official",
        importMode: "preview_only",
        error: payload.error?.message || `HTTP ${g.status}`,
        raw: payload.error,
      });
      return;
    }
    const rawPlaces = payload.places ?? [];
    const places = rawPlaces
      .filter((p) => googlePlaceCandidateForPrivateImport(p.displayName?.text ?? "", [p.primaryType, ...(p.types ?? [])]).allowed)
      .filter((p) => googlePlaceMeetsPublicQuality({
        photos: p.photos,
        rating: p.rating,
        userRatingsTotal: p.userRatingCount,
        reviews: undefined,
      }))
      .sort((a, b) => {
        const aa = googlePlaceImportPopularityScore({ rating: a.rating, userRatingCount: a.userRatingCount });
        const bb = googlePlaceImportPopularityScore({ rating: b.rating, userRatingCount: b.userRatingCount });
        return bb.score - aa.score;
      })
      .map((p) => ({
        googlePlaceId: p.id ?? null,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? null,
        latitude: p.location?.latitude ?? null,
        longitude: p.location?.longitude ?? null,
        googlePlaceType: p.primaryType ?? p.types?.[0] ?? null,
        rating: p.rating ?? null,
        userRatingsTotal: p.userRatingCount ?? null,
        website: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null,
        photoMediaResource: p.photos?.[0]?.name ?? null,
        source: "google_places_official",
        sourcePriority: googlePlaceImportPopularityScore({ rating: p.rating, userRatingCount: p.userRatingCount }).score,
      }));
    res.json({
      success: true,
      configured: true,
      provider: "google_places_official",
      importMode: "preview_only",
      skippedFiltered: rawPlaces.length - places.length,
      data: places,
    });
  } catch (err) {
    res.status(502).json({ success: false, configured: true, provider: "google_places_official", importMode: "preview_only", error: String(err) });
  }
});

router.post("/map/admin/google-places/search", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const apiKey = await resolveGooglePlacesApiKey();
  if (!apiKey) {
    res.status(503).json({
      success: false,
      error: "Google Places API sunucu anahtarı yapılandırılmamış.",
      hint: "GOOGLE_MAPS_SERVER_KEY / GOOGLE_MAPS_API_KEY / GOOGLE_PLACES_API_KEY ya da Haritalar ayarına IP kısıtlı sunucu anahtarı ekleyin.",
    });
    return;
  }
  const textQuery = String(req.body?.textQuery ?? req.body?.q ?? "").trim();
  const type = String(req.body?.googlePlaceType ?? req.body?.type ?? "").trim();
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const radiusMeters = normalizeGooglePlacesImportRadius(req.body?.radiusMeters ?? req.body?.radius, 5000);
  const maxResultCount = Math.min(20, Math.max(1, Math.round(Number(req.body?.maxResultCount ?? 10) || 10)));
  if (!textQuery && !type) {
    res.status(400).json({ success: false, error: "textQuery veya googlePlaceType gerekli." });
    return;
  }
  const body: Record<string, unknown> = {
    textQuery: [textQuery, type && !textQuery.includes(type) ? type : ""].filter(Boolean).join(" ").trim(),
    languageCode: "tr",
    regionCode: "TR",
    maxResultCount,
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    };
  }
  try {
    const g = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.photos",
      },
      body: JSON.stringify(body),
    });
    const payload = await g.json() as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        primaryType?: string;
        types?: string[];
        rating?: number;
        userRatingCount?: number;
        websiteUri?: string;
        nationalPhoneNumber?: string;
        photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
      }>;
      error?: { message?: string; status?: string };
    };
    if (!g.ok) {
      res.status(g.status).json({ success: false, provider: "google_places_official", error: payload.error?.message || `HTTP ${g.status}`, raw: payload.error });
      return;
    }
    const rawPlaces = payload.places ?? [];
    const places = rawPlaces
      .filter((p) => googlePlaceCandidateForPrivateImport(p.displayName?.text ?? "", [p.primaryType, ...(p.types ?? [])]).allowed)
      .filter((p) => googlePlaceMeetsPublicQuality({
        photos: p.photos,
        rating: p.rating,
        userRatingsTotal: p.userRatingCount,
        reviews: undefined,
      }))
      .sort((a, b) => {
        const aa = googlePlaceImportPopularityScore({ rating: a.rating, userRatingCount: a.userRatingCount });
        const bb = googlePlaceImportPopularityScore({ rating: b.rating, userRatingCount: b.userRatingCount });
        return bb.score - aa.score;
      })
      .map((p) => ({
        googlePlaceId: p.id ?? null,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? null,
        latitude: p.location?.latitude ?? null,
        longitude: p.location?.longitude ?? null,
        googlePlaceType: p.primaryType ?? p.types?.[0] ?? null,
        rating: p.rating ?? null,
        userRatingsTotal: p.userRatingCount ?? null,
        website: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null,
        photoMediaResource: p.photos?.[0]?.name ?? null,
        source: "google_places_official",
        sourcePriority: googlePlaceImportPopularityScore({ rating: p.rating, userRatingCount: p.userRatingCount }).score,
      }));
    res.json({
      success: true,
      provider: "google_places_official",
      importMode: "preview_only",
      note: "Bu endpoint resmi Google Places API kullanır; yalnızca Yekpare'ye kayıt olabilecek özel işletme adaylarını gösterir.",
      skippedFiltered: rawPlaces.length - places.length,
      data: places,
    });
  } catch (err) {
    res.status(502).json({ success: false, provider: "google_places_official", error: String(err) });
  }
});

function normalizeImportDedupeText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const GOOGLE_PLACES_PRIVATE_ALLOWLIST = [
  "restaurant",
  "cafe",
  "bakery",
  "meal_takeaway",
  "meal_delivery",
  "food",
  "supermarket",
  "grocery_or_supermarket",
  "convenience_store",
  "store",
  "shopping_mall",
  "clothing_store",
  "shoe_store",
  "electronics_store",
  "furniture_store",
  "home_goods_store",
  "jewelry_store",
  "book_store",
  "florist",
  "beauty_salon",
  "hair_care",
  "spa",
  "bar",
  "car_repair",
  "car_rental",
  "electrician",
  "plumber",
  "hardware_store",
  "laundry",
  "lawyer",
  "insurance_agency",
  "real_estate_agency",
  "moving_company",
  "gym",
  "pet_store",
  "lodging",
  "hotel",
  "motel",
  "resort_hotel",
  "guest_house",
  "travel_agency",
  "tourist_information_center",
] as const;

const GOOGLE_PLACES_PUBLIC_DENYLIST = new Set([
  "accounting",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "airport",
  "amusement_park",
  "aquarium",
  "art_gallery",
  "atm",
  "bank",
  "bus_station",
  "campground",
  "cemetery",
  "church",
  "city_hall",
  "community_center",
  "courthouse",
  "department_of_motor_vehicles",
  "embassy",
  "fire_station",
  "finance",
  "fuel",
  "funeral_home",
  "gas_station",
  "hindu_temple",
  "hospital",
  "doctor",
  "local_government_office",
  "mosque",
  "museum",
  "notary",
  "park",
  "parking",
  "place_of_worship",
  "police",
  "post_office",
  "primary_school",
  "public_bathroom",
  "school",
  "secondary_school",
  "stadium",
  "subway_station",
  "synagogue",
  "tourist_attraction",
  "train_station",
  "transit_station",
  "university",
  "zoo",
  "pharmacy",
  "liquor_store",
]);

const GOOGLE_PLACES_PUBLIC_SYNC_TYPES = [
  "restaurant",
  "cafe",
  "meal_takeaway",
  "bakery",
  "supermarket",
  "store",
  "clothing_store",
  "beauty_salon",
  "hair_care",
  "spa",
  "bar",
  "car_repair",
  "car_rental",
  "hardware_store",
  "lawyer",
  "insurance_agency",
  "real_estate_agency",
  "moving_company",
  "gym",
  "pet_store",
  "shopping_mall",
  "lodging",
  "travel_agency",
] as const;

const DEFAULT_GOOGLE_PLACES_DENIED_NAME_PATTERNS = [
  "\\batm\\b",
  "\\bbank\\b",
  "\\bbanka\\b",
  "\\bbankamatik\\b",
  "\\bbankasi\\b",
  "\\bkredi\\b",
  "\\bfinans\\b",
  "\\bfinancial branch\\b",
  "\\bnotary\\b",
  "\\bnoter\\b",
  "\\bnoterligi\\b",
  "\\barabulucu\\b",
  "\\barabuluculuk\\b",
  "\\bmediator\\b",
  "\\bmediation\\b",
  "\\bbim\\b",
  "\\bbim market\\b",
  "\\ba101\\b",
  "\\ba 101\\b",
  "\\bsok\\b",
  "\\bsok market\\b",
  "\\bmigros\\b",
  "\\bcarrefour\\b",
  "\\bcarrefoursa\\b",
  "\\bhakmar\\b",
  "\\bfile market\\b",
  "\\btarim kredi\\b",
  "\\bsecmar\\b",
  "\\bonur market\\b",
  "\\bmetro market\\b",
  "\\bpharmacy\\b",
  "\\beczane\\b",
  "\\beczanesi\\b",
  "\\bgas station\\b",
  "\\bfuel\\b",
  "\\bbenzinlik\\b",
  "\\bakaryakit\\b",
  "\\bpetrol\\b",
  "\\bpetrol ofisi\\b",
  "\\bshell\\b",
  "\\bbp\\b",
  "\\bopet\\b",
  "\\btotal\\b",
  "\\bpo\\b",
  "\\bhastane\\b",
  "\\bhastanesi\\b",
  "\\bdevlet hastanesi\\b",
  "\\bkamu hastanesi\\b",
  "\\bpublic hospital\\b",
  "\\bgovernment hospital\\b",
  "\\bsaglik merkezi\\b",
  "\\bsaglik ocagi\\b",
  "\\baile sagligi\\b",
  "\\baile sagligi merkezi\\b",
  "\\baile hekimi\\b",
  "\\baile hekimligi\\b",
  "\\bfamily physician\\b",
  "\\bfamily health center\\b",
  "\\bpublic health clinic\\b",
  "\\btoplum sagligi\\b",
  "\\bilce saglik\\b",
  "\\bcami\\b",
  "\\bmosque\\b",
  "\\bpark\\b",
  "\\bbelediye\\b",
  "\\bkaymakamlik\\b",
  "\\bvalilik\\b",
  "\\bhukumet konagi\\b",
  "\\badliye\\b",
  "\\btapu\\b",
  "\\bnufus mudurlugu\\b",
  "\\bmuhtarlik\\b",
  "\\bmuhtar\\b",
  "\\bvergi dairesi\\b",
  "\\bsgk\\b",
  "\\bptt\\b",
  "\\bemniyet\\b",
  "\\bpolis\\b",
  "\\bjandarma\\b",
  "\\bzabita\\b",
  "\\bitfaiye\\b",
  "\\bkamu kurumu\\b",
  "\\bresmi kurum\\b",
  "\\bdevlet dairesi\\b",
  "\\bokul\\b",
  "\\bilkokul\\b",
  "\\blise\\b",
  "\\buniversite\\b",
  "\\bdevlet okulu\\b",
  "\\bresmi okul\\b",
  "\\bpublic school\\b",
  "\\bgovernment school\\b",
  "\\bhalk egitim\\b",
  "\\bresmi\\b",
  "\\bkamu\\b",
  "\\bdevlet\\b",
  "\\bkiraathane\\b",
  "\\bkiraat hane\\b",
  "\\bkahvehane\\b",
  "\\bcoffeehouse\\b",
  "\\btea house\\b",
  "\\bcay ocagi\\b",
  "\\bcay evi\\b",
  "\\boyun salonu\\b",
  "\\boyun evi\\b",
  "\\binternet kafe\\b",
  "\\binternet cafe\\b",
  "\\bgame center\\b",
  "\\barcade\\b",
  "\\bbufe\\b",
  "\\btekel\\b",
  "\\btekel bayi\\b",
  "\\btekel bayii\\b",
  "\\btobacco shop\\b",
] as const;

const PUBLIC_MAP_EXCLUDED_TEXT_REGEX =
  "(^|[^a-z0-9])(eczane|pharmacy|benzinlik|akaryakit|petrol|opet|shell|bp|total|petrol ofisi|bim|a101|a 101|sok market|sok|migros|carrefour|carrefoursa|hakmar|file market|tarim kredi|secmar|onur market|metro market|bank|banka|atm|bankamatik|finans|kredi|noter|noterligi|notary|arabulucu|arabuluculuk|mediator|mediation|belediye|kaymakamlik|valilik|hukumet konagi|adliye|tapu|nufus mudurlugu|muhtarlik|muhtar|vergi dairesi|sgk|ptt|emniyet|polis|jandarma|zabita|itfaiye|kamu kurumu|resmi kurum|devlet dairesi|resmi|kamu|devlet|cami|mosque|park|hastane|devlet hastanesi|kamu hastanesi|public hospital|government hospital|saglik merkezi|saglik ocagi|aile sagligi|aile sagligi merkezi|aile hekimi|aile hekimligi|family physician|family health center|public health clinic|toplum sagligi|ilce saglik|okul|ilkokul|lise|universite|devlet okulu|resmi okul|public school|government school|halk egitim|kiraathane|kiraat hane|kahvehane|coffeehouse|tea house|cay ocagi|cay evi|oyun salonu|oyun evi|internet kafe|internet cafe|game center|arcade|bufe|tekel|tekel bayi|tekel bayii|tobacco shop)([^a-z0-9]|$)";
const PUBLIC_MAP_EXCLUDED_TYPE_REGEX =
  "(pharmacy|drugstore|gas_station|fuel|bank|atm|finance|notary|local_government_office|city_hall|community_center|courthouse|department_of_motor_vehicles|embassy|police|fire_station|post_office|park|place_of_worship|mosque|church|hospital|doctor|health_post|school|primary_school|secondary_school|university|public_bathroom|liquor_store|internet_cafe|amusement_center|video_arcade|casino|night_club)";

function googlePlacesDeniedNameRegexes(): RegExp[] {
  const extra = String(process.env.GOOGLE_PLACES_PRIVATE_IMPORT_DENY_NAMES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return [...DEFAULT_GOOGLE_PLACES_DENIED_NAME_PATTERNS, ...extra].map((pattern) => new RegExp(pattern, "i"));
}

type GooglePlacesLocationImportResult = {
  success: true;
  configured: true;
  provider: "google_places_official";
  importSource: "google_places";
  dedupeRules: string[];
  privateFilters: { allowlist: string[]; denylist: string[] };
  query: Record<string, unknown>;
  found: number;
  privateCandidates: number;
  inserted: number;
  skippedExisting: number;
  skippedFiltered: number;
  errors: string[];
  insertedBusinesses: Array<{ id: string; name: string; googlePlaceId: string }>;
  skipped: Array<{ googlePlaceId: string; reason: string; existingId?: string }>;
  message: string;
  cached?: boolean;
};

type GooglePlacesLocationImportArgs = {
  apiKey: string;
  locationQuery: string;
  rawTextQuery: string;
  lat: number;
  lng: number;
  radius: number;
  googlePlaceType: string;
  keyword: string;
  maxResults: number;
  targetValidResults?: number;
  homepageSuperCategory: string;
  storeType: string;
  publicPrivateOnly: boolean;
  sourceLabel: "admin" | "public_location_view";
};

function googlePlaceTypesForPrivateImport(types: string[]): { allowed: boolean; denied: boolean; reason: string } {
  const normalized = types.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  const denied = normalized.some((t) => GOOGLE_PLACES_PUBLIC_DENYLIST.has(t));
  if (denied) return { allowed: false, denied: true, reason: "public_or_government_type" };
  const allowed = normalized.some((t) => (GOOGLE_PLACES_PRIVATE_ALLOWLIST as readonly string[]).includes(t));
  return { allowed, denied: false, reason: allowed ? "private_allowlist" : "not_private_allowlisted" };
}

function googlePlaceCandidateForPrivateImport(name: string, types: unknown[]): { allowed: boolean; denied: boolean; reason: string } {
  const normalizedName = normalizeImportDedupeText(name);
  if (normalizedName && googlePlacesDeniedNameRegexes().some((re) => re.test(normalizedName))) {
    return { allowed: false, denied: true, reason: "denied_name_or_chain" };
  }
  return googlePlaceTypesForPrivateImport(types.map((t) => String(t ?? "")).filter(Boolean));
}

function publicSyncCacheKey(input: { lat: number; lng: number; radius: number; keyword: string; googlePlaceType: string; superCategory: string; locationQuery: string; textQuery: string; targetValidResults?: number }): string {
  const hasCoords = Number.isFinite(input.lat) && Number.isFinite(input.lng);
  const latGrid = hasCoords ? Math.round(input.lat * 100) / 100 : "text";
  const lngGrid = hasCoords ? Math.round(input.lng * 100) / 100 : normalizeImportDedupeText(input.locationQuery || input.textQuery);
  const radiusBucket = Math.min(20_000, Math.max(1500, Math.round(input.radius / 1000) * 1000));
  return [latGrid, lngGrid, radiusBucket, normalizeImportDedupeText(input.keyword), normalizeImportDedupeText(input.textQuery), input.googlePlaceType, input.superCategory, input.targetValidResults || ""].join(":");
}

const GOOGLE_PLACES_PUBLIC_SYNC_CACHE_FALLBACK_TTL_MS = DEFAULT_MAP_AUTO_IMPORT_SETTINGS.refreshIntervalDays * 24 * 60 * 60 * 1000;
const googlePlacesPublicSyncCache = new Map<string, { at: number; result: GooglePlacesLocationImportResult }>();
const googlePlacesPublicSyncRate = new Map<string, { windowStart: number; count: number }>();

async function countFreshPublicGoogleImports(input: {
  locationQuery: string;
  keyword: string;
  googlePlaceType: string;
  homepageSuperCategory: string;
  refreshIntervalDays: number;
}): Promise<number> {
  const since = new Date(Date.now() - input.refreshIntervalDays * 24 * 60 * 60 * 1000);
  const conditions = [
    eq(mapBusinessesTable.isActive, true),
    MAP_BUSINESS_PUBLIC_VISIBLE,
    MAP_BUSINESS_PUBLIC_PRIVATE_CANDIDATE_ALLOWED,
    MAP_BUSINESS_PUBLIC_CONTENT_QUALITY,
    eq(mapBusinessesTable.importSource, "google_places"),
    gt(mapBusinessesTable.updatedAt, since),
  ];
  if (input.homepageSuperCategory && input.homepageSuperCategory !== "all") {
    conditions.push(eq(mapBusinessesTable.homepageSuperCategory, input.homepageSuperCategory));
  }
  const location = input.locationQuery.trim();
  if (location) {
    conditions.push(or(
      ilike(mapBusinessesTable.address, `%${location}%`),
      sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::text, '')) LIKE ${`%${location.toLocaleLowerCase("tr-TR")}%`}`,
    )!);
  }
  const keyword = normalizeImportDedupeText(input.keyword);
  if (keyword) {
    const keywordTokens = keyword.split(" ").filter((token) => token.length >= 4).slice(0, 3);
    if (keywordTokens.length) {
      conditions.push(or(
        ...keywordTokens.map((token) => ilike(mapBusinessesTable.name, `%${token}%`)),
        sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::text, '')) LIKE ${`%${keyword}%`}`,
      )!);
    }
  }
  if (input.googlePlaceType) {
    conditions.push(sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::text, '')) LIKE ${`%${input.googlePlaceType.toLowerCase()}%`}`);
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(...conditions));
  return Number(row?.count ?? 0);
}

function checkPublicPlacesSyncRateLimit(req: Request): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const rawIp = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0]!.trim();
  const key = rawIp || "unknown";
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const row = googlePlacesPublicSyncRate.get(key);
  if (!row || now - row.windowStart > windowMs) {
    googlePlacesPublicSyncRate.set(key, { windowStart: now, count: 1 });
    return { ok: true };
  }
  if (row.count >= 12) {
    return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (now - row.windowStart)) / 1000) };
  }
  row.count++;
  return { ok: true };
}

function mapBusinessPublicRankingOrder(includeRecentTieBreaker = true) {
  // No persisted per-business visit/traffic counter exists in Haritalar yet, so ranking falls through to reviews/rating.
  const order = [
    desc(mapBusinessesTable.isPremium),
    sql`COALESCE(${mapBusinessesTable.userRatingsTotal}, 0) DESC`,
    sql`COALESCE(${mapBusinessesTable.rating}, 0) DESC`,
  ];
  if (includeRecentTieBreaker) order.push(desc(mapBusinessesTable.createdAt));
  return order;
}

type GooglePlacesImportCandidate = {
  placeId: string;
  durableId: string;
  name: string;
  types: string[];
  d: Record<string, unknown>;
  score: number;
  rating: number | null;
  userRatingsTotal: number | null;
};

function googlePlaceMeetsPublicQuality(input: { photos: unknown; rating: unknown; userRatingsTotal: unknown; reviews: unknown }): boolean {
  const hasPhoto = Array.isArray(input.photos) && input.photos.some((p) => {
    if (typeof p === "string") return Boolean(p.trim());
    if (!p || typeof p !== "object") return false;
    return Boolean(String((p as { photo_reference?: unknown; name?: unknown }).photo_reference ?? (p as { name?: unknown }).name ?? "").trim());
  });
  const rating = Number(input.rating);
  const userRatingsTotal = Number(input.userRatingsTotal);
  const hasRating = Number.isFinite(rating) && rating > 0 && Number.isFinite(userRatingsTotal) && userRatingsTotal > 0;
  const hasReview = Array.isArray(input.reviews) && input.reviews.some((r) => {
    if (!r || typeof r !== "object") return false;
    return Boolean(String((r as { text?: unknown }).text ?? "").trim());
  });
  return hasPhoto || hasRating || hasReview;
}

function googlePlaceImportPopularityScore(input: {
  rating?: unknown;
  userRatingsTotal?: unknown;
  userRatingCount?: unknown;
}): { score: number; rating: number | null; userRatingsTotal: number | null } {
  const ratingRaw = Number(input.rating);
  const rating = Number.isFinite(ratingRaw) ? Math.max(0, Math.min(5, ratingRaw)) : null;
  const countRaw = Number(input.userRatingsTotal ?? input.userRatingCount);
  const userRatingsTotal = Number.isFinite(countRaw) ? Math.max(0, Math.round(countRaw)) : null;
  const countScore = userRatingsTotal == null ? 0 : Math.min(userRatingsTotal, 100_000) * 100;
  const ratingScore = rating == null ? 0 : rating * 1_000;
  return {
    score: ratingScore + countScore,
    rating,
    userRatingsTotal,
  };
}

function compareGooglePlaceImportCandidates(a: GooglePlacesImportCandidate, b: GooglePlacesImportCandidate): number {
  if ((b.userRatingsTotal ?? 0) !== (a.userRatingsTotal ?? 0)) return (b.userRatingsTotal ?? 0) - (a.userRatingsTotal ?? 0);
  if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
  return b.score - a.score;
}

function pushUniquePlaceIds(target: string[], ids: string[], maxTotal: number): void {
  for (const id of ids) {
    if (id && !target.includes(id)) target.push(id);
    if (target.length >= maxTotal) break;
  }
}

function buildGooglePlacesImportSearchTerms(args: GooglePlacesLocationImportArgs): string[] {
  const location = args.locationQuery.trim();
  const baseKeyword = (args.keyword || args.googlePlaceType || "işletmeler").trim();
  const rawText = args.rawTextQuery.trim();
  const terms = [
    rawText,
    [baseKeyword, location].filter(Boolean).join(" "),
    [args.googlePlaceType, location].filter(Boolean).join(" "),
    [args.storeType, location].filter(Boolean).join(" "),
    [args.homepageSuperCategory, location].filter(Boolean).join(" "),
  ];
  const unique: string[] = [];
  for (const term of terms) {
    const normalized = normalizeImportDedupeText(term);
    if (term.trim() && normalized && !unique.some((item) => normalizeImportDedupeText(item) === normalized)) {
      unique.push(term.trim());
    }
  }
  return unique;
}

async function collectPlaceIdsForLocationImport(args: GooglePlacesLocationImportArgs): Promise<string[]> {
  const target = Math.max(1, Math.min(GOOGLE_PLACES_IMPORT_VALID_TARGET, args.targetValidResults ?? args.maxResults));
  const candidateLimit = Math.max(
    args.maxResults,
    Math.min(GOOGLE_PLACES_IMPORT_CANDIDATE_LIMIT, target * GOOGLE_PLACES_IMPORT_CANDIDATE_MULTIPLIER),
  );
  const placeIds: string[] = [];
  const textTerms = buildGooglePlacesImportSearchTerms(args);

  if (Number.isFinite(args.lat) && Number.isFinite(args.lng)) {
    const requestedTypeAllowed = args.googlePlaceType && (GOOGLE_PLACES_PRIVATE_ALLOWLIST as readonly string[]).includes(args.googlePlaceType);
    const typesToSearch = requestedTypeAllowed
      ? [args.googlePlaceType]
      : args.publicPrivateOnly
        ? GOOGLE_PLACES_PUBLIC_SYNC_TYPES
        : [args.googlePlaceType].filter(Boolean);
    if (typesToSearch.length > 0) {
      const perTypeLimit = Math.max(20, Math.ceil(candidateLimit / Math.max(1, typesToSearch.length)));
      for (const type of typesToSearch) {
        const ids = await collectPlaceIdsFromNearby(args.apiKey, args.lat, args.lng, args.radius, perTypeLimit, type, args.keyword || undefined);
        pushUniquePlaceIds(placeIds, ids, candidateLimit);
        if (placeIds.length >= candidateLimit) break;
      }
    } else {
      const ids = await collectPlaceIdsFromNearby(args.apiKey, args.lat, args.lng, args.radius, candidateLimit, undefined, args.keyword || undefined);
      pushUniquePlaceIds(placeIds, ids, candidateLimit);
    }
  }

  for (const term of textTerms) {
    if (placeIds.length >= candidateLimit) break;
    const ids = await collectPlaceIdsFromTextQuery(args.apiKey, term, candidateLimit - placeIds.length);
    pushUniquePlaceIds(placeIds, ids, candidateLimit);
  }

  return placeIds;
}

async function fetchGooglePlacesImportCandidates(
  apiKey: string,
  placeIds: string[],
  requirePrivateAllowed: boolean,
): Promise<{
  candidates: GooglePlacesImportCandidate[];
  skippedFiltered: number;
  skipped: Array<{ googlePlaceId: string; reason: string }>;
  errors: string[];
}> {
  const candidates: GooglePlacesImportCandidate[] = [];
  const skipped: Array<{ googlePlaceId: string; reason: string }> = [];
  const errors: string[] = [];
  let skippedFiltered = 0;

  for (const placeId of placeIds) {
    try {
      const d = await fetchPlaceDetails(apiKey, placeId);
      const durableId = String(d.place_id || placeId);
      const name = String(d.name || "").trim();
      if (!name) {
        errors.push(`${durableId}: isim yok`);
        continue;
      }
      const types = Array.isArray(d.types) ? (d.types as string[]) : [];
      const privateCheck = googlePlaceCandidateForPrivateImport(name, types);
      if (requirePrivateAllowed && !privateCheck.allowed) {
        skippedFiltered++;
        skipped.push({ googlePlaceId: durableId, reason: privateCheck.reason });
        continue;
      }
      if (requirePrivateAllowed && !googlePlaceMeetsPublicQuality({ photos: d.photos, rating: d.rating, userRatingsTotal: d.user_ratings_total, reviews: d.reviews })) {
        skippedFiltered++;
        skipped.push({ googlePlaceId: durableId, reason: "missing_public_photo_rating_or_reviews" });
        continue;
      }
      const popularity = googlePlaceImportPopularityScore({
        rating: d.rating,
        userRatingsTotal: d.user_ratings_total,
      });
      candidates.push({
        placeId,
        durableId,
        name,
        types,
        d,
        score: popularity.score,
        rating: popularity.rating,
        userRatingsTotal: popularity.userRatingsTotal,
      });
    } catch (err) {
      errors.push(`${placeId}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 220));
    }
  }

  candidates.sort(compareGooglePlaceImportCandidates);
  return { candidates, skippedFiltered, skipped, errors };
}

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findExistingMapBusinessForImport(input: {
  googlePlaceId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}): Promise<{ id: string; reason: "google_place_id" | "name_address" | "name_coordinates" } | null> {
  if (input.googlePlaceId) {
    const byProvider = await db
      .select({ id: mapBusinessesTable.id })
      .from(mapBusinessesTable)
      .where(eq(mapBusinessesTable.googlePlaceId, input.googlePlaceId))
      .limit(1);
    if (byProvider[0]) return { id: byProvider[0].id, reason: "google_place_id" };
  }

  const nameNorm = normalizeImportDedupeText(input.name);
  if (!nameNorm) return null;
  const nameToken = nameNorm.split(" ").find((x) => x.length >= 3) || nameNorm.slice(0, 12);
  const addressToken = normalizeImportDedupeText(input.address).split(" ").find((x) => x.length >= 4) || "";
  const candidates = await db
    .select({
      id: mapBusinessesTable.id,
      name: mapBusinessesTable.name,
      address: mapBusinessesTable.address,
      latitude: mapBusinessesTable.latitude,
      longitude: mapBusinessesTable.longitude,
    })
    .from(mapBusinessesTable)
    .where(or(
      ilike(mapBusinessesTable.name, `%${input.name.slice(0, 80)}%`),
      nameToken ? ilike(mapBusinessesTable.name, `%${nameToken}%`) : undefined,
      addressToken ? ilike(mapBusinessesTable.address, `%${addressToken}%`) : undefined,
    ))
    .limit(50);
  const addressNorm = normalizeImportDedupeText(input.address);
  for (const row of candidates) {
    if (normalizeImportDedupeText(row.name) !== nameNorm) continue;
    const rowAddressNorm = normalizeImportDedupeText(row.address);
    if (addressNorm && rowAddressNorm && (addressNorm.includes(rowAddressNorm) || rowAddressNorm.includes(addressNorm))) {
      return { id: row.id, reason: "name_address" };
    }
    const lat2 = Number(row.latitude);
    const lng2 = Number(row.longitude);
    if (
      input.lat != null &&
      input.lng != null &&
      Number.isFinite(lat2) &&
      Number.isFinite(lng2) &&
      metersBetween(input.lat, input.lng, lat2, lng2) <= 90
    ) {
      return { id: row.id, reason: "name_coordinates" };
    }
  }
  return null;
}

async function runGooglePlacesLocationImport(args: GooglePlacesLocationImportArgs): Promise<GooglePlacesLocationImportResult> {
  const autoImportSettings = await getMapAutoImportSettings();
  const textQuery = args.rawTextQuery || [args.keyword || args.googlePlaceType || "işletmeler", args.locationQuery].filter(Boolean).join(" ");
  const targetValidResults = Math.max(1, Math.min(GOOGLE_PLACES_IMPORT_VALID_TARGET, args.targetValidResults ?? args.maxResults));
  const placeIds = await collectPlaceIdsForLocationImport({ ...args, targetValidResults });

  let inserted = 0;
  let skippedExisting = 0;
  let skippedFiltered = 0;
  let privateCandidates = 0;
  const errors: string[] = [];
  const insertedBusinesses: Array<{ id: string; name: string; googlePlaceId: string }> = [];
  const skipped: Array<{ googlePlaceId: string; reason: string; existingId?: string }> = [];

  const fetchedCandidates = await fetchGooglePlacesImportCandidates(args.apiKey, placeIds, args.publicPrivateOnly);
  skippedFiltered += fetchedCandidates.skippedFiltered;
  errors.push(...fetchedCandidates.errors);
  skipped.push(...fetchedCandidates.skipped);
  privateCandidates = fetchedCandidates.candidates.length;

  for (const candidate of fetchedCandidates.candidates) {
    if (inserted + skippedExisting >= targetValidResults) break;
    try {
      const { d, durableId, name, types } = candidate;
      const formattedAddress = (d.formatted_address as string | undefined) || (d.vicinity as string | undefined) || null;
      const resolvedLocation = await resolveGooglePlaceMapLocation(d, args.locationQuery || textQuery);
      const geom = d.geometry as { location?: { lat?: number; lng?: number } } | undefined;
      const plat = autoImportSettings.fetchCoordinates && typeof geom?.location?.lat === "number" ? geom.location.lat : null;
      const plng = autoImportSettings.fetchCoordinates && typeof geom?.location?.lng === "number" ? geom.location.lng : null;
      const existing = await findExistingMapBusinessForImport({
        googlePlaceId: durableId,
        name,
        address: formattedAddress,
        lat: plat,
        lng: plng,
      });
      if (existing) {
        skippedExisting++;
        skipped.push({ googlePlaceId: durableId, reason: existing.reason, existingId: existing.id });
        continue;
      }

      const base = toSlug(name) || "isletme";
      let slug = base;
      let attempt = 1;
      while (attempt <= 200) {
        const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
        if (clash.length === 0) break;
        slug = `${base}-${++attempt}`;
      }

      const { hasDelivery, hasReservation, hasOnlineOrder } = inferServiceFlags(types);
      const photos = autoImportSettings.fetchPhoto
        ? buildPhotoUrls(args.apiKey, d.photos as Array<{ photo_reference?: string }> | undefined, autoImportSettings.photoCount)
        : [];
      const reviews = autoImportSettings.fetchReview
        ? sanitizePlaceReviews(d.reviews as Parameters<typeof sanitizePlaceReviews>[0], autoImportSettings.reviewCount)
        : [];
      const resolvedGallery = await resolveImportGalleryPhotos(photos, {
        homepageSuperCategory: args.homepageSuperCategory,
        storeType: args.storeType,
      });
      const photoUrl = resolvedGallery.coverUrl;
      const galleryPhotos = resolvedGallery.galleryPhotos;
      const extras = {
        ...googlePlacesExtras(d),
        privateBusinessImport: true,
        importWorkflow: {
          source: "google_places_official",
          sourceLabel: args.sourceLabel,
          locationQuery: args.locationQuery || null,
          textQuery,
          radius: args.radius,
          actualLocation: resolvedLocation,
          allowlist: GOOGLE_PLACES_PRIVATE_ALLOWLIST,
          denylistMatched: false,
          sourcePriority: candidate.score,
          rating: candidate.rating,
          userRatingsTotal: candidate.userRatingsTotal,
          autoImportSettings,
          importedAt: new Date().toISOString(),
        },
      };
      const [row] = await db
        .insert(mapBusinessesTable)
        .values({
          googlePlaceId: durableId,
          slug,
          name,
          cityId: resolvedLocation.cityId,
          districtId: resolvedLocation.districtId,
          address: autoImportSettings.fetchAddress ? formattedAddress : null,
          phone:
            autoImportSettings.fetchPhone
              ? (d.formatted_phone_number as string | undefined) ||
                (d.international_phone_number as string | undefined) ||
                null
              : null,
          website: autoImportSettings.fetchWebsite ? (d.website as string | undefined) || null : null,
          rating: autoImportSettings.fetchRating && typeof d.rating === "number" ? d.rating : null,
          userRatingsTotal: autoImportSettings.fetchRating && typeof d.user_ratings_total === "number" ? d.user_ratings_total : null,
          latitude: plat,
          longitude: plng,
          photoUrl,
          coverPhotoUrl: photoUrl,
          description: null,
          priceLevel: typeof d.price_level === "number" ? d.price_level : null,
          workingHours: openingHoursJson(d) as Record<string, unknown> | null,
          scrapedPhotos: photos.length ? (photos as unknown as Record<string, unknown>) : null,
          scrapedReviews: reviews.length ? (reviews as unknown as Record<string, unknown>) : null,
          importSource: "google_places",
          homepageSuperCategory: args.homepageSuperCategory,
          storeType: args.storeType,
          isActive: true,
          isPremium: false,
          hasDelivery,
          hasReservation,
          hasOnlineOrder,
          tags: Array.from(new Set([...tagsForImport(d.business_status as string | undefined, false), "private_business", "google_places"])),
          googlePlacesExtras: extras as unknown as Record<string, unknown>,
        })
        .returning({ id: mapBusinessesTable.id, name: mapBusinessesTable.name });

      if (row?.id) {
        await insertMapBusinessImportImages(row.id, galleryPhotos, autoImportSettings.photoCount);
        inserted++;
        insertedBusinesses.push({ id: row.id, name: row.name, googlePlaceId: durableId });
      }
    } catch (err) {
      errors.push(`${candidate.durableId}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 220));
    }
  }

  return {
    success: true,
    configured: true,
    provider: "google_places_official",
    importSource: "google_places",
    dedupeRules: ["google_place_id", "normalized_name + address", "normalized_name + coordinates within 90m"],
    privateFilters: {
      allowlist: [...GOOGLE_PLACES_PRIVATE_ALLOWLIST],
      denylist: [...GOOGLE_PLACES_PUBLIC_DENYLIST, ...DEFAULT_GOOGLE_PLACES_DENIED_NAME_PATTERNS],
    },
    query: {
      mode: Number.isFinite(args.lat) && Number.isFinite(args.lng) ? "nearby_private_categories" : "text",
      locationQuery: args.locationQuery || null,
      textQuery,
      lat: Number.isFinite(args.lat) ? args.lat : null,
      lng: Number.isFinite(args.lng) ? args.lng : null,
      radius: args.radius,
      googlePlaceType: args.googlePlaceType || null,
      keyword: args.keyword || null,
      maxResults: args.maxResults,
      targetValidResults,
    },
    found: placeIds.length,
    privateCandidates,
    inserted,
    skippedExisting,
    skippedFiltered,
    errors,
    insertedBusinesses,
    skipped,
    message: `${placeIds.length} bulundu, ${privateCandidates} özel işletme adayı, ${inserted} eklendi, ${skippedExisting} mevcut olduğu için atlandı, ${skippedFiltered} kamu/kurum filtresiyle elendi${errors.length ? `, ${errors.length} hata` : ""}.`,
  };
}

router.post("/map/admin/google-places/import-location", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const apiKey = await resolveGooglePlacesApiKey();
  if (!apiKey) {
    res.status(503).json({
      success: false,
      configured: false,
      provider: "google_places_official",
      error: "Google Places API import kaynağı yapılandırılmamış.",
      hint: "GOOGLE_MAPS_SERVER_KEY / GOOGLE_MAPS_API_KEY / GOOGLE_PLACES_API_KEY veya Haritalar ayarlarına IP kısıtlı sunucu anahtarı eklenince bu akış çalışır.",
      found: 0,
      inserted: 0,
      skippedExisting: 0,
      errors: [],
    });
    return;
  }

  const locationQuery = String(req.body?.locationQuery ?? req.body?.location ?? req.body?.q ?? "").trim();
  const rawTextQuery = String(req.body?.textQuery ?? "").trim();
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const radius = normalizeGooglePlacesImportRadius(req.body?.radius ?? req.body?.radiusMeters, 5000);
  const googlePlaceType = String(req.body?.googlePlaceType ?? req.body?.category ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const keyword = String(req.body?.keyword ?? "").trim();
  const maxResults = Math.min(60, Math.max(1, Math.round(Number(req.body?.maxResults ?? 20) || 20)));
  const homepageSuperCategory = String(req.body?.homepageSuperCategory ?? "mekan_dukkan").trim() || "mekan_dukkan";
  const storeType = String(req.body?.storeType ?? googlePlaceType ?? homepageSuperCategory).trim() || homepageSuperCategory;

  if (!rawTextQuery && !locationQuery && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    res.status(400).json({ success: false, error: "locationQuery/textQuery veya lat/lng gerekli." });
    return;
  }

  try {
    const autoImportSettings = await getMapAutoImportSettings();
    const textQuery = rawTextQuery || [keyword || googlePlaceType || "işletmeler", locationQuery].filter(Boolean).join(" ");
    const placeIds =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? await collectPlaceIdsFromNearby(apiKey, lat, lng, radius, maxResults, googlePlaceType || undefined, keyword || undefined)
        : await collectPlaceIdsFromTextQuery(apiKey, textQuery, maxResults);

    let inserted = 0;
    let skippedExisting = 0;
    const fetchedCandidates = await fetchGooglePlacesImportCandidates(apiKey, placeIds, true);
    let skippedFiltered = fetchedCandidates.skippedFiltered;
    const errors: string[] = [...fetchedCandidates.errors];
    const insertedBusinesses: Array<{ id: string; name: string; googlePlaceId: string }> = [];
    const skipped: Array<{ googlePlaceId: string; reason: string; existingId?: string }> = [...fetchedCandidates.skipped];

    for (const candidate of fetchedCandidates.candidates) {
      try {
        const { d, durableId, name, types } = candidate;
        const formattedAddress = (d.formatted_address as string | undefined) || (d.vicinity as string | undefined) || null;
        const resolvedLocation = await resolveGooglePlaceMapLocation(d, locationQuery || textQuery);
        const geom = d.geometry as { location?: { lat?: number; lng?: number } } | undefined;
        const plat = autoImportSettings.fetchCoordinates && typeof geom?.location?.lat === "number" ? geom.location.lat : null;
        const plng = autoImportSettings.fetchCoordinates && typeof geom?.location?.lng === "number" ? geom.location.lng : null;
        const existing = await findExistingMapBusinessForImport({
          googlePlaceId: durableId,
          name,
          address: formattedAddress,
          lat: plat,
          lng: plng,
        });
        if (existing) {
          skippedExisting++;
          skipped.push({ googlePlaceId: durableId, reason: existing.reason, existingId: existing.id });
          continue;
        }

        const base = toSlug(name) || "isletme";
        let slug = base;
        let attempt = 1;
        while (attempt <= 200) {
          const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
          if (clash.length === 0) break;
          slug = `${base}-${++attempt}`;
        }

        const { hasDelivery, hasReservation, hasOnlineOrder } = inferServiceFlags(types);
        const photos = autoImportSettings.fetchPhoto
          ? buildPhotoUrls(apiKey, d.photos as Array<{ photo_reference?: string }> | undefined, autoImportSettings.photoCount)
          : [];
        const reviews = autoImportSettings.fetchReview
          ? sanitizePlaceReviews(d.reviews as Parameters<typeof sanitizePlaceReviews>[0], autoImportSettings.reviewCount)
          : [];
        const resolvedGallery = await resolveImportGalleryPhotos(photos, {
          homepageSuperCategory,
          storeType,
        });
        const photoUrl = resolvedGallery.coverUrl;
        const galleryPhotos = resolvedGallery.galleryPhotos;
        const extras = {
          ...googlePlacesExtras(d),
          importWorkflow: {
            source: "google_places_official",
            locationQuery: locationQuery || null,
            textQuery,
            radius,
            actualLocation: resolvedLocation,
            sourcePriority: candidate.score,
            rating: candidate.rating,
            userRatingsTotal: candidate.userRatingsTotal,
            autoImportSettings,
            importedAt: new Date().toISOString(),
          },
        };
        const [row] = await db
          .insert(mapBusinessesTable)
          .values({
            googlePlaceId: durableId,
            slug,
            name,
            cityId: resolvedLocation.cityId,
            districtId: resolvedLocation.districtId,
            address: autoImportSettings.fetchAddress ? formattedAddress : null,
            phone:
              autoImportSettings.fetchPhone
                ? (d.formatted_phone_number as string | undefined) ||
                  (d.international_phone_number as string | undefined) ||
                  null
                : null,
            website: autoImportSettings.fetchWebsite ? (d.website as string | undefined) || null : null,
            rating: autoImportSettings.fetchRating && typeof d.rating === "number" ? d.rating : null,
            userRatingsTotal: autoImportSettings.fetchRating && typeof d.user_ratings_total === "number" ? d.user_ratings_total : null,
            latitude: plat,
            longitude: plng,
            photoUrl,
            coverPhotoUrl: photoUrl,
            description: null,
            priceLevel: typeof d.price_level === "number" ? d.price_level : null,
            workingHours: openingHoursJson(d) as Record<string, unknown> | null,
            scrapedPhotos: photos.length ? (photos as unknown as Record<string, unknown>) : null,
            scrapedReviews: reviews.length ? (reviews as unknown as Record<string, unknown>) : null,
            importSource: "google_places",
            homepageSuperCategory,
            storeType,
            isActive: true,
            isPremium: false,
            hasDelivery,
            hasReservation,
            hasOnlineOrder,
            tags: tagsForImport(d.business_status as string | undefined, false),
            googlePlacesExtras: extras as unknown as Record<string, unknown>,
          })
          .returning({ id: mapBusinessesTable.id, name: mapBusinessesTable.name });

        if (row?.id) {
          await insertMapBusinessImportImages(row.id, galleryPhotos, autoImportSettings.photoCount);
          inserted++;
          insertedBusinesses.push({ id: row.id, name: row.name, googlePlaceId: durableId });
        }
      } catch (err) {
        errors.push(`${candidate.durableId}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 220));
      }
    }

    res.json({
      success: true,
      configured: true,
      provider: "google_places_official",
      importSource: "google_places",
      dedupeRules: ["google_place_id", "normalized_name + address", "normalized_name + coordinates within 90m"],
      privateFilters: {
        allowlist: [...GOOGLE_PLACES_PRIVATE_ALLOWLIST],
        denylist: [...GOOGLE_PLACES_PUBLIC_DENYLIST, ...DEFAULT_GOOGLE_PLACES_DENIED_NAME_PATTERNS],
      },
      query: {
        mode: Number.isFinite(lat) && Number.isFinite(lng) ? "nearby" : "text",
        locationQuery: locationQuery || null,
        textQuery,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        radius,
        googlePlaceType: googlePlaceType || null,
        keyword: keyword || null,
        maxResults,
      },
      found: placeIds.length,
      inserted,
      skippedExisting,
      skippedFiltered,
      errors,
      insertedBusinesses,
      skipped,
      message: `${placeIds.length} bulundu, ${inserted} özel işletme eklendi, ${skippedExisting} mevcut olduğu için atlandı, ${skippedFiltered} kamu/kurum filtresiyle elendi${errors.length ? `, ${errors.length} hata` : ""}.`,
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      configured: true,
      provider: "google_places_official",
      error: err instanceof Error ? err.message : String(err),
      found: 0,
      inserted: 0,
      skippedExisting: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    });
  }
});

router.post("/map/google-places/sync-location", async (req, res): Promise<void> => {
  const apiKey = await resolveGooglePlacesApiKey();
  if (!apiKey) {
    res.status(503).json({
      success: false,
      configured: false,
      provider: "google_places_official",
      error: "Google Places özel işletme kaynağı yapılandırılmamış.",
      hint: "Yekpare Maps bu bölgede resmi Google Places verisi gösterebilmek için sunucu tarafı Google Places API anahtarı ister; anahtar yoksa sahte veri üretilmez.",
      found: 0,
      privateCandidates: 0,
      inserted: 0,
      skippedExisting: 0,
      skippedFiltered: 0,
      errors: [],
    });
    return;
  }

  const rate = checkPublicPlacesSyncRateLimit(req);
  if (!rate.ok) {
    res.status(429).json({
      success: false,
      configured: true,
      provider: "google_places_official",
      error: "Bu konum import isteği geçici olarak sınırlandırıldı.",
      retryAfterSeconds: rate.retryAfterSeconds,
      found: 0,
      privateCandidates: 0,
      inserted: 0,
      skippedExisting: 0,
      skippedFiltered: 0,
      errors: [],
    });
    return;
  }

  const locationQuery = String(req.body?.locationQuery ?? req.body?.location ?? "").trim();
  const rawTextQuery = String(req.body?.textQuery ?? "").trim();
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const radius = normalizeGooglePlacesImportRadius(req.body?.radius ?? req.body?.radiusMeters, 7000, 20_000);
  const googlePlaceTypeRaw = String(req.body?.googlePlaceType ?? req.body?.category ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const googlePlaceType = (GOOGLE_PLACES_PRIVATE_ALLOWLIST as readonly string[]).includes(googlePlaceTypeRaw) ? googlePlaceTypeRaw : "";
  const keyword = String(req.body?.keyword ?? "").trim().slice(0, 80);
  const maxResults = Math.min(
    GOOGLE_PLACES_IMPORT_VALID_TARGET,
    Math.max(6, Math.round(Number(req.body?.maxResults ?? GOOGLE_PLACES_IMPORT_VALID_TARGET) || GOOGLE_PLACES_IMPORT_VALID_TARGET)),
  );
  const targetValidResults = Math.min(
    GOOGLE_PLACES_IMPORT_VALID_TARGET,
    Math.max(6, Math.round(Number(req.body?.targetValidResults ?? req.body?.importTarget ?? maxResults) || maxResults)),
  );
  const homepageSuperCategory = String(req.body?.homepageSuperCategory ?? "mekan_dukkan").trim() || "mekan_dukkan";
  const storeType = String(req.body?.storeType ?? googlePlaceType ?? homepageSuperCategory).trim() || homepageSuperCategory;

  if (!rawTextQuery && !locationQuery && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    res.status(400).json({ success: false, error: "locationQuery/textQuery veya lat/lng gerekli.", configured: true });
    return;
  }

  const autoImportSettings = await getMapAutoImportSettings();
  const refreshIntervalDays = autoImportSettings.refreshIntervalDays;
  const cacheTtlMs = Math.max(1, refreshIntervalDays) * 24 * 60 * 60 * 1000;
  const textQuery = rawTextQuery || [keyword || googlePlaceType || "işletmeler", locationQuery].filter(Boolean).join(" ");
  const cacheKey = publicSyncCacheKey({ lat, lng, radius, keyword, googlePlaceType, superCategory: homepageSuperCategory, locationQuery, textQuery, targetValidResults });
  const now = Date.now();
  const cached = googlePlacesPublicSyncCache.get(cacheKey);
  if (cached && now - cached.at < (cacheTtlMs || GOOGLE_PLACES_PUBLIC_SYNC_CACHE_FALLBACK_TTL_MS)) {
    res.json({
      ...cached.result,
      cached: true,
      message: `${cached.result.message} Bu sorgu ${refreshIntervalDays} gün içinde kontrol edildi; veritabanı/önbellek kullanıldı.`,
    });
    return;
  }

  const freshDbCount = await countFreshPublicGoogleImports({
    locationQuery,
    keyword: keyword || googlePlaceType || textQuery,
    googlePlaceType,
    homepageSuperCategory,
    refreshIntervalDays,
  }).catch(() => 0);
  if (freshDbCount >= targetValidResults) {
    res.json({
      success: true,
      configured: true,
      provider: "google_places_official",
      importSource: "google_places",
      dedupeRules: ["google_place_id", "normalized_name + address", "normalized_name + coordinates within 90m"],
      privateFilters: {
        allowlist: [...GOOGLE_PLACES_PRIVATE_ALLOWLIST],
        denylist: [...GOOGLE_PLACES_PUBLIC_DENYLIST, ...DEFAULT_GOOGLE_PLACES_DENIED_NAME_PATTERNS],
      },
      query: {
        mode: Number.isFinite(lat) && Number.isFinite(lng) ? "cached_nearby" : "cached_text",
        locationQuery: locationQuery || null,
        textQuery,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        radius,
        googlePlaceType: googlePlaceType || null,
        keyword: keyword || null,
        maxResults,
        targetValidResults,
        refreshIntervalDays,
      },
      found: freshDbCount,
      privateCandidates: freshDbCount,
      inserted: 0,
      skippedExisting: freshDbCount,
      skippedFiltered: 0,
      errors: [],
      insertedBusinesses: [],
      skipped: [],
      cached: true,
      message: `${freshDbCount} güncel işletme veritabanında bulundu; ${targetValidResults} hedefi karşılandığı için ${refreshIntervalDays} günlük yenileme aralığı dolmadan Google API tekrar çağrılmadı.`,
    });
    return;
  }

  try {
    const result = await runGooglePlacesLocationImport({
      apiKey,
      locationQuery,
      rawTextQuery,
      lat,
      lng,
      radius,
      googlePlaceType,
      keyword,
      maxResults,
      targetValidResults,
      homepageSuperCategory,
      storeType,
      publicPrivateOnly: true,
      sourceLabel: "public_location_view",
    });
    if ((result.inserted + result.skippedExisting) >= targetValidResults) {
      googlePlacesPublicSyncCache.set(cacheKey, { at: now, result });
    }
    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      configured: true,
      provider: "google_places_official",
      error: err instanceof Error ? err.message : String(err),
      found: 0,
      privateCandidates: 0,
      inserted: 0,
      skippedExisting: 0,
      skippedFiltered: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    });
  }
});

router.get("/map/traffic/status", async (req, res): Promise<void> => {
  const south = Number(req.query.south);
  const west = Number(req.query.west);
  const north = Number(req.query.north);
  const east = Number(req.query.east);
  const hasBbox = [south, west, north, east].every(Number.isFinite);
  const apiKey = await resolveGooglePlacesApiKey().catch(() => undefined);
  try {
    const data = hasBbox
      ? await getRouteContextFromKgmArcgis({ south, west, north, east })
      : null;
    res.json({
      success: true,
      provider: "kgm_arcgis",
      liveTrafficProvider: apiKey ? "google_routes_traffic_aware_routes" : null,
      configured: {
        kgmArcgis: true,
        googleRoutesTrafficAware: Boolean(apiKey),
      },
      note: apiKey
        ? "Yol olayı KGM resmi katmanlarından, rota süreleri Google Routes TRAFFIC_AWARE modundan alınabilir."
        : "Google trafik/Routes sunucu anahtarı yok; canlı yoğunluk fotoğrafı üretilmez, KGM yol çalışması/kapalı yol bağlamı döner.",
      data: data ?? {
        roadWorks: [],
        closedRoads: [],
        poiStops: [],
        trafficLevel: "orta",
        trafficNote: "BBox verilmedi; katman kaynağı hazır ama canlı sorgu yapılmadı.",
      },
    });
  } catch (err) {
    res.status(502).json({ success: false, provider: "kgm_arcgis", error: String(err) });
  }
});

router.get("/map/kgm/services-health", async (_req, res): Promise<void> => {
  const checks = await Promise.all([
    queryArcgisLayerCount(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/0`),
    queryArcgisLayerCount(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/1`),
    queryArcgisLayerCount(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/2`),
    queryArcgisLayerCount(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/3`),
    queryArcgisLayerCount(`${KGM_ARCGIS_BASE}/GezilecekYerler/GezYer/MapServer/0`),
    queryArcgisLayerCount(`${KGM_ARCGIS_BASE}/HavaDurumu/HavaDurumu/MapServer/0`),
  ]);
  const payload = {
    yolCalismaNokta: checks[0],
    kapaliYolNokta: checks[1],
    yolCalismaHat: checks[2],
    kapaliYolHat: checks[3],
    gezilecekYerler: checks[4],
    havaIstasyonlari: checks[5],
  };
  const ok = Object.values(payload).some((v) => typeof v === "number" && v >= 0);
  res.status(ok ? 200 : 502).json({ success: ok, data: payload });
});

type KgmMapItem = { name: string; lat: number; lng: number; detail?: string };

function formatDistanceText(km: number | null): string {
  if (!Number.isFinite(km as number)) return "-- km";
  return `${(km as number).toFixed(1)} km`;
}

function formatDurationText(mins: number | null): string {
  if (!Number.isFinite(mins as number)) return "-- dk";
  const total = Math.max(0, Math.round(mins as number));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

type KoeriEqRow = {
  id: string;
  source: "koeri" | "afad" | "usgs_fallback";
  location: string;
  latitude: number;
  longitude: number;
  magnitude: number;
  depthKm: number;
  date: string;
};

type FirmsWildfirePoint = {
  id: string;
  latitude: number;
  longitude: number;
  source: string;
  satellite: string | null;
  instrument: string | null;
  confidence: string | number | null;
  frp: number | null;
  brightness: number | null;
  acqDate: string | null;
  acqTime: string | null;
  observedAt: string | null;
  daynight: string | null;
};

type FirmsCacheEntry = {
  at: number;
  payload: {
    success: true;
    configured: true;
    provider: "nasa_firms";
    source: string;
    days: number;
    bbox: { south: number; west: number; north: number; east: number };
    count: number;
    cached: boolean;
    data: FirmsWildfirePoint[];
  };
};

const FIRMS_CACHE_TTL_MS = 10 * 60 * 1000;
const firmsWildfireCache = new Map<string, FirmsCacheEntry>();

function resolveFirmsMapKey(): string | null {
  const key = String(process.env.NASA_FIRMS_MAP_KEY || process.env.FIRMS_MAP_KEY || "").trim();
  return key || null;
}

function clampNumber(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function readFirmsBbox(req: Request): { south: number; west: number; north: number; east: number } {
  const south = clampNumber(Number(req.query.south ?? 35.65), -90, 90);
  const west = clampNumber(Number(req.query.west ?? 25.65), -180, 180);
  const north = clampNumber(Number(req.query.north ?? 42.5), -90, 90);
  const east = clampNumber(Number(req.query.east ?? 45.5), -180, 180);
  if (![south, west, north, east].every(Number.isFinite) || south >= north || west >= east) {
    return { south: 35.65, west: 25.65, north: 42.5, east: 45.5 };
  }
  return { south, west, north, east };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function parseFirmsObservedAt(date: string | null, time: string | null): string | null {
  if (!date) return null;
  const cleanTime = String(time ?? "").padStart(4, "0").slice(-4);
  const hh = cleanTime.slice(0, 2);
  const mm = cleanTime.slice(2, 4);
  const iso = `${date}T${hh || "00"}:${mm || "00"}:00Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : date;
}

function firmsConfidenceRank(value: string | number | null): number {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return 0;
  if (s === "h" || s === "high") return 3;
  if (s === "n" || s === "nominal" || s === "medium") return 2;
  if (s === "l" || s === "low") return 1;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  if (n >= 80) return 3;
  if (n >= 30) return 2;
  return 1;
}

function parseFirmsCsv(csv: string, source: string, minConfidence: string): FirmsWildfirePoint[] {
  const lines = csv.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (lines.length < 2 || /invalid|error|missing map_key/i.test(lines[0] ?? "")) return [];
  const headers = parseCsvLine(lines[0]).map((x) => x.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const minRank = minConfidence === "high" ? 3 : minConfidence === "nominal" ? 2 : 1;
  const out: FirmsWildfirePoint[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const get = (name: string): string | null => {
      const i = idx(name);
      return i >= 0 && cells[i] != null && cells[i] !== "" ? cells[i] : null;
    };
    const latitude = Number(get("latitude"));
    const longitude = Number(get("longitude"));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const confidenceRaw = get("confidence");
    const confidenceNumber = confidenceRaw != null && /^\d+(?:\.\d+)?$/.test(confidenceRaw) ? Number(confidenceRaw) : null;
    const confidence = confidenceNumber ?? confidenceRaw;
    if (firmsConfidenceRank(confidence) < minRank) continue;
    const acqDate = get("acq_date");
    const acqTime = get("acq_time");
    const brightness = Number(get("bright_ti4") ?? get("brightness") ?? get("bright_t31") ?? NaN);
    const frp = Number(get("frp") ?? NaN);
    const observedAt = parseFirmsObservedAt(acqDate, acqTime);
    const satellite = get("satellite");
    const instrument = get("instrument");
    out.push({
      id: `firms-${source}-${acqDate ?? "date"}-${acqTime ?? "time"}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`,
      latitude,
      longitude,
      source,
      satellite,
      instrument,
      confidence,
      frp: Number.isFinite(frp) ? frp : null,
      brightness: Number.isFinite(brightness) ? brightness : null,
      acqDate,
      acqTime,
      observedAt,
      daynight: get("daynight"),
    });
  }
  return out.sort((a, b) => (Date.parse(b.observedAt ?? "") || 0) - (Date.parse(a.observedAt ?? "") || 0));
}

/** Türkiye ve yakın çevre (Ege, Doğu Akdeniz, Kıbrıs, komşu kara sınırı kesimleri). */
function isNearTurkeyEarthquakeRegion(lat: number, lng: number): boolean {
  return lat >= 33.2 && lat <= 44.8 && lng >= 19.8 && lng <= 49.2;
}

function eqSortKey(dateIso: string): number {
  const t = Date.parse(dateIso);
  return Number.isFinite(t) ? t : 0;
}

function dedupeEarthquakeRows(rows: KoeriEqRow[]): KoeriEqRow[] {
  const seen = new Set<string>();
  const out: KoeriEqRow[] = [];
  for (const r of rows) {
    const key = `${r.latitude.toFixed(2)}_${r.longitude.toFixed(2)}_${String(r.date).slice(0, 16)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function parseKoeriDateToIso(rawDate: string): string {
  // 2026.05.05 20:19:26
  const m = rawDate.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return new Date().toISOString();
  const [, y, mo, d, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+03:00`).toISOString();
}

function parseKoeriRowsFromHtml(html: string, opts?: { source?: "koeri" | "usgs_fallback" }): KoeriEqRow[] {
  const source = opts?.source ?? "koeri";
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");
  const lines = plain.split(/\r?\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: KoeriEqRow[] = [];
  for (const ln of lines) {
    const m = ln.match(
      /^(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+[-.\d]+\s+([+-]?\d+(?:\.\d+)?|-?\.-)\s+([+-]?\d+(?:\.\d+)?|-?\.-)\s+(.+)$/i,
    );
    if (!m) continue;
    const [, dt, latS, lonS, depthS, mds, mlS, rest] = m;
    const lat = Number(latS);
    const lng = Number(lonS);
    const depthKm = Number(depthS);
    const magCand = [mds, mlS].map((x) => Number(String(x).replace("-.-", "NaN")));
    const magnitude = magCand.find((x) => Number.isFinite(x)) ?? NaN;
    if (![lat, lng, depthKm, magnitude].every((n) => Number.isFinite(n))) continue;
    const location = rest.replace(/\s{2,}.+$/, "").trim();
    out.push({
      id: `koeri-${dt}-${lat}-${lng}-${magnitude}`,
      source,
      location,
      latitude: lat,
      longitude: lng,
      magnitude,
      depthKm,
      date: parseKoeriDateToIso(dt),
    });
  }
  return out;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseAttrNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(String(v).replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** KGM / Esri polyline: [lng, lat][] — gerçek mesafe (km) */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pathsLengthKm(paths: number[][][]): number {
  let km = 0;
  for (const seg of paths) {
    if (!Array.isArray(seg)) continue;
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1];
      const b = seg[i];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;
      const lng0 = Number(a[0]);
      const lat0 = Number(a[1]);
      const lng1 = Number(b[0]);
      const lat1 = Number(b[1]);
      if (![lng0, lat0, lng1, lat1].every(Number.isFinite)) continue;
      km += haversineKm(lat0, lng0, lat1, lng1);
    }
  }
  return km;
}

/**
 * KGM Route solve bazen yalnızca Shape_Length döner; birim km veya m olabiliyor.
 * Güvenilir mesafe: mümkünse polyline üzerinden haversine toplamı.
 */
function extractRouteDistanceKm(
  attrs: Record<string, unknown>,
  paths: number[][][],
  directions: Array<{ lengthKm?: number }>,
): number | null {
  const pathKm = pathsLengthKm(paths);
  if (pathKm > 1) return pathKm;

  for (const key of ["Total_uzunluk", "Total_Uzunluk", "total_uzunluk", "Total_Kilometers", "Kilometers", "Length"]) {
    const v = parseAttrNumber(attrs[key]);
    if (v != null && v > 1 && v < 50_000) return v < 800 ? v : v / 1000;
  }
  const shape = parseAttrNumber(attrs.Shape_Length);
  if (shape != null && shape > 500) return shape / 1000;
  if (shape != null && shape > 1 && shape <= 500 && pathKm <= 0.01) return shape;

  const dirSum = directions.reduce((s, d) => {
    const lk = d?.lengthKm;
    return s + (typeof lk === "number" && Number.isFinite(lk) ? lk : 0);
  }, 0);
  if (dirSum > 1) return dirSum;

  return pathKm > 0 ? pathKm : null;
}

function extractRouteDurationMin(attrs: Record<string, unknown>): number | null {
  const t = parseAttrNumber(attrs.Total_zaman);
  return t != null && t >= 0 ? t : null;
}

type KgmRouteContext = {
  roadWorks: KgmMapItem[];
  closedRoads: KgmMapItem[];
  poiStops: KgmMapItem[];
  trafficLevel: "dusuk" | "orta" | "yuksek";
  trafficNote: string;
};

const KGM_ARCGIS_BASE = "https://yol.kgm.gov.tr/arcgis/rest/services";

function pickAttrText(attrs: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = attrs[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (!v || (typeof v !== "string" && typeof v !== "number")) continue;
    const key = k.toLocaleUpperCase("tr-TR");
    if (keys.some((x) => key.includes(x.toLocaleUpperCase("tr-TR")))) {
      const s = String(v).trim();
      if (s.length > 0) return s;
    }
  }
  return "";
}

function readEsriPoint(geom: unknown): { lat: number; lng: number } | null {
  if (!geom || typeof geom !== "object") return null;
  const g = geom as { x?: unknown; y?: unknown; latitude?: unknown; longitude?: unknown };
  const x = parseAttrNumber(g.x) ?? parseAttrNumber(g.longitude);
  const y = parseAttrNumber(g.y) ?? parseAttrNumber(g.latitude);
  if (x == null || y == null) return null;
  if (![x, y].every((n) => Number.isFinite(n))) return null;
  if (Math.abs(x) > 180 || Math.abs(y) > 90) return null;
  return { lat: y, lng: x };
}

function readEsriPolylineMid(geom: unknown): { lat: number; lng: number } | null {
  if (!geom || typeof geom !== "object") return null;
  const paths = (geom as { paths?: unknown }).paths;
  if (!Array.isArray(paths) || paths.length === 0) return null;
  const first = paths[0];
  if (!Array.isArray(first) || first.length === 0) return null;
  const mid = first[Math.floor(first.length / 2)];
  if (!Array.isArray(mid) || mid.length < 2) return null;
  const x = Number(mid[0]);
  const y = Number(mid[1]);
  if (![x, y].every((n) => Number.isFinite(n))) return null;
  if (Math.abs(x) > 180 || Math.abs(y) > 90) return null;
  return { lat: y, lng: x };
}

type ArcQueryFeature = { attributes?: Record<string, unknown>; geometry?: unknown };

async function queryArcgisLayerByBbox(
  layerUrl: string,
  bbox: { south: number; west: number; north: number; east: number },
  options?: { timeoutMs?: number; resultRecordCount?: number; outFields?: string; returnGeometry?: boolean },
): Promise<ArcQueryFeature[]> {
  const timeoutMs = options?.timeoutMs ?? 25_000;
  const qp = new URLSearchParams();
  qp.set("f", "pjson");
  qp.set("where", "1=1");
  qp.set("outFields", options?.outFields ?? "*");
  qp.set("returnGeometry", options?.returnGeometry === false ? "false" : "true");
  qp.set("geometryType", "esriGeometryEnvelope");
  qp.set("spatialRel", "esriSpatialRelIntersects");
  qp.set("inSR", "4326");
  qp.set("outSR", "4326");
  qp.set("resultRecordCount", String(options?.resultRecordCount ?? 250));
  qp.set("geometry", JSON.stringify({
    xmin: bbox.west,
    ymin: bbox.south,
    xmax: bbox.east,
    ymax: bbox.north,
    spatialReference: { wkid: 4326 },
  }));
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(`${layerUrl}/query?${qp.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "Yekpare/1.0 KGM ArcGIS context" },
      signal: ac.signal,
    });
    if (!r.ok) return [];
    const d = await r.json() as { features?: ArcQueryFeature[] };
    return Array.isArray(d?.features) ? d.features : [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function queryArcgisLayerCount(layerUrl: string): Promise<number | null> {
  const qp = new URLSearchParams();
  qp.set("f", "pjson");
  qp.set("where", "1=1");
  qp.set("returnCountOnly", "true");
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const r = await fetch(`${layerUrl}/query?${qp.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "Yekpare/1.0 KGM ArcGIS health" },
      signal: ac.signal,
    });
    if (!r.ok) return null;
    const d = await r.json() as { count?: unknown };
    const c = parseAttrNumber(d?.count);
    return c != null ? Math.max(0, Math.round(c)) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function getRouteContextFromKgmArcgis(
  bbox: { south: number; west: number; north: number; east: number },
): Promise<KgmRouteContext> {
  const [workPts, workLines, closePts, closeLines, poiPts, weatherPts] = await Promise.all([
    queryArcgisLayerByBbox(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/0`, bbox),
    queryArcgisLayerByBbox(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/2`, bbox),
    queryArcgisLayerByBbox(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/1`, bbox),
    queryArcgisLayerByBbox(`${KGM_ARCGIS_BASE}/Yol/YolDurumu/MapServer/3`, bbox),
    queryArcgisLayerByBbox(`${KGM_ARCGIS_BASE}/GezilecekYerler/GezYer/MapServer/0`, bbox, { resultRecordCount: 300 }),
    queryArcgisLayerByBbox(`${KGM_ARCGIS_BASE}/HavaDurumu/HavaDurumu/MapServer/0`, bbox, { resultRecordCount: 120 }),
  ]);

  const toItem = (f: ArcQueryFeature, fallbackName: string, detailLabel: string, geomReader: (g: unknown) => { lat: number; lng: number } | null): KgmMapItem | null => {
    const attrs = f.attributes ?? {};
    const p = geomReader(f.geometry);
    if (!p) return null;
    const name = pickAttrText(attrs, ["ADI", "AD", "YOL", "ROTA", "IL", "ILCE", "MAHALLE", "NAME"]) || fallbackName;
    const detail = pickAttrText(attrs, ["ACIKLAMA", "DURUM", "NOT", "SEBEP", "TARIH", "KAPANMA"]) || detailLabel;
    return { name, lat: p.lat, lng: p.lng, detail };
  };

  const roadWorks = [
    ...workPts.map((f) => toItem(f, "Yol çalışması", "KGM yol çalışması", readEsriPoint)).filter(Boolean) as KgmMapItem[],
    ...workLines.map((f) => toItem(f, "Yol çalışması (hat)", "KGM yol çalışması hattı", readEsriPolylineMid)).filter(Boolean) as KgmMapItem[],
  ];
  const closedRoads = [
    ...closePts.map((f) => toItem(f, "Kapalı yol", "KGM kapalı yol", readEsriPoint)).filter(Boolean) as KgmMapItem[],
    ...closeLines.map((f) => toItem(f, "Kapalı yol (hat)", "KGM kapalı yol hattı", readEsriPolylineMid)).filter(Boolean) as KgmMapItem[],
  ];
  const poiStops = poiPts
    .map((f) => toItem(f, "Gezilecek nokta", "KGM gezi noktası", readEsriPoint))
    .filter(Boolean) as KgmMapItem[];
  const weatherCount = weatherPts.filter((f) => readEsriPoint(f.geometry) != null).length;

  const pressure = roadWorks.length + closedRoads.length;
  const trafficLevel: "dusuk" | "orta" | "yuksek" = pressure >= 30 ? "yuksek" : pressure >= 12 ? "orta" : "dusuk";
  return {
    roadWorks: roadWorks.slice(0, 25),
    closedRoads: closedRoads.slice(0, 25),
    poiStops: poiStops.slice(0, 40),
    trafficLevel,
    trafficNote: `KGM resmi katmanları aktif (${roadWorks.length} çalışma, ${closedRoads.length} kapalı, ${weatherCount} hava istasyonu).`,
  };
}

function mergeKgmRouteContexts(parts: KgmRouteContext[]): KgmRouteContext {
  if (parts.length === 0) {
    return {
      roadWorks: [],
      closedRoads: [],
      poiStops: [],
      trafficLevel: "orta",
      trafficNote: "Güzergah özeti alınamadı.",
    };
  }
  if (parts.length === 1) return parts[0];
  const seen = new Set<string>();
  const roadWorks: KgmMapItem[] = [];
  const closedRoads: KgmMapItem[] = [];
  const poiStops: KgmMapItem[] = [];
  const pushUniq = (arr: KgmMapItem[], it: KgmMapItem) => {
    const k = `${it.name}|${it.lat.toFixed(3)}|${it.lng.toFixed(3)}`;
    if (seen.has(k)) return;
    seen.add(k);
    arr.push(it);
  };
  for (const p of parts) {
    for (const x of p.roadWorks) pushUniq(roadWorks, x);
    for (const x of p.closedRoads) pushUniq(closedRoads, x);
    for (const x of p.poiStops) pushUniq(poiStops, x);
  }
  const rank: Record<string, number> = { dusuk: 0, orta: 1, yuksek: 2 };
  let trafficLevel: "dusuk" | "orta" | "yuksek" = "orta";
  for (const p of parts) {
    if (rank[p.trafficLevel] > rank[trafficLevel]) trafficLevel = p.trafficLevel;
  }
  return {
    roadWorks: roadWorks.slice(0, 25),
    closedRoads: closedRoads.slice(0, 25),
    poiStops: poiStops.slice(0, 40),
    trafficLevel,
    trafficNote:
      "Uzun güzergah: rota boyunca birkaç bölgede KGM resmi katman verisi birleştirildi.",
  };
}

/** Tek büyük bbox yerine uzun rotada birkaç küçük kutu — Overpass zaman aşımı / boş sonuç riskini azaltır */
async function getRouteContextForKgmPolyline(
  points: Array<{ lat: number; lng: number }>,
  ends: { startLat: number; startLng: number; endLat: number; endLng: number },
): Promise<KgmRouteContext> {
  const fallbackSmall = async (): Promise<KgmRouteContext> => {
    const lats = [ends.startLat, ends.endLat];
    const lngs = [ends.startLng, ends.endLng];
    const bbox = {
      south: Math.min(...lats),
      north: Math.max(...lats),
      west: Math.min(...lngs),
      east: Math.max(...lngs),
    };
    const kgm = await getRouteContextFromKgmArcgis(bbox);
    if (kgm.roadWorks.length > 0 || kgm.closedRoads.length > 0 || kgm.poiStops.length > 0) return kgm;
    const over = await getRouteContextFromOverpass(bbox);
    return { ...over, trafficNote: `${over.trafficNote} (KGM katmanında bu bbox için olay bulunamadı)` };
  };

  if (points.length < 2) return fallbackSmall();

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const latSpan = north - south;
  const lngSpan = east - west;
  const useStrips = latSpan > 0.36 || lngSpan > 0.46;

  if (!useStrips) {
    return fallbackSmall();
  }

  const n = points.length;
  const fracs = latSpan > 4 || lngSpan > 5 ? [0.35, 0.72] : [0.2, 0.5, 0.82];
  const idxs = fracs.map((f) => Math.min(n - 1, Math.max(0, Math.floor(n * f))));
  const uniq = [...new Set(idxs)];
  const pad = 0.12;
  const parts: KgmRouteContext[] = [];
  for (let i = 0; i < uniq.length; i++) {
    const c = points[uniq[i]];
    const bbox = {
      south: Math.max(-89.9, c.lat - pad),
      north: Math.min(89.9, c.lat + pad),
      west: Math.max(-179.9, c.lng - pad),
      east: Math.min(179.9, c.lng + pad),
    };
    const kgm = await getRouteContextFromKgmArcgis(bbox);
    if (kgm.roadWorks.length > 0 || kgm.closedRoads.length > 0 || kgm.poiStops.length > 0) {
      parts.push(kgm);
    } else {
      parts.push(await getRouteContextFromOverpass(bbox, 32_000));
    }
    if (i < uniq.length - 1) await sleepMs(950);
  }
  return mergeKgmRouteContexts(parts);
}

async function getRouteContextFromOverpass(
  bbox: { south: number; west: number; north: number; east: number },
  timeoutMs = 55_000,
): Promise<{
  roadWorks: KgmMapItem[];
  closedRoads: KgmMapItem[];
  poiStops: KgmMapItem[];
  trafficLevel: "dusuk" | "orta" | "yuksek";
  trafficNote: string;
}> {
  const pad = 0.03;
  const south = Math.max(-89.9, bbox.south - pad);
  const west = Math.max(-179.9, bbox.west - pad);
  const north = Math.min(89.9, bbox.north + pad);
  const east = Math.min(179.9, bbox.east + pad);
  const bboxText = `${south},${west},${north},${east}`;
  const q = `
[out:json][timeout:40];
(
  way["highway"="construction"](${bboxText});
  way["construction"]["highway"](${bboxText});
  node["highway"="construction"](${bboxText});
  way["highway"]["access"="no"](${bboxText});
  way["highway"]["motor_vehicle"="no"](${bboxText});
  node["barrier"~"yes|block|gate|bollard"](${bboxText});
  node["tourism"~"attraction|viewpoint|museum|zoo|theme_park"](${bboxText});
  node["historic"](${bboxText});
  node["natural"~"peak|waterfall|beach"](${bboxText});
  node["amenity"~"fuel|restaurant|cafe|parking"](${bboxText});
  way["highway"~"motorway|trunk|primary|secondary"](${bboxText});
);
out center tags qt 450;
`;
  try {
    const rsp = await postOverpassInterpreter(`data=${encodeURIComponent(q)}`, { timeoutMs, userAgent: "Yekpare/1.0 KGM context" });
    if (!rsp.ok) throw new Error(`overpass_http_${rsp.status}`);
    const body = await rsp.json() as { elements?: Array<{ type?: string; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> }> };
    const rows = Array.isArray(body?.elements) ? body.elements : [];
    const roadWorks: KgmMapItem[] = [];
    const closedRoads: KgmMapItem[] = [];
    const poiStops: KgmMapItem[] = [];
    let majorWays = 0;
    for (const el of rows) {
      const tags = el.tags ?? {};
      const lat = Number(el.lat ?? el.center?.lat);
      const lng = Number(el.lon ?? el.center?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const name = String(tags.name ?? tags.ref ?? tags.highway ?? tags.tourism ?? tags.amenity ?? "İşaret");
      const highway = String(tags.highway ?? "");
      const construction = String(tags.construction ?? "");
      if (["motorway", "trunk", "primary", "secondary"].includes(highway)) majorWays += 1;
      if (highway === "construction" || construction.length > 0) {
        roadWorks.push({ name, lat, lng, detail: construction || "Yol çalışması" });
        continue;
      }
      if (tags.access === "no" || tags.motor_vehicle === "no" || (tags.barrier && tags.barrier !== "no")) {
        closedRoads.push({ name, lat, lng, detail: tags.access === "no" ? "Geçiş kapalı" : "Kısıtlı geçiş" });
        continue;
      }
      if (tags.tourism || tags.historic || tags.natural || tags.amenity) {
        poiStops.push({ name, lat, lng, detail: String(tags.tourism ?? tags.historic ?? tags.natural ?? tags.amenity ?? "Nokta") });
      }
    }
    const trafficLevel: "dusuk" | "orta" | "yuksek" = majorWays >= 60 ? "yuksek" : majorWays >= 25 ? "orta" : "dusuk";
    const trafficNote = trafficLevel === "yuksek"
      ? "Yoğun ana yol ağı: pik saatlerde trafik yükselebilir."
      : trafficLevel === "orta"
        ? "Orta yoğunluk: şehir giriş-çıkışlarında yer yer yoğunluk olabilir."
        : "Düşük yoğunluk: genel akış rahat görünüyor.";
    return {
      roadWorks: roadWorks.slice(0, 25),
      closedRoads: closedRoads.slice(0, 25),
      poiStops: poiStops.slice(0, 40),
      trafficLevel,
      trafficNote,
    };
  } catch {
    return {
      roadWorks: [],
      closedRoads: [],
      poiStops: [],
      trafficLevel: "orta",
      trafficNote: "Canlı yol yoğunluğu verisi alınamadı; tahmini trafik seviyesi gösteriliyor.",
    };
  }
}

/** POST /map/routes/google — Routes API v2; kota/limitte istemci OSRM’e düşer. */
router.post("/map/routes/google", async (req, res): Promise<void> => {
  try {
    const apiKey = await resolveGooglePlacesApiKey();
    if (!apiKey) {
      res.json({ success: false, fallback: true, error: "no_key", message: "Google sunucu anahtarı tanımlı değil" });
      return;
    }
    const oLat = Number(req.body?.originLat ?? req.body?.startLat);
    const oLng = Number(req.body?.originLng ?? req.body?.startLng);
    const dLat = Number(req.body?.destinationLat ?? req.body?.endLat);
    const dLng = Number(req.body?.destinationLng ?? req.body?.endLng);
    const modeRaw = String(req.body?.mode ?? "car").toLowerCase();
    const travelMode: GoogleTravelModeApi =
      modeRaw === "walk" || modeRaw === "walking" || modeRaw === "foot"
        ? "WALK"
        : modeRaw === "transit" || modeRaw === "public"
          ? "TRANSIT"
          : "DRIVE";

    if (![oLat, oLng, dLat, dLng].every((x) => Number.isFinite(x))) {
      res.status(400).json({ success: false, fallback: true, error: "invalid_coords" });
      return;
    }

    const result = await computeGoogleRoute(apiKey, { lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }, travelMode);
    if (!result.ok) {
      res.json({
        success: false,
        fallback: true,
        error: result.reason,
        message: result.message,
      });
      return;
    }

    res.json({
      success: true,
      provider: "google",
      data: {
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        coordinates: result.coordinates,
        instructions: result.instructions,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, fallback: true, error: "server", message: msg });
  }
});

/** POST /map/kgm/route-analysis
 *  KGM Guzergah Analizi uzerinden canli rota/mesafe/sure getirir.
 */
router.post("/map/kgm/route-analysis", async (req, res): Promise<void> => {
  try {
    const startLat = Number(req.body?.startLat);
    const startLng = Number(req.body?.startLng);
    const endLat = Number(req.body?.endLat);
    const endLng = Number(req.body?.endLng);
    const mode = String(req.body?.mode ?? "fastest"); // fastest | shortest | free
    const vehicle = String(req.body?.vehicle ?? "car"); // car | truck
    const includeRoadWorks = req.body?.includeRoadWorks !== false;
    const includeClosures = req.body?.includeClosures !== false;
    const includePoiStops = req.body?.includePoiStops !== false;
    const includeTraffic = req.body?.includeTraffic !== false;

    if (![startLat, startLng, endLat, endLng].every((x) => Number.isFinite(x))) {
      res.status(400).json({ success: false, error: "Baslangic/bitis koordinatlari gecersiz" });
      return;
    }

    const form = new URLSearchParams();
    form.set("f", "json");
    form.set("stops", JSON.stringify({
      features: [
        { geometry: { x: startLng, y: startLat } },
        { geometry: { x: endLng, y: endLat } },
      ],
      spatialReference: { wkid: 4326 },
    }));
    form.set("returnRoutes", "true");
    form.set("returnDirections", "true");
    form.set("returnStops", "false");
    form.set("returnBarriers", "false");
    form.set("returnPolylineBarriers", "false");
    form.set("returnPolygonBarriers", "false");
    form.set("directionsLanguage", "tr");
    form.set("directionsLengthUnits", "esriNAUKilometers");
    form.set("outSR", "4326");
    if (mode === "shortest") form.set("impedanceAttributeName", "uzunluk");
    else form.set("impedanceAttributeName", "zaman");
    if (mode === "free") {
      form.set("restrictionAttributeNames", JSON.stringify(["parali", "RestTip"]));
      form.set("attributeParameterValues", JSON.stringify([
        { attributeName: "parali", parameterName: "Restriction Usage", value: "Prohibited" },
        { attributeName: "RestTip", parameterName: "Restriction Usage", value: "Prohibited" },
      ]));
    }
    if (vehicle === "truck") {
      form.set("restrictionAttributeNames", JSON.stringify(["RestTip"]));
      form.set("attributeParameterValues", JSON.stringify([
        { attributeName: "RestTip", parameterName: "Restriction Usage", value: "Prohibited" },
      ]));
    }

    const r = await fetch("https://yol.kgm.gov.tr/arcgis/rest/services/Guzergah/Guzergah_ND/NAServer/Route/solve", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = await r.json() as {
      routes?: { features?: Array<{ attributes?: Record<string, unknown>; geometry?: { paths?: number[][][] } }> };
      directions?: Array<{ features?: Array<{ attributes?: Record<string, unknown> }> }>;
      error?: { message?: string };
    };
    if (!r.ok || data?.error) {
      res.status(502).json({ success: false, error: data?.error?.message || `KGM route http_${r.status}` });
      return;
    }

    const route = data.routes?.features?.[0];
    const attrs = route?.attributes ?? {};
    const directions = (data.directions?.[0]?.features ?? []).map((f) => ({
      text: String(f.attributes?.text ?? f.attributes?.Text ?? ""),
      lengthKm: Number(f.attributes?.length ?? 0),
      timeMin: Number(f.attributes?.time ?? 0),
      roadName: String(f.attributes?.roadName ?? ""),
    })).filter((x) => x.text.length > 0);
    const paths = Array.isArray(route?.geometry?.paths) ? route?.geometry?.paths : [];
    const km = extractRouteDistanceKm(attrs, paths, directions);
    const mins = extractRouteDurationMin(attrs);

    let context: KgmRouteContext = {
      roadWorks: [],
      closedRoads: [],
      poiStops: [],
      trafficLevel: "orta",
      trafficNote: "Güzergah bağlamı hesaplanamadı (rota geometrisi yok).",
    };
    const points = paths.flatMap((seg) => seg).map((p) => ({ lat: Number(p?.[1]), lng: Number(p?.[0]) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (points.length > 1 && (includeRoadWorks || includeClosures || includePoiStops || includeTraffic)) {
      const raw = await getRouteContextForKgmPolyline(points, {
        startLat,
        startLng,
        endLat,
        endLng,
      });
      context = {
        roadWorks: includeRoadWorks ? raw.roadWorks : [],
        closedRoads: includeClosures ? raw.closedRoads : [],
        poiStops: includePoiStops ? raw.poiStops : [],
        trafficLevel: includeTraffic ? raw.trafficLevel : "orta",
        trafficNote: includeTraffic ? raw.trafficNote : "Trafik katmanı devre dışı.",
      };
    } else if (points.length > 1) {
      context = {
        roadWorks: [],
        closedRoads: [],
        poiStops: [],
        trafficLevel: "orta",
        trafficNote: "Güzergah katmanları kapalı; yalnızca KGM mesafe ve süre kullanıldı.",
      };
    }
    res.json({
      success: true,
      data: {
        mode,
        vehicle,
        distanceKm: km,
        durationMin: mins,
        distanceText: formatDistanceText(km),
        durationText: formatDurationText(mins),
        routeName: String(attrs.Name ?? "KGM Rotasi"),
        paths,
        directions,
        context,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /map/parcel-query-link?il=&ilce=&mahalle=&ada=&parsel=&pafta=
 *  TKGM Parsel Sorgu yönlendirme linki üretir.
 */
router.get("/map/parcel-query-link", (req, res): void => {
  const il = typeof req.query.il === "string" ? req.query.il.trim() : "";
  const ilce = typeof req.query.ilce === "string" ? req.query.ilce.trim() : "";
  const mahalle = typeof req.query.mahalle === "string" ? req.query.mahalle.trim() : "";
  const ada = typeof req.query.ada === "string" ? req.query.ada.trim() : "";
  const parsel = typeof req.query.parsel === "string" ? req.query.parsel.trim() : "";
  const pafta = typeof req.query.pafta === "string" ? req.query.pafta.trim() : "";

  if (!il && !ilce && !mahalle && !ada && !parsel && !pafta) {
    res.status(400).json({ success: false, error: "En az bir sorgu alanı gerekli" });
    return;
  }

  const qp = new URLSearchParams();
  if (il) qp.set("il", il);
  if (ilce) qp.set("ilce", ilce);
  if (mahalle) qp.set("mahalle", mahalle);
  if (ada) qp.set("ada", ada);
  if (parsel) qp.set("parsel", parsel);
  if (pafta) qp.set("pafta", pafta);

  const externalUrl = `https://parselsorgu.tkgm.gov.tr/#ara?${qp.toString()}`;
  res.json({
    success: true,
    data: {
      il, ilce, mahalle, ada, parsel, pafta,
      externalUrl,
      source: "TKGM Parsel Sorgu",
    },
  });
});

/** GET /map/official-map-links-health
 *  Resmi harita kaynaklarının erişilebilirlik durumunu kontrol eder.
 */
router.get("/map/official-map-links-health", async (_req, res): Promise<void> => {
  const links = [
    { id: "afad-deprem", url: "https://deprem.afad.gov.tr/last-earthquakes.html" },
    { id: "mgm-hava", url: "https://mgm.gov.tr/tahmin/haritali-tahmin.aspx" },
    { id: "tkgm-parsel", url: "https://parselsorgu.tkgm.gov.tr/" },
  ] as const;
  const timeoutMs = 5000;

  const checks = await Promise.all(links.map(async (link) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    const started = Date.now();
    try {
      const r = await fetch(link.url, { method: "GET", redirect: "follow", signal: ac.signal });
      clearTimeout(timer);
      return {
        id: link.id,
        ok: r.status >= 200 && r.status < 400,
        statusCode: r.status,
        latencyMs: Date.now() - started,
      };
    } catch {
      clearTimeout(timer);
      return {
        id: link.id,
        ok: false,
        statusCode: null as number | null,
        latencyMs: Date.now() - started,
      };
    }
  }));

  res.json({ success: true, data: checks });
});

/** GET /map/wildfires/firms?south=&west=&north=&east=&days=1&source=VIIRS_SNPP_NRT */
router.get("/map/wildfires/firms", async (req, res): Promise<void> => {
  const mapKey = resolveFirmsMapKey();
  if (!mapKey) {
    res.json({
      success: true,
      configured: false,
      provider: "nasa_firms",
      message: "Orman yangını verisi şu anda bağlı değil. Veri kaynağı yapılandırılmadı.",
      data: [],
    });
    return;
  }

  const bbox = readFirmsBbox(req);
  const days = Math.min(5, Math.max(1, Number(req.query.days ?? 1) || 1));
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit ?? 450) || 450));
  const requestedSource = String(req.query.source ?? "VIIRS_SNPP_NRT").trim().toUpperCase();
  const allowedSources = new Set([
    "VIIRS_SNPP_NRT",
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
    "MODIS_NRT",
    "VIIRS_SNPP_SP",
    "VIIRS_NOAA20_SP",
    "VIIRS_NOAA21_SP",
    "MODIS_SP",
  ]);
  const source = allowedSources.has(requestedSource) ? requestedSource : "VIIRS_SNPP_NRT";
  const minConfidence = ["low", "nominal", "high"].includes(String(req.query.confidence ?? "").toLowerCase())
    ? String(req.query.confidence).toLowerCase()
    : "low";
  const roundedBbox = {
    south: Number(bbox.south.toFixed(3)),
    west: Number(bbox.west.toFixed(3)),
    north: Number(bbox.north.toFixed(3)),
    east: Number(bbox.east.toFixed(3)),
  };
  const cacheKey = JSON.stringify({ bbox: roundedBbox, days, source, minConfidence, limit });
  const cached = firmsWildfireCache.get(cacheKey);
  if (cached && Date.now() - cached.at < FIRMS_CACHE_TTL_MS) {
    res.json({ ...cached.payload, cached: true });
    return;
  }

  try {
    const area = `${roundedBbox.west},${roundedBbox.south},${roundedBbox.east},${roundedBbox.north}`;
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${encodeURIComponent(source)}/${area}/${days}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 18_000);
    const r = await fetch(url, {
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": "Yekpare/1.0 NASA FIRMS wildfire layer",
      },
      signal: ac.signal,
    });
    clearTimeout(timer);
    const txt = await r.text().catch(() => "");
    if (!r.ok) {
      res.status(502).json({
        success: false,
        configured: true,
        provider: "nasa_firms",
        message: "Orman yangını verisi şu anda alınamadı.",
        data: [],
      });
      return;
    }
    const data = parseFirmsCsv(txt, source, minConfidence).slice(0, limit);
    const payload = {
      success: true as const,
      configured: true as const,
      provider: "nasa_firms" as const,
      source,
      days,
      bbox: roundedBbox,
      count: data.length,
      cached: false,
      data,
    };
    firmsWildfireCache.set(cacheKey, { at: Date.now(), payload });
    res.json(payload);
  } catch {
    res.status(502).json({
      success: false,
      configured: true,
      provider: "nasa_firms",
      message: "Orman yangını verisi şu anda alınamadı.",
      data: [],
    });
  }
});

/** GET /map/afad/latest-earthquakes?days=7&limit=120 */
router.get("/map/afad/latest-earthquakes", async (req, res): Promise<void> => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days ?? 7) || 7));
    const limit = Math.min(300, Math.max(10, Number(req.query.limit ?? 120) || 120));
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const qs = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      minmag: "0",
      orderby: "timedesc",
      limit: String(limit),
    });
    const r = await fetch(`https://deprem.afad.gov.tr/apiv2/event/filter?${qs.toString()}`);
    const data = await r.json() as Array<{
      eventID?: string; location?: string; latitude?: string; longitude?: string; depth?: string;
      magnitude?: string; date?: string; province?: string; district?: string;
    }>;
    const rows = Array.isArray(data) ? data.map((x) => ({
      id: x.eventID ?? crypto.randomUUID(),
      location: x.location ?? "",
      latitude: Number(x.latitude ?? 0),
      longitude: Number(x.longitude ?? 0),
      depthKm: Number(x.depth ?? 0),
      magnitude: Number(x.magnitude ?? 0),
      date: x.date ?? "",
      province: x.province ?? null,
      district: x.district ?? null,
    })).filter((x) => Number.isFinite(x.latitude) && Number.isFinite(x.longitude)) : [];
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /map/koeri/latest-earthquakes-tr?limit=120 */
router.get("/map/koeri/latest-earthquakes-tr", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(500, Math.max(10, Number(req.query.limit ?? 120) || 120));
    const r = await fetch("http://www.koeri.boun.edu.tr/scripts/lst2.asp", {
      headers: { "User-Agent": "Yekpare/1.0 (+https://yekpare.net)", Accept: "text/html" },
    });
    const txt = await r.text();
    const rows = parseKoeriRowsFromHtml(txt)
      .filter((x) => isNearTurkeyEarthquakeRegion(x.latitude, x.longitude))
      .sort((a, b) => eqSortKey(b.date) - eqSortKey(a.date))
      .slice(0, limit);
    res.json({ success: true, source: "koeri", data: rows });
  } catch (err) {
    res.status(502).json({ success: false, error: String(err) });
  }
});

/** GET /map/earthquakes/regional?days=7&limit=200 — KOERI + AFAD, Türkiye ve yakın çevre, tek liste */
router.get("/map/earthquakes/regional", async (req, res): Promise<void> => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days ?? 7) || 7));
    const limit = Math.min(400, Math.max(10, Number(req.query.limit ?? 200) || 200));
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const afadQs = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      minmag: "0",
      orderby: "timedesc",
      limit: String(Math.min(500, limit * 3)),
    });

    const [koeriTxt, afadRaw] = await Promise.all([
      fetch("http://www.koeri.boun.edu.tr/scripts/lst2.asp", {
        headers: { "User-Agent": "Yekpare/1.0 (+https://yekpare.net)", Accept: "text/html" },
      })
        .then((rr) => rr.text())
        .catch(() => ""),
      fetch(`https://deprem.afad.gov.tr/apiv2/event/filter?${afadQs.toString()}`)
        .then((rr) => rr.json())
        .catch(() => []),
    ]);

    const koeriNear = parseKoeriRowsFromHtml(koeriTxt).filter((x) =>
      isNearTurkeyEarthquakeRegion(x.latitude, x.longitude),
    );

    const afadArr = Array.isArray(afadRaw)
      ? (afadRaw as Array<{
          eventID?: string;
          location?: string;
          latitude?: string;
          longitude?: string;
          depth?: string;
          magnitude?: string;
          date?: string;
        }>)
      : [];

    const afadNear: KoeriEqRow[] = afadArr
      .map((x) => {
        const latitude = Number(x.latitude ?? NaN);
        const longitude = Number(x.longitude ?? NaN);
        const depthKm = Number(x.depth ?? NaN);
        const magnitude = Number(x.magnitude ?? NaN);
        return {
          id: String(x.eventID ?? crypto.randomUUID()),
          source: "afad" as const,
          location: x.location ?? "",
          latitude,
          longitude,
          depthKm,
          magnitude,
          date: x.date ?? "",
        };
      })
      .filter(
        (x) =>
          Number.isFinite(x.latitude) &&
          Number.isFinite(x.longitude) &&
          Number.isFinite(x.magnitude) &&
          isNearTurkeyEarthquakeRegion(x.latitude, x.longitude),
      );

    const merged = [...afadNear, ...koeriNear].sort((a, b) => {
      const d = eqSortKey(b.date) - eqSortKey(a.date);
      if (d !== 0) return d;
      if (a.source === "afad" && b.source !== "afad") return -1;
      if (b.source === "afad" && a.source !== "afad") return 1;
      return 0;
    });

    const rows = dedupeEarthquakeRows(merged).slice(0, limit);
    res.json({ success: true, source: "regional_merged", data: rows });
  } catch (err) {
    res.status(502).json({ success: false, error: String(err) });
  }
});

/** GET /map/duty-pharmacies?il=&ilce= — CollectAPI nöbetçi eczane proxy (COLLECTAPI_KEY). */
router.get("/map/duty-pharmacies", async (req, res): Promise<void> => {
  try {
    const il = String(req.query.il ?? "").trim();
    const ilce = String(req.query.ilce ?? "").trim();
    if (!il) {
      res.status(400).json({ success: false, error: "il zorunlu" });
      return;
    }
    const { configured, pharmacies } = await fetchDutyPharmacies({ il, ilce: ilce || undefined });
    res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=3600");
    res.json({
      success: true,
      configured,
      il,
      ilce: ilce || null,
      data: pharmacies,
    });
  } catch (err) {
    res.status(502).json({ success: false, error: String(err) });
  }
});

/** GET /map/opensky/states — OpenSky Network bbox proxy (CORS-safe, anonymous tier) */
router.get("/map/opensky/states", async (req, res): Promise<void> => {
  try {
    const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
    const lamin = clamp(Number(req.query.lamin ?? 35), -90, 90);
    const lamax = clamp(Number(req.query.lamax ?? 43), -90, 90);
    const lomin = clamp(Number(req.query.lomin ?? 25), -180, 180);
    const lomax = clamp(Number(req.query.lomax ?? 45), -180, 180);
    if (!(lamax > lamin && lomax > lomin)) {
      res.status(400).json({ success: false, error: "Geçersiz bbox (lamax>lamin, lomax>lomin olmalı)" });
      return;
    }
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;
    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Yekpare/1.0 (+https://yekpare.net)",
      },
    });
    if (!r.ok) {
      res.status(502).json({ success: false, error: `opensky_http_${r.status}` });
      return;
    }
    const j = (await r.json()) as { time?: number; states?: unknown };
    res.json({ success: true, time: typeof j.time === "number" ? j.time : null, states: j.states ?? null });
  } catch (err) {
    res.status(502).json({ success: false, error: String(err) });
  }
});

/** GET /map/mgm-weather-summary?limit=20 */
router.get("/map/mgm-weather-summary", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(81, Math.max(8, Number(req.query.limit ?? 24) || 24));
    const cities = (TURKEY_CITIES as ReadonlyArray<{ name: string; nameTr?: string; lat: number; lng: number }>).slice(0, limit);
    const rows = await Promise.all(cities.map(async (c) => {
      try {
        const u = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`;
        const r = await fetch(u);
        if (!r.ok) throw new Error(`weather_http_${r.status}`);
        const d = await r.json() as {
          current?: { temperature_2m?: number | null; weather_code?: number | null };
          hourly?: { temperature_2m?: Array<number | null>; weather_code?: Array<number | null> };
        };
        const fallbackTemp = Array.isArray(d.hourly?.temperature_2m)
          ? d.hourly?.temperature_2m.find((x) => typeof x === "number" && Number.isFinite(x))
          : undefined;
        const fallbackCode = Array.isArray(d.hourly?.weather_code)
          ? d.hourly?.weather_code.find((x) => typeof x === "number" && Number.isFinite(x))
          : undefined;
        return {
          city: c.nameTr ?? c.name,
          lat: c.lat,
          lng: c.lng,
          temperature: Number(d.current?.temperature_2m ?? fallbackTemp ?? NaN),
          weatherCode: Number(d.current?.weather_code ?? fallbackCode ?? NaN),
        };
      } catch {
        return {
          city: c.nameTr ?? c.name,
          lat: c.lat,
          lng: c.lng,
          temperature: NaN,
          weatherCode: NaN,
        };
      }
    }));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

const WIKI_REST_HEADERS = {
  Accept: "application/json",
  "User-Agent": "YekpareBilgiAgaci/1.0 (https://yekpare.net; ahenkbt1@gmail.com)",
} as const;

const LODGING_GOOGLE_TYPES = new Set([
  "lodging",
  "hotel",
  "motel",
  "resort_hotel",
  "guest_house",
  "bed_and_breakfast",
  "hostel",
  "extended_stay_hotel",
]);

function weatherCodeLabelTr(code: number): string {
  if (code === 0) return "Açık";
  if (code === 1) return "Az bulutlu";
  if (code === 2) return "Parçalı bulutlu";
  if (code === 3) return "Kapalı";
  if ([45, 48].includes(code)) return "Sisli";
  if (code >= 51 && code <= 55) return "Çisenti";
  if (code >= 61 && code <= 65) return "Yağmurlu";
  if (code >= 71 && code <= 77) return "Karlı";
  if (code >= 80 && code <= 82) return "Sağanak";
  if (code >= 95) return "Fırtınalı";
  return "Hava durumu";
}

async function fetchOpenMeteoWeatherAt(lat: number, lng: number): Promise<{
  temperature: number | null;
  weatherCode: number | null;
  label: string;
} | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const u =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      "&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1";
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const d = await r.json() as {
      current?: { temperature_2m?: number | null; weather_code?: number | null };
      hourly?: { temperature_2m?: Array<number | null>; weather_code?: Array<number | null> };
    };
    const fallbackTemp = Array.isArray(d.hourly?.temperature_2m)
      ? d.hourly.temperature_2m.find((x) => typeof x === "number" && Number.isFinite(x))
      : undefined;
    const fallbackCode = Array.isArray(d.hourly?.weather_code)
      ? d.hourly.weather_code.find((x) => typeof x === "number" && Number.isFinite(x))
      : undefined;
    const temperature = Number(d.current?.temperature_2m ?? fallbackTemp ?? NaN);
    const weatherCode = Number(d.current?.weather_code ?? fallbackCode ?? NaN);
    const tempOk = Number.isFinite(temperature);
    const codeOk = Number.isFinite(weatherCode);
    const label = tempOk && codeOk
      ? `${weatherCodeLabelTr(weatherCode)} ${Math.round(temperature)}°C`
      : tempOk
        ? `${Math.round(temperature)}°C`
        : "Hava durumu";
    return {
      temperature: tempOk ? temperature : null,
      weatherCode: codeOk ? weatherCode : null,
      label,
    };
  } catch {
    return null;
  }
}

function wikiImageLooksUsable(src: string): boolean {
  const s = String(src || "").toLowerCase();
  if (!s.includes("wikimedia.org")) return false;
  if (/(icon|logo|symbol|flag|map|locator|ambox|edit-clear|question-book)/i.test(s)) return false;
  return true;
}

async function fetchWikiSummaryForLocation(title: string): Promise<{
  title: string;
  summary: string;
  url: string;
  photos: string[];
} | null> {
  const raw = String(title || "").trim();
  if (raw.length < 2) return null;
  const province = resolveTurkishProvinceWikiTitle(raw);
  const candidates = Array.from(new Set([
    province,
    province ? `${province} (il)` : null,
    raw,
    raw.replace(/\s*\(.*?\)\s*/g, " ").trim(),
  ].filter((x): x is string => Boolean(x && x.length >= 2))));

  for (const candidate of candidates) {
    try {
      const summaryRes = await fetch(
        `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`,
        { headers: WIKI_REST_HEADERS },
      );
      if (!summaryRes.ok) continue;
      const summary = await summaryRes.json() as {
        type?: string;
        title?: string;
        extract?: string;
        content_urls?: { desktop?: { page?: string } };
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      if (summary.type === "disambiguation") continue;
      const resolvedTitle = String(summary.title || candidate).trim();
      const extract = String(summary.extract || "").trim();
      if (!resolvedTitle || extract.length < 20) continue;

      const photos = new Set<string>();
      const hero = summary.originalimage?.source || summary.thumbnail?.source;
      if (hero && wikiImageLooksUsable(hero)) photos.add(hero);

      try {
        const mediaRes = await fetch(
          `https://tr.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(resolvedTitle)}`,
          { headers: WIKI_REST_HEADERS },
        );
        if (mediaRes.ok) {
          const media = await mediaRes.json() as {
            items?: Array<{ type?: string; srcset?: Array<{ src?: string }> }>;
          };
          for (const item of media.items ?? []) {
            if (item.type !== "image") continue;
            const src = item.srcset?.[0]?.src || item.srcset?.find((x) => x.src)?.src;
            if (src && wikiImageLooksUsable(src)) photos.add(src);
            if (photos.size >= 8) break;
          }
        }
      } catch {
        /* ignore gallery errors */
      }

      return {
        title: resolvedTitle,
        summary: extract.length > 420 ? `${extract.slice(0, 417).trim()}…` : extract,
        url: summary.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle)}`,
        photos: [...photos],
      };
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

async function searchLodgingPlacesNear(input: {
  lat: number;
  lng: number;
  query: string;
  limit?: number;
}): Promise<Array<{
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  photoUrl: string | null;
  affiliateUrl: string | null;
}>> {
  const apiKey = await resolveGooglePlacesApiKey().catch(() => undefined);
  if (!apiKey) return [];
  const limit = Math.min(8, Math.max(1, input.limit ?? 6));
  const textQuery = [input.query.trim(), "otel"].filter(Boolean).join(" ").trim();
  try {
    const g = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.googleMapsUri,places.photos",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "tr",
        regionCode: "TR",
        maxResultCount: Math.min(20, limit * 3),
        locationBias: {
          circle: {
            center: { latitude: input.lat, longitude: input.lng },
            radius: 12000,
          },
        },
      }),
    });
    const payload = await g.json() as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        primaryType?: string;
        types?: string[];
        rating?: number;
        userRatingCount?: number;
        googleMapsUri?: string;
        photos?: Array<{ name?: string }>;
      }>;
    };
    if (!g.ok || !Array.isArray(payload.places)) return [];
    const cfg = await getTravelpayoutsConfig();
    const affiliateUrl = buildAffiliateUrl("hotel", cfg.marker, { location: input.query.trim() });
    return payload.places
      .filter((p) => {
        const types = [p.primaryType, ...(p.types ?? [])].filter(Boolean) as string[];
        return types.some((t) => LODGING_GOOGLE_TYPES.has(t));
      })
      .sort((a, b) => {
        const ar = Number(a.rating ?? 0) * Math.log10(Number(a.userRatingCount ?? 0) + 2);
        const br = Number(b.rating ?? 0) * Math.log10(Number(b.userRatingCount ?? 0) + 2);
        return br - ar;
      })
      .slice(0, limit)
      .map((p) => ({
        id: String(p.id || p.displayName?.text || randomUUID()),
        name: String(p.displayName?.text || "").trim(),
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? null,
        address: p.formattedAddress ?? null,
        photoUrl: buildNewApiPhotoMediaUrls(p.photos, apiKey, 1, 640)[0] ?? null,
        affiliateUrl: affiliateUrl || p.googleMapsUri || null,
      }))
      .filter((row) => row.name.length > 1);
  } catch {
    return [];
  }
}

/** GET /map/weather-at?lat=&lng= — koordinat bazlı anlık hava (Open-Meteo). */
router.get("/map/weather-at", async (req, res): Promise<void> => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ success: false, error: "lat ve lng zorunlu" });
      return;
    }
    const weather = await fetchOpenMeteoWeatherAt(lat, lng);
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json({ success: true, data: weather });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /map/location-info?lat=&lng=&title= — konum kartı zengin içerik (hava, wiki, oteller). */
router.get("/map/location-info", async (req, res): Promise<void> => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const title = String(req.query.title ?? req.query.q ?? req.query.location ?? "").trim();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ success: false, error: "lat ve lng zorunlu" });
      return;
    }

    const wikiQuery = title || resolveTurkishProvinceWikiTitle(title) || "";
    const LOCATION_INFO_EXTERNAL_TIMEOUT_MS = 6000;
    const withLocationInfoTimeout = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => {
          setTimeout(() => resolve(fallback), LOCATION_INFO_EXTERNAL_TIMEOUT_MS);
        }),
      ]);

    const [weather, wiki, hotellookRows, googleLodging] = await Promise.all([
      withLocationInfoTimeout(fetchOpenMeteoWeatherAt(lat, lng), null),
      wikiQuery
        ? withLocationInfoTimeout(fetchWikiSummaryForLocation(wikiQuery), null)
        : Promise.resolve(null),
      title
        ? withLocationInfoTimeout(
            fetchHotellookPrices({ location: title.split(",")[0]?.trim() || title, currency: "try", limit: 6 }),
            [],
          )
        : Promise.resolve([]),
      title
        ? withLocationInfoTimeout(
            searchLodgingPlacesNear({ lat, lng, query: title.split(",")[0]?.trim() || title, limit: 6 }),
            [],
          )
        : Promise.resolve([]),
    ]);

    const cfg = await getTravelpayoutsConfig();
    const hotelAffiliateUrl = buildAffiliateUrl("hotel", cfg.marker, {
      location: title.split(",")[0]?.trim() || title,
    });

    type LocationHotelRow = {
      id: string;
      name: string;
      rating: number | null;
      reviewCount: number | null;
      priceFrom: number | null;
      currency: string | null;
      stars: number | null;
      photoUrl: string | null;
      address: string | null;
      source: "hotellook" | "google_places";
      affiliateUrl: string | null;
    };

    const hotellookHotels: LocationHotelRow[] = hotellookRows.map((row, idx) => ({
      id: `hotellook-${idx}-${row.hotelName}`,
      name: row.hotelName,
      rating: null,
      reviewCount: null,
      priceFrom: row.priceFrom ?? row.priceAvg ?? null,
      currency: row.currency || "TRY",
      stars: row.stars,
      photoUrl: null,
      address: row.location || null,
      source: "hotellook" as const,
      affiliateUrl: hotelAffiliateUrl,
    })).filter((row) => row.name.length > 1);

    const seenHotelNames = new Set(hotellookHotels.map((h) => h.name.toLocaleLowerCase("tr-TR")));
    const googleHotels: LocationHotelRow[] = googleLodging
      .filter((row) => !seenHotelNames.has(row.name.toLocaleLowerCase("tr-TR")))
      .map((row) => ({
        id: row.id,
        name: row.name,
        rating: row.rating,
        reviewCount: row.reviewCount,
        priceFrom: null,
        currency: null,
        stars: null,
        photoUrl: row.photoUrl,
        address: row.address,
        source: "google_places" as const,
        affiliateUrl: row.affiliateUrl,
      }));

    const hotels = [...hotellookHotels, ...googleHotels].slice(0, 8);
    let imageUrls = Array.from(new Set([...(wiki?.photos ?? [])]));
    let imageUrl = imageUrls[0] ?? null;

    const cityLabel = title.split(",")[0]?.trim() || "";
    if (cityLabel) {
      const [cityRow] = await db
        .select({ id: mapCitiesTable.id, imageUrl: mapCitiesTable.imageUrl })
        .from(mapCitiesTable)
        .where(ilike(mapCitiesTable.name, cityLabel))
        .limit(1);
      if (isLocalCachedMediaUrl(cityRow?.imageUrl)) {
        imageUrl = String(cityRow?.imageUrl);
        imageUrls = [imageUrl, ...imageUrls.filter((u) => u !== imageUrl)];
      } else if (imageUrl && !isLocalCachedMediaUrl(imageUrl)) {
        const cached = await cacheExternalImageToMedia(imageUrl);
        if (cached) {
          imageUrl = cached;
          imageUrls = [cached, ...imageUrls.slice(1)];
          if (cityRow?.id) {
            await db
              .update(mapCitiesTable)
              .set({ imageUrl: cached, updatedAt: new Date() })
              .where(eq(mapCitiesTable.id, cityRow.id))
              .catch(() => {});
          }
        }
      }
    } else if (imageUrl && !isLocalCachedMediaUrl(imageUrl)) {
      const cached = await cacheExternalImageToMedia(imageUrl);
      if (cached) {
        imageUrl = cached;
        imageUrls = [cached, ...imageUrls.slice(1)];
      }
    }

    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=900");
    res.json({
      success: true,
      data: {
        weather,
        wiki,
        imageUrls,
        imageUrl: imageUrl ?? null,
        hotels,
        hotelAffiliateUrl,
        hotelsConfigured: cfg.configured,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — CATEGORIES ─────────────────────────────────────────────────── */

router.get("/map/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(mapCategoriesTable)
    .where(eq(mapCategoriesTable.isActive, true))
    .orderBy(asc(mapCategoriesTable.sortOrder), asc(mapCategoriesTable.name));
  res.json({ success: true, data: rows });
});

router.post("/map/categories", async (req, res): Promise<void> => {
  const { name, slug, googlePlaceType, icon, imageUrl, sortOrder } = req.body;
  if (!name || !slug) { res.status(400).json({ success: false, error: "name ve slug gerekli" }); return; }
  const [row] = await db.insert(mapCategoriesTable).values({
    name, slug, googlePlaceType, icon, imageUrl, sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.put("/map/categories/:id", async (req, res): Promise<void> => {
  const { name, slug, googlePlaceType, icon, imageUrl, sortOrder, isActive } = req.body;
  const [row] = await db.update(mapCategoriesTable)
    .set({ name, slug, googlePlaceType, icon, imageUrl, sortOrder, isActive, updatedAt: new Date() })
    .where(eq(mapCategoriesTable.id, req.params.id))
    .returning();
  if (!row) { res.status(404).json({ success: false, error: "Kategori bulunamadı" }); return; }
  res.json({ success: true, data: row });
});

router.delete("/map/categories/:id", async (req, res): Promise<void> => {
  await db.delete(mapCategoriesTable).where(eq(mapCategoriesTable.id, req.params.id));
  res.json({ success: true, message: "Kategori silindi" });
});

/* — KEŞFET DISCOVER CATEGORIES (Popüler Aramalar) ─────────────── */

router.get("/map/discover-categories", async (_req, res): Promise<void> => {
  try {
    await seedKesfetDiscoverCategoriesIfNeeded();
    const data = await fetchKesfetDiscoverGroupsPayload(true);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/discover-categories/all", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    await seedKesfetDiscoverCategoriesIfNeeded();
    const data = await fetchKesfetDiscoverGroupsPayload(false);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/admin/scraper-categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { groups, total } = await fetchMapScraperCategoryCatalog();
    res.json({ success: true, data: groups, total });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/map/discover-subcategories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const { groupId, name, slug, googlePlaceType, googleKeyword, sortOrder, isActive } = req.body ?? {};
  if (!groupId || !name) {
    res.status(400).json({ success: false, error: "groupId ve name gerekli" });
    return;
  }
  const safeSlug =
    typeof slug === "string" && slug.trim()
      ? slug.trim()
      : String(name)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ı/g, "i")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
  try {
    const [row] = await db
      .insert(kesfetDiscoverSubcategoriesTable)
      .values({
        groupId,
        name: String(name).trim(),
        slug: safeSlug,
        googlePlaceType: googlePlaceType ?? null,
        googleKeyword: googleKeyword ?? String(name).trim(),
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      })
      .returning();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.put("/map/discover-subcategories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const { name, slug, googlePlaceType, googleKeyword, sortOrder, isActive, groupId } = req.body ?? {};
  try {
    const [row] = await db
      .update(kesfetDiscoverSubcategoriesTable)
      .set({
        ...(name != null ? { name: String(name).trim() } : {}),
        ...(slug != null ? { slug: String(slug).trim() } : {}),
        ...(googlePlaceType !== undefined ? { googlePlaceType } : {}),
        ...(googleKeyword !== undefined ? { googleKeyword } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(kesfetDiscoverSubcategoriesTable.id, req.params.id))
      .returning();
    if (!row) {
      res.status(404).json({ success: false, error: "Alt kategori bulunamadı" });
      return;
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.delete("/map/discover-subcategories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  await db.delete(kesfetDiscoverSubcategoriesTable).where(eq(kesfetDiscoverSubcategoriesTable.id, req.params.id));
  res.json({ success: true, message: "Keşfet alt kategorisi silindi" });
});

/* — CITIES & DISTRICTS ─────────────────────────────────────────── */

router.get("/map/cities", async (_req, res): Promise<void> => {
  const rows = await db.select().from(mapCitiesTable)
    .where(eq(mapCitiesTable.isActive, true))
    .orderBy(asc(mapCitiesTable.sortOrder), asc(mapCitiesTable.name));
  res.json({ success: true, data: rows });
});

router.post("/map/cities", async (req, res): Promise<void> => {
  const { name, code, sortOrder } = req.body;
  if (!name) { res.status(400).json({ success: false, error: "name gerekli" }); return; }
  const [row] = await db.insert(mapCitiesTable).values({ name, code, sortOrder: sortOrder ?? 0 }).returning();
  res.status(201).json({ success: true, data: row });
});

router.get("/map/cities/:id/districts", async (req, res): Promise<void> => {
  const cityId = req.params.id;
  const mapRows = await db.select().from(mapDistrictsTable)
    .where(and(eq(mapDistrictsTable.cityId, cityId), eq(mapDistrictsTable.isActive, true)))
    .orderBy(asc(mapDistrictsTable.sortOrder), asc(mapDistrictsTable.name));

  const cityRows = await db
    .select({ name: mapCitiesTable.name })
    .from(mapCitiesTable)
    .where(eq(mapCitiesTable.id, cityId))
    .limit(1);
  const cityName = String(cityRows[0]?.name ?? "").trim();
  if (!cityName) {
    res.json({ success: true, data: mapRows });
    return;
  }

  const ilKey = (s: string) =>
    s.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "");
  const ilRows = await db.select().from(trIlTable);
  const il = ilRows.find((row) => ilKey(row.adi) === ilKey(cityName));
  if (!il?.plaka) {
    res.json({ success: true, data: mapRows });
    return;
  }

  const ilceRows = await db
    .select({ adi: trIlceTable.adi })
    .from(trIlceTable)
    .where(eq(trIlceTable.ilPlaka, il.plaka))
    .orderBy(asc(trIlceTable.adi));

  let trNames = ilceRows
    .map((row) => String(row.adi ?? "").trim())
    .filter(Boolean);

  if (trNames.length === 0) {
    type TurkiyeProvinceRespSingle = {
      status?: string;
      data?: { districts?: Array<{ id: number; name: string }> };
    };
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);
    try {
      const remote = await fetch(
        `https://api.turkiyeapi.dev/v1/provinces/${encodeURIComponent(String(il.plaka))}`,
        { signal: ac.signal },
      );
      if (remote.ok) {
        const body = (await remote.json()) as TurkiyeProvinceRespSingle;
        const districts = Array.isArray(body?.data?.districts) ? body.data!.districts! : [];
        trNames = districts.map((d) => String(d.name ?? "").trim()).filter(Boolean);
      }
    } catch {
      /* ignore */
    } finally {
      clearTimeout(t);
    }
  }

  if (trNames.length === 0) {
    res.json({ success: true, data: mapRows });
    return;
  }

  const merged = new Map<string, string>();
  for (const name of trNames) {
    merged.set(ilKey(name), name);
  }
  for (const row of mapRows) {
    const name = String(row.name ?? "").trim();
    if (name) merged.set(ilKey(name), name);
  }

  const data = Array.from(merged.values())
    .sort((a, b) => a.localeCompare(b, "tr"))
    .map((name, index) => {
      const existing = mapRows.find((row) => ilKey(row.name) === ilKey(name));
      return existing ?? {
        id: `tr-ilce:${il.plaka}:${ilKey(name)}`,
        name,
        cityId,
        isActive: true,
        sortOrder: index,
      };
    });

  res.json({ success: true, data });
});

router.post("/map/cities/:id/districts", async (req, res): Promise<void> => {
  const { name, sortOrder } = req.body;
  if (!name) { res.status(400).json({ success: false, error: "name gerekli" }); return; }
  const [row] = await db.insert(mapDistrictsTable).values({
    name, cityId: req.params.id, sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.get("/map/districts/:id/neighborhoods", async (req, res): Promise<void> => {
  const rows = await db.select().from(mapNeighborhoodsTable)
    .where(and(eq(mapNeighborhoodsTable.districtId, req.params.id), eq(mapNeighborhoodsTable.isActive, true)))
    .orderBy(asc(mapNeighborhoodsTable.sortOrder), asc(mapNeighborhoodsTable.name));
  res.json({ success: true, data: rows });
});

/* — HOMEPAGE FEATURED BUSINESSES ─────────────────────────────── */

router.get("/map/homepage-businesses", async (req, res): Promise<void> => {
  try {
    const superCat = typeof req.query.superCategory === "string" ? req.query.superCategory : null;
    const superCatWhere = homepageSuperCategoryWhere(superCat);
    const featuredUntilOk = or(
      isNull(mapBusinessesTable.homepageFeaturedUntil),
      gt(mapBusinessesTable.homepageFeaturedUntil, new Date()),
    );
    // First try explicitly featured businesses (süresi dolmamış veya süre alanı boş)
    const featuredWhere = superCat
      ? and(eq(mapBusinessesTable.homepageFeatured, true), eq(mapBusinessesTable.isPremium, true), eq(mapBusinessesTable.isActive, true), MAP_BUSINESS_HAS_ACTIVE_VENDOR, MAP_BUSINESS_PUBLIC_NOT_DEMO, superCatWhere, featuredUntilOk)
      : and(eq(mapBusinessesTable.homepageFeatured, true), eq(mapBusinessesTable.isPremium, true), eq(mapBusinessesTable.isActive, true), MAP_BUSINESS_HAS_ACTIVE_VENDOR, MAP_BUSINESS_PUBLIC_NOT_DEMO, featuredUntilOk);
    let rows = await db.select({
      business: mapBusinessesTable,
      category: mapCategoriesTable,
    }).from(mapBusinessesTable)
      .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
      .where(featuredWhere)
      .orderBy(asc(mapBusinessesTable.sortOrder), asc(mapBusinessesTable.name));

    // Fallback 1: premium businesses. Super-category pages should not go empty
    // just because no manual homepage-featured placement exists yet.
    if (rows.length === 0) {
      rows = await db.select({
        business: mapBusinessesTable,
        category: mapCategoriesTable,
      }).from(mapBusinessesTable)
        .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
        .where(and(
          eq(mapBusinessesTable.isPremium, true),
          eq(mapBusinessesTable.isActive, true),
          MAP_BUSINESS_HAS_ACTIVE_VENDOR,
          MAP_BUSINESS_PUBLIC_NOT_DEMO,
          ...(superCatWhere ? [superCatWhere] : []),
        ))
        .orderBy(...mapBusinessPublicRankingOrder(true))
        .limit(40);
    }
    // Fallback 2: any active linked business in the requested vertical.
    if (rows.length === 0) {
      rows = await db.select({
        business: mapBusinessesTable,
        category: mapCategoriesTable,
      }).from(mapBusinessesTable)
        .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
        .where(and(
          eq(mapBusinessesTable.isActive, true),
          MAP_BUSINESS_HAS_ACTIVE_VENDOR,
          MAP_BUSINESS_PUBLIC_NOT_DEMO,
          ...(superCatWhere ? [superCatWhere] : []),
        ))
        .orderBy(...mapBusinessPublicRankingOrder(true))
        .limit(40);
    }
    // Fallback 3: plain active businesses. This keeps homepage verticals populated
    // even before every Discover business has a linked vendor storefront.
    if (rows.length === 0) {
      rows = await db.select({
        business: mapBusinessesTable,
        category: mapCategoriesTable,
      }).from(mapBusinessesTable)
        .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
        .where(and(
          eq(mapBusinessesTable.isActive, true),
          MAP_BUSINESS_PUBLIC_NOT_DEMO,
          ...(superCatWhere ? [superCatWhere] : []),
        ))
        .orderBy(...mapBusinessPublicRankingOrder(true))
        .limit(40);
    }

    const data = await attachHomepageStorefrontLinks(await attachMapBusinessListImages(rows.map(r => ({
      ...r.business,
      categoryName: r.category?.name ?? null,
      categoryIcon: r.category?.icon ?? null,
    }))));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/homepage-featured-offers", async (req, res): Promise<void> => {
  try {
    const superCat = typeof req.query.superCategory === "string" ? req.query.superCategory : "";
    const limit = Math.min(30, Math.max(6, Number(req.query.limit ?? 12) || 12));
    const now = new Date();

    const products = await db
      .select({
        product: mapProductsTable,
        businessName: mapBusinessesTable.name,
        businessSlug: mapBusinessesTable.slug,
        businessSuper: mapBusinessesTable.homepageSuperCategory,
      })
      .from(mapProductsTable)
      .innerJoin(mapBusinessesTable, eq(mapProductsTable.businessId, mapBusinessesTable.id))
      .where(and(
        eq(mapProductsTable.homeFeatured, true),
        eq(mapProductsTable.isAvailable, true),
        eq(mapBusinessesTable.isActive, true),
        or(isNull(mapProductsTable.homeFeaturedUntil), gt(mapProductsTable.homeFeaturedUntil, now)),
      ))
      .orderBy(desc(mapProductsTable.updatedAt))
      .limit(limit);

    const campaigns = await db
      .select({
        campaign: mapCampaignsTable,
        businessName: mapBusinessesTable.name,
        businessSlug: mapBusinessesTable.slug,
        businessSuper: mapBusinessesTable.homepageSuperCategory,
      })
      .from(mapCampaignsTable)
      .innerJoin(mapBusinessesTable, eq(mapCampaignsTable.businessId, mapBusinessesTable.id))
      .where(and(
        eq(mapCampaignsTable.homeFeatured, true),
        eq(mapCampaignsTable.isActive, true),
        eq(mapBusinessesTable.isActive, true),
        or(isNull(mapCampaignsTable.homeFeaturedUntil), gt(mapCampaignsTable.homeFeaturedUntil, now)),
      ))
      .orderBy(desc(mapCampaignsTable.updatedAt))
      .limit(limit);

    const filterBySuper = <T extends { businessSuper: string | null }>(rows: T[]) =>
      superCat ? rows.filter((r) => (r.businessSuper ?? "") === superCat) : rows;

    res.json({
      success: true,
      data: {
        products: filterBySuper(products).map((r) => ({
          ...r.product,
          businessName: r.businessName,
          businessSlug: r.businessSlug,
        })),
        campaigns: filterBySuper(campaigns).map((r) => ({
          ...r.campaign,
          businessName: r.businessName,
          businessSlug: r.businessSlug,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.patch("/map/businesses/:id/homepage-featured", async (req, res): Promise<void> => {
  try {
    const { featured, superCategory } = req.body as { featured: boolean; superCategory?: string };
    if (featured) {
      const [row] = await db
        .select({ isPremium: mapBusinessesTable.isPremium })
        .from(mapBusinessesTable)
        .where(eq(mapBusinessesTable.id, req.params.id))
        .limit(1);
      if (!row) { res.status(404).json({ success: false, error: "Not found" }); return; }
      if (!row.isPremium) {
        res.status(400).json({ success: false, error: "Öne çıkan yalnızca premium işletmeler için açılabilir." });
        return;
      }
    }
    const [updated] = await db.update(mapBusinessesTable)
      .set({
        homepageFeatured: featured,
        ...(superCategory !== undefined ? { homepageSuperCategory: superCategory } : {}),
        updatedAt: new Date(),
      })
      .where(eq(mapBusinessesTable.id, req.params.id))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — BUSINESSES ─────────────────────────────────────────────────── */

function normalizeMapCityKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function canonicalMapCityLabel(cityParam: string, citySlug?: string): string | null {
  for (const part of [cityParam, citySlug ?? ""]) {
    const raw = String(part ?? "").trim();
    if (!raw) continue;
    const canonical = resolveTurkishProvinceWikiTitle(raw);
    if (canonical) return canonical;
  }
  return null;
}

function mapCityScopeCandidates(cityParam: string, citySlug?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const pushCandidate = (candidate: string) => {
    const label = String(candidate ?? "").trim();
    if (!label) return;
    const key = normalizeMapCityKey(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  };
  for (const part of [cityParam, citySlug ?? ""]) {
    const raw = String(part ?? "").trim();
    if (!raw) continue;
    const canonical = resolveTurkishProvinceWikiTitle(raw);
    pushCandidate(raw);
    if (canonical) pushCandidate(canonical);
    const slugLike = raw.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-");
    if (slugLike !== raw) {
      const fromSlug = resolveTurkishProvinceWikiTitle(slugLike.replace(/-/g, " "));
      if (fromSlug) pushCandidate(fromSlug);
    }
  }
  return out;
}

function mapBusinessTextSearchCondition(qRaw: string, opts?: { geoScoped?: boolean }) {
  const q = qRaw.trim();
  if (!q) return null;
  const pattern = `%${q}%`;
  const core = [
    ilike(mapBusinessesTable.name, pattern),
    ilike(mapBusinessesTable.description, pattern),
    ilike(mapCategoriesTable.name, pattern),
    ilike(mapCategoriesTable.slug, pattern),
    ilike(mapBusinessesTable.storeType, pattern),
    ilike(mapBusinessesTable.homepageSuperCategory, pattern),
    ilike(mapBusinessesTable.importSource, pattern),
    sql`EXISTS (
      SELECT 1 FROM unnest(COALESCE(${mapBusinessesTable.tags}, ARRAY[]::text[])) AS tag
      WHERE tag ILIKE ${pattern}
    )`,
  ];
  if (opts?.geoScoped) return or(...core);
  return or(
    ...core,
    ilike(mapBusinessesTable.address, pattern),
    ilike(mapCitiesTable.name, pattern),
    ilike(mapDistrictsTable.name, pattern),
  );
}

/**
 * Var olan bir şehri (id/ad/normalize edilmiş ad ile) çözer. ASLA yeni şehir
 * OLUŞTURMAZ — listeleme/filtreleme için kullanılır. Bilinmeyen şehirde null döner
 * ki çağıran taraf "global dökme" yerine boş sonuç/koordinat kutusuna düşebilsin.
 */
async function resolveExistingMapCityId(cityParam: string, citySlug?: string): Promise<string | null> {
  const candidates = mapCityScopeCandidates(cityParam, citySlug);
  if (!candidates.length) return null;

  for (const label of candidates) {
    const rows = await db
      .select({ id: mapCitiesTable.id, name: mapCitiesTable.name })
      .from(mapCitiesTable)
      .where(or(eq(mapCitiesTable.id, label), ilike(mapCitiesTable.name, label)))
      .limit(1);
    if (rows[0]?.id) return rows[0].id;
  }

  const allCities = await db
    .select({ id: mapCitiesTable.id, name: mapCitiesTable.name })
    .from(mapCitiesTable)
    .where(eq(mapCitiesTable.isActive, true));
  for (const label of candidates) {
    const key = normalizeMapCityKey(label);
    const normalizedHit = allCities.find((row) => normalizeMapCityKey(row.name) === key);
    if (normalizedHit?.id) return normalizedHit.id;
    const slugHit = allCities.find((row) => normalizeMapCityKey(row.name).replace(/\s+/g, "") === key.replace(/-/g, ""));
    if (slugHit?.id) return slugHit.id;
  }
  return null;
}

/** Şehir filtresi: yalnızca cityId veya map_cities.name (il); adres metnindeki sokak adı eşleşmesi kullanılmaz. */
function buildMapCityScopeCondition(
  resolvedCityId: string | null,
  canonicalCity: string | null,
  geoBox: SQL | null,
  opts?: { strictCityScope?: boolean },
): SQL {
  const strictCityScope = opts?.strictCityScope ?? false;
  if (resolvedCityId) {
    if (geoBox && !strictCityScope) {
      return or(
        eq(mapBusinessesTable.cityId, resolvedCityId),
        and(geoBox, isNull(mapBusinessesTable.cityId)),
      )!;
    }
    return eq(mapBusinessesTable.cityId, resolvedCityId);
  }
  if (canonicalCity) {
    const cityNameScope = ilike(mapCitiesTable.name, canonicalCity);
    if (geoBox && !strictCityScope) {
      return or(
        cityNameScope,
        and(geoBox, isNull(mapBusinessesTable.cityId)),
      )!;
    }
    return cityNameScope;
  }
  return sql`FALSE`;
}

function parseTrAddressLocationParts(address: string | null | undefined): { city: string; district: string } {
  const raw = String(address ?? "").trim();
  if (!raw) return { city: "", district: "" };
  const slashMatch = raw.match(/([^/\n]+)\/([^/\n,]+)/);
  if (!slashMatch) return { city: "", district: "" };
  const left = slashMatch[1].replace(/^\d+\s*/, "").trim();
  const right = slashMatch[2].replace(/,\s*Türkiye.*$/i, "").trim();
  return { district: left, city: right };
}

function enrichMapBusinessLocationFields<
  T extends {
    address?: string | null;
    city?: { id?: string | null; name?: string | null; nameTr?: string | null } | null;
    district?: { id?: string | null; name?: string | null } | null;
    googlePlacesExtras?: unknown;
  },
>(row: T): T {
  const extras = row.googlePlacesExtras && typeof row.googlePlacesExtras === "object"
    ? row.googlePlacesExtras as Record<string, unknown>
    : null;
  const wf = extras?.importWorkflow && typeof extras.importWorkflow === "object"
    ? extras.importWorkflow as Record<string, unknown>
    : null;
  const actual = wf?.actualLocation && typeof wf.actualLocation === "object"
    ? wf.actualLocation as { province?: string; district?: string }
    : null;
  const parsed = parseTrAddressLocationParts(row.address);
  const cityName = String(row.city?.nameTr || row.city?.name || "").trim()
    || String(actual?.province ?? "").trim()
    || parsed.city;
  const districtName = String(row.district?.name || "").trim()
    || String(actual?.district ?? "").trim()
    || parsed.district;
  const nextCity = cityName
    ? { ...(row.city ?? {}), id: row.city?.id ?? null, name: cityName, nameTr: row.city?.nameTr ?? cityName }
    : row.city ?? null;
  const nextDistrict = districtName
    ? { ...(row.district ?? {}), id: row.district?.id ?? null, name: districtName }
    : row.district ?? null;
  return { ...row, city: nextCity, district: nextDistrict };
}

/** Google `types` / `primaryType` alanları — importWorkflow.allowlist gibi meta JSON'a bakmaz. */
function mapBusinessGooglePlaceTypeCondition(placeType: string): SQL {
  const pt = placeType.toLocaleLowerCase("tr-TR");
  return or(
    sql`EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(COALESCE(${mapBusinessesTable.googlePlacesExtras}::jsonb->'types', '[]'::jsonb)) = 'array'
          THEN COALESCE(${mapBusinessesTable.googlePlacesExtras}::jsonb->'types', '[]'::jsonb)
          ELSE '[]'::jsonb
        END
      ) AS t(val)
      WHERE lower(t.val) = ${pt}
    )`,
    sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::jsonb->>'primaryType', '')) = ${pt}`,
  )!;
}

function mapBusinessTagEqualsCondition(tagSlug: string): SQL {
  const tag = tagSlug.toLocaleLowerCase("tr-TR");
  return sql`EXISTS (
    SELECT 1 FROM unnest(COALESCE(${mapBusinessesTable.tags}, ARRAY[]::text[])) AS tag_row(val)
    WHERE lower(tag_row.val) = ${tag}
  )`;
}

/** Kazıma kategorisi: yalnızca etiket veya importWorkflow.categorySlug — allowlist'e bakmaz. */
function mapBusinessImportCategorySlugCondition(slug: string): SQL {
  const s = slug.toLocaleLowerCase("tr-TR");
  return or(
    mapBusinessTagEqualsCondition(s),
    sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::jsonb->'importWorkflow'->>'categorySlug', '')) = ${s}`,
    sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::jsonb->>'slug', '')) = ${s}`,
  )!;
}

const MAP_LODGING_STORE_TYPES = ["turizm"] as const;
const MAP_LODGING_TAG_SLUGS = [
  "otel", "pansiyon", "lodging", "hotel", "motel", "hostel", "konaklama",
  "turizm-konaklama-seyahat", "butik-otel", "apart-otel",
] as const;
const MAP_LODGING_NAME_PATTERNS = [
  "%otel%", "%pansiyon%", "% apart %", "%motel%", "%hostel%", "%konaklama%",
] as const;
const MAP_LODGING_SUPER_CATEGORIES = ["turizm", "seyahat"] as const;

/** Kamu alt türleri — eczane filtresinde PTT/hastane vb. eşleşmesin. */
const MAP_KAMU_NON_ECZANE_STORE_TYPES = [
  "kamu_saglik", "kamu_devlet", "kamu_ibadethane", "kamu_noter", "kamu_park",
  "kamu_okul", "kamu_universite", "kamu_kutuphane", "kamu_muze", "kamu_postane",
  "kamu_emniyet", "kamu_itfaiye", "kamu_ulasim",
] as const;
const MAP_KAMU_NON_ECZANE_SCRAPER_SLUGS = [
  "kamu-hastane-saglik", "kamu-devlet-kurumlari", "kamu-ibadethane", "kamu-noter",
  "kamu-park-yesil-alan", "kamu-okul", "kamu-universite", "kamu-kutuphane", "kamu-muze",
  "kamu-postane", "kamu-emniyet", "kamu-itfaiye", "kamu-ulasim-durak",
] as const;
const MAP_PTT_NAME_PATTERNS = ["%ptt%", "%postane%", "%post office%"] as const;

const MAP_LODGING_NEGATIVE_CATEGORIES = new Set([
  "benzin-istasyonu",
  "restoranlar",
  "kafeler",
  "marketler",
  "elektronik",
  "moda-giyim",
  "alisveris-merkezleri",
  "hizmetler",
  "eglence",
]);

const MAP_ECZANE_NEGATIVE_CATEGORIES = new Set(["eczaneler"]);

function buildMapLodgingNegativeCondition(): SQL | null {
  const parts: SQL[] = [];
  for (const st of MAP_LODGING_STORE_TYPES) {
    parts.push(eq(mapBusinessesTable.storeType, st));
  }
  for (const gpt of LODGING_GOOGLE_TYPES) {
    parts.push(mapBusinessGooglePlaceTypeCondition(gpt));
  }
  for (const tag of MAP_LODGING_TAG_SLUGS) {
    parts.push(mapBusinessTagEqualsCondition(tag));
  }
  for (const pattern of MAP_LODGING_NAME_PATTERNS) {
    parts.push(ilike(mapBusinessesTable.name, pattern));
  }
  for (const sc of MAP_LODGING_SUPER_CATEGORIES) {
    parts.push(eq(mapBusinessesTable.homepageSuperCategory, sc));
  }
  return parts.length ? or(...parts)! : null;
}

function buildMapEczaneNegativeCondition(): SQL | null {
  const parts: SQL[] = [];
  for (const st of MAP_KAMU_NON_ECZANE_STORE_TYPES) {
    parts.push(eq(mapBusinessesTable.storeType, st));
  }
  for (const slug of MAP_KAMU_NON_ECZANE_SCRAPER_SLUGS) {
    parts.push(mapBusinessImportCategorySlugCondition(slug));
  }
  parts.push(mapBusinessGooglePlaceTypeCondition("post_office"));
  for (const pattern of MAP_PTT_NAME_PATTERNS) {
    parts.push(ilike(mapBusinessesTable.name, pattern));
  }
  return parts.length ? or(...parts)! : null;
}

function buildMapCategoryNegativeCondition(slugKey: string): SQL | null {
  const parts: SQL[] = [];
  if (MAP_LODGING_NEGATIVE_CATEGORIES.has(slugKey)) {
    const lodging = buildMapLodgingNegativeCondition();
    if (lodging) parts.push(lodging);
  }
  if (MAP_ECZANE_NEGATIVE_CATEGORIES.has(slugKey)) {
    const eczane = buildMapEczaneNegativeCondition();
    if (eczane) parts.push(eczane);
  }
  return parts.length ? or(...parts)! : null;
}

function buildMapCategoryScopeCondition(cat: { id: string; slug: string; name: string }): SQL {
  const slugKey = cat.slug.toLocaleLowerCase("tr-TR");
  const aliases = MAP_CATEGORY_SCRAPER_ALIASES[slugKey] ?? { scraperSlugs: [], storeTypes: [], googlePlaceTypes: [] };
  const slugSet = Array.from(new Set([slugKey, ...aliases.scraperSlugs]));
  const parts: SQL[] = [];
  if (!cat.id.startsWith("alias:")) {
    parts.push(eq(mapBusinessesTable.categoryId, cat.id));
    parts.push(ilike(mapCategoriesTable.slug, cat.slug));
    parts.push(ilike(mapCategoriesTable.name, cat.name));
  }
  for (const s of slugSet) {
    parts.push(mapBusinessImportCategorySlugCondition(s));
  }
  for (const st of aliases.storeTypes) {
    parts.push(eq(mapBusinessesTable.storeType, st));
  }
  for (const gpt of aliases.googlePlaceTypes) {
    parts.push(mapBusinessGooglePlaceTypeCondition(gpt));
  }
  for (const sc of aliases.superCategories ?? []) {
    parts.push(eq(mapBusinessesTable.homepageSuperCategory, sc));
  }
  const positive = or(...parts)!;
  const negative = buildMapCategoryNegativeCondition(slugKey);
  return negative ? and(positive, sql`NOT (${negative})`)! : positive;
}

const INSAATFIRMALARIM_CATEGORY_SLUGS = new Set(
  INSAATFIRMALARIM_CATEGORIES.map((c) => c.slug.toLocaleLowerCase("tr-TR")),
);

async function resolveMapCategoryFilterCondition(categoryParam: string): Promise<SQL | null> {
  const raw = String(categoryParam ?? "").trim();
  if (!raw || raw === "all") return null;
  const slug = raw.toLocaleLowerCase("tr-TR");
  if (slug === "insaat-firmalari") {
    return eq(mapBusinessesTable.importSource, "insaatfirmalarim");
  }
  if (INSAATFIRMALARIM_CATEGORY_SLUGS.has(slug)) {
    return and(
      eq(mapBusinessesTable.importSource, "insaatfirmalarim"),
      mapBusinessImportCategorySlugCondition(slug),
    )!;
  }
  const catRows = await db.select().from(mapCategoriesTable)
    .where(or(
      eq(mapCategoriesTable.id, raw),
      eq(mapCategoriesTable.slug, raw),
      ilike(mapCategoriesTable.slug, raw),
      ilike(mapCategoriesTable.name, raw),
    ))
    .limit(1);
  const cat = catRows[0];
  if (cat) return buildMapCategoryScopeCondition(cat);
  const aliases = MAP_CATEGORY_SCRAPER_ALIASES[slug];
  if (aliases) {
    return buildMapCategoryScopeCondition({ id: `alias:${slug}`, slug, name: slug });
  }
  const fallbackParts: SQL[] = [
    mapBusinessImportCategorySlugCondition(slug),
    eq(mapBusinessesTable.homepageSuperCategory, slug),
    ilike(mapBusinessesTable.name, `%${raw}%`),
  ];
  const fallbackPositive = or(...fallbackParts)!;
  const fallbackNegative = buildMapCategoryNegativeCondition(slug);
  return fallbackNegative ? and(fallbackPositive, sql`NOT (${fallbackNegative})`)! : fallbackPositive;
}

async function buildMapDistrictScopeCondition(districtParam: string, cityId?: string | null): Promise<SQL> {
  const raw = districtParam.trim();
  const districtId = await resolveMapDistrictId(raw, cityId);
  if (districtId) return eq(mapBusinessesTable.districtId, districtId);
  const pattern = `%${raw}%`;
  return or(
    ilike(mapBusinessesTable.address, pattern),
    ilike(mapDistrictsTable.name, pattern),
    sql`lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::text, '')) LIKE ${`%"district":"${raw.toLocaleLowerCase("tr-TR")}"%`}`,
  )!;
}

/** İçe aktarım yolunda kullanılır: var olan şehri çözer, yoksa oluşturur. */
async function resolveMapCityId(cityParam: string): Promise<string | null> {
  const raw = cityParam.trim();
  if (!raw) return null;
  const existing = await resolveExistingMapCityId(raw);
  if (existing) return existing;

  if (raw.length >= 2 && raw.length <= 48) {
    const [created] = await db
      .insert(mapCitiesTable)
      .values({ name: raw, sortOrder: 0, isActive: true })
      .returning({ id: mapCitiesTable.id });
    return created?.id ?? null;
  }
  return null;
}

/**
 * Sarı Sayfalar / Keşfet alt kategori (ör. "Aile Hekimleri", "Dahiliye Doktorları")
 * anahtar-kelime filtresi. Seçilen alt kategoriye GERÇEKTEN göre filtreler; eşleşme
 * yoksa boş döner (alakasız işletmelerle doldurmaz).
 *
 * Eşleşme: ad/açıklama/kategori adında veya etiketlerde tam ifade geçiyorsa VEYA
 * anahtar kelimenin tüm anlamlı kökleri (Türkçe diakritik/küçük-büyük harf sadeleştirilmiş)
 * birleşik metinde geçiyorsa.
 */
function mapBusinessKeywordFilter(keywordRaw: string): SQL | null {
  const kw = keywordRaw.trim();
  if (!kw) return null;
  const phrase = `%${kw}%`;
  const norm = (s: string) => s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedKeyword = norm(kw);
  const words = Array.from(new Set(normalizedKeyword.split(" ").filter((t) => t.length >= 3)));
  // DB tarafında aynı normalize: Türkçe diakritikleri sadeleştir + küçük harf.
  const normalizedText = sql`lower(translate(
    coalesce(${mapBusinessesTable.name}, '') || ' ' ||
    coalesce(${mapBusinessesTable.description}, '') || ' ' ||
    coalesce(${mapCategoriesTable.name}, '') || ' ' ||
    coalesce(${mapCategoriesTable.slug}, '') || ' ' ||
    array_to_string(coalesce(${mapBusinessesTable.tags}, ARRAY[]::text[]), ' '),
    'ğĞüÜşŞıİöÖçÇâÂîÎûÛ',
    'gguussiiooccaaiiuu'
  ))`;
  const parts: SQL[] = [
    ilike(mapBusinessesTable.name, phrase),
    ilike(mapBusinessesTable.description, phrase),
    ilike(mapCategoriesTable.name, phrase),
    ilike(mapCategoriesTable.slug, phrase),
    sql`${normalizedText} LIKE ${"%" + normalizedKeyword + "%"}`,
  ];
  if (words.length > 1) {
    const wordConds = words.map((t) => sql`${normalizedText} LIKE ${"%" + t + "%"}`);
    const allWords = and(...wordConds);
    if (allWords) parts.push(allWords);
  }
  return or(...parts) ?? null;
}

async function resolveMapDistrictId(districtParam: string, cityId?: string | null): Promise<string | null> {
  const raw = districtParam.trim();
  if (!raw) return null;
  const districtConds = [or(eq(mapDistrictsTable.id, raw), ilike(mapDistrictsTable.name, raw))!];
  if (cityId) districtConds.push(eq(mapDistrictsTable.cityId, cityId));
  const rows = await db
    .select({ id: mapDistrictsTable.id })
    .from(mapDistrictsTable)
    .where(and(...districtConds))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Keşfet, harita, Sarı Sayfalar — yalnızca aktif kayıtlar (detay uç noktası ile tutarlı). */
function mapBusinessPublicListConditions(): SQL[] {
  return [eq(mapBusinessesTable.isActive, true)];
}

router.get("/map/businesses", optionalMapAuth, async (req, res): Promise<void> => {
  // KONUMA DUYARLI YANIT: asla paylaşılan/edge cache'e düşmesin. Aksi halde konumdan
  // bağımsız tek bir "default" cache tüm şehir/kategori/anahtar-kelime isteklerine aynı
  // (ör. Ankara) seti döndürebilir. Tüm filtreler query string'de olduğundan ve yanıt
  // kullanıcı oturumuna göre değişebildiğinden cache'i tamamen kapat.
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization, Cookie");
  try {
    const { lat, lng, radius, city, district, superCategory } = req.query as Record<string, string>;
    const q = String(req.query.q ?? req.query.search ?? "").trim();
    const category = String(req.query.category ?? req.query.categoryId ?? "").trim();
    /** `premiumOnly=1` → yalnızca premium (genel harita sayfası); gönderilmezse tüm aktif kayıtlar (Kesfet, panel) */
    const premiumOnly = String(req.query["premiumOnly"] ?? "") === "1";
    /** `featured=1` veya `homepageFeatured=1` → yalnızca ana sayfa öne çıkanları (homepageFeatured + premium, süresi dolmamış) */
    const featuredOnly = ["1", "true", "yes"].includes(
      String(req.query["featured"] ?? req.query["homepageFeatured"] ?? "").toLowerCase(),
    );
    /** `recentFirst=1` → konum kutusu yok; son eklenen işletmeler (Keşfet varsayılan açılış) */
    const recentFirst = String(req.query["recentFirst"] ?? "") === "1";
    const latF = Number(lat);
    const lngF = Number(lng);
    const hasCoordinateScope = Number.isFinite(latF) && Number.isFinite(lngF);

    let query = db.select({
      business: mapBusinessesTable,
      category: mapCategoriesTable,
      city: mapCitiesTable,
      district: mapDistrictsTable,
      // Özel `/kesfet/:slug` sayfası yalnız doğrulanmış (sahipli), premium veya aktif
      // vendor'lu işletmelere; salt kazınanlar haritaya yönlendirilir.
      hasPublicProfile: MAP_BUSINESS_HAS_PUBLIC_PROFILE,
    }).from(mapBusinessesTable)
      .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
      .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
      .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
      .$dynamic();

    /** Sarı Sayfalar / Keşfet alt kategori anahtar-kelime filtresi (ör. "Aile Hekimleri"). */
    const directoryKeywords = String(req.query["keywords"] ?? "").trim();
    const hasKeywordFilter = directoryKeywords.length > 0;

    const conditions: Array<SQL | undefined> = [...mapBusinessPublicListConditions()];
    if (premiumOnly) conditions.push(eq(mapBusinessesTable.isPremium, true));
    if (featuredOnly) {
      const featuredUntilOk = or(
        isNull(mapBusinessesTable.homepageFeaturedUntil),
        gt(mapBusinessesTable.homepageFeaturedUntil, new Date()),
      );
      conditions.push(eq(mapBusinessesTable.homepageFeatured, true));
      conditions.push(eq(mapBusinessesTable.isPremium, true));
      conditions.push(featuredUntilOk);
    }

    // Ana sayfa (/map/homepage-businesses) ile aynı gruplu eşleştirmeyi kullan:
    // mekan_dukkan/mekan çipinde eşanlamlılar (mekan, yiyecek, hizmet, siparis, NULL)
    // ve turizm çipinde (seyahat, rentacar, arac) birlikte gelsin; böylece liste/harita
    // ve ana sayfa aynı kategori çipinde tutarlı sonuç döner.
    const superCategoryWhere = homepageSuperCategoryWhere(superCategory);
    if (superCategoryWhere) {
      conditions.push(superCategoryWhere);
    }

    if (category && category !== "all") {
      const catCond = await resolveMapCategoryFilterCondition(category);
      if (catCond) conditions.push(catCond);
    }

    if (hasKeywordFilter) {
      const kwFilter = mapBusinessKeywordFilter(directoryKeywords);
      // Anahtar-kelime verildiyse: eşleşme yoksa boş döner (alakasız doldurma yapılmaz).
      conditions.push(kwFilter ?? sql`FALSE`);
    }

    const textSearch = mapBusinessTextSearchCondition(q, { geoScoped: Boolean(city && hasCoordinateScope) });
    if (textSearch) conditions.push(textSearch);

    const bboxRaw = String(req.query.bbox ?? "").trim();
    const [bboxSouth, bboxWest, bboxNorth, bboxEast] = bboxRaw.split(",").map((x) => Number(x));
    const hasBboxScope = Boolean(bboxRaw)
      && [bboxSouth, bboxWest, bboxNorth, bboxEast].every((x) => Number.isFinite(x))
      && bboxSouth < bboxNorth
      && bboxWest < bboxEast;

    // Coğrafi yarıçap kutusu (lat/lng verildiyse). recentFirst'te konum filtrelenmez.
    // bbox verildiyse görünür harita alanı (dikdörtgen) kullanılır — ülke/bölge zoom'unda
    // merkez+nokta yarıçapı yerine tüm viewport kapsanır.
    let geoBox: SQL | null = null;
    if (!recentFirst && hasBboxScope) {
      geoBox = and(
        sql`${mapBusinessesTable.latitude} BETWEEN ${bboxSouth} AND ${bboxNorth}`,
        sql`${mapBusinessesTable.longitude} BETWEEN ${bboxWest} AND ${bboxEast}`,
      ) ?? null;
    } else if (!recentFirst && (lat || lng)) {
      const radiusMeters = Number(radius ?? 5000);
      if (!Number.isFinite(latF) || !Number.isFinite(lngF) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
        res.status(400).json({ success: false, data: [], count: 0, total: 0, error: "lat/lng/radius gecersiz" });
        return;
      }
      const radiusKm = Math.min(3000, Math.max(0.1, radiusMeters / 1000));
      const latDelta = radiusKm / 111;
      const cosLat = Math.max(0.05, Math.abs(Math.cos((latF * Math.PI) / 180)));
      const lngDelta = radiusKm / (111 * cosLat);
      // Kare bbox yalnız ucuz ön-filtre; köşelerde ~1.41x mesafe sızıntısını önlemek
      // için gerçek Haversine büyük-çember mesafesiyle (km) daireye kırp. Hem liste hem
      // sayım aynı koşulu kullandığından "toplam kayıt" da doğru kalır.
      geoBox = and(
        sql`${mapBusinessesTable.latitude} BETWEEN ${latF - latDelta} AND ${latF + latDelta}`,
        sql`${mapBusinessesTable.longitude} BETWEEN ${lngF - lngDelta} AND ${lngF + lngDelta}`,
        sql`(6371 * acos(least(1, greatest(-1,
          cos(radians(${latF})) * cos(radians(${mapBusinessesTable.latitude})) *
          cos(radians(${mapBusinessesTable.longitude}) - radians(${lngF})) +
          sin(radians(${latF})) * sin(radians(${mapBusinessesTable.latitude}))
        )))) <= ${radiusKm}`,
      ) ?? null;
    }

    // Şehir filtresi: bir şehir gönderildiyse SONUÇLAR yalnızca o şehir (cityId veya il adı/adres).
    // geoBox OR cityId-null kayıt Adana vb. ulusal sızıntıya yol açtığı için burada kullanılmaz.
    const citySlugParam = String(req.query["citySlug"] ?? "").trim();
    const cityParam = String(city ?? "").trim();
    const requireCityScope = ["1", "true", "yes"].includes(String(req.query["requireCityScope"] ?? "").toLowerCase());
    const cityFilterRequested = Boolean(cityParam || citySlugParam);
    const resolvedCityId = cityFilterRequested
      ? await resolveExistingMapCityId(cityParam, citySlugParam)
      : null;
    const canonicalCity = cityFilterRequested
      ? canonicalMapCityLabel(cityParam, citySlugParam)
      : null;

    if (requireCityScope && (!cityFilterRequested || (!resolvedCityId && !canonicalCity))) {
      if (hasCoordinateScope || hasBboxScope) {
        // Yurtdışı / çözülemeyen şehir adı: yalnızca geo bbox ile devam et (boş liste döndürme).
      } else {
        res.json({ success: true, data: [], count: 0, total: 0 });
        return;
      }
    }

    if (cityFilterRequested && (resolvedCityId || canonicalCity)) {
      conditions.push(buildMapCityScopeCondition(resolvedCityId, canonicalCity, geoBox, { strictCityScope: requireCityScope }));
    } else if (geoBox) {
      conditions.push(geoBox);
    }

    if (district) {
      const cityIdForDistrict = cityFilterRequested
        ? await resolveExistingMapCityId(cityParam, citySlugParam)
        : null;
      const districtId = await resolveMapDistrictId(district, cityIdForDistrict);
      if (districtId) {
        conditions.push(eq(mapBusinessesTable.districtId, districtId));
      } else if (!hasCoordinateScope) {
        conditions.push(ilike(mapBusinessesTable.address, `%${district.trim()}%`));
      }
    }

    query = query.where(and(...conditions));

    const limitNum = req.query["limit"] ? Math.min(parseInt(req.query["limit"] as string) || 100, 200) : 100;
    const offsetNum = req.query["offset"] ? Math.max(0, parseInt(req.query["offset"] as string) || 0) : 0;
    // Liste sorgusu ile toplam sayım aynı pahalı WHERE'i (EXISTS alt sorguları + regex)
    // değerlendirir. Daha önce ardışık (önce satırlar, sonra count) await edildiği için
    // mevcut DB kayıtları gecikmeli geliyordu. İkisini paralel çalıştırıp toplam gecikmeyi
    // ~2x'ten max(satır, count)'a indiriyoruz; bekletici bağımlılık kaldırıldı.
    // SIRALAMA GÜVENCESİ: Ulusal "en çok yorumlanan" (userRatingsTotal DESC) sıralaması
    // YALNIZCA bir konum kapsamı (şehir VEYA bbox) varken kullanılır. Konum kapsamı yoksa
    // (recentFirst veya hiç city/geo gelmediyse) EN YENİ eklenenler döndürülür; böylece
    // konumsuz/kapsamsız (ya da cache atlatan) hiçbir istek Türkiye geneli Ankara/Adana
    // yüksek-puanlı kamu/AVM setini DÖKEMEZ. Şehir/bbox varken o kapsam içinde popülerlik
    // sıralaması korunur (Aydın isteğinde Aydın'ın popülerleri gibi).
    const hasLocationScope = cityFilterRequested || Boolean(geoBox) || hasBboxScope;
    const useRecencyOrder = recentFirst || (!hasLocationScope && !featuredOnly);
    const listOrderBy = featuredOnly
      ? [asc(mapBusinessesTable.sortOrder), asc(mapBusinessesTable.name)]
      : useRecencyOrder
        ? [desc(mapBusinessesTable.isPremium), desc(mapBusinessesTable.createdAt)]
        : mapBusinessPublicRankingOrder(true);
    const countQuery = db
      .select({ count: sql<number>`count(distinct ${mapBusinessesTable.id})::int` })
      .from(mapBusinessesTable)
      .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
      .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
      .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
      .where(and(...conditions));
    const [rows, countResult] = await Promise.all([
      query
        .orderBy(...listOrderBy)
        .limit(limitNum)
        .offset(offsetNum),
      countQuery,
    ]);
    const countRow = countResult[0];

    let data = rows.map((r) => {
      const row = enrichMapBusinessContactFields(enrichMapBusinessDirectoryFields({
        ...r.business,
        category: r.category,
        city: r.city,
        district: r.district,
        hasPublicProfile: Boolean(r.hasPublicProfile),
      }));
      return enrichMapBusinessLocationFields(row);
    });

    data = await attachMapBusinessListImages(data);
    data = await attachHomepageStorefrontLinks(data);

    // Eksik işletmeler SESSİZCE ve İSTEĞİ BLOKLAMADAN arka plan Google Maps kazıma
    // botu kuyruğuna alınır. Kullanıcı mevcut kayıtları anında görür; kalanı bot
    // tamamlar. Yanıtta kazıma/ekleme mesajı dönülmez.
    const autoBackfill = ["1", "true", "yes"].includes(String(req.query["backfill"] ?? req.query["autoBackfill"] ?? "").toLowerCase());
    if (autoBackfill && !recentFirst && hasCoordinateScope) {
      const settings = await getMapAutoImportSettings().catch(() => DEFAULT_MAP_AUTO_IMPORT_SETTINGS);
      const target = Math.max(1, Math.min(KESFET_SCRAPER_BACKFILL_TARGET_MAX, Number(req.query["backfillTarget"] ?? settings.scraperBackfillTargetPerCategory) || settings.scraperBackfillTargetPerCategory));
      const backfillRadiusMeters = Math.max(10_000, Math.min(50_000, Number(req.query["backfillRadius"] ?? req.query["backfillRadiusMeters"] ?? settings.scraperBackfillRadiusMeters) || settings.scraperBackfillRadiusMeters));
      const total = Number(countRow?.count ?? 0);
      if (settings.scraperBackfillEnabled && total < target) {
        const cityLabel = String(req.query["backfillCity"] ?? city ?? "").trim() || "Seçili konum";
        const categoryForBackfill = normalizeKesfetBackfillCategory({
          slug: typeof req.query["backfillCategorySlug"] === "string" ? req.query["backfillCategorySlug"] : undefined,
          label: typeof req.query["backfillCategoryLabel"] === "string" ? req.query["backfillCategoryLabel"] : undefined,
          keyword: directoryKeywords || q || String(req.query["backfillKeyword"] ?? "").trim() || "işletmeler",
          googlePlaceType: typeof req.query["googlePlaceType"] === "string" ? req.query["googlePlaceType"] : undefined,
          homepageSuperCategory: superCategory || undefined,
          storeType: typeof req.query["storeType"] === "string" ? req.query["storeType"] : undefined,
        });
        const backfillCity = buildDynamicKesfetBackfillCity(cityLabel, latF, lngF);
        void enqueueKesfetScraperBackfill({
          city: backfillCity,
          category: categoryForBackfill,
          target,
          refreshIntervalDays: settings.refreshIntervalDays,
          radiusMeters: backfillRadiusMeters,
        }).catch(() => {});
      }
    }

    res.json({ success: true, data, count: data.length, total: countRow?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/kesfet-scraper-backfill/status/:id", async (req, res): Promise<void> => {
  const job = getKesfetBackfillJobStatus(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, error: "Backfill işi bulunamadı veya sunucu belleğinden düştü." });
    return;
  }
  res.json({
    success: true,
    provider: "google_maps_scraper_bot",
    usesPlacesApi: false,
    data: job,
  });
});

router.get("/map/kesfet-scraper-backfill/status", async (_req, res): Promise<void> => {
  const jobs = Array.from(kesfetScraperBackfillJobs.values());
  res.json({
    success: true,
    provider: "google_maps_scraper_bot",
    usesPlacesApi: false,
    queue: {
      running: kesfetScraperBackfillWorkerRunning,
      queued: kesfetScraperBackfillQueue.length,
      totalInMemory: jobs.length,
      lastRunAt: kesfetScraperBackfillLastRunAt,
      lastError: kesfetScraperBackfillLastError,
    },
    data: jobs
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 100),
  });
});

router.post("/map/admin/kesfet-scraper-backfill/queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const settings = await getMapAutoImportSettings().catch(() => DEFAULT_MAP_AUTO_IMPORT_SETTINGS);
  const target = Math.max(1, Math.min(KESFET_SCRAPER_BACKFILL_TARGET_MAX, Number(req.body?.targetPerCategory ?? settings.scraperBackfillTargetPerCategory) || settings.scraperBackfillTargetPerCategory));
  const refreshIntervalDays = Math.max(1, Math.min(365, Number(req.body?.refreshIntervalDays ?? settings.refreshIntervalDays) || settings.refreshIntervalDays));
  const radiusMeters = Math.max(10_000, Math.min(50_000, Number(req.body?.radiusMeters ?? settings.scraperBackfillRadiusMeters) || settings.scraperBackfillRadiusMeters));
  const force = Boolean(req.body?.force);
  const limitCities = Math.max(0, Math.min(KESFET_SCRAPER_BACKFILL_CITIES.length, Number(req.body?.limitCities ?? 0) || 0));
  const limitCategories = Math.max(0, Math.min(KESFET_SCRAPER_BACKFILL_CATEGORIES.length, Number(req.body?.limitCategories ?? 0) || 0));
  const citySlug = String(req.body?.city ?? req.body?.cityKey ?? "").trim();
  const categorySlug = String(req.body?.category ?? req.body?.categorySlug ?? "").trim();
  const cities = KESFET_SCRAPER_BACKFILL_CITIES
    .filter((city) => !citySlug || city.key.includes(citySlug) || normalizeImportDedupeText(city.label) === normalizeImportDedupeText(citySlug))
    .slice(0, limitCities || undefined);
  const categories = KESFET_SCRAPER_BACKFILL_CATEGORIES
    .filter((category) => !categorySlug || category.slug === categorySlug)
    .slice(0, limitCategories || undefined);

  let queued = 0;
  let skippedFresh = 0;
  const samples: Array<{ city: string; category: string; jobId: string | null; reason: string; found: number }> = [];
  for (const city of cities) {
    for (const category of categories) {
      const out = await enqueueKesfetScraperBackfill({ city, category, target, refreshIntervalDays, radiusMeters, force });
      if (out.queued) queued++;
      else skippedFresh++;
      if (samples.length < 20) {
        samples.push({ city: city.label, category: category.label, jobId: out.job?.id ?? null, reason: out.reason, found: out.found });
      }
    }
  }

  res.status(202).json({
    success: true,
    provider: "google_maps_scraper_bot",
    usesPlacesApi: false,
    coverage: {
      turkeyProvinceCount: TURKEY_CITIES.length,
      kktcCityCount: KESFET_EXTRA_BACKFILL_CITIES.filter((city) => city.region === "kktc").length,
      azerbaijanCityCount: KESFET_EXTRA_BACKFILL_CITIES.filter((city) => city.region === "azerbaycan").length,
      categoryCount: nightScraperCategories.length,
    },
    requestedPairs: cities.length * categories.length,
    queued,
    skippedFresh,
    targetPerCategory: target,
    radiusMeters,
    diameterMeters: radiusMeters * 2,
    refreshIntervalDays,
    queueDepth: kesfetScraperBackfillQueue.length,
    running: kesfetScraperBackfillWorkerRunning,
    samples,
    nightScraper: getKesfetNightScraperStatus(),
    message: "Keşfet şehir/kategori backfill işleri Google Maps kazıma botu kuyruğuna alındı; Google Places API bu yolda kullanılmaz.",
  });
});

/** GET /map/kesfet-night-scraper/status — gece otomatik kazıma botunun durumu. */
router.get("/map/kesfet-night-scraper/status", async (_req, res): Promise<void> => {
  const dbStats = await getKesfetNightScraperDbStats().catch(() => null);
  res.json({ success: true, data: { ...getKesfetNightScraperStatus(), dbStats } });
});

/**
 * POST /map/kesfet-night-scraper/wake
 * Haritalar ziyaretiyle gece botunu uyandırır; gece penceresi dışında da geçici süre çalışır.
 * query: hours=2 (varsayılan) | allDay=1 (TR gün sonuna kadar)
 */
router.post("/map/kesfet-night-scraper/wake", async (req, res): Promise<void> => {
  if (process.env["KESFET_NIGHT_SCRAPER"] === "0") {
    res.json({ success: false, error: "night_scraper_disabled" });
    return;
  }
  const allDay = ["1", "true", "yes"].includes(String(req.query.allDay ?? req.body?.allDay ?? "").toLowerCase());
  const hoursRaw = req.query.hours ?? req.body?.hours;
  const hours = hoursRaw != null ? Number(hoursRaw) : 2;
  const wake = wakeKesfetNightScraperFromHaritalar({ hours, allDay }, nightScraperLogRef ?? undefined);
  if (!wake.ok) {
    res.json({ success: false, error: wake.reason });
    return;
  }
  res.json({
    success: true,
    data: {
      ...wake,
      status: getKesfetNightScraperStatus(),
    },
  });
});

/**
 * POST /map/admin/kesfet-night-scraper/control
 * body: { action: "enable" | "disable" | "auto" | "run-now" | "reset-cursor", minutes?, cursor? }
 *  - enable/disable: gece botunu admin ayarından bağımsız aç/kapat
 *  - auto: override'ı kaldır (yine map ayarındaki scraperBackfillEnabled'a uyar)
 *  - run-now: pencere dışı olsa bile belirtilen dakika kadar (vars. 60) hemen çalış
 *  - reset-cursor: ilerleme imlecini sıfırla (veya cursor değerine taşı)
 */
router.post("/map/admin/kesfet-night-scraper/control", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const action = String(req.body?.action ?? "").trim();
    const log = nightScraperLogRef ?? { info: () => {}, warn: () => {}, error: () => {} };
    switch (action) {
      case "enable":
        nightScraperEnabledOverride = true;
        await persistScraperBackfillEnabled(true);
        await syncKesfetNightScraperScheduler(log);
        break;
      case "disable":
        nightScraperEnabledOverride = false;
        await persistScraperBackfillEnabled(false);
        stopKesfetNightScraperInterval();
        break;
      case "auto":
        nightScraperEnabledOverride = null;
        await syncKesfetNightScraperScheduler(log);
        break;
      case "run-now": {
        const minutes = Math.max(1, Math.min(600, Number(req.body?.minutes ?? 60) || 60));
        if (!nightScraperStarted) {
          nightScraperStopFn = startKesfetNightScraper(log);
        }
        applyKesfetNightScraperForceUntil(Date.now() + minutes * 60_000, "admin", nightScraperLogRef ?? undefined);
        break;
      }
      case "reset-cursor": {
        const cursorRaw = Number(req.body?.cursor);
        const total = kesfetNightScraperTotalPairs();
        nightScraperCursor = Number.isFinite(cursorRaw) && cursorRaw >= 0
          ? Math.floor(cursorRaw) % Math.max(1, total)
          : 0;
        void saveNightScraperPersistState({ cursor: nightScraperCursor, cyclesCompleted: nightScraperCyclesCompleted });
        break;
      }
      default:
        res.status(400).json({ success: false, error: "action: enable | disable | auto | run-now | reset-cursor" });
        return;
    }
    res.json({ success: true, action, data: getKesfetNightScraperStatus() });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Gece kazıma botu güncellenemedi",
    });
  }
});

/** GET /map/businesses/cluster?bbox=south,west,north,east&zoom=6
 *  Server-side marker clustering for Yekpare Haritalar. Returns aggregate clusters
 *  at low zoom and individual points once the viewport is close enough.
 */
router.get("/map/businesses/cluster", optionalMapAuth, async (req, res): Promise<void> => {
  // Konuma duyarlı (bbox) yanıt; paylaşılan/edge cache'e düşmesin.
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Vary", "Authorization, Cookie");
  try {
    const bboxRaw = String(req.query.bbox ?? "");
    const [south, west, north, east] = bboxRaw.split(",").map((x) => Number(x));
    const zoom = Math.max(1, Math.min(20, Math.round(Number(req.query.zoom ?? 6) || 6)));
    if (![south, west, north, east].every((x) => Number.isFinite(x)) || south >= north || west >= east) {
      res.status(400).json({ success: false, error: "bbox south,west,north,east gerekli" });
      return;
    }

    const q = String(req.query.q ?? req.query.search ?? "").trim();
    const category = String(req.query.category ?? req.query.categoryId ?? "").trim();
    const superCategory = String(req.query.superCategory ?? "").trim();
    const premiumOnly = String(req.query["premiumOnly"] ?? "") === "1";
    const citySlugParam = String(req.query["citySlug"] ?? "").trim();
    const cityParam = String(req.query.city ?? "").trim();
    const requireCityScope = ["1", "true", "yes"].includes(String(req.query["requireCityScope"] ?? "").toLowerCase());
    const cityFilterRequested = Boolean(cityParam || citySlugParam);
    const resolvedCityId = cityFilterRequested
      ? await resolveExistingMapCityId(cityParam, citySlugParam)
      : null;
    const canonicalCity = cityFilterRequested
      ? canonicalMapCityLabel(cityParam, citySlugParam)
      : null;

    const conditions = [
      ...mapBusinessPublicListConditions(),
      sql`${mapBusinessesTable.latitude} BETWEEN ${south} AND ${north}`,
      sql`${mapBusinessesTable.longitude} BETWEEN ${west} AND ${east}`,
    ];
    if (requireCityScope && (!cityFilterRequested || (!resolvedCityId && !canonicalCity))) {
      res.json({ success: true, data: [], total: 0, meta: { clusters: 0, points: 0 } });
      return;
    }
    if (cityFilterRequested) {
      conditions.push(buildMapCityScopeCondition(resolvedCityId, canonicalCity, null, { strictCityScope: requireCityScope }));
    }
    if (premiumOnly) conditions.push(eq(mapBusinessesTable.isPremium, true));
    const superCategoryWhere = homepageSuperCategoryWhere(superCategory);
    if (superCategoryWhere) {
      conditions.push(superCategoryWhere);
    }
    if (category && category !== "all") {
      const catCond = await resolveMapCategoryFilterCondition(category);
      if (catCond) conditions.push(catCond);
    }
    const textSearch = mapBusinessTextSearchCondition(q);
    if (textSearch) conditions.push(textSearch);

    const rows = await db.select({
      business: mapBusinessesTable,
      category: mapCategoriesTable,
    }).from(mapBusinessesTable)
      .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
      .where(and(...conditions))
      .orderBy(...mapBusinessPublicRankingOrder(true))
      .limit(3500);

    const gridDeg = zoom >= 15 ? 0 : zoom >= 13 ? 0.006 : zoom >= 11 ? 0.018 : zoom >= 9 ? 0.055 : zoom >= 7 ? 0.16 : 0.42;
    const buckets = new Map<string, Array<(typeof rows)[number]>>();
    for (const row of rows) {
      const lat = Number(row.business.latitude);
      const lng = Number(row.business.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key = gridDeg > 0 ? `${Math.floor(lat / gridDeg)}:${Math.floor(lng / gridDeg)}` : `${row.business.id}`;
      const list = buckets.get(key) ?? [];
      list.push(row);
      buckets.set(key, list);
    }

    const features = Array.from(buckets.entries()).map(([key, list]) => {
      if (list.length > 1 && gridDeg > 0) {
        const lat = list.reduce((sum, row) => sum + Number(row.business.latitude ?? 0), 0) / list.length;
        const lng = list.reduce((sum, row) => sum + Number(row.business.longitude ?? 0), 0) / list.length;
        return { kind: "cluster", id: `cluster-${key}`, lat, lng, count: list.length };
      }
      const row = list[0]!;
      return {
        kind: "point",
        id: row.business.id,
        lat: Number(row.business.latitude),
        lng: Number(row.business.longitude),
        business: {
          ...row.business,
          category: row.category,
          categoryName: row.category?.name ?? null,
          categoryIcon: row.category?.icon ?? null,
        },
      };
    });

    res.json({
      success: true,
      data: features,
      count: features.length,
      total: rows.length,
      meta: {
        zoom,
        bbox: { south, west, north, east },
        clusterSizeDeg: gridDeg,
        clusters: features.filter((x) => x.kind === "cluster").length,
        points: features.filter((x) => x.kind === "point").length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /map/businesses/premium-count — must be before /map/businesses/:id */
router.get("/map/businesses/premium-count", async (_req, res): Promise<void> => {
  try {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(mapBusinessesTable)
      .where(and(eq(mapBusinessesTable.isActive, true), eq(mapBusinessesTable.isPremium, true)));
    res.json({ success: true, count: row?.c ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** Son eklenen işletmeler (giriş sayfası vb.; premium zorunlu değil) */
router.get("/map/businesses/recent-public", async (req, res): Promise<void> => {
  try {
    const limRaw = parseInt(String(req.query["limit"] ?? "12"), 10);
    const limitNum = Math.min(40, Math.max(1, Number.isFinite(limRaw) ? limRaw : 12));
    const superCategory = typeof req.query["superCategory"] === "string" ? req.query["superCategory"] : "";
    const superCategoryWhere = homepageSuperCategoryWhere(superCategory);
    const conditions = [...mapBusinessPublicListConditions()];
    if (superCategoryWhere) conditions.push(superCategoryWhere);
    let rows = await db
      .select({
        business: mapBusinessesTable,
        category: mapCategoriesTable,
        city: mapCitiesTable,
        district: mapDistrictsTable,
      })
      .from(mapBusinessesTable)
      .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
      .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
      .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
      .where(and(...conditions))
      .orderBy(desc(mapBusinessesTable.createdAt))
      .limit(limitNum);
    if (rows.length === 0 && superCategoryWhere) {
      rows = await db
        .select({
          business: mapBusinessesTable,
          category: mapCategoriesTable,
          city: mapCitiesTable,
          district: mapDistrictsTable,
        })
        .from(mapBusinessesTable)
        .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
        .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
        .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
        .where(and(...mapBusinessPublicListConditions(), superCategoryWhere))
        .orderBy(desc(mapBusinessesTable.createdAt))
        .limit(limitNum);
    }
    const data = await attachHomepageStorefrontLinks(await attachMapBusinessListImages(rows.map((r) => ({
      ...r.business,
      category: r.category,
      city: r.city,
      district: r.district,
    }))));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** 81 il merkezi (sabit koordinatlar + varsa tr_il plaka eşlemesi) — Keşfet harita pinleri */
router.get("/map/turkey-il-centers", async (_req, res): Promise<void> => {
  try {
    const ilKey = (s: string) =>
      s
        .trim()
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
    let byAdi = new Map<string, { plaka: number }>();
    try {
      const dbIls = await db.select().from(trIlTable);
      byAdi = new Map(dbIls.map((r) => [ilKey(r.adi), { plaka: r.plaka }]));
    } catch {
      byAdi = new Map();
    }
    const data = TURKEY_CITIES.map((c) => {
      const dbRow = byAdi.get(ilKey(c.nameTr)) ?? byAdi.get(ilKey(c.name));
      return {
        plaka: dbRow?.plaka ?? null,
        adi: c.nameTr,
        lat: c.lat,
        lng: c.lng,
        zoom: c.zoom,
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/population/viewport", async (req, res): Promise<void> => {
  try {
    const norm = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/ı/g, "i")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const readPopulation = (row: Record<string, unknown> | null | undefined): number | null => {
      if (!row || typeof row !== "object") return null;
      for (const key of ["population", "nufus", "nüfus", "populasyon"]) {
        const value = row[key];
        if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
        if (typeof value === "string") {
          const n = Number(value.replace(/\./g, "").replace(/,/g, ""));
          if (Number.isFinite(n)) return Math.round(n);
        }
      }
      return null;
    };
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const requestedCity = String(req.query.city ?? "").trim();
    const requestedDistrict = String(req.query.district ?? "").trim();
    let cityName = requestedCity;
    if (!cityName && Number.isFinite(lat) && Number.isFinite(lng)) {
      const nearest = (TURKEY_CITIES as ReadonlyArray<{ name: string; nameTr?: string; lat: number; lng: number }>).reduce<{
        name: string;
        distance: number;
      } | null>((best, c) => {
        const d = Math.hypot(Number(c.lat) - lat, Number(c.lng) - lng);
        if (!best || d < best.distance) return { name: c.nameTr ?? c.name, distance: d };
        return best;
      }, null);
      cityName = nearest?.name ?? "";
    }
    if (!cityName) {
      res.json({
        success: true,
        data: {
          province: null,
          district: null,
          neighborhood: null,
          emptyStates: ["Harita merkezi için il bilgisi belirlenemedi."],
        },
      });
      return;
    }
    type ProvinceApiRow = Record<string, unknown> & {
      name?: string;
      districts?: Array<Record<string, unknown> & { name?: string }>;
    };
    const url = `https://api.turkiyeapi.dev/v1/provinces?name=${encodeURIComponent(cityName)}`;
    const remote = await fetch(url, { headers: { Accept: "application/json" } });
    const payload = await remote.json().catch(() => ({})) as { data?: ProvinceApiRow[] | ProvinceApiRow };
    const rows = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
    const province = rows.find((row) => norm(row.name) === norm(cityName)) ?? rows[0] ?? null;
    const districts = Array.isArray(province?.districts) ? province!.districts! : [];
    const district = requestedDistrict
      ? districts.find((row) => norm(row.name) === norm(requestedDistrict)) ?? null
      : null;
    const emptyStates: string[] = [];
    if (!province || readPopulation(province) == null) emptyStates.push("İl düzeyi nüfus verisi bu kaynakta yok.");
    if (requestedDistrict && (!district || readPopulation(district) == null)) emptyStates.push("İlçe düzeyi nüfus verisi bu kaynakta yok.");
    emptyStates.push("Mahalle düzeyi nüfus verisi mevcut kaynakta bulunmuyor.");
    res.json({
      success: true,
      data: {
        province: province ? { name: String(province.name ?? cityName), population: readPopulation(province), source: "turkiyeapi.dev" } : null,
        district: district ? { name: String(district.name ?? requestedDistrict), population: readPopulation(district), source: "turkiyeapi.dev" } : (requestedDistrict ? { name: requestedDistrict, population: null, source: null } : null),
        neighborhood: null,
        emptyStates,
      },
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: String(err),
      data: {
        province: null,
        district: null,
        neighborhood: null,
        emptyStates: ["Nüfus verisi kaynağına ulaşılamadı."],
      },
    });
  }
});

/* — SLUG helpers (declared early to avoid route-ordering issues) — */
function toSlug(text: string): string {
  const tr: Record<string, string> = { ğ:"g",Ğ:"G",ü:"u",Ü:"U",ş:"s",Ş:"S",ı:"i",İ:"I",ö:"o",Ö:"O",ç:"c",Ç:"C" };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, m => tr[m] || m)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** GET /map/businesses/export?format=csv|json — admin only, max 5000 rows */
router.get("/map/businesses/export", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const format = (req.query["format"] as string) || "json";
  const limitRaw = parseInt(String(req.query["limit"] ?? "5000"), 10);
  const limit = Math.min(10_000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 5000));
  const rows = await db.select({
    id: mapBusinessesTable.id, slug: mapBusinessesTable.slug,
    googlePlaceId: mapBusinessesTable.googlePlaceId, name: mapBusinessesTable.name,
    address: mapBusinessesTable.address, phone: mapBusinessesTable.phone,
    website: mapBusinessesTable.website, email: mapBusinessesTable.email,
    description: mapBusinessesTable.description, rating: mapBusinessesTable.rating,
    userRatingsTotal: mapBusinessesTable.userRatingsTotal,
    latitude: mapBusinessesTable.latitude, longitude: mapBusinessesTable.longitude,
    photoUrl: mapBusinessesTable.photoUrl, coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
    priceLevel: mapBusinessesTable.priceLevel, isPremium: mapBusinessesTable.isPremium,
    isActive: mapBusinessesTable.isActive, hasDelivery: mapBusinessesTable.hasDelivery,
    hasReservation: mapBusinessesTable.hasReservation, hasOnlineOrder: mapBusinessesTable.hasOnlineOrder,
    tags: mapBusinessesTable.tags, instagramUrl: mapBusinessesTable.instagramUrl,
    facebookUrl: mapBusinessesTable.facebookUrl, twitterUrl: mapBusinessesTable.twitterUrl,
    menuUrl: mapBusinessesTable.menuUrl, workingHours: mapBusinessesTable.workingHours,
    createdAt: mapBusinessesTable.createdAt,
  }).from(mapBusinessesTable).orderBy(asc(mapBusinessesTable.name)).limit(limit);
  if (format === "csv") {
    const fields = ["id","slug","googlePlaceId","name","address","phone","website","email","description","rating","userRatingsTotal","latitude","longitude","photoUrl","coverPhotoUrl","priceLevel","isPremium","isActive","hasDelivery","hasReservation","hasOnlineOrder","tags","instagramUrl","facebookUrl","twitterUrl","menuUrl","createdAt"];
    const esc = (v: unknown) => { if (v==null) return ""; const s=Array.isArray(v)?v.join("|"):String(v); return s.includes(",")||s.includes('"')||s.includes("\n")?`"${s.replace(/"/g,'""')}\"`:s; };
    const csv = [fields.join(","), ...rows.map(r => fields.map(f => esc((r as Record<string,unknown>)[f])).join(","))].join("\n");
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.setHeader("Content-Disposition",`attachment; filename="isletmeler-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send("\uFEFF" + csv);
  } else {
    res.setHeader("Content-Disposition",`attachment; filename="isletmeler-${new Date().toISOString().slice(0,10)}.json"`);
    res.json({ success: true, total: rows.length, exportedAt: new Date(), data: rows });
  }
});

/** POST /map/businesses/generate-slugs */
router.post("/map/businesses/generate-slugs", async (_req, res): Promise<void> => {
  const noSlug = await db.select({ id: mapBusinessesTable.id, name: mapBusinessesTable.name }).from(mapBusinessesTable).where(sql`slug IS NULL`);
  let updated = 0;
  for (const b of noSlug) {
    const base = toSlug(b.name); let slug = base; let attempt = 1;
    while (true) {
      const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
      if (clash.length === 0) break;
      slug = `${base}-${++attempt}`;
    }
    await db.update(mapBusinessesTable).set({ slug }).where(eq(mapBusinessesTable.id, b.id));
    updated++;
  }
  res.json({ success: true, message: `${updated} işletme için slug oluşturuldu` });
});

/** GET /map/businesses/by-slug/:slug */
router.get("/map/businesses/by-slug/:slug", async (req, res): Promise<void> => {
  const rows = await db.select({ business: mapBusinessesTable, category: mapCategoriesTable, city: mapCitiesTable, district: mapDistrictsTable, hasPublicProfile: MAP_BUSINESS_HAS_PUBLIC_PROFILE })
    .from(mapBusinessesTable)
    .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
    .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
    .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
    .where(eq(mapBusinessesTable.slug, req.params.slug)).limit(1);
  if (rows.length === 0) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }
  const biz = normalizeMapImageFields({ ...rows[0].business, category: rows[0].category, city: rows[0].city, district: rows[0].district });
  const images = await db.select().from(mapBusinessImagesTable).where(eq(mapBusinessImagesTable.businessId, biz.id)).orderBy(asc(mapBusinessImagesTable.sortOrder));
  res.json({
    success: true,
    data: {
      ...biz,
      hasPublicProfile: Boolean(rows[0].hasPublicProfile),
      images: images.map((img) => ({ ...img, imageUrl: normalizeImageUrlValue(img.imageUrl) || img.imageUrl })),
    },
  });
});

/** POST /map/businesses/import */
router.post("/map/businesses/import", async (req, res): Promise<void> => {
  try {
    const { data, overwrite = false } = req.body;
    if (!data || !Array.isArray(data)) { res.status(400).json({ success: false, error: "data array gerekli" }); return; }
    const safeNum = (v: unknown): number | null => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : null; };
    const safeInt = (v: unknown): number | null => { const n = Math.round(safeNum(v) ?? NaN); return Number.isFinite(n) ? n : null; };
    const safeBool = (v: unknown): boolean => v === true || v === "true" || v === 1 || v === "1";
    let imported = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    for (const row of data as Record<string, unknown>[]) {
      if (!row.name || typeof row.name !== "string" || !row.name.trim()) { skipped++; continue; }
      const name = row.name.trim();
      const base = toSlug(name);
      let slug = (typeof row.slug === "string" && row.slug) ? row.slug : base;
      let attempt = 1;
      // Max 200 attempts to avoid infinite loop on DB issues
      while (attempt <= 200) {
        const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(and(eq(mapBusinessesTable.slug, slug), row.id ? sql`id != ${String(row.id)}` : sql`true`)).limit(1);
        if (clash.length === 0) break;
        slug = `${base}-${++attempt}`;
      }
      // Parse workingHours safely from JSON string or object
      let workingHours: Record<string, unknown> | null = null;
      if (row.workingHours) {
        if (typeof row.workingHours === "string") {
          try { workingHours = JSON.parse(row.workingHours); } catch { workingHours = null; }
        } else if (typeof row.workingHours === "object") {
          workingHours = row.workingHours as Record<string, unknown>;
        }
      }
      const vals = {
        name, slug, googlePlaceId: typeof row.googlePlaceId==="string"?row.googlePlaceId:null,
        categoryId: typeof row.categoryId==="string"?row.categoryId:null,
        cityId: typeof row.cityId==="string"?row.cityId:null,
        districtId: typeof row.districtId==="string"?row.districtId:null,
        address: typeof row.address==="string"?row.address:null, phone: typeof row.phone==="string"?row.phone:null,
        website: typeof row.website==="string"?row.website:null, email: typeof row.email==="string"?row.email:null,
        description: typeof row.description==="string"?row.description:null,
        rating: safeNum(row.rating), userRatingsTotal: safeInt(row.userRatingsTotal),
        latitude: safeNum(row.latitude), longitude: safeNum(row.longitude),
        photoUrl: typeof row.photoUrl==="string"?row.photoUrl:null,
        coverPhotoUrl: typeof row.coverPhotoUrl==="string"?row.coverPhotoUrl:null,
        priceLevel: safeInt(row.priceLevel), isPremium: safeBool(row.isPremium),
        isActive: row.isActive!==undefined?safeBool(row.isActive):true,
        hasDelivery: safeBool(row.hasDelivery), hasReservation: safeBool(row.hasReservation), hasOnlineOrder: safeBool(row.hasOnlineOrder),
        tags: Array.isArray(row.tags)?row.tags:typeof row.tags==="string"?row.tags.split("|").filter(Boolean):null,
        instagramUrl: typeof row.instagramUrl==="string"?row.instagramUrl:null,
        facebookUrl: typeof row.facebookUrl==="string"?row.facebookUrl:null,
        twitterUrl: typeof row.twitterUrl==="string"?row.twitterUrl:null,
        menuUrl: typeof row.menuUrl==="string"?row.menuUrl:null,
        workingHours,
      };
      try {
        const existing = vals.googlePlaceId ? await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.googlePlaceId, vals.googlePlaceId)).limit(1) : [];
        if (existing.length > 0 && overwrite) { await db.update(mapBusinessesTable).set({ ...vals, updatedAt: new Date() }).where(eq(mapBusinessesTable.id, existing[0].id)); updated++; }
        else if (existing.length > 0) { skipped++; }
        else { await db.insert(mapBusinessesTable).values(vals).onConflictDoNothing(); imported++; }
      } catch (e) { errors.push(`${name}: ${String(e).slice(0,100)}`); }
    }
    res.json({ success: true, message: `${imported} eklendi, ${updated} güncellendi, ${skipped} atlandı${errors.length?`, ${errors.length} hata`:""}`, imported, updated, skipped, errors: errors.length?errors.slice(0,20):undefined });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

router.get("/map/businesses/search", async (req, res): Promise<void> => {
  const adminMode = String(req.query["admin"] ?? "") === "1";
  if (adminMode && !denyUnlessAdminMaintenance(req, res, "haritalar")) return;

  const { q, city, category, page, limit: limitParam, activeOnly, excludeLinkedVendors } = req.query as Record<string, string>;
  const pageNum = parseInt(page ?? "1");
  const maxLimit = adminMode ? 200 : 100;
  const limit = Math.min(parseInt(limitParam ?? "50") || 50, maxLimit);
  const offset = (pageNum - 1) * limit;

  const conditions = adminMode ? [] : [...mapBusinessPublicListConditions()];
  if (adminMode && String(activeOnly ?? "") === "1") {
    conditions.push(eq(mapBusinessesTable.isActive, true));
  }
  if (adminMode && String(excludeLinkedVendors ?? "") === "1") {
    conditions.push(sql`NOT EXISTS (SELECT 1 FROM vendors v WHERE v.linked_map_business_id = ${mapBusinessesTable.id})`);
  }
  if (q) {
    conditions.push(or(
      ilike(mapBusinessesTable.name, `%${q}%`),
      ilike(mapBusinessesTable.address, `%${q}%`),
      ilike(mapBusinessesTable.description, `%${q}%`),
    )!);
  }
  if (city) conditions.push(eq(mapBusinessesTable.cityId, city));
  if (category) conditions.push(or(
    eq(mapBusinessesTable.categoryId, category),
    ilike(mapCategoriesTable.name, `%${category}%`),
  )!);

  const whereClause = conditions.length ? and(...conditions) : undefined;

  let listQuery = db
    .select({
      business: mapBusinessesTable,
      category: mapCategoriesTable,
      city: mapCitiesTable,
    })
    .from(mapBusinessesTable)
    .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
    .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
    .$dynamic();
  if (whereClause) listQuery = listQuery.where(whereClause);
  /**
   * Yönetici listesi:
   * - Arama yokken: `createdAt` önce (anasayfa `recent-public` ile aynı mantık) — yeni kazılan işletmeler
   *   binlerce kayıt varken ilk sayfada kaybolmaz.
   * - Arama varken: düzenlenen kayıt üstte kalsın diye `updatedAt` önce.
   */
  const adminOrderBy = q?.trim()
    ? [desc(mapBusinessesTable.updatedAt), desc(mapBusinessesTable.createdAt)]
    : [desc(mapBusinessesTable.createdAt), desc(mapBusinessesTable.updatedAt)];
  const rows = adminMode
    ? await listQuery
        .orderBy(...adminOrderBy)
        .limit(limit)
        .offset(offset)
    : await listQuery
        .orderBy(...mapBusinessPublicRankingOrder(true))
        .limit(limit)
        .offset(offset);

  const [countRow] = whereClause
    ? await db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable).where(whereClause)
    : await db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable);

  res.json({
    success: true,
    data: rows.map(r => ({ ...r.business, category: r.category, city: r.city })),
    total: countRow?.count ?? 0,
    page: pageNum,
  });
});

router.get("/map/businesses/:id", async (req, res): Promise<void> => {
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ success: false, error: "Geçersiz işletme kimliği" });
    return;
  }
  if (looksLikeBrokenMapBusinessUuid(id)) {
    res.status(404).json({ success: false, error: "İşletme bulunamadı" });
    return;
  }
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  // Görünürlük SQL parçaları (MAP_BUSINESS_PUBLIC_*) ile id/slug AND birleşince üretimde
  // lookup filtresi etkisiz kalıp rastgele ilk kayıt dönebiliyordu → Sarı Sayfalar 404.
  const hit = await fetchMapBusinessRowByPublicLookup(id);
  if (!hit) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }

  let bizRow = hit.business;
  // Auto-generate slug if missing
  if (!bizRow.slug && bizRow.name) {
    const base = toSlug(bizRow.name);
    let slug = base; let attempt = 1;
    while (true) {
      const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable)
        .where(and(eq(mapBusinessesTable.slug, slug), sql`id != ${bizRow.id}`)).limit(1);
      if (clash.length === 0) break;
      slug = `${base}-${++attempt}`;
    }
    const [updated] = await db.update(mapBusinessesTable).set({ slug }).where(eq(mapBusinessesTable.id, bizRow.id)).returning();
    if (updated) bizRow = updated;
  }

  const business = enrichMapBusinessContactFields(enrichMapBusinessLocationFields(normalizeMapImageFields({
    ...bizRow,
    category: hit.category,
    city: hit.city,
    district: hit.district,
    hasPublicProfile: Boolean(hit.hasPublicProfile),
  })));

  // Get reviews
  const reviewPlaceId = extractCleanGooglePlaceId(business.googlePlaceId) ?? business.googlePlaceId ?? id;
  const reviews = await db.select({
    review: mapReviewsTable,
    user: mapUsersTable,
  }).from(mapReviewsTable)
    .leftJoin(mapUsersTable, eq(mapReviewsTable.userId, mapUsersTable.id))
    .where(or(
      eq(mapReviewsTable.businessId, business.id),
      reviewPlaceId ? eq(mapReviewsTable.googlePlaceId, reviewPlaceId) : sql`FALSE`,
    ))
    .orderBy(desc(mapReviewsTable.createdAt))
    .limit(10);

  res.json({
    success: true,
    data: {
      ...business,
      // by-slug ile tutarlı gerçek hesap: salt kazınan kayıtta false → istemci haritaya yönlendirir.
      hasPublicProfile: Boolean(hit.hasPublicProfile),
      reviews: reviews.map(r => ({
        ...r.review,
        user: r.user ? { id: r.user.id, displayName: r.user.displayName, firstName: r.user.firstName, photoUrl: r.user.photoUrl } : null,
      })),
    },
  });
});

router.post("/map/businesses", async (req, res): Promise<void> => {
  const { name, googlePlaceId, categoryId, cityId, districtId, address, phone, website, rating, photoUrl, latitude, longitude, isPremium, description } = req.body;
  if (!name) { res.status(400).json({ success: false, error: "name gerekli" }); return; }
  const descText = String(description ?? "").trim();
  const generatedAbout =
    !descText
      ? await generateMapBusinessAboutText({
          name: String(name),
          address: address != null ? String(address) : null,
        })
      : null;
  const [row] = await db.insert(mapBusinessesTable).values({
    name, googlePlaceId, categoryId, cityId, districtId, address, phone, website,
    rating: rating ? parseFloat(rating) : null,
    photoUrl, latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    isPremium: isPremium === true || isPremium === "true",
    description: descText || generatedAbout || null,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

/**
 * İşletme premium'a çevrildiğinde Google Places API (New) ile kazımayla alınamayan tüm
 * bilgileri çeker ve kalıcı yazar: hakkında (editorial/generative özet), tam çalışma
 * saatleri, yoğunluk/özet meta (popularHours), rezervasyon + servis bayrakları, yüksek
 * çözünürlüklü fotoğraflar, iletişim. Arka planda (fire-and-forget) çağrılır; hatalar
 * akışı bozmaz. (Menü/yoğunluk çubuğu REST'te yoktur; premium detay açılışında derin
 * Puppeteer kazıması bunları tamamlar.)
 */
async function enrichPremiumBusinessFromGoogle(
  businessId: string,
  logger?: Pick<typeof console, "info" | "warn" | "error">,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const [biz] = await db.select().from(mapBusinessesTable).where(eq(mapBusinessesTable.id, businessId)).limit(1);
    if (!biz) return { ok: false, reason: "not_found" };
    const placeId = String(biz.googlePlaceId ?? "").trim();
    if (!placeId) return { ok: false, reason: "no_place_id" };
    const apiKey = await resolveGooglePlacesApiKey();
    if (!apiKey) return { ok: false, reason: "no_api_key" };

    const details = await fetchPlaceDetailsNew(apiKey, placeId);
    if (!details.ok) {
      logger?.warn({ businessId, status: details.status, message: details.message }, "premium enrich: places-new failed");
      return { ok: false, reason: `places_new_${details.status}` };
    }
    const p = details.place;
    const editorial = (p.editorialSummary as { text?: string } | undefined)?.text;
    const generative = (p.generativeSummary as { overview?: { text?: string } } | undefined)?.overview?.text;
    const about = String(editorial || generative || "").trim() || null;
    const phone = String((p.nationalPhoneNumber as string) || (p.internationalPhoneNumber as string) || "").trim() || null;
    const website = String((p.websiteUri as string) || "").trim() || null;
    const reservable = p.reservable === true;
    const rating = typeof p.rating === "number" ? p.rating : null;
    const reviewCount = typeof p.userRatingCount === "number" ? Math.round(p.userRatingCount) : null;

    const weekdayText =
      (p.currentOpeningHours as { weekdayDescriptions?: string[] } | undefined)?.weekdayDescriptions ??
      (p.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined)?.weekdayDescriptions ??
      [];
    const workingHours: Record<string, string> = {};
    for (const line of weekdayText) {
      const idx = String(line).indexOf(":");
      if (idx > 0) {
        const day = String(line).slice(0, idx).trim();
        const hrs = String(line).slice(idx + 1).trim();
        if (day && hrs) workingHours[day] = hrs;
      }
    }

    const photoUrls = buildNewApiPhotoMediaUrls(p.photos, apiKey, 10, 1600);

    const prevExtras = (biz.googlePlacesExtras ?? null) as Record<string, unknown> | null;
    const updates: Record<string, unknown> = {
      googlePlacesExtras: {
        ...(prevExtras && typeof prevExtras === "object" ? prevExtras : {}),
        placesApiNew: sanitizePlacesNewForExtras(p),
      },
      popularHours: buildPopularHoursFromPlacesNew(p),
      scrapedAt: new Date(),
      updatedAt: new Date(),
    };
    if (about) updates.description = about;
    if (phone) updates.phone = phone;
    if (website) updates.website = website;
    if (reservable) updates.hasReservation = true;
    if (rating != null) updates.rating = rating;
    if (reviewCount != null) updates.userRatingsTotal = reviewCount;
    if (Object.keys(workingHours).length) updates.workingHours = workingHours;
    if (photoUrls.length) {
      updates.scrapedPhotos = photoUrls;
      updates.photoUrl = photoUrls[0];
      updates.coverPhotoUrl = photoUrls[0];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.update(mapBusinessesTable).set(updates as any).where(eq(mapBusinessesTable.id, businessId));

    if (photoUrls.length) {
      await db.delete(mapBusinessImagesTable).where(eq(mapBusinessImagesTable.businessId, businessId));
      for (let i = 0; i < photoUrls.length; i++) {
        const u = photoUrls[i];
        if (!u) continue;
        await db.insert(mapBusinessImagesTable).values({ businessId, imageUrl: u, sortOrder: i, isPrimary: i === 0 });
      }
    }
    logger?.info({ businessId, photos: photoUrls.length, about: Boolean(about) }, "premium enrich: ok");
    return { ok: true };
  } catch (err) {
    logger?.error({ businessId, err: String(err) }, "premium enrich: exception");
    return { ok: false, reason: "exception" };
  }
}

router.put("/map/businesses/:id", async (req, res): Promise<void> => {
  const { name, googlePlaceId, categoryId, cityId, districtId, address, phone, website, rating, photoUrl, latitude, longitude, isPremium, isActive, description, premiumExpiresAt, homepageFeatured, coverPhotoUrl, tags, instagramUrl, facebookUrl, twitterUrl, menuUrl, hasDelivery, hasReservation, hasOnlineOrder, storeType, homepageSuperCategory } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (googlePlaceId !== undefined) updates.googlePlaceId = googlePlaceId;
  if (categoryId !== undefined) updates.categoryId = categoryId;
  if (cityId !== undefined) updates.cityId = cityId;
  if (districtId !== undefined) updates.districtId = districtId;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (website !== undefined) updates.website = website;
  if (description !== undefined) updates.description = description;
  if (photoUrl !== undefined) updates.photoUrl = photoUrl;
  if (coverPhotoUrl !== undefined) updates.coverPhotoUrl = coverPhotoUrl;
  if (rating !== undefined) updates.rating = rating !== null ? parseFloat(rating) : null;
  if (latitude !== undefined) updates.latitude = latitude !== null ? parseFloat(latitude) : null;
  if (longitude !== undefined) updates.longitude = longitude !== null ? parseFloat(longitude) : null;
  if (isPremium !== undefined) updates.isPremium = isPremium === true || isPremium === "true";
  if (isActive !== undefined) updates.isActive = isActive === true || isActive === "true";
  if (homepageFeatured !== undefined) updates.homepageFeatured = homepageFeatured === true || homepageFeatured === "true";
  if (hasDelivery !== undefined) updates.hasDelivery = hasDelivery === true || hasDelivery === "true";
  if (hasReservation !== undefined) updates.hasReservation = hasReservation === true || hasReservation === "true";
  if (hasOnlineOrder !== undefined) updates.hasOnlineOrder = hasOnlineOrder === true || hasOnlineOrder === "true";
  if (tags !== undefined) updates.tags = tags;
  if (instagramUrl !== undefined) updates.instagramUrl = instagramUrl;
  if (facebookUrl !== undefined) updates.facebookUrl = facebookUrl;
  if (twitterUrl !== undefined) updates.twitterUrl = twitterUrl;
  if (menuUrl !== undefined) updates.menuUrl = menuUrl;
  if (premiumExpiresAt !== undefined) updates.premiumExpiresAt = premiumExpiresAt ? new Date(premiumExpiresAt) : null;
  if (storeType !== undefined) updates.storeType = storeType || null;
  if (homepageSuperCategory !== undefined) updates.homepageSuperCategory = homepageSuperCategory || null;
  if (updates.homepageFeatured === true) {
    const [current] = await db
      .select({ isPremium: mapBusinessesTable.isPremium })
      .from(mapBusinessesTable)
      .where(eq(mapBusinessesTable.id, req.params.id))
      .limit(1);
    if (!current) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }
    if (!current.isPremium) {
      res.status(400).json({ success: false, error: "Öne çıkan yalnızca premium işletmeler için açılabilir." });
      return;
    }
  }
  // Premium false→true geçişini yakala (Google Places API zenginleştirmesi için).
  let wasPremiumBefore = true;
  if (updates.isPremium === true) {
    const [prev] = await db
      .select({ isPremium: mapBusinessesTable.isPremium })
      .from(mapBusinessesTable)
      .where(eq(mapBusinessesTable.id, req.params.id))
      .limit(1);
    wasPremiumBefore = Boolean(prev?.isPremium);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db.update(mapBusinessesTable).set(updates as any).where(eq(mapBusinessesTable.id, req.params.id)).returning();
  if (!row) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }
  // Yeni premium olduysa: arka planda Places API ile tüm bilgileri çek (isteği bloklamaz).
  if (updates.isPremium === true && !wasPremiumBefore) {
    void enrichPremiumBusinessFromGoogle(req.params.id, req.log).catch(() => {});
  }
  res.json({ success: true, data: row });
});

/** POST /map/admin/businesses/:id/premium-enrich — premium işletme için Google Places API
 *  zenginleştirmesini elle tetikler (hakkında, saatler, yoğunluk, rezervasyon, foto, iletişim). */
router.post("/map/admin/businesses/:id/premium-enrich", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const out = await enrichPremiumBusinessFromGoogle(req.params.id, req.log);
  if (!out.ok) {
    const code = out.reason === "not_found" ? 404 : out.reason === "no_place_id" || out.reason === "no_api_key" ? 400 : 502;
    res.status(code).json({ success: false, error: `Zenginleştirme başarısız: ${out.reason}` });
    return;
  }
  res.json({ success: true, message: "İşletme Google Places API ile zenginleştirildi." });
});

router.delete("/map/businesses/:id", async (req, res): Promise<void> => {
  await purgeMapBusinessIds([req.params.id]);
  res.json({ success: true, message: "İşletme silindi" });
});

/** GET /map/admin/businesses — yönetici işletme listesi (tüm kayıtlar, gelişmiş süzgeçler). */
router.get("/map/admin/businesses", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;

  const {
    q,
    city,
    district,
    category,
    superCategory,
    page,
    limit: limitParam,
    active,
    premium,
    importSource,
    missingContact,
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page ?? "1") || 1);
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50") || 50, 1), 500);
  const offset = (pageNum - 1) * limit;

  const conditions: SQL[] = [];

  if (q?.trim()) {
    conditions.push(or(
      ilike(mapBusinessesTable.name, `%${q.trim()}%`),
      ilike(mapBusinessesTable.address, `%${q.trim()}%`),
    )!);
  }

  const citySlugParam = String(req.query["citySlug"] ?? "").trim();
  const cityParam = String(city ?? "").trim();
  let resolvedAdminCityId: string | null = null;
  if (cityParam || citySlugParam) {
    resolvedAdminCityId = await resolveExistingMapCityId(cityParam, citySlugParam);
    const canonicalCity = canonicalMapCityLabel(cityParam, citySlugParam);
    conditions.push(buildMapCityScopeCondition(resolvedAdminCityId, canonicalCity, null));
  }

  if (district?.trim()) {
    conditions.push(await buildMapDistrictScopeCondition(district.trim(), resolvedAdminCityId));
  }

  if (category?.trim()) {
    const catCond = await resolveMapCategoryFilterCondition(category.trim());
    if (catCond) conditions.push(catCond);
  }

  const superWhere = homepageSuperCategoryWhere(superCategory);
  if (superWhere) conditions.push(superWhere);

  if (active === "1" || active === "true") conditions.push(eq(mapBusinessesTable.isActive, true));
  else if (active === "0" || active === "false") conditions.push(eq(mapBusinessesTable.isActive, false));

  if (premium === "1" || premium === "true") conditions.push(eq(mapBusinessesTable.isPremium, true));
  else if (premium === "0" || premium === "false") conditions.push(eq(mapBusinessesTable.isPremium, false));

  if (importSource?.trim()) conditions.push(eq(mapBusinessesTable.importSource, importSource.trim()));

  const missingContactParam = String(missingContact ?? "").trim().toLowerCase();
  if (missingContactParam === "1" || missingContactParam === "true" || missingContactParam === "any") {
    conditions.push(...gmapsScrapeMissingContactConditions("any"));
  } else if (missingContactParam === "both") {
    conditions.push(...gmapsScrapeMissingContactConditions("both"));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  let listQuery = db
    .select({
      business: mapBusinessesTable,
      category: mapCategoriesTable,
      city: mapCitiesTable,
      district: mapDistrictsTable,
    })
    .from(mapBusinessesTable)
    .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
    .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
    .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
    .$dynamic();
  if (whereClause) listQuery = listQuery.where(whereClause);

  const adminOrderBy = q?.trim()
    ? [desc(mapBusinessesTable.updatedAt), desc(mapBusinessesTable.createdAt)]
    : [desc(mapBusinessesTable.createdAt), desc(mapBusinessesTable.updatedAt)];

  const rows = await listQuery.orderBy(...adminOrderBy).limit(limit).offset(offset);

  const [countRow] = whereClause
    ? await db
      .select({ count: sql<number>`count(distinct ${mapBusinessesTable.id})::int` })
      .from(mapBusinessesTable)
      .leftJoin(mapCategoriesTable, eq(mapBusinessesTable.categoryId, mapCategoriesTable.id))
      .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
      .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
      .where(whereClause)
    : await db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable);

  res.json({
    success: true,
    data: rows.map((r) => {
      const base = enrichMapBusinessLocationFields({
        ...r.business,
        category: r.category,
        city: r.city,
        district: r.district,
      });
      const enriched = enrichMapBusinessContactFields(base);
      const dbPhone = trimMapContactField(r.business.phone);
      const dbAddress = trimMapContactField(r.business.address);
      return {
        ...enriched,
        dbPhone,
        dbAddress,
        hasContactInDb: hasMapBusinessContact(dbPhone, dbAddress),
      };
    }),
    total: countRow?.count ?? 0,
    page: pageNum,
    limit,
  });
});

/** POST /map/admin/businesses/bulk — toplu sil / premium / aktif / kategori / şehir taşıma. */
router.post("/map/admin/businesses/bulk", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const body = req.body as {
      action?: string;
      ids?: string[];
      payload?: Record<string, unknown>;
    };
    const action = String(body.action ?? "").trim();
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    if (ids.length === 0) {
      res.status(400).json({ success: false, error: "ids dizisi gerekli" });
      return;
    }
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

    switch (action) {
      case "delete": {
        await purgeMapBusinessIds(ids);
        res.json({ success: true, affected: ids.length, action });
        return;
      }
      case "setPremium": {
        const isPremium = payload.isPremium === true || payload.isPremium === "true";
        await db
          .update(mapBusinessesTable)
          .set({ isPremium, updatedAt: new Date() })
          .where(inArray(mapBusinessesTable.id, ids));
        res.json({ success: true, affected: ids.length, action });
        return;
      }
      case "setActive": {
        const isActive = payload.isActive !== false && payload.isActive !== "false";
        await db
          .update(mapBusinessesTable)
          .set({ isActive, updatedAt: new Date() })
          .where(inArray(mapBusinessesTable.id, ids));
        res.json({ success: true, affected: ids.length, action });
        return;
      }
      case "setCategory": {
        const categoryId = typeof payload.categoryId === "string" ? payload.categoryId : null;
        if (!categoryId) {
          res.status(400).json({ success: false, error: "payload.categoryId gerekli" });
          return;
        }
        await db
          .update(mapBusinessesTable)
          .set({ categoryId, updatedAt: new Date() })
          .where(inArray(mapBusinessesTable.id, ids));
        res.json({ success: true, affected: ids.length, action });
        return;
      }
      case "setSuperCategory": {
        const homepageSuperCategory =
          typeof payload.homepageSuperCategory === "string" ? payload.homepageSuperCategory : null;
        if (!homepageSuperCategory) {
          res.status(400).json({ success: false, error: "payload.homepageSuperCategory gerekli" });
          return;
        }
        const storeType = typeof payload.storeType === "string" ? payload.storeType : undefined;
        const updates: { homepageSuperCategory: string; storeType?: string | null; updatedAt: Date } = {
          homepageSuperCategory,
          updatedAt: new Date(),
        };
        if (storeType !== undefined) updates.storeType = storeType || null;
        await db.update(mapBusinessesTable).set(updates).where(inArray(mapBusinessesTable.id, ids));
        res.json({ success: true, affected: ids.length, action });
        return;
      }
      case "setCity": {
        const cityId = typeof payload.cityId === "string" ? payload.cityId : null;
        if (!cityId) {
          res.status(400).json({ success: false, error: "payload.cityId gerekli" });
          return;
        }
        await db
          .update(mapBusinessesTable)
          .set({ cityId, districtId: null, updatedAt: new Date() })
          .where(inArray(mapBusinessesTable.id, ids));
        res.json({ success: true, affected: ids.length, action });
        return;
      }
      default:
        res.status(400).json({ success: false, error: `Geçersiz action: ${action || "(boş)"}` });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** Yönetici: harita işletmelerini toplu sil (sipariş / mağaza tablolarına dokunmaz). */
router.post("/map/admin/businesses/bulk-delete", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const body = req.body as { ids?: string[]; deleteAll?: boolean; confirm?: string };
    if (body.deleteAll === true) {
      if (body.confirm !== "HARITA_ISLETMELERINI_SIL") {
        res.status(400).json({
          success: false,
          error: "Tüm harita işletmelerini silmek için JSON gövdesinde confirm: \"HARITA_ISLETMELERINI_SIL\" gönderin.",
        });
        return;
      }
      const all = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable);
      const ids = all.map((r) => r.id);
      await purgeMapBusinessIds(ids);
      res.json({ success: true, deleted: ids.length, message: `${ids.length} harita işletmesi silindi.` });
      return;
    }
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    if (ids.length === 0) {
      res.status(400).json({ success: false, error: "ids dizisi gerekli veya deleteAll + confirm kullanın." });
      return;
    }
    await purgeMapBusinessIds(ids);
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — GOOGLE PLACES PROXY ─────────────────────────────────────────── */

/** GET /map/businesses/:id/google-details
 *  Fetches live photos/opening status from Google Places API.
 *  Photos are returned as proxy URLs (/map/places/photo?ref=...).
 */
router.get("/map/businesses/:id/google-details", async (req, res): Promise<void> => {
  try {
    const id = req.params.id;
    // Listedeki/by-slug ile aynı görünürlük: tüm kayıtlar (pasif dahil) erişilebilir.
    const biz = await db.select().from(mapBusinessesTable)
      .where(mapBusinessLookupCondition(id))
      .limit(1);

    if (biz.length === 0) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }
    const business = biz[0];

    // Helper: build photo list from DB images table + scrapedPhotos + photoUrl/coverPhotoUrl fallback
    async function getDbPhotos() {
      const dbImgs = await db.select().from(mapBusinessImagesTable)
        .where(eq(mapBusinessImagesTable.businessId, business.id))
        .orderBy(asc(mapBusinessImagesTable.sortOrder));
      const seen = new Set<string>();
      const photos: { url: string; width: number; height: number }[] = [];
      const addPhoto = (url: string, w = 800, h = 600) => {
        const normalized = normalizeImageUrlValue(url) || "";
        if (normalized && !seen.has(normalized)) { seen.add(normalized); photos.push({ url: normalized, width: w, height: h }); }
      };
      // 1. DB images table (highest priority — manually curated or scraper-saved)
      dbImgs.forEach(img => addPhoto(img.imageUrl, 800, 600));
      // 2. scrapedPhotos JSONB field
      if (Array.isArray(business.scrapedPhotos)) {
        (business.scrapedPhotos as string[]).forEach(u => addPhoto(u, 1200, 800));
      }
      // 3. coverPhotoUrl / photoUrl fallback
      if (business.coverPhotoUrl) addPhoto(business.coverPhotoUrl, 1200, 800);
      if (business.photoUrl) addPhoto(business.photoUrl, 800, 600);
      // Kayıtlı görseller (DB images + scrapedPhotos) kota harcamaz → tam galeri göster.
      return photos.slice(0, SCRAPED_MEDIA_DISPLAY_LIMIT);
    }

    // Helper: convert workingHours Record<string,string> → weekdayText string[]
    function buildWeekdayText(wh: unknown): string[] | undefined {
      if (!wh || typeof wh !== "object") return undefined;
      const map = wh as Record<string, string>;
      const order = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
      const result: string[] = [];
      for (const day of order) {
        if (map[day]) result.push(`${day}: ${map[day]}`);
      }
      return result.length ? result : undefined;
    }

    // Helper: get platform reviews plus sanitized imported Google snippets.
    async function getDbReviews() {
      const rows = await db.select({
        review: mapReviewsTable,
        user: { displayName: mapUsersTable.displayName, photoUrl: mapUsersTable.photoUrl },
      }).from(mapReviewsTable)
        .leftJoin(mapUsersTable, eq(mapReviewsTable.userId, mapUsersTable.id))
        .where(eq(mapReviewsTable.businessId, business.id))
        .orderBy(desc(mapReviewsTable.createdAt))
        .limit(20);
      type BizReview = {
        authorName: string;
        profilePhoto: string | null;
        rating: number;
        relativeTime: string;
        text: string;
        time: number;
        source: "platform" | "google";
      };
      const platformReviews: BizReview[] = rows.map((r) => ({
        authorName: r.user?.displayName || "Kullanıcı",
        profilePhoto: r.user?.photoUrl || null,
        rating: r.review.rating,
        relativeTime: new Date(r.review.createdAt).toLocaleDateString("tr-TR"),
        text: r.review.comment || "",
        time: new Date(r.review.createdAt).getTime(),
        source: "platform",
      }));
      const importedReviews: BizReview[] = [];
      if (Array.isArray(business.scrapedReviews)) {
        for (const r of (business.scrapedReviews as Array<Record<string, unknown>>).slice(0, SCRAPED_MEDIA_DISPLAY_LIMIT)) {
          const rating = Number(r.rating);
          const text = String(r.text ?? "").trim();
          if (!Number.isFinite(rating) || !text) continue;
          importedReviews.push({
            authorName: String(r.authorName ?? "Misafir").trim() || "Misafir",
            profilePhoto: typeof r.profilePhoto === "string" ? r.profilePhoto : null,
            rating,
            relativeTime: String(r.relativeTime ?? "").trim(),
            text,
            time: typeof r.time === "number" ? r.time * 1000 : 0,
            source: "google",
          });
        }
      }
      const merged = [...platformReviews, ...importedReviews];
      return merged.slice(0, SCRAPED_MEDIA_DISPLAY_LIMIT);
    }

    // Helper: build full fallback response from DB
    async function dbFallbackResponse() {
      const [photos, reviews] = await Promise.all([getDbPhotos(), getDbReviews()]);
      const hasScrapedPhotos = Array.isArray(business.scrapedPhotos) && (business.scrapedPhotos as unknown[]).length > 0;
      // Standard imported businesses do not auto-scrape Google review/comment or about text.
      // once scrapedAt is set we stop auto-retrying (manual force=1 param can override)
      const needsScrape = Boolean(business.isPremium)
        && !business.scrapedAt
        && !!(business.name && (business.latitude || business.address))
        && !hasScrapedPhotos;
      return {
        photos,
        reviews,
        hasMore: false,
        totalReviews: (business.userRatingsTotal || 0) > reviews.length
          ? business.userRatingsTotal
          : reviews.length,
        scrapedReviewCount: 0,
        editorialSummary: undefined,
        weekdayText: buildWeekdayText(business.workingHours),
        needsScrape,
        businessId: business.id,
      };
    }

    // Kazıyıcı `googlePlaceId`'si genelde `data=...!19s<place_id>` blob'udur; gerçek
    // place_id'yi ayıkla. Ayıklanamıyorsa (sentetik/çözülemez) Google çağrısı yapma.
    const cleanPlaceId = extractCleanGooglePlaceId(business.googlePlaceId);
    if (!cleanPlaceId) {
      res.json({ success: true, data: await dbFallbackResponse() });
      return;
    }

    const apiKey = await resolveGooglePlacesApiKey();

    if (!apiKey) {
      // No Google key — serve scraped/DB data
      res.json({ success: true, data: await dbFallbackResponse() });
      return;
    }

    // Kazınan (premium olmayan) işletmelerde yorum/foto DB'de boş kalabildiğinden
    // Places API'dan da `reviews` istenir; böylece detay kartında yorumlar görünür.
    const fields = "photos,opening_hours,reviews,rating,user_ratings_total";
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(cleanPlaceId)}&fields=${fields}&language=tr&key=${apiKey}`;

    const gRes = await fetch(url);
    const gData = await gRes.json() as {
      status: string;
      result?: {
        photos?: Array<{ photo_reference: string; width: number; height: number; html_attributions?: string[] }>;
        opening_hours?: { open_now?: boolean; weekday_text?: string[] };
        rating?: number;
        user_ratings_total?: number;
        reviews?: Array<{
          author_name?: string;
          profile_photo_url?: string;
          rating?: number;
          relative_time_description?: string;
          text?: string;
          time?: number;
        }>;
      };
    };

    if (gData.status !== "OK" || !gData.result) {
      req.log.warn({ status: gData.status, placeId: business.googlePlaceId }, "Google Places API error — falling back to DB data");
      // Fall back to scraped/DB data instead of returning empty arrays
      res.json({ success: true, data: { ...await dbFallbackResponse(), googleStatus: gData.status } });
      return;
    }

    const result = gData.result;

    // Places API foto proxy'si kota harcadığı için sınırlı tutulur; kayıtlı
    // (scraped) görseller aşağıda eklenir ve galeri tam gösterilir.
    const apiPhotoLimit = business.isPremium ? 10 : GOOGLE_IMPORT_MEDIA_LIMIT;
    const photos = (result.photos || []).slice(0, apiPhotoLimit).map(p => ({
      url: `/api/map/places/photo?ref=${encodeURIComponent(p.photo_reference)}&maxwidth=800`,
      width: p.width,
      height: p.height,
    }));

    const dbReviews = await getDbReviews();
    // Google Places API yorumları (en çok 5) — DB'de yorum yoksa/azsa bunları ekle.
    const googleReviews = (result.reviews ?? [])
      .map((r) => {
        const rating = Number(r.rating);
        const text = String(r.text ?? "").trim();
        if (!Number.isFinite(rating)) return null;
        return {
          authorName: String(r.author_name ?? "Misafir").trim() || "Misafir",
          profilePhoto: typeof r.profile_photo_url === "string" ? r.profile_photo_url : null,
          rating,
          relativeTime: String(r.relative_time_description ?? "").trim(),
          text,
          time: typeof r.time === "number" ? r.time * 1000 : 0,
          source: "google" as const,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    // DB + Google yorumlarını birleştir (yazar+metin ile tekilleştir).
    const reviewDedupe = new Set(dbReviews.map((r) => `${r.authorName}|${r.text}`));
    const mergedReviews = [...dbReviews];
    for (const gr of googleReviews) {
      const key = `${gr.authorName}|${gr.text}`;
      if (reviewDedupe.has(key)) continue;
      reviewDedupe.add(key);
      mergedReviews.push(gr);
    }
    const reviews = mergedReviews.slice(0, SCRAPED_MEDIA_DISPLAY_LIMIT);

    // Photos: merge Google photos with DB photos (Google first, no duplicates)
    const dbPhotos = await getDbPhotos();
    const googlePhotoUrls = new Set(photos.map(p => p.url));
    const extraDbPhotos = dbPhotos.filter(p => !googlePhotoUrls.has(p.url));
    const mergedPhotos = [...photos, ...extraDbPhotos].slice(0, SCRAPED_MEDIA_DISPLAY_LIMIT);

    res.json({
      success: true,
      data: {
        photos: mergedPhotos,
        reviews,
        hasMore: false,
        totalReviews: Math.max(reviews.length, business.userRatingsTotal || 0),
        openNow: result.opening_hours?.open_now,
        weekdayText: result.opening_hours?.weekday_text,
        editorialSummary: undefined,
        // DB-fallback dalıyla aynı alan setini döndür (istemci tutarlılığı).
        scrapedReviewCount: 0,
        needsScrape: Boolean(business.isPremium)
          && !business.scrapedAt
          && !!(business.name && (business.latitude || business.address))
          && !(Array.isArray(business.scrapedPhotos) && (business.scrapedPhotos as unknown[]).length > 0),
        businessId: business.id,
      },
    });
  } catch (err) {
    req.log.error(err, "google-details error");
    res.status(500).json({ success: false, error: "Google Places API hatası" });
  }
});

/** POST /map/businesses/:id/scrape-detail
 *  Puppeteer ile Google Maps detayı. Görseller DB'ye yazılmaz (ne JSON ne map_business_images).
 *  Yorumlar: yalnızca premium işletme veya `?reviewsOnly=1` (premium sonrası) ile kalıcı yazılır.
 */
router.post("/map/businesses/:id/scrape-detail", async (req, res): Promise<void> => {
  try {
    const id = req.params.id;
    const reviewsOnly = req.query["reviewsOnly"] === "1";
    const biz = await db.select().from(mapBusinessesTable)
      .where(mapBusinessLookupCondition(id))
      .limit(1);

    if (biz.length === 0) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }
    const business = biz[0];

    const hasReviews = Array.isArray(business.scrapedReviews) && (business.scrapedReviews as unknown[]).length > 0;
    const force = req.query["force"] === "1";
    const persistReviews = business.isPremium || reviewsOnly;

    if (reviewsOnly) {
      if (!force && hasReviews) {
        res.json({ success: true, cached: true, message: "Yorumlar zaten mevcut" });
        return;
      }
    } else if (!force && !reviewsOnly && !business.isPremium && business.scrapedAt) {
      res.json({ success: true, cached: true, message: "İşletme detayı daha önce çekildi (yorumlar premium ile)" });
      return;
    } else if (!force && business.isPremium && hasReviews) {
      res.json({ success: true, cached: true, message: "Veriler zaten mevcut" });
      return;
    }

    // Build search query from name + address
    const query = [business.name, business.address, "Türkiye"].filter(Boolean).join(" ");
    req.log.info({ businessId: business.id, query, reviewsOnly, persistReviews }, "Scraping Google Maps for business detail");

    const { scrapeBusinessDetail } = await import("../lib/gmaps-scraper.js");
    const scraped = await scrapeBusinessDetail({
      name: business.name,
      address: business.address,
      lat: business.latitude ? Number(business.latitude) : null,
      lng: business.longitude ? Number(business.longitude) : null,
    });

    const safeNum = (v: unknown) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : null; };
    const safeInt = (v: unknown) => { const n = Math.round(safeNum(v) ?? NaN); return Number.isFinite(n) ? n : null; };

    const scrapedRevs = Array.isArray(scraped.reviews) ? scraped.reviews : [];

    if (reviewsOnly) {
      await db.update(mapBusinessesTable).set({
        scrapedReviews: scrapedRevs.length ? scrapedRevs as unknown as Record<string, unknown> : business.scrapedReviews,
        rating: scraped.rating ? safeNum(scraped.rating) : business.rating,
        userRatingsTotal: scraped.reviewCount ? safeInt(scraped.reviewCount) : business.userRatingsTotal,
        scrapedAt: new Date(),
      }).where(eq(mapBusinessesTable.id, business.id));
      req.log.info({ businessId: business.id, reviews: scrapedRevs.length }, "Scrape reviews-only complete");
      res.json({ success: true, scraped: true, photos: 0, reviews: scrapedRevs.length, hasHours: false });
      return;
    }

    // Update DB — görseller kaydedilmez; kapak URL'si scrape ile güncellenmez
    await db.update(mapBusinessesTable).set({
      scrapedReviews: persistReviews && scrapedRevs.length
        ? scrapedRevs as unknown as Record<string, unknown>
        : business.scrapedReviews,
      workingHours: (scraped.workingHours ?? business.workingHours) as Record<string, string> | null,
      phone: scraped.phone || business.phone || null,
      website: scraped.website || business.website || null,
      rating: scraped.rating ? safeNum(scraped.rating) : business.rating,
      userRatingsTotal: scraped.reviewCount ? safeInt(scraped.reviewCount) : business.userRatingsTotal,
      description: scraped.description || business.description || null,
      googlePlaceId: scraped.googlePlaceId || business.googlePlaceId || null,
      address: scraped.address || business.address || null,
      scrapedAt: new Date(),
    }).where(eq(mapBusinessesTable.id, business.id));

    req.log.info({ businessId: business.id, reviews: scrapedRevs.length }, "Scrape complete (no image persistence)");
    res.json({
      success: true,
      scraped: true,
      photos: 0,
      reviews: persistReviews ? scrapedRevs.length : 0,
      hasHours: !!scraped.workingHours,
    });
  } catch (err) {
    req.log.error(err, "scrape-detail error");
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /map/admin/reset-scrape-status
 *  Clears scrapedAt for businesses that have working hours but NO photos and NO reviews,
 *  so they can be re-scraped on next visit.
 */
router.post("/map/admin/reset-scrape-status", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    // Find businesses that were scraped (scrapedAt set) but have no photos and no reviews
    const result = await db.update(mapBusinessesTable).set({ scrapedAt: null })
      .where(and(
        sql`${mapBusinessesTable.scrapedAt} IS NOT NULL`,
        sql`(${mapBusinessesTable.scrapedPhotos} IS NULL OR json_array_length(${mapBusinessesTable.scrapedPhotos}::json) = 0)`,
        sql`(${mapBusinessesTable.scrapedReviews} IS NULL OR json_array_length(${mapBusinessesTable.scrapedReviews}::json) = 0)`,
      )).returning({ id: mapBusinessesTable.id });
    res.json({ success: true, reset: result.length, message: `${result.length} işletmenin scrape durumu sıfırlandı` });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /map/admin/refresh-stale-place-photos?limit=50
 *  Legacy Google photo_reference URL'lerini Places API (New) ile toplu yeniler.
 */
router.post("/map/admin/refresh-stale-place-photos", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const apiKey = await resolveGooglePlacesApiKey();
    if (!apiKey) {
      res.status(503).json({ success: false, error: "Google Places API anahtarı yapılandırılmamış" });
      return;
    }
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query["limit"] || "50"), 10) || 50));
    const result = await bulkRefreshStaleLegacyPlacePhotos(apiKey, limit);
    res.json({
      success: true,
      message: `${result.refreshed}/${result.processed} bayat fotoğraf yenilendi`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /map/admin/bulk-scrape?limit=10
 *  Scrapes up to N businesses that have no scraped data (no photos, no reviews, no scrapedAt).
 *  Runs them sequentially to avoid overloading Puppeteer.
 */
router.post("/map/admin/bulk-scrape", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const limit = Math.min(parseInt(String(req.query["limit"] || "5")), 20);
  res.json({ success: true, message: `${limit} işletme için scrape başlatıldı (arka planda çalışıyor)`, limit });

  // Run in background without blocking response
  (async () => {
    try {
      const businesses = await db.select({
        id: mapBusinessesTable.id,
        name: mapBusinessesTable.name,
        address: mapBusinessesTable.address,
        latitude: mapBusinessesTable.latitude,
        longitude: mapBusinessesTable.longitude,
        homepageSuperCategory: mapBusinessesTable.homepageSuperCategory,
        storeType: mapBusinessesTable.storeType,
        homepageFeatured: mapBusinessesTable.homepageFeatured,
      }).from(mapBusinessesTable)
        .where(and(
          isNull(mapBusinessesTable.scrapedAt),
          sql`${mapBusinessesTable.name} IS NOT NULL`,
          sql`(${mapBusinessesTable.latitude} IS NOT NULL OR ${mapBusinessesTable.address} IS NOT NULL)`,
        ))
        .limit(limit);

      const { scrapeBusinessDetail } = await import("../lib/gmaps-scraper.js");

      for (const biz of businesses) {
        try {
          const scraped = await scrapeBusinessDetail({
            name: biz.name,
            address: biz.address,
            lat: biz.latitude ? Number(biz.latitude) : null,
            lng: biz.longitude ? Number(biz.longitude) : null,
          });

          const scrapedPhotos = Array.isArray(scraped.photos) ? scraped.photos.filter(isExternalImageReference).slice(0, 15) : [];
          const scrapedRevs = Array.isArray(scraped.reviews) ? scraped.reviews : [];
          const importPhotos = scrapedPhotos.length > 0
            ? scrapedPhotos
            : scraped.photoUrl
              ? [scraped.photoUrl].filter(isExternalImageReference)
              : [];
          const resolvedGallery = await resolveImportGalleryPhotos(importPhotos, {
            homepageSuperCategory: biz.homepageSuperCategory,
            storeType: biz.storeType,
            homepageFeatured: biz.homepageFeatured,
          });
          const coverPhoto = resolvedGallery.coverUrl || scraped.photoUrl || null;

          await db.update(mapBusinessesTable).set({
            scrapedPhotos: scrapedPhotos.length ? scrapedPhotos as unknown as Record<string, unknown> : null,
            scrapedReviews: scrapedRevs.length ? scrapedRevs as unknown as Record<string, unknown> : null,
            workingHours: scraped.workingHours as Record<string, string> | null,
            photoUrl: coverPhoto,
            coverPhotoUrl: coverPhoto,
            phone: scraped.phone || null,
            website: scraped.website || null,
            googlePlaceId: scraped.googlePlaceId || null,
            scrapedAt: new Date(),
          }).where(eq(mapBusinessesTable.id, biz.id));

          if (resolvedGallery.galleryPhotos.length > 0) {
            await insertMapBusinessImportImages(biz.id, resolvedGallery.galleryPhotos, 15);
          } else if (scrapedPhotos.length > 0) {
            for (let i = 0; i < scrapedPhotos.length; i++) {
              const url = scrapedPhotos[i]; if (!url) continue;
              await db.insert(mapBusinessImagesTable).values({
                businessId: biz.id, imageUrl: url, sortOrder: i, isPrimary: i === 0,
              }).onConflictDoNothing().catch(() => {});
            }
          }
        } catch { /* skip failed business */ }
      }
    } catch { /* swallow background errors */ }
  })();
});

function firstQueryValue(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").trim();
}

function normalizePhotoWidth(raw: unknown, fallback: number): string {
  const n = Number(firstQueryValue(raw) || fallback);
  if (!Number.isFinite(n)) return String(fallback);
  return String(Math.min(1600, Math.max(1, Math.round(n))));
}

function sendMissingPlacePhoto(res: Response, status = 404): void {
  res.status(status);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end();
}

/** GET /map/places/photo?ref=...&maxwidth=...
 *  Proxies Google Places photo requests so the API key never reaches the client.
 *  Missing/stale refs deliberately return an empty 204/404, not a noisy 5xx.
 */
router.get("/map/places/photo", async (req, res): Promise<void> => {
  try {
    const ref = firstQueryValue(req.query["ref"]);
    const maxwidth = normalizePhotoWidth(req.query["maxwidth"], 800);
    if (!ref) {
      sendMissingPlacePhoto(res, 204);
      return;
    }

    const apiKey = await resolveGooglePlacesApiKey();
    if (!apiKey) {
      sendMissingPlacePhoto(res);
      return;
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxwidth)}&photo_reference=${encodeURIComponent(ref)}&key=${encodeURIComponent(apiKey)}`;
    const gRes = await fetch(photoUrl, { redirect: "follow" });

    if (!gRes.ok) {
      const refreshed = await refreshStaleLegacyPlacePhotoRef(ref, apiKey, maxwidth);
      if (refreshed) {
        res.setHeader("Content-Type", refreshed.contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.send(refreshed.buffer);
        return;
      }
      sendMissingPlacePhoto(res);
      return;
    }

    const contentType = gRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buf = await gRes.arrayBuffer();
    const buffer = Buffer.from(buf);
    schedulePersistFetchedPlacePhotoToMedia(
      buffer,
      contentType,
      `/api/map/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(maxwidth)}`,
    );
    res.send(buffer);
  } catch (err) {
    req.log.warn({ err }, "places photo unavailable");
    sendMissingPlacePhoto(res);
  }
});

/** GET /map/places/photo-media?resource=places/.../photos/...&maxWidthPx=...
 *  Proxies Google Places API (New) photo media URLs so API keys never reach the client.
 */
router.get("/map/places/photo-media", async (req, res): Promise<void> => {
  try {
    const resource = firstQueryValue(req.query["resource"]).replace(/^\/+|\/+$/g, "");
    const maxWidthPx = normalizePhotoWidth(req.query["maxWidthPx"], 1200);
    if (!resource || !/^places\/[^/]+\/photos\/[^/]+$/.test(resource)) {
      sendMissingPlacePhoto(res, 204);
      return;
    }

    const apiKey = await resolveGooglePlacesApiKey();
    if (!apiKey) {
      sendMissingPlacePhoto(res);
      return;
    }

    const photoUrl = `https://places.googleapis.com/v1/${resource}/media?maxWidthPx=${encodeURIComponent(maxWidthPx)}&key=${encodeURIComponent(apiKey)}`;
    const gRes = await fetch(photoUrl, { redirect: "follow" });

    if (!gRes.ok) {
      const refreshed = await refreshStalePhotoMediaResource(resource, apiKey, maxWidthPx);
      if (refreshed) {
        res.setHeader("Content-Type", refreshed.contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.send(refreshed.buffer);
        return;
      }
      sendMissingPlacePhoto(res);
      return;
    }

    const contentType = gRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buf = await gRes.arrayBuffer();
    const buffer = Buffer.from(buf);
    schedulePersistFetchedPlacePhotoToMedia(
      buffer,
      contentType,
      `/api/map/places/photo-media?resource=${encodeURIComponent(resource)}&maxWidthPx=${encodeURIComponent(maxWidthPx)}`,
    );
    res.send(buffer);
  } catch (err) {
    req.log.warn({ err }, "places photo media unavailable");
    sendMissingPlacePhoto(res);
  }
});

/* — REVIEWS ─────────────────────────────────────────────────────── */

router.get("/map/businesses/:id/reviews", async (req, res): Promise<void> => {
  const lookupId = String(req.params.id ?? "").trim();
  const business = await db.select().from(mapBusinessesTable)
    .where(mapBusinessLookupCondition(lookupId))
    .limit(1);
  const googlePlaceId = extractCleanGooglePlaceId(business[0]?.googlePlaceId) ?? business[0]?.googlePlaceId ?? lookupId;

  const reviews = await db.select({
    review: mapReviewsTable,
    user: mapUsersTable,
  }).from(mapReviewsTable)
    .leftJoin(mapUsersTable, eq(mapReviewsTable.userId, mapUsersTable.id))
    .where(eq(mapReviewsTable.googlePlaceId, googlePlaceId))
    .orderBy(desc(mapReviewsTable.createdAt));

  res.json({
    success: true,
    data: reviews.map(r => ({
      ...r.review,
      user: r.user ? { id: r.user.id, displayName: r.user.displayName, firstName: r.user.firstName, lastName: r.user.lastName, photoUrl: r.user.photoUrl } : null,
    })),
  });
});

router.post("/map/reviews", mapAuthMiddleware, async (req, res): Promise<void> => {
  try {
    const authUser = (req as Request & { mapUser?: AuthUser }).mapUser!;
    const dbUser = await getOrCreateMapUser(authUser);
    if (!dbUser) { res.status(401).json({ success: false, error: "Kullanıcı bulunamadı" }); return; }

    const { googlePlaceId, rating, comment } = req.body;
    if (!googlePlaceId || !rating) { res.status(400).json({ success: false, error: "googlePlaceId ve rating gerekli" }); return; }

    const existing = await db.select().from(mapReviewsTable)
      .where(and(eq(mapReviewsTable.userId, dbUser.id), eq(mapReviewsTable.googlePlaceId, googlePlaceId)))
      .limit(1);

    let review;
    if (existing.length > 0) {
      [review] = await db.update(mapReviewsTable)
        .set({ rating: parseInt(String(rating)), comment: comment ?? null, updatedAt: new Date() })
        .where(eq(mapReviewsTable.id, existing[0].id)).returning();
    } else {
      [review] = await db.insert(mapReviewsTable).values({
        userId: dbUser.id, googlePlaceId, rating: parseInt(String(rating)), comment: comment ?? null,
      }).returning();
    }
    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — USER AUTH ──────────────────────────────────────────────────── */

router.post("/map/users/login", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ success: false, error: "Authorization header eksik" }); return; }

    if (!isFirebaseAdminConfigured()) {
      res.status(503).json({
        success: false,
        error:
          "Mobil Firebase girişi kapalı. Sunucuya yeni Firebase Admin ortam değişkenleri eklendikten sonra bu endpoint tekrar çalışır.",
      });
      return;
    }

    const fbUser = await verifyFirebaseToken(authHeader);
    const { phone, fcm_token } = req.body;

    const nameParts = (fbUser.name || "").trim().split(/\s+/);
    const existing = await db.select().from(mapUsersTable)
      .where(eq(mapUsersTable.firebaseUid, fbUser.uid)).limit(1);

    let user;
    if (existing.length > 0) {
      const updateData: Partial<typeof mapUsersTable.$inferInsert> = {
        email: fbUser.email ?? existing[0].email ?? undefined,
        displayName: fbUser.name ?? undefined,
        photoUrl: fbUser.picture ?? undefined,
        updatedAt: new Date(),
      };
      if (phone) updateData.phone = phone;
      if (fcm_token) updateData.fcmToken = fcm_token;
      [user] = await db.update(mapUsersTable).set(updateData).where(eq(mapUsersTable.id, existing[0].id)).returning();
    } else {
      [user] = await db.insert(mapUsersTable).values({
        firebaseUid: fbUser.uid,
        email: fbUser.email ?? null,
        firstName: nameParts[0] ?? null,
        lastName: nameParts.slice(1).join(" ") || null,
        displayName: fbUser.name ?? null,
        photoUrl: fbUser.picture ?? null,
        provider: fbUser.sign_in_provider === "apple.com" ? "apple" : "google",
        phone: phone ?? null,
        fcmToken: fcm_token ?? null,
      }).returning();
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(401).json({ success: false, error: String(err) });
  }
});

router.get("/map/users/me", mapAuthMiddleware, async (req, res): Promise<void> => {
  try {
    const authUser = (req as Request & { mapUser?: AuthUser }).mapUser!;
    const dbUser = await getOrCreateMapUser(authUser);
    if (!dbUser) { res.status(404).json({ success: false, error: "Kullanıcı bulunamadı" }); return; }
    res.json({ success: true, data: dbUser });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.put("/map/users/me", mapAuthMiddleware, async (req, res): Promise<void> => {
  try {
    const authUser = (req as Request & { mapUser?: AuthUser }).mapUser!;
    const dbUser = await getOrCreateMapUser(authUser);
    if (!dbUser) { res.status(404).json({ success: false, error: "Kullanıcı bulunamadı" }); return; }

    const { firstName, lastName, displayName, phone, cityId, districtId } = req.body;
    const [updated] = await db.update(mapUsersTable)
      .set({ firstName, lastName, displayName, phone, cityId, districtId, updatedAt: new Date() })
      .where(eq(mapUsersTable.id, dbUser.id)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — FAVORITES ──────────────────────────────────────────────────── */

router.get("/map/favorites", mapAuthMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as Request & { mapUser?: AuthUser }).mapUser!;
  const dbUser = await getOrCreateMapUser(authUser);
  if (!dbUser) { res.status(401).json({ success: false, error: "Kullanıcı bulunamadı" }); return; }

  const favs = await db.select({
    fav: mapFavoritesTable,
    business: mapBusinessesTable,
  }).from(mapFavoritesTable)
    .leftJoin(mapBusinessesTable, eq(mapFavoritesTable.businessId, mapBusinessesTable.id))
    .where(eq(mapFavoritesTable.userId, dbUser.id))
    .orderBy(desc(mapFavoritesTable.createdAt));

  res.json({ success: true, data: favs.map(f => ({ ...f.fav, business: f.business })) });
});

router.post("/map/favorites", mapAuthMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as Request & { mapUser?: AuthUser }).mapUser!;
  const dbUser = await getOrCreateMapUser(authUser);
  if (!dbUser) { res.status(401).json({ success: false, error: "Kullanıcı bulunamadı" }); return; }

  const { googlePlaceId, businessId } = req.body;
  if (!googlePlaceId) { res.status(400).json({ success: false, error: "googlePlaceId gerekli" }); return; }

  const existing = await db.select().from(mapFavoritesTable)
    .where(and(eq(mapFavoritesTable.userId, dbUser.id), eq(mapFavoritesTable.googlePlaceId, googlePlaceId))).limit(1);
  if (existing.length > 0) {
    res.json({ success: true, data: existing[0], message: "Zaten favorilerde" });
    return;
  }
  const [row] = await db.insert(mapFavoritesTable).values({ userId: dbUser.id, googlePlaceId, businessId }).returning();
  res.status(201).json({ success: true, data: row });
});

router.delete("/map/favorites/:googlePlaceId", mapAuthMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as Request & { mapUser?: AuthUser }).mapUser!;
  const dbUser = await getOrCreateMapUser(authUser);
  if (!dbUser) { res.status(401).json({ success: false, error: "Kullanıcı bulunamadı" }); return; }

  const rawPlaceId = req.params.googlePlaceId;
  const placeId = Array.isArray(rawPlaceId) ? rawPlaceId[0] : rawPlaceId;
  await db.delete(mapFavoritesTable).where(
    and(eq(mapFavoritesTable.userId, dbUser.id), eq(mapFavoritesTable.googlePlaceId, placeId ?? "")),
  );
  res.json({ success: true, message: "Favoriden kaldırıldı" });
});

/* — BACKEND-BACKED MAP PLATFORM STATE ─────────────────────────── */

router.get("/map/saved-places", optionalMapAuth, async (req, res): Promise<void> => {
  try {
    const identity = await resolveOptionalMapUser(req);
    if (!requireMapIdentity(identity, res)) return;
    const firebaseRows = await listFirebaseSavedPlaces(identity).catch(() => null);
    if (firebaseRows) {
      res.json({ success: true, data: firebaseRows, backend: "firebase" });
      return;
    }
    const conditions = [];
    if (identity.userId) conditions.push(eq(mapSavedPlacesTable.userId, identity.userId));
    if (identity.deviceId) conditions.push(eq(mapSavedPlacesTable.deviceId, identity.deviceId));
    const rows = await db.select().from(mapSavedPlacesTable)
      .where(or(...conditions))
      .orderBy(desc(mapSavedPlacesTable.createdAt))
      .limit(120);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/map/saved-places", optionalMapAuth, async (req, res): Promise<void> => {
  try {
    const identity = await resolveOptionalMapUser(req);
    if (!requireMapIdentity(identity, res)) return;
    const lat = Number(req.body?.lat ?? req.body?.latitude);
    const lng = Number(req.body?.lng ?? req.body?.longitude);
    const name = String(req.body?.name ?? "").trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ success: false, error: "name, lat, lng gerekli" });
      return;
    }
    const [row] = await db.insert(mapSavedPlacesTable).values({
      userId: identity.userId,
      deviceId: identity.deviceId,
      businessId: String(req.body?.businessId ?? "").trim() || null,
      name,
      type: String(req.body?.type ?? "place").trim() || "place",
      category: String(req.body?.category ?? "").trim() || null,
      address: String(req.body?.address ?? "").trim() || null,
      phone: String(req.body?.phone ?? "").trim() || null,
      website: String(req.body?.website ?? "").trim() || null,
      latitude: lat,
      longitude: lng,
      source: String(req.body?.source ?? "map_center").trim() || "map_center",
      metadata: safeJsonObject(req.body?.metadata),
    }).returning();
    await mirrorFirebaseSavedPlace(row).catch(() => false);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.delete("/map/saved-places/:id", optionalMapAuth, async (req, res): Promise<void> => {
  try {
    const identity = await resolveOptionalMapUser(req);
    if (!requireMapIdentity(identity, res)) return;
    const savedPlaceId = String(req.params.id ?? "");
    const conditions = [eq(mapSavedPlacesTable.id, savedPlaceId)];
    const owner = [];
    if (identity.userId) owner.push(eq(mapSavedPlacesTable.userId, identity.userId));
    if (identity.deviceId) owner.push(eq(mapSavedPlacesTable.deviceId, identity.deviceId));
    await db.delete(mapSavedPlacesTable).where(and(...conditions, or(...owner)));
    await deleteFirebaseSavedPlace(savedPlaceId, identity).catch(() => false);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/user-place-drafts", optionalMapAuth, async (req, res): Promise<void> => {
  try {
    const identity = await resolveOptionalMapUser(req);
    if (!requireMapIdentity(identity, res)) return;
    const firebaseRows = await listFirebaseUserPlaceDrafts(identity).catch(() => null);
    if (firebaseRows) {
      res.json({ success: true, data: firebaseRows, backend: "firebase" });
      return;
    }
    const conditions = [];
    if (identity.userId) conditions.push(eq(mapUserPlaceDraftsTable.userId, identity.userId));
    if (identity.deviceId) conditions.push(eq(mapUserPlaceDraftsTable.deviceId, identity.deviceId));
    const rows = await db.select().from(mapUserPlaceDraftsTable)
      .where(or(...conditions))
      .orderBy(desc(mapUserPlaceDraftsTable.createdAt))
      .limit(120);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/map/user-place-drafts", optionalMapAuth, async (req, res): Promise<void> => {
  try {
    const identity = await resolveOptionalMapUser(req);
    if (!requireMapIdentity(identity, res)) return;
    const lat = Number(req.body?.lat ?? req.body?.latitude);
    const lng = Number(req.body?.lng ?? req.body?.longitude);
    const name = String(req.body?.name ?? "").trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ success: false, error: "name, lat, lng gerekli" });
      return;
    }
    const rawCategory = String(req.body?.categoryRawLabel ?? req.body?.category ?? "").trim();
    const metadata = mapDraftCategoryMetadata(req.body, {
      ...safeJsonObject(req.body?.metadata),
      clientId: safeJsonObject(req.body?.metadata).clientId ?? null,
    });
    const [row] = await db.insert(mapUserPlaceDraftsTable).values({
      userId: identity.userId,
      deviceId: identity.deviceId,
      businessId: String(req.body?.businessId ?? "").trim() || null,
      name,
      type: String(req.body?.type ?? "business").trim() || "business",
      category: rawCategory || null,
      address: String(req.body?.address ?? "").trim() || null,
      phone: String(req.body?.phone ?? "").trim() || null,
      website: String(req.body?.website ?? "").trim() || null,
      latitude: lat,
      longitude: lng,
      source: String(req.body?.source ?? "user_added").trim() || "user_added",
      status: "pending",
      metadata,
    }).returning();
    await mirrorFirebaseUserPlaceDraft(row).catch(() => false);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.delete("/map/user-place-drafts/:id", optionalMapAuth, async (req, res): Promise<void> => {
  try {
    const identity = await resolveOptionalMapUser(req);
    if (!requireMapIdentity(identity, res)) return;
    const owner = [];
    if (identity.userId) owner.push(eq(mapUserPlaceDraftsTable.userId, identity.userId));
    if (identity.deviceId) owner.push(eq(mapUserPlaceDraftsTable.deviceId, identity.deviceId));
    const draftId = String(req.params.id ?? "");
    await db.delete(mapUserPlaceDraftsTable).where(and(eq(mapUserPlaceDraftsTable.id, draftId), or(...owner)));
    await deleteFirebaseUserPlaceDraft(draftId, identity).catch(() => false);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/map/share-states", optionalMapAuth, async (req, res): Promise<void> => {
  try {
    const identity = await resolveOptionalMapUser(req);
    const centerLat = Number(req.body?.centerLat ?? req.body?.lat);
    const centerLng = Number(req.body?.centerLng ?? req.body?.lng);
    const zoom = Math.max(1, Math.min(20, Math.round(Number(req.body?.zoom ?? 6) || 6)));
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      res.status(400).json({ success: false, error: "centerLat/centerLng gerekli" });
      return;
    }
    const slug = randomUUID().replace(/-/g, "").slice(0, 12);
    const [row] = await db.insert(mapShareStatesTable).values({
      slug,
      userId: identity.userId,
      deviceId: identity.deviceId,
      title: String(req.body?.title ?? "").trim() || null,
      centerLat,
      centerLng,
      zoom,
      baseLayer: String(req.body?.baseLayer ?? "temel").trim() || "temel",
      layers: Array.isArray(req.body?.layers) ? req.body.layers : [],
      filters: safeJsonObject(req.body?.filters),
    }).returning();
    await mirrorFirebaseShareState(row).catch(() => false);
    res.status(201).json({ success: true, data: row, url: `/map?share=${slug}` });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/share-states/:slug", async (req, res): Promise<void> => {
  try {
    const firebaseRow = await getFirebaseShareState(String(req.params.slug ?? "")).catch(() => null);
    if (firebaseRow) {
      res.json({ success: true, data: firebaseRow, backend: "firebase" });
      return;
    }
    const [row] = await db.select().from(mapShareStatesTable).where(eq(mapShareStatesTable.slug, req.params.slug)).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Paylaşım bulunamadı" }); return; }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/layers", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(mapLayerDefinitionsTable)
      .where(eq(mapLayerDefinitionsTable.isEnabled, true))
      .orderBy(asc(mapLayerDefinitionsTable.sortOrder), asc(mapLayerDefinitionsTable.label));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — DEVICE TOKENS ──────────────────────────────────────────────── */

router.post("/map/device-tokens", async (req, res): Promise<void> => {
  const { fcmToken, deviceId, userId, phone, platform, appVersion } = req.body;
  if (!fcmToken) { res.status(400).json({ success: false, error: "fcmToken gerekli" }); return; }

  const existing = await db.select().from(mapDeviceTokensTable)
    .where(eq(mapDeviceTokensTable.fcmToken, fcmToken)).limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(mapDeviceTokensTable)
      .set({ userId, phone, platform, appVersion, isActive: true, updatedAt: new Date() })
      .where(eq(mapDeviceTokensTable.id, existing[0].id)).returning();
    res.json({ success: true, data: updated });
  } else {
    const [row] = await db.insert(mapDeviceTokensTable).values({
      fcmToken, deviceId, userId, phone, platform, appVersion,
    }).returning();
    res.status(201).json({ success: true, data: row });
  }
});

/* — OWNERSHIP CLAIMS ───────────────────────────────────────────── */

router.get("/map/ownership-claims", async (_req, res): Promise<void> => {
  const rows = await db.select().from(mapOwnershipClaimsTable)
    .orderBy(desc(mapOwnershipClaimsTable.createdAt));
  res.json({ success: true, data: rows });
});

router.post("/map/ownership-claims", async (req, res): Promise<void> => {
  const { googlePlaceId, businessId, fullName, email, phone, message } = req.body;
  if (!googlePlaceId || !fullName || !email || !phone) {
    res.status(400).json({ success: false, error: "googlePlaceId, fullName, email ve phone gerekli" });
    return;
  }
  const [row] = await db.insert(mapOwnershipClaimsTable).values({
    googlePlaceId, businessId, fullName, email, phone, message,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.put("/map/ownership-claims/:id/status", async (req, res): Promise<void> => {
  const { status } = req.body;
  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    res.status(400).json({ success: false, error: "Geçersiz status" });
    return;
  }
  const [row] = await db.update(mapOwnershipClaimsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(mapOwnershipClaimsTable.id, req.params.id)).returning();
  res.json({ success: true, data: row });
});

/* — SYSTEM SETTINGS (Admin) ────────────────────────────────────── */

router.get("/map/settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(mapSystemSettingsTable).where(eq(mapSystemSettingsTable.id, "system")).limit(1);
  const settings = rows[0] ?? null;
  const effectiveKey = await resolveGooglePlacesApiKey();
  const mapOwnKey = Boolean(settings?.googlePlacesApiKey?.trim());
  const effectiveConfigured = Boolean(effectiveKey);
  const firmsConfigured = Boolean(resolveFirmsMapKey());

  const defaults = {
    id: "system",
    automaticGoogleDataFetch: false,
    firebaseProjectId: null as string | null,
    eczaneApiKey: null as string | null,
    mapLayerConfigJson: null as string | null,
    updatedAt: new Date(),
    googlePlacesApiKey: null as string | null,
  };

  const base = settings ?? defaults;
  const mapLayerConfig = readMapLayerConfig(base.mapLayerConfigJson);
  const mapAutoImportSettings = normalizeMapAutoImportSettings(mapLayerConfig.autoImportSettings);

  res.json({
    success: true,
    data: {
      ...base,
      googlePlacesApiKey: mapOwnKey ? "***configured***" : null,
      googlePlacesEffectiveConfigured: effectiveConfigured,
      firmsWildfireConfigured: firmsConfigured,
      mapAutoImportSettings,
      kesfetScraperBackfill: {
        provider: "google_maps_scraper_bot",
        usesPlacesApi: false,
        enabled: mapAutoImportSettings.scraperBackfillEnabled,
        targetPerCategory: mapAutoImportSettings.scraperBackfillTargetPerCategory,
        refreshIntervalDays: mapAutoImportSettings.refreshIntervalDays,
        running: kesfetScraperBackfillWorkerRunning,
        queued: kesfetScraperBackfillQueue.length,
        lastRunAt: kesfetScraperBackfillLastRunAt,
        lastError: kesfetScraperBackfillLastError,
        coverage: {
          turkeyProvinceCount: TURKEY_CITIES.length,
          kktcCityCount: KESFET_EXTRA_BACKFILL_CITIES.filter((city) => city.region === "kktc").length,
          azerbaijanCityCount: KESFET_EXTRA_BACKFILL_CITIES.filter((city) => city.region === "azerbaycan").length,
          categoryCount: nightScraperCategories.length,
        },
        nightScraper: getKesfetNightScraperStatus(),
      },
    },
  });
});

router.put("/map/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
  const { googlePlacesApiKey, automaticGoogleDataFetch, firebaseProjectId, mapLayerConfigJson, mapAutoImportSettings } = req.body;
  const existing = await db.select().from(mapSystemSettingsTable).where(eq(mapSystemSettingsTable.id, "system")).limit(1);
  const maskMapSettings = <T extends { googlePlacesApiKey?: string | null }>(row: T) => ({
    ...row,
    googlePlacesApiKey: row.googlePlacesApiKey?.trim() ? "***configured***" : null,
  });

  if (existing.length > 0) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (googlePlacesApiKey !== undefined) updateData.googlePlacesApiKey = googlePlacesApiKey;
    if (automaticGoogleDataFetch !== undefined) updateData.automaticGoogleDataFetch = automaticGoogleDataFetch;
    if (firebaseProjectId !== undefined) updateData.firebaseProjectId = firebaseProjectId;
    if (mapLayerConfigJson !== undefined || mapAutoImportSettings !== undefined) {
      const cfg = readMapLayerConfig(mapLayerConfigJson ?? existing[0].mapLayerConfigJson);
      if (mapAutoImportSettings !== undefined) cfg.autoImportSettings = normalizeMapAutoImportSettings(mapAutoImportSettings);
      updateData.mapLayerConfigJson = JSON.stringify(cfg);
    }
    const [row] = await db.update(mapSystemSettingsTable).set(updateData).where(eq(mapSystemSettingsTable.id, "system")).returning();
    const log = nightScraperLogRef ?? { info: () => {}, warn: () => {}, error: () => {} };
    if (mapAutoImportSettings !== undefined) {
      await syncKesfetNightScraperScheduler(log).catch((err) => {
        log.warn({ err }, "[kesfet-night-scraper] ayar kaydı sonrası senkron atlandı");
      });
    }
    res.json({ success: true, data: maskMapSettings(row) });
  } else {
    const [row] = await db.insert(mapSystemSettingsTable).values({
      id: "system",
      googlePlacesApiKey,
      automaticGoogleDataFetch: automaticGoogleDataFetch ?? false,
      firebaseProjectId,
      mapLayerConfigJson: JSON.stringify({
        ...readMapLayerConfig(mapLayerConfigJson),
        autoImportSettings: normalizeMapAutoImportSettings(mapAutoImportSettings),
      }),
    }).returning();
    const log = nightScraperLogRef ?? { info: () => {}, warn: () => {}, error: () => {} };
    await syncKesfetNightScraperScheduler(log).catch((err) => {
      log.warn({ err }, "[kesfet-night-scraper] ayar kaydı sonrası senkron atlandı");
    });
    res.json({ success: true, data: maskMapSettings(row) });
  }
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Harita ayarları kaydedilemedi",
    });
  }
});

router.get("/admin/map/place-drafts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const status = String(req.query.status ?? "").trim();
    const conditions = status && status !== "all" ? [eq(mapUserPlaceDraftsTable.status, status)] : [];
    const rows = await db.select().from(mapUserPlaceDraftsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(mapUserPlaceDraftsTable.createdAt))
      .limit(300);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.put("/admin/map/place-drafts/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const status = String(req.body?.status ?? "").trim();
    if (!["pending", "approved", "rejected", "hidden"].includes(status)) {
      res.status(400).json({ success: false, error: "status gecersiz" });
      return;
    }
    const [existingDraft] = await db.select().from(mapUserPlaceDraftsTable).where(eq(mapUserPlaceDraftsTable.id, req.params.id)).limit(1);
    if (!existingDraft) { res.status(404).json({ success: false, error: "Taslak bulunamadi" }); return; }
    const existingMetadata = safeJsonObject(existingDraft.metadata);
    const categoryPatch = req.body?.category !== undefined || req.body?.categoryRawLabel !== undefined || req.body?.categoryId !== undefined || req.body?.categorySlug !== undefined || req.body?.categoryName !== undefined;
    const rawCategory = String(req.body?.categoryRawLabel ?? req.body?.category ?? existingDraft.category ?? "").trim();
    const [row] = await db.update(mapUserPlaceDraftsTable)
      .set({
        status,
        category: categoryPatch ? rawCategory || null : undefined,
        adminNote: String(req.body?.adminNote ?? "").trim() || null,
        metadata: categoryPatch ? mapDraftCategoryMetadata(req.body, existingMetadata) : existingMetadata,
        updatedAt: new Date(),
      })
      .where(eq(mapUserPlaceDraftsTable.id, req.params.id))
      .returning();
    if (!row) { res.status(404).json({ success: false, error: "Taslak bulunamadi" }); return; }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/admin/map/place-drafts/:id/promote", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const [draft] = await db.select().from(mapUserPlaceDraftsTable).where(eq(mapUserPlaceDraftsTable.id, req.params.id)).limit(1);
    if (!draft) { res.status(404).json({ success: false, error: "Taslak bulunamadi" }); return; }
    const slugBase = toSlug(draft.name);
    let bizSlug = slugBase || `yer-${draft.id.slice(0, 8)}`;
    let slugAttempt = 1;
    while (slugAttempt <= 200) {
      const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, bizSlug)).limit(1);
      if (clash.length === 0) break;
      bizSlug = `${slugBase}-${++slugAttempt}`;
    }
    const metadata = safeJsonObject(draft.metadata);
    const selectedCategory = metadata.selectedCategory && typeof metadata.selectedCategory === "object"
      ? metadata.selectedCategory as Record<string, unknown>
      : {};
    const rawCategoryId = String(metadata.categoryId ?? selectedCategory.id ?? "").trim();
    const rawCategorySlug = String(metadata.categorySlug ?? selectedCategory.slug ?? "").trim();
    const categoryLookup = rawCategoryId
      ? await db.select({ id: mapCategoriesTable.id }).from(mapCategoriesTable).where(eq(mapCategoriesTable.id, rawCategoryId)).limit(1)
      : rawCategorySlug
        ? await db.select({ id: mapCategoriesTable.id }).from(mapCategoriesTable).where(eq(mapCategoriesTable.slug, rawCategorySlug)).limit(1)
        : [];
    const canonicalCategoryId = categoryLookup[0]?.id ?? null;
    const [business] = await db.insert(mapBusinessesTable).values({
      name: draft.name,
      slug: bizSlug,
      categoryId: canonicalCategoryId,
      address: draft.address,
      phone: draft.phone,
      website: draft.website,
      latitude: draft.latitude,
      longitude: draft.longitude,
      description: String(draft.category ?? "").trim() || null,
      isActive: true,
      isPremium: false,
      importSource: "user_draft",
    }).returning({ id: mapBusinessesTable.id });
    const [updated] = await db.update(mapUserPlaceDraftsTable)
      .set({ status: "approved", businessId: business.id, updatedAt: new Date() })
      .where(eq(mapUserPlaceDraftsTable.id, draft.id))
      .returning();
    res.json({ success: true, data: updated, businessId: business.id });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/admin/map/layers", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const rows = await db.select().from(mapLayerDefinitionsTable)
      .orderBy(asc(mapLayerDefinitionsTable.sortOrder), asc(mapLayerDefinitionsTable.label));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.put("/admin/map/layers/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const [row] = await db.update(mapLayerDefinitionsTable)
      .set({
        label: req.body?.label !== undefined ? String(req.body.label).trim() : undefined,
        icon: req.body?.icon !== undefined ? String(req.body.icon).trim() || null : undefined,
        isEnabled: req.body?.isEnabled !== undefined ? req.body.isEnabled === true : undefined,
        emptyState: req.body?.emptyState !== undefined ? String(req.body.emptyState).trim() || null : undefined,
        sortOrder: req.body?.sortOrder !== undefined ? Number(req.body.sortOrder) || 0 : undefined,
        updatedAt: new Date(),
      })
      .where(eq(mapLayerDefinitionsTable.id, req.params.id))
      .returning();
    if (!row) { res.status(404).json({ success: false, error: "Katman bulunamadi" }); return; }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — OPENSTREETMAP / OVERPASS SCRAPER (API key gerektirmez) ────── */

const OSM_AMENITY_MAP: Record<string, string> = {
  restaurant: "Restoranlar",
  cafe: "Kafeler",
  hospital: "Hastaneler",
  pharmacy: "Eczaneler",
  bank: "Bankalar",
  fuel: "Benzin İstasyonu",
  supermarket: "Marketler",
  hotel: "Oteller",
  school: "Okullar",
  university: "Üniversiteler",
  atm: "ATM",
  fast_food: "Fast Food",
  bakery: "Fırınlar",
  butcher: "Kasaplar",
  dentist: "Diş Hekimleri",
  veterinary: "Veterinerler",
  gym: "Spor Salonları",
  cinema: "Sinemalar",
};

router.post("/map/scrape-osm", async (req, res): Promise<void> => {
  try {
    const { lat, lng, radius = 2000, amenity, keyword } = req.body;
    if (!lat || !lng) {
      res.status(400).json({ success: false, error: "lat ve lng gerekli" });
      return;
    }
    const rMeters = Math.min(8000, Math.max(250, Number(radius) || 800));

    const kwRaw = typeof keyword === "string" ? keyword.trim() : "";
    const amenityRaw = typeof amenity === "string" ? amenity.trim() : "";
    /** Geniş amenity taraması (cami/banka/eczane sweep) kapalı — il + sektör veya OSM amenity + anahtar kelime */
    if (!kwRaw && !amenityRaw) {
      res.status(400).json({
        success: false,
        error: "Sektör için anahtar kelime (keyword) veya OSM amenity değeri zorunludur. Tüm işletme türü taraması devre dışı.",
      });
      return;
    }

    // Turkish keyword → OSM tag mapping for smarter scraping
    const KEYWORD_MAP: Record<string, { tag: string; value: string }[]> = {
      kafe: [{ tag: "amenity", value: "cafe" }],
      cafe: [{ tag: "amenity", value: "cafe" }],
      kahve: [{ tag: "amenity", value: "cafe" }],
      restoran: [{ tag: "amenity", value: "restaurant" }],
      restaurant: [{ tag: "amenity", value: "restaurant" }],
      lokanta: [{ tag: "amenity", value: "restaurant" }],
      hastane: [{ tag: "amenity", value: "hospital" }],
      hospital: [{ tag: "amenity", value: "hospital" }],
      eczane: [{ tag: "amenity", value: "pharmacy" }],
      pharmacy: [{ tag: "amenity", value: "pharmacy" }],
      market: [{ tag: "shop", value: "supermarket" }, { tag: "shop", value: "convenience" }],
      supermarket: [{ tag: "shop", value: "supermarket" }],
      otel: [{ tag: "tourism", value: "hotel" }],
      hotel: [{ tag: "tourism", value: "hotel" }],
      okul: [{ tag: "amenity", value: "school" }],
      school: [{ tag: "amenity", value: "school" }],
      banka: [{ tag: "amenity", value: "bank" }],
      bank: [{ tag: "amenity", value: "bank" }],
      benzin: [{ tag: "amenity", value: "fuel" }],
      akaryakıt: [{ tag: "amenity", value: "fuel" }],
      kuaför: [{ tag: "shop", value: "hairdresser" }],
      berber: [{ tag: "shop", value: "barber" }],
      fırın: [{ tag: "shop", value: "bakery" }],
      bakery: [{ tag: "shop", value: "bakery" }],
    };

    // Build Overpass QL query
    let filters: string[] = [];
    if (amenityRaw) {
      filters = [`["amenity"="${amenityRaw.replace(/"/g, "")}"]`];
    } else {
      const kLower = kwRaw.toLowerCase();
      const mapped = KEYWORD_MAP[kLower];
      if (mapped) {
        filters = mapped.map(m => `["${m.tag}"="${m.value}"]`);
      } else {
        const esc = kwRaw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        if (esc.length < 2) {
          res.status(400).json({ success: false, error: "Anahtar kelime en az 2 karakter olmalıdır." });
          return;
        }
        filters = [`["name"~"${esc}",i]`];
      }
    }

    // Build union of all filters in one Overpass query
    /* relation çıkarıldı: daha hafif sorgu, 504 riski azalır */
    const elementTypes = ["node", "way"] as const;
    const unionParts = filters.flatMap(f =>
      elementTypes.map(t => `${t}${f}(around:${rMeters},${lat},${lng});`)
    ).join("");
    const query = `[out:json][timeout:120];(${unionParts});out center meta;`;

    const body = new URLSearchParams({ data: query });
    const fetchRes = await postOverpassInterpreter(body.toString(), {
      timeoutMs: 125_000,
      userAgent: "Yekpare/1.0 (https://yekpare.net; haritalar OSM scrape)",
    });
    if (!fetchRes.ok) {
      const txt = await fetchRes.text();
      res.status(500).json({ success: false, error: `Overpass API hatası (${fetchRes.status}): ${txt.slice(0, 200)}` });
      return;
    }
    const overpassData = await fetchRes.json() as { elements?: unknown[] };

    const elements: Array<{
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }> = (overpassData.elements ?? []) as Array<{
      type: string; id: number; lat?: number; lon?: number;
      center?: { lat: number; lon: number }; tags?: Record<string, string>;
    }>;
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const safeNum = (v: unknown): number | null => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    };

    for (const el of elements) {
      try {
        const tags: Record<string, string> = (el.tags && typeof el.tags === "object") ? el.tags : {};
        const name = (tags["name"] || tags["name:tr"] || tags["name:en"] || "").trim();
        if (!name) { skipped++; continue; }

        const elLat = safeNum(el.lat ?? el.center?.lat);
        const elLng = safeNum(el.lon ?? el.center?.lon);
        if (elLat === null || elLng === null) { skipped++; continue; }

        const osmId = `osm_${el.type}_${el.id}`;

        // Check duplicate by googlePlaceId (we reuse this field for OSM id)
        const existing = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable)
          .where(eq(mapBusinessesTable.googlePlaceId, osmId)).limit(1);
        if (existing.length > 0) { skipped++; continue; }

        // Find matching category
        const amenityType = tags["amenity"] || tags["shop"] || tags["leisure"] || tags["tourism"];
        let categoryId: string | null = null;
        if (amenityType) {
          const cats = await db.select({ id: mapCategoriesTable.id }).from(mapCategoriesTable)
            .where(eq(mapCategoriesTable.googlePlaceType, amenityType)).limit(1);
          if (cats.length > 0) categoryId = cats[0]?.id ?? null;
        }

        const phone = tags["phone"] || tags["contact:phone"] || null;
        const website = tags["website"] || tags["contact:website"] || null;
        const address = [
          tags["addr:street"],
          tags["addr:housenumber"],
          tags["addr:neighbourhood"],
          tags["addr:district"] || tags["addr:city"],
        ].filter(Boolean).join(", ") || tags["addr:full"] || null;

        // Generate unique slug
        const base = toSlug(name);
        let slug = base; let attempt = 1;
        while (true) {
          const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable)
            .where(eq(mapBusinessesTable.slug, slug)).limit(1);
          if (clash.length === 0) break;
          slug = `${base}-${++attempt}`;
          if (attempt > 50) { slug = `${base}-${osmId.slice(-8)}`; break; }
        }

        await db.insert(mapBusinessesTable).values({
          googlePlaceId: osmId,
          importSource: "osm",
          slug,
          name,
          address: address || null,
          phone: phone || null,
          website: website || null,
          latitude: elLat,
          longitude: elLng,
          categoryId: categoryId || null,
          isActive: true,
          description: tags["description"] || tags["description:tr"] || null,
        }).onConflictDoNothing();
        imported++;
      } catch (itemErr) {
        errors.push(`osm_${el.type}_${el.id}: ${String(itemErr).slice(0, 100)}`);
      }
    }

    res.json({
      success: true,
      message: `${imported} işletme eklendi, ${skipped} atlandı${errors.length > 0 ? `, ${errors.length} hata` : ""}`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total: elements.length,
      source: "OpenStreetMap / Overpass API",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — INSAATFIRMALARIM.COM SCRAPER ──────────────────────────────── */

router.get("/map/insaatfirmalarim/catalog", async (_req, res): Promise<void> => {
  res.json({ success: true, data: getInsaatfirmalarimCatalog() });
});

router.get("/map/insaatfirmalarim/status", async (_req, res): Promise<void> => {
  res.json({ success: true, data: listInsaatfirmalarimJobs(30) });
});

router.get("/map/insaatfirmalarim/status/:id", async (req, res): Promise<void> => {
  const id = String(req.params.id ?? "");
  if (id.startsWith("batch-")) {
    const batch = getInsaatfirmalarimBatchStatus(id.slice("batch-".length));
    if (!batch) {
      res.status(404).json({ success: false, error: "Batch bulunamadı" });
      return;
    }
    res.json({ success: true, data: batch });
    return;
  }
  const job = getInsaatfirmalarimJob(id);
  if (!job) {
    res.status(404).json({ success: false, error: "İş bulunamadı" });
    return;
  }
  res.json({ success: true, data: job });
});

router.get("/map/insaatfirmalarim/batch/:batchId", async (req, res): Promise<void> => {
  const batch = getInsaatfirmalarimBatchStatus(String(req.params.batchId ?? ""));
  if (!batch) {
    res.status(404).json({ success: false, error: "Batch bulunamadı" });
    return;
  }
  res.json({ success: true, data: batch });
});

router.get("/map/insaatfirmalarim/queue", async (req, res): Promise<void> => {
  const batchId = req.query.batchId != null ? String(req.query.batchId).trim() : undefined;
  const limit = Number(req.query.limit ?? 200) || 200;
  res.json({
    success: true,
    provider: "insaatfirmalarim",
    data: getInsaatfirmalarimQueueStatus({ batchId, limit }),
  });
});

router.get("/map/admin/insaatfirmalarim-scraper/queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const batchId = req.query.batchId != null ? String(req.query.batchId).trim() : undefined;
  const limit = Number(req.query.limit ?? 200) || 200;
  res.json({
    success: true,
    provider: "insaatfirmalarim",
    data: getInsaatfirmalarimQueueStatus({ batchId, limit }),
  });
});

router.post("/map/scrape-insaatfirmalarim", async (req, res): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const modeRaw = String(body.mode ?? "").trim();
    const mode = modeRaw === "city" || modeRaw === "category" ? modeRaw : undefined;
    const categorySlugsRaw = body.categorySlugs ?? body.categories;
    const categorySlugs = Array.isArray(categorySlugsRaw)
      ? categorySlugsRaw.map((s) => String(s).trim()).filter(Boolean)
      : typeof categorySlugsRaw === "string"
        ? categorySlugsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
    const citySlug = body.citySlug != null ? String(body.citySlug).trim() : undefined;
    const categorySlug = body.categorySlug != null ? String(body.categorySlug).trim() : undefined;
    const maxFirmsRaw = body.maxFirms;
    const maxFirms =
      maxFirmsRaw == null || maxFirmsRaw === ""
        ? undefined
        : Math.max(1, Math.min(50_000, Number(maxFirmsRaw) || 0)) || undefined;
    const geocode = body.geocode !== false;
    const autoImport = body.autoImport !== false;
    const forceQueue = body.async === true || body.queue === true;

    if (mode === "city" && !citySlug) {
      res.status(400).json({ success: false, error: "İl bazlı mod için citySlug gerekli (ör. antalya)" });
      return;
    }
    if (mode === "category" && !categorySlug) {
      res.status(400).json({ success: false, error: "Kategori bazlı mod için categorySlug gerekli" });
      return;
    }

    const useAsync = forceQueue || Boolean(mode);

    if (useAsync && mode) {
      const batch = enqueueInsaatfirmalarimJobsFromMode({
        mode,
        citySlug,
        categorySlug,
        maxFirms,
        geocode,
        autoImport,
        priority: body.priority === true,
      });
      const label =
        mode === "city"
          ? `${citySlug} — ${batch.jobCount} kategori işi`
          : `${categorySlug} — ${batch.jobCount} il işi`;
      res.status(202).json({
        success: true,
        async: true,
        provider: "insaatfirmalarim",
        importSource: "insaatfirmalarim",
        mode,
        batchId: batch.batchId,
        jobIds: batch.jobIds,
        jobCount: batch.jobCount,
        queueDepth: listInsaatfirmalarimJobs(200).filter((j) => j.status === "queued").length,
        message: `insaatfirmalarim.com kazıma kuyruğa alındı (${label})`,
        data: batch.jobs[0] ?? null,
      });
      return;
    }

    if (useAsync) {
      const job = enqueueInsaatfirmalarimJob({
        categorySlug,
        categorySlugs,
        citySlug,
        maxFirms,
        geocode,
        autoImport,
      });
      res.status(202).json({
        success: true,
        async: true,
        provider: "insaatfirmalarim",
        importSource: "insaatfirmalarim",
        jobId: job.id,
        queueDepth: listInsaatfirmalarimJobs(100).filter((j) => j.status === "queued").length,
        message: "insaatfirmalarim.com kazıma işi arka planda başlatıldı",
        data: job,
      });
      return;
    }

    const result = await runInsaatfirmalarimScrapeNow({
      mode,
      categorySlug,
      categorySlugs,
      citySlug,
      maxFirms,
      geocode,
      autoImport,
    });
    res.json({
      success: true,
      provider: "insaatfirmalarim",
      importSource: "insaatfirmalarim",
      message: `${result.scraped} firma çekildi${result.imported || result.updated ? `, ${result.imported} yeni, ${result.updated} güncellendi` : ""}, ${result.skipped} atlandı`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/map/admin/insaatfirmalarim-scraper/queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const body = req.body as Record<string, unknown>;
  const modeRaw = String(body.mode ?? "").trim();
  const mode = modeRaw === "city" || modeRaw === "category" ? modeRaw : undefined;
  const citySlug = body.citySlug != null ? String(body.citySlug).trim() : undefined;
  const categorySlug = body.categorySlug != null ? String(body.categorySlug).trim() : undefined;
  const maxFirmsRaw = body.maxFirms;
  const maxFirms =
    maxFirmsRaw == null || maxFirmsRaw === ""
      ? undefined
      : Math.max(1, Math.min(50_000, Number(maxFirmsRaw) || 0)) || undefined;

  if (mode === "city" && !citySlug) {
    res.status(400).json({ success: false, error: "İl bazlı mod için citySlug gerekli (ör. antalya)" });
    return;
  }
  if (mode === "category" && !categorySlug) {
    res.status(400).json({ success: false, error: "Kategori bazlı mod için categorySlug gerekli" });
    return;
  }
  if (!mode) {
    res.status(400).json({ success: false, error: "mode gerekli: city veya category" });
    return;
  }

  const batch = enqueueInsaatfirmalarimJobsFromMode({
    mode,
    citySlug,
    categorySlug,
    maxFirms,
    geocode: body.geocode === true,
    autoImport: body.autoImport !== false,
    priority: body.priority !== false,
  });
  const label =
    mode === "city"
      ? `${citySlug} — ${batch.jobCount} kategori`
      : `${categorySlug} — ${batch.jobCount} il`;
  res.status(202).json({
    success: true,
    provider: "insaatfirmalarim",
    importSource: "insaatfirmalarim",
    mode,
    batchId: batch.batchId,
    jobIds: batch.jobIds,
    jobCount: batch.jobCount,
    queueDepth: listInsaatfirmalarimJobs(200).filter((j) => j.status === "queued").length,
    catalog: getInsaatfirmalarimCatalog(),
    message: `insaatfirmalarim.com kazıma kuyruğa alındı (${label}, tüm sayfalar). İlerleme: GET /map/insaatfirmalarim/batch/${batch.batchId}`,
    data: batch.jobs[0] ?? null,
  });
});

router.delete("/map/admin/insaatfirmalarim-scraper/queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const batchId = req.query.batchId != null ? String(req.query.batchId).trim() : undefined;
  const result = clearInsaatfirmalarimQueue({ batchId });
  res.json({
    success: true,
    provider: "insaatfirmalarim",
    cleared: result.cleared,
    queueDepth: result.remaining,
    message: batchId
      ? `${result.cleared} bekleyen iş iptal edildi (batch: ${batchId})`
      : `${result.cleared} bekleyen iş iptal edildi`,
  });
});

router.post("/map/admin/insaatfirmalarim-scraper/recover", async (_req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(_req, res, "haritalar")) return;
  const result = recoverInsaatfirmalarimWorker();
  res.json({
    success: true,
    provider: "insaatfirmalarim",
    recoveredJobs: result.recoveredJobs,
    workerRunning: result.workerRunning,
    queueDepth: result.queueDepth,
    data: getInsaatfirmalarimQueueStatus({ limit: 50 }),
    message:
      result.recoveredJobs > 0
        ? `${result.recoveredJobs} takılı iş kurtarıldı, worker yeniden başlatıldı`
        : "Worker yeniden başlatıldı",
  });
});

router.post("/map/admin/insaatfirmalarim-scraper/resume", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const batchId = req.query.batchId != null ? String(req.query.batchId).trim() : undefined;
  const result = resumeInsaatfirmalarimQueue({ batchId });
  const status = getInsaatfirmalarimQueueStatus({ batchId, limit: 250 });
  res.json({
    success: true,
    provider: "insaatfirmalarim",
    requeued: result.requeued,
    workerRunning: result.workerRunning,
    queueDepth: result.queueDepth,
    data: status,
    message:
      status.summary.queued > 0
        ? `Kuyruk devam ediyor — ${status.summary.queued} iş bekliyor${result.requeued ? ` (${result.requeued} yeniden sıraya alındı)` : ""}`
        : result.requeued > 0
          ? `${result.requeued} iş yeniden sıraya alındı, worker başlatıldı`
          : "Worker başlatıldı — bekleyen iş yok",
  });
});

/* — YATPORT.COM SCRAPER ───────────────────────────────────────── */

router.get("/map/yatport/catalog", async (_req, res): Promise<void> => {
  res.json({ success: true, data: getYatportCatalog() });
});

router.get("/map/yatport/status", async (_req, res): Promise<void> => {
  res.json({ success: true, data: listYatportJobs(30) });
});

router.get("/map/yatport/status/:id", async (req, res): Promise<void> => {
  const id = String(req.params.id ?? "");
  if (id.startsWith("batch-")) {
    const batch = getYatportBatchStatus(id.slice("batch-".length));
    if (!batch) {
      res.status(404).json({ success: false, error: "Batch bulunamadı" });
      return;
    }
    res.json({ success: true, data: batch });
    return;
  }
  const job = getYatportJob(id);
  if (!job) {
    res.status(404).json({ success: false, error: "İş bulunamadı" });
    return;
  }
  res.json({ success: true, data: job });
});

router.get("/map/yatport/batch/:batchId", async (req, res): Promise<void> => {
  const batch = getYatportBatchStatus(String(req.params.batchId ?? ""));
  if (!batch) {
    res.status(404).json({ success: false, error: "Batch bulunamadı" });
    return;
  }
  res.json({ success: true, data: batch });
});

router.get("/map/yatport/queue", async (req, res): Promise<void> => {
  const batchId = req.query.batchId != null ? String(req.query.batchId).trim() : undefined;
  const limit = Number(req.query.limit ?? 200) || 200;
  res.json({
    success: true,
    provider: "yatport",
    data: getYatportQueueStatus({ batchId, limit }),
  });
});

router.get("/map/admin/yatport-scraper/queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const batchId = req.query.batchId != null ? String(req.query.batchId).trim() : undefined;
  const limit = Number(req.query.limit ?? 200) || 200;
  res.json({
    success: true,
    provider: "yatport",
    data: getYatportQueueStatus({ batchId, limit }),
  });
});

router.post("/map/scrape-yatport", async (req, res): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const modeRaw = String(body.mode ?? "").trim();
    const mode =
      modeRaw === "listing" || modeRaw === "district" || modeRaw === "boatType" ? modeRaw : undefined;
    const listSlug = body.listSlug != null ? String(body.listSlug).trim() : undefined;
    const districtSlug = body.districtSlug != null ? String(body.districtSlug).trim() : undefined;
    const boatTypeSlug = body.boatTypeSlug != null ? String(body.boatTypeSlug).trim() : undefined;
    const maxBoatsRaw = body.maxBoats;
    const maxBoats =
      maxBoatsRaw == null || maxBoatsRaw === ""
        ? undefined
        : Math.max(1, Math.min(50_000, Number(maxBoatsRaw) || 0)) || undefined;
    const autoImport = body.autoImport !== false;
    const downloadImages = body.downloadImages !== false;
    const forceQueue = body.async === true || body.queue === true;

    if (mode === "district" && districtSlug === "" && body.allDistricts !== true) {
      /* allDistricts=true veya districtSlug ile tek ilçe */
    }

    const useAsync = forceQueue || Boolean(mode);

    if (useAsync && mode) {
      const batch = enqueueYatportJobsFromMode({
        mode,
        listSlug,
        districtSlug: body.allDistricts === true ? undefined : districtSlug,
        boatTypeSlug,
        maxBoats,
        autoImport,
        priority: body.priority === true,
        downloadImages,
      });
      const label =
        mode === "district"
          ? body.allDistricts === true
            ? `İstanbul tüm ilçeler — ${batch.jobCount} iş`
            : `${districtSlug} ilçesi`
          : mode === "boatType"
            ? `${boatTypeSlug || "motoryat-kiralama"}`
            : `${listSlug || "tekne-kiralama"}`;
      res.status(202).json({
        success: true,
        async: true,
        provider: "yatport",
        importSource: "yatport",
        mode,
        batchId: batch.batchId,
        jobIds: batch.jobIds,
        jobCount: batch.jobCount,
        queueDepth: listYatportJobs(200).filter((j) => j.status === "queued").length,
        message: `yatport.com kazıma kuyruğa alındı (${label})`,
        data: batch.jobs[0] ?? null,
      });
      return;
    }

    if (useAsync) {
      const job = enqueueYatportJob({
        mode,
        listSlug,
        districtSlug,
        boatTypeSlug,
        maxBoats,
        autoImport,
        downloadImages,
      });
      res.status(202).json({
        success: true,
        async: true,
        provider: "yatport",
        importSource: "yatport",
        jobId: job.id,
        queueDepth: listYatportJobs(100).filter((j) => j.status === "queued").length,
        message: "yatport.com kazıma işi arka planda başlatıldı",
        data: job,
      });
      return;
    }

    const result = await runYatportScrapeNow({
      mode,
      listSlug,
      districtSlug,
      boatTypeSlug,
      maxBoats,
      autoImport,
      downloadImages,
    });
    res.json({
      success: true,
      provider: "yatport",
      importSource: "yatport",
      discovered: result.discovered,
      scraped: result.boats.length,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      listPages: result.listPages,
      errors: result.errors.slice(0, 20),
      preview: result.boats.slice(0, 5).map((b) => ({
        name: b.name,
        city: b.city,
        district: b.district,
        phone: b.phone,
        price: b.listingCard?.priceDisplay ?? b.fiyatlar.saatlik,
        amenities: b.imkanlar.slice(0, 5),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post("/map/admin/yatport-scraper/queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const body = req.body as Record<string, unknown>;
  const modeRaw = String(body.mode ?? "listing").trim();
  const mode =
    modeRaw === "listing" || modeRaw === "district" || modeRaw === "boatType" ? modeRaw : "listing";
  const listSlug = body.listSlug != null ? String(body.listSlug).trim() : undefined;
  const districtSlug = body.districtSlug != null ? String(body.districtSlug).trim() : undefined;
  const boatTypeSlug = body.boatTypeSlug != null ? String(body.boatTypeSlug).trim() : undefined;
  const maxBoatsRaw = body.maxBoats;
  const maxBoats =
    maxBoatsRaw == null || maxBoatsRaw === ""
      ? undefined
      : Math.max(1, Math.min(50_000, Number(maxBoatsRaw) || 0)) || undefined;

  const batch = enqueueYatportJobsFromMode({
    mode,
    listSlug,
    districtSlug: body.allDistricts === true ? undefined : districtSlug,
    boatTypeSlug,
    maxBoats,
    autoImport: body.autoImport !== false,
    priority: body.priority !== false,
    downloadImages: body.downloadImages !== false,
  });
  const label =
    mode === "district"
      ? body.allDistricts === true
        ? `İstanbul — ${batch.jobCount} ilçe`
        : `${districtSlug}`
      : mode === "boatType"
        ? `${boatTypeSlug || "motoryat-kiralama"}`
        : `${listSlug || "tekne-kiralama"}`;
  res.status(202).json({
    success: true,
    provider: "yatport",
    importSource: "yatport",
    mode,
    batchId: batch.batchId,
    jobCount: batch.jobCount,
    message: `yatport.com kazıma kuyruğa alındı (${label}). İlerleme: GET /map/yatport/batch/${batch.batchId}`,
    data: batch.jobs[0] ?? null,
  });
});

router.delete("/map/admin/yatport-scraper/queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const batchId = req.query.batchId != null ? String(req.query.batchId).trim() : undefined;
  const cleared = clearYatportQueue(batchId || undefined);
  res.json({
    success: true,
    provider: "yatport",
    cleared,
    data: getYatportQueueStatus({ batchId, limit: 100 }),
  });
});

router.post("/map/admin/yatport-scraper/recover", async (_req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(_req, res, "haritalar")) return;
  const result = recoverYatportWorker();
  res.json({
    success: true,
    provider: "yatport",
    recoveredJobs: result.recoveredJobs,
    workerRunning: result.workerRunning,
    queueDepth: result.queueDepth,
    data: getYatportQueueStatus({ limit: 50 }),
    message:
      result.recoveredJobs > 0
        ? `${result.recoveredJobs} takılı iş kurtarıldı, worker yeniden başlatıldı`
        : "Worker yeniden başlatıldı",
  });
});

/* — TOURISM SPOTS SCRAPER ─────────────────────────────────────── */

/**
 * POST /map/tourism-spots
 * Scrapes and returns tourist attractions for a location using Overpass API.
 * Combines tourism, historic, leisure, and cultural amenity tags.
 */
router.post("/map/tourism-spots", async (req, res): Promise<void> => {
  try {
    const { lat, lng, radius = 15000 } = req.body;
    if (!lat || !lng) { res.status(400).json({ success: false, error: "lat ve lng gerekli" }); return; }

    const safeNum = (v: unknown): number | null => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    };

    // Comprehensive tourism Overpass query — multiple filter groups unioned
    const touristFilters = [
      `["tourism"~"attraction|museum|viewpoint|theme_park|gallery|zoo|aquarium|artwork|historic"]`,
      `["historic"~"monument|castle|ruins|archaeological_site|memorial|fort|palace|church|mosque|synagogue|temple|shrine|unesco"]`,
      `["leisure"~"beach|nature_reserve|park|garden|marina|stadium|water_park"]`,
      `["amenity"~"theatre|cinema|arts_centre|place_of_worship|community_centre|library|museum"]`,
      `["natural"~"peak|waterfall|cave_entrance|bay|beach|cliff"]`,
    ];

    const parts = touristFilters.flatMap(f => [
      `node${f}(around:${radius},${lat},${lng});`,
      `way${f}(around:${radius},${lat},${lng});`,
      `relation${f}(around:${radius},${lat},${lng});`,
    ]).join("");

    const query = `[out:json][timeout:120];(${parts});out center meta;`;
    const body = new URLSearchParams({ data: query });

    const fetchRes = await postOverpassInterpreter(body.toString(), {
      timeoutMs: 125_000,
      userAgent: "Yekpare/1.0 (https://yekpare.net; tourism-spots)",
    });

    if (!fetchRes.ok) {
      res.status(500).json({ success: false, error: `Overpass API hatası: ${fetchRes.status}` });
      return;
    }

    const osmData = await fetchRes.json() as { elements: Array<{
      type: string; id: number; lat?: number; lon?: number;
      center?: { lat: number; lon: number }; tags?: Record<string, string>;
    }> };

    const SPOT_TYPE_LABEL: Record<string, string> = {
      museum: "Müze", attraction: "Turistik Alan", viewpoint: "Manzara Noktası",
      castle: "Kale", monument: "Anıt", ruins: "Harabe", archaeological_site: "Arkeolojik Alan",
      memorial: "Anıt/Mezar", beach: "Plaj", park: "Park", nature_reserve: "Doğal Alan",
      theatre: "Tiyatro", cinema: "Sinema", arts_centre: "Kültür Merkezi",
      place_of_worship: "İbadet Yeri", peak: "Dağ Tepesi", waterfall: "Şelale",
      theme_park: "Eğlence Parkı", zoo: "Hayvanat Bahçesi", aquarium: "Akvaryum",
      gallery: "Galeri", historic: "Tarihi Yer", fort: "Kale/Hisar", palace: "Saray",
      church: "Kilise", mosque: "Cami", shrine: "Türbe/Tekke", marina: "Marina",
      garden: "Botanik/Bahçe", stadium: "Stadyum", library: "Kütüphane",
    };

    const spots: Array<{
      osmId: string; name: string; nameTr: string | null; type: string; typeLabel: string;
      lat: number; lng: number; rating?: number | null; address?: string | null;
      image?: string | null; wikidata?: string | null;
    }> = [];

    const seen = new Set<string>();

    for (const el of osmData.elements) {
      try {
        const tags = el.tags ?? {};
        const name = (tags.name || tags["name:tr"] || tags["name:en"] || "").trim();
        if (!name) continue;
        if (seen.has(name.toLowerCase())) continue;

        const elLat = safeNum(el.lat ?? el.center?.lat);
        const elLng = safeNum(el.lon ?? el.center?.lon);
        if (elLat === null || elLng === null) continue;

        seen.add(name.toLowerCase());

        const typeRaw = tags.tourism || tags.historic || tags.leisure || tags.amenity || tags.natural || "attraction";
        const typeLabel = SPOT_TYPE_LABEL[typeRaw] || "Turistik Alan";

        const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
          .filter(Boolean).join(", ") || tags.description || null;

        spots.push({
          osmId: `osm_${el.type}_${el.id}`,
          name,
          nameTr: tags["name:tr"] || null,
          type: typeRaw,
          typeLabel,
          lat: elLat,
          lng: elLng,
          rating: null,
          address,
          image: tags.image || tags["wikimedia_commons"] || null,
          wikidata: tags.wikidata || null,
        });
      } catch {}
    }

    // Sort: viewpoints and attractions first, then alphabetical
    spots.sort((a, b) => {
      const priority = ["museum", "castle", "palace", "attraction", "archaeological_site", "monument", "ruins"];
      const ap = priority.indexOf(a.type);
      const bp = priority.indexOf(b.type);
      if (ap !== -1 && bp === -1) return -1;
      if (bp !== -1 && ap === -1) return 1;
      return a.name.localeCompare(b.name, "tr");
    });

    res.json({ success: true, data: spots.slice(0, 200), total: spots.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — CITY POIS — non-commercial amenities by category ──────────── */

/**
 * POST /map/city-pois
 * Returns non-commercial POIs (places of worship, government, health,
 * education, security) via Overpass API for a given city centre.
 * category: "ibadet" | "devlet" | "saglik" | "egitim" | "guvenlik"
 */
router.post("/map/city-pois", async (req, res): Promise<void> => {
  try {
    const { lat, lng, radius = 15000, category } = req.body as {
      lat: number; lng: number; radius?: number; category: string;
    };
    if (!lat || !lng || !category) {
      res.status(400).json({ success: false, error: "lat, lng ve category gerekli" });
      return;
    }

    const safeNum = (v: unknown): number | null => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    };

    /* — Overpass filter groups per category — */
    const FILTERS: Record<string, string[]> = {
      ibadet: [
        `["amenity"="place_of_worship"]`,
        `["religion"~"muslim|christian|jewish|buddhist|hindu"]`,
      ],
      devlet: [
        `["amenity"~"townhall|courthouse|post_office|embassy"]["amenity"!~"hospital|clinic|pharmacy|school|university|kindergarten"]`,
        `["office"~"government|administrative|tax|notary|registry"]["amenity"!~"hospital|clinic|pharmacy"]`,
        `["government"~"parliament|legislature|executive|council"]["amenity"!~"hospital|clinic|pharmacy|school"]`,
        `["amenity"="townhall"]`,
        `["amenity"="courthouse"]`,
        `["amenity"="embassy"]`,
        `["amenity"="post_office"]`,
        `["name"~"[Bb]akanlık|[Kk]aymakamlık|[Vv]alilik|[Aa]dliye|[Ss]avcılık|[Tt]apu [Mm]üdür|[Vv]ergi [Dd]airesi|[Nn]üfus [Mm]üdür|AFAD|TKGM|PTT [Mm]erkez|[Ss]osyal [Hh]izmet [Mm]erkezi"]["amenity"!~"hospital|clinic|pharmacy|school|university"]["amenity"!="place_of_worship"][!"boundary"]`,
      ],
      saglik: [
        `["amenity"~"hospital|clinic|doctors|dentist|pharmacy|health_post|nursing_home|blood_donation"]`,
        `["healthcare"~"hospital|clinic|doctor|dentist|pharmacy|physiotherapist|alternative|laboratory|optometrist|rehabilitation"]`,
        `["name"~"[Hh]astane|[Pp]oliklinik|[Ee]czane|[Dd]iş|[Ss]ağlık [Mm]erk|[Aa]ile [Ss]ağlık|[Dd]iyaliz|[Oo]nkoloji|[Aa]cil"]["amenity"!~"townhall|courthouse|school|university"][!"boundary"]`,
      ],
      egitim: [
        `["amenity"~"school|kindergarten|university|college|library|driving_school|music_school|language_school|prep_school"]`,
        `["education"~".*"]`,
        `["building"~"school|university|college"]`,
      ],
      guvenlik: [
        `["amenity"~"police|fire_station|prison"]`,
        `["military"~"barracks|checkpoint|office"]`,
        `["office"~"military"]`,
      ],
    };

    const filters = FILTERS[category];
    if (!filters) {
      res.status(400).json({ success: false, error: `Bilinmeyen kategori: ${category}` });
      return;
    }

    const parts = filters.flatMap(f => [
      `node${f}(around:${radius},${lat},${lng});`,
      `way${f}(around:${radius},${lat},${lng});`,
      `relation${f}(around:${radius},${lat},${lng});`,
    ]).join("");

    const query = `[out:json][timeout:120];(${parts});out center meta;`;
    const body = new URLSearchParams({ data: query });

    const fetchRes = await postOverpassInterpreter(body.toString(), {
      timeoutMs: 125_000,
      userAgent: "Yekpare/1.0 (https://yekpare.net; city-pois)",
    });

    if (!fetchRes.ok) {
      res.status(500).json({ success: false, error: `Overpass API hatası: ${fetchRes.status}` });
      return;
    }

    const osmData = await fetchRes.json() as { elements: Array<{
      type: string; id: number; lat?: number; lon?: number;
      center?: { lat: number; lon: number }; tags?: Record<string, string>;
    }> };

    /* — Type-label maps per category — */
    const TYPE_LABELS: Record<string, Record<string, string>> = {
      ibadet: {
        place_of_worship: "İbadet Yeri", mosque: "Cami", church: "Kilise",
        synagogue: "Sinagog", temple: "Tapınak", shrine: "Türbe/Tekke", chapel: "Şapel",
      },
      devlet: {
        townhall: "Belediye", courthouse: "Adliye", post_office: "PTT",
        social_facility: "Sosyal Hizmet", embassy: "Büyükelçilik",
        government: "Devlet Kurumu", administrative: "İdari Ofis",
        tax: "Vergi Dairesi", notary: "Noter", registry: "Nüfus Müdürlüğü",
        community_centre: "Halk Merkezi",
      },
      saglik: {
        hospital: "Hastane", clinic: "Klinik / Poliklinik", doctors: "Doktor",
        dentist: "Diş Hekimi", pharmacy: "Eczane", health_post: "Sağlık Ocağı",
        nursing_home: "Huzurevi", blood_donation: "Kan Bağışı",
      },
      egitim: {
        school: "Okul", kindergarten: "Anaokulu", university: "Üniversite",
        college: "Meslek Yüksekokulu", library: "Kütüphane",
        driving_school: "Sürücü Kursu", music_school: "Müzik Okulu",
        language_school: "Dil Kursu", prep_school: "Etüt / Dershane",
      },
      guvenlik: {
        police: "Polis / Emniyet", fire_station: "İtfaiye",
        prison: "Ceza İnfaz Kurumu", barracks: "Askeri Kışla",
        checkpoint: "Kontrol Noktası",
      },
    };

    const labelMap = TYPE_LABELS[category] || {};

    const pois: Array<{
      osmId: string; name: string; nameTr: string | null;
      type: string; typeLabel: string;
      lat: number; lng: number;
      address?: string | null; phone?: string | null; website?: string | null;
    }> = [];
    const seen = new Set<string>();

    for (const el of osmData.elements) {
      try {
        const tags = el.tags ?? {};
        const name = (tags["name"] || tags["name:tr"] || tags["name:en"] || "").trim();
        if (!name) continue;
        if (seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());

        const elLat = safeNum(el.lat ?? el.center?.lat);
        const elLng = safeNum(el.lon ?? el.center?.lon);
        if (elLat === null || elLng === null) continue;

        const rawType = tags["amenity"] || tags["office"] || tags["government"] ||
          tags["healthcare"] || tags["military"] || tags["religion"] || "unknown";
        let typeLabel = labelMap[rawType] || labelMap[tags["building"] || ""] || "";
        if (!typeLabel && category === "devlet") {
          const n = name.toLowerCase();
          if (n.includes("bakanlık")) typeLabel = "Bakanlık";
          else if (n.includes("müdürlük")) typeLabel = "Müdürlük";
          else if (n.includes("kaymakamlık")) typeLabel = "Kaymakamlık";
          else if (n.includes("valilik")) typeLabel = "Valilik";
          else if (n.includes("adliye") || n.includes("savcılık")) typeLabel = "Adliye/Savcılık";
          else if (n.includes("emniyet")) typeLabel = "Emniyet Müdürlüğü";
          else if (n.includes("tapu")) typeLabel = "Tapu Müdürlüğü";
          else if (n.includes("sgk") || n.includes("sosyal güvenlik")) typeLabel = "SGK";
          else if (n.includes("vergi")) typeLabel = "Vergi Dairesi";
          else if (n.includes("nüfus")) typeLabel = "Nüfus Müdürlüğü";
          else if (n.includes("milli eğitim")) typeLabel = "Milli Eğitim Müdürlüğü";
          else if (n.includes("afad")) typeLabel = "AFAD";
          else if (n.includes("ptt")) typeLabel = "PTT";
          else typeLabel = "Devlet Kurumu";
        }
        if (!typeLabel) typeLabel = "Yer";

        const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
          .filter(Boolean).join(", ") || null;

        pois.push({
          osmId: `osm_${el.type}_${el.id}`,
          name,
          nameTr: tags["name:tr"] || null,
          type: rawType,
          typeLabel,
          lat: elLat,
          lng: elLng,
          address,
          phone: tags["phone"] || tags["contact:phone"] || null,
          website: tags["website"] || tags["contact:website"] || null,
        });
      } catch {}
    }

    pois.sort((a, b) => a.name.localeCompare(b.name, "tr"));

    res.json({ success: true, data: pois.slice(0, 300), total: pois.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — GOOGLE MAPS BOT SCRAPER (Puppeteer, API key yok) ──────────── */

const GMAPS_SCRAPER_MAX_RESULTS = 500;

router.post("/map/scrape-gmaps", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const body = req.body as Record<string, unknown>;
    const query = String(body.query ?? "").trim();
    const latRaw = body.lat;
    const lngRaw = body.lng;
    const maxRaw = body.maxResults ?? body.max_results;
    const maxParsed = Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : 100;
    const maxResults = maxParsed <= 0
      ? GMAPS_SCRAPER_MAX_RESULTS
      : Math.min(Math.max(1, Math.round(maxParsed)), GMAPS_SCRAPER_MAX_RESULTS);
    const previewOnly = body.preview === true || body.autoImport === false;
    const autoImport = !previewOnly && body.autoImport !== false;
    const syncMode = body.sync === true || body.sync === "1";
    const categorySlugVal = body.categorySlug != null ? String(body.categorySlug).trim() : "";
    const categoryIdVal =
      body.categoryId != null && body.categoryId !== "" ? String(body.categoryId).trim() : null;
    const storeTypeRaw = body.storeType != null ? String(body.storeType).trim() : "";
    const homepageSuperRaw = body.homepageSuperCategory != null ? String(body.homepageSuperCategory).trim() : "";
    const storeTypeNorm = storeTypeRaw.slice(0, 80) || null;
    const homepageSuperNorm = homepageSuperRaw.slice(0, 80) || null;
    if (!query) {
      res.status(400).json({ success: false, error: "query (arama terimi) gerekli" });
      return;
    }

    const latNum =
      latRaw != null && latRaw !== "" && Number.isFinite(parseFloat(String(latRaw)))
        ? parseFloat(String(latRaw))
        : undefined;
    const lngNum =
      lngRaw != null && lngRaw !== "" && Number.isFinite(parseFloat(String(lngRaw)))
        ? parseFloat(String(lngRaw))
        : undefined;

    const scrapeOpts = {
      query,
      lat: latNum,
      lng: lngNum,
      maxResults,
      previewOnly,
      enrichMax: previewOnly ? 0 : Math.min(maxResults, 40),
    };
    const importOpts: AdminManualGmapsImportOpts = {
      businesses: [],
      latNum,
      lngNum,
      categorySlugVal,
      categoryIdVal,
      storeTypeNorm,
      homepageSuperNorm,
    };

    const runGmapsJobBody = async (jobId: string | null): Promise<Record<string, unknown>> => {
      const touch = (phase: string) => {
        if (!jobId) return;
        const j = mapGmapsScrapeJobs.get(jobId);
        if (j) {
          j.phase = phase;
          j.updatedAt = new Date().toISOString();
        }
      };
      touch("scraping");
      const result = await scrapeGoogleMaps(scrapeOpts);
      if (result.error && result.businesses.length === 0) {
        const errMsg = result.error;
        const isChromium = /Chromium bulunamadı|CHROMIUM_PATH/i.test(errMsg);
        throw Object.assign(new Error(errMsg), { statusCode: isChromium ? 503 : 500, hint: isChromium ? "Docker imajında chromium kurulu olmalı veya CHROMIUM_PATH ortam değişkeni ayarlanmalı." : undefined });
      }
      if (!autoImport) {
        return {
          success: true,
          data: result.businesses,
          total: result.businesses.length,
          source: "Google Maps (Bot)",
        };
      }
      touch("importing");
      importOpts.businesses = result.businesses;
      const out = await importAdminManualGmapsScrapeBatch(importOpts);
      return {
        success: true,
        message: `${out.imported} işletme eklendi, ${out.skipped} atlandı${out.skippedMissingContact > 0 ? ` (${out.skippedMissingContact} telefon+adres eksik)` : ""}${out.errors.length > 0 ? `, ${out.errors.length} hata` : ""}`,
        imported: out.imported,
        skipped: out.skipped,
        skippedMissingContact: out.skippedMissingContact,
        errors: out.errors.length > 0 ? out.errors : undefined,
        total: out.total,
        source: "Google Maps (Bot)",
        data: out.data,
      };
    };

    if (!syncMode) {
      pruneMapGmapsScrapeJobs();
      const jobId = randomUUID();
      const now = new Date().toISOString();
      mapGmapsScrapeJobs.set(jobId, { status: "queued", phase: "queued", createdAt: now, updatedAt: now });
      void (async () => {
        const j = mapGmapsScrapeJobs.get(jobId);
        if (!j) return;
        j.status = "running";
        j.updatedAt = new Date().toISOString();
        try {
          j.result = await runGmapsJobBody(jobId);
          j.status = "done";
          j.updatedAt = new Date().toISOString();
        } catch (e) {
          j.status = "error";
          const err = e as Error & { hint?: string; statusCode?: number };
          j.error = [err.message, err.hint].filter(Boolean).join(" ");
          j.updatedAt = new Date().toISOString();
        }
      })();
      res.status(202).json({
        success: true,
        async: true,
        jobId,
        message: "Google Maps kazıması arka planda çalışıyor. Durum için GET /api/map/admin/scrape-gmaps-job/{jobId}",
      });
      return;
    }

    try {
      const out = await runGmapsJobBody(null);
      res.json(out);
    } catch (e) {
      const err = e as Error & { hint?: string; statusCode?: number };
      res.status(err.statusCode ?? 500).json({
        success: false,
        error: err.message,
        hint: err.hint,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — GOOGLE SCRAPER (Admin) ─────────────────────────────────────── */

router.get("/map/admin/scrape-gmaps-job/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  pruneMapGmapsScrapeJobs();
  const job = mapGmapsScrapeJobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, error: "İş bulunamadı veya süresi doldu." });
    return;
  }
  res.json({ success: true, jobId: req.params.id, ...job });
});

router.get("/map/admin/scrape-places-job/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  pruneMapPlacesScrapeJobs();
  const job = mapPlacesScrapeJobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, error: "İş bulunamadı veya süresi doldu." });
    return;
  }
  res.json({ success: true, jobId: req.params.id, ...job });
});

router.post("/map/scrape", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS google_places_extras JSONB`);

    const body = req.body as Record<string, unknown>;
    const textQuery = String(body.textQuery ?? body.text_query ?? "").trim();
    const lat = body.lat != null && body.lat !== "" ? Number(body.lat) : NaN;
    const lng = body.lng != null && body.lng !== "" ? Number(body.lng) : NaN;
    const radius = normalizeGooglePlacesImportRadius(body.radius, 5000);
    const category = body.category != null ? String(body.category).trim() : "";
    const keyword = body.keyword != null ? String(body.keyword).trim() : "";
    const homepageSuperCategory = String(body.homepageSuperCategory ?? body.homepage_super_category ?? "mekan_dukkan").trim() || "mekan_dukkan";
    const storeType = String(body.storeType ?? body.store_type ?? "").trim();
    const maxRaw = body.maxResults ?? body.max_results;
    const maxParsed = Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : 100;
    const maxResults = maxParsed <= 0
      ? GOOGLE_PLACES_IMPORT_VALID_TARGET
      : Math.min(Math.max(1, Math.round(maxParsed)), GOOGLE_PLACES_IMPORT_VALID_TARGET);
    const markOpeningAll = body.markOpeningAll === true || body.mark_opening_all === true;
    const hybridScrapeOn = !(body.hybridScrape === false || body.hybrid_scrape === false);
    const asyncMode = !(body.sync === true || body.sync === "1");

    if (!textQuery && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
      res.status(400).json({ success: false, error: "Metin araması (ör. Ankara Çankaya restoran) veya enlem+boylam gerekli." });
      return;
    }

    const apiKey = await resolveGooglePlacesApiKey();
    if (!apiKey) {
      res.status(400).json({
        success: false,
        error: "Google Places API anahtarı ayarlanmamış.",
        hint: "Sunucu için GOOGLE_PLACES_API_KEY ortam değişkeni veya Harita / Genel Ayarlar’da IP kısıtlı (referrer’sız) bir anahtar girin. Tarayıcı (referrer) anahtarı Text Search ile çalışmaz.",
      });
      return;
    }
    const placesKey: string = apiKey;
    const autoImportSettings = await getMapAutoImportSettings();

    const scrapeArgs: MapPlacesGoogleScrapeArgs = {
      textQuery,
      lat,
      lng,
      radius,
      category,
      keyword,
      homepageSuperCategory,
      storeType,
      maxResults,
      markOpeningAll,
      hybridScrapeOn,
      placesKey,
      mediaLimit: Math.max(autoImportSettings.photoCount, autoImportSettings.reviewCount),
    };

    const scrapeLog = { warn: req.log.warn.bind(req.log), error: req.log.error.bind(req.log) };
    const runHy = (
      rows: Array<{ id: string; name: string; address: string | null; latitude: number | null; longitude: number | null }>,
      _lg: MapPlacesScrapeLog,
    ) => {
      void runHybridScrapeEnrichmentForNewBusinesses(rows, req.log).catch(() => {});
    };

    if (asyncMode) {
      pruneMapPlacesScrapeJobs();
      const jobId = randomUUID();
      const now = new Date().toISOString();
      mapPlacesScrapeJobs.set(jobId, { status: "queued", createdAt: now, updatedAt: now });
      void (async () => {
        const j = mapPlacesScrapeJobs.get(jobId);
        if (!j) return;
        j.status = "running";
        j.updatedAt = new Date().toISOString();
        try {
          const out = await runMapPlacesGoogleScrape(scrapeArgs, scrapeLog, runHy);
          j.status = "done";
          j.result = out;
          j.updatedAt = new Date().toISOString();
        } catch (e) {
          j.status = "error";
          if (e instanceof MapPlacesScrapeHttpError) {
            const payload = e.payload as { error?: string; hint?: string };
            j.error = [payload.error, payload.hint].filter(Boolean).join(" ") || e.message;
          } else {
            j.error = String(e);
          }
          j.updatedAt = new Date().toISOString();
        }
      })();
      res.status(202).json({
        success: true,
        async: true,
        jobId,
        message: "Google Places kazıması arka planda çalışıyor. Durum için GET /api/map/admin/scrape-places-job/{jobId}",
      });
      return;
    }

    try {
      const out = await runMapPlacesGoogleScrape(scrapeArgs, scrapeLog, runHy);
      res.json(out);
    } catch (e) {
      if (e instanceof MapPlacesScrapeHttpError) {
        res.status(e.statusCode).json(e.payload);
        return;
      }
      throw e;
    }
  } catch (err) {
    req.log.error({ err }, "map/scrape fatal");
    res.status(500).json({
      success: false,
      error: String(err),
      debug: err instanceof Error ? { name: err.name, message: err.message } : undefined,
    });
  }
});

/* — OWNER AUTH ─────────────────────────────────────────────────── */

// Register business owner account
router.post("/map/owner/register", async (req, res): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password) { res.status(400).json({ success: false, error: "Email ve şifre gerekli" }); return; }
    const existing = await db.select({ id: mapUsersTable.id }).from(mapUsersTable).where(eq(mapUsersTable.email, email)).limit(1);
    if (existing.length > 0) { res.status(409).json({ success: false, error: "Bu email zaten kayıtlı" }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(mapUsersTable).values({
      email, passwordHash, firstName: firstName || null, lastName: lastName || null,
      phone: phone || null, provider: "email", displayName: firstName ? `${firstName} ${lastName || ""}`.trim() : email,
    }).returning({ id: mapUsersTable.id, email: mapUsersTable.email, displayName: mapUsersTable.displayName });
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, data: { user, token } });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// Login as business owner
router.post("/map/owner/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ success: false, error: "Email ve şifre gerekli" }); return; }
    const [user] = await db.select().from(mapUsersTable).where(eq(mapUsersTable.email, email)).limit(1);
    if (!user || !user.passwordHash) { res.status(401).json({ success: false, error: "Geçersiz email veya şifre" }); return; }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) { res.status(401).json({ success: false, error: "Geçersiz email veya şifre" }); return; }
    // Find associated business
    const businesses = await db.select({ id: mapBusinessesTable.id, name: mapBusinessesTable.name, isPremium: mapBusinessesTable.isPremium })
      .from(mapBusinessesTable).where(eq(mapBusinessesTable.ownerId, user.id));
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, data: { user: { id: user.id, email: user.email, displayName: user.displayName, phone: user.phone }, businesses, token } });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// Get current owner profile + businesses
router.get("/map/owner/me", async (req, res): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(401).json({ success: false, error: "Token gerekli" }); return; }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const [user] = await db.select().from(mapUsersTable).where(eq(mapUsersTable.id, decoded.userId)).limit(1);
    if (!user) { res.status(404).json({ success: false, error: "Kullanıcı bulunamadı" }); return; }
    const businesses = await db.select().from(mapBusinessesTable).where(eq(mapBusinessesTable.ownerId, user.id));
    res.json({ success: true, data: { user: { id: user.id, email: user.email, displayName: user.displayName, phone: user.phone }, businesses } });
  } catch { res.status(401).json({ success: false, error: "Geçersiz token" }); }
});

function msForBoostPeriod(period: string, units: number): number {
  const u = Math.max(1, Math.floor(Number(units)) || 1);
  if (period === "week") return u * 7 * 24 * 60 * 60 * 1000;
  if (period === "month") return u * 30 * 24 * 60 * 60 * 1000;
  return u * 24 * 60 * 60 * 1000;
}

const FEATURE_MAP_PREMIUM_PLACEMENTS = new Set([
  "kesfet_harita",
  "siparis",
  "alisveris",
  "turizm",
]);

const MAP_BUSINESS_HAS_ACTIVE_VENDOR = sql`
  EXISTS (
    SELECT 1
    FROM vendors v
    WHERE v.linked_map_business_id = ${mapBusinessesTable.id}
      AND COALESCE(v.active, TRUE) = TRUE
  )
`;

/** Turizm BC / vendor sync demo kayıtları — admin panelde kalır, Keşfet/harita public listelerinde görünmez. */
const MAP_BUSINESS_PUBLIC_NOT_DEMO = sql`
  NOT EXISTS (
    SELECT 1
    FROM vendors v
    WHERE v.linked_map_business_id = ${mapBusinessesTable.id}
      AND (
        lower(COALESCE(v.slug, '')) LIKE 'yekpare-demo-%'
        OR lower(COALESCE(v.name, '')) LIKE 'yekpare demo%'
      )
  )
  AND lower(COALESCE(${mapBusinessesTable.slug}, '')) NOT LIKE 'yekpare-demo-%'
  AND NOT (
    regexp_replace(
      lower(
        translate(
          COALESCE(${mapBusinessesTable.name}, ''),
          'İIıŞşĞğÜüÖöÇç',
          'iiissgguuoocc'
        )
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    ) ~ '(^| )yekpare demo( |$)|(^| )demo oteller( |$)|(^| )demo turlar( |$)|(^| )demo villa( |$)|(^| )demo arac( |$)|(^| )demo yat( |$)'
  )
  AND NOT ('demo_seed' = ANY(COALESCE(${mapBusinessesTable.tags}, ARRAY[]::text[])))
`;

/**
 * İşletmeye özel `/kesfet/:slug` sayfası verilir mi? Yalnız doğrulanmış (sahipli),
 * premium veya aktif vendor'a bağlı kayıtlar. Salt Google'dan kazınan (sahipsiz,
 * premium olmayan) işletmeler özel sayfa almaz; haritaya yönlendirilir.
 */
const MAP_BUSINESS_HAS_PUBLIC_PROFILE = sql<boolean>`(
  ${MAP_BUSINESS_HAS_ACTIVE_VENDOR}
  OR ${mapBusinessesTable.ownerId} IS NOT NULL
  OR ${mapBusinessesTable.isPremium} = TRUE
)`;

/** Google Maps bot kazıması — import_source veya gmaps_scrape etiketi. */
const MAP_BUSINESS_IS_GMAPS_SCRAPE = or(
  eq(mapBusinessesTable.importSource, "gmaps_scrape"),
  sql`EXISTS (
    SELECT 1 FROM unnest(COALESCE(${mapBusinessesTable.tags}, ARRAY[]::text[])) AS tag
    WHERE tag = 'gmaps_scrape'
  )`,
);

/** Google/OSM kazıması veya koordinatlı legacy import — aktif + demo dışı public listede görünür. */
const MAP_BUSINESS_IS_SCRAPED_IMPORT = or(
  eq(mapBusinessesTable.importSource, "google_places"),
  eq(mapBusinessesTable.importSource, "places_api"),
  eq(mapBusinessesTable.importSource, "gmaps_scrape"),
  eq(mapBusinessesTable.importSource, "osm"),
  eq(mapBusinessesTable.importSource, "insaatfirmalarim"),
  // Eski içe aktarımlar: import_source boş ama Google/koordinat verisi var.
  and(
    sql`${mapBusinessesTable.googlePlaceId} IS NOT NULL`,
    sql`${mapBusinessesTable.latitude} IS NOT NULL`,
    sql`${mapBusinessesTable.longitude} IS NOT NULL`,
  ),
);

const MAP_BUSINESS_PUBLIC_VISIBLE = or(
  MAP_BUSINESS_HAS_ACTIVE_VENDOR,
  MAP_BUSINESS_IS_SCRAPED_IMPORT,
);

const MAP_BUSINESS_PUBLIC_CONTENT_QUALITY = sql`
  (
    ${mapBusinessesTable.homepageSuperCategory} = 'kamu'
    OR ${MAP_BUSINESS_HAS_ACTIVE_VENDOR}
    OR ${MAP_BUSINESS_IS_SCRAPED_IMPORT}
    OR (
      (
        NULLIF(BTRIM(COALESCE(${mapBusinessesTable.photoUrl}, '')), '') IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(${mapBusinessesTable.coverPhotoUrl}, '')), '') IS NOT NULL
        OR COALESCE(${mapBusinessesTable.scrapedPhotos}::text, '') NOT IN ('', 'null', '[]')
        OR EXISTS (
          SELECT 1
          FROM map_business_images mbi
          WHERE mbi.business_id = ${mapBusinessesTable.id}
            AND NULLIF(BTRIM(COALESCE(mbi.image_url, '')), '') IS NOT NULL
        )
      )
      OR COALESCE(${mapBusinessesTable.rating}, 0) > 0
      OR (
        COALESCE(${mapBusinessesTable.userRatingsTotal}, 0) > 0
        OR COALESCE(${mapBusinessesTable.scrapedReviews}::text, '') NOT IN ('', 'null', '[]')
        OR EXISTS (
          SELECT 1
          FROM map_reviews mr
          WHERE mr.business_id = ${mapBusinessesTable.id}
            OR (
              ${mapBusinessesTable.googlePlaceId} IS NOT NULL
              AND mr.google_place_id = ${mapBusinessesTable.googlePlaceId}
            )
        )
      )
    )
  )
`;

const MAP_BUSINESS_PUBLIC_PRIVATE_CANDIDATE_ALLOWED = sql`
  ${mapBusinessesTable.homepageSuperCategory} = 'kamu'
  OR NOT (
    regexp_replace(
      lower(
        translate(
          COALESCE(${mapBusinessesTable.name}, '') || ' ' ||
          COALESCE(${mapBusinessesTable.address}, '') || ' ' ||
          COALESCE(${mapBusinessesTable.storeType}, '') || ' ' ||
          COALESCE(array_to_string(${mapBusinessesTable.tags}, ' '), ''),
          'İIıŞşĞğÜüÖöÇç',
          'iiissgguuoocc'
        )
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    ) ~ ${PUBLIC_MAP_EXCLUDED_TEXT_REGEX}
    OR lower(COALESCE(${mapBusinessesTable.googlePlacesExtras}::text, '')) ~ ${PUBLIC_MAP_EXCLUDED_TYPE_REGEX}
  )
`;

/** GET /map/feature-placement-pricing — herkese açık fiyat listesi (işletme paneli) */
router.get("/map/feature-placement-pricing", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(mapFeaturePlacementPricingTable)
      .orderBy(asc(mapFeaturePlacementPricingTable.sortOrder), asc(mapFeaturePlacementPricingTable.placementKey));
    const data = rows.map((r) => ({
      placementKey: r.placementKey,
      labelTr: r.labelTr,
      priceDay: r.priceDay,
      priceWeek: r.priceWeek,
      priceMonth: r.priceMonth,
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** PUT /map/admin/feature-placement-pricing — birim fiyatları güncelle */
router.put("/map/admin/feature-placement-pricing", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { rows } = req.body as {
      rows?: Array<{
        placementKey: string;
        labelTr: string;
        priceDay: number;
        priceWeek: number;
        priceMonth: number;
        sortOrder?: number;
      }>;
    };
    if (!Array.isArray(rows)) {
      res.status(400).json({ success: false, error: "rows dizisi gerekli" });
      return;
    }
    for (const row of rows) {
      if (!row.placementKey) continue;
      await db
        .update(mapFeaturePlacementPricingTable)
        .set({
          labelTr: String(row.labelTr ?? ""),
          priceDay: Number(row.priceDay) || 0,
          priceWeek: Number(row.priceWeek) || 0,
          priceMonth: Number(row.priceMonth) || 0,
          sortOrder: row.sortOrder ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(mapFeaturePlacementPricingTable.placementKey, row.placementKey));
    }
    const out = await db
      .select()
      .from(mapFeaturePlacementPricingTable)
      .orderBy(asc(mapFeaturePlacementPricingTable.sortOrder), asc(mapFeaturePlacementPricingTable.placementKey));
    res.json({
      success: true,
      data: out.map((r) => ({
        placementKey: r.placementKey,
        labelTr: r.labelTr,
        priceDay: r.priceDay,
        priceWeek: r.priceWeek,
        priceMonth: r.priceMonth,
        sortOrder: r.sortOrder,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /map/owner/feature-promotion-requests */
router.post("/map/owner/feature-promotion-requests", async (req, res): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ success: false, error: "Token gerekli" });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const {
      businessId,
      placementKey,
      billingPeriod,
      units,
      paymentMethod,
      receiptUrl,
      categorySuper,
      targetType,
      productId,
      campaignId,
    } = req.body as {
      businessId?: string;
      placementKey?: string;
      billingPeriod?: string;
      units?: number;
      paymentMethod?: string;
      receiptUrl?: string;
      categorySuper?: string;
      targetType?: "business" | "product" | "campaign";
      productId?: string;
      campaignId?: string;
    };
    if (!businessId || !placementKey || !billingPeriod) {
      res.status(400).json({ success: false, error: "businessId, placementKey ve billingPeriod gerekli" });
      return;
    }
    if (!["day", "week", "month"].includes(billingPeriod)) {
      res.status(400).json({ success: false, error: "billingPeriod: day, week veya month olmalı" });
      return;
    }
    const pm = paymentMethod === "online" ? "online" : "bank_transfer";
    if (pm === "bank_transfer" && !String(receiptUrl ?? "").trim()) {
      res.status(400).json({ success: false, error: "Havale / EFT için dekont veya belge URL’si gerekli" });
      return;
    }
    const [biz] = await db
      .select()
      .from(mapBusinessesTable)
      .where(and(eq(mapBusinessesTable.id, businessId), eq(mapBusinessesTable.ownerId, decoded.userId)))
      .limit(1);
    if (!biz) {
      res.status(403).json({ success: false, error: "İşletme bulunamadı veya yetkiniz yok" });
      return;
    }
    const tgt = targetType === "product" || targetType === "campaign" ? targetType : "business";
    let ownedProductId: string | null = null;
    let ownedCampaignId: string | null = null;
    if (tgt === "product") {
      if (!productId) {
        res.status(400).json({ success: false, error: "productId gerekli" });
        return;
      }
      const [prod] = await db
        .select({ id: mapProductsTable.id })
        .from(mapProductsTable)
        .where(and(eq(mapProductsTable.id, productId), eq(mapProductsTable.businessId, businessId)))
        .limit(1);
      if (!prod) {
        res.status(403).json({ success: false, error: "Ürün bulunamadı veya bu işletmeye ait değil" });
        return;
      }
      ownedProductId = prod.id;
    }
    if (tgt === "campaign") {
      if (!campaignId) {
        res.status(400).json({ success: false, error: "campaignId gerekli" });
        return;
      }
      const [camp] = await db
        .select({ id: mapCampaignsTable.id })
        .from(mapCampaignsTable)
        .where(and(eq(mapCampaignsTable.id, campaignId), eq(mapCampaignsTable.businessId, businessId)))
        .limit(1);
      if (!camp) {
        res.status(403).json({ success: false, error: "Kampanya bulunamadı veya bu işletmeye ait değil" });
        return;
      }
      ownedCampaignId = camp.id;
    }
    const [priceRow] = await db
      .select()
      .from(mapFeaturePlacementPricingTable)
      .where(eq(mapFeaturePlacementPricingTable.placementKey, placementKey))
      .limit(1);
    if (!priceRow) {
      res.status(400).json({ success: false, error: "Geçersiz yayın yeri" });
      return;
    }
    const u = Math.max(1, Math.floor(Number(units)) || 1);
    const unit =
      billingPeriod === "week"
        ? priceRow.priceWeek
        : billingPeriod === "month"
          ? priceRow.priceMonth
          : priceRow.priceDay;
    const totalTry = (Number(unit) || 0) * u;
    const cat =
      placementKey === "category_home" && categorySuper ? String(categorySuper).trim().toLowerCase() : null;
    const [row] = await db
      .insert(mapFeaturePromotionRequestsTable)
      .values({
        businessId,
        ownerUserId: decoded.userId,
        placementKey,
        billingPeriod,
        units: u,
        totalTry,
        paymentMethod: pm,
        receiptUrl: pm === "bank_transfer" ? String(receiptUrl).trim() : null,
        categorySuper: cat,
        targetType: tgt,
        productId: ownedProductId,
        campaignId: ownedCampaignId,
        status: "pending",
      })
      .returning();
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        businessId: row.businessId,
        placementKey: row.placementKey,
        billingPeriod: row.billingPeriod,
        units: row.units,
        totalTry: row.totalTry,
        paymentMethod: row.paymentMethod,
        status: row.status,
        receiptUrl: row.receiptUrl,
        categorySuper: row.categorySuper,
        targetType: row.targetType,
        productId: row.productId,
        campaignId: row.campaignId,
        createdAt: row.createdAt,
      },
      message: "Talebiniz alındı. Ödeme onayından sonra yayına alınır.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /map/owner/feature-promotion-requests?businessId= */
router.get("/map/owner/feature-promotion-requests", async (req, res): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ success: false, error: "Token gerekli" });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const businessId = typeof req.query.businessId === "string" ? req.query.businessId : "";
    if (!businessId) {
      res.status(400).json({ success: false, error: "businessId gerekli" });
      return;
    }
    const [biz] = await db
      .select()
      .from(mapBusinessesTable)
      .where(and(eq(mapBusinessesTable.id, businessId), eq(mapBusinessesTable.ownerId, decoded.userId)))
      .limit(1);
    if (!biz) {
      res.status(403).json({ success: false, error: "İşletme bulunamadı veya yetkiniz yok" });
      return;
    }
    const rows = await db
      .select()
      .from(mapFeaturePromotionRequestsTable)
      .where(eq(mapFeaturePromotionRequestsTable.businessId, businessId))
      .orderBy(desc(mapFeaturePromotionRequestsTable.createdAt));
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        businessId: r.businessId,
        placementKey: r.placementKey,
        billingPeriod: r.billingPeriod,
        units: r.units,
        totalTry: r.totalTry,
        paymentMethod: r.paymentMethod,
        status: r.status,
        receiptUrl: r.receiptUrl,
        categorySuper: r.categorySuper,
        targetType: r.targetType,
        productId: r.productId,
        campaignId: r.campaignId,
        createdAt: r.createdAt,
      })),
    });
  } catch {
    res.status(401).json({ success: false, error: "Geçersiz token" });
  }
});

/** GET /map/admin/feature-promotion-requests */
router.get("/map/admin/feature-promotion-requests", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const st = typeof req.query.status === "string" ? req.query.status : "";
    const conditions = [];
    if (st && ["pending", "approved", "rejected"].includes(st)) {
      conditions.push(eq(mapFeaturePromotionRequestsTable.status, st));
    }
    const rows = await db
      .select({
        req: mapFeaturePromotionRequestsTable,
        businessName: mapBusinessesTable.name,
      })
      .from(mapFeaturePromotionRequestsTable)
      .leftJoin(mapBusinessesTable, eq(mapFeaturePromotionRequestsTable.businessId, mapBusinessesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mapFeaturePromotionRequestsTable.createdAt))
      .limit(200);
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.req.id,
        businessId: r.req.businessId,
        businessName: r.businessName,
        placementKey: r.req.placementKey,
        billingPeriod: r.req.billingPeriod,
        units: r.req.units,
        totalTry: r.req.totalTry,
        paymentMethod: r.req.paymentMethod,
        receiptUrl: r.req.receiptUrl,
        categorySuper: r.req.categorySuper,
        targetType: r.req.targetType,
        productId: r.req.productId,
        campaignId: r.req.campaignId,
        status: r.req.status,
        adminNote: r.req.adminNote,
        createdAt: r.req.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** PATCH /map/admin/feature-promotion-requests/:id — onay / red */
router.patch("/map/admin/feature-promotion-requests/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { status, adminNote } = req.body as { status?: string; adminNote?: string | null };
    if (!status || !["approved", "rejected"].includes(status)) {
      res.status(400).json({ success: false, error: "status: approved veya rejected olmalı" });
      return;
    }
    const [prev] = await db
      .select()
      .from(mapFeaturePromotionRequestsTable)
      .where(eq(mapFeaturePromotionRequestsTable.id, req.params.id!))
      .limit(1);
    if (!prev) {
      res.status(404).json({ success: false, error: "Talep bulunamadı" });
      return;
    }
    if (prev.status !== "pending") {
      res.status(400).json({ success: false, error: "Bu talep zaten işlenmiş" });
      return;
    }

    if (status === "approved") {
      const [biz] = await db.select().from(mapBusinessesTable).where(eq(mapBusinessesTable.id, prev.businessId)).limit(1);
      if (!biz) {
        res.status(400).json({ success: false, error: "İşletme kaydı bulunamadı" });
        return;
      }
      const addMs = msForBoostPeriod(prev.billingPeriod, prev.units);
      const now = new Date();

      if (
        prev.targetType === "product" &&
        prev.productId &&
        (prev.placementKey === "product_home" || prev.placementKey === "homepage")
      ) {
        const [prod] = await db.select().from(mapProductsTable).where(eq(mapProductsTable.id, prev.productId)).limit(1);
        if (!prod) {
          res.status(400).json({ success: false, error: "Ürün kaydı bulunamadı" });
          return;
        }
        const cur = prod.homeFeaturedUntil ? new Date(prod.homeFeaturedUntil) : null;
        const base = cur && cur > now ? cur : now;
        const until = new Date(base.getTime() + addMs);
        await db.update(mapProductsTable)
          .set({ homeFeatured: true, homeFeaturedUntil: until, updatedAt: new Date() })
          .where(eq(mapProductsTable.id, prod.id));
      } else if (
        prev.targetType === "campaign" &&
        prev.campaignId &&
        (prev.placementKey === "campaign_home" || prev.placementKey === "homepage")
      ) {
        const [camp] = await db.select().from(mapCampaignsTable).where(eq(mapCampaignsTable.id, prev.campaignId)).limit(1);
        if (!camp) {
          res.status(400).json({ success: false, error: "Kampanya kaydı bulunamadı" });
          return;
        }
        const cur = camp.homeFeaturedUntil ? new Date(camp.homeFeaturedUntil) : null;
        const base = cur && cur > now ? cur : now;
        const until = new Date(base.getTime() + addMs);
        await db.update(mapCampaignsTable)
          .set({ homeFeatured: true, homeFeaturedUntil: until, updatedAt: new Date() })
          .where(eq(mapCampaignsTable.id, camp.id));
      } else if (prev.placementKey === "homepage" || prev.placementKey === "category_home") {
        if (!biz.isPremium) {
          res.status(400).json({ success: false, error: "Öne çıkan alanı yalnızca premium işletmeler için kullanılabilir." });
          return;
        }
        const currentUntil = biz.homepageFeaturedUntil ? new Date(biz.homepageFeaturedUntil) : null;
        const baseHome = currentUntil && currentUntil > now ? currentUntil : now;
        const newUntil = new Date(baseHome.getTime() + addMs);
        await db
          .update(mapBusinessesTable)
          .set({
            homepageFeatured: true,
            homepageFeaturedUntil: newUntil,
            ...(prev.placementKey === "category_home" && prev.categorySuper
              ? { homepageSuperCategory: prev.categorySuper.trim().toLowerCase() }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(mapBusinessesTable.id, biz.id));
      } else if (FEATURE_MAP_PREMIUM_PLACEMENTS.has(prev.placementKey)) {
        const pe = biz.premiumExpiresAt ? new Date(biz.premiumExpiresAt) : null;
        const base = pe && pe > now ? pe : now;
        const newExp = new Date(base.getTime() + addMs);
        const wasPremiumBefore = Boolean(biz.isPremium);
        await db
          .update(mapBusinessesTable)
          .set({
            isPremium: true,
            premiumExpiresAt: newExp,
            updatedAt: new Date(),
          })
          .where(eq(mapBusinessesTable.id, biz.id));
        // Yeni premium olduysa: arka planda Google Places API ile tüm bilgileri çek.
        if (!wasPremiumBefore) {
          void enrichPremiumBusinessFromGoogle(biz.id, req.log).catch(() => {});
        }
      }
    }

    const [updated] = await db
      .update(mapFeaturePromotionRequestsTable)
      .set({
        status,
        adminNote: adminNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(mapFeaturePromotionRequestsTable.id, req.params.id!))
      .returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — BUSINESS APPLICATIONS ──────────────────────────────────────── */

// Submit application (wire transfer OR stripe)
router.post("/map/business/apply", async (req, res): Promise<void> => {
  try {
    const { businessName, categoryId, address, phone, website, description, latitude, longitude,
      ownerName, ownerPhone, ownerEmail, paymentMethod = "wire", planMonths = 1, wireTransferNote } = req.body;
    if (!businessName || !ownerName || !ownerEmail || !ownerPhone) {
      res.status(400).json({ success: false, error: "İşletme adı, yetkili adı, email ve telefon zorunlu" }); return;
    }
    const [app] = await db.insert(mapBusinessApplicationsTable).values({
      businessName, categoryId: categoryId || null, address: address || null,
      phone: phone || null, website: website || null, description: description || null,
      latitude: latitude ? parseFloat(latitude) : null, longitude: longitude ? parseFloat(longitude) : null,
      ownerName, ownerPhone, ownerEmail, paymentMethod,
      planMonths: parseInt(String(planMonths)) || 1,
      wireTransferNote: wireTransferNote || null,
      status: paymentMethod === "wire" ? "pending" : "payment_pending",
    }).returning();
    res.json({ success: true, data: app, message: paymentMethod === "wire" ? "Başvurunuz alındı. Havale onaylandıktan sonra hesabınız aktif edilecektir." : "Başvurunuz alındı." });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// Admin: list all applications
router.get("/admin/business-applications", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const apps = await db.select().from(mapBusinessApplicationsTable).orderBy(desc(mapBusinessApplicationsTable.createdAt));
    res.json({ success: true, data: apps });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// Admin: approve application → create business + owner account
router.put("/admin/business-applications/:id/approve", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const [app] = await db.select().from(mapBusinessApplicationsTable).where(eq(mapBusinessApplicationsTable.id, id)).limit(1);
    if (!app) { res.status(404).json({ success: false, error: "Başvuru bulunamadı" }); return; }

    // Create or find owner user
    let ownerId: string;
    const existingUser = await db.select({ id: mapUsersTable.id }).from(mapUsersTable).where(eq(mapUsersTable.email, app.ownerEmail)).limit(1);
    if (existingUser.length > 0) {
      ownerId = existingUser[0].id;
    } else {
      const tempPass = Math.random().toString(36).slice(2, 10);
      const passwordHash = await bcrypt.hash(tempPass, 10);
      const [newUser] = await db.insert(mapUsersTable).values({
        email: app.ownerEmail, passwordHash, displayName: app.ownerName,
        phone: app.ownerPhone, provider: "email",
      }).returning({ id: mapUsersTable.id });
      ownerId = newUser.id;
    }

    // Create business — generate a unique slug first
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (app.planMonths || 1));
    const slugBase = toSlug(app.businessName);
    let bizSlug = slugBase; let slugAttempt = 1;
    while (slugAttempt <= 200) {
      const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, bizSlug)).limit(1);
      if (clash.length === 0) break;
      bizSlug = `${slugBase}-${++slugAttempt}`;
    }
    const appDesc = String(app.description ?? "").trim();
    const generatedAbout =
      !appDesc
        ? await generateMapBusinessAboutText({
            name: String(app.businessName),
            address: app.address != null ? String(app.address) : null,
          })
        : null;
    const [business] = await db.insert(mapBusinessesTable).values({
      name: app.businessName, slug: bizSlug, categoryId: app.categoryId, address: app.address,
      phone: app.phone, website: app.website, description: appDesc || generatedAbout || null,
      latitude: app.latitude, longitude: app.longitude,
      ownerId, isPremium: true, premiumExpiresAt: expiresAt, isActive: true,
    }).returning({ id: mapBusinessesTable.id });

    // Update application
    await db.update(mapBusinessApplicationsTable)
      .set({ status: "approved", businessId: business.id, adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(mapBusinessApplicationsTable.id, id));

    res.json({ success: true, message: "Başvuru onaylandı, işletme ve hesap oluşturuldu.", data: { businessId: business.id, ownerId } });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// Admin: generate (or reset) owner credentials for any existing business
router.post("/admin/map/businesses/:id/generate-credentials", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { id } = req.params;
    const [biz] = await db.select().from(mapBusinessesTable).where(eq(mapBusinessesTable.id, id)).limit(1);
    if (!biz) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }

    const shortId = id.replace(/-/g, "").slice(0, 8);
    const email = `isletme-${shortId}@noreply.yekpare.net`;
    const rawPass = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase();
    const passwordHash = await bcrypt.hash(rawPass, 10);
    const displayName = biz.name;

    let ownerId: string;
    if (biz.ownerId) {
      // Reset password of existing owner
      await db.update(mapUsersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(mapUsersTable.id, biz.ownerId));
      ownerId = biz.ownerId;
    } else {
      // Check if an account with this auto-email already exists
      const existing = await db.select({ id: mapUsersTable.id }).from(mapUsersTable).where(eq(mapUsersTable.email, email)).limit(1);
      if (existing.length > 0) {
        ownerId = existing[0].id;
        await db.update(mapUsersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(mapUsersTable.id, ownerId));
      } else {
        const [newUser] = await db.insert(mapUsersTable).values({
          email, passwordHash, displayName, provider: "email",
        }).returning({ id: mapUsersTable.id });
        ownerId = newUser.id;
      }
      await db.update(mapBusinessesTable).set({ ownerId, updatedAt: new Date() }).where(eq(mapBusinessesTable.id, id));
    }

    res.json({ success: true, data: { email, password: rawPass, displayName, ownerId } });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

// Admin: reject application
router.put("/admin/business-applications/:id/reject", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    await db.update(mapBusinessApplicationsTable)
      .set({ status: "rejected", adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(mapBusinessApplicationsTable.id, id));
    res.json({ success: true, message: "Başvuru reddedildi." });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/* — STATS (Admin dashboard) ────────────────────────────────────── */

function gmapsScrapeMissingContactConditions(missingMode: "any" | "both"): SQL[] {
  const conditions: SQL[] = [
    eq(mapBusinessesTable.isActive, true),
    MAP_BUSINESS_IS_GMAPS_SCRAPE!,
    sql`COALESCE(${mapBusinessesTable.importSource}, '') <> 'insaatfirmalarim'`,
  ];
  if (missingMode === "both") {
    conditions.push(sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.phone}, '')), '') IS NULL`);
    conditions.push(sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.address}, '')), '') IS NULL`);
  } else {
    conditions.push(or(
      sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.phone}, '')), '') IS NULL`,
      sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.address}, '')), '') IS NULL`,
    )!);
  }
  return conditions;
}

async function countGmapsScrapeMissingContacts(
  missingMode: "any" | "both" = "both",
  ids?: string[],
): Promise<number> {
  const conditions = gmapsScrapeMissingContactConditions(missingMode);
  if (ids?.length) conditions.push(inArray(mapBusinessesTable.id, ids));
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(...conditions));
  return Number(row?.count ?? 0);
}

async function countGmapsScrapeMissingBothContacts(): Promise<number> {
  return countGmapsScrapeMissingContacts("both");
}

const PLACES_API_BACKFILL_DELAY_MS = 220;
const GMAPS_SCRAPE_BACKFILL_DELAY_MS = 1800;

function readGmapsSourceUrl(business: {
  googlePlaceId?: string | null;
  googlePlacesExtras?: Record<string, unknown> | null;
}): string | null {
  const extras = (business.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  for (const key of ["googleMapsUrl", "url", "mapsUrl"]) {
    const val = String(extras?.[key] ?? "").trim();
    if (/^https?:\/\/(www\.)?google\./i.test(val)) return val;
  }
  const raw = String(business.googlePlaceId ?? "").trim();
  if (/^https?:\/\/(www\.)?google\./i.test(raw)) return raw;
  if (raw.includes("/maps/place/")) return raw.startsWith("http") ? raw : `https://www.google.com${raw.startsWith("/") ? raw : `/${raw}`}`;
  return null;
}

async function resolveBackfillGooglePlaceId(
  apiKey: string,
  business: { googlePlaceId?: string | null; name?: string | null; latitude?: string | number | null; longitude?: string | number | null },
): Promise<string | null> {
  const fromStored = extractCleanGooglePlaceId(business.googlePlaceId);
  if (fromStored) return fromStored;
  const name = String(business.name ?? "").trim();
  if (!name) return null;
  const lat = business.latitude != null ? Number(business.latitude) : NaN;
  const lng = business.longitude != null ? Number(business.longitude) : NaN;
  try {
    return await resolvePlaceIdWithKey(apiKey, {
      query: name,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    });
  } catch {
    return null;
  }
}

async function backfillGmapsScrapeContactsBatch(input: {
  limit: number;
  dryRun: boolean;
  placesApiCap: number;
  enrichViaGmaps?: boolean;
  gmapsScrapeCap?: number;
  maxDurationMs?: number;
  ids?: string[];
  missingMode?: "any" | "both";
}): Promise<{
  scanned: number;
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  placesApiFetched: number;
  gmapsScraped: number;
  stillMissingBoth: number;
  stillMissingPhone: number;
  stillMissingAddress: number;
  remaining: number;
  partial: boolean;
  elapsedMs: number;
  samples: Array<{ id: string; name: string; phone: string | null; address: string | null; source?: string }>;
}> {
  const enrichViaGmaps = input.enrichViaGmaps === true;
  const gmapsScrapeCap = Math.min(Math.max(input.gmapsScrapeCap ?? (enrichViaGmaps ? 20 : 0), 0), 50);
  const maxDurationMs = Math.min(Math.max(input.maxDurationMs ?? 120_000, 5_000), 300_000);
  const missingMode = input.missingMode === "both" ? "both" : "any";
  const startedAt = Date.now();

  const whereConditions = [...gmapsScrapeMissingContactConditions(missingMode)];
  if (input.ids?.length) {
    whereConditions.push(inArray(mapBusinessesTable.id, input.ids));
  } else {
    whereConditions.push(backfillCandidateExclusionCondition());
  }

  const candidates = await db.select({
    business: mapBusinessesTable,
    city: mapCitiesTable,
    district: mapDistrictsTable,
  })
    .from(mapBusinessesTable)
    .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
    .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
    .where(and(...whereConditions))
    .orderBy(
      sql`CASE WHEN COALESCE((${mapBusinessesTable.googlePlacesExtras})::jsonb->>'contactBackfillAt', '') = '' THEN 0 ELSE 1 END`,
      asc(mapBusinessesTable.createdAt),
      asc(mapBusinessesTable.id),
    )
    .limit(input.limit);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let placesApiFetched = 0;
  let gmapsScraped = 0;
  let processed = 0;
  const samples: Array<{ id: string; name: string; phone: string | null; address: string | null; source?: string }> = [];
  const apiKey = input.placesApiCap > 0 ? await resolveGooglePlacesApiKey().catch(() => null) : null;
  let scrapeBusinessDetailFn: Awaited<typeof import("../lib/gmaps-scraper.js")>["scrapeBusinessDetail"] | null = null;
  if (enrichViaGmaps && gmapsScrapeCap > 0) {
    scrapeBusinessDetailFn = (await import("../lib/gmaps-scraper.js")).scrapeBusinessDetail;
  }

  for (const row of candidates) {
    if (Date.now() - startedAt >= maxDurationMs) break;
    processed++;
    try {
    const curPhone = trimMapContactField(row.business.phone);
    const curAddress = trimMapContactField(row.business.address);
    let nextPhone = curPhone;
    let nextAddress = curAddress;
    let contactSource: string | undefined;
    let extrasPatch: Record<string, unknown> | null = null;
    let resolvedPlaceId: string | null = extractCleanGooglePlaceId(row.business.googlePlaceId);

    // 1) Google Places API — place_id veya ad+koordinat ile Place Details
    if ((!nextPhone || !nextAddress) && apiKey && placesApiFetched < input.placesApiCap) {
      const placeId = await resolveBackfillGooglePlaceId(apiKey, row.business);
      if (placeId) {
        resolvedPlaceId = placeId;
        const details = await fetchPlaceDetailsNew(apiKey, placeId);
        placesApiFetched++;
        if (details.ok) {
          const p = details.place;
          if (!nextPhone) {
            nextPhone = persistableMapPhone(p.nationalPhoneNumber) || persistableMapPhone(p.internationalPhoneNumber);
          }
          if (!nextAddress) {
            nextAddress = persistableMapAddress(p.formattedAddress);
          }
          extrasPatch = {
            placesApiNew: sanitizePlacesNewForExtras(p),
            contactBackfillAt: new Date().toISOString(),
            contactBackfillSource: "places_api",
          };
          if (nextPhone || nextAddress) contactSource = "places_api";
        }
        if (placesApiFetched < input.placesApiCap) {
          await sleepMs(PLACES_API_BACKFILL_DELAY_MS);
        }
      }
    }

    // 2) Google Maps kazıma (Puppeteer) — eksik telefon/adres için
    if ((!nextPhone || !nextAddress) && scrapeBusinessDetailFn && gmapsScraped < gmapsScrapeCap) {
      const lat = row.business.latitude != null ? Number(row.business.latitude) : null;
      const lng = row.business.longitude != null ? Number(row.business.longitude) : null;
      const scraped = await scrapeBusinessDetailFn({
        name: row.business.name,
        address: nextAddress || row.business.address,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        sourceUrl: readGmapsSourceUrl({
          googlePlaceId: row.business.googlePlaceId,
          googlePlacesExtras: row.business.googlePlacesExtras as Record<string, unknown> | null,
        }),
      });
      gmapsScraped++;
      if (!nextPhone) nextPhone = persistableMapPhone(scraped.phone);
      if (!nextAddress) nextAddress = persistableMapAddress(scraped.address);
      if (scraped.googlePlaceId && !resolvedPlaceId) resolvedPlaceId = scraped.googlePlaceId;
      extrasPatch = {
        ...(extrasPatch ?? {}),
        scraperRaw: scraped,
        contactBackfillAt: new Date().toISOString(),
        contactBackfillSource: contactSource ? `${contactSource}+gmaps_scrape` : "gmaps_scrape",
      };
      if (nextPhone || nextAddress) contactSource = contactSource ? `${contactSource}+gmaps_scrape` : "gmaps_scrape";
      if (gmapsScraped < gmapsScrapeCap) {
        await sleepMs(GMAPS_SCRAPE_BACKFILL_DELAY_MS);
      }
    }

    // 3) Kayıtlı kazı ham verisi / extras — son çare (il/ilçe fallback hariç)
    if (!nextPhone || !nextAddress) {
      const fromStored = readMapBusinessStoredContactSources(row.business);
      if (!nextPhone) nextPhone = persistableMapPhone(fromStored.phone);
      if (!nextAddress) nextAddress = persistableMapAddress(fromStored.address);
      if ((nextPhone && !curPhone) || (nextAddress && !curAddress)) {
        contactSource = contactSource ? `${contactSource}+extras` : "extras";
      }
    }

    const patchPhone = curPhone || nextPhone;
    const patchAddress = curAddress || nextAddress;
    const phoneGained = !curPhone && Boolean(persistableMapPhone(patchPhone));
    const addressGained = !curAddress && Boolean(persistableMapAddress(patchAddress));
    const attemptAt = new Date().toISOString();

    if (phoneGained || addressGained) {
      if (!input.dryRun) {
        const existingExtras = (row.business.googlePlacesExtras ?? {}) as Record<string, unknown>;
        const mergedExtras = {
          ...existingExtras,
          ...(extrasPatch ?? {}),
          contactBackfillAt: attemptAt,
          contactBackfillSource: contactSource ?? "backfill",
        };
        await db.update(mapBusinessesTable).set({
          phone: patchPhone,
          address: patchAddress,
          googlePlaceId: resolvedPlaceId || row.business.googlePlaceId || null,
          googlePlacesExtras: Object.keys(mergedExtras).length ? mergedExtras : row.business.googlePlacesExtras,
          updatedAt: new Date(),
        }).where(eq(mapBusinessesTable.id, row.business.id));
      }
      updated++;
      if (samples.length < 8) {
        samples.push({
          id: row.business.id,
          name: row.business.name,
          phone: patchPhone,
          address: patchAddress,
          source: contactSource,
        });
      }
    } else {
      skipped++;
      if (!input.dryRun) {
        const existingExtras = (row.business.googlePlacesExtras ?? {}) as Record<string, unknown>;
        await db.update(mapBusinessesTable).set({
          googlePlacesExtras: {
            ...existingExtras,
            contactBackfillAt: attemptAt,
            contactBackfillSkipped: true,
          },
        }).where(eq(mapBusinessesTable.id, row.business.id));
      }
    }
    } catch {
      failed++;
    }
  }

  const remaining = await countGmapsScrapeMissingContacts(missingMode, input.ids);
  const [stillMissingBoth] = await db.select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(...gmapsScrapeMissingContactConditions("both")));
  const [stillMissingPhone] = await db.select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(
      eq(mapBusinessesTable.isActive, true),
      MAP_BUSINESS_IS_GMAPS_SCRAPE,
      sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.phone}, '')), '') IS NULL`,
    ));
  const [stillMissingAddress] = await db.select({ count: sql<number>`count(*)::int` })
    .from(mapBusinessesTable)
    .where(and(
      eq(mapBusinessesTable.isActive, true),
      MAP_BUSINESS_IS_GMAPS_SCRAPE,
      sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.address}, '')), '') IS NULL`,
    ));

  return {
    scanned: candidates.length,
    processed,
    updated,
    skipped,
    failed,
    placesApiFetched,
    gmapsScraped,
    stillMissingBoth: stillMissingBoth?.count ?? 0,
    stillMissingPhone: stillMissingPhone?.count ?? 0,
    stillMissingAddress: stillMissingAddress?.count ?? 0,
    remaining,
    partial: processed < candidates.length || remaining > 0,
    elapsedMs: Date.now() - startedAt,
    samples,
  };
}

function parseBackfillContactsQuery(req: Request): {
  limit: number;
  dryRun: boolean;
  placesApiCap: number;
  enrichViaGmaps: boolean;
  gmapsScrapeCap: number;
  maxDurationMs: number;
  ids?: string[];
  missingMode: "any" | "both";
} {
  const q = req.query;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const fast = String(q["fast"] ?? b.fast ?? "") === "1";
  const limit = Math.min(
    Math.max(parseInt(String(q["limit"] ?? b.limit ?? (fast ? "40" : "500")), 10) || (fast ? 40 : 500), 1),
    fast ? 200 : 5000,
  );
  const dryRun = String(q["dryRun"] ?? b.dryRun ?? "") === "1";
  const placesApiCap = Math.min(
    Math.max(parseInt(String(q["placesApiCap"] ?? b.placesApiCap ?? (fast ? "25" : "50")), 10) || (fast ? 25 : 50), 0),
    100,
  );
  const enrichViaGmaps =
    String(q["enrichViaGmaps"] ?? b.enrichViaGmaps ?? q["gmapsEnrich"] ?? b.gmapsEnrich ?? "") === "1"
    || String(q["enrichViaGmaps"] ?? b.enrichViaGmaps ?? q["gmapsEnrich"] ?? b.gmapsEnrich ?? "1") !== "0";
  const gmapsScrapeCap = Math.min(
    Math.max(parseInt(String(q["gmapsScrapeCap"] ?? b.gmapsScrapeCap ?? (fast ? "8" : "20")), 10) || (fast ? 8 : 20), 0),
    50,
  );
  const maxDurationMs = Math.min(
    Math.max(parseInt(String(q["maxDurationMs"] ?? b.maxDurationMs ?? (fast ? "28000" : "120000")), 10) || (fast ? 28_000 : 120_000), 5_000),
    300_000,
  );
  const idsRaw = b.ids ?? q["ids"];
  let ids: string[] | undefined;
  if (Array.isArray(idsRaw)) {
    ids = idsRaw.map((id) => String(id).trim()).filter(Boolean);
  } else if (typeof idsRaw === "string" && idsRaw.trim()) {
    ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const missingModeRaw = String(q["missingContact"] ?? q["missingMode"] ?? b.missingContact ?? b.missingMode ?? "").trim().toLowerCase();
  const missingMode: "any" | "both" =
    missingModeRaw === "any" || missingModeRaw === "1" || missingModeRaw === "true"
      ? "any"
      : "both";
  return { limit, dryRun, placesApiCap, enrichViaGmaps, gmapsScrapeCap, maxDurationMs, ids, missingMode };
}

/** POST /map/admin/backfill-scraped-contacts — Places API + Google Maps kazıma ile phone/address doldur */
router.post("/map/admin/backfill-scraped-contacts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const opts = parseBackfillContactsQuery(req);
    const result = await backfillGmapsScrapeContactsBatch(opts);
    res.json({ success: true, dryRun: opts.dryRun, enrichViaGmaps: opts.enrichViaGmaps, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /map/admin/enrich-missing-contacts-gmaps — gmaps_scrape kayıtlarında Google Haritalar ile iletişim tamamlama */
router.post("/map/admin/enrich-missing-contacts-gmaps", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const opts = parseBackfillContactsQuery(req);
    const result = await backfillGmapsScrapeContactsBatch({
      ...opts,
      enrichViaGmaps: true,
      placesApiCap: Math.max(opts.placesApiCap, 50),
    });
    res.json({ success: true, dryRun: opts.dryRun, enrichViaGmaps: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /map/admin/purge-incomplete-contacts — gmaps_scrape kayıtlarında telefon+adres hâlâ boşsa sil */
router.post("/map/admin/purge-incomplete-contacts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const fast = String(req.query["fast"] ?? req.body?.fast ?? "") === "1";
    const limit = Math.min(
      Math.max(parseInt(String(req.query["limit"] ?? req.body?.limit ?? (fast ? "80" : "500")), 10) || (fast ? 80 : 500), 1),
      fast ? 500 : 5000,
    );
    const dryRun = String(req.query["dryRun"] ?? req.body?.dryRun ?? "") === "1";
    const enrichFirst = String(req.query["enrichFirst"] ?? req.body?.enrichFirst ?? "1") !== "0";
    const placesApiCap = Math.min(
      Math.max(parseInt(String(req.query["placesApiCap"] ?? req.body?.placesApiCap ?? (fast ? "15" : "50")), 10) || (fast ? 15 : 50), 0),
      100,
    );
    const enrichViaGmaps = String(req.query["enrichViaGmaps"] ?? req.body?.enrichViaGmaps ?? "1") !== "0";

    const statsBefore = {
      missingBoth: await countGmapsScrapeMissingBothContacts(),
    };

    let enrichResult: Awaited<ReturnType<typeof backfillGmapsScrapeContactsBatch>> | null = null;
    if (enrichFirst && !dryRun) {
      enrichResult = await backfillGmapsScrapeContactsBatch({
        limit: Math.min(limit * 2, 5000),
        dryRun: false,
        placesApiCap,
        enrichViaGmaps,
        gmapsScrapeCap: 5,
        maxDurationMs: 28_000,
      });
    }

    const candidates = await db.select({
      business: mapBusinessesTable,
      city: mapCitiesTable,
      district: mapDistrictsTable,
    })
      .from(mapBusinessesTable)
      .leftJoin(mapCitiesTable, eq(mapBusinessesTable.cityId, mapCitiesTable.id))
      .leftJoin(mapDistrictsTable, eq(mapBusinessesTable.districtId, mapDistrictsTable.id))
      .where(and(
        eq(mapBusinessesTable.isActive, true),
        MAP_BUSINESS_IS_GMAPS_SCRAPE,
        sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.phone}, '')), '') IS NULL`,
        sql`NULLIF(BTRIM(COALESCE(${mapBusinessesTable.address}, '')), '') IS NULL`,
        sql`COALESCE(${mapBusinessesTable.importSource}, '') <> 'insaatfirmalarim'`,
        isNull(mapBusinessesTable.ownerId),
        sql`NOT EXISTS (
          SELECT 1 FROM vendors v
          WHERE v.linked_map_business_id = ${mapBusinessesTable.id}
            AND COALESCE(v.active, TRUE) = TRUE
        )`,
      ))
      .orderBy(desc(mapBusinessesTable.updatedAt))
      .limit(limit);

    const toDelete: string[] = [];
    let skippedOwnerClaimed = 0;
    let skippedVendorLinked = 0;
    let skippedHasContactAfterEnrich = 0;

    for (const row of candidates) {
      if (row.business.ownerId) {
        skippedOwnerClaimed++;
        continue;
      }
      // Silme kararı yalnızca DB kolonlarına göre — extras'taki zayıf metin (açıklama vb.)
      // kaydı listede tutup purge'u atlatmasın.
      const dbPhone = trimMapContactField(row.business.phone);
      const dbAddress = trimMapContactField(row.business.address);
      if (hasMapBusinessContact(dbPhone, dbAddress)) {
        skippedHasContactAfterEnrich++;
        continue;
      }
      toDelete.push(row.business.id);
    }

    if (!dryRun && toDelete.length > 0) {
      await purgeMapBusinessIds(toDelete);
    }

    const statsAfter = {
      missingBoth: dryRun ? statsBefore.missingBoth : await countGmapsScrapeMissingBothContacts(),
    };

    res.json({
      success: true,
      dryRun,
      enrichFirst,
      candidateCount: candidates.length,
      deleted: toDelete.length,
      skippedOwnerClaimed,
      skippedVendorLinked,
      skippedHasContactAfterEnrich,
      statsBefore,
      statsAfter,
      enrichResult,
      sampleIds: toDelete.slice(0, 8),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get("/map/stats", async (_req, res): Promise<void> => {
  const [
    [businesses],
    [activeBusinesses],
    [withVendor],
    [scrapedActive],
    [excludedByInactive],
    [insaatfirmalarimCount],
    [yatportCount],
    [categories],
    [users],
    [reviews],
    [claims],
    gmapsScrapeMissingBoth,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable).where(eq(mapBusinessesTable.isActive, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable).where(sql`EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.linked_map_business_id = ${mapBusinessesTable.id}
        AND COALESCE(v.active, TRUE) = TRUE
    )`),
    db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable).where(and(
      eq(mapBusinessesTable.isActive, true),
      MAP_BUSINESS_IS_SCRAPED_IMPORT,
    )),
    db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable).where(eq(mapBusinessesTable.isActive, false)),
    db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable).where(eq(mapBusinessesTable.importSource, "insaatfirmalarim")),
    db.select({ count: sql<number>`count(*)::int` }).from(mapBusinessesTable).where(eq(mapBusinessesTable.importSource, "yatport")),
    db.select({ count: sql<number>`count(*)::int` }).from(mapCategoriesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(mapUsersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(mapReviewsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(mapOwnershipClaimsTable).where(eq(mapOwnershipClaimsTable.status, "PENDING")),
    countGmapsScrapeMissingBothContacts(),
  ]);
  const total = businesses?.count ?? 0;
  res.json({
    success: true,
    data: {
      businesses: total,
      activeBusinesses: activeBusinesses?.count ?? 0,
      gmapsScrapeMissingBoth,
      publicListVisible: total,
      withVendor: withVendor?.count ?? 0,
      scrapedActive: scrapedActive?.count ?? 0,
      insaatfirmalarim: insaatfirmalarimCount?.count ?? 0,
      yatport: yatportCount?.count ?? 0,
      categories: categories?.count ?? 0,
      users: users?.count ?? 0,
      reviews: reviews?.count ?? 0,
      pendingClaims: claims?.count ?? 0,
      /** @deprecated use scrapedActive */
      scrapedVisible: scrapedActive?.count ?? 0,
      publicListFilterBreakdown: {
        passVisible: total,
        passPrivateCandidate: total,
        excludedByContentQuality: 0,
        excludedByNotVisible: 0,
        excludedByPrivateCandidate: 0,
        excludedByDemo: 0,
        excludedByKamu: 0,
        excludedByInactive: excludedByInactive?.count ?? 0,
      },
    },
  });
});

/* — ENRICH EXISTING BUSINESS ─────────────────────────────────── */

/** POST /map/businesses/:id/enrich — re-scrape Google Maps for photos/reviews/hours */
router.post("/map/businesses/:id/enrich", async (req, res): Promise<void> => {
  try {
    const biz = await db.select().from(mapBusinessesTable)
      .where(or(eq(mapBusinessesTable.id, req.params.id), eq(mapBusinessesTable.slug, req.params.id)))
      .limit(1);
    if (biz.length === 0) { res.status(404).json({ success: false, error: "İşletme bulunamadı" }); return; }
    const business = biz[0];

    const { scrapeGoogleMaps } = await import("../lib/gmaps-scraper.js");
    const query = `${business.name} ${business.address || ""}`.trim();
    const result = await scrapeGoogleMaps({
      query,
      lat: business.latitude ?? undefined,
      lng: business.longitude ?? undefined,
      maxResults: 1,
      enrichAll: true,
    });

    if (!result.businesses.length) {
      res.json({ success: false, error: "İşletme Google Maps'te bulunamadı" }); return;
    }

    const scraped = result.businesses[0];
    const scrapedPhotos = Array.isArray(scraped.photos) ? scraped.photos.filter(isExternalImageReference).slice(0, 12) : scraped.photoUrl ? [scraped.photoUrl].filter(isExternalImageReference) : [];
    const scrapedRevs = Array.isArray(scraped.reviews) ? scraped.reviews : [];

    let workingHours: Record<string, { open: string; close: string; closed: boolean }> | null = null;
    if (scraped.workingHours && typeof scraped.workingHours === "object") {
      workingHours = {};
      for (const [day, hoursStr] of Object.entries(scraped.workingHours)) {
        if (typeof hoursStr !== "string") continue;
        const lower = hoursStr.toLowerCase();
        if (lower.includes("kapalı") || lower.includes("closed")) {
          workingHours[day] = { open: "", close: "", closed: true };
        } else {
          const m = hoursStr.match(/(\d{1,2}[:\.]\d{2})\s*[–\-]\s*(\d{1,2}[:\.]\d{2})/);
          workingHours[day] = { open: m ? m[1].replace(".", ":") : "", close: m ? m[2].replace(".", ":") : "", closed: false };
        }
      }
      if (Object.keys(workingHours).length === 0) workingHours = null;
    }

    const scrapedContact = resolveGmapsScrapedBusinessContact({
      phone: scraped.phone,
      address: scraped.address,
      category: scraped.category,
      description: scraped.description,
      reviews: scrapedRevs,
    });

    await db.update(mapBusinessesTable).set({
      phone: scrapedContact.phone || business.phone,
      address: scrapedContact.address || business.address,
      website: scraped.website || business.website,
      photoUrl: scraped.photoUrl || business.photoUrl,
      rating: scraped.rating ?? business.rating,
      userRatingsTotal: scraped.reviewCount ?? business.userRatingsTotal,
      workingHours: (workingHours ?? business.workingHours) as unknown as Record<string, unknown>,
      description: scraped.description || business.description,
      tags: scraped.tags?.length ? scraped.tags : business.tags,
      scrapedPhotos: scrapedPhotos.length ? scrapedPhotos as unknown as Record<string, unknown> : business.scrapedPhotos,
      scrapedReviews: scrapedRevs.length ? scrapedRevs as unknown as Record<string, unknown> : business.scrapedReviews,
      updatedAt: new Date(),
    }).where(eq(mapBusinessesTable.id, business.id));

    if (scrapedPhotos.length > 0) {
      await db.delete(mapBusinessImagesTable).where(eq(mapBusinessImagesTable.businessId, business.id));
      for (let pi = 0; pi < scrapedPhotos.length; pi++) {
        const ps = scrapedPhotos[pi]; if (!ps) continue;
        await db.insert(mapBusinessImagesTable).values({ businessId: business.id, imageUrl: ps, sortOrder: pi, isPrimary: pi === 0 }).onConflictDoNothing().catch(() => {});
      }
    }

    res.json({
      success: true,
      message: `${business.name} zenginleştirildi: ${scrapedPhotos.length} fotoğraf, ${scrapedRevs.length} yorum`,
      photos: scrapedPhotos.length, reviews: scrapedRevs.length, hasHours: !!workingHours,
    });
  } catch (err) {
    req.log.error(err, "enrich-business error");
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* — SCRAPER (enhanced) ─────────────────────────────────────────── */

/** POST /map/scrape-gmaps-full — full detail scrape */
router.post("/map/scrape-gmaps-full", async (req, res): Promise<void> => {
  try {
    const { query, lat, lng, maxResults = 10, autoImport = false, categoryId, enrichAll = true } = req.body;
    if (!query) { res.status(400).json({ success: false, error: "query gerekli" }); return; }

    const result = await scrapeGoogleMaps({ query, lat: lat ? parseFloat(lat) : undefined, lng: lng ? parseFloat(lng) : undefined, maxResults: Math.min(parseInt(String(maxResults)) || 10, 30), enrichAll });

    if (!autoImport) { res.json({ success: true, data: result.businesses, total: result.businesses.length }); return; }

    const safeNum = (v: unknown): number | null => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : null; };
    const safeInt = (v: unknown): number | null => { const n = Math.round(safeNum(v) ?? NaN); return Number.isFinite(n) ? n : null; };

    let imported = 0; let skipped = 0; let skippedMissingContact = 0; const errors: string[] = [];

    for (const biz of result.businesses) {
      if (!biz.name?.trim()) { skipped++; continue; }
      const resolvedContact = resolveGmapsScrapedBusinessContact({
        phone: biz.phone,
        address: biz.address,
        category: biz.category,
        description: biz.description,
        reviews: Array.isArray(biz.reviews) ? biz.reviews : [],
      });
      if (!hasMapBusinessContact(resolvedContact.phone, resolvedContact.address)) {
        skipped++;
        skippedMissingContact++;
        continue;
      }
      const gid = biz.googlePlaceId || `gmaps_${Buffer.from(biz.name + (biz.address || "")).toString("base64").slice(0, 20)}`;

      const existing = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.googlePlaceId, gid)).limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const base = toSlug(biz.name);
      let slug = base; let attempt = 1;
      while (true) {
        const clash = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable).where(eq(mapBusinessesTable.slug, slug)).limit(1);
        if (clash.length === 0) break;
        slug = `${base}-${++attempt}`;
      }

      try {
        const scrapedPhotos = Array.isArray(biz.photos) ? biz.photos.filter(isExternalImageReference).slice(0, 12) : biz.photoUrl ? [biz.photoUrl].filter(isExternalImageReference) : [];
        const scrapedRevs = Array.isArray(biz.reviews) ? biz.reviews : [];
        const ins2 = await db.insert(mapBusinessesTable).values({
          googlePlaceId: gid, slug, name: biz.name.trim(),
          address: resolvedContact.address, phone: resolvedContact.phone, website: biz.website,
          description: biz.description,
          rating: safeNum(biz.rating), userRatingsTotal: safeInt(biz.reviewCount),
          latitude: safeNum(biz.latitude), longitude: safeNum(biz.longitude),
          categoryId: categoryId || null, photoUrl: biz.photoUrl,
          priceLevel: biz.priceLevel ? safeInt(biz.priceLevel) : null,
          tags: biz.tags?.length ? biz.tags : null,
          workingHours: biz.workingHours || null,
          scrapedPhotos: scrapedPhotos.length ? scrapedPhotos as unknown as Record<string, unknown> : null,
          scrapedReviews: scrapedRevs.length ? scrapedRevs as unknown as Record<string, unknown> : null,
          isActive: true,
        }).onConflictDoNothing().returning({ id: mapBusinessesTable.id });
        if (ins2.length > 0 && scrapedPhotos.length > 0) {
          const bid2 = ins2[0].id;
          for (let pi = 0; pi < scrapedPhotos.length; pi++) {
            const ps = scrapedPhotos[pi]; if (!ps) continue;
            await db.insert(mapBusinessImagesTable).values({ businessId: bid2, imageUrl: ps, sortOrder: pi, isPrimary: pi === 0 }).onConflictDoNothing().catch(() => {});
          }
        }
        imported++;
      } catch (e) { errors.push(`${biz.name}: ${String(e).slice(0, 80)}`); }
    }

    res.json({ success: true, message: `${imported} işletme eklendi, ${skipped} atlandı${skippedMissingContact > 0 ? ` (${skippedMissingContact} telefon+adres eksik)` : ""}`, imported, skipped, skippedMissingContact, errors: errors.length ? errors : undefined, total: result.businesses.length });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/* — Products for a business — */
router.get("/map/businesses/:id/products", async (req, res): Promise<void> => {
  try {
    const { db, mapProductsTable, mapBusinessesTable, vendorsTable, vendorMenuItemsTable } = await import("@workspace/db");
    const { eq, asc, and } = await import("drizzle-orm");
    const MENU_CAT = "__vendor_menu__";
    const products = await db
      .select()
      .from(mapProductsTable)
      .where(eq(mapProductsTable.businessId, req.params.id))
      .orderBy(asc(mapProductsTable.sortOrder), asc(mapProductsTable.createdAt));
    const hasSyncedMenu = products.some((p) => p.category === MENU_CAT);
    if (hasSyncedMenu) {
      res.json({ success: true, data: products });
      return;
    }
    const [biz] = await db.select({ slug: mapBusinessesTable.slug }).from(mapBusinessesTable)
      .where(eq(mapBusinessesTable.id, req.params.id)).limit(1);
    if (!biz?.slug) {
      res.json({ success: true, data: products });
      return;
    }
    const [v] = await db.select({ id: vendorsTable.id }).from(vendorsTable)
      .where(and(eq(vendorsTable.slug, biz.slug), eq(vendorsTable.active, true))).limit(1);
    if (!v) {
      res.json({ success: true, data: products });
      return;
    }
    const menuRows = await db.select().from(vendorMenuItemsTable)
      .where(and(eq(vendorMenuItemsTable.vendorId, v.id), eq(vendorMenuItemsTable.active, true)))
      .orderBy(asc(vendorMenuItemsTable.id));
    const now = new Date();
    const virtual = menuRows.map((it, i) => ({
      id: `vmi-${it.id}`,
      businessId: req.params.id,
      name: it.name,
      description: it.description,
      price: it.price != null ? Number.parseFloat(String(it.price).replace(",", ".")) : null,
      discountedPrice: it.salePrice != null ? Number.parseFloat(String(it.salePrice).replace(",", ".")) : null,
      imageUrl: it.imageUrl,
      category: "Menü & Sipariş",
      isAvailable: true,
      isDeliverable: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    }));
    res.json({ success: true, data: [...virtual, ...products] });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/* — Linked vendor (delivery/ecommerce) for map business — */
router.get("/map/businesses/:id/vendor", async (req, res): Promise<void> => {
  try {
    const { db, mapBusinessesTable, vendorsTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");
    const bid = String(req.params.id ?? "").trim();
    if (!bid) {
      res.json({ vendor: null });
      return;
    }
    const cols = {
      id: vendorsTable.id,
      slug: vendorsTable.slug,
      name: vendorsTable.name,
      vendor_type: vendorsTable.vendorType,
      description: vendorsTable.description,
      aboutHtml: vendorsTable.aboutHtml,
    };
    const byLink = await db
      .select(cols)
      .from(vendorsTable)
      .where(and(eq(vendorsTable.linkedMapBusinessId, bid), eq(vendorsTable.active, true)))
      .limit(1);
    if (byLink[0]) {
      res.json({ vendor: byLink[0] });
      return;
    }
    const rows = await db
      .select(cols)
      .from(vendorsTable)
      .innerJoin(mapBusinessesTable, eq(mapBusinessesTable.slug, vendorsTable.slug))
      .where(and(eq(mapBusinessesTable.id, bid), eq(vendorsTable.active, true)))
      .limit(1);
    const vendorRow = rows[0];
    if (!vendorRow) {
      res.json({ vendor: null });
      return;
    }
    res.json({ vendor: vendorRow });
  } catch {
    res.json({ vendor: null });
  }
});

/* — Harita / genel iletişim başvurusu — */
router.post("/map/contact-request", async (req, res): Promise<void> => {
  try {
    const { name, phone, city, category, website, email, type } = req.body ?? {};
    if (!name || !phone) { res.status(400).json({ success: false, error: "İsim ve telefon zorunludur" }); return; }
    await db.execute(sql`
      INSERT INTO map_contact_messages (business_id, sender_name, sender_phone, sender_email, message)
      VALUES (${"general"}, ${name}, ${phone ?? null}, ${email ?? null}, ${`[${type || "kayit"}] Şehir: ${city || "-"} | Kategori: ${category || "-"} | Site: ${website || "-"}`})
    `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/* — Contact message — */
router.post("/map/businesses/:id/contact", async (req, res): Promise<void> => {
  try {
    const { senderName, senderPhone, senderEmail, message } = req.body ?? {};
    if (!senderName || !message) { res.status(400).json({ success: false, error: "İsim ve mesaj zorunludur" }); return; }
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      INSERT INTO map_contact_messages (business_id, sender_name, sender_phone, sender_email, message)
      VALUES (${req.params.id}, ${senderName}, ${senderPhone ?? null}, ${senderEmail ?? null}, ${message})
    `);
    res.json({ success: true, message: "Mesajınız gönderildi" });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

type LocationSuggestRow = {
  id: string;
  label: string;
  type: "il" | "ilce" | "mahalle";
  lat?: number;
  lng?: number;
  zoom?: number;
  region?: string;
};

const NOMINATIM_UA = "Yekpare/1.0 (https://yekpare.net)";

function nominatimSuggestType(hit: {
  type?: string;
  class?: string;
  address?: Record<string, string>;
}): "il" | "ilce" | "mahalle" {
  const t = String(hit.type ?? "").toLowerCase();
  const a = hit.address ?? {};
  if (t === "state" || t === "region") return "il";
  if (["neighbourhood", "quarter", "suburb", "city_block", "hamlet"].includes(t)) return "mahalle";
  if (t === "administrative") {
    if (a.state && !a.city && !a.town && !a.municipality && !a.county) return "il";
    return "ilce";
  }
  if (["city", "town", "village", "municipality", "county"].includes(t)) return "ilce";
  return "ilce";
}

/** OSM Nominatim: ilçe/mahalle (ör. «Çankaya») DB’de yoksa yedek öneri. */
async function nominatimLocationSuggestRows(
  qDisplay: string,
  seenLabels: Set<string>,
  maxAdd: number,
): Promise<LocationSuggestRow[]> {
  const q = qDisplay.trim();
  if (q.length < 2 || maxAdd <= 0) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${q}, Türkiye`)}&format=json&limit=${Math.min(10, maxAdd + 4)}&countrycodes=tr&accept-language=tr&addressdetails=1`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 9000);
  let nomHttp: globalThis.Response;
  try {
    nomHttp = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "tr" },
    });
  } catch {
    clearTimeout(t);
    return [];
  }
  clearTimeout(t);
  if (!nomHttp.ok) return [];
  const rows = (await nomHttp.json()) as Array<{
    place_id?: number;
    lat?: string;
    lon?: string;
    display_name?: string;
    type?: string;
    class?: string;
    address?: Record<string, string>;
  }>;
  if (!Array.isArray(rows)) return [];
  const out: LocationSuggestRow[] = [];
  for (const hit of rows) {
    const label = String(hit.display_name ?? "").trim();
    if (label.length < 4) continue;
    const dedupeKey = label.toLowerCase().slice(0, 100);
    if (seenLabels.has(dedupeKey)) continue;
    seenLabels.add(dedupeKey);
    const lat = hit.lat ? parseFloat(hit.lat) : undefined;
    const lng = hit.lon ? parseFloat(hit.lon) : undefined;
    const placeType = nominatimSuggestType(hit);
    out.push({
      id: `nom_${String(hit.place_id ?? `${lat},${lng}`)}`,
      label: label.length > 140 ? `${label.slice(0, 137)}…` : label,
      type: placeType,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      zoom: placeType === "il" ? 8 : placeType === "ilce" ? 12 : 15,
    });
    if (out.length >= maxAdd) break;
  }
  return out;
}

/* — Location autocomplete: il / ilçe using map_popular_locations — */
router.get("/location-suggest", async (req, res): Promise<void> => {
  try {
    const qDisplay = String(req.query.q ?? "").trim();
    const q = qDisplay.toLowerCase();
    if (q.length < 2) { res.json({ success: true, data: [] }); return; }
    const { db, mapPopularLocationsTable } = await import("@workspace/db");
    const { ilike } = await import("drizzle-orm");
    const pattern = `%${q}%`;
    const cities = await db.select({
      id: mapPopularLocationsTable.id,
      name: mapPopularLocationsTable.name,
      nameTr: mapPopularLocationsTable.nameTr,
      latitude: mapPopularLocationsTable.latitude,
      longitude: mapPopularLocationsTable.longitude,
      zoomLevel: mapPopularLocationsTable.zoomLevel,
      districts: mapPopularLocationsTable.districts,
    })
      .from(mapPopularLocationsTable)
      .where(ilike(mapPopularLocationsTable.nameTr, pattern))
      .limit(5);
    const results: LocationSuggestRow[] = [];
    for (const city of cities) {
      results.push({ id: city.id, label: city.nameTr || city.name, type: "il", lat: city.latitude, lng: city.longitude, zoom: city.zoomLevel });
    }
    // Also search district arrays for matches
    if (results.length < 8) {
      const allCities = await db.select({
        id: mapPopularLocationsTable.id,
        nameTr: mapPopularLocationsTable.nameTr,
        name: mapPopularLocationsTable.name,
        latitude: mapPopularLocationsTable.latitude,
        longitude: mapPopularLocationsTable.longitude,
        districts: mapPopularLocationsTable.districts,
      }).from(mapPopularLocationsTable).limit(100);
      const seen = new Set(results.map(r => r.label.toLowerCase()));
      for (const city of allCities) {
        const dists: string[] = Array.isArray(city.districts) ? (city.districts as string[]) : [];
        for (const dist of dists) {
          if (typeof dist === "string" && dist.toLowerCase().includes(q) && !seen.has(dist.toLowerCase())) {
            seen.add(dist.toLowerCase());
            results.push({ id: `dist_${city.id}_${dist}`, label: `${dist} (${city.nameTr || city.name})`, type: "ilce", lat: city.latitude, lng: city.longitude, zoom: 12 });
            if (results.length >= 12) break;
          }
        }
        if (results.length >= 12) break;
      }
    }
    const seen = new Set(results.map((r) => r.label.toLowerCase().slice(0, 100)));
    if (results.length < 10) {
      const extra = await nominatimLocationSuggestRows(qDisplay, seen, 10 - results.length);
      results.push(...extra);
    }
    res.json({ success: true, data: results.slice(0, 12) });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/* — USER REVIEWS (anonymous, with admin approval) ──────────────── */

// Simple in-memory rate limiter: IP → [timestamps]
const reviewRateLimit = new Map<string, number[]>();
function checkReviewRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  const max = 5;
  const hits = (reviewRateLimit.get(ip) || []).filter(t => now - t < window);
  if (hits.length >= max) return false;
  hits.push(now);
  reviewRateLimit.set(ip, hits);
  return true;
}

/** GET /map/businesses/:id/user-reviews — public: returns approved reviews */
router.get("/map/businesses/:id/user-reviews", async (req, res): Promise<void> => {
  try {
    const biz = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable)
      .where(or(eq(mapBusinessesTable.id, req.params.id!), eq(mapBusinessesTable.slug, req.params.id!)))
      .limit(1);
    const bizId = biz[0]?.id ?? req.params.id!;
    const reviews = await db.select().from(mapUserReviewsTable)
      .where(and(eq(mapUserReviewsTable.businessId, bizId), eq(mapUserReviewsTable.status, "approved")))
      .orderBy(desc(mapUserReviewsTable.createdAt));
    res.json({ success: true, data: reviews });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/** POST /map/businesses/:id/user-reviews — anonymous or member: submit review for approval */
router.post("/map/businesses/:id/user-reviews", async (req, res): Promise<void> => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0]!.trim();
    if (!checkReviewRateLimit(ip)) {
      res.status(429).json({ success: false, error: "Çok fazla istek. Lütfen 1 saat sonra tekrar deneyin." });
      return;
    }
    const { nickname, firstName, lastName, email, phone, rating, comment, photos } = req.body as {
      nickname?: string; firstName?: string; lastName?: string;
      email?: string; phone?: string; rating: number; comment?: string; photos?: string[];
    };
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      res.status(400).json({ success: false, error: "Ad, soyad ve e-posta zorunludur." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ success: false, error: "Geçersiz e-posta adresi." });
      return;
    }
    const ratingNum = parseInt(String(rating));
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ success: false, error: "Puan 1-5 arasında olmalıdır." });
      return;
    }
    if (comment && comment.length > 2000) {
      res.status(400).json({ success: false, error: "Yorum en fazla 2000 karakter olabilir." });
      return;
    }
    // Validate photos: max 5, each base64 data URL max ~4MB ve gerçek bir resim
    // data URI'si olmalı (data:image/<jpeg|png|webp|gif>;base64,...). Yalnız uzunluk
    // kontrolü zayıftı; rastgele/zararlı yük yazılmasını önlemek için MIME doğrula.
    const IMAGE_DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
    const safePhotos: string[] = [];
    if (Array.isArray(photos)) {
      for (const p of photos.slice(0, 5)) {
        if (typeof p !== "string") continue;
        const v = p.trim();
        if (v.length > 4_000_000) continue;
        if (!IMAGE_DATA_URL_RE.test(v)) continue;
        safePhotos.push(v);
      }
    }
    const biz = await db.select({ id: mapBusinessesTable.id }).from(mapBusinessesTable)
      .where(or(eq(mapBusinessesTable.id, req.params.id!), eq(mapBusinessesTable.slug, req.params.id!)))
      .limit(1);
    const bizId = biz[0]?.id;
    if (!bizId) { res.status(404).json({ success: false, error: "İşletme bulunamadı." }); return; }

    const displayName = nickname?.trim() || `${firstName.trim()} ${lastName.trim()}`;
    const memberId = (req.session as { memberId?: string }).memberId ?? null;

    const [review] = await db.insert(mapUserReviewsTable).values({
      businessId: bizId,
      nickname: displayName.slice(0, 80),
      firstName: firstName.trim().slice(0, 80),
      lastName: lastName.trim().slice(0, 80),
      email: email.trim().toLowerCase().slice(0, 200),
      phone: phone?.trim().slice(0, 30) || null,
      memberId,
      rating: ratingNum,
      comment: comment?.trim() || null,
      photos: safePhotos as any,
      status: "pending",
    }).returning();
    res.json({ success: true, data: review, message: "Yorumunuz incelemeye alındı. Onaylandıktan sonra yayınlanacak." });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/** GET /map/admin/user-reviews — admin: list reviews with optional filters */
router.get("/map/admin/user-reviews", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { status, businessId, limit: lim, offset: off } = req.query as Record<string, string>;
    const conditions = [];
    if (status && ["pending","approved","rejected"].includes(status)) {
      conditions.push(eq(mapUserReviewsTable.status, status));
    }
    if (businessId) conditions.push(eq(mapUserReviewsTable.businessId, businessId));
    const reviews = await db.select({
      review: mapUserReviewsTable,
      businessName: mapBusinessesTable.name,
    }).from(mapUserReviewsTable)
      .leftJoin(mapBusinessesTable, eq(mapUserReviewsTable.businessId, mapBusinessesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mapUserReviewsTable.createdAt))
      .limit(parseInt(lim || "50"))
      .offset(parseInt(off || "0"));
    res.json({ success: true, data: reviews.map(r => ({ ...r.review, businessName: r.businessName })) });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/** PATCH /map/admin/user-reviews/:id — admin: approve or reject */
router.patch("/map/admin/user-reviews/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const { status, adminNote } = req.body as { status: "approved" | "rejected"; adminNote?: string };
    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ success: false, error: "status 'approved' veya 'rejected' olmalı." });
      return;
    }
    const [updated] = await db.update(mapUserReviewsTable)
      .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
      .where(eq(mapUserReviewsTable.id, req.params.id!))
      .returning();
    if (!updated) { res.status(404).json({ success: false, error: "Yorum bulunamadı." }); return; }
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

/** DELETE /map/admin/user-reviews/:id — admin: delete review */
router.delete("/map/admin/user-reviews/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    await db.delete(mapUserReviewsTable).where(eq(mapUserReviewsTable.id, req.params.id!));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: String(err) }); }
});

const WIPE_CONFIRM = "SIL-TUM-ISLETMELER";

/**
 * POST /map/admin/wipe-all-business-data
 * Harita işletmeleri + tüm vendor türleri + sipariş/menü bağlantıları. Geri alınamaz.
 */
router.post("/map/admin/wipe-all-business-data", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const confirm = String((req.body as { confirm?: string })?.confirm ?? "").trim();
  if (confirm !== WIPE_CONFIRM) {
    res.status(400).json({
      success: false,
      error: `Onay metni tam olarak "${WIPE_CONFIRM}" olmalıdır.`,
    });
    return;
  }
  try {
    await wipeAllBusinessData();
    res.json({ success: true, message: "Tüm işletme ve bağlı sipariş/menü verileri silindi." });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

