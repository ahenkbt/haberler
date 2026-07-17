import { describe, expect, it } from "vitest";

/** news-page-bundle / news route ile aynı kural — regress "15-temmuz" → id 15. */
function parseStrictNewsNumericId(raw: string): number {
  return /^\d+$/.test(String(raw).trim()) ? parseInt(String(raw).trim(), 10) : NaN;
}

describe("strict news slug numeric id", () => {
  it("does not treat titled slugs starting with digits as ids", () => {
    expect(Number.isNaN(parseStrictNewsNumericId("15-temmuz-ruhu-asla-olmeyecek"))).toBe(true);
    expect(Number.isNaN(parseStrictNewsNumericId("15"))).toBe(false);
    expect(parseStrictNewsNumericId("15")).toBe(15);
    expect(parseInt("15-temmuz", 10)).toBe(15); // naive parseInt trap
  });

  it("does not map year-prefixed tender slugs to article id 2026", () => {
    const akyurt =
      "2026-yili-1-kisim-i-nsaat-malzemeleri-2-kisim-elektrik-tesisat-malzemeleri-mal-a-1784185585527-12-m-0gvsq";
    expect(Number.isNaN(parseStrictNewsNumericId(akyurt))).toBe(true);
    expect(parseInt(akyurt, 10)).toBe(2026); // naive parseInt trap → Güzelbahçe id
  });
});
