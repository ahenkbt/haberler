/**
 * Köşe makalesi listelerinde aynı yazının çoklu kopyalarını (dağıtım / peer import) tekilleştirir.
 */

export function normalizeMakaleTitleKey(title: unknown): string {
  return String(title ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

/** Daha "kaynak" slug kazanır: -hmN-srcN ve -1-1 son ekleri cezalandırılır. */
export function makaleSlugDuplicatePenalty(slug: unknown): number {
  const s = String(slug ?? "").trim().toLowerCase();
  if (!s) return 100;
  let penalty = 0;
  if (/-hm\d+-src\d+/i.test(s)) penalty += 40;
  if (/^dist:/i.test(s) || /:dist:/i.test(s)) penalty += 30;
  const numericTail = s.match(/(?:-\d+){1,4}$/);
  if (numericTail) penalty += Math.min(20, numericTail[0].split("-").filter(Boolean).length * 4);
  penalty += Math.min(15, Math.floor(s.length / 40));
  return penalty;
}

export function isDistributedFromNewsKey(externalKey: unknown): boolean {
  const k = String(externalKey ?? "").trim().toLowerCase();
  return k.startsWith("news:") || k.startsWith("dist:news:");
}

type MakaleLike = {
  id?: number | null;
  title?: string | null;
  slug?: string | null;
  externalKey?: string | null;
  createdAt?: Date | string | null;
};

function createdAtMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const t = new Date(String(value ?? "")).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Başlığa göre tekilleştir; haberden kopyalanan satırları at. */
export function dedupeHmMakaleRows<T extends MakaleLike>(rows: readonly T[]): T[] {
  const bestByTitle = new Map<string, T>();
  for (const row of rows) {
    if (isDistributedFromNewsKey(row.externalKey)) continue;
    const titleKey = normalizeMakaleTitleKey(row.title);
    if (!titleKey) continue;
    const prev = bestByTitle.get(titleKey);
    if (!prev) {
      bestByTitle.set(titleKey, row);
      continue;
    }
    const prevPen = makaleSlugDuplicatePenalty(prev.slug);
    const nextPen = makaleSlugDuplicatePenalty(row.slug);
    if (nextPen < prevPen) {
      bestByTitle.set(titleKey, row);
      continue;
    }
    if (nextPen > prevPen) continue;
    const prevTime = createdAtMs(prev.createdAt);
    const nextTime = createdAtMs(row.createdAt);
    if (nextTime && (!prevTime || nextTime < prevTime)) {
      bestByTitle.set(titleKey, row);
      continue;
    }
    if (nextTime === prevTime && Number(row.id ?? 0) < Number(prev.id ?? 0)) {
      bestByTitle.set(titleKey, row);
    }
  }
  return [...bestByTitle.values()].sort(
    (a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt),
  );
}

/** Serialize edilmiş liste öğeleri için başlık tekilleştirme. */
export function dedupeSerializedMakaleItems<
  T extends { id?: number; title?: string | null; slug?: string | null; createdAt?: string },
>(items: readonly T[]): T[] {
  const bestByTitle = new Map<string, T>();
  for (const item of items) {
    const titleKey = normalizeMakaleTitleKey(item.title) || String(item.slug ?? "").trim().toLowerCase();
    if (!titleKey) continue;
    const prev = bestByTitle.get(titleKey);
    if (!prev) {
      bestByTitle.set(titleKey, item);
      continue;
    }
    const prevPen = makaleSlugDuplicatePenalty(prev.slug);
    const nextPen = makaleSlugDuplicatePenalty(item.slug);
    if (nextPen < prevPen) {
      bestByTitle.set(titleKey, item);
      continue;
    }
    if (nextPen > prevPen) continue;
    const prevTime = createdAtMs(prev.createdAt);
    const nextTime = createdAtMs(item.createdAt);
    if (nextTime && (!prevTime || nextTime < prevTime)) {
      bestByTitle.set(titleKey, item);
      continue;
    }
    if (nextTime === prevTime && Number(item.id ?? 0) < Number(prev.id ?? 0)) {
      bestByTitle.set(titleKey, item);
    }
  }
  return [...bestByTitle.values()].sort(
    (a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt),
  );
}
