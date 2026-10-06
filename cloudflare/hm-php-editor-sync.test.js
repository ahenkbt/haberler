import assert from "node:assert/strict";
import test from "node:test";
import {
  loadPhpSiteCategories,
  syncPhpAuthorsToWorker,
  syncPhpCategoriesToWorker,
} from "./hm-php-editor-sync.js";

function memorySql(tables) {
  const sql = async (strings, ...values) => {
    const text = strings.join("?");
    if (/FROM categories/i.test(text) && /exclusive_site_id =/i.test(text) && /SELECT id, name, slug/i.test(text) && values.length === 1) {
      const [siteId] = values;
      const rows = tables.categories.filter((c) => Number(c.exclusive_site_id) === Number(siteId));
      return rows;
    }
    if (/INSERT INTO categories/i.test(text) && /RETURNING id/i.test(text)) {
      const [name, slug, color, exclusive, sort] = values;
      const row = { id: tables.nextId++, name, slug, color, exclusive_site_id: exclusive, sort_order: sort };
      tables.categories.push(row);
      return [row];
    }
    if (/FROM categories/i.test(text) && /lower\(slug\)/i.test(text)) {
      const [slug] = values;
      const hit = tables.categories.find((c) => String(c.slug).toLowerCase() === String(slug).toLowerCase());
      return hit ? [hit] : [];
    }
    if (/FROM authors/i.test(text) && /hm_site_id =/i.test(text) && /SELECT id, name/i.test(text)) {
      const [siteId] = values;
      return tables.authors.filter((a) => Number(a.hm_site_id) === Number(siteId));
    }
    if (/FROM authors/i.test(text) && /lower\(email\)/i.test(text)) {
      const [siteId, email] = values;
      const hit = tables.authors.find(
        (a) => Number(a.hm_site_id) === Number(siteId) && String(a.email || "").toLowerCase() === String(email),
      );
      return hit ? [{ id: hit.id }] : [];
    }
    if (/FROM authors/i.test(text) && /WHERE id =/i.test(text)) {
      const [id] = values;
      const hit = tables.authors.find((a) => Number(a.id) === Number(id));
      return hit ? [{ id: hit.id, hm_site_id: hit.hm_site_id }] : [];
    }
    if (/UPDATE authors/i.test(text)) return [];
    if (/INSERT INTO authors/i.test(text) && /VALUES \(\?/i.test(text) && values[0] && typeof values[0] === "number") {
      const [id, name] = values;
      tables.authors.push({ id, name, hm_site_id: values[5] ?? values[4], email: values[6] ?? values[7] ?? null });
      return [];
    }
    if (/INSERT INTO authors/i.test(text)) {
      const name = values[0];
      tables.authors.push({ id: tables.nextId++, name, hm_site_id: values[4], email: values[6] ?? null });
      return [];
    }
    return [];
  };
  return sql;
}

test("PHP exclusive kategoriler Yekpare listesine düşmez", async () => {
  const php = {
    categories: [
      { id: 11, name: "Çevre", slug: "cevre", color: "#16a34a", exclusive_site_id: 9, sort_order: 1 },
      { id: 12, name: "Orman", slug: "orman", color: "#166534", exclusive_site_id: 9, sort_order: 2 },
      { id: 1, name: "Dünya", slug: "dunya", color: "#2563eb", exclusive_site_id: null, sort_order: 0 },
    ],
    authors: [],
    nextId: 100,
  };
  const rows = await loadPhpSiteCategories(memorySql(php), 9);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.slug),
    ["cevre", "orman"],
  );
});

test("PHP kategorileri Worker'a kopyalanır", async () => {
  const php = {
    categories: [{ id: 11, name: "Çevre", slug: "cevre", color: "#16a34a", exclusive_site_id: 9, sort_order: 1 }],
    authors: [],
    nextId: 100,
  };
  const worker = { categories: [], authors: [], nextId: 200 };
  const out = await syncPhpCategoriesToWorker(memorySql(worker), memorySql(php), 9);
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, "cevre");
  assert.equal(worker.categories.length, 1);
});

test("PHP yazarları Worker listesine eklenir", async () => {
  const php = {
    categories: [],
    authors: [{ id: 564, name: "Yeşil Kalem", hm_site_id: 9, email: "yazar@yesilvatan.gen.tr", password_hash: "x" }],
    nextId: 100,
  };
  const worker = { categories: [], authors: [], nextId: 200 };
  const n = await syncPhpAuthorsToWorker(memorySql(worker), memorySql(php), 9);
  assert.equal(n, 1);
  assert.equal(worker.authors.length, 1);
  assert.equal(worker.authors[0].name, "Yeşil Kalem");
});
