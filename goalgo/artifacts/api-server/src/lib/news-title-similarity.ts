const TITLE_STOP_WORDS = new Set([
  "ve",
  "ile",
  "icin",
  "için",
  "bir",
  "bu",
  "su",
  "şu",
  "o",
  "da",
  "de",
  "mi",
  "mu",
  "mı",
  "mü",
  "den",
  "dan",
  "nin",
  "nın",
  "nun",
  "nün",
  "son",
  "haber",
  "gore",
  "göre",
  "olarak",
  "uzerine",
  "üzerine",
  "kadar",
  "daha",
  "en",
  "yeni",
  "oldu",
  "dedi",
  "diye",
  "icinde",
  "içinde",
  "arasinda",
  "arasında",
  "sonrasi",
  "sonrası",
  "once",
  "önce",
  "sonra",
  "bugun",
  "bugün",
  "dun",
  "dün",
]);

export function normalizeNewsTitleKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleSignificantTokens(title: string): string[] {
  const normalized = normalizeNewsTitleKey(title);
  if (!normalized) return [];
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !TITLE_STOP_WORDS.has(token));
  return [...new Set(tokens)];
}

function sharedTokenCount(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  let count = 0;
  for (const token of b) {
    if (setA.has(token)) count += 1;
  }
  return count;
}

function hasRareSharedToken(a: readonly string[], b: readonly string[]): boolean {
  const setB = new Set(b);
  for (const token of a) {
    if (token.length >= 5 && setB.has(token)) return true;
  }
  return false;
}

function isKeyTokenSubset(shortTokens: readonly string[], longTokens: readonly string[]): boolean {
  const keyTokens = shortTokens.filter((token) => token.length >= 3);
  if (keyTokens.length === 0) return false;
  const longSet = new Set(longTokens);
  let matched = 0;
  for (const token of keyTokens) {
    if (longSet.has(token)) matched += 1;
  }
  return matched >= Math.min(3, keyTokens.length);
}

export function areSimilarNewsTitles(a: string, b: string, minSharedTokens = 3): boolean {
  const left = String(a ?? "").trim();
  const right = String(b ?? "").trim();
  if (!left || !right) return false;

  const leftKey = normalizeNewsTitleKey(left);
  const rightKey = normalizeNewsTitleKey(right);
  if (leftKey && rightKey && leftKey === rightKey) return true;

  const leftTokens = titleSignificantTokens(left);
  const rightTokens = titleSignificantTokens(right);
  const shared = sharedTokenCount(leftTokens, rightTokens);
  if (shared >= minSharedTokens) return true;
  if (shared >= 2 && hasRareSharedToken(leftTokens, rightTokens)) return true;

  if (leftTokens.length <= rightTokens.length && isKeyTokenSubset(leftTokens, rightTokens)) return true;
  if (rightTokens.length <= leftTokens.length && isKeyTokenSubset(rightTokens, leftTokens)) return true;

  if (leftKey.length >= 12 && rightKey.length >= 12) {
    if (leftKey.includes(rightKey) || rightKey.includes(leftKey)) return true;
  }

  return false;
}

function newsItemRecencyMs(item: { publishedAt?: string | null; createdAt?: string | null }): number {
  const raw = item.publishedAt ?? item.createdAt;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function deferSimilarNewsItems<T extends { title?: string | null; publishedAt?: string | null; createdAt?: string | null }>(
  items: readonly T[],
  opts?: { minSharedTokens?: number; proximityMs?: number },
): T[] {
  const minSharedTokens = opts?.minSharedTokens ?? 3;
  const proximityMs = opts?.proximityMs ?? 48 * 60 * 60 * 1000;
  const sorted = [...items].sort((a, b) => newsItemRecencyMs(b) - newsItemRecencyMs(a));
  const front: T[] = [];
  const deferred: T[] = [];

  for (const item of sorted) {
    const itemTime = newsItemRecencyMs(item);
    const title = String(item.title ?? "");
    let similarToFront = false;

    for (const kept of front) {
      const keptTime = newsItemRecencyMs(kept);
      if (itemTime > 0 && keptTime > 0 && Math.abs(itemTime - keptTime) > proximityMs) continue;
      if (areSimilarNewsTitles(title, String(kept.title ?? ""), minSharedTokens)) {
        similarToFront = true;
        break;
      }
    }

    if (similarToFront) deferred.push(item);
    else front.push(item);
  }

  deferred.sort((a, b) => newsItemRecencyMs(b) - newsItemRecencyMs(a));
  return [...front, ...deferred];
}
