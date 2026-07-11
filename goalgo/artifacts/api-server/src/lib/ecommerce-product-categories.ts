import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import categoryPaths from "../data/ecommerce-category-paths.json" with { type: "json" };

type Row = Record<string, unknown>;
const r = <T>(res: { rows?: T[] } | T[]): T[] =>
  (Array.isArray(res) ? res : (res.rows ?? [])) as T[];

export type EcommerceCategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  position: number;
  children: EcommerceCategoryNode[];
};

const TOP_ORDER = [
  "Elektronik & Teknoloji",
  "Giyim, Moda & Aksesuar",
  "Ev, Yaşam, Kırtasiye & Ofis",
  "Anne, Bebek & Oyuncak",
  "Kozmetik & Kişisel Bakım",
  "Spor & Outdoor",
  "Süpermarket & Gıda",
  "Oto Aksesuar, Yapı Market & Bahçe",
  "Kitap, Müzik, Film & Hobi",
];

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/&/g, "ve")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

let ensurePromise: Promise<void> | null = null;

export function ensureEcommerceProductCategoriesSchema(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = db
    .execute(sql`
      CREATE TABLE IF NOT EXISTS ecommerce_product_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        parent_id INTEGER REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL,
        position INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ecommerce_product_categories_parent
        ON ecommerce_product_categories (parent_id, position);
      ALTER TABLE vendor_menu_items
        ADD COLUMN IF NOT EXISTS ecommerce_category_id INTEGER
        REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL;
      ALTER TABLE vendor_menu_categories
        ADD COLUMN IF NOT EXISTS ecommerce_category_id INTEGER
        REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL;
      ALTER TABLE vendor_menu_categories
        ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;
    `)
    .then(() => undefined)
    .catch((e) => {
      ensurePromise = null;
      throw e;
    });
  return ensurePromise;
}

async function findCategoryIdBySlug(slug: string): Promise<number | null> {
  const rows = r<{ id: number }>(
    await db.execute(sql`SELECT id FROM ecommerce_product_categories WHERE slug = ${slug} LIMIT 1`),
  );
  return rows[0]?.id ? Number(rows[0].id) : null;
}

async function upsertCategoryNode(
  name: string,
  slug: string,
  parentId: number | null,
  position: number,
): Promise<number> {
  const existing = await findCategoryIdBySlug(slug);
  if (existing) {
    await db.execute(sql`
      UPDATE ecommerce_product_categories SET
        name = ${name},
        parent_id = ${parentId},
        position = ${position},
        active = true
      WHERE id = ${existing}
    `);
    return existing;
  }
  const ins = r<{ id: number }>(
    await db.execute(sql`
      INSERT INTO ecommerce_product_categories (name, slug, parent_id, position, active)
      VALUES (${name}, ${slug}, ${parentId}, ${position}, true)
      RETURNING id
    `),
  );
  return Number(ins[0]!.id);
}

export async function seedEcommerceProductCategoriesIfNeeded(): Promise<number> {
  await ensureEcommerceProductCategoriesSchema();
  const countRows = r<{ count: string }>(
    await db.execute(sql`SELECT COUNT(*)::text AS count FROM ecommerce_product_categories`),
  );
  const currentCount = Number(countRows[0]?.count ?? 0);
  if (currentCount > 0) {
    const sentinel = r<{ id: number }>(
      await db.execute(sql`
        SELECT id FROM ecommerce_product_categories
        WHERE slug = 'kitap-muzik-film-ve-hobi-hobi-ve-sanat-puzzle-yapboz'
        LIMIT 1
      `),
    );
    if (sentinel[0]?.id) return currentCount;
  }

  const paths = [...new Set(categoryPaths as string[])].sort((a, b) => a.localeCompare(b, "tr"));
  const topSeen = new Set<string>();
  let topPos = 0;

  for (const path of paths) {
    const parts = path.split(">").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) continue;
    let parentId: number | null = null;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!;
      const slug = slugify(parts.slice(0, i + 1).join("-"));
      let position = i;
      if (i === 0) {
        if (!topSeen.has(name)) {
          topPos++;
          topSeen.add(name);
        }
        position = TOP_ORDER.indexOf(name) >= 0 ? TOP_ORDER.indexOf(name) + 1 : 100 + topPos;
      }
      const id = await upsertCategoryNode(name, slug, parentId, position);
      parentId = id;
    }
  }

  const after = r<{ count: string }>(
    await db.execute(sql`SELECT COUNT(*)::text AS count FROM ecommerce_product_categories`),
  );
  return Number(after[0]?.count ?? 0);
}

export async function listEcommerceCategoryRows(): Promise<
  Array<{ id: number; name: string; slug: string; parentId: number | null; position: number }>
> {
  await ensureEcommerceProductCategoriesSchema();
  await seedEcommerceProductCategoriesIfNeeded();
  return r(
    await db.execute(sql`
      SELECT id, name, slug, parent_id AS "parentId", position
      FROM ecommerce_product_categories
      WHERE active = true
      ORDER BY COALESCE(parent_id, id), position, name
    `),
  ).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    parentId: row.parentId != null ? Number(row.parentId) : null,
    position: Number(row.position ?? 0),
  }));
}

export function buildEcommerceCategoryTree(
  rows: Array<{ id: number; name: string; slug: string; parentId: number | null; position: number }>,
): EcommerceCategoryNode[] {
  const byParent = new Map<number | null, typeof rows>();
  for (const row of rows) {
    const key = row.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(row);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "tr"));
  }
  function build(parentId: number | null): EcommerceCategoryNode[] {
    return (byParent.get(parentId) ?? []).map((row) => ({
      ...row,
      children: build(row.id),
    }));
  }
  return build(null);
}

export async function getEcommerceCategoryTree(): Promise<EcommerceCategoryNode[]> {
  const rows = await listEcommerceCategoryRows();
  return buildEcommerceCategoryTree(rows);
}

export async function resolveEcommerceCategoryIdByPath(path: string): Promise<number | null> {
  await ensureEcommerceProductCategoriesSchema();
  await seedEcommerceProductCategoriesIfNeeded();
  const parts = path.split(">").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const slug = slugify(parts.join("-"));
  return findCategoryIdBySlug(slug);
}

export async function ensureVendorMenuCategoryForEcommerce(
  vendorId: number,
  ecommerceCategoryId: number,
): Promise<number> {
  const linked = r<{ id: number }>(
    await db.execute(sql`
      SELECT id FROM vendor_menu_categories
      WHERE vendor_id = ${vendorId} AND ecommerce_category_id = ${ecommerceCategoryId} AND active = true
      LIMIT 1
    `),
  );
  if (linked[0]?.id) return Number(linked[0].id);

  const cat = r<{ name: string }>(
    await db.execute(sql`SELECT name FROM ecommerce_product_categories WHERE id = ${ecommerceCategoryId} LIMIT 1`),
  );
  const name = String(cat[0]?.name ?? "Kategori");
  const posRes = r<{ pos: number }>(
    await db.execute(sql`SELECT COALESCE(MAX(position),0)+1 AS pos FROM vendor_menu_categories WHERE vendor_id = ${vendorId}`),
  );
  const pos = Number(posRes[0]?.pos ?? 1);
  const ins = r<{ id: number }>(
    await db.execute(sql`
      INSERT INTO vendor_menu_categories (vendor_id, name, position, active, ecommerce_category_id, is_custom)
      VALUES (${vendorId}, ${name}, ${pos}, true, ${ecommerceCategoryId}, false)
      RETURNING id
    `),
  );
  return Number(ins[0]!.id);
}

export async function ensureCustomVendorMenuCategory(vendorId: number, name: string): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Özel kategori adı zorunlu");
  const existing = r<{ id: number }>(
    await db.execute(sql`
      SELECT id FROM vendor_menu_categories
      WHERE vendor_id = ${vendorId} AND is_custom = true AND LOWER(name) = LOWER(${trimmed}) AND active = true
      LIMIT 1
    `),
  );
  if (existing[0]?.id) return Number(existing[0].id);
  const posRes = r<{ pos: number }>(
    await db.execute(sql`SELECT COALESCE(MAX(position),0)+1 AS pos FROM vendor_menu_categories WHERE vendor_id = ${vendorId}`),
  );
  const pos = Number(posRes[0]?.pos ?? 1);
  const ins = r<{ id: number }>(
    await db.execute(sql`
      INSERT INTO vendor_menu_categories (vendor_id, name, position, active, is_custom)
      VALUES (${vendorId}, ${trimmed}, ${pos}, true, true)
      RETURNING id
    `),
  );
  return Number(ins[0]!.id);
}

export async function resolveProductCategoryForVendor(input: {
  vendorId: number;
  vendorType: string;
  ecommerceCategoryId?: number | null;
  customCategoryName?: string | null;
  menuCategoryId?: number | null;
}): Promise<{ menuCategoryId: number | null; ecommerceCategoryId: number | null }> {
  const vt = String(input.vendorType || "").toLowerCase();
  const isShop = ["alisveris", "ecommerce"].includes(vt);
  if (!isShop) {
    return {
      menuCategoryId: input.menuCategoryId ?? null,
      ecommerceCategoryId: null,
    };
  }

  if (input.ecommerceCategoryId) {
    const menuCategoryId = await ensureVendorMenuCategoryForEcommerce(
      input.vendorId,
      input.ecommerceCategoryId,
    );
    return { menuCategoryId, ecommerceCategoryId: input.ecommerceCategoryId };
  }

  if (input.customCategoryName?.trim()) {
    const menuCategoryId = await ensureCustomVendorMenuCategory(
      input.vendorId,
      input.customCategoryName,
    );
    return { menuCategoryId, ecommerceCategoryId: null };
  }

  return {
    menuCategoryId: input.menuCategoryId ?? null,
    ecommerceCategoryId: null,
  };
}
