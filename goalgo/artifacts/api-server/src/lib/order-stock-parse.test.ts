import { describe, expect, it } from "vitest";
import {
  aggregateMenuItemQuantities,
  aggregateProductQuantities,
  parseOrderLineItemId,
  parseOrderLineQuantity,
} from "./order-stock-parse.js";

describe("order-stock-parse", () => {
  it("reads menu item id from common field names", () => {
    expect(parseOrderLineItemId({ id: 12 })).toBe(12);
    expect(parseOrderLineItemId({ menuItemId: 34 })).toBe(34);
    expect(parseOrderLineItemId({ product_id: 5 })).toBe(5);
    expect(parseOrderLineItemId({ name: "x" })).toBeNull();
  });

  it("reads quantity from qty or quantity", () => {
    expect(parseOrderLineQuantity({ qty: 2 })).toBe(2);
    expect(parseOrderLineQuantity({ quantity: 3 })).toBe(3);
    expect(parseOrderLineQuantity({})).toBe(1);
    expect(parseOrderLineQuantity({ qty: 0 })).toBe(0);
  });

  it("aggregates duplicate menu lines", () => {
    const map = aggregateMenuItemQuantities([
      { id: 1, qty: 2 },
      { menuItemId: 1, quantity: 1 },
      { id: 2, qty: 4 },
    ]);
    expect(map.get(1)).toBe(3);
    expect(map.get(2)).toBe(4);
  });

  it("aggregates product checkout lines", () => {
    const map = aggregateProductQuantities([
      { productId: 10, qty: 1 },
      { productId: 10, qty: 2 },
      { productId: 11, qty: 5 },
    ]);
    expect(map.get(10)).toBe(3);
    expect(map.get(11)).toBe(5);
  });
});
