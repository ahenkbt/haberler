import { eq, sql } from "drizzle-orm";
import {
  authorsTable,
  db as mainDb,
  hmMakalelerTable,
  newsDb,
  shouldMirrorToNewsDb,
} from "@workspace/db";

/**
 * HM kaynak satırlarını (site yazarları + hm_makaleler) ana DB'den ayrı haber DB'sine kopyalar.
 *
 * Panel/kenar artık hm_makaleler ve authors satırlarını doğrudan Neon'a yazıyor; Worker'ın
 * /api/hm/bridge/mirror çağrısı NEWS_DATABASE_URL tanımsız Container'da no-op kalıyor. PHP tema
 * yazar sayfası ve YAZARLAR şeridi ise haber DB'sindeki hm_makaleler'den okuduğu için yeni köşe
 * yazısı /haber/:slug'da (merkez `news` kopyası üzerinden) görünürken yazar listesinde çıkmıyordu.
 *
 * Bu adım, merkez senkronunun (dual-write ile haber DB'sine zaten ulaşan yol) sonunda çalışır:
 * - Yazarlar: hm_site_id = site olan satırlar aynı id ile upsert edilir; haber DB'sinde aynı id
 *   başka bir siteye aitse ezilmez.
 * - Makaleler: haber DB'sindeki kopya yoksa ya da updated_at eskiyse upsert edilir; aynı id başka
 *   siteye aitse ezilmez. (site_id, slug) çakışması veya eksik yazar FK'sı satır bazında loglanır.
 * - Silme yansıtılmaz: haber DB'sinde yalnızca orada bulunan (eski) satırlar korunur.
 */

export type HmSourceMirrorStats = {
  authorsMirrored: number;
  makalelerMirrored: number;
  makalelerUnchanged: number;
  errors: string[];
};

type AuthorRow = typeof authorsTable.$inferSelect;
type MakaleRow = typeof hmMakalelerTable.$inferSelect;

export type HmSourceMirrorDeps = {
  readSiteAuthors: (siteId: number) => Promise<AuthorRow[]>;
  readSiteMakaleler: (siteId: number) => Promise<MakaleRow[]>;
  readMirroredMakaleStamps: (siteId: number) => Promise<Array<{ id: number; updatedAt: Date | null }>>;
  upsertAuthor: (row: AuthorRow, siteId: number) => Promise<void>;
  upsertMakale: (row: MakaleRow, siteId: number) => Promise<void>;
  enabled: () => boolean;
};

function errText(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

function stamp(d: Date | string | null | undefined): number {
  if (!d) return 0;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

function defaultDeps(): HmSourceMirrorDeps | null {
  const news = newsDb;
  if (!news) return null;
  return {
    enabled: shouldMirrorToNewsDb,
    readSiteAuthors: (siteId) =>
      mainDb.select().from(authorsTable).where(eq(authorsTable.hmSiteId, siteId)),
    readSiteMakaleler: (siteId) =>
      mainDb.select().from(hmMakalelerTable).where(eq(hmMakalelerTable.siteId, siteId)),
    readMirroredMakaleStamps: (siteId) =>
      news
        .select({ id: hmMakalelerTable.id, updatedAt: hmMakalelerTable.updatedAt })
        .from(hmMakalelerTable)
        .where(eq(hmMakalelerTable.siteId, siteId)),
    upsertAuthor: async (row, siteId) => {
      const { id: _id, ...rest } = row;
      await news
        .insert(authorsTable)
        .values(row)
        .onConflictDoUpdate({
          target: authorsTable.id,
          set: rest,
          setWhere: sql`${authorsTable.hmSiteId} = ${siteId}`,
        });
    },
    upsertMakale: async (row, siteId) => {
      const { id: _id, ...rest } = row;
      await news
        .insert(hmMakalelerTable)
        .values(row)
        .onConflictDoUpdate({
          target: hmMakalelerTable.id,
          set: rest,
          setWhere: sql`${hmMakalelerTable.siteId} = ${siteId}`,
        });
    },
  };
}

/** Ayna kapalıysa (NEWS_DATABASE_URL yok / yazma modu main) null döner; hiçbir sorgu çalıştırmaz. */
export async function mirrorHmSiteSourceRowsToNewsDb(
  siteId: number,
  deps: HmSourceMirrorDeps | null = defaultDeps(),
): Promise<HmSourceMirrorStats | null> {
  if (!deps || !deps.enabled()) return null;
  const stats: HmSourceMirrorStats = {
    authorsMirrored: 0,
    makalelerMirrored: 0,
    makalelerUnchanged: 0,
    errors: [],
  };

  // Önce yazarlar: hm_makaleler.author_id FK'sı haber DB'sinde de karşılık bulsun.
  for (const author of await deps.readSiteAuthors(siteId)) {
    try {
      await deps.upsertAuthor(author, siteId);
      stats.authorsMirrored += 1;
    } catch (err) {
      stats.errors.push(`author#${author.id} (site ${siteId}): ${errText(err)}`);
    }
  }

  const existing = new Map<number, number>();
  for (const row of await deps.readMirroredMakaleStamps(siteId)) {
    existing.set(row.id, stamp(row.updatedAt));
  }

  for (const row of await deps.readSiteMakaleler(siteId)) {
    const prev = existing.get(row.id);
    if (prev !== undefined && prev >= stamp(row.updatedAt)) {
      stats.makalelerUnchanged += 1;
      continue;
    }
    try {
      await deps.upsertMakale(row, siteId);
      stats.makalelerMirrored += 1;
    } catch (err) {
      stats.errors.push(`makale#${row.id} (site ${siteId}): ${errText(err)}`);
    }
  }

  return stats;
}
