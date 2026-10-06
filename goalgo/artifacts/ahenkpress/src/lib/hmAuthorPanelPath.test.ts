import { afterEach, describe, expect, it, vi } from "vitest";
import { hmAuthorPanelHref } from "./hmAuthorPanelPath";

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
