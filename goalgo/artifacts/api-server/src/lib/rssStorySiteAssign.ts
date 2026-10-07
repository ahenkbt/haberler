/**
 * Aynı olayı (farklı RSS kaynakları / AI başlıkları) sitelere tekilleştirerek dağıtır:
 * bir sitede benzer haber varsa o site atlanır, sıradaki boş siteye yazılır.
 */

import { areSimilarNewsTitles } from "./news-title-similarity.js";
import { rssTitleMatchesAny } from "./rssImportDedupeCore.js";

/** Aday siteler arasında round-robin: dolu olanları atla, ilk boş siteyi seç. */
export function pickRotatedFreeSiteIndex(
  candidateCount: number,
  startIndex: number,
  isTaken: (index: number) => boolean,
): { index: number; nextStart: number } | null {
  const n = Math.max(0, Math.trunc(candidateCount));
  if (n === 0) return null;
  const start = ((Math.trunc(startIndex) % n) + n) % n;
  for (let step = 0; step < n; step += 1) {
    const index = (start + step) % n;
    if (!isTaken(index)) {
      return { index, nextStart: (index + 1) % n };
    }
  }
  return null;
}

/** Başlık listesinde aynı / yakın olay var mı? (Jaccard + token benzerliği) */
export function rssStoryTitleMatchesAny(
  title: string,
  candidates: Iterable<string>,
): boolean {
  const t = String(title ?? "").trim();
  if (!t) return false;
  if (rssTitleMatchesAny(t, candidates)) return true;
  for (const candidate of candidates) {
    if (areSimilarNewsTitles(t, candidate)) return true;
  }
  return false;
}

/** Birden fazla başlık varyantından (AI + kaynak) herhangi biri eşleşiyorsa true. */
export function rssStoryTitlesMatchAny(
  titles: readonly string[],
  candidates: Iterable<string>,
): boolean {
  const list = [...candidates];
  for (const title of titles) {
    if (rssStoryTitleMatchesAny(title, list)) return true;
  }
  return false;
}

export function uniqueNonEmptyTitles(...groups: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const t = String(group ?? "").trim();
    if (!t) continue;
    const key = t.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
