import { describe, expect, it } from "vitest";
import { markHmSpaReady } from "./hmSpaReady";

describe("markHmSpaReady", () => {
  it("calls the worker hold release once", () => {
    let calls = 0;
    const prev = globalThis.window;
    (globalThis as { window?: unknown }).window = {
      __YEKPARE_HM_RELEASE_FIRST_PAINT__: () => {
        calls += 1;
      },
    };
    try {
      markHmSpaReady();
      markHmSpaReady();
      expect(calls).toBe(2);
    } finally {
      (globalThis as { window?: unknown }).window = prev;
    }
  });
});
