import { describe, expect, it } from "vitest";
import { resolveNewsmapWikiQueryLabel } from "@/lib/newsmapLocationWiki";
import { resolveTurkishProvinceWikiTitle } from "@/lib/turkishProvinces";

describe("newsmapLocationWiki", () => {
  it("extracts primary city label from compound location strings", () => {
    expect(resolveNewsmapWikiQueryLabel("Ankara, Türkiye")).toBe("Ankara");
    expect(resolveNewsmapWikiQueryLabel("Çankaya › Ankara")).toBe("Ankara");
    expect(resolveNewsmapWikiQueryLabel(null)).toBe("");
  });

  it("resolves all 81 il labels for wiki lookup", () => {
    expect(resolveTurkishProvinceWikiTitle("Kars")).toBe("Kars");
    expect(resolveTurkishProvinceWikiTitle("kars")).toBe("Kars");
    expect(resolveTurkishProvinceWikiTitle("Van")).toBe("Van");
    expect(resolveNewsmapWikiQueryLabel("Kars, Türkiye")).toBe("Kars");
  });
});
