import { describe, expect, it } from "vitest";
import { newsCoverFilenameStem, sanitizeMediaFilenameStem } from "./newsCoverFilename.js";

describe("newsCoverFilenameStem", () => {
  it("slugifies Turkish title and appends short hash", () => {
    const stem = newsCoverFilenameStem("Vatan Kahramanları Derneği'ne Ziyaretler Sürüyor");
    expect(stem).toMatch(/^vatan-kahramanlari-dernegi-ne-ziyaretler-suruyor-[a-f0-9]{6}$/);
    expect(stem.length).toBeLessThanOrEqual(80);
  });

  it("is stable for same title and seed", () => {
    const a = newsCoverFilenameStem("Test Haber", "https://example.com/a");
    const b = newsCoverFilenameStem("Test Haber", "https://example.com/a");
    expect(a).toBe(b);
  });

  it("differs when hash seed differs", () => {
    const a = newsCoverFilenameStem("Test Haber", "https://example.com/a");
    const b = newsCoverFilenameStem("Test Haber", "https://example.com/b");
    expect(a).not.toBe(b);
  });

  it("truncates very long titles", () => {
    const long = "A".repeat(200);
    const stem = newsCoverFilenameStem(long);
    expect(stem.length).toBeLessThanOrEqual(80);
    expect(stem).toMatch(/-[a-f0-9]{6}$/);
  });
});

describe("sanitizeMediaFilenameStem", () => {
  it("strips unsafe characters", () => {
    expect(sanitizeMediaFilenameStem("Foo Bar!!!")).toBe("foo-bar");
  });
});
