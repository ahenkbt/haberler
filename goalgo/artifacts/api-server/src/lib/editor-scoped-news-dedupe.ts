import { normalizeArticleTitle, parseHmPoolRef, parseHmSyncDedupeKey } from "./hm-sync-source.js";
import { portalRssTitleKey } from "./portal-rss-fetch.js";

function normalizeRssSourceUrl(link: string): string | null {
  const t = link.trim();
  if (!t) return null;
  if (t.startsWith("yekpare-hm-pool:") || t.startsWith("yekpare-hm-sync:")) return t;
  try {
    const abs = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/\//, "")}`;
    const u = new URL(abs);
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.hash = "";
    for (const key of Array.from(u.searchParams.keys())) {
      if (/^(utm_|fbclid$|gclid$|yclid$|mc_|ref$|ref_src$)/i.test(key)) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return t.toLowerCase();
  }
}

type EditorScopedNewsItem = {
  id: number;
  siteId?: number | null;
  title: string;
  slug?: string | null;
  rssSourceUrl?: string | null;
  isEditorManual?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function dbDedupeKey(item: EditorScopedNewsItem): string {
  const titleKey = normalizeArticleTitle(item.title) || portalRssTitleKey(item.title);
  const slug = String(item.slug ?? "").trim().toLowerCase();
  if (slug) return `slug:${slug}`;
  return `title:${titleKey}`;
}

function editorScopedNewsRecencyMs(item: EditorScopedNewsItem): number {
  const raw = item.createdAt ?? item.updatedAt;
  if (!raw) return 0;
  const time = new Date(String(raw)).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** site manuel > site kopyası > merkez havuz — anasayfa mergeUniqueNews ile uyumlu. */
function editorScopedNewsPriority(item: EditorScopedNewsItem, editorSiteId: number): number {
  if (item.siteId === editorSiteId) {
    if (item.isEditorManual) return 3;
    const ref = String(item.rssSourceUrl ?? "").trim();
    if (ref.startsWith("yekpare-hm-pool:") || ref.startsWith("yekpare-hm-sync:")) return 2;
    return 2;
  }
  return 0;
}

function editorScopedNewsAliasKeys(item: EditorScopedNewsItem): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const push = (key: string) => {
    const k = key.trim();
    if (!k || seen.has(k)) return;
    seen.add(k);
    keys.push(k);
  };
  push(dbDedupeKey(item));
  const titleKey = normalizeArticleTitle(item.title) || portalRssTitleKey(item.title);
  if (titleKey) push(`title:${titleKey}`);
  const rssUrl = normalizeRssSourceUrl(String(item.rssSourceUrl ?? ""));
  if (rssUrl) push(`link:${rssUrl}`);
  const rawRef = String(item.rssSourceUrl ?? "").trim();
  if (rawRef.startsWith("yekpare-hm-pool:") || rawRef.startsWith("yekpare-hm-sync:")) {
    push(`ref:${rawRef}`);
  }
  const poolRef = parseHmPoolRef(rawRef);
  if (poolRef) push(`pool:${poolRef.id}`);
  const syncRef = parseHmSyncDedupeKey(rawRef);
  if (syncRef) push(`sync:${syncRef.siteId}:${syncRef.kind}:${syncRef.sourceId}`);
  return keys;
}

/** Editör havuzu: portal + site satırlarını alias ile tekilleştirir. */
export function dedupeEditorScopedDbNewsItems<T extends EditorScopedNewsItem>(
  items: T[],
  editorSiteId: number,
): T[] {
  const aliasIndex = new Map<string, number>();
  const out: T[] = [];
  for (const item of items) {
    const aliases = editorScopedNewsAliasKeys(item);
    let conflictIdx: number | null = null;
    for (const key of aliases) {
      const idx = aliasIndex.get(key);
      if (idx != null) {
        conflictIdx = idx;
        break;
      }
    }
    if (conflictIdx != null) {
      const existing = out[conflictIdx]!;
      const newPriority = editorScopedNewsPriority(item, editorSiteId);
      const oldPriority = editorScopedNewsPriority(existing, editorSiteId);
      const replace =
        newPriority > oldPriority ||
        (newPriority === oldPriority && editorScopedNewsRecencyMs(item) > editorScopedNewsRecencyMs(existing));
      if (replace) {
        for (const key of editorScopedNewsAliasKeys(existing)) aliasIndex.delete(key);
        out[conflictIdx] = item;
        for (const key of aliases) aliasIndex.set(key, conflictIdx);
      }
      continue;
    }
    const idx = out.length;
    out.push(item);
    for (const key of aliases) aliasIndex.set(key, idx);
  }
  return out;
}

export function collectEditorScopedPoolTargetIds(items: EditorScopedNewsItem[]): Set<number> {
  const ids = new Set<number>();
  for (const item of items) {
    const poolRef = parseHmPoolRef(item.rssSourceUrl);
    if (poolRef) ids.add(poolRef.id);
  }
  return ids;
}

export { editorScopedNewsRecencyMs };
