import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HM_EDGE_FRESH_MS,
  HM_EDGE_STALE_MS,
  hmBootCacheUrls,
  hmEdgeCacheAgeMs,
  hmEdgeCacheFreshness,
  hmEdgeCacheKeyUrl,
  isHmEdgeCacheablePath,
  isHmEdgeCacheableRequest,
  matchHmEdgeCache,
  putHmEdgeCache,
  readHmHtmlBootFromCache,
  resolveHmEdgeCache,
  tagHmEdgeCacheResponse,
} from "./hm-edge-cache.js";

function memoryCache() {
  const map = new Map();
  return {
    async match(req) {
      const url = typeof req === "string" ? req : req.url;
      return map.get(url) || null;
    },
    async put(req, res) {
      const url = typeof req === "string" ? req : req.url;
      map.set(url, res);
    },
    _map: map,
  };
}

describe("hm-edge-cache", () => {
  it("caches public HM news APIs and skips fresh/page-content", () => {
    assert.equal(isHmEdgeCacheablePath("/api/hm/home-bundle", "slug=su"), true);
    assert.equal(isHmEdgeCacheablePath("/api/news/hybrid", "siteId=2&dbFirst=1"), true);
    assert.equal(isHmEdgeCacheablePath("/api/hm/meta/by-slug/su", "domain=suhaber.net"), true);
    assert.equal(isHmEdgeCacheablePath("/api/hm/home-bundle", "fresh=1"), false);
    assert.equal(isHmEdgeCacheablePath("/api/hm/meta/by-slug/su", "includePageContent=1"), false);
    assert.equal(
      isHmEdgeCacheableRequest({ method: "POST", headers: new Headers() }, "/api/hm/home-bundle", ""),
      false,
    );
    assert.equal(
      isHmEdgeCacheableRequest(
        { method: "GET", headers: new Headers({ authorization: "Bearer x" }) },
        "/api/hm/home-bundle",
        "",
      ),
      false,
    );
  });

  it("normalizes cache keys by dropping fresh and sorting query", () => {
    const a = hmEdgeCacheKeyUrl("https://suhaber.net/api/hm/home-bundle?fresh=1&slug=su&sliderLimit=15");
    const b = hmEdgeCacheKeyUrl("https://suhaber.net/api/hm/home-bundle?sliderLimit=15&slug=su");
    assert.equal(a, b);
    assert.equal(a.includes("fresh="), false);
  });

  it("stores and matches JSON, then reports fresh vs stale vs expired", async () => {
    const cache = memoryCache();
    const url = "https://suhaber.net/api/hm/home-bundle?slug=su&sliderLimit=15";
    const stored = await putHmEdgeCache(
      cache,
      url,
      new Response(JSON.stringify({ siteId: 2, featured: [{ title: "A" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    assert.equal(stored, true);
    const hit = await matchHmEdgeCache(cache, url);
    assert.equal(hit.ok, true);
    const body = await hit.json();
    assert.equal(body.siteId, 2);
    assert.equal(hmEdgeCacheFreshness(hit), "fresh");
    assert.ok(hmEdgeCacheAgeMs(hit) < HM_EDGE_FRESH_MS);
    const aged = new Response("{}", {
      status: 200,
      headers: { "x-yekpare-edge-cached-at": String(Date.now() - 5 * 60_000) },
    });
    assert.equal(hmEdgeCacheFreshness(aged), "stale");
    const expired = new Response("{}", {
      status: 200,
      headers: { "x-yekpare-edge-cached-at": String(Date.now() - HM_EDGE_STALE_MS - 1000) },
    });
    assert.equal(hmEdgeCacheFreshness(expired), "expired");
  });

  it("resolveHmEdgeCache returns stale immediately and schedules revalidate", async () => {
    const cache = memoryCache();
    const url = "https://vatanhaber.net/api/hm/meta/by-slug/vatanhaber?domain=vatanhaber.net";
    const staleRes = new Response(JSON.stringify({ id: 9, slug: "vatanhaber" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-yekpare-edge-cached-at": String(Date.now() - 10 * 60_000),
      },
    });
    await cache.put(new Request(hmEdgeCacheKeyUrl(url)), staleRes);
    let revalidated = false;
    const jobs = [];
    const resolved = await resolveHmEdgeCache(cache, url, {
      waitUntil: (p) => jobs.push(p),
      revalidate: async () => {
        revalidated = true;
      },
    });
    assert.equal(resolved.freshness, "stale");
    assert.equal(resolved.response.headers.get("x-yekpare-edge-cache"), "stale");
    await Promise.all(jobs);
    assert.equal(revalidated, true);
  });

  it("reads HTML boot payload from cached meta + bundle", async () => {
    const cache = memoryCache();
    const origin = "https://suhaber.net";
    const urls = hmBootCacheUrls(origin, "su", "suhaber.net");
    await putHmEdgeCache(
      cache,
      urls.metaUrl,
      new Response(JSON.stringify({ id: 2, slug: "su", displayName: "Su Haber" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await putHmEdgeCache(
      cache,
      urls.bundleUrl,
      new Response(JSON.stringify({ siteId: 2, featured: [{ title: "Manşet" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const boot = await readHmHtmlBootFromCache(cache, origin, "su", "suhaber.net");
    assert.equal(boot.siteId, 2);
    assert.equal(boot.meta.displayName, "Su Haber");
    assert.equal(boot.bundle.featured[0].title, "Manşet");
    assert.equal(boot.fromCache, true);
    const tagged = tagHmEdgeCacheResponse(new Response("ok"), "hit");
    assert.equal(tagged.headers.get("x-yekpare-edge-cache"), "hit");
  });

  it("aliases slug home-bundle cache to siteId URL", async () => {
    const cache = memoryCache();
    const slugUrl = "https://ankarasehirgazetesi.com/api/hm/home-bundle?slug=asg&sliderLimit=15";
    await putHmEdgeCache(
      cache,
      slugUrl,
      new Response(JSON.stringify({ siteId: 3, featured: [{ title: "Ankara" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const alias = await matchHmEdgeCache(
      cache,
      "https://ankarasehirgazetesi.com/api/hm/home-bundle?siteId=3&sliderLimit=15",
    );
    assert.ok(alias);
    const body = await alias.json();
    assert.equal(body.siteId, 3);
    assert.equal(body.featured[0].title, "Ankara");
  });
});
