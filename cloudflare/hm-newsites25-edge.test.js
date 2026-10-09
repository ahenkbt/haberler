import assert from "node:assert/strict";
import test from "node:test";
import { matchBrandBinding } from "./hm-brand-db-ensure.js";
import { NEWSITES25, SEED_CORPORATE_SITES, ensureNewsites25SiteOnSql, newsites25ForHost } from "./hm-newsites25-edge.js";

test("newsites25: hosts + brand bindings", () => {
  assert.equal(newsites25ForHost("memur.gundemi.org")?.slug, "memur");
  assert.equal(newsites25ForHost("www.memur.fix.tc")?.slug, "memur");
  assert.equal(newsites25ForHost("turkdunyasi.fix.tc")?.slug, "turkdunyasi");
  assert.equal(newsites25ForHost("world.fix.tc")?.slug, "world");
  assert.equal(newsites25ForHost("spor.gundemi.org"), null);
  assert.equal(newsites25ForHost("emlak.gundemi.org")?.slug, "emlak");
  assert.equal(newsites25ForHost("harikaolacak.com.tr")?.slug, "harikaolacak");
  assert.equal(matchBrandBinding({ domain: "harikaolacak.com.tr" })?.slug, "harikaolacak");
  assert.equal(newsites25ForHost("www.isdunyasi.gundemi.org")?.slug, "isdunyasi");
  assert.equal(matchBrandBinding({ domain: "emlak.gundemi.org" })?.slug, "emlak");
  assert.equal(matchBrandBinding({ domain: "isdunyasi.gundemi.org" })?.slug, "isdunyasi");
  assert.equal(matchBrandBinding({ domain: "world.fix.tc" })?.slug, "world");
  assert.equal(matchBrandBinding({ domain: "turkdunyasi.gundemi.org" })?.slug, "turkdunyasi");
  assert.equal(matchBrandBinding({ domain: "spor.fix.tc" })?.slug, "spor");
  assert.equal(newsites25ForHost("www.goalgo.com.tr")?.slug, "goalgohaber");
  assert.equal(matchBrandBinding({ domain: "goalgo.com.tr" })?.slug, "goalgohaber");
});

test("corporate seed sites: corporate kind, no RSS, editor + contact opt-in", () => {
  for (const s of SEED_CORPORATE_SITES) {
    assert.equal(s.layout.hmSiteKind, "corporate");
    assert.equal(s.layout.hmCorporateSite, true);
    assert.deepEqual(s.layout.hmNewsRssSources, [0]);
    assert.equal(s.layout.hmConventionEditorEnabled, true);
    assert.equal(s.layout.hmContactFormEnabled, true);
    assert.ok(!s.hosts.some((h) => /goalgo\.org$/.test(h)));
  }
});

test("newsites25 layouts: news kind, concept, no Süper Lig/burç, own rows, world dateline only on world", () => {
  for (const s of NEWSITES25) {
    assert.equal(s.layout.hmSiteKind, "news");
    assert.equal(s.layout.hmConceptSite, true);
    assert.equal(s.layout.hmNewsYsStandingsEnabled, false);
    assert.equal(s.layout.hmNewsYsHoroscopeEnabled, false);
    assert.deepEqual(s.layout.hmNewsRssSources, [0]);
    assert.ok(s.layout.hmNavOnlyCategorySlugs.includes("ozel-haber"));
    assert.equal(Boolean(s.layout.hmWorldDateline), s.slug === "world");
  }
  const world = NEWSITES25.find((s) => s.slug === "world");
  assert.deepEqual(world.hosts, ["world.fix.tc", "dunya.gundemi.org"]);
  assert.deepEqual(world.layout.hmCorporateMenuItems.slice(0, 7).map((m) => m.label),
    ["Avrupa", "Asya", "Orta Doğu", "Afrika", "Kuzey Amerika", "Güney Amerika", "Okyanusya"]);
});

test("ensure: existing row untouched, missing row inserted once", async () => {
  const site = NEWSITES25[0];
  const seen = [];
  const existing = async (strings) => { seen.push(strings.join("?")); return [{ id: 7, slug: site.slug }]; };
  const r1 = await ensureNewsites25SiteOnSql(existing, site);
  assert.equal(r1.action, "newsites25_lookup");
  assert.equal(seen.length, 1);
  assert.ok(!/INSERT/.test(seen[0]));
  let n = 0;
  const empty = async (strings) => { n++; return /INSERT/.test(strings.join("")) ? [{ id: 9, slug: site.slug }] : []; };
  const r2 = await ensureNewsites25SiteOnSql(empty, site);
  assert.equal(r2.action, "newsites25_created");
  assert.equal(r2.row.id, 9);
  assert.equal(n, 2);
});
