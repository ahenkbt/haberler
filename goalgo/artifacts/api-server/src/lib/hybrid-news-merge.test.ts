import { describe, expect, it } from "vitest";
import {
  filterPoolCopiesWhenReceiveDisabled,
  shouldApplyActivatedPoolCategoryFilter,
} from "./hybrid-news-merge.js";

describe("shouldApplyActivatedPoolCategoryFilter", () => {
  it("genel akışta aktivasyon filtresi uygulanır", () => {
    expect(shouldApplyActivatedPoolCategoryFilter()).toBe(true);
    expect(shouldApplyActivatedPoolCategoryFilter("")).toBe(true);
    expect(shouldApplyActivatedPoolCategoryFilter("   ")).toBe(true);
  });

  it("açık kategori sayfasında aktivasyon filtresi atlanır", () => {
    expect(shouldApplyActivatedPoolCategoryFilter("asayis")).toBe(false);
    expect(shouldApplyActivatedPoolCategoryFilter("asayiş")).toBe(false);
    expect(shouldApplyActivatedPoolCategoryFilter(" gundem ")).toBe(false);
  });
});

describe("filterPoolCopiesWhenReceiveDisabled", () => {
  const local = { id: 1, rssSourceUrl: null as string | null };
  const pool = { id: 2, rssSourceUrl: "yekpare-hm-pool:0:99" };
  const sync = { id: 3, rssSourceUrl: "yekpare-hm-sync:1:news:8" };

  it("havuz alımı açıkken pool kopyalarını korur", () => {
    expect(filterPoolCopiesWhenReceiveDisabled([local, pool, sync], true)).toEqual([local, pool, sync]);
    expect(filterPoolCopiesWhenReceiveDisabled([local, pool], undefined)).toEqual([local, pool]);
  });

  it("havuz alımı kapalıyken pool kopyalarını düşürür", () => {
    expect(filterPoolCopiesWhenReceiveDisabled([local, pool, sync], false)).toEqual([local, sync]);
  });
});
