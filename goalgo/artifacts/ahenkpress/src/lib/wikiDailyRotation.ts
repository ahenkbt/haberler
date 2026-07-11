/** Türkiye saatiyle gün anahtarı (YYYY-MM-DD) — günlük içerik rotasyonu için. */
export function getTurkeyDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(date);
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Aynı gün içinde deterministik indeks (0 … items.length-1). */
export function pickDailyIndex<T>(items: readonly T[], dateKey = getTurkeyDateKey()): number {
  if (items.length === 0) return 0;
  return hashString(dateKey) % items.length;
}

export function pickDailyItem<T>(items: readonly T[], dateKey = getTurkeyDateKey()): T {
  return items[pickDailyIndex(items, dateKey)]!;
}

export function pickDailyItems<T>(
  items: readonly T[],
  count: number,
  dateKey = getTurkeyDateKey(),
): T[] {
  if (items.length === 0 || count <= 0) return [];
  const start = pickDailyIndex(items, dateKey);
  const out: T[] = [];
  for (let i = 0; i < Math.min(count, items.length); i++) {
    out.push(items[(start + i) % items.length]!);
  }
  return out;
}

/** Ay-gün (MM-DD) — millî gün / tarihte bugün filtresi. */
export function turkeyMonthDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${month}-${day}`;
}
