import { describe, expect, it } from "vitest";

function ensureTepeMansetInModuleOrder(order: unknown): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  if (Array.isArray(order)) {
    for (const item of order) {
      const id = String(item ?? "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      next.push(id);
    }
  }
  if (!next.includes("tepeManset")) {
    return ["tepeManset", ...next];
  }
  return ["tepeManset", ...next.filter((id) => id !== "tepeManset")];
}

describe("tepe manset module order", () => {
  it("prepends tepeManset when missing", () => {
    expect(ensureTepeMansetInModuleOrder(["hero", "latestGrid"])).toEqual([
      "tepeManset",
      "hero",
      "latestGrid",
    ]);
  });

  it("moves tepeManset to front when present elsewhere", () => {
    expect(ensureTepeMansetInModuleOrder(["hero", "tepeManset", "latestGrid"])).toEqual([
      "tepeManset",
      "hero",
      "latestGrid",
    ]);
  });
});
