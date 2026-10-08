import { describe, expect, it } from "vitest";
import {
  SOSYALHIZMETLER_DOMAIN,
  SOSYALHIZMETLER_INTRO,
  SOSYALHIZMETLER_NAV_HIDDEN_CATEGORY_SLUGS,
  SOSYALHIZMETLER_NAV_ONLY_CATEGORY_SLUGS,
  SOSYALHIZMETLER_SLUG,
  buildSosyalHizmetlerLayoutJson,
  findSosyalHizmetlerSite,
  isSosyalHizmetlerHost,
  listSosyalHizmetlerCategorySlugs,
  listSosyalHizmetlerDomains,
} from "./hm-sosyalhizmetler-site.js";

describe("sosyalhizmetler catalog", () => {
  it("slug and domain", () => {
    expect(SOSYALHIZMETLER_SLUG).toBe("sosyalhizmetler");
    expect(SOSYALHIZMETLER_DOMAIN).toBe("sosyalhizmetler.tr");
    expect(listSosyalHizmetlerDomains()).toEqual(["sosyalhizmetler.tr", "www.sosyalhizmetler.tr"]);
  });

  it("layout json php theme + categories", () => {
    const layout = buildSosyalHizmetlerLayoutJson();
    expect(layout.phpTheme).toBe(true);
    expect(layout.frontend).toBe("php");
    expect(layout.hmVitrinTheme).toBe("yenisafak");
    expect(layout.logoUrl).toBe("/sh/sosyal-hizmetler-logo.png");
    expect(String(layout.hmFooterAboutHtml)).toContain(SOSYALHIZMETLER_INTRO.slice(0, 40));
    const navOnly = layout.hmNavOnlyCategorySlugs as string[];
    expect(navOnly.every((s) => s.startsWith("sh-"))).toBe(true);
    expect(navOnly).toEqual([...SOSYALHIZMETLER_NAV_ONLY_CATEGORY_SLUGS]);
    const hidden = layout.hmNavHiddenCategorySlugs as string[];
    expect(hidden).toEqual([...SOSYALHIZMETLER_NAV_HIDDEN_CATEGORY_SLUGS]);
  });

  it("category slugs unique", () => {
    const slugs = listSosyalHizmetlerCategorySlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of SOSYALHIZMETLER_NAV_ONLY_CATEGORY_SLUGS) {
      expect(slugs).toContain(s);
    }
  });

  it("host and lookup helpers", () => {
    expect(findSosyalHizmetlerSite("sosyalhizmetler")?.domain).toBe("sosyalhizmetler.tr");
    expect(findSosyalHizmetlerSite("sosyalhizmetler.tr")?.slug).toBe("sosyalhizmetler");
    expect(findSosyalHizmetlerSite("www.sosyalhizmetler.tr")?.slug).toBe("sosyalhizmetler");
    expect(findSosyalHizmetlerSite("marmara.gundemi.org")).toBeUndefined();
    expect(isSosyalHizmetlerHost("sosyalhizmetler.tr")).toBe(true);
    expect(isSosyalHizmetlerHost("www.sosyalhizmetler.tr")).toBe(true);
    expect(isSosyalHizmetlerHost("marmara.gundemi.org")).toBe(false);
  });
});
