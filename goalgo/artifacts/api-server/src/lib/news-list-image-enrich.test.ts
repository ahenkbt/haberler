import { describe, expect, it } from "vitest";
import {
  RSS_IMAGE_LOOKUP_MAX_URLS,
  buildRssImageLookupDedupeKeys,
  withTimeoutOrFallback,
} from "./news-list-image-enrich.js";

describe("buildRssImageLookupDedupeKeys", () => {
  it("caps unique URLs and emits link: keys", () => {
    const keys = buildRssImageLookupDedupeKeys([
      "https://Example.com/haber/1",
      "https://example.com/haber/1",
    ]);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((key) => key.startsWith("link:"))).toBe(true);
    expect(keys.length).toBeLessThanOrEqual(RSS_IMAGE_LOOKUP_MAX_URLS * 2);
  });

  it("drops empty values and caps a long list", () => {
    const urls = Array.from({ length: 80 }, (_, i) => `https://rss.example.com/item-${i}`);
    const keys = buildRssImageLookupDedupeKeys(["", "  ", ...urls]);
    expect(keys.length).toBeLessThanOrEqual(RSS_IMAGE_LOOKUP_MAX_URLS * 2);
    expect(keys.length).toBeGreaterThan(0);
  });
});

describe("withTimeoutOrFallback", () => {
  it("returns the fallback when the promise is slower than the budget", async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("late"), 50));
    await expect(withTimeoutOrFallback(slow, 5, "fallback")).resolves.toBe("fallback");
  });

  it("returns the value when it wins the race", async () => {
    await expect(withTimeoutOrFallback(Promise.resolve("ok"), 50, "fallback")).resolves.toBe("ok");
  });
});
