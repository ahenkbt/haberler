/**
 * Trafik Güvenliği Derneği — seed archive pages + Vatan home copy into layout_json.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { applyHmLayoutDelta, parseHmLayoutJson, type HmLayoutDeltaInput } from "./hm-layout-delta.js";

export const TGD_SITE_SLUG = "trafik";
export const TGD_EDITOR_TOUCHED_KEY = "tgdEditorTouchedAt";
export const TGD_PAGE_SYNC_VERSION = 1;

type TgdManifest = {
  pageSyncVersion?: number;
  pageCount?: number;
  siteSlug?: string;
};

function resolveTgdDataDir(): string {
  const envDir = process.env.TGD_DATA_DIR?.trim();
  if (envDir) return envDir;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../../data/trafik"),
    path.resolve(here, "../../../../data/trafik"),
    path.resolve(process.cwd(), "data/trafik"),
    path.resolve(process.cwd(), "../../data/trafik"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "manifest.json"))) return candidate;
  }
  return candidates[0]!;
}

export function isTgdStartupSyncEnabled(): boolean {
  if (process.env.SKIP_TGD_SYNC === "1") return false;
  return process.env.TGD_SYNC_ON_START === "1" || process.env.VKD_SYNC_ON_START === "1";
}

export function isTgdEditorTouched(layout: Record<string, unknown>): boolean {
  const raw = layout[TGD_EDITOR_TOUCHED_KEY];
  return typeof raw === "string" && raw.trim().length > 0;
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function loadPageDeltas(dataDir: string): HmLayoutDeltaInput[] {
  const files = readdirSync(dataDir)
    .filter((name) => /^pages-\d+\.json$/i.test(name))
    .sort();
  const out: HmLayoutDeltaInput[] = [];
  for (const file of files) {
    const payload = readJsonFile<HmLayoutDeltaInput>(path.join(dataDir, file));
    if (payload?.pageUpdates && Array.isArray(payload.pageUpdates) && payload.pageUpdates.length) {
      out.push({ ...payload, overwritePages: false });
    }
  }
  return out;
}

function loadHomeCopy(dataDir: string): Record<string, unknown> | null {
  const payload = readJsonFile<{ hmVatanHomeCopy?: unknown }>(path.join(dataDir, "home-copy.json"));
  if (!payload?.hmVatanHomeCopy || typeof payload.hmVatanHomeCopy !== "object") return null;
  return payload.hmVatanHomeCopy as Record<string, unknown>;
}

function presentPageSlugs(layout: Record<string, unknown>): Set<string> {
  const pages = layout.hmExtraPages;
  const out = new Set<string>();
  if (!Array.isArray(pages)) return out;
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const slug = String((page as { slug?: string }).slug ?? "")
      .trim()
      .toLowerCase();
    if (slug) out.add(slug);
  }
  return out;
}

const TGD_REQUIRED_PAGE_SLUGS = [
  "hakkimizda",
  "trafik-guvenligi-uzmani",
  "tgu-nedir",
  "trafik-yasam/projeler",
  "trafik-yasam/calismalar",
] as const;

async function findTgdSite(): Promise<{ id: number; layoutJson: string | null } | null> {
  const rows = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      layoutJson: hmNewsSitesTable.layoutJson,
    })
    .from(hmNewsSitesTable);
  for (const row of rows) {
    const slug = String(row.slug ?? "")
      .trim()
      .toLowerCase();
    const domains = [row.domain, row.domain2, row.domain3].map((d) =>
      String(d ?? "")
        .trim()
        .toLowerCase()
        .replace(/^www\./, ""),
    );
    if (
      slug === TGD_SITE_SLUG ||
      domains.includes("trafikdernegi.com") ||
      domains.includes("tgd.tc") ||
      domains.includes("trafik.gd")
    ) {
      return { id: row.id, layoutJson: row.layoutJson };
    }
  }
  return null;
}

export async function syncTgdPagesFromData(opts?: { forceFull?: boolean }): Promise<void> {
  const dataDir = resolveTgdDataDir();
  if (!existsSync(path.join(dataDir, "manifest.json"))) {
    console.info("[tgd-sync] data/trafik yok — atlandı");
    return;
  }
  const site = await findTgdSite();
  if (!site) {
    console.info("[tgd-sync] trafik sitesi bulunamadı — atlandı");
    return;
  }

  const layout = parseHmLayoutJson(site.layoutJson);
  const editorTouched = isTgdEditorTouched(layout);
  const manifest = readJsonFile<TgdManifest>(path.join(dataDir, "manifest.json")) ?? {};
  const targetVersion = Math.max(TGD_PAGE_SYNC_VERSION, Number(manifest.pageSyncVersion ?? 0) || 0);
  const currentVersion = Number(layout.tgdPageSyncVersion ?? 0) || 0;
  const present = presentPageSlugs(layout);
  const missingRequired = TGD_REQUIRED_PAGE_SLUGS.filter((slug) => !present.has(slug));
  const needsPages = opts?.forceFull === true || missingRequired.length > 0 || currentVersion < targetVersion;
  const needsCopy = layout.hmVatanHomeCopy == null || typeof layout.hmVatanHomeCopy !== "object";
  const needsTheme = String(layout.hmVitrinTheme ?? "").toLowerCase() !== "vatan";

  if (editorTouched && !opts?.forceFull) {
    // Still fill missing pages / theme / copy without overwriting editor bodies.
    if (!needsPages && !needsCopy && !needsTheme) {
      console.info("[tgd-sync] editör dokunmuş — atlandı");
      return;
    }
  }

  let next = { ...layout };
  if (needsTheme) next.hmVitrinTheme = "vatan";
  if (needsCopy) {
    const homeCopy = loadHomeCopy(dataDir);
    if (homeCopy) next.hmVatanHomeCopy = homeCopy;
  }
  if (!Array.isArray(next.hmVatanHomeHiddenModules)) {
    next.hmVatanHomeHiddenModules = ["sehitSearch", "ataturk", "wars"];
  } else if (needsCopy) {
    // TGD mozaik kutuları (projeler/çalışmalar) açılsın — eski VKD şehit mozaik gizlemesi kalksın.
    next.hmVatanHomeHiddenModules = (next.hmVatanHomeHiddenModules as unknown[])
      .map((id) => String(id ?? "").trim())
      .filter((id) => id && id !== "mosaic");
  }

  if (needsPages) {
    for (const delta of loadPageDeltas(dataDir)) {
      const applied = applyHmLayoutDelta(next, { ...delta, overwritePages: false });
      next = applied.layout;
    }
    next.tgdPageSyncVersion = targetVersion;
  }

  const serialized = JSON.stringify(next);
  if (serialized === String(site.layoutJson ?? "")) {
    console.info("[tgd-sync] değişiklik yok");
    return;
  }
  await dualWriteUpdate(
    hmNewsSitesTable,
    { layoutJson: serialized, updatedAt: new Date() },
    eq(hmNewsSitesTable.id, site.id),
  );
  console.info(
    `[tgd-sync] site #${site.id} güncellendi (pages=${needsPages} copy=${needsCopy} theme=${needsTheme})`,
  );
}
