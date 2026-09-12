import { describe, expect, it } from "vitest";
import { formatNewsDateLabel } from "./newsArticleMetrics";

describe("formatNewsDateLabel", () => {
  it("formats a valid ISO date", () => {
    expect(formatNewsDateLabel("2026-09-12T13:36:51.802Z", "d MMM yyyy")).toMatch(/2026/);
  });

  it("does not throw on invalid createdAt (blank article crash)", () => {
    expect(formatNewsDateLabel(undefined, "d MMMM yyyy, HH:mm")).toBe("");
    expect(formatNewsDateLabel("", "d MMMM yyyy, HH:mm")).toBe("");
    expect(formatNewsDateLabel("not-a-date", "d MMMM yyyy, HH:mm")).toBe("");
  });
});
