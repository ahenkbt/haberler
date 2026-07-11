import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import {
  applyHmLayoutDelta,
  mergeMissingCorporateMenuItems,
  parseHmLayoutJson,
  type HmLayoutDeltaInput,
} from "./hm-layout-delta.js";
import { normalizeHmPublicDonationLayout } from "./hm-public-donation-layout.js";

export const VKD_SITE_SLUG = "vkd";
export const VKD_EDITOR_TOUCHED_KEY = "vkdEditorTouchedAt";
const MENU_MARKER_ID = "vkd-menu-kurumsal";

/** Menüde bulunması gereken kritik grup/öğe kimlikleri — eksikse kısmi birleştirme tetiklenir. */
export const VKD_REQUIRED_MENU_IDS = [
  "vkd-menu-kahramanlar",
  "vkd-menu-tarih-savaslar",
  "vkd-menu-tarih-canakkale-sehit",
  "vkd-menu-video-tv",
] as const;
const LAYOUT_JSON_MAX = 1_000_000;
export const VKD_PAGE_SYNC_VERSION = 7;
export const VKD_MENU_SYNC_VERSION = 6;

/** Menü/footer'da link verilen kritik kurumsal sayfalar — eksikse geri yükleme tetiklenir. */
export const VKD_REQUIRED_PAGE_SLUGS = [
  "hakkimizda",
  "baskan",
  "bagis",
  "gazilerimiz",
  "vefa-galerisi",
  "sehit-gazi-haklari",
  "hizmet-bolgesi",
  "hukuk-savunuculuk",
  "uluslararasi-stk",
  "isbirligi",
  "uluslararasi-sehit-gazi-haklari",
  "turkiye-sehit-gazi-dernekleri",
  "kurumlar",
  "dunya-sehit-gazi-kuruluslari",
  "kadin-kahramanlarimiz",
  "kunye",
  "vakif",
] as const;

type VkdManifest = {
  pageSyncVersion?: number;
  menuSyncVersion?: number;
  pageCount?: number;
};

function resolveVkdDataDir(): string {
  const envDir = process.env.VKD_DATA_DIR?.trim();
  if (envDir) return envDir;

  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../../data/vkd"),
    path.resolve(here, "../../../../data/vkd"),
    path.resolve(process.cwd(), "data/vkd"),
    path.resolve(process.cwd(), "../../data/vkd"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "manifest.json"))) return candidate;
  }
  return candidates[0]!;
}

export function resolveVkdDataDirForTests(): string {
  return resolveVkdDataDir();
}

/** Prod'da deploy/restart sonrası otomatik sync varsayılan kapalı — yalnızca VKD_SYNC_ON_START=1 ile açılır. */
export function isVkdStartupSyncEnabled(): boolean {
  if (process.env.SKIP_VKD_SYNC === "1") return false;
  return process.env.VKD_SYNC_ON_START === "1";
}

export function isVkdEditorTouched(layout: Record<string, unknown>): boolean {
  const raw = layout[VKD_EDITOR_TOUCHED_KEY];
  return typeof raw === "string" && raw.trim().length > 0;
}

function menuAlreadySynced(layout: Record<string, unknown>): boolean {
  const items = layout.hmCorporateMenuItems;
  if (!Array.isArray(items)) return false;
  return items.some((item) => item && typeof item === "object" && (item as { id?: string }).id === MENU_MARKER_ID);
}

function presentMenuIds(layout: Record<string, unknown>): Set<string> {
  const items = layout.hmCorporateMenuItems;
  const out = new Set<string>();
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: string }).id ?? "").trim();
    if (id) out.add(id);
  }
  return out;
}

export function missingRequiredMenuIds(layout: Record<string, unknown>): string[] {
  const present = presentMenuIds(layout);
  return VKD_REQUIRED_MENU_IDS.filter((id) => !present.has(id));
}

export function menuNeedsPartialSync(layout: Record<string, unknown>): boolean {
  return missingRequiredMenuIds(layout).length > 0;
}

function menuNeedsSync(layout: Record<string, unknown>, manifest: VkdManifest): boolean {
  if (isVkdEditorTouched(layout)) return false;
  const required = Number(manifest?.menuSyncVersion ?? 1);
  const current = Number(layout.vkdMenuSyncVersion ?? 0);
  if (current < required) return true;
  const items = layout.hmCorporateMenuItems;
  if (!Array.isArray(items)) return true;
  if (menuNeedsPartialSync(layout)) return true;
  return !menuAlreadySynced(layout);
}

function countHmExtraPages(layout: Record<string, unknown>): number {
  const pages = layout.hmExtraPages;
  if (!Array.isArray(pages)) return 0;
  return pages.filter((p) => p && typeof p === "object").length;
}

function enabledPageSlugs(layout: Record<string, unknown>): Set<string> {
  const pages = layout.hmExtraPages;
  const out = new Set<string>();
  if (!Array.isArray(pages)) return out;
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const row = page as { slug?: unknown; enabled?: unknown };
    if (row.enabled === false) continue;
    const slug = String(row.slug ?? "")
      .trim()
      .toLowerCase();
    if (slug) out.add(slug);
  }
  return out;
}

function existingPageSlugs(layout: Record<string, unknown>): Set<string> {
  const pages = layout.hmExtraPages;
  const out = new Set<string>();
  if (!Array.isArray(pages)) return out;
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const slug = String((page as { slug?: unknown }).slug ?? "")
      .trim()
      .toLowerCase();
    if (slug) out.add(slug);
  }
  return out;
}

export function missingRequiredSlugs(layout: Record<string, unknown>): string[] {
  const present = enabledPageSlugs(layout);
  return VKD_REQUIRED_PAGE_SLUGS.filter((slug) => !present.has(slug));
}

/** Tam geri yükleme — repo paketleri mevcut sayfa gövdelerinin üzerine yazar. */
export function pagesNeedFullSync(layout: Record<string, unknown>, manifest: VkdManifest): boolean {
  if (process.env.VKD_FORCE_PAGE_SYNC === "1") return true;
  if (isVkdEditorTouched(layout)) return false;

  const required = Number(manifest?.pageSyncVersion ?? 1);
  const current = Number(layout.vkdPageSyncVersion ?? 0);
  if (current < required) return true;

  const expectedCount = Number(manifest?.pageCount ?? 0);
  const actualCount = countHmExtraPages(layout);
  if (expectedCount > 0 && actualCount < expectedCount) return true;

  if (current >= required && actualCount === 0) return true;

  return false;
}

/** Yalnızca eksik slug'ları ekle — mevcut sayfalara dokunmaz. */
export function pagesNeedPartialSync(layout: Record<string, unknown>): boolean {
  if (process.env.VKD_FORCE_PAGE_SYNC === "1") return false;
  return missingRequiredSlugs(layout).length > 0;
}

/** @deprecated pagesNeedFullSync veya pagesNeedPartialSync kullanın */
export function pagesNeedSync(layout: Record<string, unknown>, manifest: VkdManifest): boolean {
  return pagesNeedFullSync(layout, manifest) || pagesNeedPartialSync(layout);
}

function filterPageUpdatesToMissingSlugs(
  payload: HmLayoutDeltaInput,
  missingSlugs: Set<string>,
): HmLayoutDeltaInput | null {
  if (!Array.isArray(payload.pageUpdates) || payload.pageUpdates.length === 0) return null;
  const pageUpdates = payload.pageUpdates.filter((page) => {
    if (!page || typeof page !== "object") return false;
    const slug = String((page as { slug?: unknown }).slug ?? "")
      .trim()
      .toLowerCase();
    return slug && missingSlugs.has(slug);
  });
  if (pageUpdates.length === 0) return null;
  return { ...payload, pageUpdates, overwritePages: false };
}

async function applyDeltaToDb(payload: HmLayoutDeltaInput): Promise<void> {
  const readDb = getNewsDbForRead();
  const [site] = await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1);
  if (!site) throw new Error(`HM site bulunamadı: ${VKD_SITE_SLUG}`);

  const prev = parseHmLayoutJson(site.layoutJson);
  const { layout } = applyHmLayoutDelta(prev, payload);
  const layoutJson = JSON.stringify(layout);
  if (layoutJson.length > LAYOUT_JSON_MAX) {
    throw new Error(`layout_json çok büyük (${layoutJson.length} / ${LAYOUT_JSON_MAX})`);
  }

  const patch: { layoutJson: string; updatedAt: Date; displayName?: string; description?: string } = {
    layoutJson,
    updatedAt: new Date(),
  };
  if (typeof payload.displayName === "string" && payload.displayName.trim()) {
    patch.displayName = payload.displayName.trim();
  }
  if (typeof payload.description === "string" && payload.description.trim()) {
    patch.description = payload.description.trim();
  }

  await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, site.id));
}

async function applyVkdDonationLayoutPatch(layout: Record<string, unknown>): Promise<void> {
  if (isVkdEditorTouched(layout)) return;

  const readDb = getNewsDbForRead();
  const [site] = await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1);
  if (!site) return;

  const prev = parseHmLayoutJson(site.layoutJson);
  const next = normalizeHmPublicDonationLayout(prev);
  const before = JSON.stringify(prev);
  const after = JSON.stringify(next);
  if (before === after) return;

  if (after.length > LAYOUT_JSON_MAX) {
    throw new Error(`layout_json çok büyük (${after.length} / ${LAYOUT_JSON_MAX})`);
  }
  await dualWriteUpdate(hmNewsSitesTable, { layoutJson: after, updatedAt: new Date() }, eq(hmNewsSitesTable.id, site.id));
}

function log(msg: string): void {
  console.log(`[vkd-sync] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[vkd-sync] ${msg}`);
}

async function applyPageBundlesFromData(
  dataDir: string,
  opts: { missingOnly: boolean; missingSlugs?: Set<string> },
): Promise<void> {
  const bundles = readdirSync(dataDir)
    .filter((name) => /^pages-\d+\.json$/i.test(name))
    .sort();
  for (const name of bundles) {
    let payload = JSON.parse(readFileSync(path.join(dataDir, name), "utf8")) as HmLayoutDeltaInput;
    if (opts.missingOnly) {
      const filtered = filterPageUpdatesToMissingSlugs(payload, opts.missingSlugs ?? new Set());
      if (!filtered) continue;
      payload = filtered;
    }
    await applyDeltaToDb(payload);
    log(`${name} uygulandı${opts.missingOnly ? " (eksik slug)" : ""}`);
  }
}

async function runVkdSync(dataDir: string, opts: { allowFullRestore: boolean }): Promise<void> {
  const manifestPath = path.join(dataDir, "manifest.json");
  const menuPath = path.join(dataDir, "menu.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as VkdManifest;

  const readDb = getNewsDbForRead();
  const [site] = await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1);
  if (!site) {
    warn("vkd sitesi yok — atlandı");
    return;
  }

  const layout = parseHmLayoutJson(site.layoutJson);
  const editorTouched = isVkdEditorTouched(layout);
  const syncMenu = opts.allowFullRestore && menuNeedsSync(layout, manifest);
  const syncPagesFull = opts.allowFullRestore && pagesNeedFullSync(layout, manifest);
  const missingSlugs = new Set(missingRequiredSlugs(layout));
  const syncPagesPartial = missingSlugs.size > 0 && (editorTouched || !syncPagesFull);

  if (editorTouched) {
    log("editör dokunmuş (vkdEditorTouchedAt) — mevcut sayfa/menü içeriği korunuyor");
  }

  if (syncPagesFull) {
    const actualCount = countHmExtraPages(layout);
    const expectedCount = Number(manifest?.pageCount ?? 0);
    if (expectedCount > 0 && actualCount < expectedCount) {
      log(`sayfa eksik (${actualCount}/${expectedCount}) — tam geri yükleme başlıyor…`);
    } else if (actualCount === 0) {
      log("hmExtraPages boş — tam geri yükleme başlıyor…");
    }
  } else if (syncPagesPartial) {
    log(`eksik sayfa slug'ları (${missingSlugs.size}): ${[...missingSlugs].slice(0, 8).join(", ")}${missingSlugs.size > 8 ? "…" : ""}`);
  }

  if (syncMenu) {
    log("menü uygulanıyor…");
    const menuPayload = JSON.parse(readFileSync(menuPath, "utf8")) as HmLayoutDeltaInput;
    await applyDeltaToDb(menuPayload);
    await applyDeltaToDb({ vkdMenuSyncVersion: VKD_MENU_SYNC_VERSION });
    const itemCount = Array.isArray(menuPayload.hmCorporateMenuItems) ? menuPayload.hmCorporateMenuItems.length : 0;
    log(`menü tamam (${itemCount} madde, sürüm ${VKD_MENU_SYNC_VERSION})`);
  } else if (menuNeedsPartialSync(layout)) {
    const menuPayload = JSON.parse(readFileSync(menuPath, "utf8")) as HmLayoutDeltaInput;
    const canonical = Array.isArray(menuPayload.hmCorporateMenuItems) ? menuPayload.hmCorporateMenuItems : [];
    const { items, added } = mergeMissingCorporateMenuItems(layout.hmCorporateMenuItems, canonical);
    if (added > 0) {
      log(`menü kısmi birleştirme (+${added} madde)…`);
      await applyDeltaToDb({ hmCorporateMenuItems: items });
      const refreshed = parseHmLayoutJson(
        (await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1))[0]?.layoutJson,
      );
      if (missingRequiredMenuIds(refreshed).length === 0) {
        await applyDeltaToDb({ vkdMenuSyncVersion: VKD_MENU_SYNC_VERSION });
      }
      log(`menü kısmi tamam (+${added} madde)`);
    } else {
      log("menü — eksik madde yok, atlandı");
    }
  } else if (editorTouched) {
    log("menü — editör ayarları korundu, atlandı");
  } else {
    log("menü güncel — atlandı");
  }

  if (syncPagesFull) {
    log("sayfa içerikleri uygulanıyor (tam)…");
    await applyPageBundlesFromData(dataDir, { missingOnly: false });
    await applyDeltaToDb({ vkdPageSyncVersion: VKD_PAGE_SYNC_VERSION });
    log(`sayfa sync sürümü ${VKD_PAGE_SYNC_VERSION} işaretlendi`);
  } else if (syncPagesPartial) {
    log("eksik sayfalar ekleniyor (mevcut içerik korunuyor)…");
    await applyPageBundlesFromData(dataDir, { missingOnly: true, missingSlugs });
    const refreshed = parseHmLayoutJson(
      (await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1))[0]?.layoutJson,
    );
    if (missingRequiredSlugs(refreshed).length === 0 && Number(refreshed.vkdPageSyncVersion ?? 0) < VKD_PAGE_SYNC_VERSION) {
      await applyDeltaToDb({ vkdPageSyncVersion: VKD_PAGE_SYNC_VERSION });
    }
    log("eksik sayfa ekleme tamam");
  } else {
    log("sayfalar güncel — atlandı");
  }

  const latestLayout = parseHmLayoutJson(
    (await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1))[0]?.layoutJson,
  );
  await applyVkdDonationLayoutPatch(latestLayout);
  log("tamam");
}

/**
 * VKD menü + özel sayfaları repo içindeki data/vkd paketlerinden DB'ye yazar.
 * Tam geri yükleme prod'da VKD_SYNC_ON_START=1 veya VKD_FORCE_PAGE_SYNC=1 ile;
 * eksik menü maddeleri ve sayfa slug'ları her deploy'da kısmi birleştirme ile eklenir.
 */
export async function syncVkdPagesFromData(opts?: { forceFull?: boolean }): Promise<void> {
  if (process.env.SKIP_VKD_SYNC === "1") {
    warn("SKIP_VKD_SYNC=1 — atlandı");
    return;
  }

  const dataDir = resolveVkdDataDir();
  const manifestPath = path.join(dataDir, "manifest.json");
  const menuPath = path.join(dataDir, "menu.json");
  if (!existsSync(manifestPath) || !existsSync(menuPath)) {
    warn(`data/vkd paketi yok (${dataDir}) — atlandı`);
    return;
  }

  const allowFullRestore =
    opts?.forceFull === true ||
    isVkdStartupSyncEnabled() ||
    process.env.VKD_FORCE_PAGE_SYNC === "1";

  if (!allowFullRestore) {
    const readDb = getNewsDbForRead();
    const [site] = await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1);
    const layout = site ? parseHmLayoutJson(site.layoutJson) : {};
    const bootstrapEmpty = countHmExtraPages(layout) === 0 && !Array.isArray(layout.hmCorporateMenuItems);
    if (bootstrapEmpty) {
      log("VKD_SYNC_ON_START kapalı — boş site bootstrap (yalnızca ilk kurulum)");
    } else {
      log("VKD_SYNC_ON_START kapalı — kısmi menü/sayfa onarımı (editör içeriği korunur)");
    }
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      await runVkdSync(dataDir, { allowFullRestore });
      return;
    } catch (err) {
      lastErr = err;
      warn(`deneme ${attempt}/12 başarısız: ${err instanceof Error ? err.message : String(err)}`);
      if (attempt < 12) await sleep(5000);
    }
  }
  throw lastErr;
}

/** Yalnızca eksik hmCorporateMenuItems maddelerini repo menu.json'dan birleştirir. */
export async function syncVkdMenuPartialFromData(): Promise<{ added: number; missingBefore: string[] }> {
  if (process.env.SKIP_VKD_SYNC === "1") {
    warn("SKIP_VKD_SYNC=1 — menü onarımı atlandı");
    return { added: 0, missingBefore: [] };
  }

  const dataDir = resolveVkdDataDir();
  const menuPath = path.join(dataDir, "menu.json");
  if (!existsSync(menuPath)) {
    warn(`menu.json yok (${dataDir}) — atlandı`);
    return { added: 0, missingBefore: [] };
  }

  const readDb = getNewsDbForRead();
  const [site] = await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1);
  if (!site) {
    warn("vkd sitesi yok — menü onarımı atlandı");
    return { added: 0, missingBefore: [] };
  }

  const layout = parseHmLayoutJson(site.layoutJson);
  const missingBefore = missingRequiredMenuIds(layout);
  if (missingBefore.length === 0) {
    log("menü kısmi — eksik madde yok");
    return { added: 0, missingBefore: [] };
  }

  const menuPayload = JSON.parse(readFileSync(menuPath, "utf8")) as HmLayoutDeltaInput;
  const canonical = Array.isArray(menuPayload.hmCorporateMenuItems) ? menuPayload.hmCorporateMenuItems : [];
  const { items, added } = mergeMissingCorporateMenuItems(layout.hmCorporateMenuItems, canonical);
  if (added === 0) {
    log("menü kısmi — birleştirilecek yeni madde yok");
    return { added: 0, missingBefore };
  }

  await applyDeltaToDb({ hmCorporateMenuItems: items });
  const refreshed = parseHmLayoutJson(
    (await readDb.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, VKD_SITE_SLUG)).limit(1))[0]?.layoutJson,
  );
  if (missingRequiredMenuIds(refreshed).length === 0) {
    await applyDeltaToDb({ vkdMenuSyncVersion: VKD_MENU_SYNC_VERSION });
  }
  log(`menü kısmi tamam (+${added} madde)`);
  return { added, missingBefore };
}
