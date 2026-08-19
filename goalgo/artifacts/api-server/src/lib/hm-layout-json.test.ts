import { describe, expect, it } from "vitest";
import { parseHmLayoutRecord } from "./hm-layout-json.js";

describe("parseHmLayoutRecord", () => {
  it("parses a JSON string with extra pages", () => {
    const layout = parseHmLayoutRecord(
      JSON.stringify({
        hmExtraPages: [{ id: "1", title: "Künye", slug: "kunye", bodyHtml: "<p>ok</p>", enabled: true }],
      }),
    );
    expect(layout.hmExtraPages).toHaveLength(1);
    expect((layout.hmExtraPages as { slug: string }[])[0]?.slug).toBe("kunye");
  });

  it("accepts an already-parsed JSONB object (Neon/edge)", () => {
    const layout = parseHmLayoutRecord({
      hmVitrinTheme: "modern",
      hmExtraPages: [{ id: "1", title: "Künye", slug: "kunye", enabled: true }],
    });
    expect(layout.hmVitrinTheme).toBe("modern");
    expect(layout.hmExtraPages).toHaveLength(1);
  });

  it("does not treat String(object) as valid JSON", () => {
    expect(parseHmLayoutRecord("[object Object]")).toEqual({});
    expect(parseHmLayoutRecord(String({ hmExtraPages: [] }))).toEqual({});
  });
});
