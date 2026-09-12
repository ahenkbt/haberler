import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hmYektubeCatalogDegradeBody,
  isHmYektubeCatalogPath,
  shouldDegradeHmYektubeCatalog,
} from "./hm-yektube-catalog-edge.js";

describe("hm-yektube-catalog-edge", () => {
  it("matches the live catalog paths", () => {
    assert.equal(isHmYektubeCatalogPath("/api/hm/yektube/videos"), true);
    assert.equal(isHmYektubeCatalogPath("/api/hm/yektube/videos/"), true);
    assert.equal(isHmYektubeCatalogPath("/api/hm/yektube/categories"), true);
    assert.equal(isHmYektubeCatalogPath("/api/video/videos"), false);
    assert.equal(isHmYektubeCatalogPath("/video"), false);
  });

  it("degrades Express 404 HTML and 5xx, not JSON 200", () => {
    assert.equal(shouldDegradeHmYektubeCatalog(404, "text/html"), true);
    assert.equal(shouldDegradeHmYektubeCatalog(200, "text/html; charset=utf-8"), true);
    assert.equal(shouldDegradeHmYektubeCatalog(503, "text/plain"), true);
    assert.equal(shouldDegradeHmYektubeCatalog(200, "application/json"), false);
    assert.equal(shouldDegradeHmYektubeCatalog(0, ""), true);
  });

  it("keeps persistedToNews false on degrade payloads", () => {
    const videos = hmYektubeCatalogDegradeBody("/api/hm/yektube/videos");
    assert.equal(videos.persistedToNews, false);
    assert.deepEqual(videos.items, []);
    const cats = hmYektubeCatalogDegradeBody("/api/hm/yektube/categories");
    assert.equal(cats.persistedToNews, false);
  });
});
