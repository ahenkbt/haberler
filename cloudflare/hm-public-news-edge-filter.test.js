import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterNewsListPayload, hmPublicNewsItemAllowed } from "./hm-public-news-edge-filter.js";

describe("hm-public-news-edge-filter", () => {
  it("keeps featured bare-array responses as arrays (tepe manşet)", () => {
    const siteId = 7;
    const payload = [
      {
        id: 1,
        siteId,
        title: "Tepe manşet haber",
        isFeatured: true,
        isEditorManual: true,
      },
      {
        id: 2,
        siteId: 99,
        title: "Yabancı site",
        isFeatured: true,
        isEditorManual: true,
      },
    ];
    const filtered = filterNewsListPayload(payload, siteId, { allowCentralRss: true });
    assert.equal(Array.isArray(filtered), true);
    assert.deepEqual(
      filtered.map((x) => x.id),
      [1],
    );
  });

  it("still filters object list payloads by items", () => {
    const siteId = 3;
    const filtered = filterNewsListPayload(
      {
        items: [
          { id: 10, siteId: 3, isEditorManual: true },
          { id: 11, siteId: 8, isEditorManual: true },
        ],
        total: 2,
      },
      siteId,
      {},
    );
    assert.equal(Array.isArray(filtered.items), true);
    assert.equal(filtered.items.length, 1);
    assert.equal(filtered.items[0].id, 10);
    assert.equal(filtered.total, 1);
  });

  it("allows same-site featured editor news", () => {
    assert.equal(
      hmPublicNewsItemAllowed(
        { id: 1, siteId: 5, isEditorManual: true, isFeatured: true },
        5,
      ),
      true,
    );
  });
});
