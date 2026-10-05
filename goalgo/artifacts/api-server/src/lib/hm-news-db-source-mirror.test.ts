import { describe, expect, it } from "vitest";
import { mirrorHmSiteSourceRowsToNewsDb, type HmSourceMirrorDeps } from "./hm-news-db-source-mirror.js";

type Author = Parameters<HmSourceMirrorDeps["upsertAuthor"]>[0];
type Makale = Parameters<HmSourceMirrorDeps["upsertMakale"]>[0];

function author(id: number, name: string, hmSiteId = 3): Author {
  return {
    id,
    name,
    title: null,
    avatarUrl: null,
    bio: null,
    hmSiteId,
    hmSortOrder: null,
    email: null,
    passwordHash: null,
    pwResetToken: null,
    pwResetExpiresAt: null,
  };
}

function makale(id: number, slug: string, updatedAt: string, authorId: number | null = 526): Makale {
  return {
    id,
    siteId: 3,
    authorId,
    title: slug,
    slug,
    spot: null,
    content: null,
    imageUrl: null,
    status: "published",
    views: 0,
    externalKey: null,
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
  };
}

function fakeDeps(opts: {
  enabled?: boolean;
  authors?: Author[];
  makaleler?: Makale[];
  mirrored?: Array<{ id: number; updatedAt: Date | null }>;
  failMakaleIds?: number[];
}) {
  const upsertedAuthors: number[] = [];
  const upsertedMakaleler: number[] = [];
  let reads = 0;
  const deps: HmSourceMirrorDeps = {
    enabled: () => opts.enabled ?? true,
    readSiteAuthors: async () => {
      reads += 1;
      return opts.authors ?? [];
    },
    readSiteMakaleler: async () => {
      reads += 1;
      return opts.makaleler ?? [];
    },
    readMirroredMakaleStamps: async () => {
      reads += 1;
      return opts.mirrored ?? [];
    },
    upsertAuthor: async (row) => {
      upsertedAuthors.push(row.id);
    },
    upsertMakale: async (row) => {
      if (opts.failMakaleIds?.includes(row.id)) {
        throw new Error('duplicate key value violates unique constraint "hm_makaleler_site_id_slug_key"');
      }
      upsertedMakaleler.push(row.id);
    },
  };
  return { deps, upsertedAuthors, upsertedMakaleler, reads: () => reads };
}

describe("mirrorHmSiteSourceRowsToNewsDb", () => {
  it("ayna kapalıyken hiçbir sorgu çalıştırmaz ve null döner", async () => {
    const f = fakeDeps({ enabled: false, authors: [author(526, "HÜSEYİN AKIN")] });
    expect(await mirrorHmSiteSourceRowsToNewsDb(3, f.deps)).toBeNull();
    expect(f.reads()).toBe(0);
    expect(f.upsertedAuthors).toEqual([]);
  });

  it("site yazarlarını ve haber DB'sinde eksik/eski makaleleri kopyalar, güncel olanları atlar", async () => {
    const f = fakeDeps({
      authors: [author(526, "HÜSEYİN AKIN"), author(552, "ESMA KARAKAN")],
      makaleler: [
        makale(35899, "sevgiye-ve-sevgiliye-24-saat-yetmez", "2026-08-08T05:12:43.748Z"),
        makale(35913, "kadinlar-kendi-islerinin-basina-geciyor", "2026-09-13T10:00:00.000Z", 552),
        makale(35921, "temiz-siyaset-ve-temiz-toplum", "2026-10-05T16:16:06.870Z"),
      ],
      mirrored: [
        { id: 35899, updatedAt: new Date("2026-08-08T05:12:43.748Z") },
        { id: 35913, updatedAt: new Date("2026-09-13T09:00:00.000Z") },
      ],
    });
    const stats = await mirrorHmSiteSourceRowsToNewsDb(3, f.deps);
    expect(f.upsertedAuthors).toEqual([526, 552]);
    expect(f.upsertedMakaleler).toEqual([35913, 35921]);
    expect(stats).toEqual({
      authorsMirrored: 2,
      makalelerMirrored: 2,
      makalelerUnchanged: 1,
      errors: [],
    });
  });

  it("tek satır hatası (slug çakışması) diğer satırları durdurmaz, hata listede kalır", async () => {
    const f = fakeDeps({
      makaleler: [
        makale(35913, "ayni-slug", "2026-09-13T10:00:00.000Z"),
        makale(35921, "temiz-siyaset-ve-temiz-toplum", "2026-10-05T16:16:06.870Z"),
      ],
      failMakaleIds: [35913],
    });
    const stats = await mirrorHmSiteSourceRowsToNewsDb(3, f.deps);
    expect(f.upsertedMakaleler).toEqual([35921]);
    expect(stats?.makalelerMirrored).toBe(1);
    expect(stats?.errors).toHaveLength(1);
    expect(stats?.errors[0]).toMatch(/makale#35913 .*hm_makaleler_site_id_slug_key/);
  });
});
