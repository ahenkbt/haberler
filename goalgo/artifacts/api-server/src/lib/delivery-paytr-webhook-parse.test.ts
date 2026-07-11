import { describe, expect, it } from "vitest";
import { paytrCallbackEventId, paytrOrderTotalKurus } from "./delivery-paytr-webhook-parse.js";

describe("delivery-paytr-webhook-parse", () => {
  it("uses callback hash as idempotency key", () => {
    expect(paytrCallbackEventId({ hash: "abc123" })).toBe("abc123");
    expect(paytrCallbackEventId({})).toBeNull();
  });

  it("converts order total TRY to kuruş", () => {
    expect(paytrOrderTotalKurus("149.90")).toBe(14990);
    expect(paytrOrderTotalKurus(25)).toBe(2500);
  });
});
