import { eq, inArray } from "drizzle-orm";
import { categoriesTable, db, hmNewsSitesTable } from "@workspace/db";
import { normalizeNewsCategorySlug } from "./categorySort";

function parseLayoutJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function hiddenHmCategorySlugsFromLayout(layout: Record<string, unknown>): string[] {
  const raw = layout.hmNavHiddenCategorySlugs;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => normalizeNewsCategorySlug(s))
    .filter(Boolean);
}

/** Editörün Yekpare havuz panelinden siteden gizlediği merkez haber (news.id) kayıtları. */
export function hiddenHmPoolNewsIdsFromLayout(layout: Record<string, unknown>): number[] {
  const raw = layout.hmHiddenPoolNewsIds;
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const entry of raw) {
    const id = typeof entry === "number" ? entry : parseInt(String(entry ?? ""), 10);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Editörün RSS panelinden «siteden kaldır» ile gizlediği merkez RSS öğe kimlikleri. */
export function hiddenHmRssItemIdsFromLayout(layout: Record<string, unknown>): string[] {
  const raw = layout.hmHiddenRssItemIds;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const id = String(entry ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id.startsWith("rss:") ? id.slice(4) : id);
  }
  return out;
}

export function isHmLayoutModuleEnabled(
  layout: Record<string, unknown>,
  key: "hmNewsRssLinksEnabled",
): boolean {
  return layout[key] !== false;
}

/** Diğer HM sitelerinden manuel sync/pool haberleri — varsayılan açık (mevcut davranış). */
export function allowCrossSiteManualNewsFromLayout(layout: Record<string, unknown>): boolean {
  return layout.hmAllowCrossSiteManualNews !== false;
}

export type HmRssIntegrationMode = "live" | "persistent" | "manual";

export function hmRssIntegrationModeFromLayout(layout: Record<string, unknown>): HmRssIntegrationMode {
  const raw = String(layout.hmRssIntegrationMode ?? "live")
    .trim()
    .toLowerCase();
  if (raw === "persistent" || raw === "kalici" || raw === "kalıcı") return "persistent";
  if (raw === "manual" || raw === "manuel") return "manual";
  return "live";
}

export function yekparePoolReceiveEnabledFromLayout(layout: Record<string, unknown>): boolean {
  return layout.hmYekparePoolReceiveEnabled !== false;
}

export function yekparePoolSendEnabledFromLayout(layout: Record<string, unknown>): boolean {
  return layout.hmYekparePoolSendEnabled !== false;
}

export async function readHmPublicLayout(siteId: number): Promise<Record<string, unknown>> {
  if (!Number.isFinite(siteId) || siteId <= 0) return {};
  const [row] = await db
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId));
  return parseLayoutJson(row?.layoutJson != null ? String(row.layoutJson) : null);
}

export async function getHmHiddenCategorySlugs(siteId: number): Promise<Set<string>> {
  return new Set(hiddenHmCategorySlugsFromLayout(await readHmPublicLayout(siteId)));
}

export async function getHmHiddenRssItemIds(siteId: number): Promise<Set<string>> {
  return new Set(hiddenHmRssItemIdsFromLayout(await readHmPublicLayout(siteId)));
}

export async function getHmHiddenPoolNewsIds(siteId: number): Promise<Set<number>> {
  return new Set(hiddenHmPoolNewsIdsFromLayout(await readHmPublicLayout(siteId)));
}

export async function getHmHiddenCategoryIds(siteId: number): Promise<number[]> {
  const slugs = [...(await getHmHiddenCategorySlugs(siteId))];
  if (!slugs.length) return [];
  const rows = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(inArray(categoriesTable.slug, slugs));
  return rows.map((r) => r.id).filter((id) => Number.isFinite(id));
}

