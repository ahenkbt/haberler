import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, categoriesTable, categoryAliasesTable, newsTable } from "@workspace/db";

function slugify(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export type MergeCategoriesResult =
  | {
      targetId: number;
      targetSlug: string;
      targetName: string;
      movedNews: number;
      mergedSourceIds: number[];
      aliases: string[];
    }
  | { error: string; status: number };

/**
 * Kategori birleştirme çekirdek mantığı (admin + editör paylaşır).
 * - `restrictSiteId` verilirse yalnızca o siteye özel kaynak kategoriler birleştirilebilir.
 * - Haberler hedefe taşınır, eski slug'lar alias'lanır, kaynak kategoriler silinir.
 */
export async function mergeCategories(opts: {
  sourceIds: number[];
  targetId?: number | null;
  targetName?: string | null;
  targetSlug?: string | null;
  makeGeneral?: boolean;
  restrictSiteId?: number | null;
}): Promise<MergeCategoriesResult> {
  const sourceIds = Array.from(new Set(opts.sourceIds.filter((n) => Number.isFinite(n) && n > 0)));
  if (sourceIds.length === 0) return { error: "Kaynak kategori yok", status: 400 };

  const allIds = Array.from(new Set([...sourceIds, ...(opts.targetId ? [opts.targetId] : [])]));
  const cats = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      color: categoriesTable.color,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable)
    .where(inArray(categoriesTable.id, allIds));
  const byId = new Map(cats.map((c) => [c.id, c]));

  const restrict = opts.restrictSiteId ?? null;
  if (restrict != null) {
    for (const id of sourceIds) {
      const c = byId.get(id);
      if (!c) return { error: `Kategori bulunamadı: ${id}`, status: 404 };
      if (c.exclusiveSiteId !== restrict) return { error: "Sadece kendi sitenizin kategorilerini birleştirebilirsiniz", status: 403 };
    }
  }

  // Hedef kategori: verilen targetId veya yeni oluştur.
  let target = opts.targetId ? byId.get(opts.targetId) ?? null : null;
  if (!target) {
    const name = (opts.targetName ?? "").trim();
    if (!name) return { error: "Hedef kategori adı veya id gerekli", status: 400 };
    const slug = (opts.targetSlug ?? "").trim() ? slugify(opts.targetSlug!) : slugify(name);
    if (!slug) return { error: "Geçersiz hedef slug", status: 400 };
    const exclusiveSiteId = opts.makeGeneral ? null : restrict;
    // Aynı slug + kapsam varsa tekrar kullan.
    const [existing] = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name, slug: categoriesTable.slug, color: categoriesTable.color, exclusiveSiteId: categoriesTable.exclusiveSiteId })
      .from(categoriesTable)
      .where(
        exclusiveSiteId == null
          ? and(eq(categoriesTable.slug, slug), isNull(categoriesTable.exclusiveSiteId))
          : and(eq(categoriesTable.slug, slug), eq(categoriesTable.exclusiveSiteId, exclusiveSiteId)),
      );
    if (existing) {
      target = existing;
    } else {
      const [created] = await db
        .insert(categoriesTable)
        .values({ name, slug, color: "#1f6f43", exclusiveSiteId })
        .returning();
      target = created ?? null;
    }
  }
  if (!target) return { error: "Hedef kategori oluşturulamadı", status: 500 };

  const targetId = target.id;
  const mergeFromIds = sourceIds.filter((id) => id !== targetId);
  if (mergeFromIds.length === 0) {
    return { targetId, targetSlug: target.slug, targetName: target.name, movedNews: 0, mergedSourceIds: [], aliases: [] };
  }

  // Haberleri hedefe taşı.
  const moved = await db
    .update(newsTable)
    .set({ categoryId: targetId })
    .where(inArray(newsTable.categoryId, mergeFromIds))
    .returning({ id: newsTable.id });

  // Eski slug'ları alias'la.
  const aliases: string[] = [];
  for (const id of mergeFromIds) {
    const c = byId.get(id);
    if (!c) continue;
    const from = slugify(c.slug);
    if (!from || from === slugify(target.slug)) continue;
    try {
      await db
        .insert(categoryAliasesTable)
        .values({ fromSlug: from, toCategoryId: targetId, siteId: restrict })
        .onConflictDoNothing();
      aliases.push(from);
    } catch {
      /* alias ekleme hatası kritik değil */
    }
  }

  // Hedef genel yapılacaksa yükselt.
  if (opts.makeGeneral && target.exclusiveSiteId != null) {
    await db.update(categoriesTable).set({ exclusiveSiteId: null }).where(eq(categoriesTable.id, targetId));
  }

  // Kaynak kategorileri sil.
  await db.delete(categoriesTable).where(inArray(categoriesTable.id, mergeFromIds));

  return {
    targetId,
    targetSlug: target.slug,
    targetName: target.name,
    movedNews: moved.length,
    mergedSourceIds: mergeFromIds,
    aliases,
  };
}
