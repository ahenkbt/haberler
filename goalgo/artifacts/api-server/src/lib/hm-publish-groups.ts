/**
 * Named HM editor publish groups — one news row, visible on every member site.
 *
 * ASG (ankarasehirgazetesi.com, slug `asg`) and AHG (ankarahabergundemi.com,
 * slug `ankarahabergundemi`) share editor-manual / site_only stories.
 * RSS campaign copies, Yekpare central pool, and VKD stay out of this group.
 */
import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { newsTable } from "@workspace/db";
import { listHmNewsSitesCompat, type HmNewsSiteCompatRow } from "./hm-site-compat.js";

export const HM_ASG_AHG_PUBLISH_GROUP_ID = "asg-ahg" as const;

export type HmPublishGroupDef = {
  id: string;
  /** Canonical hm_news_sites.slug values. */
  slugs: readonly string[];
  /** Extra slug tokens (user-facing aliases, domain stems). */
  slugAliases: readonly string[];
  /** Hostname fragments that identify a member. */
  domainHints: readonly string[];
};

/** Only ASG+AHG unless another named group is added here. */
export const HM_PUBLISH_GROUPS: readonly HmPublishGroupDef[] = [
  {
    id: HM_ASG_AHG_PUBLISH_GROUP_ID,
    slugs: ["asg", "ankarahabergundemi"],
    slugAliases: ["ankarasehirgazetesi", "ahg"],
    domainHints: ["ankarasehirgazetesi", "ankarahabergundemi"],
  },
];

export type HmPublishGroupIndexEntry = {
  id: string;
  siteIds: number[];
};

function normSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function normHost(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export function isSharedEditorPublishNews(row: {
  isEditorManual?: boolean | null;
  siteOnly?: boolean | null;
}): boolean {
  return row.isEditorManual === true || row.siteOnly === true;
}

export function publishGroupDefForSite(site: {
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): HmPublishGroupDef | null {
  const slug = normSlug(site.slug);
  const hosts = [site.domain, site.domain2, site.domain3].map(normHost).filter(Boolean);

  for (const group of HM_PUBLISH_GROUPS) {
    if (group.slugs.includes(slug) || group.slugAliases.includes(slug)) return group;
    if (group.domainHints.some((hint) => slug.includes(hint))) return group;
    if (hosts.some((host) => group.domainHints.some((hint) => host.includes(hint)))) return group;
  }
  return null;
}

export function indexHmPublishGroupsBySiteId(
  sites: Array<Pick<HmNewsSiteCompatRow, "id" | "slug" | "domain" | "domain2" | "domain3" | "active">>,
): Map<number, HmPublishGroupIndexEntry> {
  const membersByGroup = new Map<string, number[]>();
  const groupById = new Map<string, HmPublishGroupDef>();

  for (const site of sites) {
    if (site.active === false) continue;
    const id = Number(site.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const group = publishGroupDefForSite(site);
    if (!group) continue;
    groupById.set(group.id, group);
    const list = membersByGroup.get(group.id) ?? [];
    if (!list.includes(id)) list.push(id);
    membersByGroup.set(group.id, list);
  }

  const out = new Map<number, HmPublishGroupIndexEntry>();
  for (const [groupId, siteIds] of membersByGroup) {
    if (siteIds.length < 2) continue;
    const sorted = [...siteIds].sort((a, b) => a - b);
    const entry = { id: groupId, siteIds: sorted };
    for (const siteId of sorted) out.set(siteId, entry);
  }
  return out;
}

export function isHmPublishGroupSharedEditorNews(
  row: {
    siteId?: number | null;
    isEditorManual?: boolean | null;
    siteOnly?: boolean | null;
  },
  viewerSiteId: number,
  groupSiteIds: readonly number[] | null | undefined,
): boolean {
  if (!Number.isFinite(viewerSiteId) || viewerSiteId <= 0) return false;
  if (row.siteId == null || row.siteId === viewerSiteId) return false;
  const ids = (groupSiteIds ?? []).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length < 2) return false;
  if (!ids.includes(viewerSiteId) || !ids.includes(row.siteId)) return false;
  return isSharedEditorPublishNews(row);
}

/** Public / editor SQL: this site’s rows + peer editor-manual / site_only rows. */
export function hmPublishGroupEditorNewsScopeSql(
  viewerSiteId: number,
  groupSiteIds: readonly number[] | null | undefined,
): SQL {
  const local = eq(newsTable.siteId, viewerSiteId);
  const peers = (groupSiteIds ?? []).filter((id) => Number.isFinite(id) && id > 0 && id !== viewerSiteId);
  if (peers.length === 0) return local;
  return or(
    local,
    and(
      inArray(newsTable.siteId, peers),
      or(eq(newsTable.isEditorManual, true), eq(newsTable.siteOnly, true))!,
    )!,
  )!;
}

let groupCache: { expiresAt: number; bySiteId: Map<number, HmPublishGroupIndexEntry> } | null = null;
const GROUP_CACHE_MS = 60_000;

export function invalidateHmPublishGroupCache(): void {
  groupCache = null;
}

async function loadPublishGroupIndex(): Promise<Map<number, HmPublishGroupIndexEntry>> {
  const now = Date.now();
  if (groupCache && groupCache.expiresAt > now) return groupCache.bySiteId;
  const sites = await listHmNewsSitesCompat();
  const bySiteId = indexHmPublishGroupsBySiteId(sites);
  groupCache = { expiresAt: now + GROUP_CACHE_MS, bySiteId };
  return bySiteId;
}

export async function resolveHmPublishGroup(siteId: number): Promise<HmPublishGroupIndexEntry | null> {
  if (!Number.isFinite(siteId) || siteId <= 0) return null;
  try {
    const index = await loadPublishGroupIndex();
    return index.get(siteId) ?? null;
  } catch {
    return null;
  }
}

/** Viewer site id plus publish-group peers (or `[siteId]` when ungrouped). */
export async function resolveHmPublishGroupSiteIds(siteId: number): Promise<number[]> {
  const group = await resolveHmPublishGroup(siteId);
  if (group?.siteIds.length) return group.siteIds;
  return Number.isFinite(siteId) && siteId > 0 ? [siteId] : [];
}

export async function publicHmSiteNewsScopeSql(siteId: number): Promise<SQL> {
  const groupSiteIds = await resolveHmPublishGroupSiteIds(siteId);
  return hmPublishGroupEditorNewsScopeSql(siteId, groupSiteIds);
}
