import { describe, expect, it } from "vitest";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";

describe("parseNewsSiteLayoutFromJson", () => {
  it("disables RSS feed flags on corporate editor sites", () => {
    const prefs = parseNewsSiteLayoutFromJson(
      JSON.stringify({
        hmVitrinTheme: "corporate",
        hybridRssEnabled: true,
        hmNewsRssLinksEnabled: true,
        hmCorporateGoogleNewsBandEnabled: true,
        hmCorporateRssBandEnabled: true,
        hmNewsRssHeadlineEnabled: true,
        hmNewsGoogleNewsBandEnabled: true,
        hmCorporateHomeModuleOrder: ["hero", "googleNewsBand", "mainNews", "rssBand"],
      }),
    );
    expect(prefs.hybridRssEnabled).toBe(false);
    expect(prefs.hmNewsRssLinksEnabled).toBe(false);
    expect(prefs.hmCorporateGoogleNewsBandEnabled).toBe(false);
    expect(prefs.hmCorporateRssBandEnabled).toBe(false);
    expect(prefs.hmNewsRssHeadlineEnabled).toBe(false);
    expect(prefs.hmNewsGoogleNewsBandEnabled).toBe(false);
    expect(prefs.hmCorporateHomeModuleOrder).not.toContain("googleNewsBand");
    expect(prefs.hmCorporateHomeModuleOrder).not.toContain("rssBand");
    expect(prefs.hmCorporateHomeModuleOrder).toContain("hero");
    expect(prefs.hmCorporateHomeModuleOrder).toContain("mainNews");
  });
});
