import seedRows from "../data/turizm-blog-seed.json" with { type: "json" };
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

type TurizmBlogSeedRow = {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  body_html: string;
  cover_image_url: string;
  category_slug: string | null;
  is_featured: boolean;
  is_published: boolean;
  published_at: string;
};

function loadSeedRows(): TurizmBlogSeedRow[] {
  return seedRows as TurizmBlogSeedRow[];
}

/** Post-migrate: turizm blog yazılarını DB'ye idempotent upsert (0084 SQL seed yerine). */
export async function seedTurizmBlogPostsIfNeeded(): Promise<void> {
  const countRes = await db.execute(
    sql`SELECT COUNT(*)::int AS c FROM turizm_blog_posts WHERE is_published = true`,
  );
  const existing = Number((countRes.rows as { c: number }[])[0]?.c ?? 0);
  if (existing >= 10) {
    console.log(`[post-migrate] turizm blog seed atlandı (${existing} yayınlı yazı mevcut)`);
    return;
  }

  const posts = loadSeedRows();
  let upserted = 0;

  for (const p of posts) {
    await db.execute(sql`
      INSERT INTO turizm_blog_posts (
        slug, title, meta_title, meta_description, excerpt, body_html,
        cover_image_url, category_slug, is_featured, is_published, published_at
      ) VALUES (
        ${p.slug},
        ${p.title},
        ${p.meta_title},
        ${p.meta_description},
        ${p.excerpt},
        ${p.body_html},
        ${p.cover_image_url},
        ${p.category_slug},
        ${p.is_featured},
        ${p.is_published},
        ${p.published_at}::timestamptz
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        excerpt = EXCLUDED.excerpt,
        body_html = EXCLUDED.body_html,
        cover_image_url = EXCLUDED.cover_image_url,
        category_slug = EXCLUDED.category_slug,
        is_featured = EXCLUDED.is_featured,
        is_published = EXCLUDED.is_published,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
    `);
    upserted += 1;
  }

  console.log(`[post-migrate] turizm blog seed: ${upserted} yazı upsert edildi`);
}
