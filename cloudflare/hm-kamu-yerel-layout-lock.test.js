import assert from "node:assert/strict";
import test from "node:test";
import {
  isKamuYerelHmSlug,
  KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS,
  repairKamuYerelLayoutAfterMerge,
  stripKamuYerelLockedLayoutIncoming,
} from "./hm-kamu-yerel-layout-lock.js";

test("stripKamuYerelLockedLayoutIncoming removes nav and colors from editor patch", () => {
  const inc = stripKamuYerelLockedLayoutIncoming("turkatahaber", {
    hmPrimaryColor: "#000",
    hmSecondaryColor: "#111",
    hmNavOnlyCategorySlugs: ["gundem", "spor"],
  });
  assert.equal(inc.hmPrimaryColor, undefined);
  assert.equal(inc.hmSecondaryColor, undefined);
  assert.equal(inc.hmNavOnlyCategorySlugs, undefined);
});

test("repairKamuYerelLayoutAfterMerge fixes yerel logo and merges tepe into page allowlist", () => {
  const out = repairKamuYerelLayoutAfterMerge("yerelnet", {
    logoUrl: null,
    hmNavOnlyCategorySlugs: ["yerel", "ankara", "gundem", "ekonomi"],
  });
  assert.equal(out.logoUrl, "/yerel/yerel-logo.png");
  assert.equal(out.faviconUrl, "/yerel/yerel-logo.png");
  for (const slug of KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS) {
    assert.ok(out.hmNavOnlyCategorySlugs.includes(slug), `missing tepe slug ${slug}`);
  }
  assert.ok(out.hmNavOnlyCategorySlugs.includes("ankara"));
});

test("repairKamuYerelLayoutAfterMerge keeps fuller page allowlist with bolge-*", () => {
  const allow = [...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS, "bolge-marmara", "ankara"];
  const out = repairKamuYerelLayoutAfterMerge("turkatahaber", {
    logoUrl: "/turkata/turkata-logo.webp",
    faviconUrl: "/turkata/favicon.ico",
    hmNavOnlyCategorySlugs: allow,
  });
  assert.deepEqual(out.hmNavOnlyCategorySlugs, allow);
});

test("isKamuYerelHmSlug", () => {
  assert.equal(isKamuYerelHmSlug("turkatahaber"), true);
  assert.equal(isKamuYerelHmSlug("asg"), false);
});

test("repairKamuYerelLayoutAfterMerge rewrites turkata-mark on yerel", () => {
  const out = repairKamuYerelLayoutAfterMerge("yerelnet", {
    logoUrl: "/turkata/turkata-mark.png",
    faviconUrl: "/turkata/turkata-mark.png",
    hmNavOnlyCategorySlugs: [...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS],
  });
  assert.equal(out.logoUrl, "/yerel/yerel-logo.png");
  assert.equal(out.faviconUrl, "/yerel/yerel-logo.png");
});
