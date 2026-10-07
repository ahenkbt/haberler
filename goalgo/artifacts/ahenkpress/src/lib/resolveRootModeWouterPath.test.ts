import { afterEach, describe, expect, it, vi } from "vitest";
import { hmPublicHref } from "@/lib/hmPublicLinks";
import { isTurkataPublicPath } from "@/lib/turkataHaber";
import { resolveRootModeWouterPath, usesPortalHybridNewsDetail } from "@/lib/resolveRootModeWouterPath";

const DETAIL_PATHS = [
  "/haber/kamu-denetim-ornek",
  "/makale/kose-yazi-ornek",
  "/kategori/gundem",
  "/yazar/17",
  "/yazarlar",
  "/video",
  "/video/kanal/3",
  "/kunye",
  "/ozel-sayfa",
  "/trafik-yasam/projeler",
] as const;

describe("resolveRootModeWouterPath", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps every HM detail kind onto /tr/{slug} for root-mode editor domains", () => {
    for (const path of DETAIL_PATHS) {
      expect(resolveRootModeWouterPath("ankarasehirgazetesi.com", path)).toBe(`/tr/asg${path}`);
      expect(resolveRootModeWouterPath("www.ankarasehirgazetesi.com", path)).toBe(`/tr/asg${path}`);
      expect(resolveRootModeWouterPath("kirsehirhaber.org", path)).toBe(`/tr/kirsehirhaber${path}`);
      expect(resolveRootModeWouterPath("kirsehri.com", path)).toBe(`/tr/kirsehirhaber${path}`);
    }
  });

  it("leaves ahenk.net.tr and turkatahaber.com paths unchanged", () => {
    for (const path of [...DETAIL_PATHS, "/haberler", "/haberler/hakkimizda"]) {
      expect(resolveRootModeWouterPath("ahenk.net.tr", path)).toBe(path);
      expect(resolveRootModeWouterPath("www.ahenk.net.tr", path)).toBe(path);
      expect(resolveRootModeWouterPath("turkatahaber.com", path)).toBe(path);
      expect(resolveRootModeWouterPath("www.turkatahaber.com", path)).toBe(path);
    }
  });

  it("maps gundemi.org (dedicated HM site) onto /tr/gundemi for detail paths", () => {
    for (const path of DETAIL_PATHS) {
      expect(resolveRootModeWouterPath("gundemi.org", path)).toBe(`/tr/gundemi${path}`);
      expect(resolveRootModeWouterPath("www.gundemi.org", path)).toBe(`/tr/gundemi${path}`);
    }
  });

  it("uses portal hybrid article pages on ahenk and turkata, HM detail on editor domains", () => {
    expect(usesPortalHybridNewsDetail("ahenk.net.tr")).toBe(true);
    expect(usesPortalHybridNewsDetail("turkatahaber.com")).toBe(true);
    expect(usesPortalHybridNewsDetail("www.turkatahaber.com")).toBe(true);
    expect(usesPortalHybridNewsDetail("gundemi.org")).toBe(false);
    expect(usesPortalHybridNewsDetail("ankarasehirgazetesi.com")).toBe(false);
    expect(usesPortalHybridNewsDetail("kirsehirhaber.org")).toBe(false);
  });

  it("keeps turkata author and category URLs public", () => {
    expect(isTurkataPublicPath("/yazar/17")).toBe(true);
    expect(isTurkataPublicPath("/yazarlar")).toBe(true);
    expect(isTurkataPublicPath("/kategori/gundem")).toBe(true);
    expect(isTurkataPublicPath("/haber/ornek-slug")).toBe(true);
    expect(isTurkataPublicPath("/makale/ornek")).toBe(true);
  });

  it("emits root URLs for internal links on a root-mode HM domain", () => {
    vi.stubGlobal("window", {
      location: { hostname: "ankarasehirgazetesi.com" },
    });
    const site = { domain: "ankarasehirgazetesi.com", slug: "asg", siteId: 4 };
    expect(hmPublicHref("/haber/ornek-haber", site)).toBe("/haber/ornek-haber");
    expect(hmPublicHref("/kategori/gundem", site)).toBe("/kategori/gundem");
    expect(hmPublicHref("/yazar/17", site)).toBe("/yazar/17");
    expect(hmPublicHref("/makale/kose", site)).toBe("/makale/kose");
    expect(hmPublicHref("/video", site)).toBe("/video");
    expect(hmPublicHref("/ozel-sayfa", site)).toBe("/ozel-sayfa");
  });

  it("emits root URLs on a known HM host even when the site record has no domain", () => {
    vi.stubGlobal("window", {
      location: { hostname: "kirsehirhaber.org" },
    });
    const site = { domain: null, slug: "kirsehirhaber", siteId: 943 };
    expect(hmPublicHref("/haber/ornek-haber", site)).toBe("/haber/ornek-haber");
    expect(hmPublicHref("/kategori/gundem", site)).toBe("/kategori/gundem");
    expect(hmPublicHref("/yazar/524", site)).toBe("/yazar/524");
    expect(hmPublicHref("/video", site)).toBe("/video");
    expect(hmPublicHref("/kunye", site)).toBe("/kunye");
  });

  it("keeps /tr/{slug} links when the same site is opened on ahenk.net.tr", () => {
    vi.stubGlobal("window", {
      location: { hostname: "ahenk.net.tr" },
    });
    const site = { domain: "ankarasehirgazetesi.com", slug: "asg", siteId: 4 };
    expect(hmPublicHref("/haber/ornek-haber", site)).toBe("/tr/asg/haber/ornek-haber?siteId=4");
    expect(hmPublicHref("/kategori/gundem", site)).toBe("/tr/asg/kategori/gundem?siteId=4");
  });
});
