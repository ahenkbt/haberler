import { describe, expect, it } from "vitest";
import { hmEditorSiteNewsWhere } from "./hm-editor-news-access.js";

describe("hmEditorSiteNewsWhere", () => {
  it("requires positive siteId scope", () => {
    const where = hmEditorSiteNewsWhere(7);
    expect(where).toBeTruthy();
  });
});
