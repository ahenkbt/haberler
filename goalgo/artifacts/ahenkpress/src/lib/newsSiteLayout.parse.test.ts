import { describe, expect, it } from "vitest";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";

describe("parseNewsSiteLayoutFromJson", () => {
  it("keeps extra pages when layoutJson is already an object", () => {
    const prefs = parseNewsSiteLayoutFromJson({
      hmExtraPages: [
        { id: "p1", title: "Künye", slug: "kunye", bodyHtml: "<p>künye</p>", enabled: true, fullWidth: true },
      ],
    });
    expect(prefs.hmExtraPages?.map((p) => p.slug)).toEqual(["kunye"]);
  });

  it("keeps extra pages from a JSON string", () => {
    const prefs = parseNewsSiteLayoutFromJson(
      JSON.stringify({
        hmExtraPages: [{ id: "p1", title: "Abonelik", slug: "abonelik", bodyHtml: "<p>a</p>", enabled: true }],
      }),
    );
    expect(prefs.hmExtraPages?.[0]?.slug).toBe("abonelik");
  });
});
