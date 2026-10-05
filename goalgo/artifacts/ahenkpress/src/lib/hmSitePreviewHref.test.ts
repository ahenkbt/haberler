import { describe, expect, it } from "vitest";
import {
  hmSiteAuthorPreviewHref,
  hmSiteNewsPreviewHrefPrefix,
  isAbsolutePreviewHref,
} from "./hmSitePreviewHref";

const asg = { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", domain2: null, domain3: null };
const noDomain = { id: 99, slug: "demo", domain: null };

describe("hmSiteNewsPreviewHrefPrefix", () => {
  it("uses the PHP theme shape on the custom domain", () => {
    expect(hmSiteNewsPreviewHrefPrefix(asg, "ahenk.net.tr")).toBe("https://ankarasehirgazetesi.com/haber");
  });

  it("falls back to /tr/{slug}/haber without a custom domain", () => {
    expect(hmSiteNewsPreviewHrefPrefix(noDomain, "ahenk.net.tr")).toBe("/tr/demo/haber");
    expect(hmSiteNewsPreviewHrefPrefix(null)).toBeNull();
  });
});

describe("hmSiteAuthorPreviewHref", () => {
  it("builds /yazar/a{id} on the custom domain and /tr/{slug}/yazar/{id} otherwise", () => {
    expect(hmSiteAuthorPreviewHref(asg, 526, "ahenk.net.tr")).toBe("https://ankarasehirgazetesi.com/yazar/a526");
    expect(hmSiteAuthorPreviewHref(noDomain, "526", "ahenk.net.tr")).toBe("/tr/demo/yazar/526");
    expect(hmSiteAuthorPreviewHref(asg, "x", "ahenk.net.tr")).toBeNull();
  });
});

describe("isAbsolutePreviewHref", () => {
  it("detects full URLs", () => {
    expect(isAbsolutePreviewHref("https://ankarasehirgazetesi.com/haber")).toBe(true);
    expect(isAbsolutePreviewHref("/tr/asg/haber")).toBe(false);
  });
});
