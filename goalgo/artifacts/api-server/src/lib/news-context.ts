import { db, getNewsDbForRead, categoriesTable, authorsTable } from "@workspace/db";
import type { NewsContext } from "./serializers";

let cachedContext: { value: NewsContext; expiresAt: number } | null = null;
const NEWS_CONTEXT_CACHE_MS = 60_000;

/** Kategori slug/isim güncellemelerinden sonra serialize önbelleğini temizler. */
export function invalidateNewsContextCache(): void {
  cachedContext = null;
}

export async function loadNewsContext(): Promise<NewsContext> {
  const now = Date.now();
  if (cachedContext && cachedContext.expiresAt > now) {
    return cachedContext.value;
  }

  const rdb = getNewsDbForRead();
  const [cats, auths] = await Promise.all([
    /* Kategori yazımları ana DB'de; haber okuma cluster'ı ile senkron gecikmesi olmasın. */
    db.select().from(categoriesTable),
    rdb
      .select({ id: authorsTable.id, name: authorsTable.name })
      .from(authorsTable),
  ]);
  const value = {
    categories: new Map(cats.map((c) => [c.id, c])),
    authors: new Map(auths.map((a) => [a.id, a])),
  };
  cachedContext = { value, expiresAt: now + NEWS_CONTEXT_CACHE_MS };
  return value;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[ğĞ]/g, "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "haber";
}
