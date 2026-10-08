import assert from "node:assert/strict";
import test from "node:test";
import { matchBrandBinding } from "./hm-brand-db-ensure.js";
import { IL81, ensureIl81SiteOnSql, il81ForHost, isIl81Layout } from "./hm-il81-edge.js";

test("il81: hosts, bindings, no Ankara/İstanbul/Kırşehir in phase 1", () => {
  assert.equal(IL81.length, 20);
  assert.equal(il81ForHost("izmir.fix.tc")?.displayName, "İzmir Gündemi");
  assert.equal(il81ForHost("www.sanliurfa.fix.tc")?.il, "Şanlıurfa");
  assert.equal(il81ForHost("ankara.fix.tc"), null);
  assert.equal(il81ForHost("istanbul.fix.tc"), null);
  assert.equal(il81ForHost("kirsehirhaber.org"), null);
  assert.equal(matchBrandBinding({ domain: "izmir.fix.tc" })?.slug, "izmir");
  assert.equal(matchBrandBinding({ domain: "world.fix.tc" })?.slug, "world");
  assert.equal(matchBrandBinding({ domain: "gundemi.org" })?.displayName, "Gündem İstanbul");
});

test("il81 layouts: own cats only, Tanıtım + 81 İl menu, no AI authors, kunye email <il>@fix.tc", () => {
  for (const s of IL81) {
    const l = s.layout;
    assert.ok(isIl81Layout(l));
    assert.ok(isIl81Layout(JSON.stringify(l)));
    assert.equal(l.hmIl81.slug, s.slug);
    assert.equal(l.hmSiteKind, "news");
    assert.deepEqual(l.hmNewsRssSources, [0]);
    assert.ok(l.hmNewsRssCategoryOnly.every((c) => c.startsWith(`${s.slug}-`)));
    const hrefs = l.hmCorporateMenuItems.map((m) => m.href);
    assert.ok(hrefs.includes("/tanitim"));
    assert.ok(hrefs.includes("/iller"));
    assert.ok(hrefs.includes("/kategori/ozel-haber"));
    assert.equal(l.hmYsKunye.email, `${s.slug}@fix.tc`);
    assert.equal(s.editorEmail, `${s.slug}@fix.tc`);
    assert.equal(l.hmYsKunye.yayin, s.displayName.replace(/i/g, "İ").toUpperCase());
  }
  assert.equal(IL81.find((s) => s.slug === "izmir").layout.hmYsKunye.yayin, "İZMİR GÜNDEMİ");
});

test("il81 ensure: existing row untouched, missing row inserted once", async () => {
  const site = IL81[0];
  const seen = [];
  const existing = async (strings) => { seen.push(strings.join("?")); return [{ id: 7, slug: site.slug }]; };
  const r1 = await ensureIl81SiteOnSql(existing, site);
  assert.equal(r1.action, "il81_lookup");
  assert.equal(seen.length, 1);
  const calls = [];
  const empty = async (strings, ...vals) => { calls.push([strings.join("?"), vals]); return /INSERT/.test(strings.join("")) ? [{ id: 99, slug: site.slug }] : []; };
  const r2 = await ensureIl81SiteOnSql(empty, site);
  assert.equal(r2.action, "il81_created");
  assert.equal(calls.length, 2);
  assert.ok(calls[1][1].includes("izmir.fix.tc"));
});
