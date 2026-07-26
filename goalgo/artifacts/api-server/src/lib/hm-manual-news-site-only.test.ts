import { describe, expect, it } from "vitest";
import { isManualEditorCentralSyncRef } from "./hm-manual-news-site-only.js";

describe("isManualEditorCentralSyncRef", () => {
  it("accepts news sync refs", () => {
    expect(isManualEditorCentralSyncRef("yekpare-hm-sync:7:news:42")).toBe(true);
  });

  it("rejects makale sync and pool refs", () => {
    expect(isManualEditorCentralSyncRef("yekpare-hm-sync:7:makale:42")).toBe(false);
    expect(isManualEditorCentralSyncRef("yekpare-hm-pool:7:42")).toBe(false);
    expect(isManualEditorCentralSyncRef(null)).toBe(false);
  });
});
