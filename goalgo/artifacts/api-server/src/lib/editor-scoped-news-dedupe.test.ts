import { describe, expect, it } from "vitest";
import { dedupeEditorScopedDbNewsItems } from "./editor-scoped-news-dedupe.js";

const EDITOR_SITE_ID = 7;

describe("dedupeEditorScopedDbNewsItems", () => {
  it("keeps site pool copy over central pool row with same title", () => {
    const portal = {
      id: 9001,
      siteId: null,
      title: "Ankara'da trafik düzenlemesi",
      slug: "ankara-trafik-duzenlemesi",
    };
    const siteCopy = {
      id: 501,
      siteId: EDITOR_SITE_ID,
      title: "Ankara'da trafik düzenlemesi",
      slug: "ankara-trafik-duzenlemesi-site",
      rssSourceUrl: "yekpare-hm-pool:3:9001",
    };
    const out = dedupeEditorScopedDbNewsItems([portal, siteCopy], EDITOR_SITE_ID);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(501);
  });

  it("prefers editor manual over pool copy and portal duplicate", () => {
    const portal = { id: 100, siteId: null, title: "Belediye açıklaması", slug: "belediye" };
    const siteCopy = {
      id: 101,
      siteId: EDITOR_SITE_ID,
      title: "Belediye açıklaması",
      rssSourceUrl: "yekpare-hm-pool:1:100",
    };
    const manual = {
      id: 102,
      siteId: EDITOR_SITE_ID,
      title: "Belediye açıklaması",
      isEditorManual: true,
      slug: "belediye-manuel",
    };
    const out = dedupeEditorScopedDbNewsItems([portal, siteCopy, manual], EDITOR_SITE_ID);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(102);
  });

  it("dedupes duplicate site rows by normalized title", () => {
    const a = { id: 1, siteId: EDITOR_SITE_ID, title: "  Aynı Haber  ", slug: "haber-a" };
    const b = { id: 2, siteId: EDITOR_SITE_ID, title: "aynı haber", slug: "haber-b" };
    const out = dedupeEditorScopedDbNewsItems([a, b], EDITOR_SITE_ID);
    expect(out).toHaveLength(1);
  });
});
