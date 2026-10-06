import { afterEach, describe, expect, it, vi } from "vitest";
import { hmAuthorPanelHref, isHmAuthorPanelPath } from "./hmAuthorPanelPath";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hmAuthorPanelHref", () => {
  it("uses short same-origin paths on PHP-theme news hosts", () => {
    expect(hmAuthorPanelHref("yesilvatan", "giris", "yesilvatan.gen.tr")).toBe("/yazar/giris");
    expect(hmAuthorPanelHref("asg", "haberler", "ankarasehirgazetesi.com")).toBe("/yazar/haberler");
    expect(hmAuthorPanelHref("asg", "haber/yeni", "www.ankarasehirgazetesi.com")).toBe("/yazar/haber/yeni");
    expect(hmAuthorPanelHref("turkatahaber", "sifre", "turkatahaber.com")).toBe("/yazar/sifre");
  });

  it("keeps /tr/{slug}/yazar/... on the portal hub", () => {
    expect(hmAuthorPanelHref("asg", "giris", "ahenk.net.tr")).toBe("/tr/asg/yazar/giris");
    expect(hmAuthorPanelHref("yesilvatan", "haberler", "www.ahenk.net.tr")).toBe(
      "/tr/yesilvatan/yazar/haberler",
    );
  });

  it("reads window.location when pageHost is omitted", () => {
    vi.stubGlobal("window", { location: { hostname: "yerel.net.tr" } });
    expect(hmAuthorPanelHref("yerelnet", "giris")).toBe("/yazar/giris");
  });
});

describe("isHmAuthorPanelPath", () => {
  it("matches login and writer panel, not public author pages", () => {
    expect(isHmAuthorPanelPath("/yazar/giris")).toBe(true);
    expect(isHmAuthorPanelPath("/tr/asg/yazar/haberler")).toBe(true);
    expect(isHmAuthorPanelPath("/yazar/haber/yeni")).toBe(true);
    expect(isHmAuthorPanelPath("/yazar/a526")).toBe(false);
    expect(isHmAuthorPanelPath("/yazarlar")).toBe(false);
  });
});
