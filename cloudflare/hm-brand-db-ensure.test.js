import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KH_AUTHORS_CLEAR_REV,
  KH_CANONICAL_SITE_ID,
  ensureKhBrandMetaOnSql,
  pickKhCanonicalSite,
} from "./hm-brand-db-ensure.js";

const VIDEO_REV = "kh-video-menu-user-20260802a";
const SANITIZE_REV = "hm-layout-sanitize-20260727a";

function layout(extra = {}) {
  return JSON.stringify({
    hmNewsAuthorsEnabled: true,
    hmNewsHorizontalAuthorsEnabled: true,
    hmNewsSidebarAuthorsEnabled: true,
    hmNewsHomeModuleOrder: ["hero", "authorsStrip", "latestGrid"],
    hmKhVideoMenuRev: VIDEO_REV,
    hmLayoutSanitizeRev: SANITIZE_REV,
    ...extra,
  });
}

function site(id, extra = {}) {
  return {
    id,
    slug: "kirsehirhaber",
    domain: null,
    domain2: null,
    domain3: null,
    display_name: "KIRŞEHİR HABER PORTALI",
    description: null,
    contact_json: null,
    layout_json: layout(),
    active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

function createDb(seed) {
  const state = {
    sites: seed.sites.map((row) => ({ ...row })),
    authors: (seed.authors || []).map((row) => ({ ...row })),
    makaleler: (seed.makaleler || []).map((row) => ({ ...row })),
    authorDeletes: 0,
    makaleDeletes: 0,
    inserts: 0,
  };

  async function sql(strings, ...values) {
    const text = strings.join(" ");
    if (/^\s*select/i.test(text) && text.includes("hm_news_sites")) {
      return state.sites.map((row) => ({ ...row }));
    }
    if (text.includes("UPDATE hm_news_sites") && text.includes("layout_json")) {
      const json = values.find((value) => typeof value === "string" && value.trim().startsWith("{"));
      const id = values[values.length - 1];
      const row = state.sites.find((item) => Number(item.id) === Number(id));
      if (row && json) row.layout_json = json;
      return [];
    }
    if (text.includes("active = false") && text.includes("id::text")) {
      const keepId = values[values.length - 1];
      for (const row of state.sites) {
        if (Number(row.id) === Number(keepId)) continue;
        const slug = String(row.slug || "")
          .trim()
          .toLowerCase()
          .replace(/^\/+|\/+$/g, "");
        if (slug === "kirsehirhaber" || slug === "kh" || slug === "kirsehir") {
          row.active = false;
          row.slug = `kirsehirhaber-retired-${row.id}`;
          row.domain = null;
          row.domain2 = null;
          row.domain3 = null;
        }
      }
      return [];
    }
    if (text.includes("UPDATE hm_news_sites") && text.includes("slug")) {
      const id = values[values.length - 1];
      const row = state.sites.find((item) => Number(item.id) === Number(id));
      if (row) {
        row.slug = values[0];
        row.domain = values[1];
        row.domain2 = values[2];
        row.domain3 = values[3];
        row.active = true;
      }
      return [];
    }
    if (text.includes("INSERT INTO hm_news_sites")) {
      state.inserts += 1;
      const id = 9000 + state.inserts;
      const row = site(id, { domain: "kirsehirhaber.org" });
      state.sites.push(row);
      return [{ ...row }];
    }
    if (text.includes("FROM authors") && /^\s*select/i.test(text)) {
      const siteId = values[0];
      return state.authors
        .filter((row) => Number(row.hm_site_id) === Number(siteId))
        .map((row) => ({ id: row.id }));
    }
    if (text.includes("DELETE FROM hm_makaleler")) {
      const [siteId, authorId] = values;
      const before = state.makaleler.length;
      state.makaleler = state.makaleler.filter(
        (row) => !(Number(row.site_id) === Number(siteId) && Number(row.author_id) === Number(authorId)),
      );
      state.makaleDeletes += before - state.makaleler.length;
      return [];
    }
    if (text.includes("UPDATE news SET author_id")) return [];
    if (text.includes("DELETE FROM authors")) {
      const [authorId, siteId] = values;
      const before = state.authors.length;
      state.authors = state.authors.filter(
        (row) => !(Number(row.id) === Number(authorId) && Number(row.hm_site_id) === Number(siteId)),
      );
      const deleted = before - state.authors.length;
      state.authorDeletes += deleted;
      return deleted ? [{ id: authorId }] : [];
    }
    return [];
  }

  return { sql, state };
}

describe("pickKhCanonicalSite", () => {
  it("keeps LiveBridge id 944 when that row is active and leaves 1077 in place", () => {
    assert.equal(KH_CANONICAL_SITE_ID, 944);
    const picked = pickKhCanonicalSite([
      site(1077, { domain: null }),
      site(944, { domain: null }),
    ]);
    assert.equal(picked.row.id, 944);
    assert.deepEqual(picked.retiredIds, [1077]);
  });

  it("does not pin 944 when that row is a different site", () => {
    const picked = pickKhCanonicalSite([
      site(944, { slug: "tr", active: true }),
      site(1121, { slug: "kirsehirhaber", active: true }),
    ]);
    assert.equal(picked.row.id, 1121);
  });

  it("does not resurrect an inactive 944 over the active row the site is serving", () => {
    const picked = pickKhCanonicalSite([
      site(944, { active: false }),
      site(1085, { active: true }),
    ]);
    assert.equal(picked.row.id, 1085);
    assert.deepEqual(picked.retiredIds, [944]);
  });
});

describe("KH by-domain meta author clear", () => {
  it("clears authors once when the rev is missing, then keeps a later author and column", async () => {
    const db = createDb({
      sites: [site(1085)],
      authors: [{ id: 11, hm_site_id: 1085, name: "Eski Yazar" }],
      makaleler: [{ id: 70, site_id: 1085, author_id: 11, title: "Eski köşe" }],
    });

    const first = await ensureKhBrandMetaOnSql(db.sql);
    assert.equal(first.action, "kh_canonical");
    assert.equal(first.meta.id, 1085);
    assert.equal(first.meta.domain, "kirsehirhaber.org");
    assert.equal(first.meta.layout.hmKhAuthorsClearRev, KH_AUTHORS_CLEAR_REV);
    assert.equal(first.meta.layout.hmNewsAuthorsEnabled, true);
    assert.equal(first.meta.layout.hmNewsHorizontalAuthorsEnabled, true);
    assert.equal(first.meta.layout.hmNewsSidebarAuthorsEnabled, true);
    assert.ok(first.meta.layout.hmNewsHomeModuleOrder.includes("authorsStrip"));
    assert.equal(db.state.authors.length, 0);
    assert.equal(db.state.makaleler.length, 0);
    assert.equal(db.state.authorDeletes, 1);
    assert.equal(db.state.makaleDeletes, 1);
    assert.equal(db.state.inserts, 0);

    db.state.authors.push({ id: 42, hm_site_id: 1085, name: "KH PANEL YENI YAZAR TEST" });
    db.state.makaleler.push({ id: 99, site_id: 1085, author_id: 42, title: "Yeni köşe" });

    const second = await ensureKhBrandMetaOnSql(db.sql);
    const third = await ensureKhBrandMetaOnSql(db.sql);

    assert.equal(second.meta.id, 1085);
    assert.equal(third.meta.id, 1085);
    assert.equal(db.state.sites.length, 1);
    assert.equal(db.state.inserts, 0);
    assert.equal(db.state.authorDeletes, 1);
    assert.equal(db.state.makaleDeletes, 1);
    assert.deepEqual(
      db.state.authors.map((row) => row.name),
      ["KH PANEL YENI YAZAR TEST"],
    );
    assert.deepEqual(
      db.state.makaleler.map((row) => row.id),
      [99],
    );
    assert.equal(third.meta.layout.hmNewsAuthorsEnabled, true);
  });

  it("binds kirsehirhaber.org onto 944 and does not create or delete 1077", async () => {
    const db = createDb({
      sites: [
        site(944, { layout_json: layout({ hmKhAuthorsClearRev: KH_AUTHORS_CLEAR_REV }) }),
        site(1077, { layout_json: layout({ hmKhAuthorsClearRev: KH_AUTHORS_CLEAR_REV }) }),
      ],
      authors: [{ id: 5, hm_site_id: 944, name: "Panel yazarı" }],
      makaleler: [{ id: 8, site_id: 944, author_id: 5, title: "Köşe" }],
    });

    const first = await ensureKhBrandMetaOnSql(db.sql);
    const second = await ensureKhBrandMetaOnSql(db.sql);

    assert.equal(first.meta.id, 944);
    assert.equal(second.meta.id, 944);
    assert.equal(first.meta.domain, "kirsehirhaber.org");
    assert.equal(db.state.sites.length, 2);
    assert.equal(db.state.inserts, 0);
    assert.equal(db.state.authorDeletes, 0);
    assert.equal(db.state.makaleDeletes, 0);
    const other = db.state.sites.find((row) => row.id === 1077);
    assert.ok(other);
    assert.equal(other.active, false);
    assert.equal(other.slug, "kirsehirhaber-retired-1077");
    assert.equal(other.domain, null);
    assert.equal(db.state.authors.length, 1);
    assert.equal(db.state.makaleler.length, 1);
  });

  it("does not insert when several KH rows already exist, and keeps one id", async () => {
    const db = createDb({
      sites: [
        site(1121, { layout_json: layout({ hmKhAuthorsClearRev: KH_AUTHORS_CLEAR_REV }) }),
        site(1118, { layout_json: layout({ hmKhAuthorsClearRev: KH_AUTHORS_CLEAR_REV }) }),
      ],
    });
    const ids = [];
    for (let i = 0; i < 3; i += 1) {
      const result = await ensureKhBrandMetaOnSql(db.sql);
      ids.push(result.meta.id);
      assert.equal(result.meta.domain, "kirsehirhaber.org");
    }
    assert.deepEqual(ids, [1118, 1118, 1118]);
    assert.equal(db.state.inserts, 0);
    assert.equal(db.state.sites.length, 2);
    const extra = db.state.sites.find((row) => row.id === 1121);
    assert.equal(extra.active, false);
    assert.equal(extra.slug, "kirsehirhaber-retired-1121");
  });
});
