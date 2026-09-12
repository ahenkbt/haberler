import { describe, expect, it } from "vitest";
import {
  mergeHmLayoutPatch,
  preserveCorporateHmLayoutKind,
  resolveHmLayoutKind,
} from "./hm-layout-json.js";

describe("HM layout kind + vitrin merge", () => {
  it("theme corporate/kurumsal/vatan veya vkd slug → corporate", () => {
    expect(resolveHmLayoutKind({ hmVitrinTheme: "corporate" })).toBe("corporate");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "kurumsal" })).toBe("corporate");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "vatan" })).toBe("corporate");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "esen" }, "vkd")).toBe("corporate");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "news" }, "vatankahramanlari")).toBe("corporate");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "esen" }, "asg")).toBe("news");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "classic" })).toBe("news");
  });

  it("vitrin kaydı kurumsal temayı haber varsayılanına düşürmez", () => {
    const prev = {
      hmVitrinTheme: "corporate",
      corporateSliderItems: [{ title: "Kahramanlar", href: "/kahramanlar" }],
      tickerFinance: true,
    };
    const incoming = {
      hmVitrinTheme: "esen",
      tickerFinance: false,
      hybridRssEnabled: true,
    };
    const merged = mergeHmLayoutPatch(prev, incoming, { vitrinOnly: true, siteSlug: "vkd" });
    expect(merged.hmVitrinTheme).toBe("corporate");
    expect(merged.tickerFinance).toBe(false);
    expect(merged.corporateSliderItems).toEqual(prev.corporateSliderItems);
  });

  it("haber sitesi vitrin teması değişebilir", () => {
    const prev = { hmVitrinTheme: "esen", tickerWeather: true };
    const merged = mergeHmLayoutPatch(prev, { hmVitrinTheme: "classic", tickerWeather: false }, { vitrinOnly: true });
    expect(merged.hmVitrinTheme).toBe("classic");
    expect(merged.tickerWeather).toBe(false);
  });

  it("vkd slug + boş tema kayıtlı haber temasına düşmez", () => {
    const locked = preserveCorporateHmLayoutKind(
      { hmVitrinTheme: "corporate" },
      { hmVitrinTheme: "news", mansetVariant: "center-trio" },
      "vkd",
    );
    expect(locked.hmVitrinTheme).toBe("corporate");
    expect(locked.mansetVariant).toBe("center-trio");
  });

  it("vatan temasını haber varsayılanına düşürmez", () => {
    const merged = mergeHmLayoutPatch(
      { hmVitrinTheme: "vatan", tickerFinance: true },
      { hmVitrinTheme: "esen", tickerFinance: false },
      { vitrinOnly: true, siteSlug: "vkd" },
    );
    expect(merged.hmVitrinTheme).toBe("vatan");
    expect(merged.tickerFinance).toBe(false);
  });

  it("haber sitesi stok dump ile özel vitrin düzenini ezmez", () => {
    const prev = {
      hmVitrinTheme: "classic",
      hmNewsHomeModuleOrder: ["hero", "latestGrid", "authorsStrip"],
      mansetVariant: "magazine-grid",
      tickerFinance: true,
    };
    const incoming = {
      hmVitrinTheme: "esen",
      hmNewsHomeModuleOrder: ["tepeManset", "hero", "breakingBand"],
      mansetVariant: "center-trio",
      tickerFinance: false,
      tickerWeather: true,
      logoUrl: null,
      hmPrimaryColor: "#c00",
      hybridRssEnabled: true,
      showPlatformNav: false,
    };
    const merged = mergeHmLayoutPatch(prev, incoming, { vitrinOnly: true, siteSlug: "asg" });
    expect(merged.hmVitrinTheme).toBe("classic");
    expect(merged.hmNewsHomeModuleOrder).toEqual(prev.hmNewsHomeModuleOrder);
    expect(merged.mansetVariant).toBe("magazine-grid");
    expect(merged.tickerFinance).toBe(false);
  });
});
