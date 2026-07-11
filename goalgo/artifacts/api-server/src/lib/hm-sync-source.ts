/** Türkçe yazar adı karşılaştırması için token katlama (I/İ/ı/i tutarlılığı). */
function foldAuthorToken(token: string): string {
  return token
    .toLocaleLowerCase("tr-TR")
    .replace(/\./g, "")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseAuthorTokens(raw: unknown): string[] {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(foldAuthorToken)
    .filter(Boolean);
}

/** Orta ad / baş harf eşlemesi: "h" veya "h." ↔ "hayriye" */
function authorMiddleTokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length === 0) return true;
  if (short.length === 1) return long.startsWith(short);
  if (short.length <= 2 && short.replace(/\./g, "").length === 1) {
    return long.startsWith(short.replace(/\./g, ""));
  }
  return false;
}

export function normalizeAuthorName(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

/** Ad + soyad anahtarı — orta ad/baş harf farklarını yok sayar. */
export function authorMatchKey(raw: unknown): string {
  const tokens = parseAuthorTokens(raw);
  if (tokens.length < 2) return normalizeAuthorName(raw);
  return `${tokens[0]}|${tokens[tokens.length - 1]}`;
}

/** Kaynak ve portal yazar adlarının aynı kişiye ait olup olmadığını kontrol eder. */
export function authorsRepresentSamePerson(a: unknown, b: unknown): boolean {
  if (normalizeAuthorName(a) === normalizeAuthorName(b)) return true;

  const ta = parseAuthorTokens(a);
  const tb = parseAuthorTokens(b);
  if (ta.length < 2 || tb.length < 2) return authorMatchKey(a) === authorMatchKey(b);

  const firstA = ta[0]!;
  const firstB = tb[0]!;
  const lastA = ta[ta.length - 1]!;
  const lastB = tb[tb.length - 1]!;
  if (firstA !== firstB || lastA !== lastB) return false;

  const midA = ta.slice(1, -1);
  const midB = tb.slice(1, -1);
  if (midA.length === 0 || midB.length === 0) return true;

  for (const ma of midA) {
    if (!midB.some((mb) => authorMiddleTokensMatch(ma, mb))) return false;
  }
  for (const mb of midB) {
    if (!midA.some((ma) => authorMiddleTokensMatch(ma, mb))) return false;
  }
  return true;
}

export function filterPortalAuthorPeerIds(
  authorName: string,
  rows: { id: number; name: string }[],
  includeAuthorId?: number,
): number[] {
  const ids = new Set<number>();
  for (const row of rows) {
    if (authorsRepresentSamePerson(row.name, authorName)) ids.add(row.id);
  }
  if (includeAuthorId != null && includeAuthorId > 0) ids.add(includeAuthorId);
  return [...ids];
}

export function normalizeArticleTitle(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

/** `yekpare-hm-sync:{siteId}:{kind}:{sourceId}` — HM editör içeriğinin merkez haber akışı anahtarı */
export function parseHmSyncSourceKind(
  rssSourceUrl: string | null | undefined,
): "news" | "makale" | null {
  const source = String(rssSourceUrl ?? "").trim();
  const match = /^yekpare-hm-sync:\d+:(news|makale):\d+$/.exec(source);
  if (match?.[1] === "makale") return "makale";
  if (match?.[1] === "news") return "news";
  return null;
}

export type HmSyncDedupeParts = {
  siteId: number;
  kind: "news" | "makale";
  sourceId: number;
};

export function parseHmSyncDedupeKey(
  rssSourceUrl: string | null | undefined,
): HmSyncDedupeParts | null {
  const source = String(rssSourceUrl ?? "").trim();
  const match = /^yekpare-hm-sync:(\d+):(news|makale):(\d+)$/.exec(source);
  if (!match) return null;
  const siteId = parseInt(match[1]!, 10);
  const sourceId = parseInt(match[3]!, 10);
  if (!Number.isFinite(siteId) || siteId <= 0 || !Number.isFinite(sourceId) || sourceId <= 0) {
    return null;
  }
  const kind = match[2];
  if (kind !== "news" && kind !== "makale") return null;
  return { siteId, kind, sourceId };
}

export function parseHmPoolRef(
  rssSourceUrl: string | null | undefined,
): { siteId: number; id: number } | null {
  const m = /^yekpare-hm-pool:(\d+):(\d+)$/.exec(String(rssSourceUrl ?? "").trim());
  if (!m) return null;
  const siteId = parseInt(m[1]!, 10);
  const id = parseInt(m[2]!, 10);
  if (!Number.isFinite(siteId) || siteId <= 0 || !Number.isFinite(id) || id <= 0) return null;
  return { siteId, id };
}

export function isInternalHybridRssRef(rssSourceUrl: string | null | undefined): boolean {
  const raw = String(rssSourceUrl ?? "").trim();
  return raw.startsWith("yekpare-hm-pool:") || raw.startsWith("yekpare-hm-sync:");
}

export function isKoseCategorySlug(slug: string | null | undefined): boolean {
  const s = String(slug ?? "").trim().toLowerCase();
  return s === "blog" || s === "kose" || s === "köşe";
}
