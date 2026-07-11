/**
 * Railway start:with-migrate sonrası: VKD bağış düzeni + Haberler.com gövde onarımı.
 * Ayrı esbuild çıktısı (dist/post-migrate-jobs.mjs).
 */
import { eq } from "drizzle-orm";
import { db, hmNewsSitesTable, vendorsTable } from "@workspace/db";
import { repairHaberlerScrapedContentBatch } from "./lib/haberlerContentRepair.js";
import { reclassifyNonTurkishNewsToGlobalAll, reclassifyTurkishNewsOutOfGlobalAll } from "./lib/reclassifyNonTurkishNewsToGlobal.js";
import { seedTurizmBlogPostsIfNeeded } from "./lib/turizm-blog-seed.js";
import { seedLocationWikiCache } from "./routes/wiki.js";
import {
  applyVkdDonationLayoutDefaults,
  normalizeHmPublicDonationLayout,
} from "./lib/hm-public-donation-layout.js";
import { isVkdEditorTouched, isVkdStartupSyncEnabled, syncVkdPagesFromData } from "./lib/vkd-page-restore.js";

const VKD_SLUG = "vkd";
const LAYOUT_JSON_MAX = 1_000_000;

function parseHmLayoutJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function patchVkdDonationLayout(): Promise<void> {
  if (!isVkdStartupSyncEnabled()) {
    console.log("[post-migrate] VKD_SYNC_ON_START kapalı — bağış düzeni atlandı");
    return;
  }
  const [site] = await db.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SLUG)).limit(1);
  if (!site) {
    console.warn("[post-migrate] vkd sitesi yok — bağış düzeni atlandı");
    return;
  }
  const prev = parseHmLayoutJson(site.layoutJson);
  if (isVkdEditorTouched(prev)) {
    console.log("[post-migrate] VKD editör dokunmuş — bağış düzeni atlandı");
    return;
  }
  const layout = applyVkdDonationLayoutDefaults(normalizeHmPublicDonationLayout(prev));
  const before = JSON.stringify(prev);
  const after = JSON.stringify(layout);
  if (before === after) {
    console.log("[post-migrate] VKD bağış düzeni güncel");
    return;
  }
  if (after.length > LAYOUT_JSON_MAX) {
    throw new Error(`layout_json çok büyük (${after.length})`);
  }
  await db.update(hmNewsSitesTable).set({ layoutJson: after, updatedAt: new Date() }).where(eq(hmNewsSitesTable.id, site.id));
  console.log("[post-migrate] VKD bağış düzeni DB'ye yazıldı");
}

/**
 * Tekil vendor koordinat düzeltmeleri. Sadece mevcut koordinat hedeften >100 km sapıyorsa
 * (ya da hiç yoksa) yazar — elle düzeltilmiş/doğru kayda dokunmaz (idempotent).
 *
 * - Kafe Pazar: gmaps scrape URL'den `@lat,lng` (kamera merkezi) okunduğu için Amasya civarı
 *   (≈40.29, 35.19) kaydedilmişti; adres TUZLA Mah. Fethiye/Muğla. Doğru konum: Fethiye
 *   Salı Pazarı (Pazar Alanı, stadyum yanı).
 * - İMECE: Geliver demo mağaza seed satırı (sabit 41.048, 28.897 İstanbul/Esenyurt) İMECE'ye
 *   dönüştürülürken koordinat güncellenmemişti; adres Başak Mah., Mamak/Ankara.
 */
const VENDOR_COORD_FIXES: Array<{ slug: string; name: string; lat: number; lng: number; label: string }> = [
  { slug: "kafe-bazar", name: "Kafe Pazar", lat: 36.6215, lng: 29.1305, label: "Fethiye Salı Pazarı" },
  { slug: "imece", name: "İMECE ALIŞVERİŞ MAĞAZASI", lat: 39.9582, lng: 32.9635, label: "Başak Mah., Mamak/Ankara" },
];
const COORD_WRONG_THRESHOLD_KM = 100;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

async function fixVendorCoordinates(): Promise<void> {
  const cols = { id: vendorsTable.id, lat: vendorsTable.lat, lng: vendorsTable.lng };
  for (const fix of VENDOR_COORD_FIXES) {
    let [vendor] = await db.select(cols).from(vendorsTable).where(eq(vendorsTable.slug, fix.slug)).limit(1);
    if (!vendor) {
      [vendor] = await db.select(cols).from(vendorsTable).where(eq(vendorsTable.name, fix.name)).limit(1);
    }
    if (!vendor) {
      console.log(`[post-migrate] ${fix.name} bulunamadı — koordinat düzeltmesi atlandı`);
      continue;
    }
    const lat = vendor.lat != null ? Number(vendor.lat) : null;
    const lng = vendor.lng != null ? Number(vendor.lng) : null;
    const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    const errKm = hasCoords ? haversineKm(lat, lng, fix.lat, fix.lng) : Number.POSITIVE_INFINITY;
    if (hasCoords && errKm < COORD_WRONG_THRESHOLD_KM) {
      console.log(`[post-migrate] ${fix.name} koordinatı makul (hedefe ${errKm.toFixed(1)} km) — dokunulmadı`);
      continue;
    }
    await db
      .update(vendorsTable)
      .set({ lat: fix.lat, lng: fix.lng, updatedAt: new Date() })
      .where(eq(vendorsTable.id, vendor.id));
    console.log(
      `[post-migrate] ${fix.name} (id=${vendor.id}) koordinatı düzeltildi: ${lat ?? "yok"},${lng ?? "yok"} → ${fix.lat},${fix.lng} (${fix.label})`,
    );
  }
}

export async function runPostMigrateJobs(): Promise<void> {
  if (process.env.SKIP_POST_MIGRATE_JOBS === "1") {
    console.warn("[post-migrate] SKIP_POST_MIGRATE_JOBS=1 — atlandı");
    return;
  }

  try {
    await patchVkdDonationLayout();
  } catch (err) {
    console.warn("[post-migrate] VKD bağış düzeni hatası:", err instanceof Error ? err.message : err);
  }

  try {
    await syncVkdPagesFromData();
  } catch (err) {
    console.warn("[post-migrate] VKD sayfa/menü onarımı hatası:", err instanceof Error ? err.message : err);
  }

  try {
    await fixVendorCoordinates();
  } catch (err) {
    console.warn("[post-migrate] vendor koordinat düzeltme hatası:", err instanceof Error ? err.message : err);
  }

  try {
    await seedTurizmBlogPostsIfNeeded();
  } catch (err) {
    console.warn("[post-migrate] turizm blog seed hatası:", err instanceof Error ? err.message : err);
  }

  try {
    const [site] = await db.select({ id: hmNewsSitesTable.id }).from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SLUG)).limit(1);
    const siteId = site?.id;
    const result = await repairHaberlerScrapedContentBatch({ siteId, limit: 500 });
    console.log(
      `[post-migrate] haberler onarımı: taranan=${result.scanned} düzeltilen=${result.fixed} atlanan=${result.skipped}`,
    );
  } catch (err) {
    console.warn("[post-migrate] haberler onarımı hatası:", err instanceof Error ? err.message : err);
  }

  try {
    const turkishOut = await reclassifyTurkishNewsOutOfGlobalAll({ batchSize: 2000, maxRounds: 50 });
    console.log(
      `[post-migrate] Türkçe → global dışı: tur=${turkishOut.rounds} news=${turkishOut.updatedNews} rss=${turkishOut.updatedRss}`,
    );
  } catch (err) {
    console.warn("[post-migrate] Türkçe global temizliği hatası:", err instanceof Error ? err.message : err);
  }

  try {
    const result = await reclassifyNonTurkishNewsToGlobalAll({ batchSize: 2000, maxRounds: 20 });
    console.log(
      `[post-migrate] yabancı dil → global: tur=${result.rounds} news=${result.updatedNews} rss=${result.updatedRss}`,
    );
  } catch (err) {
    console.warn("[post-migrate] yabancı dil → global hatası:", err instanceof Error ? err.message : err);
  }

  // Bilgi Ağacı konum önbelleği
  // İdempotent (yalnızca eksikleri doldurur); Vikipedi çağrıları arka planda yürür.
  if (process.env.SKIP_LOCATION_WIKI_SEED !== "1") {
    try {
      const result = await seedLocationWikiCache({ onlyMissing: true, log: (m) => console.log(`[post-migrate] ${m}`) });
      console.log(
        `[post-migrate] konum wiki tohumlama: taranan=${result.scanned} eklenen=${result.filled} atlanan=${result.skipped} başarısız=${result.failed}`,
      );
    } catch (err) {
      console.warn("[post-migrate] konum wiki tohumlama hatası:", err instanceof Error ? err.message : err);
    }
  }
}
