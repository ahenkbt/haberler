import { describe, expect, it } from "vitest";
import { PG_ADVISORY_LOCKS } from "./pg-advisory-lock.js";

describe("PG_ADVISORY_LOCKS", () => {
  it("her iş için tekil bigint id verir", () => {
    const ids = Object.values(PG_ADVISORY_LOCKS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PG_ADVISORY_LOCKS.HM_TEPE_MANSET_DAILY).toBe(740_006);
    expect(PG_ADVISORY_LOCKS.HM_RSS_MIDNIGHT).toBe(740_007);
  });
});
