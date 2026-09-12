/** Tepe manşet üst band hedef slayt sayısı. */
export const HM_TEPE_MANSET_ITEM_COUNT = 5;

export type TepeMansetCandidate = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  featuredImage?: string | null;
  thumbnailUrl?: string | null;
  rssSourceUrl?: string | null;
  source?: string | null;
  isEditorManual?: boolean | null;
  isFeatured?: boolean | null;
  isSiteManset?: boolean | null;
  isBreaking?: boolean | null;
  views?: number | null;
  createdAt?: string | Date | null;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

const TR_DAY_OFFSET_MS = 3 * 60 * 60 * 1000;

export function isMissingNewsCoverImage(imageUrl?: string | null): boolean {
  const raw = String(imageUrl ?? "").trim();
  if (!raw) return true;
  if (raw.toLowerCase().startsWith("data:")) return true;
  if (raw.includes("haber-gorsel-hazirlaniyor")) return true;
  try {
    const decoded = decodeURIComponent(raw);
    if (/g[oö]rsel\s+haz[ıi]rlanmaktad/i.test(decoded)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function tepeMansetCoverUrl(item: TepeMansetCandidate | null | undefined): string {
  if (!item) return "";
  for (const raw of [item.imageUrl, item.featuredImage, item.thumbnailUrl]) {
    const value = String(raw ?? "").trim();
    if (value && !isMissingNewsCoverImage(value)) return value;
  }
  return "";
}

export function hasTepeMansetCover(item: TepeMansetCandidate | null | undefined): boolean {
  return Boolean(tepeMansetCoverUrl(item));
}

function rssRef(item: TepeMansetCandidate): string {
  return String(item.rssSourceUrl ?? "").trim();
}

export function isTepeMansetRssHybrid(item: TepeMansetCandidate): boolean {
  const id = String(item.id ?? "");
  return item.source === "rss" || id.startsWith("rss:") || /^https?:\/\//i.test(rssRef(item));
}

/** Editör / site-manuel — RSS ve yekpare havuz kopyası hariç. */
export function isTepeMansetManualItem(item: TepeMansetCandidate): boolean {
  const ref = rssRef(item);
  if (ref.startsWith("yekpare-hm-pool:")) return false;
  if (isTepeMansetRssHybrid(item) && item.isEditorManual !== true && !ref.startsWith("yekpare-hm-sync:")) {
    return false;
  }
  if (item.isEditorManual === true) return true;
  if (/^yekpare-hm-sync:\d+:news:\d+$/.test(ref)) return true;
  if (item.isFeatured === true && (!ref || ref.startsWith("yekpare-hm-sync:"))) return true;
  if (item.isSiteManset === true && (!ref || ref.startsWith("yekpare-hm-sync:"))) return true;
  return false;
}

/** Manşete uygun manuel: gerçek kapak zorunlu. */
export function isTepeMansetManualEligible(item: TepeMansetCandidate): boolean {
  return isTepeMansetManualItem(item) && hasTepeMansetCover(item);
}

export function tepeMansetDayKey(nowMs = Date.now()): string {
  return new Date(nowMs + TR_DAY_OFFSET_MS).toISOString().slice(0, 10);
}

function itemTimeMs(item: TepeMansetCandidate): number {
  for (const raw of [item.publishedAt, item.createdAt, item.updatedAt]) {
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isFinite(time)) return time;
  }
  return 0;
}

/**
 * Önem: manşet etiketi > son dakika > site manşet > editör > görüntülenme > tazelik.
 */
export function tepeMansetImportanceScore(item: TepeMansetCandidate, nowMs = Date.now()): number {
  let score = 0;
  if (item.isFeatured === true) score += 1000;
  if (item.isBreaking === true) score += 400;
  if (item.isSiteManset === true) score += 300;
  if (isTepeMansetManualItem(item)) score += 200;
  const views = Number(item.views ?? 0);
  if (Number.isFinite(views) && views > 0) score += Math.min(views, 500);
  const recency = itemTimeMs(item);
  if (recency > 0) {
    const ageHours = (nowMs - recency) / 3_600_000;
    if (Number.isFinite(ageHours) && ageHours >= 0) score += Math.max(0, 240 - ageHours);
  }
  return score;
}

export function sortTepeMansetByImportance<T extends TepeMansetCandidate>(
  items: readonly T[],
  nowMs = Date.now(),
): T[] {
  return [...items].sort((a, b) => {
    const delta = tepeMansetImportanceScore(b, nowMs) - tepeMansetImportanceScore(a, nowMs);
    if (delta !== 0) return delta;
    return itemTimeMs(b) - itemTimeMs(a);
  });
}

function hashDayOffset(seed: string, modulo: number): number {
  if (modulo <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

/** Aynı gün aynı otomatik slaytlar; ertesi gün kayar. */
export function rotateTepeMansetByDay<T>(items: readonly T[], dayKey: string, take: number): T[] {
  if (take <= 0) return [];
  if (items.length <= take) return [...items];
  const offset = hashDayOffset(dayKey, items.length);
  return [...items.slice(offset), ...items.slice(0, offset)].slice(0, take);
}

function tepeMansetItemKey(item: TepeMansetCandidate): string {
  if (item.id != null && String(item.id).trim()) return `id:${String(item.id)}`;
  const slug = String(item.slug ?? "").trim();
  if (slug) return `slug:${slug}`;
  return `title:${String(item.title ?? "").trim().toLocaleLowerCase("tr-TR")}`;
}

/**
 * Tepe manşet seçimi:
 * 1) Görselli manuel / manşet haberleri önce (isEditorManual, isFeatured, isSiteManset)
 * 2) Manuel varsa karışık slayt: manuel sabit, otomatik slotlar güne göre yenilenir
 * 3) Uygun manuel yoksa tüm slaytlar önem sırasıyla dolar ve günde bir kez kayar
 * 4) Resimsiz manuel asla tepe manşete girmez
 */
export function selectTepeMansetItems<T extends TepeMansetCandidate>(
  items: readonly T[],
  limit = HM_TEPE_MANSET_ITEM_COUNT,
  nowMs = Date.now(),
): T[] {
  const target = Math.min(Math.max(limit, 1), 12);
  const withCover = items.filter((item) => hasTepeMansetCover(item));
  const manuals = sortTepeMansetByImportance(
    withCover.filter((item) => isTepeMansetManualEligible(item)),
    nowMs,
  );
  const dayKey = tepeMansetDayKey(nowMs);
  const seen = new Set<string>();
  const takeUnique = (pool: readonly T[], count: number): T[] => {
    const out: T[] = [];
    for (const item of pool) {
      if (out.length >= count) break;
      const key = tepeMansetItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  };

  if (manuals.length === 0) {
    const ranked = sortTepeMansetByImportance(withCover, nowMs);
    const window = ranked.slice(0, Math.max(target * 3, target));
    return takeUnique(rotateTepeMansetByDay(window, `${dayKey}:auto`, window.length), target);
  }

  const featuredManuals = manuals.filter((item) => item.isFeatured === true);
  const otherManuals = manuals.filter((item) => item.isFeatured !== true);
  const selectedManuals = takeUnique([...featuredManuals, ...otherManuals], target);
  const remaining = target - selectedManuals.length;
  if (remaining <= 0) return selectedManuals;

  const autoRanked = sortTepeMansetByImportance(
    withCover.filter((item) => !seen.has(tepeMansetItemKey(item))),
    nowMs,
  );
  const autoWindow = autoRanked.slice(0, Math.max(remaining * 3, remaining));
  const autoPicks = rotateTepeMansetByDay(autoWindow, `${dayKey}:auto`, autoWindow.length);
  return [...selectedManuals, ...takeUnique(autoPicks, remaining)];
}
