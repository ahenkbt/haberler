import { eq, sql } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { getYektubeDbForRead, videoSourcesTable, videosTable } from "@workspace/db";
import { ADMIN_CATEGORY_SLUGS, categoryDisplayLabel, slugifyVideoCategory } from "./yektubeCategoryCatalog.js";

const yektubeDb = getYektubeDbForRead();

export type SectionCategoryDef = {
  id: string;
  label: string;
  keywords?: string[];
  hidden?: boolean;
};

export type YektubeCategoryDef = {
  slug: string;
  label: string;
  hidden?: boolean;
};

export type SectionConfigStore = {
  yektubeCategories: YektubeCategoryDef[];
  muzikCategories: SectionCategoryDef[];
  cocukCategories: SectionCategoryDef[];
};

const DEFAULT_MUZIK: SectionCategoryDef[] = [
  { id: "all", label: "Tümü" },
  { id: "pop", label: "Pop", keywords: ["pop", "türk pop"] },
  { id: "enerji", label: "Enerji", keywords: ["enerji", "edm", "dance"] },
  { id: "rahatlama", label: "Rahatlama", keywords: ["chill", "lofi", "rahat"] },
  { id: "romantik", label: "Romantik", keywords: ["romantik", "aşk", "ballad"] },
];

const DEFAULT_COCUK: SectionCategoryDef[] = [
  { id: "onerilen", label: "Önerilen", keywords: [] },
  { id: "muzik", label: "Müzik", keywords: ["müzik", "music", "song", "şarkı", "nursery"] },
  { id: "kesfet", label: "Keşfet", keywords: ["keşfet", "explore", "macera"] },
  { id: "ogrenme", label: "Öğrenme", keywords: ["öğren", "learn", "eğitim", "education", "okul"] },
  { id: "sovlar", label: "Şovlar", keywords: ["show", "şov", "episodes", "bölüm", "dizi"] },
];

let configCache: SectionConfigStore | null = null;

async function ensureConfigColumn(): Promise<void> {
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS yektube_section_config_json TEXT`);
}

async function readConfigJsonRaw(): Promise<string | null> {
  await ensureConfigColumn();
  const result = await db.execute(sql`SELECT yektube_section_config_json FROM site_settings LIMIT 1`);
  const rows = (result as { rows?: Array<{ yektube_section_config_json?: string | null }> }).rows ?? result;
  const row = Array.isArray(rows) ? rows[0] : null;
  const json = row?.yektube_section_config_json;
  return typeof json === "string" ? json : null;
}

async function writeConfigJsonRaw(json: string): Promise<void> {
  await ensureConfigColumn();
  const [existing] = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
  if (existing) {
    await db.execute(
      sql`UPDATE site_settings SET yektube_section_config_json = ${json} WHERE id = ${existing.id}`,
    );
  }
}

function defaultYektubeCategories(): YektubeCategoryDef[] {
  return ADMIN_CATEGORY_SLUGS.map((slug) => ({ slug, label: categoryDisplayLabel(slug) }));
}

function normalizeStore(raw: unknown): SectionConfigStore {
  const base: SectionConfigStore = {
    yektubeCategories: defaultYektubeCategories(),
    muzikCategories: DEFAULT_MUZIK,
    cocukCategories: DEFAULT_COCUK,
  };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<SectionConfigStore>;
  if (Array.isArray(o.yektubeCategories) && o.yektubeCategories.length > 0) {
    base.yektubeCategories = o.yektubeCategories.filter((c) => c?.slug && c?.label);
  }
  if (Array.isArray(o.muzikCategories) && o.muzikCategories.length > 0) {
    base.muzikCategories = o.muzikCategories.filter((c) => c?.id && c?.label);
  }
  if (Array.isArray(o.cocukCategories) && o.cocukCategories.length > 0) {
    base.cocukCategories = o.cocukCategories.filter((c) => c?.id && c?.label);
  }
  return base;
}

export async function loadSectionConfig(): Promise<SectionConfigStore> {
  if (configCache) return configCache;
  const raw = await readConfigJsonRaw();
  if (!raw?.trim()) {
    configCache = normalizeStore(null);
    return configCache;
  }
  try {
    configCache = normalizeStore(JSON.parse(raw));
  } catch {
    configCache = normalizeStore(null);
  }
  return configCache;
}

export async function saveSectionConfig(store: SectionConfigStore): Promise<SectionConfigStore> {
  const normalized = normalizeStore(store);
  const json = JSON.stringify(normalized);
  await writeConfigJsonRaw(json);
  configCache = normalized;
  return normalized;
}

export function invalidateSectionConfigCache(): void {
  configCache = null;
}

const MUZIK_SLUGS = new Set(["muzik", "music"]);
const COCUK_SLUGS = new Set(["cocuk", "kids"]);

function normSlug(slug: string | null | undefined): string {
  return slugifyVideoCategory(slug ?? "") || slug?.trim().toLowerCase() || "";
}

function isMuzikSlug(slug: string): boolean {
  return MUZIK_SLUGS.has(normSlug(slug));
}

function isCocukSlug(slug: string): boolean {
  return COCUK_SLUGS.has(normSlug(slug));
}

export type SectionCategoryStat = {
  slug: string;
  label: string;
  sourceCount: number;
  videoCount: number;
};

export type SectionAdminStat = {
  id: "yektube" | "muzik" | "cocuk";
  label: string;
  categoryCount: number;
  sourceCount: number;
  videoCount: number;
  categories: SectionCategoryStat[];
};

export async function getAdminSectionStats(): Promise<SectionAdminStat[]> {
  const config = await loadSectionConfig();
  const sources = await yektubeDb.select().from(videoSourcesTable);
  const videoRows = await yektubeDb
    .select({
      categorySlug: videosTable.categorySlug,
      count: sql<number>`count(*)::int`,
    })
    .from(videosTable)
    .where(eq(videosTable.active, true))
    .groupBy(videosTable.categorySlug);

  const videosByCat = new Map<string, number>();
  for (const row of videoRows) {
    const slug = normSlug(row.categorySlug);
    if (!slug) continue;
    videosByCat.set(slug, (videosByCat.get(slug) ?? 0) + Number(row.count ?? 0));
  }

  const sourcesByCat = new Map<string, number>();
  for (const s of sources) {
    const slug = normSlug(s.categorySlug);
    if (!slug) continue;
    sourcesByCat.set(slug, (sourcesByCat.get(slug) ?? 0) + 1);
  }

  function buildSection(
    id: "yektube" | "muzik" | "cocuk",
    label: string,
    match: (slug: string) => boolean,
    categoryDefs: Array<{ slug: string; label: string }>,
  ): SectionAdminStat {
    const categories: SectionCategoryStat[] = categoryDefs.map((c) => ({
      slug: c.slug,
      label: c.label,
      sourceCount: match(c.slug) ? sourcesByCat.get(c.slug) ?? 0 : 0,
      videoCount: match(c.slug) ? videosByCat.get(c.slug) ?? 0 : 0,
    }));

    let sourceCount = 0;
    let videoCount = 0;
    for (const s of sources) {
      const slug = normSlug(s.categorySlug);
      if (match(slug)) sourceCount++;
    }
    for (const [slug, count] of videosByCat) {
      if (match(slug)) videoCount += count;
    }

    return {
      id,
      label,
      categoryCount: categories.filter((c) => !c.slug.startsWith("_")).length,
      sourceCount,
      videoCount,
      categories: categories.sort((a, b) => b.videoCount - a.videoCount || a.label.localeCompare(b.label, "tr")),
    };
  }

  const yektubeCats = config.yektubeCategories
    .filter((c) => !c.hidden)
    .map((c) => ({ slug: c.slug, label: c.label }));

  const muzikCats = [{ slug: "muzik", label: "Müzik" }, ...config.muzikCategories.filter((c) => c.id !== "all" && !c.hidden).map((c) => ({ slug: `muzik:${c.id}`, label: c.label }))];

  const cocukCats = [{ slug: "cocuk", label: "Çocuk" }, ...config.cocukCategories.filter((c) => c.id !== "onerilen" && !c.hidden).map((c) => ({ slug: `cocuk:${c.id}`, label: c.label }))];

  return [
    buildSection("yektube", "Yektube", (slug) => !isMuzikSlug(slug) && !isCocukSlug(slug), yektubeCats),
    buildSection("muzik", "Müzik", (slug) => isMuzikSlug(slug), muzikCats),
    buildSection("cocuk", "Çocuk", (slug) => isCocukSlug(slug), cocukCats),
  ];
}

export async function getPublicSectionCategories(section: "muzik" | "cocuk"): Promise<SectionCategoryDef[]> {
  const config = await loadSectionConfig();
  return section === "muzik" ? config.muzikCategories.filter((c) => !c.hidden) : config.cocukCategories.filter((c) => !c.hidden);
}
