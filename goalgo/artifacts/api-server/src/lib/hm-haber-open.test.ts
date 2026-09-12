import { describe, expect, it } from "vitest";
import {
  hmNewsArticleSlugFromPath,
  isHmCentralPoolCampaignSlug,
  resolveHmHaberPathSlug,
} from "../../../ahenkpress/src/lib/hmHaberPathSlug.ts";
import { isVisibleCentralPoolNewsForHmSite } from "./news-page-bundle.js";

const CAMPAIGN =
  "ogretim-sen-genel-baskani-didem-tonkal-bu-olumun-uzeri-ortulemez-1789220216195-0-m";

describe("ASG /haber campaign slug open", () => {
  it("parses -N-m pool slugs from custom-domain paths", () => {
    expect(isHmCentralPoolCampaignSlug(CAMPAIGN)).toBe(true);
    expect(hmNewsArticleSlugFromPath(`/haber/${CAMPAIGN}`)).toBe(CAMPAIGN);
    expect(resolveHmHaberPathSlug({ slug: "asg" }, `/tr/asg/haber/${CAMPAIGN}`)).toBe(CAMPAIGN);
  });

  it("keeps SHA RSS pool rows visible on ASG (site 3) like the homepage list", () => {
    expect(
      isVisibleCentralPoolNewsForHmSite(
        {
          siteId: null,
          rssSourceUrl: "https://sehirhaberajansi.com.tr/haber/ornek-737",
          isEditorManual: false,
          tags: ["rss-import", "rss-auto"],
        },
        3,
      ),
    ).toBe(true);
  });
});
