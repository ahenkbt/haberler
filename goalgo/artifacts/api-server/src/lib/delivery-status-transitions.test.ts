import { describe, expect, it } from "vitest";
import {
  ADMIN_DELIVERY_STATUS_TRANSITIONS,
  COURIER_DELIVERY_STATUS_TRANSITIONS,
  DELIVERY_ALL_STATUSES,
  VENDOR_DELIVERY_STATUS_TRANSITIONS,
  deliveryStatusTransitionAllowed,
} from "./delivery-status-transitions";

describe("deliveryStatusTransitionAllowed", () => {
  it("allows same-status no-op", () => {
    expect(deliveryStatusTransitionAllowed("admin", "pending", "pending")).toEqual({ ok: true });
  });

  it("rejects unknown target status", () => {
    const result = deliveryStatusTransitionAllowed("admin", "pending", "unknown");
    expect(result).toEqual({ ok: false, error: "Geçersiz hedef durum" });
  });

  it("rejects invalid admin transition", () => {
    const result = deliveryStatusTransitionAllowed("admin", "pending", "delivered");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("pending");
      expect(result.error).toContain("delivered");
    }
  });

  it("allows admin pending → confirmed", () => {
    expect(deliveryStatusTransitionAllowed("admin", "pending", "confirmed")).toEqual({ ok: true });
  });

  it("allows vendor ready → picked_up but not on_the_way", () => {
    expect(deliveryStatusTransitionAllowed("vendor", "ready", "picked_up")).toEqual({ ok: true });
    expect(deliveryStatusTransitionAllowed("vendor", "ready", "on_the_way").ok).toBe(false);
  });

  it("allows courier picked_up → on_the_way", () => {
    expect(deliveryStatusTransitionAllowed("courier", "picked_up", "on_the_way")).toEqual({ ok: true });
  });

  it("blocks courier from pending", () => {
    expect(deliveryStatusTransitionAllowed("courier", "pending", "confirmed").ok).toBe(false);
  });
});

describe("transition maps", () => {
  it("covers every known status in all role maps", () => {
    for (const status of DELIVERY_ALL_STATUSES) {
      expect(ADMIN_DELIVERY_STATUS_TRANSITIONS[status]).toBeDefined();
      expect(VENDOR_DELIVERY_STATUS_TRANSITIONS[status]).toBeDefined();
      expect(COURIER_DELIVERY_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });
});
