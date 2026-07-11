export const RSS_HM_TARGET_TAG_PREFIX = "rss-hm-target:";

export function buildRssHmTargetTag(siteIds: number[]): string | null {
  const ids = siteIds.filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) return null;
  return `${RSS_HM_TARGET_TAG_PREFIX}${ids.join(",")}`;
}

export function newsRowVisibleOnHmSiteByRssTarget(
  item: { tags?: string[] | null },
  siteId: number,
): boolean {
  const tags = item.tags ?? [];
  const targetTag = tags.find((t) => String(t).startsWith(RSS_HM_TARGET_TAG_PREFIX));
  if (!targetTag) return true;
  const ids = targetTag
    .slice(RSS_HM_TARGET_TAG_PREFIX.length)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ids.includes(siteId);
}
