/** Portalda HM editör sitelerinden senkronlanan manuel haber (RSS deşil). */
export function isPortalHmEditorSyncedNews(item: {
  source?: string | null;
  hmSyncKind?: string | null;
  rssSourceUrl?: string | null;
}): boolean {
  if (String(item.source ?? "").trim() === "rss") return false;
  if (item.hmSyncKind === "news") return true;
  const sync = String(item.rssSourceUrl ?? "").trim();
  return /^yekpare-hm-sync:\d+:news:\d+$/.test(sync);
}

export function filterPortalHmEditorSyncedNews<T extends {
  source?: string | null;
  hmSyncKind?: string | null;
  rssSourceUrl?: string | null;
}>(items: T[]): T[] {
  return items.filter(isPortalHmEditorSyncedNews);
}
