import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { HM_TELIF_DEFAULT_BODY_HTML } from "./hmTelifDefaultBodyHtml.js";

export type HmStaticPage = {
  id: string;
  slug: string;
  title: string;
  lastUpdated: string;
  body: string;
  /** Footer / menü etiketi; boşsa yalnızca doğrudan URL ile erişilir */
  menuLabel?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const HM_TELIF_KULLANIM_SLUG = "telif-kullanim";

const DEFAULT_TELIF_BODY = HM_TELIF_DEFAULT_BODY_HTML;

function defaultPages(): HmStaticPage[] {
  const now = new Date().toISOString();
  return [
    {
      id: "hm-telif-kullanim-default",
      slug: HM_TELIF_KULLANIM_SLUG,
      title: "Haber Sitesi Telif Hakkı ve Kullanım Şartları",
      lastUpdated: "29 Haziran 2026",
      body: DEFAULT_TELIF_BODY,
      menuLabel: "Telif & Kullanım",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

let pagesCache: HmStaticPage[] | null = null;

async function ensurePagesColumn(): Promise<void> {
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hm_static_pages_json TEXT`);
}

async function readPagesJsonRaw(): Promise<string | null> {
  await ensurePagesColumn();
  const result = await db.execute(sql`SELECT hm_static_pages_json FROM site_settings LIMIT 1`);
  const rows = (result as { rows?: Array<{ hm_static_pages_json?: string | null }> }).rows ?? result;
  const row = Array.isArray(rows) ? rows[0] : null;
  const json = row?.hm_static_pages_json;
  return typeof json === "string" ? json : null;
}

async function writePagesJsonRaw(json: string): Promise<void> {
  await ensurePagesColumn();
  const [existing] = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
  if (existing) {
    await db.execute(
      sql`UPDATE site_settings SET hm_static_pages_json = ${json} WHERE id = ${existing.id}`,
    );
  }
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 80;
}

function normalizePage(raw: unknown): HmStaticPage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<HmStaticPage>;
  const slug = typeof o.slug === "string" ? slugify(o.slug) : "";
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const body = typeof o.body === "string" ? o.body : "";
  const lastUpdated = typeof o.lastUpdated === "string" ? o.lastUpdated.trim() : "";
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : randomUUID();
  if (!isValidSlug(slug) || !title) return null;
  const now = new Date().toISOString();
  return {
    id,
    slug,
    title,
    lastUpdated: lastUpdated || "—",
    body,
    menuLabel: typeof o.menuLabel === "string" && o.menuLabel.trim() ? o.menuLabel.trim() : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : now,
  };
}

function normalizePages(raw: unknown): HmStaticPage[] {
  if (!Array.isArray(raw)) return defaultPages();
  const pages = raw.map(normalizePage).filter((p): p is HmStaticPage => p !== null);
  return pages.length > 0 ? pages : defaultPages();
}

export async function loadHmStaticPages(): Promise<HmStaticPage[]> {
  if (pagesCache) return pagesCache;
  const raw = await readPagesJsonRaw();
  if (!raw?.trim()) {
    const seeded = defaultPages();
    await writePagesJsonRaw(JSON.stringify(seeded));
    pagesCache = seeded;
    return seeded;
  }
  try {
    pagesCache = normalizePages(JSON.parse(raw));
  } catch {
    pagesCache = defaultPages();
  }
  return pagesCache;
}

async function persistPages(pages: HmStaticPage[]): Promise<HmStaticPage[]> {
  const normalized = normalizePages(pages);
  await writePagesJsonRaw(JSON.stringify(normalized));
  pagesCache = normalized;
  return normalized;
}

export function invalidateHmStaticPagesCache(): void {
  pagesCache = null;
}

export async function getHmStaticPageBySlug(slug: string): Promise<HmStaticPage | null> {
  const key = slugify(slug);
  const pages = await loadHmStaticPages();
  return pages.find((p) => p.slug === key) ?? null;
}

export type UpdateHmStaticPageInput = Partial<
  Pick<HmStaticPage, "slug" | "title" | "lastUpdated" | "body" | "menuLabel">
>;

export async function updateHmStaticPage(id: string, input: UpdateHmStaticPageInput): Promise<HmStaticPage> {
  const pages = await loadHmStaticPages();
  const idx = pages.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Sayfa bulunamadı");
  const current = pages[idx]!;
  let slug = current.slug;
  if (typeof input.slug === "string" && input.slug.trim()) {
    slug = slugify(input.slug);
    if (!isValidSlug(slug)) throw new Error("Geçersiz slug");
    if (pages.some((p) => p.slug === slug && p.id !== id)) throw new Error("Bu slug zaten kullanılıyor");
  }
  const next: HmStaticPage = {
    ...current,
    slug,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim() : current.title,
    lastUpdated:
      typeof input.lastUpdated === "string" && input.lastUpdated.trim()
        ? input.lastUpdated.trim()
        : current.lastUpdated,
    body: typeof input.body === "string" ? input.body : current.body,
    menuLabel:
      input.menuLabel === null
        ? null
        : typeof input.menuLabel === "string"
          ? input.menuLabel.trim() || null
          : current.menuLabel ?? null,
    updatedAt: new Date().toISOString(),
  };
  const updated = [...pages];
  updated[idx] = next;
  await persistPages(updated);
  return next;
}

export { isValidSlug, slugify, DEFAULT_TELIF_BODY };
