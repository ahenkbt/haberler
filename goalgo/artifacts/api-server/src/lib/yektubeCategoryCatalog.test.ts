import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { canonicalVideoCategorySlug, slugifyVideoCategory } from "./yektubeCategoryCatalog.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("yektubeCategoryCatalog", () => {
  it("slugifies Turkish category labels", () => {
    expect(slugifyVideoCategory("Film ve Animasyon")).toBe("film-ve-animasyon");
    expect(slugifyVideoCategory("Müzik")).toBe("muzik");
  });

  it("maps alias slugs to the canonical admin slug", () => {
    expect(canonicalVideoCategorySlug("film-ve-animasyon")).toBe("sinema");
    expect(canonicalVideoCategorySlug("music")).toBe("muzik");
    expect(canonicalVideoCategorySlug("haberler")).toBe("haberler");
  });

  it("does not merge duplicate slugs on public GET /video/categories", () => {
    const src = readFileSync(join(here, "../routes/video.ts"), "utf8");
    const handler = src.match(/router\.get\("\/video\/categories",[\s\S]*?^}\);/m)?.[0] ?? "";
    expect(handler).toContain("getVideoCategoryCatalog");
    expect(handler).not.toContain("mergeDuplicateCategorySlugs");
  });

  it("keeps category-slug merge on admin fix-playback only", () => {
    const src = readFileSync(join(here, "../routes/video.ts"), "utf8");
    const publicGets = [...src.matchAll(/router\.get\("\/video\/[^"]+",[\s\S]*?^}\);/gm)].map((m) => m[0]);
    expect(publicGets.some((block) => block.includes("mergeDuplicateCategorySlugs"))).toBe(false);
    expect(src).toContain('router.post("/video/fix-playback"');
    expect(src).toMatch(/router\.post\("\/video\/fix-playback"[\s\S]*mergeDuplicateCategorySlugs/);
  });

  it("loads the public video list via selectVideoPool instead of Promise.all + count(*)", () => {
    const src = readFileSync(join(here, "../routes/video.ts"), "utf8");
    expect(src).toContain("async function selectVideoPool");
    expect(src).toMatch(/router\.get\("\/video\/videos"[\s\S]*selectVideoPool\(/);
    expect(src).not.toMatch(
      /db\.select\(videosListSelect\)[\s\S]{0,200}Promise\.all\(\[[\s\S]{0,400}count\(\*\)::int/,
    );
  });
});
