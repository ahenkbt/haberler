import assert from "node:assert/strict";
import test from "node:test";
import {
  isKamuYerelHmSlug,
  KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS,
  repairKamuYerelLayoutAfterMerge,
  stripKamuYerelLockedLayoutIncoming,
} from "./hm-kamu-yerel-layout-lock.js";

test("stripKamuYerelLockedLayoutIncoming removes nav from editor patch", () => {
  const inc = stripKamuYerelLockedLayoutIncoming("turkatahaber", {
    hmPrimaryColor: "#000",
    hmNavOnlyCategorySlugs: ["gundem", "spor"],
  });
  assert.equal(inc.hmPrimaryColor, "#000");
  assert.equal(inc.hmNavOnlyCategorySlugs, undefined);
});

test("repairKamuYerelLayoutAfterMerge fixes yerel logo and generic nav", () => {
  const out = repairKamuYerelLayoutAfterMerge("yerelnet", {
    logoUrl: null,
    hmNavOnlyCategorySlugs: ["yerel", "ankara", "gundem", "ekonomi"],
  });
  assert.equal(out.logoUrl, "/brand/turkata/turkata-mark.png");
  assert.deepEqual(out.hmNavOnlyCategorySlugs, [...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS]);
});

test("isKamuYerelHmSlug", () => {
  assert.equal(isKamuYerelHmSlug("turkatahaber"), true);
  assert.equal(isKamuYerelHmSlug("asg"), false);
});
