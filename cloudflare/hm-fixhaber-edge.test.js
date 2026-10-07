import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXHABER_DOMAIN,
  FIXHABER_SLUG,
  buildFixHaberLayoutJson,
  ensureFixHaberBrandMetaOnSql,
  isFixHaberHost,
} from "./hm-fixhaber-edge.js";

describe("hm-fixhaber-edge catalog", () => {
  it("layout enables PHP Yenişafak theme", () => {
    const layout = buildFixHaberLayoutJson();
    assert.equal(layout.phpTheme, true);
    assert.equal(layout.frontend, "php");
    assert.equal(layout.hmVitrinTheme, "yenisafak");
    assert.equal(layout.hmYsSlogan, "Fix Haber");
    assert.equal(layout.logoUrl, "/fix/fix-haber-logo.png");
    assert.equal(layout.faviconUrl, "/fix/fix-haber-favicon.png");
    assert.doesNotMatch(String(layout.logoUrl), /^data:/);
  });

  it("detects fix.tc host", () => {
    assert.equal(isFixHaberHost("fix.tc"), true);
    assert.equal(isFixHaberHost("www.fix.tc"), true);
    assert.equal(isFixHaberHost("turkatahaber.com"), false);
  });
});

describe("ensureFixHaberBrandMetaOnSql", () => {
  it("creates site row when missing", async () => {
    const state = { sites: [], editors: [], categories: [], news: [], campaigns: [] };
    async function sql(strings, ...values) {
      const text = strings.join(" ");
      if (/SELECT id, slug, domain/i.test(text) && text.includes("hm_news_sites")) {
        if (text.includes("domain")) {
          const host = values.find((v) => v === FIXHABER_DOMAIN);
          if (host) {
            const row = state.sites.find(
              (s) =>
                s.domain === FIXHABER_DOMAIN ||
                s.domain2 === FIXHABER_DOMAIN ||
                s.domain3 === FIXHABER_DOMAIN,
            );
            return row ? [{ ...row }] : [];
          }
        }
        if (text.includes("slug")) {
          const row = state.sites.find((s) => s.slug === FIXHABER_SLUG);
          return row ? [{ ...row }] : [];
        }
        if (text.includes("WHERE id =")) {
          const id = values[values.length - 1];
          const row = state.sites.find((s) => s.id === id);
          return row ? [{ ...row }] : [];
        }
        return state.sites.map((s) => ({ ...s }));
      }
      if (/INSERT INTO hm_news_sites/i.test(text)) {
        const id = state.sites.length + 1;
        const row = {
          id,
          slug: FIXHABER_SLUG,
          domain: FIXHABER_DOMAIN,
          domain2: null,
          domain3: null,
          display_name: "Fix Haber",
          description: "Fix Haber — Türkiye gündemini Türkçe aktaran dijital haber sitesi.",
          contact_json: "{}",
          layout_json: JSON.stringify(buildFixHaberLayoutJson()),
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        };
        state.sites.push(row);
        return [{ ...row }];
      }
      if (/ALTER TABLE hm_site_editors/i.test(text)) return [];
      if (/SELECT id FROM hm_site_editors/i.test(text)) return [];
      if (/INSERT INTO hm_site_editors/i.test(text)) {
        state.editors.push({ id: state.editors.length + 1 });
        return [];
      }
      if (/SELECT id FROM categories/i.test(text)) return [];
      if (/INSERT INTO categories/i.test(text)) {
        state.categories.push({ id: state.categories.length + 1 });
        return [{ id: state.categories.length }];
      }
      if (/SELECT id FROM news/i.test(text)) return [];
      if (/INSERT INTO news/i.test(text)) {
        state.news.push({ id: state.news.length + 1 });
        return [];
      }
      if (/SELECT id, name, tags/i.test(text)) return [];
      if (/INSERT INTO rss_campaigns/i.test(text)) {
        state.campaigns.push({ id: 1 });
        return [{ id: 1 }];
      }
      if (/UPDATE hm_news_sites/i.test(text)) return [];
      return [];
    }

    const out = await ensureFixHaberBrandMetaOnSql(sql);
    assert.ok(out?.meta?.id);
    assert.equal(out.meta.slug, FIXHABER_SLUG);
    assert.equal(out.meta.domain, FIXHABER_DOMAIN);
    assert.equal(out.meta.displayName, "Fix Haber");
    assert.equal(out.meta.layout?.phpTheme, true);
  });
});
