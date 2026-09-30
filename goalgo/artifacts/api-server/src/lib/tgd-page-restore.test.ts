import { describe, expect, it } from "vitest";
import { normalizeTgdPageSlug, needsTgdSliderSeedUpgrade, upsertTgdExtraPages } from "./tgd-page-restore.js";

describe("tgd-page-restore upsert", () => {
  it("normalizes nested slugs to single segment", () => {
    expect(normalizeTgdPageSlug("trafik-yasam/projeler")).toBe("trafik-yasam-projeler");
    expect(normalizeTgdPageSlug("/tgu-nedir/")).toBe("tgu-nedir");
  });

  it("flags stale external CDN and nested slider hrefs for upgrade", () => {
    expect(needsTgdSliderSeedUpgrade([])).toBe(true);
    expect(
      needsTgdSliderSeedUpgrade([
        {
          href: "/trafik-yasam/projeler",
          imageUrl: "https://trthaberstatic.cdn.wp.trt.com.tr/resimler/1.jpg",
        },
      ]),
    ).toBe(true);
    expect(
      needsTgdSliderSeedUpgrade([
        { href: "/hakkimizda", imageUrl: "/tgd/slider/dernek.jpg" },
        { href: "/trafik-guvenligi-uzmani", imageUrl: "/tgd/slider/egitim.jpg" },
      ]),
    ).toBe(false);
  });

  it("rewrites nested menu hrefs to flat canonical paths", async () => {
    const { normalizeTgdMenuHref, rewriteTgdCorporateMenuHrefs } = await import("./tgd-page-restore.js");
    expect(normalizeTgdMenuHref("/trafik-yasam/projeler")).toBe("/trafik-yasam-projeler");
    expect(normalizeTgdMenuHref("/trafik-rehberi")).toBe("/trafik-rehberi");
    expect(normalizeTgdMenuHref("/trafik-yasam/trafik-rehberi")).toBe("/trafik-rehberi");
    const { layout, rewritten } = rewriteTgdCorporateMenuHrefs({
      hmCorporateMenuItems: [
        { id: "a", href: "/trafik-yasam/projeler", label: "Projeler" },
        { id: "b", href: "/tgu-nedir", label: "TGU" },
      ],
    });
    expect(rewritten).toBe(1);
    expect((layout.hmCorporateMenuItems as Array<{ href: string }>)[0]?.href).toBe("/trafik-yasam-projeler");
  });

  it("writes canonical slugs and prunes WP -N duplicates on overwrite", () => {
    const layout = {
      hmExtraPages: [
        {
          id: "wp-template-seviye-1-trafik-guvenligi-uzmani-uygulayici-2",
          slug: "seviye-1-trafik-guvenligi-uzmani-uygulayici-2",
          title: "Seviye 1",
          bodyHtml: "<p>wp</p>",
          enabled: true,
        },
      ],
    };
    const result = upsertTgdExtraPages(
      layout,
      [
        {
          id: "tgd-seviye-1",
          slug: "seviye-1-trafik-guvenligi-uzmani-uygulayici",
          title: "Seviye 1 Uygulayıcı",
          bodyHtml: "<p>tgd</p>",
          enabled: true,
          fullWidth: true,
        },
      ],
      { overwriteBodies: true, pruneNumericDuplicates: true },
    );
    const pages = result.layout.hmExtraPages as Array<{ slug: string; bodyHtml: string }>;
    expect(pages.some((p) => p.slug === "seviye-1-trafik-guvenligi-uzmani-uygulayici")).toBe(true);
    expect(pages.some((p) => p.slug.endsWith("-2"))).toBe(false);
    expect(pages.find((p) => p.slug === "seviye-1-trafik-guvenligi-uzmani-uygulayici")?.bodyHtml).toBe(
      "<p>tgd</p>",
    );
    expect(result.upserted).toBe(1);
    expect(result.pruned).toBe(1);
  });
});
