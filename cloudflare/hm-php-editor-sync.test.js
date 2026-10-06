import assert from "node:assert/strict";
import test from "node:test";
import {
  loadPhpSiteAuthors,
  loadPhpSiteCategories,
  resolvePhpSiteId,
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

test("Worker site id 1090 PHP slug ile 236 olur", async () => {
  const php = {
    categories: [{ id: 11, name: "Çevre", slug: "cevre", color: "#16a34a", exclusive_site_id: 236, sort_order: 1 }],
    authors: [{ id: 583, name: "Nail Türkoğlu", hm_site_id: 236, email: null }],
    sites: [{ id: 236, slug: "yesilvatan", domain: "yesilvatan.gen.tr" }],
    nextId: 100,
  };
  const worker = {
    categories: [],
    authors: [],
    sites: [{ id: 1090, slug: "yesilvatan", domain: "yesilvatan.gen.tr" }],
    nextId: 200,
  };
  function sqlFor(tables) {
    const inner = memorySql(tables);
    const wrapped = async (strings, ...values) => {
      const text = strings.join("?");
      if (/FROM hm_news_sites/i.test(text) && /WHERE id =/i.test(text)) {
        const [id] = values;
        const hit = (tables.sites || []).find((s) => Number(s.id) === Number(id));
        return hit ? [hit] : [];
      }
      if (/FROM hm_news_sites/i.test(text) && /lower\(slug\)/i.test(text)) {
        const [slug] = values;
        const hit = (tables.sites || []).find((s) => String(s.slug).toLowerCase() === String(slug));
        return hit ? [hit] : [];
      }
      return inner(strings, ...values);
    };
    return wrapped;
  }
  const phpId = await resolvePhpSiteId(sqlFor(php), sqlFor(worker), 1090);
  assert.equal(phpId, 236);
  const authors = await loadPhpSiteAuthors(sqlFor(php), 1090, sqlFor(worker));
  assert.equal(authors.length, 1);
  assert.equal(authors[0].name, "Nail Türkoğlu");
});

test("Worker 1087 yerelnet PHP 231 olur; ASG 3 aynı id kalır", async () => {
  const php = {
    categories: [],
    authors: [
      { id: 10, name: "Yerel Yazar", hm_site_id: 231, email: null },
      { id: 20, name: "ASG Yazar", hm_site_id: 3, email: null },
    ],
    sites: [
      { id: 231, slug: "yerelnet", domain: "yerel.net.tr" },
      { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com" },
    ],
    nextId: 100,
  };
  const worker = {
    categories: [],
    authors: [],
    sites: [
      { id: 1087, slug: "yerelnet", domain: "yerel.net.tr" },
      { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com" },
    ],
    nextId: 200,
  };
  function sqlFor(tables) {
    const inner = memorySql(tables);
    return async (strings, ...values) => {
      const text = strings.join("?");
      if (/FROM hm_news_sites/i.test(text) && /WHERE id =/i.test(text)) {
        const hit = (tables.sites || []).find((s) => Number(s.id) === Number(values[0]));
        return hit ? [hit] : [];
      }
      if (/FROM hm_news_sites/i.test(text) && /lower\(slug\)/i.test(text)) {
        const hit = (tables.sites || []).find((s) => String(s.slug).toLowerCase() === String(values[0]));
        return hit ? [hit] : [];
      }
      return inner(strings, ...values);
    };
  }
  assert.equal(await resolvePhpSiteId(sqlFor(php), sqlFor(worker), 1087), 231);
  assert.equal(await resolvePhpSiteId(sqlFor(php), sqlFor(worker), 3), 3);
  const yerel = await loadPhpSiteAuthors(sqlFor(php), 1087, sqlFor(worker));
  assert.equal(yerel[0].name, "Yerel Yazar");
  const asg = await loadPhpSiteAuthors(sqlFor(php), 3, sqlFor(worker));
  assert.equal(asg[0].name, "ASG Yazar");
});

test("Worker id tablosu PHP twilight-pine id'lerine düşer (bitter DB yokken)", async () => {
  const php = {
    categories: [],
    authors: [],
    sites: [
      { id: 1, slug: "vatanhaber", domain: "vatanhaber.net" },
      { id: 2, slug: "su", domain: "suhaber.net" },
      { id: 8, slug: "ahg", domain: "ankarahabergundemi.com" },
      { id: 230, slug: "turkatahaber", domain: "turkatahaber.com" },
      { id: 232, slug: "sehitgazi", domain: "sehitgazi.org.tr" },
      { id: 233, slug: "turksav", domain: "turksav.org" },
      { id: 237, slug: "dunyasaglik", domain: "dunyasaglik.org" },
    ],
    nextId: 100,
  };
  const emptyWorker = { categories: [], authors: [], sites: [], nextId: 1 };
  function sqlFor(tables) {
    return async (strings, ...values) => {
      const text = strings.join("?");
      if (/FROM hm_news_sites/i.test(text) && /WHERE id =/i.test(text)) {
        const hit = (tables.sites || []).find((s) => Number(s.id) === Number(values[0]));
        return hit ? [hit] : [];
      }
      return [];
    };
  }
  const phpSql = sqlFor(php);
  const workerSql = sqlFor(emptyWorker);
  assert.equal(await resolvePhpSiteId(phpSql, workerSql, 1), 1);
  assert.equal(await resolvePhpSiteId(phpSql, workerSql, 2), 2);
  assert.equal(await resolvePhpSiteId(phpSql, workerSql, 8), 8);
  assert.equal(await resolvePhpSiteId(phpSql, workerSql, 1088), 232);
  assert.equal(await resolvePhpSiteId(phpSql, workerSql, 1089), 233);
  assert.equal(await resolvePhpSiteId(phpSql, workerSql, 1091), 237);
  assert.equal(await resolvePhpSiteId(phpSql, workerSql, 1132), 230);
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
