import assert from "node:assert/strict";
import test from "node:test";
import { shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import {
  edgeMirrorNewsDbWrite,
  edgeUpsertHmMakale,
  edgeUpsertNews,
  isReadonlyDbError,
} from "./hm-php-news-dual-write.js";

function memorySql(state) {
  const sql = async (strings, ...values) => {
    const text = strings.join("?");
    if (/FROM hm_makaleler/i.test(text) && /author_id IS NOT DISTINCT/i.test(text) && /SELECT id/i.test(text)) {
      const [siteId, slug, authorId] = values;
      const hit = state.makaleler.find(
        (m) =>
          Number(m.site_id) === Number(siteId) &&
          String(m.slug).toLowerCase() === String(slug).toLowerCase() &&
          (m.author_id ?? null) === (authorId ?? null),
      );
      return hit ? [{ id: hit.id }] : [];
    }
    if (/FROM hm_makaleler/i.test(text) && /WHERE id =/i.test(text) && /SELECT id, site_id/i.test(text)) {
      const [id] = values;
      const hit = state.makaleler.find((m) => Number(m.id) === Number(id));
      return hit ? [{ id: hit.id, site_id: hit.site_id }] : [];
    }
    if (/UPDATE hm_makaleler/i.test(text)) {
      const id = values[values.length - 1];
      const row = state.makaleler.find((m) => Number(m.id) === Number(id));
      if (row) row.title = values[0];
      return [];
    }
    if (/INSERT INTO hm_makaleler/i.test(text) && /RETURNING id/i.test(text)) {
      const [siteId, authorId, title, slug] = values;
      const row = { id: state.nextId++, site_id: siteId, author_id: authorId, title, slug };
      state.makaleler.push(row);
      return [{ id: row.id }];
    }
    if (/INSERT INTO hm_makaleler/i.test(text)) {
      const [id, siteId, authorId, title, slug] = values;
      state.makaleler.push({ id, site_id: siteId, author_id: authorId, title, slug });
      return [];
    }
    if (/FROM hm_news_sites/i.test(text) && /lower\(slug\)/i.test(text)) {
      const [slug] = values;
      const hit = (state.sites || []).find((s) => s.slug === String(slug).toLowerCase());
      return hit ? [{ id: hit.id }] : slug === "asg" ? [{ id: 3 }] : [];
    }
    if (/FROM categories/i.test(text) && /gundem/i.test(text)) {
      return [{ id: 1 }];
    }
    if (/FROM categories/i.test(text) && /lower\(slug\)/i.test(text)) {
      const [slug] = values;
      const hit = state.categories.find((c) => c.slug === String(slug).toLowerCase());
      return hit ? [{ id: hit.id }] : [];
    }
    if (/FROM categories/i.test(text) && /WHERE id/i.test(text)) {
      const [id] = values;
      const hit = state.categories.find((c) => Number(c.id) === Number(id));
      return hit ? [{ id: hit.id }] : [];
    }
    if (/FROM news/i.test(text) && /SELECT id FROM news/i.test(text) && /site_id/i.test(text) && /slug/i.test(text)) {
      const [siteId, slug] = values;
      const hit = state.news.find(
        (n) => Number(n.site_id) === Number(siteId) && String(n.slug).toLowerCase() === String(slug).toLowerCase(),
      );
      return hit ? [{ id: hit.id }] : [];
    }
    if (/FROM news/i.test(text) && /SELECT id, site_id/i.test(text)) {
      const [id] = values;
      const hit = state.news.find((n) => Number(n.id) === Number(id));
      return hit ? [{ id: hit.id, site_id: hit.site_id }] : [];
    }
    if (/INSERT INTO news/i.test(text) && /RETURNING id/i.test(text)) {
      const title = values[0];
      const slug = values[1];
      const siteId = values.find((v) => v === 3) ?? 3;
      const row = { id: state.nextId++, site_id: 3, title, slug };
      state.news.push(row);
      return [{ id: row.id }];
    }
    if (/INSERT INTO news/i.test(text)) {
      const [id, title, slug] = values;
      state.news.push({ id, site_id: 3, title, slug });
      return [];
    }
    if (/UPDATE news/i.test(text)) return [];
    if (/DELETE FROM/i.test(text)) return [];
    return [];
  };
  return sql;
}

test("NEWS_DB_WRITE=main kenar dual-write kapalı; boş mod dual sayılır", () => {
  assert.equal(shouldEdgeDualWriteNewsDb({ NEWS_DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/db" }), true);
  assert.equal(
    shouldEdgeDualWriteNewsDb({ NEWS_DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/db", NEWS_DB_WRITE: "dual" }),
    true,
  );
  assert.equal(
    shouldEdgeDualWriteNewsDb({ NEWS_DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/db", NEWS_DB_WRITE: "main" }),
    false,
  );
  assert.equal(shouldEdgeDualWriteNewsDb({}), false);
});

test("makale: aynı slug+yazar güncellenir; PK çakışınca yeni id", async () => {
  const state = {
    nextId: 90000,
    makaleler: [{ id: 36143, site_id: 3, author_id: 526, slug: "temiz-siyaset-ve-temiz-toplum", title: "eski" }],
    news: [],
    categories: [{ id: 1, slug: "gundem" }],
  };
  const sql = memorySql(state);
  const same = await edgeUpsertHmMakale(sql, {
    id: 35921,
    site_id: 3,
    author_id: 526,
    slug: "temiz-siyaset-ve-temiz-toplum",
    title: "Temiz Siyaset ve Temiz Toplum",
    status: "published",
  });
  assert.equal(same.mirrored, true);
  assert.equal(same.via, "slug");
  assert.equal(same.id, 36143);

  state.makaleler.push({ id: 35915, site_id: 2, author_id: 1, slug: "other", title: "x" });
  const clash = await edgeUpsertHmMakale(sql, {
    id: 35915,
    site_id: 3,
    author_id: 555,
    slug: "sessizlik-te-bir-iletisimdir",
    title: "SESSİZLİK TE BİR İLETİŞİMDİR.",
    status: "published",
  });
  assert.equal(clash.mirrored, true);
  assert.equal(clash.via, "new-id");
  assert.equal(clash.id, 90000);
});

test("haber: PHP'de yoksa aynı id ile yazar", async () => {
  const state = { nextId: 1, makaleler: [], news: [], categories: [{ id: 1, slug: "gundem" }] };
  const sql = memorySql(state);
  const r = await edgeUpsertNews(sql, {
    id: 580081,
    siteId: 3,
    slug: "emeklilerden-ekonomik-sorunlara-dikkat-cekildi",
    title: "Emeklilerden Ekonomik Sorunlara Dikkat Çekildi",
    categorySlug: "gundem",
    status: "published",
    isEditorManual: true,
  });
  assert.equal(r.mirrored, true);
  assert.equal(r.via, "same-id");
  assert.equal(r.id, 580081);
  assert.equal(r.site_id, 3);
});

test("isReadonlyDbError Postgres RO mesajlarını tanır", () => {
  assert.equal(isReadonlyDbError(new Error("cannot execute INSERT in a read-only transaction")), true);
  assert.equal(isReadonlyDbError(new Error("cannot execute UPDATE in a read-only transaction")), true);
  assert.equal(isReadonlyDbError(new Error("unique violation")), false);
});

test("dual-write read-only INSERT hatası panel'e fırlatılmaz", async () => {
  const sql = async () => {
    throw new Error("cannot execute INSERT in a read-only transaction");
  };
  sql.query = sql;
  const r = await edgeMirrorNewsDbWrite(sql, "news", "upsert", {
    id: 582114,
    site_id: 3,
    slug: "sehit-polis",
    title: "ŞEHİT POLİS",
    status: "published",
  });
  assert.equal(r.mirrored, false);
  assert.equal(r.readonly, true);
  assert.equal(r.reason, "news-db-read-only");
});

test("haber: ASG site_id=3 kalır; tepe manşet is_site_manset ile açılır", async () => {
  const state = { nextId: 1, makaleler: [], news: [], categories: [{ id: 15, slug: "ankara" }] };
  const sql = memorySql(state);
  const r = await edgeUpsertNews(sql, {
    id: 582114,
    site_id: 3,
    site_slug: "asg",
    slug: "sehit-polis-memuru-ahmet-turkoglu-dualarla-ugurlaniyor-pursaklar-da-kanli-saldiri",
    title: "ŞEHİT POLİS MEMURU AHMET TÜRKOĞLU",
    category_slug: "ankara",
    status: "published",
    is_featured: true,
    is_site_manset: true,
    is_editor_manual: true,
    site_only: true,
  });
  assert.equal(r.mirrored, true);
  assert.equal(r.via, "same-id");
  assert.equal(r.id, 582114);
  assert.equal(r.site_id, 3);
  assert.equal(state.news[0].site_id, 3);
});

test("NEWS_DATABASE_URL varken kenar dual-write Container'a gitmez", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ mirrored: false, reason: "should-not-run" }), { status: 200 });
  };
  const state = { nextId: 1, makaleler: [], news: [], categories: [] };
  try {
    const r = await edgeMirrorNewsDbWrite(memorySql(state), "hm_makaleler", "upsert", {
      id: 12,
      site_id: 3,
      author_id: 526,
      slug: "kanit",
      title: "Kanıt",
      status: "published",
    });
    assert.equal(r.mirrored, true);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
