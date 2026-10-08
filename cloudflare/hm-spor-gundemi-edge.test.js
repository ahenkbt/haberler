import assert from "node:assert/strict";
import test from "node:test";
import { matchBrandBinding } from "./hm-brand-db-ensure.js";
import { SPOR_GUNDEMI_LAYOUT, ensureSporGundemiSiteOnSql, isSporGundemiHost } from "./hm-spor-gundemi-edge.js";

test("spor.gundemi.org hosts + brand binding", () => {
  assert.equal(isSporGundemiHost("spor.gundemi.org"), true);
  assert.equal(isSporGundemiHost("www.spor.fix.tc"), true);
  assert.equal(isSporGundemiHost("kibris.gundemi.org"), false);
  assert.equal(matchBrandBinding({ domain: "spor.fix.tc" })?.slug, "spor");
});

test("spor layout: sports concept site (Süper Lig on, burç off, news kind)", () => {
  assert.equal(SPOR_GUNDEMI_LAYOUT.hmSiteKind, "news");
  assert.equal(SPOR_GUNDEMI_LAYOUT.hmConceptSite, true);
  assert.equal(SPOR_GUNDEMI_LAYOUT.hmConceptTopic, "spor");
  assert.equal(SPOR_GUNDEMI_LAYOUT.hmNewsYsStandingsEnabled, true);
  assert.equal(SPOR_GUNDEMI_LAYOUT.hmNewsYsHoroscopeEnabled, false);
  assert.ok(SPOR_GUNDEMI_LAYOUT.hmNewsRssCategoryOnly.includes("engelli-sporlari"));
});

test("ensure: existing row is returned untouched, missing row is inserted once", async () => {
  const seen = [];
  const existing = async (strings) => { seen.push(strings.join("?")); return [{ id: 7, slug: "spor" }]; };
  const r1 = await ensureSporGundemiSiteOnSql(existing);
  assert.equal(r1.action, "spor_lookup");
  assert.equal(seen.length, 1);
  assert.ok(!/INSERT/.test(seen[0]));
  let n = 0;
  const empty = async (strings) => { n++; return /INSERT/.test(strings.join("")) ? [{ id: 9, slug: "spor" }] : []; };
  const r2 = await ensureSporGundemiSiteOnSql(empty);
  assert.equal(r2.action, "spor_created");
  assert.equal(r2.row.id, 9);
  assert.equal(n, 2);
});
