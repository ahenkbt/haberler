import test from "node:test";
import assert from "node:assert/strict";
import { buildFeedQuery, isHmEditorSiteOverridesPath, rssSourcesFromLayout } from "./hm-editor-site-overrides-edge.js";

test("paths", () => {
  assert.equal(isHmEditorSiteOverridesPath("/api/hm/editor/site-feed"), true);
  assert.equal(isHmEditorSiteOverridesPath("/api/hm/editor/site-categories/state/"), true);
  assert.equal(isHmEditorSiteOverridesPath("/api/hm/editor/me"), false);
});

test("rss pools follow App::rssSharedFor", () => {
  assert.deepEqual(rssSourcesFromLayout(null), [230]);
  assert.deepEqual(rssSourcesFromLayout('{"hmNewsRssSources":[]}'), []);
  assert.deepEqual(rssSourcesFromLayout({ hmNewsRssSources: ["230", 0, 7] }), [230, 7]);
});

test("feed query is parameterised and scoped to the site", () => {
  const { text, params } = buildFeedQuery(42, [230], {
    q: "x'; drop", cat: "gundem", from: "2026-10-01", to: "", state: "pasif", kind: "all", limit: 50, offset: 0,
  });
  assert.equal(params[0], 42);
  assert.ok(params.includes("%x'; drop%"));
  assert.ok(!text.includes("drop"));
  assert.match(text, /hm_site_content_hidden/);
  assert.match(text, /hm_site_category_overrides/);
  assert.match(text, /WHERE h\.site_id IS NOT NULL OR co\.active = false/);
  const rssOnly = buildFeedQuery(42, [], { q: "", cat: "", from: "", to: "", state: "all", kind: "rss", limit: 5, offset: 0 });
  assert.ok(!rssOnly.text.includes("FROM news n"));
  assert.match(rssOnly.text, /interval '14 days'/);
});
