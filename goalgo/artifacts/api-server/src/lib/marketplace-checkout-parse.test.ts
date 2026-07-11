import { describe, expect, it } from "vitest";
import {
  computeEcommerceShippingFee,
  groupMarketplaceLinesByVendor,
  marketplaceLineSubtotal,
  parseMarketplaceLineId,
} from "./marketplace-checkout-parse.js";

describe("marketplace-checkout-parse", () => {
  it("groups lines by vendor via menu item map", () => {
    const map = new Map([
      [10, 1],
      [11, 1],
      [20, 2],
    ]);
    const groups = groupMarketplaceLinesByVendor(
      [
        { menuItemId: 10, price: 100, qty: 1 },
        { menuItemId: 11, price: 50, qty: 2 },
        { menuItemId: 20, price: 30, qty: 1 },
      ],
      map,
    );
    expect(groups.get(1)?.length).toBe(2);
    expect(groups.get(2)?.length).toBe(1);
  });

  it("prefers explicit vendorId on line", () => {
    const groups = groupMarketplaceLinesByVendor([{ vendorId: 9, menuItemId: 10, price: 10, qty: 1 }], new Map());
    expect(groups.get(9)?.length).toBe(1);
  });

  it("computes shipping with free threshold", () => {
    expect(computeEcommerceShippingFee(600, 29.9, 500)).toBe(0);
    expect(computeEcommerceShippingFee(400, 29.9, 500)).toBe(29.9);
    expect(computeEcommerceShippingFee(100, 0, 500)).toBe(0);
  });

  it("sums line subtotal", () => {
    expect(
      marketplaceLineSubtotal([
        { menuItemId: 1, price: "10.5", qty: 2 },
        { id: 2, price: 5, quantity: 1 },
      ]),
    ).toBe(26);
    expect(parseMarketplaceLineId({ id: 7 })).toBe(7);
  });
});
