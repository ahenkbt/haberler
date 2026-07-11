import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export const MARKETPLACE_SITEMAP_PAGE_SIZE = 5000;

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugifyTr(str: string): string {
  return String(str ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function marketplaceProductPublicPath(id: number, name: string): string {
  return `/magaza/urun/${id}-${slugifyTr(name)}`;
}

export async function countMarketplaceProductsForSitemap(): Promise<number> {
  const r = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM vendor_menu_items mi
    JOIN vendors v ON v.id = mi.vendor_id
    WHERE mi.active = true
      AND v.active = true
      AND v.vendor_type = 'ecommerce'
      AND COALESCE(NULLIF(trim(mi.name), ''), '') <> ''
  `);
  const row = (r.rows?.[0] ?? {}) as { count?: number };
  return Number(row.count ?? 0);
}

type ProductSitemapRow = {
  id: number;
  name: string;
  image_url: string | null;
  updated_at: string | Date | null;
};


export async function countMarketplaceProductsOnSitemapPage(page: number): Promise<number> {
  const offset = (Math.max(1, page) - 1) * MARKETPLACE_SITEMAP_PAGE_SIZE;
  const r = await db.execute(sql`
    SELECT count(*)::int AS count FROM (
      SELECT mi.id
      FROM vendor_menu_items mi
      JOIN vendors v ON v.id = mi.vendor_id
      WHERE mi.active = true
        AND v.active = true
        AND v.vendor_type = 'ecommerce'
        AND COALESCE(NULLIF(trim(mi.name), ''), '') <> ''
      ORDER BY mi.updated_at DESC NULLS LAST, mi.id DESC
      LIMIT ${MARKETPLACE_SITEMAP_PAGE_SIZE}
      OFFSET ${offset}
    ) sub
  `);
  return Number((r.rows?.[0] as { count?: number } | undefined)?.count ?? 0);
}

export async function buildMarketplaceProductSitemapXml(baseOrigin: string, page: number): Promise<string> {
  const pageIndex = Math.max(1, page);
  const offset = (pageIndex - 1) * MARKETPLACE_SITEMAP_PAGE_SIZE;
  const base = baseOrigin.replace(/\/+$/, "");

  const r = await db.execute(sql`
    SELECT mi.id, mi.name, mi.image_url, mi.updated_at
    FROM vendor_menu_items mi
    JOIN vendors v ON v.id = mi.vendor_id
    WHERE mi.active = true
      AND v.active = true
      AND v.vendor_type = 'ecommerce'
      AND COALESCE(NULLIF(trim(mi.name), ''), '') <> ''
    ORDER BY mi.updated_at DESC NULLS LAST, mi.id DESC
    LIMIT ${MARKETPLACE_SITEMAP_PAGE_SIZE}
    OFFSET ${offset}
  `);

  const attrs =
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

  const blocks: string[] = [];
  for (const raw of r.rows ?? []) {
    const row = raw as ProductSitemapRow;
    const id = Number(row.id ?? 0);
    const name = String(row.name ?? "").trim();
    if (!id || !name) continue;
    const path = marketplaceProductPublicPath(id, name);
    const loc = `${base}${path}`;
    const lastmod = row.updated_at ? new Date(row.updated_at).toISOString().split("T")[0] : "";
    const image = String(row.image_url ?? "").trim();
    const lines = [
      "  <url>",
      `    <loc>${escXml(loc)}</loc>`,
      "    <changefreq>weekly</changefreq>",
      "    <priority>0.7</priority>",
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    ];
    if (image) {
      lines.push("    <image:image>");
      lines.push(`      <image:loc>${escXml(image.startsWith("http") ? image : `${base}${image.startsWith("/") ? image : `/${image}`}`)}</image:loc>`);
      lines.push(`      <image:title>${escXml(name.slice(0, 200))}</image:title>`);
      lines.push("    </image:image>");
    }
    lines.push("  </url>");
    blocks.push(lines.filter(Boolean).join("\n"));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${attrs}>\n${blocks.join("\n")}\n</urlset>`;
}
