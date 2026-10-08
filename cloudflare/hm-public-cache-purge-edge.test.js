import assert from "node:assert/strict";
import test from "node:test";
import { buildHmSitePublicCacheUrls } from "./hm-public-cache-purge-edge.js";

test("buildHmSitePublicCacheUrls anasayfa ve meta uçlarını içerir", () => {
  const env = { PORTAL_ORIGIN: "https://ahenk.net.tr" };
  const urls = buildHmSitePublicCacheUrls(env, {
    siteId: 3,
    slug: "asg",
    domain: "ankarasehirgazetesi.com",
  });
  assert.ok(urls.some((u) => u === "https://ankarasehirgazetesi.com/"));
  assert.ok(urls.some((u) => u.includes("/api/hm/meta/by-slug/asg")));
  assert.ok(urls.some((u) => u.includes("home-bundle?siteId=3")));
});
