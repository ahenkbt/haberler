import { describe, expect, it } from "vitest";
import { findHmExtraPageBySlug } from "./hmExtraPageLookup";
import type { HmExtraPage } from "./newsSiteLayout";

function page(partial: Partial<HmExtraPage> & { slug: string; title: string }): HmExtraPage {
  return {
    id: partial.id ?? partial.slug,
    slug: partial.slug,
    title: partial.title,
    bodyHtml: partial.bodyHtml ?? "<p>x</p>",
    enabled: partial.enabled ?? true,
  };
}

describe("findHmExtraPageBySlug", () => {
  it("returns exact slug when present", () => {
    const pages = [
      page({ slug: "seviye-1-trafik-guvenligi-uzmani-uygulayici", title: "Seviye 1" }),
      page({ slug: "seviye-1-trafik-guvenligi-uzmani-uygulayici-2", title: "Seviye 1 copy" }),
    ];
    expect(findHmExtraPageBySlug(pages, "seviye-1-trafik-guvenligi-uzmani-uygulayici")?.title).toBe("Seviye 1");
  });

  it("falls back to lowest numbered WordPress duplicate", () => {
    const pages = [
      page({ slug: "seviye-1-trafik-guvenligi-uzmani-uygulayici-3", title: "N3" }),
      page({ slug: "seviye-1-trafik-guvenligi-uzmani-uygulayici-2", title: "N2" }),
      page({ slug: "tgu-nedir", title: "TGU" }),
    ];
    expect(findHmExtraPageBySlug(pages, "seviye-1-trafik-guvenligi-uzmani-uygulayici")?.title).toBe("N2");
    expect(findHmExtraPageBySlug(pages, "tgu-nedir")?.title).toBe("TGU");
  });

  it("resolves numbered request to canonical after restore prune", () => {
    const pages = [page({ slug: "seviye-1-trafik-guvenligi-uzmani-uygulayici", title: "Canonical" })];
    expect(findHmExtraPageBySlug(pages, "seviye-1-trafik-guvenligi-uzmani-uygulayici-2")?.title).toBe("Canonical");
  });

  it("ignores disabled duplicates", () => {
    const pages = [
      page({ slug: "tgu-nedir-2", title: "Off", enabled: false }),
      page({ slug: "tgu-nedir-3", title: "On" }),
    ];
    expect(findHmExtraPageBySlug(pages, "tgu-nedir")?.title).toBe("On");
  });
});