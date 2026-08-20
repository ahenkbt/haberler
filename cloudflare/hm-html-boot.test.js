import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hmDomainSlugFallback,
  shouldInstantHmRootRedirect,
  hmHomeSlugFromPath,
  isHmPublicHomeHtmlPath,
  firstHmBootImageUrl,
  injectHmHtmlBoot,
  withBudget,
} from "./hm-html-boot.js";

describe("hm-html-boot", () => {
  it("maps known editor domains to slugs", () => {
    assert.equal(hmDomainSlugFallback("ankarahabergundemi.com"), "ankarahabergundemi");
    assert.equal(hmDomainSlugFallback("www.vatanhaber.net"), "vatanhaber");
    assert.equal(hmDomainSlugFallback("turk.eco"), "");
  });

  it("redirects known HM roots instantly without waiting for meta", () => {
    assert.equal(shouldInstantHmRootRedirect("GET", "/", "ankarahabergundemi.com"), true);
    assert.equal(shouldInstantHmRootRedirect("GET", "/tr/ankarahabergundemi", "ankarahabergundemi.com"), false);
    assert.equal(shouldInstantHmRootRedirect("GET", "/", "turk.eco"), false);
    assert.equal(shouldInstantHmRootRedirect("POST", "/", "vatanhaber.net"), false);
  });

  it("reads /tr/{slug} and domain fallback for HTML boot", () => {
    assert.equal(hmHomeSlugFromPath("/tr/vatanhaber", "vatanhaber.net"), "vatanhaber");
    assert.equal(hmHomeSlugFromPath("/", "ankarahabergundemi.com"), "ankarahabergundemi");
    assert.equal(isHmPublicHomeHtmlPath("/tr/asg", "ankarasehirgazetesi.com"), true);
  });

  it("injects bundle JSON after charset so the early IIFE can read it", () => {
    const html =
      '<html><head><meta charset="UTF-8" /><script>window.__EARLY__=1</script></head><body></body></html>';
    const out = injectHmHtmlBoot(html, {
      siteId: 8,
      slug: "ankarahabergundemi",
      bundle: { siteId: 8, featured: [{ title: "<img>" }] },
    });
    assert.match(out, /__YEKPARE_HM_HOME_BUNDLE__/);
    assert.match(out, /\\u003cimg>/);
    assert.ok(out.indexOf("<img>") === -1);
    assert.ok(out.indexOf("__YEKPARE_HM_HOME_BUNDLE__") < out.indexOf("__EARLY__"));
  });

  it("picks first http(s) cover for preload", () => {
    assert.equal(
      firstHmBootImageUrl({
        featured: [{ imageUrl: "https://cdn.example/a.jpg" }],
      }),
      "https://cdn.example/a.jpg",
    );
    assert.equal(
      firstHmBootImageUrl({ featured: [{ imageUrl: "/api/media/uploads/x.jpg" }] }, "https://site.test"),
      "https://site.test/api/media/uploads/x.jpg",
    );
  });

  it("withBudget returns null when the promise is slower than the budget", async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 50));
    assert.equal(await withBudget(slow, 5), null);
    assert.equal(await withBudget(Promise.resolve("ok"), 50), "ok");
  });
});
