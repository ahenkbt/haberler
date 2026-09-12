import { describe, expect, it } from "vitest";
import {
  hmNewsArticleSlugFromPath,
  hmNewsArticleSlugsMatch,
  isHmCentralPoolCampaignSlug,
  resolveHmHaberPathSlug,
} from "./hmHaberPathSlug";

const CAMPAIGN =
  "cevre-sehircilik-ve-i-klim-degisikligi-bakanligi-nda-gorev-degisikligi-1789220219760-5-m";

describe("hmHaberPathSlug", () => {
  it("reads campaign -N-m slugs from clean and nested HM paths", () => {
    expect(isHmCentralPoolCampaignSlug(CAMPAIGN)).toBe(true);
    expect(hmNewsArticleSlugFromPath(`/haber/${CAMPAIGN}`)).toBe(CAMPAIGN);
    expect(hmNewsArticleSlugFromPath(`/tr/asg/haber/${CAMPAIGN}`)).toBe(CAMPAIGN);
    expect(resolveHmHaberPathSlug({ id: CAMPAIGN }, "/haber/other")).toBe(CAMPAIGN);
    expect(resolveHmHaberPathSlug({}, `/tr/asg/haber/${CAMPAIGN}`)).toBe(CAMPAIGN);
  });

  it("matches boot slug vs route slug case-insensitively", () => {
    expect(hmNewsArticleSlugsMatch(CAMPAIGN, CAMPAIGN.toUpperCase())).toBe(true);
    expect(hmNewsArticleSlugsMatch(CAMPAIGN, "baska-haber")).toBe(false);
  });
});
