import { normalizeHmMapCityKey, type HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { resolveNewsmapLocationHeadlinesFallback } from "@/lib/haberHaritasiLocationNews";

/** Phase-1 + Phase-2 birleştir — href/kind anahtarı, yeniler öncelikli. */
export function mergeNewsmapHeadlinesDedupe(...groups: HmMapCityHeadline[][]): HmMapCityHeadline[] {
  const merged = new Map<string, HmMapCityHeadline>();
  for (const group of groups) {
    for (const row of group) {
      const key = `${row.kind}:${row.href}`;
      merged.set(key, row);
    }
  }
  return [...merged.values()].sort(
    (a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
  );
}

/** Anında gösterilecek havuz — DB/editor + YekTube (headlines + regionHeadlines). */
export function resolveNewsmapPhase1LocationHeadlines(
  cityName: string,
  headlines: HmMapCityHeadline[],
  regionHeadlines: HmMapCityHeadline[] = [],
  limit = 48,
): HmMapCityHeadline[] {
  const label = String(cityName ?? "").trim();
  if (!label) return [];
  const pool = mergeNewsmapHeadlinesDedupe(regionHeadlines, headlines);
  return resolveNewsmapLocationHeadlinesFallback(pool, label, limit);
}

export function filterNewsmapHeadlinesForCity(
  rows: HmMapCityHeadline[],
  cityName: string,
): HmMapCityHeadline[] {
  const cityKey = normalizeHmMapCityKey(cityName);
  if (!cityKey) return rows;
  return rows.filter((row) => {
    const rowCity = normalizeHmMapCityKey(row.city);
    return rowCity === cityKey || normalizeHmMapCityKey(row.title).includes(cityKey);
  });
}

/** Yalnızca hiç içerik yokken tam ekran yükleme göster (en fazla ~12 sn). */
export function shouldBlockNewsmapLocationLoading(
  phase1Count: number,
  phase2Count: number,
  phase2Pending: boolean,
  pendingSinceMs?: number | null,
): boolean {
  if (phase1Count + phase2Count > 0) return false;
  if (!phase2Pending) return false;
  if (pendingSinceMs != null && Date.now() - pendingSinceMs > 12_000) return false;
  return true;
}

/** Arka planda RSS/YouTube geliyor — içerik zaten var. */
export function isNewsmapLocationEnhancing(
  phase1Count: number,
  phase2Pending: boolean,
): boolean {
  return phase1Count > 0 && phase2Pending;
}
