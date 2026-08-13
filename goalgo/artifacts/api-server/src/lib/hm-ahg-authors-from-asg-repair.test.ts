import { describe, expect, it } from "vitest";
import { authorsRepresentSamePerson } from "./hm-sync-source.js";
import {
  AHG_AUTHORS_SOURCE_SLUG,
  AHG_AUTHORS_TARGET_SLUG,
  AHG_FROM_ASG_MAKALE_EXT_PREFIX,
  AHG_FROM_ASG_NEWS_EXT_PREFIX,
  ahgFromAsgMakaleExternalKey,
  ahgFromAsgNewsExternalKey,
  canonicalAsgAuthors,
  foldMakaleTitle,
} from "./hm-ahg-authors-from-asg-repair.js";

describe("hm-ahg-authors-from-asg-repair", () => {
  it("copies asg columnists onto ankarahabergundemi (not the reverse)", () => {
    expect(AHG_AUTHORS_SOURCE_SLUG).toBe("asg");
    expect(AHG_AUTHORS_TARGET_SLUG).toBe("ankarahabergundemi");
    expect(AHG_AUTHORS_TARGET_SLUG).not.toBe("asg");
  });

  it("dedupes ASG authors by person keeping sort order", () => {
    const rows = canonicalAsgAuthors([
      { id: 524, name: "GÜLAY KOÇ", hmSortOrder: 1 } as any,
      { id: 522, name: "Gülay KOÇ", hmSortOrder: 1 } as any,
      { id: 525, name: "MUZAFFER ÖZEN", hmSortOrder: 2 } as any,
      { id: 9, name: "İREM ALKUŞ", hmSortOrder: null } as any,
    ]);
    expect(rows.map((r) => r.id)).toEqual([524, 525]);
  });

  it("treats GÜLAY KOÇ and Gülay KOÇ as the same person", () => {
    expect(authorsRepresentSamePerson("GÜLAY KOÇ", "Gülay KOÇ")).toBe(true);
  });

  it("folds makale titles for duplicate detection", () => {
    expect(foldMakaleTitle("  Bavuldaki   Umut: Hayatı Yeniden Demlemek ")).toBe(
      foldMakaleTitle("Bavuldaki Umut: Hayatı Yeniden Demlemek"),
    );
  });

  it("builds stable external keys", () => {
    expect(ahgFromAsgMakaleExternalKey(35894)).toBe(`${AHG_FROM_ASG_MAKALE_EXT_PREFIX}35894`);
    expect(ahgFromAsgNewsExternalKey(12)).toBe(`${AHG_FROM_ASG_NEWS_EXT_PREFIX}12`);
  });
});
