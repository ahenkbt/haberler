import { describe, expect, it } from "vitest";
import { AHG_SHA_PURGE_DISABLED, AHG_SHA_RSS_HOST } from "./hm-rss-campaign-news-purge.js";

describe("AHG SHA haber silmesi", () => {
  it("SHA içerik isteniyor — otomatik purge kapalı", () => {
    expect(AHG_SHA_PURGE_DISABLED).toBe(true);
    expect(AHG_SHA_RSS_HOST).toBe("sehirhaberajansi.com.tr");
  });
});
