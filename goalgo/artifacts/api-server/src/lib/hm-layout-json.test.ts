import { describe, expect, it } from "vitest";
import {
  mergeHmLayoutPatch,
  preserveCorporateHmLayoutKind,
  resolveHmLayoutKind,
} from "./hm-layout-json.js";

describe("HM layout kind + vitrin merge", () => {
  it("theme corporate/kurumsal veya vkd slug → corporate", () => {
    expect(resolveHmLayoutKind({ hmVitrinTheme: "corporate" })).toBe("corporate");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "kurumsal" })).toBe("corporate");
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
});
