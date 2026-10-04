import { describe, expect, it } from "vitest";
import { hmShortHaberRedirectPath, shouldSkipSiteGeolocationWarmup } from "./hmSitePublicPath";

describe("hmShortHaberRedirectPath", () => {
  it("sends the portal /haberler/haber alias to the article", () => {
    expect(hmShortHaberRedirectPath("haberler", "ornek-slug")).toBe("/haber/ornek-slug");
  });

  it("keeps a real site slug on the short haber path", () => {
    expect(hmShortHaberRedirectPath("asg", "ornek-slug")).toBe("/tr/asg/haber/ornek-slug");
  });

  it("rejects reserved segments", () => {
    expect(hmShortHaberRedirectPath("haber", "ornek-slug")).toBeNull();
    expect(hmShortHaberRedirectPath("", "ornek-slug")).toBeNull();
  });
});

describe("shouldSkipSiteGeolocationWarmup", () => {
  it("does not ask for location on turkata or known news hosts", () => {
    expect(shouldSkipSiteGeolocationWarmup("/", "turkatahaber.com")).toBe(true);
    expect(shouldSkipSiteGeolocationWarmup("/", "www.turkatahaber.com")).toBe(true);
    expect(shouldSkipSiteGeolocationWarmup("/", "kirsehirhaber.org")).toBe(true);
    expect(shouldSkipSiteGeolocationWarmup("/haberler", "ahenk.net.tr")).toBe(true);
  });

  it("still allows the prompt on an unrelated host home", () => {
    expect(shouldSkipSiteGeolocationWarmup("/", "example.test")).toBe(false);
  });
});
