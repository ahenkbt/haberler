import { afterEach, describe, expect, it, vi } from "vitest";
import { hmPublicHref } from "./hmPublicLinks";

describe("hmPublicHref — portal /tr/{slug} prefix", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps /tr/{slug} on ahenk.net.tr portal (does not strip to site root)", () => {
    vi.stubGlobal("window", {
      location: { hostname: "ahenk.net.tr" },
    });
    const href = hmPublicHref("/trafik-guvenligi-bas-denetcisi", {
      domain: "trafikdernegi.com",
      domain2: "tgd.tc",
      slug: "trafik",
      siteId: 11,
    });
    expect(href).toBe("/tr/trafik/trafik-guvenligi-bas-denetcisi");
  });

  it("prefixes home and nested paths under /tr/{slug} on portal", () => {
    vi.stubGlobal("window", {
      location: { hostname: "www.ahenk.net.tr" },
    });
    expect(
      hmPublicHref("/", {
        domain: "trafikdernegi.com",
        slug: "trafik",
        siteId: 11,
      }),
    ).toBe("/tr/trafik");
    expect(
      hmPublicHref("/seviye-1-trafik-guvenligi-uzmani-uygulayici", {
        domain: "trafikdernegi.com",
        slug: "trafik",
        siteId: 11,
      }),
    ).toBe("/tr/trafik/seviye-1-trafik-guvenligi-uzmani-uygulayici");
  });

  it("keeps short paths on the site custom domain (no /tr/{slug})", () => {
    vi.stubGlobal("window", {
      location: { hostname: "trafikdernegi.com" },
    });
    expect(
      hmPublicHref("/tgu-nedir", {
        domain: "trafikdernegi.com",
        slug: "trafik",
        siteId: 11,
      }),
    ).toBe("/tgu-nedir");
  });
});
