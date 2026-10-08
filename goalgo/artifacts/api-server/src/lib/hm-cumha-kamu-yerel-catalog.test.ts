import { describe, expect, it } from "vitest";
import {
  buildKamuYerelHmNewsSiteRssFeedRows,
  buildKamuYerelCorporateMenuItems,
  cumhaLocationRssUrl,
  cumhaProvinceSlugFromName,
  listKamuYerelProvinces,
} from "./hm-cumha-kamu-yerel-catalog.js";

describe("hm-cumha-kamu-yerel-catalog", () => {
  it("lists 81 provinces with cumha lokasyon RSS", () => {
    const provinces = listKamuYerelProvinces();
    expect(provinces).toHaveLength(81);
    expect(cumhaProvinceSlugFromName("Afyonkarahisar")).toBe("afyonkarahisar");
    expect(cumhaLocationRssUrl("ankara")).toBe("https://cumha.com.tr/rss/lokasyon/ankara");
  });

  it("builds cumha-primary site RSS rows (12 kategori + 81 il + tamamlayıcı)", () => {
    const rows = buildKamuYerelHmNewsSiteRssFeedRows();
    expect(rows.length).toBe(12 + 81 + 3);
    expect(rows.some((r) => r.url.includes("kamu-kurumlari-ve-ust-kurullar"))).toBe(true);
    expect(rows.every((r) => !r.url.includes("birgun.net/rss/kategori/siyaset-8"))).toBe(true);
  });

  it("regional il menu has 7 regions under İller", () => {
    const menu = buildKamuYerelCorporateMenuItems();
    const regions = menu.filter((m) => m.parentId === "ky-menu-iller");
    expect(regions).toHaveLength(7);
    const ankara = menu.find((m) => m.id === "ky-il-ankara");
    expect(ankara?.href).toBe("/kategori/ankara");
  });
});
