import { eq, or, sql } from "drizzle-orm";
import { db, hmNewsSitesTable, isNewsDatabaseConfigured, newsDb } from "@workspace/db";
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

async function resolvePhpSiteId(workerSiteId: number): Promise<number | null> {
  if (!newsDb) return null;
  const sid = Math.trunc(workerSiteId);
  if (!Number.isFinite(sid) || sid <= 0) return null;

  const [w] = await db
    .select({
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, sid))
    .limit(1);

  const slug = String(w?.slug ?? "")
    .trim()
    .toLowerCase();
  if (slug) {
    const [php] = await newsDb
      .select({ id: hmNewsSitesTable.id })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.slug, slug))
      .limit(1);
    if (php?.id) return Number(php.id);
  }

  for (const raw of [w?.domain, w?.domain2, w?.domain3]) {
    const domain = String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/^www\./, "")
      .replace(/\.$/, "");
    if (!domain) continue;
    const domainMatch = sql`lower(regexp_replace(coalesce(${hmNewsSitesTable.domain}, ''), '^www\\.', '')) = ${domain}`;
    const domain2Match = sql`lower(regexp_replace(coalesce(${hmNewsSitesTable.domain2}, ''), '^www\\.', '')) = ${domain}`;
    const domain3Match = sql`lower(regexp_replace(coalesce(${hmNewsSitesTable.domain3}, ''), '^www\\.', '')) = ${domain}`;
    const [phpByHost] = await newsDb
      .select({ id: hmNewsSitesTable.id })
      .from(hmNewsSitesTable)
      .where(or(domainMatch, domain2Match, domain3Match))
      .limit(1);
    if (phpByHost?.id) return Number(phpByHost.id);
  }

  const [same] = await newsDb
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, sid))
    .limit(1);
  return same?.id ? Number(same.id) : sid;
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
