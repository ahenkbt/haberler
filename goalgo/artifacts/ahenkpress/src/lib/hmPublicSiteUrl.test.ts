import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hmPublicAuthorHref,
  hmPublicAuthorsHref,
  hmPublicCategoryHref,
  hmPublicHomeHref,
  hmPublicNewsHref,
  hmPublicPathHref,
  hmPublicPortalSiteBase,
  hmPublicSiteOrigin,
} from "./hmPublicSiteUrl";

const asg = { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", domain2: null, domain3: null };
const portalOnly = { id: 9, slug: "deneme", domain: null };
/** Panel portalda (`ahenk.net.tr/editor`) açıkken. */
const onPortal = { pageHost: "ahenk.net.tr", pageOrigin: "https://ahenk.net.tr" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hmPublicSiteUrl — özel alan adı kökü", () => {
  it("returns https origin from the primary domain", () => {
    expect(hmPublicSiteOrigin(asg, onPortal)).toBe("https://ankarasehirgazetesi.com");
    expect(hmPublicSiteOrigin({ slug: "x", domain: "https://www.ornek.com/" }, onPortal)).toBe(
      "https://www.ornek.com",
    );
  });

  it("returns null without a custom domain or site", () => {
    expect(hmPublicSiteOrigin(portalOnly, onPortal)).toBeNull();
    expect(hmPublicSiteOrigin({ slug: "x", domain: "   " }, onPortal)).toBeNull();
    expect(hmPublicSiteOrigin(null, onPortal)).toBeNull();
  });

  it("uses the page origin when the panel already runs on the site's domain", () => {
    expect(
      hmPublicSiteOrigin(asg, { pageHost: "www.ankarasehirgazetesi.com", pageOrigin: "https://www.ankarasehirgazetesi.com" }),
    ).toBe("https://www.ankarasehirgazetesi.com");
  });

  it("prefers the secondary domain the visitor is on", () => {
    const site = { slug: "kh", domain: "kirsehirhaber.org", domain2: "kirsehri.com" };
    expect(hmPublicSiteOrigin(site, { pageHost: "kirsehri.com", pageOrigin: "https://kirsehri.com" })).toBe(
      "https://kirsehri.com",
    );
    expect(hmPublicSiteOrigin(site, onPortal)).toBe("https://kirsehirhaber.org");
  });

  it("reads window.location when no page host is given", () => {
    vi.stubGlobal("window", {
      location: { hostname: "ankarasehirgazetesi.com", origin: "https://ankarasehirgazetesi.com" },
    });
    expect(hmPublicSiteOrigin(asg)).toBe("https://ankarasehirgazetesi.com");
    expect(hmPublicHomeHref(asg)).toBe("https://ankarasehirgazetesi.com/");
  });
});

describe("hmPublicSiteUrl — PHP tema yol şekilleri", () => {
  it("builds full-page public links on the custom domain", () => {
    expect(hmPublicHomeHref(asg, onPortal)).toBe("https://ankarasehirgazetesi.com/");
    expect(hmPublicNewsHref(asg, "ornek-haber", onPortal)).toBe("https://ankarasehirgazetesi.com/haber/ornek-haber");
    expect(hmPublicNewsHref(asg, 1234, onPortal)).toBe("https://ankarasehirgazetesi.com/haber/1234");
    expect(hmPublicCategoryHref(asg, "gundem", onPortal)).toBe("https://ankarasehirgazetesi.com/kategori/gundem");
    expect(hmPublicAuthorsHref(asg, onPortal)).toBe("https://ankarasehirgazetesi.com/yazarlar");
    expect(hmPublicAuthorHref(asg, 536, onPortal)).toBe("https://ankarasehirgazetesi.com/yazar/a536");
    expect(hmPublicAuthorHref(asg, "536", onPortal)).toBe("https://ankarasehirgazetesi.com/yazar/a536");
    expect(hmPublicAuthorHref(asg, "a536", onPortal)).toBe("https://ankarasehirgazetesi.com/yazar/a536");
    expect(hmPublicPathHref(asg, "/video-tv", onPortal)).toBe("https://ankarasehirgazetesi.com/video-tv");
    expect(hmPublicPathHref(asg, "sayfa/kunye", onPortal)).toBe("https://ankarasehirgazetesi.com/sayfa/kunye");
    expect(hmPublicPathHref(asg, "/", onPortal)).toBe("https://ankarasehirgazetesi.com/");
  });

  it("encodes slugs", () => {
    expect(hmPublicNewsHref(asg, "çok özel/haber", onPortal)).toBe(
      "https://ankarasehirgazetesi.com/haber/%C3%A7ok%20%C3%B6zel%2Fhaber",
    );
  });
});

describe("hmPublicSiteUrl — özel alan yoksa portal yedeği", () => {
  it("falls back to an absolute https://ahenk.net.tr/tr/{slug} URL (full navigation)", () => {
    expect(hmPublicPortalSiteBase(portalOnly)).toBe("https://ahenk.net.tr/tr/deneme");
    expect(hmPublicHomeHref(portalOnly, onPortal)).toBe("https://ahenk.net.tr/tr/deneme");
    expect(hmPublicNewsHref(portalOnly, "ornek", onPortal)).toBe("https://ahenk.net.tr/tr/deneme/haber/ornek");
    expect(hmPublicCategoryHref(portalOnly, "spor", onPortal)).toBe("https://ahenk.net.tr/tr/deneme/kategori/spor");
    expect(hmPublicAuthorsHref(portalOnly, onPortal)).toBe("https://ahenk.net.tr/tr/deneme/yazarlar");
    expect(hmPublicPathHref(portalOnly, "/foto-galeri", onPortal)).toBe("https://ahenk.net.tr/tr/deneme/foto-galeri");
  });

  it("keeps the numeric author key the SPA route expects", () => {
    expect(hmPublicAuthorHref(portalOnly, 536, onPortal)).toBe("https://ahenk.net.tr/tr/deneme/yazar/536");
  });

  it("falls back to the portal root when the site is unknown", () => {
    expect(hmPublicHomeHref(null, onPortal)).toBe("https://ahenk.net.tr");
    expect(hmPublicHomeHref({ slug: "" }, onPortal)).toBe("https://ahenk.net.tr");
  });

  it("never returns a relative path (no client-side routing)", () => {
    for (const href of [
      hmPublicHomeHref(asg, onPortal),
      hmPublicHomeHref(portalOnly, onPortal),
      hmPublicNewsHref(portalOnly, "x", onPortal),
      hmPublicAuthorHref(asg, 1, onPortal),
    ]) {
      expect(href.startsWith("https://")).toBe(true);
    }
  });
});
