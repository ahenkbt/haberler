import { describe, expect, it } from "vitest";
import {
  dedupeHmMakaleRows,
  makaleSlugDuplicatePenalty,
  normalizeMakaleTitleKey,
} from "./hm-makale-dedupe";

describe("hm-makale-dedupe", () => {
  it("normalizes Turkish titles", () => {
    expect(normalizeMakaleTitleKey("  Gül Bahçesinde  Gezen ")).toBe("gül bahçesinde gezen");
  });

  it("penalizes distributed slugs", () => {
    expect(makaleSlugDuplicatePenalty("dogruluk-ince-cizgi")).toBeLessThan(
      makaleSlugDuplicatePenalty("dogruluk-ince-cizgi-1-1-1-hm3-src363"),
    );
  });

  it("dedupes by title and drops news: copies", () => {
    const rows = [
      {
        id: 551,
        title: "Doğruluk",
        slug: "dogruluk-1-1-1-hm3-src363",
        externalKey: null,
        createdAt: new Date("2026-07-01"),
      },
      {
        id: 363,
        title: "Doğruluk",
        slug: "dogruluk",
        externalKey: null,
        createdAt: new Date("2026-06-01"),
      },
      {
        id: 999,
        title: "Haberden kopya",
        slug: "haberden",
        externalKey: "news:123",
        createdAt: new Date("2026-07-02"),
      },
    ];
    const out = dedupeHmMakaleRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(363);
  });
});
