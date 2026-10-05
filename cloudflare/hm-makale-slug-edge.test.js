import assert from "node:assert/strict";
import test from "node:test";
import { handleAuthorsList, handleCreateMakale } from "./hm-editor-kh-data-edge.js";

/**
 * Neon tagged-template taklidi: sorgu metnine göre bellek içi news / hm_makaleler.
 * (site_id, slug) tekilliği gerçek şemadaki gibi uygulanır.
 */
function fakeSql(state) {
  const sql = async (strings, ...values) => {
    const text = strings.join("?");
    if (/FROM news/i.test(text) && /SELECT id/i.test(text)) {
      const [slug, siteId] = values;
      const hit = state.news.find(
        (n) => n.slug === String(slug).toLowerCase() && (n.site_id == null || Number(n.site_id) === Number(siteId)),
      );
      return hit ? [{ id: hit.id }] : [];
    }
    if (/FROM hm_makaleler/i.test(text) && /SELECT id/i.test(text)) {
      const [siteId, slug, excludeId] = values;
      const hit = state.makaleler.find(
        (m) =>
          Number(m.site_id) === Number(siteId) &&
          m.slug === String(slug).toLowerCase() &&
          (excludeId == null || Number(m.id) !== Number(excludeId)),
      );
      return hit ? [{ id: hit.id }] : [];
    }
    if (/FROM hm_makaleler/i.test(text) && /INTERVAL '10 minutes'/.test(text)) {
      const [siteId, authorId, title] = values;
      const norm = (s) => String(s).trim().replace(/\s+/g, " ").toLowerCase();
      const hit = state.makaleler.find(
        (m) =>
          Number(m.site_id) === Number(siteId) &&
          (m.author_id ?? null) === (authorId ?? null) &&
          norm(m.title) === norm(title) &&
          Date.now() - m.created_at.getTime() < 10 * 60_000,
      );
      return hit ? [{ ...hit }] : [];
    }
    if (/INSERT INTO hm_makaleler/i.test(text)) {
      const [siteId, authorId, title, slug, spot, content, imageUrl, status] = values;
      if (state.makaleler.some((m) => Number(m.site_id) === Number(siteId) && m.slug === slug)) {
        throw new Error('duplicate key value violates unique constraint "hm_makaleler_site_id_slug_key"');
      }
      const row = {
        id: 1000 + state.makaleler.length,
        site_id: siteId,
        author_id: authorId,
        title,
        slug,
        spot,
        content,
        image_url: imageUrl,
        status,
        views: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      state.makaleler.push(row);
      return [{ ...row }];
    }
    if (/FROM authors/i.test(text)) {
      const [siteId] = values;
      return state.authors.filter((a) => Number(a.hm_site_id) === Number(siteId));
    }
    if (/FROM hm_makaleler/i.test(text) && /count\(\*\)/i.test(text)) {
      const [siteId] = values;
      const counts = new Map();
      for (const m of state.makaleler) {
        if (Number(m.site_id) !== Number(siteId) || m.status !== "published" || m.author_id == null) continue;
        counts.set(m.author_id, (counts.get(m.author_id) || 0) + 1);
      }
      return Array.from(counts, ([author_id, c]) => ({ author_id, c }));
    }
    if (/DISTINCT ON \(author_id\)/i.test(text) && /FROM hm_makaleler/i.test(text)) {
      const [siteId] = values;
      const out = new Map();
      for (const m of [...state.makaleler].sort((a, b) => b.created_at - a.created_at)) {
        if (Number(m.site_id) !== Number(siteId) || m.status !== "published" || m.author_id == null) continue;
        if (!out.has(m.author_id)) out.set(m.author_id, { author_id: m.author_id, id: m.id, title: m.title, slug: m.slug });
      }
      return Array.from(out.values());
    }
    if (/DISTINCT ON \(author_id\)/i.test(text) && /FROM news/i.test(text)) {
      const [siteId] = values;
      const out = new Map();
      for (const n of [...state.news].sort((a, b) => b.created_at - a.created_at)) {
        if (Number(n.site_id) !== Number(siteId) || n.status !== "published" || n.author_id == null) continue;
        if (!out.has(n.author_id)) out.set(n.author_id, { author_id: n.author_id, id: n.id, title: n.title, slug: n.slug });
      }
      return Array.from(out.values());
    }
    if (/ALTER TABLE/i.test(text)) return [];
    throw new Error(`fakeSql: beklenmeyen sorgu: ${text.slice(0, 80)}`);
  };
  sql.query = async () => [];
  return sql;
}

function baseState() {
  return {
    news: [
      // 25 Ağustos'ta eklenmiş Gündem haberi — makale ile aynı slug.
      { id: 80298, site_id: 3, slug: "temiz-siyaset-temiz-toplum", status: "published", author_id: null, title: "Temiz Siyaset, Temiz Toplum", created_at: new Date("2026-08-25T10:49:17Z") },
    ],
    makaleler: [],
    authors: [{ id: 526, name: "HÜSEYİN AKIN", title: null, avatar_url: null, bio: null, hm_site_id: 3, hm_sort_order: 3, email: null }],
  };
}

test("makale slug'ı aynı sitedeki news slug'ıyla çakışırsa -2 eklenir", async () => {
  const state = baseState();
  const res = await handleCreateMakale(fakeSql(state), 3, {
    title: "Temiz Siyaset, Temiz Toplum",
    authorId: 526,
    status: "published",
    content: "<p>…</p>",
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.slug, "temiz-siyaset-temiz-toplum-2");
  assert.equal(body.authorId, 526);
  assert.equal(state.makaleler.length, 1);
});

test("aynı site+yazar+başlık 10 dakika içinde tekrar gönderilirse yeni satır açılmaz", async () => {
  const state = baseState();
  const sql = fakeSql(state);
  const first = await handleCreateMakale(sql, 3, { title: "Temiz Siyaset, Temiz Toplum", authorId: 526, status: "published" });
  assert.equal(first.status, 201);
  const firstBody = await first.json();
  const second = await handleCreateMakale(sql, 3, { title: "Temiz  Siyaset, Temiz Toplum ", authorId: 526, status: "published" });
  assert.equal(second.status, 200);
  const secondBody = await second.json();
  assert.equal(secondBody.id, firstBody.id);
  assert.equal(state.makaleler.length, 1);
});

test("farklı yazar aynı başlığı eklerse ayrı satır ve ayrı slug (-3) alır", async () => {
  const state = baseState();
  const sql = fakeSql(state);
  await handleCreateMakale(sql, 3, { title: "Temiz Siyaset, Temiz Toplum", authorId: 526, status: "published" });
  const other = await handleCreateMakale(sql, 3, { title: "Temiz Siyaset, Temiz Toplum", authorId: 527, status: "published" });
  assert.equal(other.status, 201);
  const body = await other.json();
  assert.equal(body.slug, "temiz-siyaset-temiz-toplum-3");
  assert.equal(state.makaleler.length, 2);
});

test("yazar listesi articleCount ve latestArticle (önce makale) döndürür", async () => {
  const state = baseState();
  state.news.push({ id: 90001, site_id: 3, slug: "eski-haber", status: "published", author_id: 526, title: "Eski haber", created_at: new Date("2026-09-01T00:00:00Z") });
  state.makaleler.push({ id: 35920, site_id: 3, author_id: 526, title: "Temiz Siyaset, Temiz Toplum", slug: "temiz-siyaset-temiz-toplum-2", status: "published", created_at: new Date("2026-10-05T14:50:01Z"), updated_at: new Date() });
  const res = await handleAuthorsList(fakeSql(state), 3);
  assert.equal(res.status, 200);
  const [author] = await res.json();
  assert.equal(author.id, 526);
  assert.equal(author.articleCount, 1);
  assert.deepEqual(author.latestArticle, { id: 35920, title: "Temiz Siyaset, Temiz Toplum", slug: "temiz-siyaset-temiz-toplum-2" });
});

test("makalesi olmayan yazar için latestArticle yazara bağlı yayımlı news'ten gelir", async () => {
  const state = baseState();
  state.news.push({ id: 90001, site_id: 3, slug: "eski-haber", status: "published", author_id: 526, title: "Eski haber", created_at: new Date("2026-09-01T00:00:00Z") });
  const res = await handleAuthorsList(fakeSql(state), 3);
  const [author] = await res.json();
  assert.equal(author.articleCount, 0);
  assert.deepEqual(author.latestArticle, { id: 90001, title: "Eski haber", slug: "eski-haber" });
});
