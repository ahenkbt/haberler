import { describe, expect, it } from "vitest";
import { HM_YEKTUBE_VIDEOS_PATH, hmYektubeVideosQuery } from "./hmYektubeCatalogClient";

describe("hmYektubeCatalogClient", () => {
  it("builds the same-origin Yektube catalog URL", () => {
    expect(hmYektubeVideosQuery({ limit: 36 })).toBe(`${HM_YEKTUBE_VIDEOS_PATH}?limit=36`);
    expect(hmYektubeVideosQuery({ limit: 8, categorySlug: "sinema" })).toBe(
      `${HM_YEKTUBE_VIDEOS_PATH}?limit=8&categorySlug=sinema`,
    );
    expect(hmYektubeVideosQuery({ limit: 36, seed: 9 })).toContain("seed=9");
    expect(HM_YEKTUBE_VIDEOS_PATH).toBe("/api/hm/yektube/videos");
  });
});
