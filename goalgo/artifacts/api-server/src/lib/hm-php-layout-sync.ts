import { eq, sql } from "drizzle-orm";
import {
  hmNewsSitesTable,
  isNewsDatabaseConfigured,
  matchPhpSiteRow,
  newsDb,
  resolvePhpSiteIdForPanelId,
} from "@workspace/db";
import { buildPartialLayoutForMirror } from "./hm-layout-merge-guard.js";

export type PhpLayoutMirrorResult = {
  mirrored: boolean;
  phpSiteId?: number;
  reason?: string;
  merged?: "changed-keys" | "full-merge";
  changedKeys?: string[];
  skipped?: string;
};

const HM_LIVE_MANSET_PRESETS = new Set(["odatv", "sabah", "takvim", "mynet", "nefes"]);

function normalizeMansetPreset(value: unknown): string | null {
  if (value == null) return null;
  const preset = String(value).trim().toLowerCase();
  return HM_LIVE_MANSET_PRESETS.has(preset) ? preset : null;
}

/** PHP App.php önce hmYsMansetPreset, sonra hmNewsYsMansetLayout okur. */
export function normalizeLayoutJsonMansetKeysForPhp(layoutJsonRaw: string): string {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return raw;
  try {
    const layout = JSON.parse(raw) as Record<string, unknown>;
    if (!layout || typeof layout !== "object" || Array.isArray(layout)) return raw;
    const chosen =
      normalizeMansetPreset(layout.hmYsMansetPreset) ??
      normalizeMansetPreset(layout.hmNewsYsMansetLayout);
    if (chosen) {
      layout.hmYsMansetPreset = chosen;
      layout.hmNewsYsMansetLayout = chosen;
    }
    return JSON.stringify(layout);
  } catch {
    return raw;
  }
}

function shouldMirrorLayoutToPhpNeon(): boolean {
  return isNewsDatabaseConfigured && !!newsDb;
}

/**
 * brand-shift 2026-10-11: panel id → PHP id strictly by the panel row's canonical domain (slug only when domainless).
 * No numeric-id fallback: an unresolved/ambiguous site returns null and the PHP write is refused.
 */
async function resolvePhpSiteId(workerSiteId: number): Promise<number | null> {
  if (!newsDb) return null;
  const res = await resolvePhpSiteIdForPanelId(workerSiteId);
  if (!res.ok) {
    console.warn(`[hm-php-sync] panel ${workerSiteId}: ${res.reason}`);
    return null;
  }
  return res.phpSiteId;
}

export type PhpSiteOverlay = {
  phpSiteId: number;
  layoutJson: string | null;
  contactJson: string | null;
  displayName: string | null;
  description: string | null;
};

/**
 * brand-shift 2026-10-11: the panel shows what the live PHP site really uses. For every panel row the PHP row is
 * matched by domain (matchPhpSiteRow, one batch query); unmatched rows keep their panel values.
 */
export async function loadPhpOverlayForPanelSites(
  sites: ReadonlyArray<{ id: number; slug?: string | null; domain?: string | null; domain2?: string | null; domain3?: string | null }>,
): Promise<Map<number, PhpSiteOverlay>> {
  const out = new Map<number, PhpSiteOverlay>();
  if (!newsDb || sites.length === 0) return out;
  const rows = await newsDb
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      active: hmNewsSitesTable.active,
      layoutJson: hmNewsSitesTable.layoutJson,
      contactJson: hmNewsSitesTable.contactJson,
      displayName: hmNewsSitesTable.displayName,
      description: hmNewsSitesTable.description,
    })
    .from(hmNewsSitesTable);
  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  const candidates = rows.map((r) => ({ id: Number(r.id), slug: r.slug, domain: r.domain, domain2: r.domain2, domain3: r.domain3, active: r.active }));
  for (const s of sites) {
    const res = matchPhpSiteRow(s, candidates);
    if (!res.ok) continue;
    const r = byId.get(res.phpSiteId);
    if (!r) continue;
    out.set(s.id, {
      phpSiteId: res.phpSiteId,
      layoutJson: r.layoutJson == null ? null : String(r.layoutJson),
      contactJson: r.contactJson == null ? null : String(r.contactJson),
      displayName: r.displayName ?? null,
      description: r.description ?? null,
    });
  }
  return out;
}

/** Single-site overlay (PATCH uses it as the "previous" layout so changed keys are computed against live values). */
export async function loadPhpOverlayForPanelSite(panelSiteId: number): Promise<PhpSiteOverlay | null> {
  if (!newsDb) return null;
  const phpSiteId = await resolvePhpSiteId(panelSiteId);
  if (!phpSiteId) return null;
  const [r] = await newsDb
    .select({
      layoutJson: hmNewsSitesTable.layoutJson,
      contactJson: hmNewsSitesTable.contactJson,
      displayName: hmNewsSitesTable.displayName,
      description: hmNewsSitesTable.description,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, phpSiteId))
    .limit(1);
  if (!r) return null;
  return {
    phpSiteId,
    layoutJson: r.layoutJson == null ? null : String(r.layoutJson),
    contactJson: r.contactJson == null ? null : String(r.contactJson),
    displayName: r.displayName ?? null,
    description: r.description ?? null,
  };
}

/**
 * Panel Neon layout_json → PHP Neon (twilight-pine). Canlı PHP tema buradan okur.
 * 2026-10-08: tam üzerine yazma yok. `opts.changedKeys` verilirse yalnızca o anahtarlar jsonb ile
 * birleştirilir; verilmezse tam layout mevcut TP layout'u ile birleştirilir. TP-only anahtarlar korunur.
 */
export async function mirrorHmSiteLayoutJsonToPhpNeon(
  workerSiteId: number,
  layoutJsonRaw: string,
  opts: { changedKeys?: readonly string[] } = {},
): Promise<PhpLayoutMirrorResult> {
  if (!shouldMirrorLayoutToPhpNeon()) {
    return { mirrored: false, reason: "NEWS_DATABASE_URL yok" };
  }
  const raw = normalizeLayoutJsonMansetKeysForPhp(layoutJsonRaw);
  if (!raw) {
    return { mirrored: false, reason: "layout boş" };
  }
  let setObj: Record<string, unknown>;
  let removeKeys: string[] = [];
  const changedKeys = Array.isArray(opts.changedKeys) ? opts.changedKeys.map(String) : null;
  try {
    const full = JSON.parse(raw) as Record<string, unknown>;
    if (!full || typeof full !== "object" || Array.isArray(full)) throw new Error("layout nesne değil");
    if (changedKeys) {
      const keys = new Set(changedKeys);
      if (keys.has("hmYsMansetPreset") || keys.has("hmNewsYsMansetLayout")) {
        keys.add("hmYsMansetPreset");
        keys.add("hmNewsYsMansetLayout");
      }
      const part = buildPartialLayoutForMirror(full, [...keys]);
      setObj = part.set;
      removeKeys = part.remove;
      const meaningful = Object.keys(setObj).filter((k) => k !== "_hmUserSavedAt").length + removeKeys.length;
      if (meaningful === 0) return { mirrored: true, skipped: "değişiklik yok", changedKeys: [] };
    } else {
      setObj = full;
    }
  } catch {
    return { mirrored: false, reason: "layout JSON çözülemedi" };
  }
  const phpSiteId = await resolvePhpSiteId(workerSiteId);
  if (!phpSiteId) {
    return { mirrored: false, reason: "PHP site id çözülemedi" };
  }
  const setJson = JSON.stringify(setObj);
  const removeArr = sql`ARRAY[${sql.join(
    removeKeys.map((k) => sql`${k}`),
    sql`, `,
  )}]::text[]`;
  const removeExpr = removeKeys.length > 0 ? removeArr : sql`ARRAY[]::text[]`;
  try {
    await newsDb!
      .update(hmNewsSitesTable)
      .set({
        layoutJson: sql`((COALESCE(NULLIF(btrim(${hmNewsSitesTable.layoutJson}::text), ''), '{}')::jsonb - ${removeExpr}) || ${setJson}::jsonb)`, // jsonb → text sütunda atama dönüşümü; jsonb sütunda doğrudan
        updatedAt: new Date(),
      })
      .where(eq(hmNewsSitesTable.id, phpSiteId));
    return changedKeys
      ? { mirrored: true, phpSiteId, merged: "changed-keys", changedKeys: Object.keys(setObj).concat(removeKeys) }
      : { mirrored: true, phpSiteId, merged: "full-merge" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { mirrored: false, phpSiteId, reason: `PHP layout_json yazılamadı: ${msg.slice(0, 160)}` };
  }
}

/**
 * kh-alias 2026-10-09: admin site save → live PHP row when the PHP (twilight-pine) row has another id than the panel row
 * (Kırşehir: panel 1131, PHP 229; resolvePhpSiteId matches by slug, then domain). dualWriteUpdate mirrors by id, so these
 * saves never reached the live site. Name/description are copied, contact is merged key by key (TP-only keys such as
 * `hakkimizda` stay; blank panel fields do not erase live values), layout goes through mirrorHmSiteLayoutJsonToPhpNeon
 * with the keys the save sent. No-op when the ids match: dual-write already covered that row.
 */
export async function mirrorHmSiteRowToPhpAlias(
  workerSiteId: number,
  patch: {
    displayName?: string | null;
    description?: string | null;
    contactJson?: string | null;
    layoutJson?: string | null;
  },
  layoutChangedKeys?: readonly string[],
): Promise<{ mirrored: boolean; phpSiteId?: number; reason?: string }> {
  // brand-shift 2026-10-11: columns (name/description/contact…) are mirrored by dualWriteUpdate to the domain-resolved
  // PHP row; layout_json is never copied whole — only the keys this save really changed, for every site (ids equal or not).
  if (!shouldMirrorLayoutToPhpNeon()) return { mirrored: false, reason: "NEWS_DATABASE_URL yok" };
  const sid = Math.trunc(workerSiteId);
  const phpSiteId = await resolvePhpSiteId(sid);
  if (!phpSiteId) return { mirrored: false, reason: "PHP site domain ile eşlenemedi" };
  if (typeof patch.layoutJson === "string" && patch.layoutJson.trim() && layoutChangedKeys && layoutChangedKeys.length > 0) {
    const r = await mirrorHmSiteLayoutJsonToPhpNeon(sid, patch.layoutJson, { changedKeys: layoutChangedKeys });
    return { mirrored: r.mirrored, phpSiteId, reason: r.reason };
  }
  return { mirrored: true, phpSiteId };
}

/** Bekçi / drift: manşet anahtarları karşılaştırması. */
export function extractYsMansetLayoutKeys(layoutJson: string | null | undefined): {
  hmYsMansetPreset: string | null;
  hmNewsYsMansetLayout: string | null;
} {
  try {
    const parsed = layoutJson ? (JSON.parse(layoutJson) as Record<string, unknown>) : {};
    const pick = (k: string) => {
      const v = parsed[k];
      if (v == null || String(v).trim() === "") return null;
      return String(v).trim().toLowerCase();
    };
    return {
      hmYsMansetPreset: pick("hmYsMansetPreset"),
      hmNewsYsMansetLayout: pick("hmNewsYsMansetLayout"),
    };
  } catch {
    return { hmYsMansetPreset: null, hmNewsYsMansetLayout: null };
  }
}
