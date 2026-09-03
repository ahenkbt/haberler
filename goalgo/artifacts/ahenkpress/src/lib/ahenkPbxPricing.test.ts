import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTry, pbxMonthlyTl, pbxPerAgentTl, pbxPriceTiers } from "./ahenkPbxPricing.ts";

describe("ahenkPbxPricing", () => {
  it("uses 700 TL per agent at 10 seats and 7.000 TL monthly", () => {
    assert.equal(pbxPerAgentTl(10), 700);
    assert.equal(pbxMonthlyTl(10), 7000);
    assert.equal(formatTry(7000), "7.000\u00a0TL");
  });

  it("drops 50 TL per agent at every +10 seats through 50", () => {
    assert.equal(pbxMonthlyTl(20), 13000);
    assert.equal(pbxMonthlyTl(30), 18000);
    assert.equal(pbxMonthlyTl(40), 22000);
    assert.equal(pbxMonthlyTl(50), 25000);
    assert.deepEqual(
      pbxPriceTiers().map((row) => [row.agents, row.perAgentTl, row.monthlyTl]),
      [
        [10, 700, 7000],
        [20, 650, 13000],
        [30, 600, 18000],
        [40, 550, 22000],
        [50, 500, 25000],
      ],
    );
  });
});
