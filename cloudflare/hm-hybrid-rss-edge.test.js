import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hybridEdgeFillHttpStatus,
  shouldFillHybridSiteRssAtEdge,
} from "./hm-hybrid-rss-edge.js";

describe("hm-hybrid-rss-edge", () => {
  it("skips live RSS fill when origin failed", () => {
    assert.equal(
      shouldFillHybridSiteRssAtEdge({
        method: "GET",
        pathname: "/api/news/hybrid",
        upstreamOk: false,
        itemCount: 0,
      }),
      false,
    );
  });

  it("skips fill when dbFirst homepage already has DB news", () => {
    assert.equal(
      shouldFillHybridSiteRssAtEdge({
        method: "GET",
        pathname: "/api/news/hybrid",
        upstreamOk: true,
        dbFirst: true,
        itemCount: 12,
        rssCount: 0,
      }),
      false,
    );
  });

  it("fills category boxes that have no matching items", () => {
    assert.equal(
      shouldFillHybridSiteRssAtEdge({
        method: "GET",
        pathname: "/api/news/hybrid",
        upstreamOk: true,
        dbFirst: true,
        itemCount: 12,
        rssCount: 0,
        categorySlug: "spor",
        categoryHitCount: 0,
      }),
      true,
    );
  });

  it("returns 200 when edge fill recovered items after origin error", () => {
    assert.equal(hybridEdgeFillHttpStatus(false, 6), 200);
    assert.equal(hybridEdgeFillHttpStatus(false, 0), 502);
    assert.equal(hybridEdgeFillHttpStatus(true, 0), 200);
  });
});
