import { describe, expect, it } from "vitest";
import { readHmHomeBundleBoot } from "./hmHomeBundleBoot";

describe("readHmHomeBundleBoot", () => {
  it("accepts center/manual lists even when featured is empty", () => {
    const prev = globalThis.window;
    (globalThis as { window?: unknown }).window = {
      __YEKPARE_HM_HOME_BUNDLE__: {
        siteId: 3,
        savedAt: Date.now(),
        bundle: {
          siteId: 3,
          featured: [],
          manualEditor: [{ title: "Editör haberi", slug: "editor" }],
        },
      },
    };
    try {
      const boot = readHmHomeBundleBoot(3);
      expect(boot?.manualEditor?.[0]).toMatchObject({ slug: "editor" });
    } finally {
      (globalThis as { window?: unknown }).window = prev;
    }
  });

  it("rejects a different siteId", () => {
    const prev = globalThis.window;
    (globalThis as { window?: unknown }).window = {
      __YEKPARE_HM_HOME_BUNDLE__: {
        siteId: 2,
        savedAt: Date.now(),
        bundle: { featured: [{ title: "Su" }] },
      },
    };
    try {
      expect(readHmHomeBundleBoot(3)).toBeUndefined();
    } finally {
      (globalThis as { window?: unknown }).window = prev;
    }
  });
});
