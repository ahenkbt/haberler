/**
 * Named HM editor publish group — one news row, visible on every member site.
 *
 * Confirmed ahenk.net.tr/admin Haber Siteleri (2026-09-12):
 *   siteId 3 — Ankara Şehir Gazetesi — slug `asg` — ankarasehirgazetesi.com
 *   siteId 8 — Ankara Haber Gündemi — slug `ankarahabergundemi` — ankarahabergundemi.com
 * VKD is siteId 7 — never a member. Do not treat `ahg` as a slug.
 *
 * Resolve by those stable ids first; slug/domain from hm_news_sites is fallback
 * if ids are remapped. RSS pool stays out.
 */
import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { newsTable } from "@workspace/db";
import { listHmNewsSitesCompat, type HmNewsSiteCompatRow } from "./hm-site-compat.js";

/** Internal group id — not an HM site slug. */
export const HM_EDITOR_PUBLISH_GROUP_ID = "asg-ankarahabergundemi" as const;

/** Canonical hm_news_sites.slug values from live redirects. */
export const HM_EDITOR_PUBLISH_GROUP_SLUGS = ["asg", "ankarahabergundemi"] as const;

/** Stable hm_news_sites.id from admin panel — prefer these over invented slugs. */
export const HM_ASG_SITE_ID = 3;
export const HM_ANKARAHABERGUNDEMI_SITE_ID = 8;
export const HM_EDITOR_PUBLISH_GROUP_SITE_IDS = [HM_ASG_SITE_ID, HM_ANKARAHABERGUNDEMI_SITE_ID] as const;
export const HM_VKD_SITE_ID = 7;

export type HmPublishGroupDef = {
  id: string;
  slugs: readonly string[];
  siteIds: readonly number[];
};

export const HM_PUBLISH_GROUPS: readonly HmPublishGroupDef[] = [
  {
    id: HM_EDITOR_PUBLISH_GROUP_ID,
    slugs: HM_EDITOR_PUBLISH_GROUP_SLUGS,
    siteIds: HM_EDITOR_PUBLISH_GROUP_SITE_IDS,
  },
];

export function isHmEditorPublishGroupSiteId(siteId: number): boolean {
  return siteId === HM_ASG_SITE_ID || siteId === HM_ANKARAHABERGUNDEMI_SITE_ID;
}

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

function siteHosts(site: {
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): string[] {
  return [site.domain, site.domain2, site.domain3].map(normHost).filter(Boolean);
}

/** Domain fallback when a row’s slug is missing — never the invented short code `ahg`. */
function hostMatchesLiveSlug(host: string, slug: string): boolean {
  if (slug === "asg") return host.includes("ankarasehirgazetesi");
  if (slug === "ankarahabergundemi") return host.includes("ankarahabergundemi");
  return false;
}

export function isSharedEditorPublishNews(row: {
  isEditorManual?: boolean | null;
  siteOnly?: boolean | null;
}): boolean {
  return row.isEditorManual === true || row.siteOnly === true;
}

/** Same resolution as SHA seed: exact live slug, or domain of that host. */
export function siteMatchesPublishGroupSlug(
  site: {
    slug?: string | null;
    domain?: string | null;
    domain2?: string | null;
    domain3?: string | null;
  },
  slug: string,
): boolean {
  const want = normSlug(slug);
  if (!HM_EDITOR_PUBLISH_GROUP_SLUGS.includes(want as (typeof HM_EDITOR_PUBLISH_GROUP_SLUGS)[number])) {
    return false;
  }
  if (normSlug(site.slug) === want) return true;
  return siteHosts(site).some((host) => hostMatchesLiveSlug(host, want));
}

export function publishGroupDefForSite(site: {
  id?: number | null;
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): HmPublishGroupDef | null {
  const id = Number(site.id);
  if (id === HM_VKD_SITE_ID) return null;
  for (const group of HM_PUBLISH_GROUPS) {
    if (Number.isFinite(id) && id > 0 && group.siteIds.includes(id)) return group;
    if (group.slugs.some((slug) => siteMatchesPublishGroupSlug(site, slug))) return group;
  }
  return null;
}

export function indexHmPublishGroupsBySiteId(
  sites: Array<Pick<HmNewsSiteCompatRow, "id" | "slug" | "domain" | "domain2" | "domain3" | "active">>,
): Map<number, HmPublishGroupIndexEntry> {
  const membersByGroup = new Map<string, number[]>();

  for (const site of sites) {
    if (site.active === false) continue;
    const id = Number(site.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const group = publishGroupDefForSite(site);
    if (!group) continue;
    const list = membersByGroup.get(group.id) ?? [];
    if (!list.includes(id)) list.push(id);
    membersByGroup.set(group.id, list);
  }

  const out = new Map<number, HmPublishGroupIndexEntry>();
  for (const [groupId, siteIds] of membersByGroup) {
    const group = HM_PUBLISH_GROUPS.find((g) => g.id === groupId);
    const pinned = (group?.siteIds ?? []).filter((id) => siteIds.includes(id));
    // Prefer the confirmed pair (3 + 8) when both rows exist — no extra aliases.
    const members = pinned.length >= 2 ? [...pinned] : siteIds.filter((id) => id !== HM_VKD_SITE_ID);
    if (members.length < 2) continue;
    const sorted = [...members].sort((a, b) => a - b);
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
  if (isHmEditorPublishGroupSiteId(siteId)) return [...HM_EDITOR_PUBLISH_GROUP_SITE_IDS];
  return Number.isFinite(siteId) && siteId > 0 ? [siteId] : [];
}

export async function publicHmSiteNewsScopeSql(siteId: number): Promise<SQL> {
  const groupSiteIds = await resolveHmPublishGroupSiteIds(siteId);
  return hmPublishGroupEditorNewsScopeSql(siteId, groupSiteIds);
}
