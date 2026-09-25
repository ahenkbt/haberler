/**
 * Trafik Güvenliği Derneği — seed archive pages + Vatan home copy into layout_json.
 *
 * Not: HM özel sayfa rotası tek segment (`/tr/:slug/:pageSlug`). Bu yüzden
 * `trafik-yasam/projeler` yerine `trafik-yasam-projeler` kullanılır.
 * WP import'un ürettiği `slug-2` / `slug-3` kopyaları menüyü boş sayfaya düşürmesin
 * diye kanonik slug'a upsert edilir (forceFull'da gövde de yenilenir).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { dualWriteUpdate, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { parseHmLayoutJson } from "./hm-layout-delta.js";

export const TGD_SITE_SLUG = "trafik";
export const TGD_EDITOR_TOUCHED_KEY = "tgdEditorTouchedAt";
/** Bump: kanonik slug upsert + WP -N duplicate prune. */
export const TGD_PAGE_SYNC_VERSION = 2;

type TgdManifest = {
  pageSyncVersion?: number;
  pageCount?: number;
  siteSlug?: string;
};

type TgdPageSeed = {
  id: string;
  slug: string;
  title: string;
  bodyHtml: string;
  enabled: boolean;
  fullWidth: boolean;
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

/** Nested path → tek segment (rota `/tr/:site/:pageSlug`). */
export function normalizeTgdPageSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadPageSeeds(dataDir: string): TgdPageSeed[] {
  const files = readdirSync(dataDir)
    .filter((name) => /^pages-\d+\.json$/i.test(name))
    .sort();
  const out: TgdPageSeed[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const payload = readJsonFile<{ pageUpdates?: unknown[] }>(path.join(dataDir, file));
    if (!payload?.pageUpdates || !Array.isArray(payload.pageUpdates)) continue;
    for (const raw of payload.pageUpdates) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const slug = normalizeTgdPageSlug(String(row.slug ?? ""));
      const title = String(row.title ?? "").trim();
      const bodyHtml = String(row.bodyHtml ?? row.html ?? "").trim();
      const id = String(row.id ?? `tgd-${slug}`).trim() || `tgd-${slug}`;
      if (!slug || !title || !bodyHtml || seen.has(slug)) continue;
      seen.add(slug);
      out.push({
        id,
        slug,
        title,
        bodyHtml,
        enabled: row.enabled === false ? false : true,
        fullWidth: row.fullWidth === false ? false : true,
      });
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
    const slug = normalizeTgdPageSlug(String((page as { slug?: string }).slug ?? ""));
    if (slug) out.add(slug);
  }
  return out;
}

const TGD_REQUIRED_PAGE_SLUGS = [
  "hakkimizda",
  "trafik-guvenligi-uzmani",
  "tgu-nedir",
  "seviye-1-trafik-guvenligi-uzmani-uygulayici",
  "seviye-2-trafik-guvenligi-ic-denetcisi",
  "trafik-guvenligi-bas-denetcisi",
  "bagimsiz-denetci",
  "trafik-yasam-projeler",
  "trafik-yasam-calismalar",
] as const;

/**
 * Kanonik TGD sayfalarını exact slug ile yazar.
 * WP import'un `slug-2` / `slug-3` kopyalarını forceFull'da budar.
 */
export function upsertTgdExtraPages(
  layout: Record<string, unknown>,
  seeds: TgdPageSeed[],
  opts: { overwriteBodies: boolean; pruneNumericDuplicates: boolean },
): { layout: Record<string, unknown>; upserted: number; pruned: number } {
  const existingRaw = Array.isArray(layout.hmExtraPages) ? [...(layout.hmExtraPages as unknown[])] : [];
  const pages: Array<Record<string, unknown>> = existingRaw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && !Array.isArray(p))
    .map((p) => ({ ...p }));

  const indexBySlug = new Map<string, number>();
  for (let i = 0; i < pages.length; i++) {
    const slug = normalizeTgdPageSlug(String(pages[i]?.slug ?? ""));
    if (slug && !indexBySlug.has(slug)) indexBySlug.set(slug, i);
  }

  const canonical = new Set(seeds.map((s) => s.slug));
  let upserted = 0;

  for (const seed of seeds) {
    const idx = indexBySlug.get(seed.slug);
    if (idx == null) {
      pages.push({
        id: seed.id,
        slug: seed.slug,
        title: seed.title,
        bodyHtml: seed.bodyHtml,
        enabled: seed.enabled,
        fullWidth: seed.fullWidth,
        importSource: "tgd-archive",
        importedAt: new Date().toISOString(),
      });
      indexBySlug.set(seed.slug, pages.length - 1);
      upserted += 1;
      continue;
    }
    const cur = pages[idx]!;
    const hasBody = String(cur.bodyHtml ?? "").trim().length > 0;
    if (opts.overwriteBodies || !hasBody) {
      pages[idx] = {
        ...cur,
        id: String(cur.id ?? seed.id),
        slug: seed.slug,
        title: seed.title,
        bodyHtml: seed.bodyHtml,
        enabled: seed.enabled,
        fullWidth: seed.fullWidth,
        importSource: cur.importSource ?? "tgd-archive",
      };
      upserted += 1;
    }
  }

  let pruned = 0;
  let nextPages = pages;
  if (opts.pruneNumericDuplicates) {
    nextPages = pages.filter((page) => {
      const slug = normalizeTgdPageSlug(String(page.slug ?? ""));
      const m = /^(.*)-(\d+)$/.exec(slug);
      if (!m) return true;
      const base = m[1] ?? "";
      if (canonical.has(base) && indexBySlug.has(base)) {
        pruned += 1;
        return false;
      }
      return true;
    });
  }

  return {
    layout: { ...layout, hmExtraPages: nextPages },
    upserted,
    pruned,
  };
}

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
  const needsCopy =
    opts?.forceFull === true || layout.hmVatanHomeCopy == null || typeof layout.hmVatanHomeCopy !== "object";
  const needsTheme = String(layout.hmVitrinTheme ?? "").toLowerCase() !== "vatan";

  if (editorTouched && !opts?.forceFull) {
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
    next.hmVatanHomeHiddenModules = (next.hmVatanHomeHiddenModules as unknown[])
      .map((id) => String(id ?? "").trim())
      .filter((id) => id && id !== "mosaic");
  }

  let upserted = 0;
  let pruned = 0;
  if (needsPages) {
    const seeds = loadPageSeeds(dataDir);
    const result = upsertTgdExtraPages(next, seeds, {
      overwriteBodies: opts?.forceFull === true || currentVersion < targetVersion,
      pruneNumericDuplicates: opts?.forceFull === true || currentVersion < targetVersion,
    });
    next = result.layout;
    upserted = result.upserted;
    pruned = result.pruned;
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
    `[tgd-sync] site #${site.id} güncellendi (pages=${needsPages} upserted=${upserted} pruned=${pruned} copy=${needsCopy} theme=${needsTheme})`,
  );
}
