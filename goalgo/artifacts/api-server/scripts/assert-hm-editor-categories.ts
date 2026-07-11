import assert from "node:assert/strict";
import {
  cleanCategoryDisplayName,
  deriveCleanCategorySlug,
  filterHmPublicCategoryRows,
  formatAdminCategoryDisplayName,
  hmEditorCategoriesWhere,
  mapHmEditorCategoryRowForSite,
  parseHiddenCategorySlugsFromLayout,
  resolveHmPublicActiveGlobalSlugs,
} from "../src/lib/hm-editor-categories.ts";

assert.equal(
  cleanCategoryDisplayName("Ankara Şehir Gazetesi · Ankara", "Ankara Şehir Gazetesi", "asg"),
  "Ankara",
);
assert.equal(deriveCleanCategorySlug("asg-ankara", "asg"), "ankara");
assert.equal(deriveCleanCategorySlug("gundem", "asg"), "gundem");

const mapped = mapHmEditorCategoryRowForSite(
  {
    id: 1,
    name: "Vatan Kahramanları Derneği · Faaliyetler",
    slug: "vkd-faaliyetler",
    color: "#000",
    exclusiveSiteId: 2,
    sortOrder: 0,
  },
  "vkd",
  "Vatan Kahramanları Derneği",
);
assert.equal(mapped.name, "Faaliyetler");
assert.equal(mapped.slug, "faaliyetler");

const adminName = formatAdminCategoryDisplayName(
  { name: "Ankara", slug: "asg-ankara", exclusiveSiteId: null },
  new Map([[3, "Ankara Şehir Gazetesi"]]),
  new Map([["asg", "Ankara Şehir Gazetesi"]]),
  ["asg", "vkd"],
);
assert.equal(adminName, "Ankara Şehir Gazetesi · Ankara");

assert.ok(String(hmEditorCategoriesWhere(5, {})).length > 0);

const newsDefaults = resolveHmPublicActiveGlobalSlugs({}, ["gundem", "global", "spor"]);
assert.ok(newsDefaults.has("gundem"));
assert.ok(newsDefaults.has("spor"));
assert.ok(!newsDefaults.has("global"));

const corpEmpty = resolveHmPublicActiveGlobalSlugs({ hmVitrinTheme: "corporate" }, ["gundem", "global"]);
assert.equal(corpEmpty.size, 0);

const corpActive = resolveHmPublicActiveGlobalSlugs(
  { hmVitrinTheme: "corporate", hmActivatedCategorySlugs: ["gundem"] },
  ["gundem", "global"],
);
assert.ok(corpActive.has("gundem"));
assert.ok(!corpActive.has("global"));

const filtered = filterHmPublicCategoryRows(
  [
    { slug: "sehit-gazi", exclusiveSiteId: 5 },
    { slug: "gundem", exclusiveSiteId: null },
    { slug: "global", exclusiveSiteId: null },
  ],
  5,
  "vkd",
  { hmNavHiddenCategorySlugs: ["sehit-gazi"] },
);
assert.deepEqual(
  filtered.map((c) => c.slug),
  ["gundem"],
);

console.log("assert-hm-editor-categories: ok");
