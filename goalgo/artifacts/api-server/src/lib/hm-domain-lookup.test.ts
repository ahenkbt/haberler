import { describe, expect, it } from "vitest";
import {
  hmDomainSlotRank,
  normalizeHmDomainHost,
  pickHmNewsSiteByDomainPriority,
} from "./hm-domain-lookup.js";

describe("hm domain slot priority", () => {
  it("normalizeHmDomainHost", () => {
    expect(normalizeHmDomainHost("https://WWW.Sosyalhizmetler.TR/")).toBe("sosyalhizmetler.tr");
  });

  it("primary domain beats domain2 on another site", () => {
    const dedicated = {
      id: 42,
      slug: "sosyalhizmetler",
      domain: "sosyalhizmetler.tr",
      domain2: null,
      domain3: null,
    };
    const marmara = {
      id: 7,
      slug: "marmara-gundemi",
      domain: "marmara.gundemi.org",
      domain2: "sosyalhizmetler.tr",
      domain3: null,
    };
    expect(hmDomainSlotRank(dedicated, "sosyalhizmetler.tr")).toBe(0);
    expect(hmDomainSlotRank(marmara, "sosyalhizmetler.tr")).toBe(1);
    const picked = pickHmNewsSiteByDomainPriority([marmara, dedicated], ["sosyalhizmetler.tr"]);
    expect(picked?.id).toBe(42);
    expect(picked?.slug).toBe("sosyalhizmetler");
  });
});
